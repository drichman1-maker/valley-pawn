import { describe, expect, it } from 'vitest';
import { parsePrice, parseStatus, parseBoolean, parseDate, parseItemId, parsePhotoUrls, parseCategory } from '../../src/lib/inventory/normalize.js';
import { validateRows } from '../../src/lib/import/validateRows.js';
import { buildImportPlan, toPublishPayload } from '../../src/lib/import/plan.js';
import { autoMap, reconcileMapping, validateMapping } from '../../src/lib/import/mapping.js';
import { cell, num, item } from '../helpers.js';

describe('prices', () => {
  it.each([
    ['129.99', 129.99],
    ['$1,250.00', 1250],
    ['0', 0],
    ['0.5', 0.5],
  ])('accepts %s', (t, v) => expect(parsePrice(cell(t))).toEqual({ ok: true, value: v }));

  it.each(['-5', '$-5', '(5.00)', 'abc', '12abc', '1.2.3', '1,25', '12.345', '$', 'Infinity', 'NaN', '1e5', '١٢'])('rejects %s', (t) => {
    expect(parsePrice(cell(t)).ok).toBe(false);
  });

  it('rejects non-finite, negative and sub-cent Excel numbers', () => {
    expect(parsePrice(num(Infinity)).ok).toBe(false);
    expect(parsePrice(num(-1)).ok).toBe(false);
    expect(parsePrice(num(1.005)).ok).toBe(false);
    expect(parsePrice(num(19.990000000000002))).toEqual({ ok: true, value: 19.99 });
  });

  it('treats a blank price as blank, not zero', () => expect(parsePrice(cell(''))).toEqual({ ok: true, blank: true }));
});

describe('other fields', () => {
  it('rejects unknown statuses instead of defaulting to available', () => {
    expect(parseStatus(cell('Available ')).value).toBe('available');
    expect(parseStatus(cell('on hold'))).toMatchObject({ ok: false });
  });
  it('recognizes booleans and rejects others', () => {
    expect(parseBoolean(cell('Yes')).value).toBe(true);
    expect(parseBoolean(cell('0')).value).toBe(false);
    expect(parseBoolean(cell('maybe')).ok).toBe(false);
  });
  it('validates dates', () => {
    expect(parseDate(cell('2026-02-28')).value).toBe('2026-02-28');
    expect(parseDate(cell('10/5/2026')).value).toBe('2026-10-05');
    expect(parseDate(cell('2026-02-30')).ok).toBe(false);
    expect(parseDate(cell('yesterday')).ok).toBe(false);
  });
  it('keeps leading-zero IDs as strings and warns about numeric Excel IDs', () => {
    expect(parseItemId(cell('00491'))).toEqual({ ok: true, value: '00491' });
    const formatted = parseItemId(num(491, { text: '00491', leadingZeroFormat: true }));
    expect(formatted.value).toBe('00491');
    expect(formatted.warning).toMatch(/displayed with leading zeros/);
    expect(parseItemId(num(491)).warning).toMatch(/cannot be recovered/);
    expect(parseItemId(cell('PL 1')).ok).toBe(false);
  });
  it('accepts https photo links only', () => {
    expect(parsePhotoUrls(cell('https://a.example/1.jpg | https://a.example/2.jpg')).value).toHaveLength(2);
    expect(parsePhotoUrls(cell('http://a.example/1.jpg')).ok).toBe(false);
    expect(parsePhotoUrls(cell('javascript:alert(1)')).ok).toBe(false);
  });
  it('normalizes categories to existing labels', () => {
    expect(parseCategory(cell('  musical   instruments'), ['Musical Instruments']).value).toBe('Musical Instruments');
    expect(parseCategory(cell('power TOOLS'), []).value).toBe('Power Tools');
  });
});

describe('mapping', () => {
  const headers = ['Item #', 'Title', 'Category', 'Price', 'Acquisition price'].map((name, index) => ({ name, index }));
  it('maps exact synonyms only (no substring matches)', () => {
    const m = autoMap(headers);
    expect(m).toMatchObject({ item_id: 'Item #', title: 'Title', category: 'Category', price: 'Price' });
    expect(Object.values(m)).not.toContain('Acquisition price');
  });
  it('drops remembered mappings whose heading is not in the current file', () => {
    const { mapping, dropped } = reconcileMapping({ price: 'Retail', title: 'Title' }, headers);
    expect(dropped).toEqual([{ field: 'price', header: 'Retail' }]);
    expect(mapping.title).toBe('Title');
    expect(mapping.price).toBeUndefined();
  });
  it('requires required fields and one column per field', () => {
    expect(validateMapping({ item_id: 'Item #', title: 'Title', category: 'Title' }, headers).join(' ')).toMatch(/Price.*more than one field|more than one field/s);
  });
});

// ---- rows -> plan
const HEAD = ['id', 'title', 'category', 'price', 'status', 'description', 'photos'];
const headers = HEAD.map((name, index) => ({ name, index }));
const fullMapping = { item_id: 'id', title: 'title', category: 'category', price: 'price', status: 'status', description: 'description', photo_urls: 'photos' };
const rowsOf = (data) => data.map((r, i) => ({ rowNumber: i + 2, cells: r.map(cell) }));
const validate = (data, existing = [], mapping = fullMapping) => validateRows({ dataRows: rowsOf(data), headers, mapping, existingItems: existing, knownCategories: ['Tools'] });

