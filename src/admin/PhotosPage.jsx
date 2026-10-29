import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useBackend } from '../lib/backend/BackendContext.jsx';
import { useAsync } from '../lib/useAsync.js';
import { checkPhotoFile, PHOTO_RULES } from '../lib/photos/preparePhoto.js';
import { MAX_PHOTOS_PER_ITEM } from '../lib/inventory/constants.js';
import { ItemImage } from '../components/ItemImage.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { ErrorState, Loading, Notice } from '../components/States.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';

export function PhotosPage() {
  const { itemId } = useParams();
  const backend = useBackend();
  const { data: items, loading, error, reload } = useAsync(() => backend.listAllItems(), [backend]);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([]);
  const [removing, setRemoving] = useState(null);

  if (loading && !items) return <Loading />;
  if (error) return <ErrorState title="Item could not be loaded." error={error} onRetry={reload} />;
  const item = items.find((i) => i.item_id === itemId);
  if (!item) return <NotFoundPage title="Item not found" message={`There is no item ${itemId}.`} />;
  const photos = [...item.photos].sort((a, b) => a.position - b.position);

  const run = async (fn, okText) => {
    setBusy(true);
    try {
      await fn();
      if (okText) setMessages([{ tone: 'ok', text: okText }]);
    } catch (e) {
      setMessages([{ tone: 'error', text: e.message }]);
    } finally {
      setBusy(false);
      reload();
    }
  };

  const move = (from, to) => {
    const ids = photos.map((p) => p.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    run(() => backend.reorderPhotos(item.item_id, ids), to === 0 ? 'Cover photo updated.' : 'Photo order saved.');
  };

  const upload = async (files) => {
    const list = [...files];
    const problems = list.map(checkPhotoFile).filter(Boolean);
    const room = MAX_PHOTOS_PER_ITEM - photos.length;
    if (list.length > room) problems.push(`This item can take ${room} more photo(s). Choose fewer.`);
    if (problems.length) {
      setMessages(problems.map((text) => ({ tone: 'error', text })));
      return;
    }
    setBusy(true);
    const results = [];
    let position = photos.length ? Math.max(...photos.map((p) => p.position)) + 1 : 0;
    for (const f of list) {
      try {
        await backend.uploadPhoto(item.item_id, f, position++);
        results.push({ tone: 'ok', text: `${f.name} uploaded.` });
      } catch (e) {
        results.push({ tone: 'error', text: `${f.name}: ${e.message}` });
      }
    }
    setMessages(results);
    setBusy(false);
    reload();
  };

  return (
    <div className="space-y-5">
      <Link to="/owner/items" className="text-sm font-semibold text-gold-ink underline">Back to items</Link>
      <div>
        <h1 className="text-3xl">Photos for {item.item_id}</h1>
        <p className="text-ink-soft">{item.title}</p>
      </div>

      <div className="rounded-lg border border-line bg-card p-5">
        <label htmlFor="photo-upload" className="block font-semibold">Add photos</label>
        <p className="text-sm text-ink-soft">
          JPEG, PNG or WebP, up to 15 MB each. Photos are resized to {PHOTO_RULES.maxEdge}px before upload. On a phone you can take a new photo or pick from your library.
        </p>
        <input
          id="photo-upload"
          type="file"
          accept={PHOTO_RULES.types.join(',')}
          multiple
          disabled={busy || photos.length >= MAX_PHOTOS_PER_ITEM}
          onChange={(e) => { upload(e.target.files); e.target.value = ''; }}
          className="mt-2 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-2 file:font-semibold file:text-paper"
        />
        {busy && <p role="status" className="mt-2 text-sm">Working…</p>}
        <div role="status" className="mt-2 space-y-1 text-sm">
          {messages.map((m) => <p key={m.text} className={m.tone === 'error' ? 'text-sold' : 'text-ok'}>{m.text}</p>)}
        </div>
      </div>

      {photos.length === 0 ? (
        <Notice>No photos yet. The website shows a “No photo yet” placeholder.</Notice>
      ) : (
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((p, i) => (
            <li key={p.id} className="overflow-hidden rounded-lg border border-line bg-card">
              <div className="aspect-[4/3] border-b border-line">
                <ItemImage photo={p} alt={`Photo ${i + 1}`} />
              </div>
              <div className="space-y-2 p-3 text-sm">
                <p className="font-semibold">
                  {i === 0 ? 'Cover photo' : `Photo ${i + 1}`}
                  {p.source === 'url' && <span className="ml-1 font-normal text-muted">(from a spreadsheet link; the next import with photo links replaces it)</span>}
                </p>
                <div className="flex flex-wrap gap-2">
                  {i > 0 && <button type="button" disabled={busy} onClick={() => move(i, 0)} className="rounded-md border border-line-strong px-2 py-1 font-semibold">Make cover</button>}
                  {i > 0 && <button type="button" disabled={busy} onClick={() => move(i, i - 1)} className="rounded-md border border-line-strong px-2 py-1" aria-label={`Move photo ${i + 1} earlier`}>Earlier</button>}
                  {i < photos.length - 1 && <button type="button" disabled={busy} onClick={() => move(i, i + 1)} className="rounded-md border border-line-strong px-2 py-1" aria-label={`Move photo ${i + 1} later`}>Later</button>}
                  <button type="button" disabled={busy} onClick={() => setRemoving(p)} className="rounded-md border border-sold/50 px-2 py-1 font-semibold text-sold">Remove</button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Remove this photo?"
        description={removing?.source === 'upload' ? 'The photo file is deleted permanently. Restoring an earlier inventory version does not bring it back.' : 'The link is removed from this item.'}
        confirmLabel="Remove photo"
        destructive
        busy={busy}
        onConfirm={() => {
          const p = removing;
          setRemoving(null);
          run(() => backend.deletePhoto(p), 'Photo removed.');
        }}
      >
        {removing && <div className="aspect-[4/3] w-40 overflow-hidden rounded-md border border-line"><ItemImage photo={removing} alt="Photo to remove" /></div>}
      </ConfirmDialog>
    </div>
  );
}
