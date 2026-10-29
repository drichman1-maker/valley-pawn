import { CLEARABLE_FIELDS, COMPARED_FIELDS } from '../inventory/constants.js';
import { priceCents } from '../inventory/normalize.js';

/**
 * Blank-cell policy (applies only to columns that ARE mapped):
 *  - 'keep'  (default): a blank cell leaves the existing value unchanged.
 *  - 'clear': a blank cell clears optional fields (condition, description, brand, model,
 *             accessories, featured -> false, photo links -> none). Required fields (item number,
 *             title, category, price) can never be blank. Status and date added are never cleared.
 * A column that is NOT mapped is never read: every existing value for that field is preserved.
 * Uploaded photos are never changed by an import; the "Photo links" column only manages
 * photos that came from links in a spreadsheet.
 */

export const NEW_ITEM_DEFAULTS = Object.freeze({
  condition: '',
  description: '',
  brand: '',
  model: '',
  accessories: '',
  featured: false,
  // status: no default. The owner must choose a publication status for new items without one.
  // date_added: the import date.
});

export const LARGE_ARCHIVE_COUNT = 10;
export const LARGE_ARCHIVE_SHARE = 0.25;

export const urlPhotosOf = (item) =>
  (item?.photos ?? [])
    .filter((p) => p.source === 'url')
    .sort((a, b) => a.position - b.position)
    .map((p) => p.url);

export function fieldValue(item, field) {
  return field === 'photo_urls' ? urlPhotosOf(item) : item[field];
}

export function sameValue(field, a, b) {
  if (field === 'price') return priceCents(a) === priceCents(b);
  if (field === 'featured') return Boolean(a) === Boolean(b);
  if (field === 'photo_urls') return (a ?? []).join('\n') === (b ?? []).join('\n');
  return String(a ?? '') === String(b ?? '');
}

/**
 * @param {object} p
 * @param {Array} p.rows             output of validateRows
 * @param {Array} p.existingItems    full current inventory (all statuses), with photos
 * @param {'upsert'|'complete'} p.mode
 * @param {'keep'|'clear'} p.blankPolicy
 * @param {null|'draft'|'available'} p.newItemStatus  owner's reviewed choice for new items without a status
 * @param {boolean} p.acknowledgePartial  owner accepted skipping invalid rows (safe upsert only)
 * @param {string} p.today  YYYY-MM-DD
 */
