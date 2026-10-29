import { describe, expect, it } from 'vitest';
import { applyPublish, applyRollback, applySetStatus, PublishError } from '../../src/lib/backend/memoryStore.js';
import { item } from '../helpers.js';

const baseState = () => ({
  revision: 5,
  lastChangedAt: null,
  lastPublishedAt: null,
  items: [
    item({ item_id: 'PL-1', photos: [{ id: 'u1', source: 'upload', url: 'blob:u1', position: 0 }] }),
    item({ item_id: 'PL-2', title: 'Ring', price: 300 }),
  ],
  revisions: [],
  runs: [],
});

const payload = (over = {}) => ({
  mode: 'upsert',
  base_revision: 5,
  idempotency_key: 'key-1',
  file_name: 'inv.xlsx',
  file_sha256: 'abc',
  upserts: [
    { item_id: 'PL-1', is_new: false, fields: { price: 90 }, url_photos: ['https://x.example/a.jpg'] },
    { item_id: 'NEW-1', is_new: true, fields: { title: 'Lamp', category: 'Home', price: 5, status: 'draft', condition: '', description: '', brand: '', model: '', accessories: '', featured: false, date_added: '2026-10-28' }, url_photos: [] },
  ],
  present_ids: [],
  expected_archive_ids: [],
  summary: {},
  ...over,
});

describe('publish', () => {
  it('applies changes, keeps uploaded photos, records a recovery point', () => {
    const { state, result } = applyPublish(baseState(), payload());
    expect(result).toEqual({ revision: 6, alreadyApplied: false });
    const pl1 = state.items.find((i) => i.item_id === 'PL-1');
    expect(pl1.price).toBe(90);
    expect(pl1.photos.map((p) => p.source)).toEqual(['upload', 'url']);
    expect(state.revisions[0]).toMatchObject({ kind: 'import', revision_before: 5 });
    expect(state.revisions[0].snapshot.find((s) => s.item_id === 'PL-1').price).toBe(100);
  });

  it('rejects a stale preview', () => {
    expect(() => applyPublish(baseState(), payload({ base_revision: 4 }))).toThrow(/Refresh the preview/);
  });

  it('is idempotent for repeated submissions', () => {
    const first = applyPublish(baseState(), payload());
    const again = applyPublish(first.state, payload({ base_revision: 5 }));
    expect(again.result.alreadyApplied).toBe(true);
    expect(again.state).toBe(first.state);
    expect(first.state.items).toHaveLength(3);
  });

  it('leaves inventory untouched when publishing fails part-way', () => {
    const s = baseState();
    const before = structuredClone(s);
    expect(() => applyPublish(s, payload(), { failAfter: 1 })).toThrow(PublishError);
    expect(s).toEqual(before);
  });

  it('re-validates on the trusted side', () => {
    const bad = payload({ upserts: [{ item_id: 'PL-1', is_new: false, fields: { price: -1 }, url_photos: null }] });
    expect(() => applyPublish(baseState(), bad)).toThrow(/invalid price/);
    const badStatus = payload({ upserts: [{ item_id: 'PL-1', is_new: false, fields: { status: 'on hold' }, url_photos: null }] });
    expect(() => applyPublish(baseState(), badStatus)).toThrow(/invalid status/);
  });

  it('refuses complete imports whose archive list differs from the reviewed one', () => {
    const p = payload({ mode: 'complete', upserts: [{ item_id: 'PL-1', is_new: false, fields: { price: 1 }, url_photos: null }], present_ids: ['PL-1'], expected_archive_ids: [] });
    expect(() => applyPublish(baseState(), p)).toThrow(/differ from the reviewed preview/);
    const ok = applyPublish(baseState(), { ...p, expected_archive_ids: ['PL-2'] });
    expect(ok.state.items.find((i) => i.item_id === 'PL-2').status).toBe('archived');
    expect(ok.state.items).toHaveLength(2); // archived, never deleted
  });
});

describe('rollback', () => {
  it('restores a consistent revision and saves a recovery point first', () => {
    const published = applyPublish(baseState(), payload()).state;
    const target = published.revisions[0];
    const { state } = applyRollback(published, { revisionId: target.id, baseRevision: published.revision, idempotencyKey: 'rb-1' });
    expect(state.items.find((i) => i.item_id === 'PL-1').price).toBe(100);
    expect(state.items.find((i) => i.item_id === 'PL-1').photos.map((p) => p.source)).toEqual(['upload']);
    expect(state.items.find((i) => i.item_id === 'NEW-1').status).toBe('archived');
    expect(state.revisions[0]).toMatchObject({ kind: 'rollback' });
    expect(state.revisions[0].snapshot.find((s) => s.item_id === 'PL-1').price).toBe(90);
  });

  it('rejects rollback against a stale revision', () => {
    const published = applyPublish(baseState(), payload()).state;
    const changed = applySetStatus(published, 'PL-2', 'sold');
    expect(() => applyRollback(changed, { revisionId: published.revisions[0].id, baseRevision: published.revision, idempotencyKey: 'rb' })).toThrow(/changed/);
  });
});
