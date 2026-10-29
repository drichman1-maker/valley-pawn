// Runs the real migrations against PostgreSQL with a small Supabase shim (auth.uid(), roles,
// storage tables). Requires TEST_DATABASE_URL pointing at a server where databases can be created,
// e.g. postgresql://postgres@localhost:5432/postgres
import { readFileSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import pg from 'pg';

const URL = process.env.TEST_DATABASE_URL;
const DB = 'vp_db_tests';
const root = new globalThis.URL('../../', import.meta.url).pathname;
const OWNER = '11111111-1111-1111-1111-111111111111';
const STRANGER = '22222222-2222-2222-2222-222222222222';

let admin;
let db;

const sql = (file) => readFileSync(root + file, 'utf8');

async function resetDatabase() {
  if (db) await db.end();
  await admin.query(`drop database if exists ${DB} with (force)`);
  await admin.query(`create database ${DB}`);
  const u = new globalThis.URL(URL);
  u.pathname = `/${DB}`;
  db = new pg.Client({ connectionString: u.toString() });
  await db.connect();
  await db.query(sql('tests/db/supabase-shim.sql'));
  for (const f of readdirSync(root + 'supabase/migrations').sort()) await db.query(sql(`supabase/migrations/${f}`));
  await db.query(sql('supabase/seed.sql'));
  await db.query(`insert into auth.users (id, email) values ($1, 'owner@example.com'), ($2, 'someone@example.com')`, [OWNER, STRANGER]);
  await db.query(`insert into public.owners (user_id) values ($1)`, [OWNER]);
}

/** Runs fn inside a transaction as an API role. Rolls back unless commit is true. */
async function as(role, uid, fn, { commit = true } = {}) {
  await db.query('begin');
  try {
    await db.query(`set local role ${role}`);
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(uid ? { sub: uid, role } : { role })]);
    const out = await fn(db);
    await db.query(commit ? 'commit' : 'rollback');
    return out;
  } catch (e) {
    await db.query('rollback');
    throw e;
  }
}
const anon = (fn) => as('anon', null, fn);
const stranger = (fn) => as('authenticated', STRANGER, fn);
const owner = (fn) => as('authenticated', OWNER, fn);

const revision = async () => Number((await db.query('select revision from inventory_state')).rows[0].revision);
const publish = (payload) => owner((c) => c.query('select publish_import($1) as r', [payload]).then((r) => r.rows[0].r));

const newItem = (id, over = {}) => ({
  item_id: id,
  is_new: true,
  fields: { title: `Item ${id}`, category: 'Tools', price: 10, status: 'available', condition: '', description: '', brand: '', model: '', accessories: '', featured: false, date_added: '2026-10-01', ...over },
  url_photos: [],
});
const payload = async (over = {}) => ({
  mode: 'upsert',
  base_revision: await revision(),
  idempotency_key: randomUUID(),
  file_name: 'inventory.xlsx',
  file_sha256: 'abc',
  upserts: [],
  present_ids: [],
  expected_archive_ids: [],
  summary: {},
  ...over,
});

