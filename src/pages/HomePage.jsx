import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBackend } from '../lib/backend/BackendContext.jsx';
import { useAsync } from '../lib/useAsync.js';
import { DEFAULT_FILTERS, serializeFilters } from '../lib/url/filters.js';
import { ProductGrid } from '../components/ProductCard.jsx';
import { ErrorState, Loading } from '../components/States.jsx';
import { LastUpdated, PhoneIcon } from '../components/SiteLayout.jsx';
import { CategoryArt, CategoryIcon } from '../components/CategoryArt.jsx';
import { AVAILABILITY_NOTE, SHOP, approvedClaims, telHref } from '../config/shop.js';

const categoryHref = (category) => `/inventory?${serializeFilters({ ...DEFAULT_FILTERS, category })}`;

function SearchIcon({ className = 'h-5 w-5' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function SearchForm({ initial = '', idPrefix = 'home' }) {
  const [q, setQ] = useState(initial);
  const navigate = useNavigate();
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        navigate(`/inventory?${serializeFilters({ ...DEFAULT_FILTERS, q })}`);
      }}
      className="flex items-center gap-2 rounded-full bg-card p-1.5 pl-4 shadow-[var(--shadow-lift)] ring-1 ring-black/5"
    >
      <SearchIcon className="h-5 w-5 shrink-0 text-muted" />
      <label htmlFor={`${idPrefix}-q`} className="sr-only">Search inventory</label>
      <input
        id={`${idPrefix}-q`}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by item, brand, model or item number"
        className="min-w-0 flex-1 bg-transparent py-2 text-ink placeholder:text-muted/80 focus:outline-none"
      />
      <button type="submit" className="btn btn-ink">Search</button>
    </form>
  );
}

const STEPS = [
  { n: '1', title: 'Browse online', body: 'See what is on the shelves right now, with prices, condition and item numbers.' },
  { n: '2', title: 'Call to confirm', body: 'Give us the item number and we will check it is still here for you.' },
  { n: '3', title: 'Pick it up in store', body: 'Come by, see it in person and take it home the same day.' },
];

