import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBackend } from '../lib/backend/BackendContext.jsx';
import { useAsync } from '../lib/useAsync.js';
import { STATUSES } from '../lib/inventory/constants.js';
import { formatPrice } from '../lib/format.js';
import { ErrorState, Loading } from '../components/States.jsx';

const STATUS_HELP = { available: 'shown, for sale', sold: 'shown as sold by direct link', draft: 'hidden', archived: 'hidden' };

export function ItemsPage() {
  const backend = useBackend();
  const { data: items, loading, error, reload } = useAsync(() => backend.listAllItems(), [backend]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(null);
  const [message, setMessage] = useState(null);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (items ?? []).filter((i) => (!status || i.status === status) && (!t || `${i.item_id} ${i.title} ${i.brand}`.toLowerCase().includes(t)));
  }, [items, q, status]);

  const changeStatus = async (item, next) => {
    setSaving(item.item_id);
    setMessage(null);
    try {
      await backend.setItemStatus(item.item_id, next);
      setMessage({ tone: 'ok', text: `${item.item_id} is now ${next}.` });
      reload();
    } catch (e) {
      setMessage({ tone: 'error', text: e.message });
    } finally {
      setSaving(null);
    }
  };

  if (loading && !items) return <Loading />;
  if (error) return <ErrorState title="Items could not be loaded." error={error} onRetry={reload} />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl">Items and photos</h1>
        <p className="text-sm text-ink-soft">Change a listing's status or manage its photos. Prices and descriptions are updated through the spreadsheet import.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <div>
          <label htmlFor="items-q" className="block text-sm font-semibold">Search</label>
          <input id="items-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} className="field w-auto" />
        </div>
        <div>
          <label htmlFor="items-status" className="block text-sm font-semibold">Status</label>
          <select id="items-status" value={status} onChange={(e) => setStatus(e.target.value)} className="field w-auto">
            <option value="">All ({items.length})</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s} ({items.filter((i) => i.status === s).length})</option>)}
          </select>
        </div>
      </div>
      <p role="status" className={`text-sm ${message?.tone === 'error' ? 'text-sold' : 'text-ok'}`}>{message?.text}</p>
      <div className="overflow-x-auto rounded-lg border border-line bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper"><tr><th className="p-2">Item number</th><th className="p-2">Title</th><th className="p-2">Price</th><th className="p-2">Status</th><th className="p-2">Photos</th></tr></thead>
          <tbody>
            {shown.map((i) => (
              <tr key={i.item_id} className="border-t border-line">
                <td className="p-2 font-semibold tabular">{i.item_id}</td>
                <td className="p-2">{i.title}</td>
                <td className="p-2 tabular">{formatPrice(i.price)}</td>
                <td className="p-2">
                  <label htmlFor={`st-${i.item_id}`} className="sr-only">Status for {i.item_id}</label>
                  <select id={`st-${i.item_id}`} value={i.status} disabled={saving === i.item_id} onChange={(e) => changeStatus(i, e.target.value)} className="field w-auto py-1.5 text-sm">
                    {STATUSES.map((s) => <option key={s} value={s}>{s} ({STATUS_HELP[s]})</option>)}
                  </select>
                </td>
                <td className="p-2">
                  <Link to={`/owner/items/${encodeURIComponent(i.item_id)}/photos`} className="font-semibold text-gold-ink underline">
                    {i.photos.length} photo{i.photos.length === 1 ? '' : 's'}: manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <p className="p-4 text-muted">No items match.</p>}
      </div>
    </div>
  );
}
