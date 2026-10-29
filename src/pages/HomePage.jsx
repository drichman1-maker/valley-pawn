import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBackend } from '../lib/backend/BackendContext.jsx';
import { useAsync } from '../lib/useAsync.js';
import { usePageTitle } from '../lib/usePageTitle.js';
import { DEFAULT_FILTERS, serializeFilters } from '../lib/url/filters.js';
import { ProductGrid, itemPath } from '../components/ProductCard.jsx';
import { ErrorState, Loading } from '../components/States.jsx';
import { LastUpdated, PhoneIcon } from '../components/SiteLayout.jsx';
import { CategoryIcon } from '../components/CategoryArt.jsx';
import { ItemImage } from '../components/ItemImage.jsx';
import { formatPrice } from '../lib/format.js';
import { AVAILABILITY_NOTE, SHOP, approvedClaims, servicesEnabled, telHref } from '../config/shop.js';

const categoryHref = (category) => `/inventory?${serializeFilters({ ...DEFAULT_FILTERS, category })}`;

function SearchIcon({ className = 'h-5 w-5' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CheckIcon({ className = 'h-5 w-5' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" className="opacity-25" />
      <path d="m8 12 3 3 5-6" />
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
        placeholder="Search items, brands or item numbers"
        className="min-w-0 flex-1 bg-transparent py-2 text-ink placeholder:text-muted/80 focus:outline-none"
      />
      <button type="submit" className="btn btn-ink">Search</button>
    </form>
  );
}

/** Three featured items fanned out like cards on a counter. */
function FeaturedFan({ items }) {
  const spots = [
    '-left-2 top-16 -rotate-[8deg]',
    '-right-2 top-20 rotate-[7deg]',
    'left-1/2 top-6 -translate-x-1/2 z-10',
  ];
  return (
    <ul className="relative hidden h-[24rem] lg:block" aria-label="Featured items">
      {items.slice(0, 3).map((item, i) => (
        <li key={item.item_id} className={`absolute w-[13.5rem] ${spots[i]}`}>
          <Link
            to={itemPath(item.item_id)}
            className="block overflow-hidden rounded-2xl bg-card text-ink shadow-[0_30px_60px_-20px_rgb(0_0_0/0.55)] ring-1 ring-black/10 transition duration-300 hover:-translate-y-2"
          >
            <div className="aspect-[4/3]">
              <ItemImage photo={item.photos?.[0]} item={item} alt="" />
            </div>
            <div className="space-y-1 p-4">
              <p className="line-clamp-1 text-sm font-semibold">{item.title}</p>
              <p className="font-serif text-xl font-semibold tabular">{formatPrice(item.price)}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const STEPS = [
  { title: 'Browse online', body: 'See what is on the shelves right now, with prices, condition and item numbers.' },
  { title: 'Call to confirm', body: 'Give us the item number and we will check it is still here for you.' },
  { title: 'Pick it up in store', body: 'Come by, see it in person and take it home the same day.' },
];

export function HomePage() {
  usePageTitle(SHOP.tagline ?? 'Inventory');
  const backend = useBackend();
  const latest = useAsync(() => backend.searchPublicItems({ ...DEFAULT_FILTERS }, { pageSize: 12 }), [backend]);
  const featured = useAsync(() => backend.searchPublicItems({ ...DEFAULT_FILTERS }, { pageSize: 4, featured: true }), [backend]);
  const cats = useAsync(() => backend.getPublicCategories(), [backend]);
  const claims = approvedClaims();
  const tel = telHref();
  const totalAvailable = (cats.data ?? []).reduce((n, c) => n + c.count, 0);
  const featuredIds = new Set((featured.data?.items ?? []).map((i) => i.item_id));
  const newest = (latest.data?.items ?? []).filter((i) => !featuredIds.has(i.item_id)).slice(0, 8);

  return (
    <div className="space-y-16 sm:space-y-24">
      <div className="space-y-4">
        <section aria-labelledby="home-title" className="texture-dark relative overflow-hidden rounded-[2rem] px-5 py-10 text-paper sm:px-10 sm:py-14 lg:px-14 lg:py-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div className="min-w-0 space-y-6">
              <p className="eyebrow text-gold-bright">{SHOP.tagline ?? 'In stock now'}</p>
              <h1 id="home-title" className="text-[2.6rem] text-paper sm:text-6xl lg:text-[4.1rem]">
                Great finds at fair prices<span className="text-gold-bright">.</span>
              </h1>
              <p className="max-w-xl text-lg text-paper/75">
                {SHOP.about ?? 'Tools, jewelry, electronics, instruments and more.'} {AVAILABILITY_NOTE}
              </p>
              <div className="max-w-xl">
                <SearchForm />
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-paper/70">
                {totalAvailable > 0 && (
                  <Link to="/inventory" className="hover:text-paper">
                    <strong className="font-serif text-xl text-paper tabular">{totalAvailable}</strong> items in stock
                  </Link>
                )}
                {cats.data?.length > 0 && (
                  <span>
                    <strong className="font-serif text-xl text-paper tabular">{cats.data.length}</strong> categories
                  </span>
                )}
                <LastUpdated className="text-paper/70" />
              </div>
            </div>
            {featured.data?.items.length >= 3 && <FeaturedFan items={featured.data.items} />}
          </div>
        </section>

        {claims.length > 0 && (
          <ul className="grid gap-3 rounded-2xl border border-line bg-card px-5 py-4 text-sm shadow-[var(--shadow-card)] sm:grid-cols-3 sm:px-8">
            {claims.map((c) => (
              <li key={c.text} className="flex items-center gap-2.5 font-medium text-ink-soft">
                <CheckIcon className="h-5 w-5 shrink-0 text-ok" />
                {c.text}
              </li>
            ))}
          </ul>
        )}
      </div>

      {cats.data?.length > 0 && (
        <nav aria-label="Categories" className="space-y-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Browse</p>
              <h2 className="mt-1 text-3xl sm:text-4xl">Shop by category</h2>
            </div>
            <Link to="/inventory" className="link hidden whitespace-nowrap sm:inline">All inventory <span aria-hidden="true">→</span></Link>
          </div>
          <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-[repeat(auto-fit,minmax(6.4rem,1fr))]">
            {cats.data.map((c) => (
              <li key={c.category} className="w-28 shrink-0 sm:w-auto">
                <Link
                  to={categoryHref(c.category)}
                  className="group flex h-full flex-col items-center gap-2.5 rounded-2xl border border-line bg-card px-2 py-4 text-center shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-gold hover:shadow-[var(--shadow-lift)]"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-wash text-gold-ink transition group-hover:bg-gold group-hover:text-ink">
                    <CategoryIcon category={c.category} className="h-6 w-6" strokeWidth={1.6} />
                  </span>
                  <span className="text-[0.8rem] font-semibold leading-tight">{c.category}</span>
                  <span className="text-xs text-muted tabular">({c.count})</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {featured.data?.items.length > 0 && (
        <section aria-labelledby="featured-title" className="space-y-6">
          <div>
            <p className="eyebrow">Hand-picked</p>
            <h2 id="featured-title" className="mt-1 text-3xl sm:text-4xl">Featured</h2>
          </div>
          <ProductGrid items={featured.data.items} />
        </section>
      )}

      <section aria-labelledby="latest-title" className="space-y-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Just in</p>
            <h2 id="latest-title" className="mt-1 text-3xl sm:text-4xl">Newest listings</h2>
          </div>
          <Link to="/inventory" className="link whitespace-nowrap text-sm sm:text-base">
            See all inventory <span aria-hidden="true">→</span>
          </Link>
        </div>
        {latest.loading && <Loading />}
        {latest.error && <ErrorState title="Inventory could not be loaded." error={latest.error} onRetry={latest.reload} />}
        {latest.data && (newest.length ? <ProductGrid items={newest} /> : <p className="text-muted">No items are listed right now.</p>)}
      </section>

      {servicesEnabled() && (
        <section aria-labelledby="sell-promo" className="grid overflow-hidden rounded-[2rem] border border-line bg-card shadow-[var(--shadow-card)] md:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4 p-7 sm:p-10">
            <p className="eyebrow">Sell or pawn</p>
            <h2 id="sell-promo" className="text-3xl sm:text-4xl">Need cash today?</h2>
            <p className="text-ink-soft">
              {SHOP.services.pawnLoans
                ? 'Sell us your item, or pawn it for a short-term loan and get it back when you repay. The evaluation is always free.'
                : 'Bring it in for a free evaluation and a fair offer.'}
            </p>
            <Link to="/sell" className="btn btn-ink mt-2">How selling and pawning works <span aria-hidden="true">→</span></Link>
          </div>
          <ul className="grid grid-cols-2 content-center gap-3 bg-paper-deep/70 p-7 sm:p-10">
            {SHOP.services.buys.slice(0, 6).map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-sm font-semibold">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card text-gold-ink shadow-[var(--shadow-card)]">
                  <CategoryIcon category={b} className="h-[1.1rem] w-[1.1rem]" strokeWidth={1.75} />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="how-title" className="space-y-8">
        <div>
          <p className="eyebrow">How it works</p>
          <h2 id="how-title" className="mt-1 text-3xl sm:text-4xl">From the website to your hands</h2>
        </div>
        <ol className="grid gap-5 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4 rounded-2xl border border-line bg-card p-5 shadow-[var(--shadow-card)] sm:block sm:p-6">
              <span className="font-serif text-3xl font-semibold text-gold/80 tabular sm:text-5xl" aria-hidden="true">0{i + 1}</span>
              <div>
                <h3 className="font-sans text-lg font-semibold sm:mt-3">{s.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {tel && (
        <section aria-labelledby="cta-title" className="texture-dark grid gap-8 rounded-[2rem] px-5 py-10 text-paper sm:px-10 md:grid-cols-[1.3fr_1fr] md:items-center">
          <div className="space-y-3">
            <h2 id="cta-title" className="text-3xl text-paper sm:text-4xl">See something you like?</h2>
            <p className="text-paper/70">Call with the item number and we will check the shelf for you.</p>
            <div className="flex flex-wrap gap-3 pt-3">
              <a href={tel} className="btn btn-gold tabular">
                <PhoneIcon />
                Call {SHOP.phone}
              </a>
              <Link to="/visit" className="btn btn-ghost-light">Directions</Link>
            </div>
          </div>
          {(SHOP.address || SHOP.hours.length > 0) && (
            <div className="space-y-3 rounded-2xl bg-paper/[0.06] p-6 ring-1 ring-paper/10">
              {SHOP.address && <p className="font-semibold">{SHOP.address}</p>}
              <dl className="divide-y divide-paper/10 text-sm">
                {SHOP.hours.map((h) => (
                  <div key={h.days} className="flex justify-between gap-4 py-2">
                    <dt className="text-paper/70">{h.days}</dt>
                    <dd className="font-semibold tabular">{h.time}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