describe.skipIf(!URL)('database (migrations + policies)', () => {
  beforeAll(async () => {
    admin = new pg.Client({ connectionString: URL });
    await admin.connect();
  });
  afterAll(async () => {
    await db?.end();
    await admin?.end();
  });
  beforeEach(resetDatabase);

  describe('public access', () => {
    it('shows available and sold items only; drafts and archived are invisible', async () => {
      const ids = await anon((c) => c.query('select item_id, status from items order by item_id').then((r) => r.rows));
      expect(ids.map((r) => r.status).sort()).toEqual(['available', 'available', 'available', 'sold']);
      const draft = await anon((c) => c.query(`select get_public_item('DEMO-005') as j`).then((r) => r.rows[0].j));
      expect(draft).toBeNull();
      const sold = await anon((c) => c.query(`select get_public_item('DEMO-004') as j`).then((r) => r.rows[0].j));
      expect(sold.status).toBe('sold');
    });

    it('search returns active inventory only and has no default price ceiling', async () => {
      await owner((c) => c.query(`update items set status = 'available' where item_id = 'DEMO-005'`));
      const res = await anon((c) => c.query(`select search_public_items() as j`).then((r) => r.rows[0].j));
      expect(res.total).toBe(4); // includes the 3450.00 watch; excludes sold
      expect(res.items.map((i) => i.item_id)).not.toContain('DEMO-004');
      const zero = await anon((c) => c.query(`select search_public_items(p_max_price => 0) as j`).then((r) => r.rows[0].j));
      expect(zero.total).toBe(0);
      const like = await anon((c) => c.query(`select search_public_items(p_q => '%') as j`).then((r) => r.rows[0].j));
      expect(like.total).toBe(0); // wildcards are escaped
    });

    it('denies anonymous writes and owner-only functions', async () => {
      await expect(anon((c) => c.query(`update items set price = 1`))).rejects.toThrow(/permission denied/);
      await expect(anon((c) => c.query(`insert into items (item_id, title, category, price, status) values ('X1','x','y',1,'available')`))).rejects.toThrow(/permission denied/);
      await expect(anon((c) => c.query(`select publish_import('{}'::jsonb)`))).rejects.toThrow(/permission denied/);
      await expect(anon((c) => c.query(`select * from inventory_revisions`))).rejects.toThrow(/permission denied/);
    });
  });

  describe('signed-in but not on the owner allowlist', () => {
    it('cannot change items, publish, read history or upload photos', async () => {
      const upd = await stranger((c) => c.query(`update items set status = 'sold' where item_id = 'DEMO-001'`));
      expect(upd.rowCount).toBe(0);
      await expect(stranger(async (c) => c.query('select publish_import($1)', [await payload()]))).rejects.toThrow(/not_authorized/);
      expect((await stranger((c) => c.query('select * from inventory_revisions'))).rowCount).toBe(0);
      await expect(stranger((c) => c.query(`insert into item_photos (item_id, source, storage_path) values ('DEMO-001','upload','items/DEMO-001/a.jpg')`))).rejects.toThrow(/row-level security/);
      await expect(stranger((c) => c.query(`insert into storage.objects (bucket_id, name) values ('item-photos','items/DEMO-001/a.jpg')`))).rejects.toThrow(/row-level security/);
      const draft = await stranger((c) => c.query(`select * from items where item_id = 'DEMO-005'`));
      expect(draft.rowCount).toBe(0);
    });
  });

  describe('owner', () => {
    it('can change status but not prices directly (imports only)', async () => {
      const r = await owner((c) => c.query(`update items set status = 'sold' where item_id = 'DEMO-001'`));
      expect(r.rowCount).toBe(1);
      await expect(owner((c) => c.query(`update items set price = 1 where item_id = 'DEMO-001'`))).rejects.toThrow(/permission denied/);
    });

    it('can upload photos into the item folder only', async () => {
      await owner((c) => c.query(`insert into storage.objects (bucket_id, name) values ('item-photos','items/DEMO-001/a.jpg')`));
      await owner((c) => c.query(`insert into item_photos (item_id, source, storage_path) values ('DEMO-001','upload','items/DEMO-001/a.jpg')`));
      await expect(owner((c) => c.query(`insert into item_photos (item_id, source, storage_path) values ('DEMO-001','upload','items/DEMO-002/a.jpg')`))).rejects.toThrow(/photo_source_shape/);
      await expect(owner((c) => c.query(`insert into item_photos (item_id, source, external_url) values ('DEMO-001','url','https://x.example/a.jpg')`))).rejects.toThrow(/permission denied|row-level security/);
    });

    it('publishes atomically, records history, and preserves uploaded photos', async () => {
      await owner((c) => c.query(`insert into item_photos (item_id, source, storage_path) values ('DEMO-001','upload','items/DEMO-001/a.jpg')`));
      const before = await revision();
      const r = await publish(await payload({
        upserts: [
          newItem('00491', { status: 'draft' }),
          { item_id: 'DEMO-001', is_new: false, fields: { price: 99.5 }, url_photos: ['https://x.example/b.jpg'] },
        ],
      }));
      expect(r.already_applied).toBe(false);
      expect(r.revision).toBeGreaterThan(before);
      const items = await owner((c) => c.query(`select item_id, price::text, status, description from items where item_id in ('00491','DEMO-001') order by item_id`));
      expect(items.rows).toEqual([
        { item_id: '00491', price: '10.00', status: 'draft', description: '' },
        { item_id: 'DEMO-001', price: '99.50', status: 'available', description: 'Example listing. Replace with real inventory.' },
      ]);
      const photos = await owner((c) => c.query(`select source, position from item_photos where item_id = 'DEMO-001' order by position`));
      expect(photos.rows).toEqual([{ source: 'upload', position: 0 }, { source: 'url', position: 1 }]);
      const runs = await owner((c) => c.query('select kind, recovery_revision_id from import_runs'));
      expect(runs.rows).toHaveLength(1);
      const recovery = await owner((c) => c.query('select snapshot from inventory_revisions where id = $1', [runs.rows[0].recovery_revision_id]));
      expect(recovery.rows[0].snapshot.find((s) => s.item_id === 'DEMO-001').price).toBe(129.99);
    });

    it('rejects a stale preview without changing anything', async () => {
      const p = await payload({ upserts: [newItem('NEW-1')] });
      await owner((c) => c.query(`update items set status = 'sold' where item_id = 'DEMO-002'`));
      await expect(publish(p)).rejects.toThrow(/stale_preview/);
      expect((await owner((c) => c.query(`select 1 from items where item_id = 'NEW-1'`))).rowCount).toBe(0);
    });

    it('applies a repeated submission once', async () => {
      const p = await payload({ upserts: [newItem('NEW-2')] });
      const first = await publish(p);
      const again = await publish(p);
      expect(again).toEqual({ revision: first.revision, already_applied: true });
      expect((await owner((c) => c.query('select * from import_runs'))).rowCount).toBe(1);
    });

    it('re-validates and rolls back everything when any row is invalid', async () => {
      const before = await revision();
      const p = await payload({ upserts: [newItem('NEW-3'), { item_id: 'DEMO-001', is_new: false, fields: { price: 1.005 }, url_photos: null }] });
      await expect(publish(p)).rejects.toThrow(/invalid price/);
      for (const bad of [{ status: 'on hold' }, { price: -1 }, { date_added: '2026-02-30' }, { title: '   ' }, { secret: 'x' }]) {
        const q = await payload({ upserts: [{ item_id: 'DEMO-001', is_new: false, fields: bad, url_photos: null }] });
        await expect(publish(q)).rejects.toThrow(/invalid_item/);
      }
      await expect(publish(await payload({ upserts: [{ ...newItem('NEW-4'), url_photos: ['javascript:alert(1)'] }] }))).rejects.toThrow(/invalid photo links/);
      expect(await revision()).toBe(before);
      expect((await owner((c) => c.query(`select 1 from items where item_id like 'NEW-%'`))).rowCount).toBe(0);
      expect((await owner((c) => c.query('select 1 from inventory_revisions'))).rowCount).toBe(0);
    });

    it('complete imports archive only the reviewed set and never delete', async () => {
      const present = ['DEMO-001', 'DEMO-002', 'DEMO-003'];
      const upserts = [{ item_id: 'DEMO-001', is_new: false, fields: { price: 1 }, url_photos: null }];
      await expect(publish(await payload({ mode: 'complete', upserts, present_ids: present, expected_archive_ids: [] }))).rejects.toThrow(/archive_mismatch/);
      await publish(await payload({ mode: 'complete', upserts, present_ids: present, expected_archive_ids: ['DEMO-004', 'DEMO-005'] }));
      const rows = await owner((c) => c.query(`select item_id, status from items order by item_id`));
      expect(rows.rowCount).toBe(5);
      expect(rows.rows.filter((r) => r.status === 'archived').map((r) => r.item_id)).toEqual(['DEMO-004', 'DEMO-005']);
    });

    it('rolls back to a restore point with a recovery point and audit record', async () => {
      await publish(await payload({ upserts: [newItem('NEW-5'), { item_id: 'DEMO-001', is_new: false, fields: { price: 5 }, url_photos: ['https://x.example/c.jpg'] }] }));
      const target = (await owner((c) => c.query(`select id from inventory_revisions where kind = 'import'`))).rows[0].id;
      await expect(stranger(async (c) => c.query('select rollback_inventory($1,$2,$3)', [target, await revision(), randomUUID()]))).rejects.toThrow(/not_authorized/);
      await expect(owner((c) => c.query('select rollback_inventory($1,$2,$3)', [target, 0, randomUUID()]))).rejects.toThrow(/stale_preview/);
      await owner(async (c) => c.query('select rollback_inventory($1,$2,$3)', [target, await revision(), randomUUID()]));
      const rows = await owner((c) => c.query(`select item_id, price::text, status from items where item_id in ('DEMO-001','NEW-5') order by item_id`));
      expect(rows.rows).toEqual([
        { item_id: 'DEMO-001', price: '129.99', status: 'available' },
        { item_id: 'NEW-5', price: '10.00', status: 'archived' },
      ]);
      expect((await owner((c) => c.query(`select 1 from item_photos where source = 'url'`))).rowCount).toBe(0);
      const kinds = await owner((c) => c.query(`select kind from inventory_revisions order by id`));
      expect(kinds.rows.map((r) => r.kind)).toEqual(['import', 'rollback']);
      const recovery = await owner((c) => c.query(`select snapshot from inventory_revisions where kind = 'rollback'`));
      expect(recovery.rows[0].snapshot.find((s) => s.item_id === 'DEMO-001').price).toBe(5);
    });
  });
});