export function buildImportPlan({ rows, existingItems, mode, blankPolicy = 'keep', newItemStatus = null, acknowledgePartial = false, today }) {
  const byId = new Map(existingItems.map((i) => [i.item_id, i]));
  const entries = [];
  const invalid = rows.filter((r) => !r.valid);
  const newWithoutStatus = [];

  for (const row of rows.filter((r) => r.valid)) {
    const existing = byId.get(row.itemId);
    const current = existing
      ? Object.fromEntries(COMPARED_FIELDS.map((f) => [f, fieldValue(existing, f)]))
      : { ...NEW_ITEM_DEFAULTS, status: null, date_added: today, photo_urls: [] };
    const next = { ...current };

    for (const [field, cell] of Object.entries(row.fields)) {
      if (field === 'item_id') continue;
      if (cell.blank) {
        if (!existing) continue; // defaults already applied
        if (blankPolicy === 'clear' && CLEARABLE_FIELDS.includes(field)) {
          next[field] = field === 'featured' ? false : field === 'photo_urls' ? [] : '';
        }
        continue;
      }
      next[field] = cell.value;
    }

    if (!existing && !next.status) {
      if (newItemStatus) next.status = newItemStatus;
      else newWithoutStatus.push(row.itemId);
    }

    const changes = existing
      ? COMPARED_FIELDS.filter((f) => !sameValue(f, current[f], next[f])).map((f) => ({ field: f, from: current[f], to: next[f] }))
      : [];
    entries.push({
      kind: existing ? (changes.length ? 'update' : 'unchanged') : 'new',
      rowNumber: row.rowNumber,
      itemId: row.itemId,
      warnings: row.warnings,
      next,
      changes,
      statusFromDefault: !existing && !row.fields.status?.value,
    });
  }

  // Never archive an item whose number appears anywhere in the file, even on an invalid row.
  const mentioned = new Set(rows.map((r) => r.itemId).filter(Boolean));
  const archives =
    mode === 'complete' ? existingItems.filter((i) => i.status !== 'archived' && !mentioned.has(i.item_id)) : [];

  const activeNow = existingItems.filter((i) => i.status !== 'archived').length;
  const activeAfter =
    mode === 'complete'
      ? entries.filter((e) => e.next.status !== 'archived').length +
        existingItems.filter((i) => i.status !== 'archived' && mentioned.has(i.item_id) && !entries.some((e) => e.itemId === i.item_id)).length
      : null;

  const counts = {
    new: entries.filter((e) => e.kind === 'new').length,
    update: entries.filter((e) => e.kind === 'update').length,
    unchanged: entries.filter((e) => e.kind === 'unchanged').length,
    invalid: invalid.length,
    archive: archives.length,
  };

  const blockers = [];
  if (!entries.length) blockers.push('There are no valid rows to publish.');
  if (invalid.length && mode === 'complete') {
    blockers.push(`Complete inventory imports can't be published while any row has an error. Fix the ${invalid.length} row(s) listed and upload again.`);
  }
  if (invalid.length && mode === 'upsert' && !acknowledgePartial) {
    blockers.push(`${invalid.length} row(s) have errors. Fix them, or confirm that you want to publish without them.`);
  }
  if (newWithoutStatus.length) {
    blockers.push(`Choose a publication status for ${newWithoutStatus.length} new item(s) that don't have one.`);
  }
  if (entries.length && counts.new + counts.update + counts.archive === 0) {
    blockers.push('Nothing would change. Every row matches the current inventory.');
  }

  const largeArchive =
    archives.length > 0 &&
    (archives.length >= LARGE_ARCHIVE_COUNT || archives.length >= activeNow * LARGE_ARCHIVE_SHARE || activeAfter === 0);

  return {
    mode,
    blankPolicy,
    entries,
    invalid,
    archives,
    counts,
    newWithoutStatus,
    blockers,
    blocked: blockers.length > 0,
    requiresArchiveConfirmation: archives.length > 0,
    requiresTypedConfirmation: largeArchive,
    emptiesInventory: activeAfter === 0,
  };
}

const WRITE_FIELDS = ['title', 'category', 'price', 'condition', 'description', 'brand', 'model', 'status', 'featured', 'date_added', 'accessories'];

/** Payload sent to the trusted backend. Validated again server-side. */
export function toPublishPayload(plan, { baseRevision, idempotencyKey, fileName, fileSha256 }) {
  const upserts = plan.entries
    .filter((e) => e.kind !== 'unchanged')
    .map((e) => {
      const isNew = e.kind === 'new';
      const changed = new Set(e.changes.map((c) => c.field));
      const fields = {};
      for (const f of WRITE_FIELDS) if (isNew || changed.has(f)) fields[f] = e.next[f];
      const urlPhotos = isNew || changed.has('photo_urls') ? e.next.photo_urls : null;
      return { item_id: e.itemId, is_new: isNew, fields, url_photos: urlPhotos };
    });
  return {
    mode: plan.mode,
    base_revision: baseRevision,
    idempotency_key: idempotencyKey,
    file_name: fileName,
    file_sha256: fileSha256,
    upserts,
    // Complete mode: every item number in the file. The server recomputes archives from this
    // and refuses to publish if they differ from what the owner reviewed.
    present_ids: plan.mode === 'complete' ? [...new Set([...plan.entries.map((e) => e.itemId), ...plan.invalid.map((r) => r.itemId).filter(Boolean)])] : [],
    expected_archive_ids: plan.archives.map((i) => i.item_id).sort(),
    summary: { ...plan.counts },
  };
}
