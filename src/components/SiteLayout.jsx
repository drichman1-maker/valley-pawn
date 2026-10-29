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

/** The shop's mark: a gold pawn on an ink tile. */
export function LogoMark({ className = 'h-10 w-10' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" className={className}>
      <rect width="64" height="64" rx="14" fill="var(--color-ink)" />
      <path d="M32 12a7 7 0 0 0-4.6 12.3c-2.5 1.4-4.2 3.6-4.2 6.2h17.6c0-2.6-1.7-4.8-4.2-6.2A7 7 0 0 0 32 12Zm-6.5 21-2.3 12h17.6l-2.3-12Zm-5.5 14a3 3 0 0 0-3 3v2h30v-2a3 3 0 0 0-3-3Z" fill="var(--color-gold)" />
    </svg>
  );
}

export function ModeBanners() {
  const backend = useBackend();
  return (
    <>
      {backend.mode === 'demo' && (
        <p className="bg-ink px-4 py-2 text-center text-[0.8rem] text-paper/90">
          {IS_SHOWCASE ? (
            <>
              <strong className="font-semibold text-gold-bright">Preview site.</strong> Sample inventory and store details for demonstration; changes reset on reload.
            </>
          ) : (
            <>
              <strong>Demo mode.</strong> Not connected to a database. Sample items only; changes are lost when the page reloads.
            </>
          )}
        </p>
      )}
      {!isShopConfigured() && (
        <p className="border-b border-gold bg-gold-wash px-4 py-2 text-center text-sm">
          Store name, phone and address are not set yet. Edit <code>src/config/shop.js</code> before launch.
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
    `relative rounded-full px-4 py-2 text-[0.95rem] font-medium transition-colors ${isActive ? 'bg-ink text-paper' : 'text-ink hover:bg-paper-deep'}`;

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/85 backdrop-blur-md supports-[backdrop-filter]:bg-paper/75">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <LogoMark className="h-10 w-10 shrink-0 sm:h-11 sm:w-11" />
          <span className="min-w-0">
            <span className="block truncate font-serif text-xl font-semibold leading-tight sm:text-2xl">{shopName()}</span>
            {(SHOP.tagline || SHOP.cityState) && (
              <span className="block truncate text-xs font-semibold uppercase tracking-[0.14em] text-muted">{SHOP.tagline ?? SHOP.cityState}</span>
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
            <a href={tel} className="btn btn-gold ml-3 tabular">
              <PhoneIcon />
              Call {SHOP.phone}
            </a>
          )}
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          {tel && (
            <a href={tel} className="btn btn-gold px-3.5 py-2 text-sm">
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
        <nav id={menuId} aria-label="Main" className="border-t border-line px-4 py-2 md:hidden">
          <ul className="flex flex-col">
            {[{ to: '/', label: 'Home' }, ...NAV].map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end className={({ isActive }) => `block rounded-xl px-3 py-3 font-medium ${isActive ? 'bg-ink text-paper' : ''}`}>
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
    <p className={`flex items-center gap-2 text-sm text-muted ${className}`}>
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full rounded-full bg-ok opacity-30" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
      </span>
      Inventory last updated {formatDateTime(data.lastPublishedAt)}
    </p>
  );
}

function Footer() {
  const tel = telHref();
  return (
    <footer className="texture-dark mt-20 text-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 text-sm sm:grid-cols-[1.6fr_1fr_1fr]">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <LogoMark className="h-10 w-10 ring-1 ring-paper/15 rounded-[14px]" />
            <p className="font-serif text-xl">{shopName()}</p>
          </div>
          {SHOP.about && <p className="max-w-sm text-paper/70">{SHOP.about}</p>}
          <p className="text-paper/55">Prices and availability can change in store.</p>
        </div>
        <div className="space-y-2">
          <p className="eyebrow text-gold-bright">Visit</p>
          {SHOP.address && <p className="text-paper/85">{SHOP.address}</p>}
          {tel && (
            <p>
              <a href={tel} className="font-semibold tabular text-paper underline decoration-paper/30 underline-offset-4 hover:decoration-paper">
                {SHOP.phone}
              </a>
            </p>
          )}
          {SHOP.hours.slice(0, 3).map((h) => (
            <p key={h.days} className="text-paper/70">
              {h.days}: <span className="tabular text-paper/90">{h.time}</span>
            </p>
          ))}
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-2 sm:items-end">
          <p className="eyebrow text-gold-bright">Browse</p>
          <Link to="/inventory" className="text-paper/85 underline-offset-4 hover:text-paper hover:underline">Inventory</Link>
          {servicesEnabled() && <Link to="/sell" className="text-paper/85 underline-offset-4 hover:text-paper hover:underline">Sell or pawn</Link>}
          <Link to="/visit" className="text-paper/85 underline-offset-4 hover:text-paper hover:underline">Hours and location</Link>
          <Link to="/owner" className="text-paper/55 underline-offset-4 hover:text-paper hover:underline">Owner sign-in</Link>
        </nav>
      </div>
      <div className="border-t border-paper/10">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-paper/45">
          © {new Date().getFullYear()} {shopName()}
        </p>
      </div>
    </footer>
  );
}

export function SiteLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-card focus:p-2">
        Skip to content
      </a>
      <ModeBanners />
      <Header />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
