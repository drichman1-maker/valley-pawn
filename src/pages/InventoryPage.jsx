import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useBackend } from '../lib/backend/BackendContext.jsx';
import { useAsync } from '../lib/useAsync.js';
import { DEFAULT_FILTERS, PAGE_SIZE, SORTS, hasActiveFilters, parseFilters, serializeFilters } from '../lib/url/filters.js';
import { CONDITIONS } from '../lib/inventory/constants.js';
import { ProductGrid } from '../components/ProductCard.jsx';
import { ErrorState, Loading } from '../components/States.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { LastUpdated } from '../components/SiteLayout.jsx';
import { formatPrice } from '../lib/format.js';
import { AVAILABILITY_NOTE } from '../config/shop.js';

const input = 'field';
const labelCls = 'mb-1.5 block text-sm font-semibold';

function FilterForm({ filters, categories, onApply }) {
  const [draft, setDraft] = useState({ q: filters.q, min: filters.min ?? '', max: filters.max ?? '' });
  useEffect(() => setDraft({ q: filters.q, min: filters.min ?? '', max: filters.max ?? '' }), [filters.q, filters.min, filters.max]);
  const bound = (v) => (String(v).trim() === '' ? null : Number(v));
  const apply = (patch) => onApply({ ...filters, q: draft.q, min: bound(draft.min), max: bound(draft.max), ...patch, page: 1 });

  return (
    <form onSubmit={(e) => { e.preventDefault(); apply({}); }} className="space-y-4" aria-label="Filter inventory">
      <div>
        <label htmlFor="f-q" className={labelCls}>Search</label>
        <input id="f-q" type="search" className={input} value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} placeholder="Item, brand, model or number" />
      </div>
      <div>
        <label htmlFor="f-cat" className={labelCls}>Category</label>
        <select id="f-cat" className={input} value={filters.category} onChange={(e) => apply({ category: e.target.value })}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.category} value={c.category}>{c.category} ({c.count})</option>)}
          {filters.category && !categories.some((c) => c.category === filters.category) && <option value={filters.category}>{filters.category} (0)</option>}
        </select>
      </div>
      <div>
        <label htmlFor="f-cond" className={labelCls}>Condition</label>
        <select id="f-cond" className={input} value={filters.condition} onChange={(e) => apply({ condition: e.target.value })}>
          <option value="">Any condition</option>
          {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <fieldset>
        <legend className={labelCls}>Price</legend>
        <div className="flex items-center gap-2">
          <label htmlFor="f-min" className="sr-only">Minimum price</label>
          <input id="f-min" inputMode="decimal" className={input} placeholder="Min $" value={draft.min} onChange={(e) => setDraft({ ...draft, min: e.target.value })} pattern="\d+(\.\d{1,2})?" title="A dollar amount, like 50 or 49.99" />
          <span aria-hidden="true">–</span>
          <label htmlFor="f-max" className="sr-only">Maximum price</label>
          <input id="f-max" inputMode="decimal" className={input} placeholder="Max $" value={draft.max} onChange={(e) => setDraft({ ...draft, max: e.target.value })} pattern="\d+(\.\d{1,2})?" title="A dollar amount, like 500" />
        </div>
        <p className="mt-1.5 text-xs text-muted">Leave blank for no limit.</p>
      </fieldset>
      <button type="submit" className="btn btn-ink w-full">Apply filters</button>
    </form>
  );
}

export function InventoryPage() {
  const backend = useBackend();
  const [params, setParams] = useSearchParams();
  const filters = parseFilters(params);
  const key = serializeFilters(filters).toString();
  const result = useAsync(() => backend.searchPublicItems(filters), [backend, key]);
  const cats = useAsync(() => backend.getPublicCategories(), [backend]);
  const go = (f) => setParams(serializeFilters(f));
  const active = hasActiveFilters(filters);

  const chips = [
    filters.q && { label: `“${filters.q}”`, clear: { q: '' } },
    filters.category && { label: filters.category, clear: { category: '' } },
    filters.condition && { label: filters.condition, clear: { condition: '' } },
    filters.min !== null && { label: `From ${formatPrice(filters.min)}`, clear: { min: null } },
    filters.max !== null && { label: `Up to ${formatPrice(filters.max)}`, clear: { max: null } },
  ].filter(Boolean);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div className="space-y-2">
          <p className="eyebrow">Shop the shelves</p>
          <h1 className="text-4xl sm:text-5xl">Inventory</h1>
          <p className="text-ink-soft">{AVAILABILITY_NOTE}</p>
          <LastUpdated />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-sm font-semibold">Sort</label>
          <select id="sort" value={filters.sort} onChange={(e) => go({ ...filters, sort: e.target.value, page: 1 })} className="field w-auto">
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-[17rem_1fr]">
        <div>
          <details className="surface p-4 md:hidden" open={active || undefined}>
            <summary className="cursor-pointer font-semibold">Filters{active ? ` (${chips.length} active)` : ''}</summary>
            <div className="mt-4"><FilterForm filters={filters} categories={cats.data ?? []} onApply={go} /></div>
          </details>
          <div className="surface sticky top-24 hidden p-5 md:block">
            <p className="mb-4 font-serif text-lg font-semibold">Filters</p>
            <FilterForm filters={filters} categories={cats.data ?? []} onApply={go} />
          </div>
        </div>

        <section aria-labelledby="results-title" className="min-w-0 space-y-4">
          <h2 id="results-title" className="sr-only">Results</h2>
          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {chips.map((c) => (
                <button key={c.label} type="button" onClick={() => go({ ...filters, ...c.clear, page: 1 })} className="inline-flex items-center gap-1.5 rounded-full border border-gold bg-gold-wash px-3 py-1 font-medium transition hover:border-gold-ink" aria-label={`Remove filter ${c.label}`}>
                  {c.label} <span aria-hidden="true">×</span>
                </button>
              ))}
              <Link to="/inventory" className="link ml-1">Clear all filters</Link>
            </div>
          )}
          {result.loading && <Loading />}
          {result.error && <ErrorState title="Inventory could not be loaded." error={result.error} onRetry={result.reload} />}
          {result.data && (
            <>
              <p className="text-sm font-medium text-muted" aria-live="polite">
                {result.data.total} {result.data.total === 1 ? 'item' : 'items'} available
              </p>
              {result.data.items.length ? (
                <ProductGrid items={result.data.items} compact />
              ) : (
                <div className="surface flex flex-col items-center gap-2 px-6 py-14 text-center">
                  <p className="font-serif text-xl font-semibold">No items match these filters.</p>
                  <p className="text-sm text-muted">Try a broader search, or call us: new items come in every week.</p>
                  {active && <Link to="/inventory" className="link mt-2 inline-block">Clear all filters</Link>}
                </div>
              )}
              <Pagination page={filters.page} total={result.data.total} pageSize={PAGE_SIZE} hrefFor={(p) => `/inventory?${serializeFilters({ ...filters, page: p })}`} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