describe('duplicates', () => {
  it('flags every duplicate row, including an invalid first occurrence', () => {
    const rows = validate([
      ['PL-9', '', 'Tools', 'abc', '', '', ''], // invalid AND duplicate
      ['PL-9', 'Good row', 'Tools', '10', 'available', '', ''],
      ['pl-9', 'Case variant', 'Tools', '10', 'available', '', ''],
    ]);
    expect(rows.every((r) => !r.valid)).toBe(true);
    expect(rows[1].errors[0]).toMatch(/rows 2, 3, 4/);
  });
});

describe('plan', () => {
  const existing = [
    item({ item_id: 'PL-1', description: 'Original', photos: [
      { id: 'u1', source: 'upload', url: 'https://cdn/u1.jpg', position: 0 },
      { id: 'l1', source: 'url', url: 'https://old.example/a.jpg', position: 1 },
    ] }),
    item({ item_id: 'PL-2', title: 'Ring', category: 'Jewelry', price: 300 }),
    item({ item_id: 'PL-3', title: 'Old', status: 'archived' }),
  ];
  const plan = (data, opts = {}, mapping = fullMapping) =>
    buildImportPlan({ rows: validate(data, existing, mapping), existingItems: existing, mode: 'upsert', today: '2026-10-28', ...opts });

  it('preserves unmapped fields on existing items', () => {
    const p = plan([['PL-1', 'Drill v2', 'Tools', '100']], {}, { item_id: 'id', title: 'title', category: 'category', price: 'price' });
    const e = p.entries[0];
    expect(e.kind).toBe('update');
    expect(e.changes.map((c) => c.field)).toEqual(['title']);
    expect(e.next.description).toBe('Original');
    expect(e.next.date_added).toBe('2026-01-02');
    expect(e.next.photo_urls).toEqual(['https://old.example/a.jpg']);
  });

  it('keeps or clears on blank cells according to the chosen policy', () => {
    const data = [['PL-1', 'Drill', 'Tools', '100', '', '', '']];
    expect(plan(data, { blankPolicy: 'keep' }).entries[0].kind).toBe('unchanged');
    const cleared = plan(data, { blankPolicy: 'clear' }).entries[0];
    expect(cleared.changes.map((c) => c.field).sort()).toEqual(['description', 'photo_urls']);
    expect(cleared.next.status).toBe('available'); // status is never cleared
  });

  it('replaces spreadsheet photo links but never touches uploaded photos', () => {
    const p = plan([['PL-1', 'Drill', 'Tools', '100', '', 'Original', 'https://new.example/b.jpg']]);
    const payload = toPublishPayload(p, { baseRevision: 1, idempotencyKey: 'k', fileName: 'f', fileSha256: 'x' });
    expect(payload.upserts[0].url_photos).toEqual(['https://new.example/b.jpg']);
    expect(payload.upserts[0].fields).toEqual({});
  });

  it('compares prices by cents, not by object serialization', () => {
    expect(plan([['PL-2', 'Ring', 'Jewelry', '$300.00', '', '', '']]).entries[0].kind).toBe('unchanged');
  });

  it('requires an explicit status choice for new items without one', () => {
    const p = plan([['NEW-1', 'Lamp', 'tools', '5', '', '', '']]);
    expect(p.blocked).toBe(true);
    expect(p.newWithoutStatus).toEqual(['NEW-1']);
    const chosen = plan([['NEW-1', 'Lamp', 'tools', '5', '', '', '']], { newItemStatus: 'draft' });
    expect(chosen.blocked).toBe(false);
    expect(chosen.entries[0].next).toMatchObject({ status: 'draft', category: 'Tools', date_added: '2026-10-28', featured: false });
  });

  it('blocks safe upsert with errors until skipping is acknowledged', () => {
    const data = [['PL-1', 'Drill v3', 'Tools', '100'], ['PL-2', 'Ring', 'Jewelry', '-1']];
    expect(plan(data).blocked).toBe(true);
    const ack = plan(data, { acknowledgePartial: true });
    expect(ack.blocked).toBe(false);
    expect(ack.counts).toMatchObject({ update: 1, invalid: 1 });
  });

  it('complete mode is blocked by any invalid row, and never archives an item whose row is invalid', () => {
    const p = plan([['PL-1', 'Drill', 'Tools', '100'], ['PL-2', 'Ring', 'Jewelry', 'oops']], { mode: 'complete', acknowledgePartial: true });
    expect(p.blocked).toBe(true);
    expect(p.archives.map((i) => i.item_id)).toEqual([]); // PL-2 is in the file; PL-3 already archived
  });

  it('complete mode previews archives and flags emptying the inventory', () => {
    const p = plan([['PL-1', 'Drill', 'Tools', '100', 'archived', 'Original', 'https://old.example/a.jpg']], { mode: 'complete' });
    expect(p.archives.map((i) => i.item_id)).toEqual(['PL-2']);
    expect(p.requiresArchiveConfirmation).toBe(true);
    expect(p.emptiesInventory).toBe(true);
    expect(p.requiresTypedConfirmation).toBe(true);
  });
});
