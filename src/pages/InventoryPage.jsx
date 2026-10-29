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
import { usePageTitle } from '../lib/usePageTitle.js';
import { CategoryIcon } from '../components/CategoryArt.jsx';

const input = 'field';
const labelCls = 'mb-1.5 block font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted';

function FilterForm({ filters, categories, onApply }) {
  const [draft, setDraft] = useState({ q: filters.q, min: filters.min ?? '', max: filters.max ?? '' });
  useEffect(() => setDraft({ q: filters.q, min: filters.min ?? '', max: filters.max ?? '' }), [filters.q, filters.min, filters.max]);
  const bound = (v) => (String(v).trim() === '' ? null : Number(v));
  const apply = (patch) => onApply({ ...filters, q: draft.q, min: bound(draft.min), max: bound(draft.max), ...patch, page: 1 });

  return (
    <form onSubmit={(e) => { e.preventDefault(); apply({}); }} className="space-y-5" aria-label="Filter inventory">
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
          <input id="f-min" inputMode="decimal" className={`${input} tabular`} placeholder="Min $" value={draft.min} onChange={(e) => setDraft({ ...draft, min: e.target.value })} pattern="\d+(\.\d{1,2})?" title="A dollar amount, like 50 or 49.99" />
          <span aria-hidden="true" className="text-muted">–</span>
          <label htmlFor="f-max" className="sr-only">Maximum price</label>
          <input id="f-max" inputMode="decimal" className={`${input} tabular`} placeholder="Max $" value={draft.max} onChange={(e) => setDraft({ ...draft, max: e.target.value })} pattern="\d+(\.\d{1,2})?" title="A dollar amount, like 500" />
        </div>
        <p className="mt-1.5 text-xs text-muted">Leave blank for no limit.</p>
      </fieldset>
      <button type="submit" className="btn btn-ink w-full">Apply filters</button>
    </form>
  );
}

function FilterIcon({ className = 'h-4 w-4' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
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
  usePageTitle(filters.category || 'Inventory');

  const chips = [
    filters.q && { label: `“${filters.q}”`, clear: { q: '' } },
    filters.category && { label: filters.category, clear: { category: '' } },
    filters.condition && { label: filters.condition, clear: { condition: '' } },
    filters.min !== null && { label: `From ${formatPrice(filters.min)}`, clear: { min: null } },
    filters.max !== null && { label: `Up to ${formatPrice(filters.max)}`, clear: { max: null } },
  ].filter(Boolean);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-line pb-8">
        <div className="space-y-3">
          <p className="eyebrow">Shop the shelves</p>
          <h1 className="text-5xl sm:text-7xl">{filters.category || 'Inventory'}</h1>
          <p className="text-fg-soft">{AVAILABILITY_NOTE}</p>
          <LastUpdated />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted">Sort</label>
          <select id="sort" value={filters.sort} onChange={(e) => go({ ...filters, sort: e.target.value, page: 1 })} className="field w-auto text-sm">
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-[17rem_1fr]">
        <div>
          <details className="surface p-4 md:hidden" open={active || undefined}>
            <summary className="flex cursor-pointer items-center gap-2 font-semibold"><FilterIcon className="h-4 w-4 text-accent" />Filters{active ? ` (${chips.length} active)` : ''}</summary>
            <div className="mt-4"><FilterForm filters={filters} categories={cats.data ?? []} onApply={go} /></div>
          </details>
          <div className="surface sticky top-24 hidden p-5 md:block">
            <p className="mb-5 flex items-center gap-2 font-display text-lg font-semibold tracking-tight"><FilterIcon className="h-4 w-4 text-accent" />Filters</p>
            <FilterForm filters={filters} categories={cats.data ?? []} onApply={go} />
          </div>
        </div>

        <section aria-labelledby="results-title" className="min-w-0 space-y-5">
          <h2 id="results-title" className="sr-only">Results</h2>
          {cats.data?.length > 0 && (
            <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Quick category filter">
              {[{ category: '', count: cats.data.reduce((n, c) => n + c.count, 0) }, ...cats.data].map((c) => {
                const on = filters.category === c.category;
                return (
                  <li key={c.category || 'all'} className="shrink-0">
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => go({ ...filters, category: c.category, page: 1 })}
                      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${on ? 'border-accent bg-accent text-accent-ink' : 'border-line-strong bg-surface text-fg-soft hover:border-fg hover:text-fg'}`}
                    >
                      {c.category && <CategoryIcon category={c.category} className="h-4 w-4" strokeWidth={1.8} />}
                      {c.category || 'Everything'}
                      <span className={`font-mono text-xs tabular ${on ? 'text-accent-ink/60' : 'text-muted'}`}>{c.count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {chips.map((c) => (
                <button key={c.label} type="button" onClick={() => go({ ...filters, ...c.clear, page: 1 })} className="inline-flex items-center gap-1.5 rounded-full border border-accent/50 bg-accent-wash px-3 py-1 font-medium text-fg transition hover:border-accent" aria-label={`Remove filter ${c.label}`}>
                  {c.label} <span aria-hidden="true" className="text-accent">×</span>
                </button>
              ))}
              <Link to="/inventory" className="link ml-1">Clear all filters</Link>
            </div>
          )}
          {result.loading && <Loading />}
          {result.error && <ErrorState title="Inventory could not be loaded." error={result.error} onRetry={result.reload} />}
          {result.data && (
            <>
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted" aria-live="polite">
                {result.data.total} {result.data.total === 1 ? 'item' : 'items'} available
              </p>
              {result.data.items.length ? (
                <ProductGrid items={result.data.items} compact />
              ) : (
                <div className="surface flex flex-col items-center gap-2 px-6 py-16 text-center">
                  <p className="font-display text-2xl font-bold tracking-tight">No items match these filters.</p>
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
