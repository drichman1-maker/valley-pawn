import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBackend } from '../lib/backend/BackendContext.jsx';
import { IMPORT_LIMITS, readSpreadsheet } from '../lib/import/readSpreadsheet.js';
import { guessHeaderRow, readHeaders } from '../lib/import/headers.js';
import { SCHEMA_FIELDS, reconcileMapping, validateMapping } from '../lib/import/mapping.js';
import { validateRows } from '../lib/import/validateRows.js';
import { buildImportPlan, toPublishPayload } from '../lib/import/plan.js';
import { FIELD_LABELS } from '../lib/inventory/constants.js';
import { formatPrice, newKey, todayIso } from '../lib/format.js';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { Notice } from '../components/States.jsx';

const MAPPING_KEY = 'vp.import.mapping.v1';
const loadSavedMapping = () => {
  try {
    return JSON.parse(localStorage.getItem(MAPPING_KEY) ?? '{}');
  } catch {
    return {};
  }
};
const saveMapping = (m) => {
  try {
    localStorage.setItem(MAPPING_KEY, JSON.stringify(m));
  } catch {
    /* preference only */
  }
};

const card = 'surface p-5 sm:p-6';
const h2 = 'font-serif text-xl';
const select = 'field py-1.5 text-sm';

function show(field, v) {
  if (field === 'price') return formatPrice(v);
  if (field === 'featured') return v ? 'Yes' : 'No';
  if (field === 'photo_urls') return v?.length ? `${v.length} link(s)` : '(none)';
  return v === '' || v === null || v === undefined ? '(blank)' : String(v);
}

function Radio({ name, value, checked, onChange, title, children }) {
  return (
    <label className={`flex cursor-pointer gap-3 rounded-md border p-3 ${checked ? 'border-ink bg-paper' : 'border-line'}`}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="mt-1" />
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-ink-soft">{children}</span>
      </span>
    </label>
  );
}

