import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBackend } from '../lib/backend/BackendContext.jsx';
import { useAsync } from '../lib/useAsync.js';
import { usePageTitle } from '../lib/usePageTitle.js';
import { DEFAULT_FILTERS, serializeFilters } from '../lib/url/filters.js';
import { ProductGrid, itemPath } from '../components/ProductCard.jsx';
import { ErrorState, Loading } from '../components/States.jsx';
import { ArrowIcon, LastUpdated, PhoneIcon } from '../components/SiteLayout.jsx';
import { CategoryIcon, artInk } from '../components/CategoryArt.jsx';
import { ItemImage } from '../components/ItemImage.jsx';
import { ItemTag } from '../components/ItemTag.jsx';
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
      <path d="m5 12 4.5 4.5L19 7" />
    </svg>
  );
}

export function SearchForm({ initial = '', idPrefix = 'home', size = 'lg' }) {
  const [q, setQ] = useState(initial);
  const navigate = useNavigate();
  const big = size === 'lg';
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        navigate(`/inventory?${serializeFilters({ ...DEFAULT_FILTERS, q })}`);
      }}
      className={`flex items-center gap-2 rounded-2xl border border-line-strong bg-bg/80 pl-4 shadow-[var(--shadow-lift)] backdrop-blur transition focus-within:border-accent focus-within:shadow-[var(--shadow-glow)] ${big ? 'p-2' : 'p-1.5'}`}
    >
      <SearchIcon className="h-5 w-5 shrink-0 text-muted" />
      <label htmlFor={`${idPrefix}-q`} className="sr-only">Search inventory</label>
      <input
        id={`${idPrefix}-q`}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search items, brands or item numbers"
        className={`min-w-0 flex-1 bg-transparent text-fg placeholder:text-muted focus:outline-none ${big ? 'py-2.5 text-[1.02rem]' : 'py-1.5'}`}
      />
      <button type="submit" className={`btn btn-accent ${big ? '' : 'px-4 py-2 text-sm'}`}>Search</button>
    </form>
  );
}

