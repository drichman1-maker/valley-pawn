import { useRef, useState } from 'react';
import { useBackend } from '../lib/backend/BackendContext.jsx';
import { useAsync } from '../lib/useAsync.js';
import { formatDateTime, newKey } from '../lib/format.js';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { ErrorState, Loading, Notice } from '../components/States.jsx';

export function HistoryPage() {
  const backend = useBackend();
  const { data, loading, error, reload } = useAsync(
    () => Promise.all([backend.listHistory(), backend.getInventoryInfo()]).then(([h, info]) => ({ ...h, revision: info.revision })),
    [backend],
  );
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const key = useRef(null);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState title="History could not be loaded." error={error} onRetry={reload} />;

  const restore = async () => {
    setBusy(true);
    try {
      await backend.rollback({ revisionId: target.id, baseRevision: data.revision, idempotencyKey: key.current });
      setResult({ tone: 'ok', text: 'Inventory restored. The state it replaced was saved as a new restore point.' });
    } catch (e) {
      setResult({ tone: 'error', text: e.code === 'stale' ? 'Inventory changed while this page was open. The list has been reloaded; try again.' : e.message });
    } finally {
      setBusy(false);
      setTarget(null);
      reload();
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl">History and restore</h1>
        <p className="text-sm text-ink-soft">
          Each publish and restore saves the inventory as it was just before the change. Restoring brings back item details, statuses and
          spreadsheet photo links. Items added after that point are archived, not deleted. Uploaded photos are not affected.
        </p>
      </div>
      {result && <div role="status"><Notice tone={result.tone}>{result.text}</Notice></div>}
      {!data.revisions.length ? (
        <Notice>No restore points yet. One is created every time you publish an import.</Notice>
      ) : (
        <ul className="space-y-2">
          {data.revisions.map((r) => {
            const run = data.runs.find((x) => x.recovery_revision_id === r.id);
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-card p-4">
                <div className="text-sm">
                  <p className="font-semibold">{r.label}</p>
                  <p className="text-muted">
                    {formatDateTime(r.created_at)}, {r.item_count} items saved
                    {run?.summary && run.kind === 'import' ? `. Import: ${run.summary.new ?? 0} new, ${run.summary.update ?? 0} updated, ${run.summary.archived ?? run.summary.archive ?? 0} archived` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { key.current = newKey(); setTarget(r); }}
                  className="rounded-md border border-sold/50 px-3 py-1.5 text-sm font-semibold text-sold"
                >
                  Restore this version
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDialog
        open={Boolean(target)}
        onOpenChange={(o) => !o && setTarget(null)}
        title="Restore this version?"
        destructive
        busy={busy}
        confirmLabel="Restore inventory"
        onConfirm={restore}
        description={
          <>
            <p>The website inventory will be replaced with the state saved {target ? formatDateTime(target.created_at) : ''} ({target?.label}).</p>
            <p className="mt-2">The current inventory is saved first, so you can undo this from this page.</p>
          </>
        }
      />
    </div>
  );
}
