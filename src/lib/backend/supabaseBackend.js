import { createClient } from '@supabase/supabase-js';
import { BackendError } from './errors.js';
import { PAGE_SIZE } from '../url/filters.js';
import { newKey } from '../format.js';
import { preparePhoto } from '../photos/preparePhoto.js';

const BUCKET = 'item-photos';

function toBackendError(error, fallback = 'Something went wrong talking to the database.') {
  if (!error) return null;
  const msg = error.message ?? String(error);
  const code = /^stale_preview/.test(msg) || /^archive_mismatch/.test(msg)
    ? 'stale'
    : /not_authorized|permission denied|row-level security/.test(msg)
      ? 'forbidden'
      : /^invalid_/.test(msg)
        ? 'invalid'
        : 'failed';
  const friendly = {
    stale: 'Inventory changed after this preview was prepared. Refresh the preview and review it again.',
    forbidden: 'Your account is not allowed to do this.',
  }[code];
  return new BackendError(code, friendly ?? (code === 'invalid' ? msg.replace(/^invalid_\w+:?\s*/, '') : fallback), msg);
}

async function unwrap(promise, fallback) {
  const { data, error } = await promise;
  if (error) throw toBackendError(error, fallback);
  return data;
}

export function createSupabaseBackend({ url, anonKey }) {
  const supabase = createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } });
  const publicUrl = (path) => (path ? supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : null);

  const toItem = (j) =>
    j && {
      ...j,
      price: Number(j.price),
      photos: (j.photos ?? []).map((p) => ({
        ...p,
        url: p.source === 'url' ? p.external_url : publicUrl(p.storage_path),
        thumb_url: p.source === 'url' ? p.external_url : publicUrl(p.thumb_path ?? p.storage_path),
      })),
    };

  return {
    mode: 'supabase',

    // ---------------- public
    async searchPublicItems(f, { pageSize = PAGE_SIZE, featured = null, exclude = null } = {}) {
      const data = await unwrap(
        supabase.rpc('search_public_items', {
          p_q: f.q || null,
          p_category: f.category || null,
          p_condition: f.condition || null,
          p_min_price: f.min,
          p_max_price: f.max,
          p_sort: f.sort,
          p_featured: featured,
          p_exclude: exclude,
          p_limit: pageSize,
          p_offset: (Math.max(1, f.page) - 1) * pageSize,
        }),
        'Inventory could not be loaded.',
      );
      return { total: Number(data.total), items: data.items.map(toItem) };
    },
    async getPublicItem(itemId) {
      return toItem(await unwrap(supabase.rpc('get_public_item', { p_item_id: itemId }), 'This item could not be loaded.'));
    },
    async getPublicCategories() {
      const rows = await unwrap(supabase.rpc('public_category_counts'), 'Categories could not be loaded.');
      return rows.map((r) => ({ category: r.category, count: Number(r.item_count) }));
    },
    async getInventoryInfo() {
      const row = await unwrap(supabase.from('inventory_state').select('revision,last_published_at').single());
      return { revision: Number(row.revision), lastPublishedAt: row.last_published_at };
    },

    // ---------------- auth
    async getSession() {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    onAuthChange(cb) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
      return () => data.subscription.unsubscribe();
    },
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new BackendError('auth', 'Email or password is incorrect.', error.message);
    },
    async signOut() {
      await supabase.auth.signOut();
    },
    async isOwner() {
      return Boolean(await unwrap(supabase.rpc('is_owner')));
    },

    // ---------------- owner
    async listAllItems() {
      return (await unwrap(supabase.rpc('owner_list_items'), 'Inventory could not be loaded.')).map(toItem);
    },
    async publishImport(payload) {
      const r = await unwrap(supabase.rpc('publish_import', { p_payload: payload }), 'Publishing failed. Nothing was changed.');
      return { revision: Number(r.revision), alreadyApplied: r.already_applied };
    },
    async listHistory() {
      const [revisions, runs] = await Promise.all([
        unwrap(supabase.from('inventory_revisions').select('id,created_at,kind,label,item_count,revision_before').order('id', { ascending: false }).limit(100)),
        unwrap(supabase.from('import_runs').select('id,created_at,kind,mode,file_name,summary,recovery_revision_id,revision_after').order('id', { ascending: false }).limit(100)),
      ]);
      return { revisions, runs };
    },
    async rollback({ revisionId, baseRevision, idempotencyKey }) {
      const r = await unwrap(
        supabase.rpc('rollback_inventory', { p_revision_id: revisionId, p_base_revision: baseRevision, p_idempotency_key: idempotencyKey }),
        'Restore failed. Nothing was changed.',
      );
      return { revision: Number(r.revision), alreadyApplied: r.already_applied };
    },
    async setItemStatus(itemId, status) {
      const rows = await unwrap(supabase.from('items').update({ status }).eq('item_id', itemId).select('item_id'), 'Status could not be saved.');
      if (!rows.length) throw new BackendError('forbidden', 'Status could not be saved. Check that you are signed in as an owner.');
    },
    async uploadPhoto(itemId, file, position) {
      const prepared = await preparePhoto(file);
      const id = newKey();
      const path = `items/${itemId}/${id}.jpg`;
      const thumbPath = `items/${itemId}/${id}-thumb.jpg`;
      const store = supabase.storage.from(BUCKET);
      const opts = { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false };
      await unwrap(store.upload(path, prepared.full, opts), 'Photo upload failed.');
      try {
        await unwrap(store.upload(thumbPath, prepared.thumb, opts), 'Photo upload failed.');
        await unwrap(
          supabase.from('item_photos').insert({ item_id: itemId, source: 'upload', storage_path: path, thumb_path: thumbPath, width: prepared.width, height: prepared.height, position }),
          'Photo could not be attached to the item.',
        );
      } catch (e) {
        await store.remove([path, thumbPath]); // don't leave orphaned files behind
        throw e;
      }
    },
    async deletePhoto(photo) {
      await unwrap(supabase.from('item_photos').delete().eq('id', photo.id), 'Photo could not be removed.');
      if (photo.source === 'upload') {
        const paths = [photo.storage_path, photo.thumb_path].filter(Boolean);
        const { error } = await supabase.storage.from(BUCKET).remove(paths);
        if (error) console.warn('Photo row removed but file cleanup failed', paths, error);
      }
    },
    async reorderPhotos(itemId, orderedIds) {
      await unwrap(supabase.rpc('reorder_item_photos', { p_item_id: itemId, p_photo_ids: orderedIds }), 'Photo order could not be saved.');
    },
  };
}