export function ImportPage() {
  const backend = useBackend();
  const [workbook, setWorkbook] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [reading, setReading] = useState(false);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [headerRow, setHeaderRow] = useState(null);
  const [mapping, setMapping] = useState({});
  const [dropped, setDropped] = useState([]);
  const [mode, setMode] = useState('upsert');
  const [blankPolicy, setBlankPolicy] = useState('keep');
  const [newItemStatus, setNewItemStatus] = useState(null);
  const [ackPartial, setAckPartial] = useState(false);
  const [inventory, setInventory] = useState(null); // { items, revision } captured for this preview
  const [inventoryError, setInventoryError] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState(null);
  const [published, setPublished] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const fileInput = useRef(null);
  const idemKey = useRef(newKey());

  const sheet = workbook?.sheets[sheetIndex];
  const headerInfo = useMemo(() => (sheet && headerRow ? readHeaders(sheet, headerRow) : null), [sheet, headerRow]);
  const mappingErrors = useMemo(() => (headerInfo ? validateMapping(mapping, headerInfo.headers) : []), [mapping, headerInfo]);

  // Re-derive the mapping whenever the headers change, checking remembered choices against this file.
  useEffect(() => {
    if (!headerInfo || headerInfo.errors.length) return;
    const r = reconcileMapping(loadSavedMapping(), headerInfo.headers);
    setMapping(r.mapping);
    setDropped(r.dropped);
  }, [headerInfo]);

  const knownCategories = useMemo(() => [...new Set((inventory?.items ?? []).map((i) => i.category))], [inventory]);
  const rows = useMemo(
    () =>
      inventory && headerInfo && !headerInfo.errors.length && !mappingErrors.length
        ? validateRows({ dataRows: headerInfo.dataRows, headers: headerInfo.headers, mapping, existingItems: inventory.items, knownCategories })
        : null,
    [inventory, headerInfo, mapping, mappingErrors, knownCategories],
  );
  const plan = useMemo(
    () => rows && buildImportPlan({ rows, existingItems: inventory.items, mode, blankPolicy, newItemStatus, acknowledgePartial: ackPartial, today: todayIso() }),
    [rows, inventory, mode, blankPolicy, newItemStatus, ackPartial],
  );

  // A new idempotency key for every distinct reviewed plan; repeated clicks reuse it.
  useEffect(() => {
    idemKey.current = newKey();
    setPublishError(null);
    setTyped('');
  }, [plan]);

  const reset = ({ clearInput = true } = {}) => {
    setWorkbook(null);
    setInventory(null);
    setFileError(null);
    setPublishError(null);
    setAckPartial(false);
    setNewItemStatus(null);
    setMode('upsert');
    if (clearInput && fileInput.current) fileInput.current.value = '';
  };

  const onFile = async (file) => {
    if (!file) return;
    reset({ clearInput: false });
    setPublished(null);
    setReading(true);
    try {
      const wb = await readSpreadsheet(file);
      const firstVisible = Math.max(0, wb.sheets.findIndex((s) => !s.hidden && s.rows.length));
      setWorkbook(wb);
      setSheetIndex(firstVisible);
      setHeaderRow(guessHeaderRow(wb.sheets[firstVisible]));
    } catch (e) {
      setFileError(e.message);
    } finally {
      setReading(false);
    }
  };

  const loadInventory = async () => {
    setInventoryError(null);
    try {
      const [items, info] = await Promise.all([backend.listAllItems(), backend.getInventoryInfo()]);
      setInventory({ items, revision: info.revision });
    } catch (e) {
      setInventoryError(e.message);
    }
  };

  const publish = async () => {
    if (!plan || plan.blocked || publishing) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const payload = toPublishPayload(plan, { baseRevision: inventory.revision, idempotencyKey: idemKey.current, fileName: workbook.fileName, fileSha256: workbook.fileSha256 });
      const r = await backend.publishImport(payload);
      setPublished({ ...plan.counts, alreadyApplied: r.alreadyApplied, fileName: workbook.fileName });
      setConfirmOpen(false);
      reset();
    } catch (e) {
      setPublishError(e);
      setConfirmOpen(false);
    } finally {
      setPublishing(false);
    }
  };

  const typedTarget = plan ? `ARCHIVE ${plan.archives.length}` : '';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">Import spreadsheet</h1>
          <p className="text-sm text-ink-soft">Upload your Excel workbook or CSV, check the preview, then publish. Nothing changes on the website until you publish.</p>
        </div>
        <a href="/inventory-template.xlsx" download className="btn btn-outline text-sm">Download Excel template</a>
      </div>

      {published && (
        <Notice tone="ok">
          <p className="font-semibold">{published.alreadyApplied ? 'This import was already published.' : `Published ${published.fileName}.`}</p>
          <p>{published.new} new, {published.update} updated, {published.archive} archived. A restore point was saved in <Link to="/owner/history" className="underline">History</Link>.</p>
        </Notice>
      )}

      <section className={card} aria-labelledby="step-file">
        <h2 id="step-file" className={h2}>1. Choose a file</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Excel (.xlsx), CSV, or tab-separated (.tsv/.txt). Up to {IMPORT_LIMITS.maxFileBytes / 1048576} MB and {IMPORT_LIMITS.maxRows.toLocaleString()} items.
        </p>
        <label htmlFor="import-file" className="mt-3 block text-sm font-semibold">Spreadsheet file</label>
        <input
          ref={fileInput}
          id="import-file"
          type="file"
          accept=".xlsx,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/tab-separated-values"
          onChange={(e) => onFile(e.target.files?.[0])}
          className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-2 file:font-semibold file:text-paper"
        />
        {reading && <p role="status" className="mt-2 text-sm">Reading file…</p>}
        {fileError && <p role="alert" className="mt-2 text-sm text-sold">{fileError}</p>}
        {workbook && (
          <p className="mt-2 text-sm">
            Loaded <strong>{workbook.fileName}</strong> ({workbook.sheets.length} worksheet{workbook.sheets.length === 1 ? '' : 's'}).
          </p>
        )}
        {workbook?.notes.map((n) => <p key={n} className="mt-2 text-sm text-ink-soft">{n}</p>)}
      </section>

      {workbook && (
        <section className={card} aria-labelledby="step-sheet">
          <h2 id="step-sheet" className={h2}>2. Choose the sheet and heading row</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sheet" className="mb-1 block text-sm font-semibold">Worksheet</label>
              <select
                id="sheet"
                className={select}
                value={sheetIndex}
                onChange={(e) => {
                  const i = Number(e.target.value);
                  setSheetIndex(i);
                  setHeaderRow(guessHeaderRow(workbook.sheets[i]));
                  setInventory(null);
                }}
              >
                {workbook.sheets.map((s, i) => (
                  <option key={s.name} value={i}>
                    {s.name} ({s.rows.length} rows{s.hidden ? ', hidden sheet' : ''})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="header-row" className="mb-1 block text-sm font-semibold">Heading row</label>
              <select id="header-row" className={select} value={headerRow ?? ''} onChange={(e) => { setHeaderRow(Number(e.target.value)); setInventory(null); }}>
                {sheet.rows.slice(0, 15).map((r) => (
                  <option key={r.rowNumber} value={r.rowNumber}>
                    Row {r.rowNumber}: {r.cells.map((c) => c.text).filter(Boolean).slice(0, 4).join(', ').slice(0, 60)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {headerInfo?.errors.length > 0 && (
            <div role="alert" className="mt-4">
              <Notice tone="error">
                <p className="font-semibold">Fix these in your spreadsheet, then upload it again:</p>
                <ul className="mt-1 list-disc pl-5">{headerInfo.errors.map((e) => <li key={e}>{e}</li>)}</ul>
              </Notice>
            </div>
          )}
        </section>
      )}

      {headerInfo && !headerInfo.errors.length && (
        <section className={card} aria-labelledby="step-map">
          <h2 id="step-map" className={h2}>3. Match your columns</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Columns set to “Not imported” are never read: existing items keep their current values for those fields.
          </p>
          {dropped.length > 0 && (
            <div className="mt-3">
              <Notice tone="warn">
                Your saved choices referred to columns that aren't in this file: {dropped.map((d) => `“${d.header}” (${FIELD_LABELS[d.field]})`).join(', ')}. Please choose again.
              </Notice>
            </div>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SCHEMA_FIELDS.map((f) => (
              <div key={f.key}>
                <label htmlFor={`map-${f.key}`} className="block text-sm font-semibold">
                  {f.label} {f.required ? <span className="text-sold">(required)</span> : <span className="font-normal text-muted">(optional)</span>}
                </label>
                <select
                  id={`map-${f.key}`}
                  className={select}
                  value={mapping[f.key] ?? ''}
                  aria-describedby={`map-${f.key}-hint`}
                  onChange={(e) => {
                    const next = { ...mapping, [f.key]: e.target.value || undefined };
                    if (!e.target.value) delete next[f.key];
                    setMapping(next);
                    saveMapping(next);
                  }}
                >
                  <option value="">Not imported</option>
                  {headerInfo.headers.map((h) => <option key={h.name} value={h.name}>{h.letter}: {h.name}</option>)}
                </select>
                <p id={`map-${f.key}-hint`} className="mt-0.5 text-xs text-muted">{f.hint}</p>
              </div>
            ))}
          </div>
          {mappingErrors.length > 0 && <ul className="mt-3 list-disc pl-5 text-sm text-sold">{mappingErrors.map((e) => <li key={e}>{e}</li>)}</ul>}
        </section>
      )}

      {headerInfo && !headerInfo.errors.length && !mappingErrors.length && (
        <section className={card} aria-labelledby="step-mode">
          <h2 id="step-mode" className={h2}>4. Choose how to import</h2>
          <fieldset className="mt-3 grid gap-2 md:grid-cols-2">
            <legend className="sr-only">Import mode</legend>
            <Radio name="mode" value="upsert" checked={mode === 'upsert'} onChange={() => setMode('upsert')} title="Add and update (recommended)">
              Adds new item numbers and updates matching ones. Items not in this file are left alone.
            </Radio>
            <Radio name="mode" value="complete" checked={mode === 'complete'} onChange={() => setMode('complete')} title="This file is my complete inventory">
              Also archives every listed item that isn't in this file. Blocked if any row has an error. Items are never deleted.
            </Radio>
          </fieldset>
          <fieldset className="mt-4 grid gap-2 md:grid-cols-2">
            <legend className="mb-1 text-sm font-semibold">Blank cells in imported columns</legend>
            <Radio name="blank" value="keep" checked={blankPolicy === 'keep'} onChange={() => setBlankPolicy('keep')} title="Keep the current value">
              A blank cell leaves that field unchanged on existing items.
            </Radio>
            <Radio name="blank" value="clear" checked={blankPolicy === 'clear'} onChange={() => setBlankPolicy('clear')} title="Clear the field">
              A blank cell clears condition, description, brand, model, accessories, featured and photo links. Title, category, price, status and date are never cleared.
            </Radio>
          </fieldset>
          {!inventory && (
            <button type="button" onClick={loadInventory} className="mt-5 rounded-md bg-ink px-4 py-2 font-semibold text-paper">
              Prepare preview
            </button>
          )}
          {inventoryError && <p role="alert" className="mt-2 text-sm text-sold">Current inventory could not be loaded: {inventoryError}</p>}
        </section>
      )}

      {plan && (
        <PreviewSection
          plan={plan}
          mode={mode}
          newItemStatus={newItemStatus}
          setNewItemStatus={setNewItemStatus}
          ackPartial={ackPartial}
          setAckPartial={setAckPartial}
          publishing={publishing}
          publishError={publishError}
          onRefresh={() => { setInventory(null); loadInventory(); }}
          onPublish={() => (plan.requiresArchiveConfirmation ? setConfirmOpen(true) : publish())}
          onDiscard={() => reset()}
        />
      )}

      {plan && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={`Archive ${plan.archives.length} item(s)?`}
          destructive
          busy={publishing}
          confirmLabel="Publish and archive"
          confirmDisabled={plan.requiresTypedConfirmation && typed.trim() !== typedTarget}
          onConfirm={publish}
          description={
            <>
              <p>These items are not in your file and will be hidden from the website. They are archived, not deleted, and can be restored from History.</p>
              {plan.emptiesInventory && <p className="mt-2 font-semibold text-sold">After this import, no items would be listed on the website.</p>}
            </>
          }
        >
          <ul className="max-h-48 overflow-y-auto rounded-md border border-line p-2 text-sm">
            {plan.archives.map((i) => <li key={i.item_id}><span className="tabular font-semibold">{i.item_id}</span> {i.title}</li>)}
          </ul>
          {plan.requiresTypedConfirmation && (
            <div className="mt-3">
              <label htmlFor="typed" className="block text-sm font-semibold">This is a large change. Type {typedTarget} to confirm.</label>
              <input id="typed" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className="mt-1 w-full rounded-md border border-line-strong px-3 py-2" />
            </div>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}

function PreviewSection({ plan, mode, newItemStatus, setNewItemStatus, ackPartial, setAckPartial, publishing, publishError, onRefresh, onPublish, onDiscard }) {
  const news = plan.entries.filter((e) => e.kind === 'new');
  const updates = plan.entries.filter((e) => e.kind === 'update');
  const warnings = plan.entries.filter((e) => e.warnings.length);
  const needsStatusChoice = news.some((e) => e.statusFromDefault);
  const stats = [
    ['New', plan.counts.new],
    ['Updated', plan.counts.update],
    ['Unchanged', plan.counts.unchanged],
    ['Rows with errors', plan.counts.invalid],
    ['To be archived', plan.counts.archive],
  ];
  const changeCount = plan.counts.new + plan.counts.update + plan.counts.archive;

  return (
    <section className={card} aria-labelledby="step-preview">
      <h2 id="step-preview" className={h2}>5. Review and publish</h2>
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {stats.map(([k, v]) => (
          <div key={k} className="rounded-md border border-line p-3">
            <dt className="text-xs text-muted">{k}</dt>
            <dd className="text-2xl font-bold tabular">{v}</dd>
          </div>
        ))}
      </dl>

      {plan.invalid.length > 0 && (
        <div className="mt-5">
          <h3 className="font-sans text-base font-semibold text-sold">Rows with errors {mode === 'upsert' ? '(not imported)' : ''}</h3>
          <div className="mt-2 max-h-72 overflow-auto rounded-md border border-line">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-paper"><tr><th className="p-2">Row</th><th className="p-2">Item number</th><th className="p-2">Problem</th></tr></thead>
              <tbody>
                {plan.invalid.map((r) => (
                  <tr key={r.rowNumber} className="border-t border-line align-top">
                    <td className="p-2 tabular">{r.rowNumber}</td>
                    <td className="p-2 tabular">{r.itemId ?? '(blank)'}</td>
                    <td className="p-2"><ul>{r.errors.map((e) => <li key={e}>{e}</li>)}</ul></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mt-5">
          <Notice tone="warn">
            <p className="font-semibold">Check these rows</p>
            <ul className="mt-1 list-disc pl-5">
              {warnings.flatMap((e) => e.warnings.map((w) => <li key={`${e.rowNumber}-${w}`}>Row {e.rowNumber}: {w}</li>))}
            </ul>
          </Notice>
        </div>
      )}

      {news.length > 0 && (
        <details className="mt-5" open>
          <summary className="cursor-pointer font-semibold">New items ({news.length})</summary>
          <div className="mt-2 max-h-72 overflow-auto rounded-md border border-line">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-paper"><tr><th className="p-2">Row</th><th className="p-2">Item number</th><th className="p-2">Title</th><th className="p-2">Price</th><th className="p-2">Status</th></tr></thead>
              <tbody>
                {news.map((e) => (
                  <tr key={e.itemId} className="border-t border-line">
                    <td className="p-2 tabular">{e.rowNumber}</td>
                    <td className="p-2 tabular">{e.itemId}</td>
                    <td className="p-2">{e.next.title}</td>
                    <td className="p-2 tabular">{formatPrice(e.next.price)}</td>
                    <td className="p-2">{e.next.status ?? <span className="text-sold">Choose below</span>}{e.statusFromDefault && e.next.status ? ' (your choice)' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {updates.length > 0 && (
        <details className="mt-5" open>
          <summary className="cursor-pointer font-semibold">Changes to existing items ({updates.length})</summary>
          <ul className="mt-2 max-h-96 space-y-2 overflow-auto">
            {updates.map((e) => (
              <li key={e.itemId} className="rounded-md border border-line p-3 text-sm">
                <p className="font-semibold"><span className="tabular">{e.itemId}</span> {e.next.title} <span className="font-normal text-muted">(row {e.rowNumber})</span></p>
                <ul className="mt-1">
                  {e.changes.map((c) => (
                    <li key={c.field}>
                      {FIELD_LABELS[c.field]}: <span className="text-muted line-through">{show(c.field, c.from)}</span> <span aria-hidden="true">→</span><span className="sr-only">changes to</span> <strong>{show(c.field, c.to)}</strong>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </details>
      )}

      {plan.archives.length > 0 && (
        <details className="mt-5" open>
          <summary className="cursor-pointer font-semibold text-sold">To be archived ({plan.archives.length})</summary>
          <ul className="mt-2 max-h-60 overflow-auto rounded-md border border-line p-3 text-sm">
            {plan.archives.map((i) => <li key={i.item_id}><span className="tabular font-semibold">{i.item_id}</span> {i.title} <span className="text-muted">({i.status})</span></li>)}
          </ul>
        </details>
      )}

      {needsStatusChoice && (
        <fieldset className="mt-5 grid gap-2 md:grid-cols-2">
          <legend className="mb-1 text-sm font-semibold">Status for new items without one in the file</legend>
          <Radio name="new-status" value="draft" checked={newItemStatus === 'draft'} onChange={() => setNewItemStatus('draft')} title="Draft">Saved but hidden from the public until you change the status.</Radio>
          <Radio name="new-status" value="available" checked={newItemStatus === 'available'} onChange={() => setNewItemStatus('available')} title="Available">Shown on the website immediately.</Radio>
        </fieldset>
      )}

      {mode === 'upsert' && plan.invalid.length > 0 && (
        <label className="mt-5 flex gap-2 text-sm">
          <input type="checkbox" checked={ackPartial} onChange={(e) => setAckPartial(e.target.checked)} />
          Publish without the {plan.invalid.length} row(s) with errors. Those items will not be added or changed.
        </label>
      )}

      {plan.blockers.length > 0 && (
        <div className="mt-5">
          <Notice tone="warn"><ul className="list-disc pl-5">{plan.blockers.map((b) => <li key={b}>{b}</li>)}</ul></Notice>
        </div>
      )}

      {publishError && (
        <div role="alert" className="mt-5">
          <Notice tone="error">
            <p className="font-semibold">{publishError.code === 'stale' ? 'Inventory changed since this preview was prepared.' : 'Publishing failed. Nothing was changed.'}</p>
            <p>{publishError.message}</p>
            {publishError.code === 'stale' && (
              <button type="button" onClick={onRefresh} className="mt-2 rounded-md border border-line-strong px-3 py-1.5 font-semibold text-ink">Refresh preview</button>
            )}
          </Notice>
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onDiscard} className="rounded-md border border-line-strong px-4 py-2 font-semibold">Discard</button>
        <button type="button" onClick={onRefresh} className="rounded-md border border-line-strong px-4 py-2 font-semibold">Refresh preview</button>
        <button type="button" onClick={onPublish} disabled={plan.blocked || publishing} className="rounded-md bg-ink px-4 py-2 font-semibold text-paper disabled:opacity-40">
          {publishing ? 'Publishing…' : `Publish ${changeCount} change${changeCount === 1 ? '' : 's'}`}
        </button>
      </div>
    </section>
  );
}

