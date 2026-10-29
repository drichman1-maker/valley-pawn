// Pure state transitions for the DEMO backend. They mirror the SQL functions in
// supabase/migrations so the import flow can be exercised without a database.
// Every function returns a NEW state; on error the caller's state is untouched (atomicity).
import { STATUSES } from '../inventory/constants.js';
import { validateItemFields, validateUrlPhotos } from '../inventory/serverValidation.js';

export class PublishError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const clone = (x) => structuredClone(x);
const ITEM_FIELDS = ['item_id', 'title', 'category', 'price', 'condition', 'description', 'brand', 'model', 'status', 'featured', 'date_added', 'accessories'];

function snapshotOf(state) {
  return state.items.map((i) => ({
    ...Object.fromEntries(ITEM_FIELDS.map((f) => [f, i[f]])),
    url_photos: i.photos.filter((p) => p.source === 'url').sort((a, b) => a.position - b.position).map((p) => p.url),
  }));
}

function bump(state, now) {
  state.revision += 1;
  state.lastChangedAt = now;
}

let photoSeq = 0;
function setUrlPhotos(item, urls) {
  const uploads = item.photos.filter((p) => p.source !== 'url');
  const urlPhotos = urls.map((url) => ({ id: `url-${++photoSeq}`, source: 'url', url, thumb_url: url }));
  // Uploaded photos keep their order first; spreadsheet links follow.
  item.photos = [...uploads.sort((a, b) => a.position - b.position), ...urlPhotos].map((p, position) => ({ ...p, position }));
}

/**
 * Applies a publish payload (see plan.toPublishPayload).
 * @param {object} opts.failAfter  test hook: throw after N upserts to prove all-or-nothing behaviour
 */
export function applyPublish(state, payload, { now = new Date().toISOString(), actor = 'demo-owner', failAfter } = {}) {
  const prior = state.runs.find((r) => r.idempotency_key === payload.idempotency_key);
  if (prior) return { state, result: { revision: prior.revision_after, alreadyApplied: true } };
  if (payload.base_revision !== state.revision) {
    throw new PublishError('stale', 'Inventory changed after this preview was prepared. Refresh the preview and review it again.');
  }
  if (!['upsert', 'complete'].includes(payload.mode)) throw new PublishError('invalid', 'Unknown import mode.');

  const next = clone(state);
  const byId = new Map(next.items.map((i) => [i.item_id, i]));
  const seen = new Set();

  // Validate everything before changing anything.
  for (const u of payload.upserts) {
    if (seen.has(u.item_id.toLowerCase())) throw new PublishError('invalid', `Item ${u.item_id} appears twice in the import.`);
    seen.add(u.item_id.toLowerCase());
    const errs = [...validateItemFields(u.item_id, u.fields, u.is_new), ...validateUrlPhotos(u.url_photos)];
    if (errs.length) throw new PublishError('invalid', `Item ${u.item_id}: ${errs.join(', ')}`);
    if (u.is_new && byId.has(u.item_id)) throw new PublishError('stale', `Item ${u.item_id} already exists. Refresh the preview.`);
    if (!u.is_new && !byId.has(u.item_id)) throw new PublishError('stale', `Item ${u.item_id} no longer exists. Refresh the preview.`);
  }

  let archiveIds = [];
  if (payload.mode === 'complete') {
    const present = new Set(payload.present_ids);
    for (const u of payload.upserts) if (!present.has(u.item_id)) throw new PublishError('invalid', 'Complete import is missing item numbers.');
    archiveIds = next.items.filter((i) => i.status !== 'archived' && !present.has(i.item_id)).map((i) => i.item_id).sort();
    if (archiveIds.join('\n') !== [...(payload.expected_archive_ids ?? [])].sort().join('\n')) {
      throw new PublishError('archive_mismatch', 'The items to archive differ from the reviewed preview. Refresh the preview.');
    }
  }

  const recovery = { id: `rev-${next.revision}-${next.revisions.length + 1}`, created_at: now, kind: 'import', actor, revision_before: next.revision, label: `Before import of ${payload.file_name}`, item_count: next.items.length, snapshot: snapshotOf(next) };

  payload.upserts.forEach((u, i) => {
    if (failAfter !== undefined && i === failAfter) throw new PublishError('failed', 'Simulated failure during publish.');
    let item = byId.get(u.item_id);
    if (!item) {
      item = { item_id: u.item_id, photos: [] };
      next.items.push(item);
      byId.set(u.item_id, item);
    }
    Object.assign(item, u.fields);
    if (u.url_photos) setUrlPhotos(item, u.url_photos);
  });
  for (const id of archiveIds) byId.get(id).status = 'archived';

  bump(next, now);
  next.revisions.unshift(recovery);
  next.runs.unshift({ idempotency_key: payload.idempotency_key, file_name: payload.file_name, file_sha256: payload.file_sha256, mode: payload.mode, summary: payload.summary, revision_after: next.revision, created_at: now, actor, recovery_id: recovery.id });
  next.lastPublishedAt = now;
  return { state: next, result: { revision: next.revision, alreadyApplied: false } };
}

export function applyRollback(state, { revisionId, baseRevision, idempotencyKey }, { now = new Date().toISOString(), actor = 'demo-owner' } = {}) {
  const prior = state.runs.find((r) => r.idempotency_key === idempotencyKey);
  if (prior) return { state, result: { revision: prior.revision_after, alreadyApplied: true } };
  if (baseRevision !== state.revision) throw new PublishError('stale', 'Inventory changed since you opened this page. Reload history and try again.');
  const target = state.revisions.find((r) => r.id === revisionId);
  if (!target) throw new PublishError('invalid', 'That restore point no longer exists.');

  const next = clone(state);
  const recovery = { id: `rev-${next.revision}-${next.revisions.length + 1}`, created_at: now, kind: 'rollback', actor, revision_before: next.revision, label: `Before restoring "${target.label}"`, item_count: next.items.length, snapshot: snapshotOf(next) };
  const byId = new Map(next.items.map((i) => [i.item_id, i]));
  const inSnapshot = new Set();
  for (const s of target.snapshot) {
    inSnapshot.add(s.item_id);
    let item = byId.get(s.item_id);
    if (!item) {
      item = { item_id: s.item_id, photos: [] };
      next.items.push(item);
    }
    const { url_photos: urls, ...fields } = s;
    Object.assign(item, fields);
    setUrlPhotos(item, urls);
  }
  // Items created after the restore point are archived, never deleted.
  for (const item of next.items) if (!inSnapshot.has(item.item_id)) item.status = 'archived';

  bump(next, now);
  next.revisions.unshift(recovery);
  next.runs.unshift({ idempotency_key: idempotencyKey, file_name: null, mode: 'rollback', summary: { restored: target.id }, revision_after: next.revision, created_at: now, actor, recovery_id: recovery.id });
  next.lastPublishedAt = now;
  return { state: next, result: { revision: next.revision, alreadyApplied: false } };
}

export function applySetStatus(state, itemId, status, now = new Date().toISOString()) {
  if (!STATUSES.includes(status)) throw new PublishError('invalid', 'Unknown status.');
  const next = clone(state);
  const item = next.items.find((i) => i.item_id === itemId);
  if (!item) throw new PublishError('invalid', 'Item not found.');
  item.status = status;
  bump(next, now);
  return next;
}
