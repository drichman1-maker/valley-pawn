import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, useBackend } from '../lib/backend/BackendContext.jsx';
import { LogoMark, ModeBanners } from '../components/SiteLayout.jsx';
import { Loading } from '../components/States.jsx';
import { shopName } from '../config/shop.js';

/**
 * Client-side guard for owner pages. This only controls what is SHOWN; every owner read and
 * write is enforced by the database (owner allowlist + row-level security), not by this check.
 */
export function RequireOwner({ children }) {
  const auth = useAuth();
  const backend = useBackend();
  const location = useLocation();
  if (auth.loading) return <Loading label="Checking sign-in…" />;
  if (!auth.session) return <Navigate to={`/owner/sign-in?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (!auth.isOwner) {
    return (
      <div className="mx-auto max-w-md space-y-3 p-8">
        <h1 className="text-2xl">Not authorized</h1>
        <p>{auth.session.user?.email} is signed in but is not on this shop's owner list. Ask the shop's administrator to add this account.</p>
        {auth.error && <p className="text-sm text-sold">{auth.error}</p>}
        <button type="button" onClick={() => backend.signOut()} className="rounded-md border border-line-strong px-3 py-2 font-semibold">Sign out</button>
      </div>
    );
  }
  return children;
}

const tab = ({ isActive }) => `whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${isActive ? 'bg-accent text-accent-ink' : 'text-fg-soft hover:bg-surface-2 hover:text-fg'}`;

export function AdminLayout() {
  const backend = useBackend();
  const auth = useAuth();
  return (
    <div className="min-h-screen bg-paper-deep/50">
      <ModeBanners />
      <header className="glow border-b border-line text-fg">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <LogoMark className="h-10 w-10" />
            <div>
              <p className="font-display text-lg font-bold leading-tight tracking-tight">Owner portal</p>
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted">{shopName()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted sm:inline">{auth.session?.user?.email}</span>
            <Link to="/" className="text-fg-soft underline decoration-line-strong underline-offset-4 hover:text-accent">View storefront</Link>
            <button type="button" onClick={() => backend.signOut()} className="btn btn-outline px-3.5 py-1.5 text-sm">Sign out</button>
          </div>
        </div>
        <nav aria-label="Owner" className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3 scrollbar-none">
          <NavLink to="/owner/import" className={tab}>Import spreadsheet</NavLink>
          <NavLink to="/owner/items" className={tab}>Items and photos</NavLink>
          <NavLink to="/owner/history" className={tab}>History and restore</NavLink>
        </nav>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
