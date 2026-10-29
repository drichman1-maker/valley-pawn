// Storefront filters live in the URL so links, refresh and Back/Forward all work.
// Missing or invalid parameters fall back to defaults. There is no default price ceiling.

export const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
];
export const PAGE_SIZE = 24;

export const DEFAULT_FILTERS = Object.freeze({
  q: '',
  category: '',
  condition: '',
  min: null,
  max: null,
  sort: 'newest',
  page: 1,
});

function parseBound(v) {
  if (v === null || v.trim() === '') return null;
  if (!/^\d+(\.\d{1,2})?$/.test(v.trim())) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** @param {URLSearchParams} params */
export function parseFilters(params) {
  const page = Number(params.get('page'));
  const sort = params.get('sort');
  return {
    q: (params.get('q') ?? '').slice(0, 100),
    category: params.get('category') ?? '',
    condition: params.get('condition') ?? '',
    min: parseBound(params.get('min')),
    max: parseBound(params.get('max')),
    sort: SORTS.some((s) => s.value === sort) ? sort : 'newest',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function serializeFilters(f) {
  const p = new URLSearchParams();
  if (f.q?.trim()) p.set('q', f.q.trim());
  if (f.category) p.set('category', f.category);
  if (f.condition) p.set('condition', f.condition);
  if (f.min !== null && f.min !== undefined) p.set('min', String(f.min));
  if (f.max !== null && f.max !== undefined) p.set('max', String(f.max));
  if (f.sort && f.sort !== 'newest') p.set('sort', f.sort);
  if (f.page && f.page > 1) p.set('page', String(f.page));
  return p;
}

export function hasActiveFilters(f) {
  return Boolean(f.q || f.category || f.condition || f.min !== null || f.max !== null);
}
