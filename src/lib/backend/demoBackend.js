// DEMO MODE backend: in-memory only, reset on every page load, no real authentication.
// Implements the same interface and publish semantics as the Supabase backend.
import { applyPublish, applyRollback, applySetStatus, PublishError } from './memoryStore.js';
import { BackendError } from './errors.js';
import { DEMO_ITEMS } from './demoData.js';
import { PAGE_SIZE } from '../url/filters.js';
import { PUBLIC_STATUSES } from '../inventory/constants.js';
import { preparePhoto } from '../photos/preparePhoto.js';

const wrap = (fn) => (...args) => {
  try {
    return Promise.resolve(fn(...args));
  } catch (e) {
    if (e instanceof PublishError) {
      return Promise.reject(new BackendError(e.code === 'archive_mismatch' ? 'stale' : e.code === 'failed' ? 'failed' : e.code, e.message));
    }
    return Promise.reject(e);
  }
};

export function createDemoBackend({ items = DEMO_ITEMS, latencyMs = 0, lastPublishedAt = null } = {}) {
  let state = { revision: 1, lastChangedAt: null, lastPublishedAt, items: structuredClone(items), revisions: [], runs: [] };
  let session = null;
  const authListeners = new Set();
  const delay = (v) => (latencyMs ? new Promise((r) => setTimeout(() => r(v), latencyMs)) : Promise.resolve(v));
  const copy = (x) => structuredClone(x);
  const isPublic = (i) => PUBLIC_STATUSES.includes(i.status);
  let photoSeq = 0;

  return {
    mode: 'demo',
    _getState: () => state,

    searchPublicItems: wrap((f, { pageSize = PAGE_SIZE, featured = null, exclude = null } = {}) => {
      const q = f.q?.trim().toLowerCase();
      let list = state.items.filter(
        (i) =>
          i.status === 'available' &&
          (!q || [i.title, i.brand, i.model, i.description, i.item_id].join(' ').toLowerCase().includes(q)) &&
          (!f.category || i.category === f.category) &&
          (!f.condition || i.condition === f.condition) &&
          (f.min === null || i.price >= f.min) &&
          (f.max === null || i.price <= f.max) &&
          (featured === null || i.featured === featured) &&
          (!exclude || i.item_id !== exclude),
      );
      list = list.sort((a, b) =>
        f.sort === 'price-asc' ? a.price - b.price : f.sort === 'price-desc' ? b.price - a.price : b.date_added.localeCompare(a.date_added) || a.item_id.localeCompare(b.item_id),
      );
      const start = (Math.max(1, f.page) - 1) * pageSize;
      return delay({ total: list.length, items: copy(list.slice(start, start + pageSize)) });
    }),
    getPublicItem: wrap((itemId) => delay(copy(state.items.find((i) => i.item_id === itemId && isPublic(i)) ?? null))),
    getPublicCategories: wrap(() => {
      const counts = {};
      for (const i of state.items) if (i.status === 'available') counts[i.category] = (counts[i.category] ?? 0) + 1;
      return delay(Object.entries(counts).sort().map(([category, count]) => ({ category, count })));
    }),
    getInventoryInfo: wrap(() => delay({ revision: state.revision, lastPublishedAt: state.lastPublishedAt })),

    getSession: wrap(() => delay(session)),
    onAuthChange(cb) {
      authListeners.add(cb);
      return () => authListeners.delete(cb);
    },
    signIn: wrap(() => {
      session = { user: { email: 'demo-owner' }, demo: true };
      authListeners.forEach((cb) => cb(session));
      return delay();
    }),
    signOut: wrap(() => {
      session = null;
      authListeners.forEach((cb) => cb(null));
      return delay();
    }),
    isOwner: wrap(() => delay(Boolean(session))),

    listAllItems: wrap(() => delay(copy(state.items))),
    publishImport: wrap((payload) => {
      const r = applyPublish(state, payload);
      state = r.state;
      return delay(r.result);
    }),
    listHistory: wrap(() =>
      delay({
        revisions: state.revisions.map(({ snapshot, ...r }) => r),
        runs: copy(state.runs),
      }),
    ),
    rollback: wrap((args) => {
      const r = applyRollback(state, args);
      state = r.state;
      return delay(r.result);
    }),
    setItemStatus: wrap((itemId, status) => {
      state = applySetStatus(state, itemId, status);
      return delay();
    }),
    uploadPhoto: async (itemId, file, position) => {
      const prepared = await preparePhoto(file);
      const next = copy(state);
      const item = next.items.find((i) => i.item_id === itemId);
      if (item.photos.length >= 12) throw new BackendError('invalid', 'An item can have at most 12 photos.');
      const url = URL.createObjectURL(prepared.full);
      item.photos.push({ id: `demo-photo-${++photoSeq}`, source: 'upload', url, thumb_url: URL.createObjectURL(prepared.thumb), width: prepared.width, height: prepared.height, position });
      next.revision += 1;
      state = next;
    },
    deletePhoto: wrap((photo) => {
      const next = copy(state);
      for (const i of next.items) i.photos = i.photos.filter((p) => p.id !== photo.id).map((p, position) => ({ ...p, position }));
      next.revision += 1;
      state = next;
      return delay();
    }),
    reorderPhotos: wrap((itemId, orderedIds) => {
      const next = copy(state);
      const item = next.items.find((i) => i.item_id === itemId);
      const ids = item.photos.map((p) => p.id).sort().join();
      if ([...orderedIds].sort().join() !== ids) throw new PublishError('stale', 'Photos changed; reload and try again.');
      item.photos = orderedIds.map((id, position) => ({ ...item.photos.find((p) => p.id === id), position }));
      next.revision += 1;
      state = next;
      return delay();
    }),
  };
}