export function HomePage() {
  const backend = useBackend();
  const latest = useAsync(() => backend.searchPublicItems({ ...DEFAULT_FILTERS }, { pageSize: 8 }), [backend]);
  const featured = useAsync(() => backend.searchPublicItems({ ...DEFAULT_FILTERS }, { pageSize: 4, featured: true }), [backend]);
  const cats = useAsync(() => backend.getPublicCategories(), [backend]);
  const claims = approvedClaims();
  const tel = telHref();
  const topCats = [...(cats.data ?? [])].sort((a, b) => b.count - a.count).slice(0, 4);
  const totalAvailable = (cats.data ?? []).reduce((n, c) => n + c.count, 0);

  return (
    <div className="space-y-16 sm:space-y-20">
      <section aria-labelledby="home-title" className="texture-dark relative overflow-hidden rounded-[2rem] px-5 py-10 text-paper sm:px-10 sm:py-14 lg:px-14">
        <div className="grid items-center gap-10 lg:grid-cols-[1.25fr_1fr]">
          <div className="min-w-0 space-y-6">
            <p className="eyebrow text-gold-bright">{SHOP.tagline ?? 'In stock now'}</p>
            <h1 id="home-title" className="text-4xl text-paper sm:text-5xl lg:text-[3.6rem]">
              Browse what we have for sale<span className="text-gold-bright">.</span>
            </h1>
            <p className="max-w-xl text-lg text-paper/75">
              {SHOP.about ?? 'Tools, jewelry, electronics, instruments and more.'} {AVAILABILITY_NOTE}
            </p>
            <div className="max-w-xl">
              <SearchForm />
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-paper/70">
              {totalAvailable > 0 && (
                <span>
                  <strong className="font-serif text-lg text-paper tabular">{totalAvailable}</strong> items available
                </span>
              )}
              {cats.data?.length > 0 && (
                <span>
                  <strong className="font-serif text-lg text-paper tabular">{cats.data.length}</strong> categories
                </span>
              )}
              <LastUpdated className="text-paper/70" />
            </div>
          </div>

          {topCats.length > 0 && (
            <ul className="hidden grid-cols-2 gap-3 lg:grid" aria-label="Popular categories">
              {topCats.map((c, i) => (
                <li key={c.category} className={i % 2 ? 'translate-y-6' : ''}>
                  <Link to={categoryHref(c.category)} className="group block overflow-hidden rounded-2xl ring-1 ring-paper/10 transition hover:-translate-y-1 hover:ring-gold/60">
                    <div className="aspect-[5/4]">
                      <CategoryArt category={c.category} label="" />
                    </div>
                    <div className="flex items-center justify-between bg-ink-2 px-4 py-3 text-sm">
                      <span className="font-semibold text-paper">{c.category}</span>
                      <span className="text-paper/60 tabular">{c.count}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {cats.data?.length > 0 && (
        <nav aria-label="Categories" className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-2xl sm:text-3xl">Shop by category</h2>
          </div>
          <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-none sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {cats.data.map((c) => (
              <li key={c.category} className="shrink-0">
                <Link
                  to={categoryHref(c.category)}
                  className="group flex items-center gap-3 rounded-2xl border border-line bg-card py-2.5 pl-2.5 pr-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-gold hover:shadow-[var(--shadow-lift)]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-wash text-gold-ink transition group-hover:bg-gold group-hover:text-ink">
                    <CategoryIcon category={c.category} className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <span className="text-sm font-semibold">
                    {c.category} <span className="font-normal text-muted tabular">({c.count})</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {featured.data?.items.length > 0 && (
        <section aria-labelledby="featured-title" className="space-y-5">
          <div>
            <p className="eyebrow">Hand-picked</p>
            <h2 id="featured-title" className="mt-1 text-2xl sm:text-3xl">Featured</h2>
          </div>
          <ProductGrid items={featured.data.items} />
        </section>
      )}

      <section aria-labelledby="latest-title" className="space-y-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Just in</p>
            <h2 id="latest-title" className="mt-1 text-2xl sm:text-3xl">Newest listings</h2>
          </div>
          <Link to="/inventory" className="link whitespace-nowrap text-sm sm:text-base">
            See all inventory <span aria-hidden="true">→</span>
          </Link>
        </div>
        {latest.loading && <Loading />}
        {latest.error && <ErrorState title="Inventory could not be loaded." error={latest.error} onRetry={latest.reload} />}
        {latest.data && (latest.data.items.length ? <ProductGrid items={latest.data.items} /> : <p className="text-muted">No items are listed right now.</p>)}
      </section>

      <section aria-labelledby="how-title" className="rounded-[2rem] border border-line bg-paper-deep/60 px-5 py-10 sm:px-10">
        <p className="eyebrow">How it works</p>
        <h2 id="how-title" className="mt-1 text-2xl sm:text-3xl">From the website to your hands</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink font-serif text-lg font-semibold text-gold-bright" aria-hidden="true">
                {s.n}
              </span>
              <div>
                <h3 className="font-sans text-base font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        {claims.length > 0 && (
          <ul className="mt-10 grid gap-3 border-t border-line pt-8 text-sm sm:grid-cols-3">
            {claims.map((c) => (
              <li key={c.text} className="flex items-start gap-2.5 text-ink-soft">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-ok" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" className="opacity-25" />
                  <path d="m8 12 3 3 5-6" />
                </svg>
                {c.text}
              </li>
            ))}
          </ul>
        )}
      </section>

      {tel && (
        <section aria-labelledby="cta-title" className="texture-dark flex flex-col items-start justify-between gap-6 rounded-[2rem] px-5 py-10 text-paper sm:flex-row sm:items-center sm:px-10">
          <div>
            <h2 id="cta-title" className="text-2xl text-paper sm:text-3xl">See something you like?</h2>
            <p className="mt-2 text-paper/70">Call with the item number and we will check it for you. {SHOP.address && `Find us at ${SHOP.address}.`}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={tel} className="btn btn-gold tabular">
              <PhoneIcon />
              Call {SHOP.phone}
            </a>
            <Link to="/visit" className="btn btn-ghost-light">Hours and location</Link>
          </div>
        </section>
      )}
    </div>
  );
}
