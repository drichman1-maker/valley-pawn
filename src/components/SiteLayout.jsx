import { useEffect, useId, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { IS_SHOWCASE, SHOP, isShopConfigured, servicesEnabled, shopName, telHref } from '../config/shop.js';
import { ScrollToTop } from './ScrollToTop.jsx';
import { useBackend } from '../lib/backend/BackendContext.jsx';
import { useAsync } from '../lib/useAsync.js';
import { formatDateTime } from '../lib/format.js';

const navItems = () => [
  { to: '/inventory', label: 'Inventory' },
  servicesEnabled() && { to: '/sell', label: 'Sell & Pawn' },
  { to: '/visit', label: 'Visit' },
].filter(Boolean);

export function PhoneIcon({ className = 'h-4 w-4' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export function ArrowIcon({ className = 'h-4 w-4' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/** The shop's mark: a lime pawn on a black tile. */
export function LogoMark({ className = 'h-10 w-10' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" className={className}>
      <rect width="64" height="64" rx="16" fill="var(--color-bg)" />
      <rect x="0.5" y="0.5" width="63" height="63" rx="15.5" fill="none" stroke="rgb(255 255 255 / 0.14)" />
      <path d="M32 12a7 7 0 0 0-4.6 12.3c-2.5 1.4-4.2 3.6-4.2 6.2h17.6c0-2.6-1.7-4.8-4.2-6.2A7 7 0 0 0 32 12Zm-6.5 21-2.3 12h17.6l-2.3-12Zm-5.5 14a3 3 0 0 0-3 3v2h30v-2a3 3 0 0 0-3-3Z" fill="var(--color-accent)" />
    </svg>
  );
}

export function ModeBanners() {
  const backend = useBackend();
  return (
    <>
      {backend.mode === 'demo' && (
        <p className="border-b border-line bg-surface px-4 py-2 text-center font-mono text-[0.72rem] tracking-wide text-muted">
          {IS_SHOWCASE ? (
            <>
              <strong className="font-semibold text-accent">PREVIEW SITE</strong> · Sample inventory and store details for demonstration; changes reset on reload.
            </>
          ) : (
            <>
              <strong className="text-fg">DEMO MODE</strong> · Not connected to a database. Sample items only; changes are lost when the page reloads.
            </>
          )}
        </p>
      )}
      {!isShopConfigured() && (
        <p className="border-b border-accent/40 bg-accent-wash px-4 py-2 text-center text-sm text-fg">
          Store name, phone and address are not set yet. Edit <code className="font-mono text-accent">src/config/shop.js</code> before launch.
        </p>
      )}
    </>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname, location.search]);
  const tel = telHref();
  const NAV = navItems();
  const linkClass = ({ isActive }) =>
    `relative rounded-lg px-3.5 py-2 text-[0.92rem] font-medium transition-colors after:absolute after:inset-x-3.5 after:-bottom-px after:h-0.5 after:rounded-full after:bg-accent after:transition-opacity ${
      isActive ? 'text-fg after:opacity-100' : 'text-fg-soft after:opacity-0 hover:text-fg hover:bg-surface'
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <LogoMark className="h-10 w-10 shrink-0" />
          <span className="min-w-0">
            <span className="block truncate font-display text-[1.35rem] font-bold leading-none tracking-tight">{shopName()}</span>
            {(SHOP.tagline || SHOP.cityState) && (
              <span className="mt-1 hidden truncate font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted min-[420px]:block">{SHOP.tagline ?? SHOP.cityState}</span>
            )}
          </span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={linkClass}>
              {n.label}
            </NavLink>
          ))}
          {tel && (
            <a href={tel} className="btn btn-accent ml-3 tabular">
              <PhoneIcon />
              {SHOP.phone}
            </a>
          )}
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          {tel && (
            <a href={tel} className="btn btn-accent px-3.5 py-2 text-sm">
              <PhoneIcon />
              Call
            </a>
          )}
          <button type="button" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((v) => !v)} className="btn btn-outline px-3.5 py-2 text-sm">
            Menu
          </button>
        </div>
      </div>
      {open && (
        <nav id={menuId} aria-label="Main" className="border-t border-line bg-bg px-4 py-2 md:hidden">
          <ul className="flex flex-col">
            {[{ to: '/', label: 'Home' }, ...NAV].map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end className={({ isActive }) => `block rounded-xl px-3 py-3 font-display text-lg font-semibold ${isActive ? 'bg-surface text-accent' : 'text-fg'}`}>
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

export function LastUpdated({ className = '' }) {
  const backend = useBackend();
  const { data } = useAsync(() => backend.getInventoryInfo(), [backend]);
  if (!data?.lastPublishedAt) return null;
  return (
    <p className={`flex items-center gap-2 font-mono text-[0.72rem] uppercase tracking-wider text-muted ${className}`}>
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-40" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
      </span>
      Updated {formatDateTime(data.lastPublishedAt)}
    </p>
  );
}

function Footer() {
  const tel = telHref();
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-line bg-bg-2">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-14 sm:px-6">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <LogoMark className="h-11 w-11" />
              <div>
                <p className="font-display text-2xl font-bold leading-none tracking-tight">{shopName()}</p>
                {SHOP.tagline && <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted">{SHOP.tagline}</p>}
              </div>
            </div>
            {SHOP.about && <p className="max-w-sm text-fg-soft">{SHOP.about}</p>}
            <p className="font-mono text-xs text-muted">Prices and availability can change in store.</p>
          </div>
          <div className="space-y-3">
            <p className="eyebrow">Visit</p>
            {SHOP.address && <p className="text-fg-soft">{SHOP.address}</p>}
            {tel && (
              <p>
                <a href={tel} className="font-display text-xl font-semibold tabular text-fg hover:text-accent">
                  {SHOP.phone}
                </a>
              </p>
            )}
            <dl className="space-y-1 text-sm">
              {SHOP.hours.map((h) => (
                <div key={h.days} className="flex justify-between gap-4 border-b border-line py-1.5 last:border-0">
                  <dt className="text-muted">{h.days}</dt>
                  <dd className="font-mono text-fg-soft tabular">{h.time}</dd>
                </div>
              ))}
            </dl>
          </div>
          <nav aria-label="Footer" className="flex flex-col gap-2.5">
            <p className="eyebrow">Browse</p>
            <Link to="/inventory" className="w-fit text-fg-soft hover:text-accent">Inventory</Link>
            {servicesEnabled() && <Link to="/sell" className="w-fit text-fg-soft hover:text-accent">Sell or pawn</Link>}
            <Link to="/visit" className="w-fit text-fg-soft hover:text-accent">Hours and location</Link>
            <Link to="/owner" className="w-fit text-muted hover:text-accent">Owner sign-in</Link>
          </nav>
        </div>
        <p className="pointer-events-none mt-14 select-none overflow-hidden whitespace-nowrap font-display text-[clamp(3.5rem,14vw,11rem)] font-extrabold leading-[0.85] tracking-[-0.06em] text-surface-3" aria-hidden="true">
          {shopName()}
        </p>
        <p className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-5 font-mono text-[0.7rem] uppercase tracking-wider text-muted">
          <span>© {new Date().getFullYear()} {shopName()}</span>
          <span>Buy · Sell · Pawn</span>
        </p>
      </div>
    </footer>
  );
}

export function SiteLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-ink">
        Skip to content
      </a>
      <ModeBanners />
      <Header />
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