/** Three featured items stacked like tags on a hook. */
function FeaturedStack({ items }) {
  const spots = [
    'left-0 top-12 -rotate-[7deg] z-10',
    'right-0 top-16 rotate-[6deg] z-10',
    'left-1/2 top-0 -translate-x-1/2 z-20',
  ];
  return (
    <ul className="relative hidden h-[26rem] lg:block" aria-label="Featured items">
      <span aria-hidden="true" className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-3xl" />
      {items.slice(0, 3).map((item, i) => (
        <li key={item.item_id} className={`absolute w-[14.5rem] ${spots[i]}`}>
          <Link
            to={itemPath(item.item_id)}
            className="block overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-[0_40px_80px_-24px_rgb(0_0_0/0.9)] transition duration-300 hover:-translate-y-2 hover:border-accent/60"
          >
            <div className="relative aspect-[4/3]">
              <ItemImage photo={item.photos?.[0]} item={item} alt="" />
              <ItemTag id={item.item_id} className="absolute left-2.5 top-2.5 text-xs" />
            </div>
            <div className="flex items-end justify-between gap-2 p-4">
              <p className="line-clamp-2 text-sm font-semibold leading-snug">{item.title}</p>
              <p className="shrink-0 font-display text-xl font-bold tabular tracking-tight text-accent">{formatPrice(item.price)}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Ticker({ items }) {
  if (!items.length) return null;
  const row = (key) => (
    <ul key={key} aria-hidden={key === 'b'} className="items-center gap-10 pr-10">
      {items.map((t, i) => (
        <li key={`${t}-${i}`} className="flex items-center gap-10 whitespace-nowrap font-mono text-[0.72rem] uppercase tracking-[0.2em] text-muted">
          {t}
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        </li>
      ))}
    </ul>
  );
  return (
    <div className="marquee border-y border-line py-3" aria-label="Highlights">
      <div className="marquee-track">
        {row('a')}
        {row('b')}
      </div>
    </div>
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
  const tickerItems = [...claims.map((c) => c.text), ...(cats.data ?? []).map((c) => `${c.category} (${c.count})`)];

  return (
    <div className="space-y-20 sm:space-y-28">
      <div className="space-y-6">
        <section aria-labelledby="home-title" className="glow relative overflow-hidden rounded-[2rem] border border-line px-5 py-12 sm:px-10 sm:py-16 lg:px-14 lg:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.25fr_1fr]">
            <div className="min-w-0 space-y-7">
              <p className="eyebrow rise flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                {SHOP.tagline ?? 'In stock now'}
              </p>
              <h1 id="home-title" className="rise text-[3.2rem] leading-[0.95] sm:text-7xl lg:text-[5.6rem]">
                Great finds,<br />
                <span className="text-accent">fair prices.</span>
              </h1>
              <p className="rise-2 max-w-xl text-lg text-fg-soft">
                {SHOP.about ?? 'Tools, jewelry, electronics, instruments and more.'} {AVAILABILITY_NOTE}
              </p>
              <div className="rise-2 max-w-xl">
                <SearchForm />
              </div>
              <div className="rise-3 flex flex-wrap items-center gap-x-8 gap-y-3">
                {totalAvailable > 0 && (
                  <Link to="/inventory" className="group flex items-baseline gap-2 hover:text-accent">
                    <strong className="font-display text-3xl font-bold tabular tracking-tight">{totalAvailable}</strong>
                    <span className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted group-hover:text-accent">items in stock</span>
                  </Link>
                )}
                {cats.data?.length > 0 && (
                  <span className="flex items-baseline gap-2">
                    <strong className="font-display text-3xl font-bold tabular tracking-tight">{cats.data.length}</strong>
                    <span className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted">categories</span>
                  </span>
                )}
                <LastUpdated />
              </div>
            </div>
            {featured.data?.items.length >= 3 && <FeaturedStack items={featured.data.items} />}
          </div>
        </section>

        <Ticker items={tickerItems} />
      </div>

      {cats.data?.length > 0 && (
        <nav aria-label="Categories" className="space-y-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Browse</p>
              <h2 className="mt-2 text-4xl sm:text-5xl">Shop by category</h2>
            </div>
            <Link to="/inventory" className="btn btn-outline hidden sm:inline-flex">All inventory <ArrowIcon /></Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {cats.data.map((c) => (
              <li key={c.category}>
                <Link
                  to={categoryHref(c.category)}
                  className="group relative flex h-full min-h-[8.5rem] flex-col justify-between overflow-hidden rounded-2xl border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-accent/60 hover:bg-surface-2"
                  style={{ '--cat-ink': artInk(c.category) }}
                >
                  <CategoryIcon category={c.category} className="pointer-events-none absolute -bottom-5 -right-5 h-28 w-28 opacity-[0.07] transition group-hover:opacity-[0.14]" strokeWidth={1} />
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg text-[color:var(--cat-ink)] ring-1 ring-white/10 transition group-hover:bg-accent group-hover:text-accent-ink group-hover:ring-accent">
                    <CategoryIcon category={c.category} className="h-5 w-5" strokeWidth={1.7} />
                  </span>
                  <span className="mt-6">
                    <span className="block font-display text-lg font-semibold leading-tight tracking-tight">{c.category}</span>
                    <span className="mt-1 block font-mono text-[0.68rem] uppercase tracking-wider text-muted tabular">{c.count} {c.count === 1 ? 'item' : 'items'}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/inventory" className="btn btn-outline w-full sm:hidden">All inventory <ArrowIcon /></Link>
        </nav>
      )}

      {featured.data?.items.length > 0 && (
        <section aria-labelledby="featured-title" className="space-y-6">
          <div>
            <p className="eyebrow">Hand-picked</p>
            <h2 id="featured-title" className="mt-2 text-4xl sm:text-5xl">Featured</h2>
          </div>
          <ProductGrid items={featured.data.items} large />
        </section>
      )}

      <section aria-labelledby="latest-title" className="space-y-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Just in</p>
            <h2 id="latest-title" className="mt-2 text-4xl sm:text-5xl">Newest listings</h2>
          </div>
          <Link to="/inventory" className="link whitespace-nowrap text-sm sm:text-base">
            See all <span aria-hidden="true">→</span>
          </Link>
        </div>
        {latest.loading && <Loading />}
        {latest.error && <ErrorState title="Inventory could not be loaded." error={latest.error} onRetry={latest.reload} />}
        {latest.data && (newest.length ? <ProductGrid items={newest} /> : <p className="text-muted">No items are listed right now.</p>)}
      </section>

      {servicesEnabled() && (
        <section aria-labelledby="sell-promo" className="grid overflow-hidden rounded-[2rem] border border-line bg-surface md:grid-cols-[1.1fr_1fr]">
          <div className="glow space-y-5 p-7 sm:p-12">
            <p className="eyebrow">Sell or pawn</p>
            <h2 id="sell-promo" className="text-4xl sm:text-5xl">Need cash <span className="text-accent">today?</span></h2>
            <p className="max-w-md text-fg-soft">
              {SHOP.services.pawnLoans
                ? 'Sell us your item, or pawn it for a short-term loan and get it back when you repay. The evaluation is always free.'
                : 'Bring it in for a free evaluation and a fair offer.'}
            </p>
            <Link to="/sell" className="btn btn-ink mt-2">How it works <ArrowIcon /></Link>
          </div>
          <div className="p-7 sm:p-12">
            <p className="eyebrow mb-5 text-muted">We buy and lend on</p>
            <ul className="flex flex-wrap gap-2">
              {SHOP.services.buys.map((b) => (
                <li key={b} className="flex items-center gap-2 rounded-full border border-line-strong bg-bg px-3.5 py-2 text-sm font-medium">
                  <CategoryIcon category={b} className="h-4 w-4 text-accent" strokeWidth={1.9} />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section aria-labelledby="how-title" className="space-y-8">
        <div>
          <p className="eyebrow">How it works</p>
          <h2 id="how-title" className="mt-2 text-4xl sm:text-5xl">From the website to your hands</h2>
        </div>
        <ol className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-5 bg-surface p-6 sm:block sm:p-7">
              <span className="font-mono text-sm text-accent tabular" aria-hidden="true">0{i + 1}</span>
              <div>
                <h3 className="font-display text-xl font-semibold tracking-tight sm:mt-8">{s.title}</h3>
                <p className="mt-2 text-sm text-fg-soft">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {tel && (
        <section aria-labelledby="cta-title" className="block-accent grid gap-8 overflow-hidden rounded-[2rem] px-6 py-10 sm:px-12 sm:py-14 md:grid-cols-[1.3fr_1fr] md:items-center">
          <div className="space-y-4">
            <h2 id="cta-title" className="text-4xl text-accent-ink sm:text-6xl">See something you like?</h2>
            <p className="max-w-md text-accent-ink/75">Call with the item number and we will check the shelf for you.</p>
            <div className="flex flex-wrap gap-3 pt-3">
              <a href={tel} className="btn bg-accent-ink text-accent tabular hover:bg-black">
                <PhoneIcon />
                Call {SHOP.phone}
              </a>
              <Link to="/visit" className="btn border border-accent-ink/30 text-accent-ink hover:border-accent-ink hover:bg-accent-ink/5">Directions</Link>
            </div>
          </div>
          {(SHOP.address || SHOP.hours.length > 0) && (
            <div className="space-y-3 rounded-2xl bg-accent-ink/90 p-6 text-fg">
              {SHOP.address && <p className="font-semibold">{SHOP.address}</p>}
              <dl className="divide-y divide-white/10 text-sm">
                {SHOP.hours.map((h) => (
                  <div key={h.days} className="flex justify-between gap-4 py-2">
                    <dt className="text-fg-soft">{h.days}</dt>
                    <dd className="font-mono tabular">{h.time}</dd>
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
