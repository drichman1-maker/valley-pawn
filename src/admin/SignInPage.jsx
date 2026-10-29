import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth, useBackend } from '../lib/backend/BackendContext.jsx';
import { LogoMark, ModeBanners } from '../components/SiteLayout.jsx';
import { shopName } from '../config/shop.js';

const safeNext = (n) => (n && n.startsWith('/owner') && !n.startsWith('//') ? n : '/owner/import');

export function SignInPage() {
  const backend = useBackend();
  const auth = useAuth();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const next = safeNext(params.get('next'));

  if (!auth.loading && auth.session && auth.isOwner) return <Navigate to={next} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await backend.signIn(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper-deep/50">
      <ModeBanners />
      <main id="main" className="mx-auto max-w-sm px-4 py-16">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <LogoMark className="h-14 w-14" />
          <p className="text-sm font-semibold text-muted">{shopName()}</p>
          <h1 className="text-3xl">Owner sign-in</h1>
        </div>
        {backend.mode === 'demo' ? (
          <div className="surface space-y-4 p-6">
            <p className="text-sm">Demo mode has no real accounts. Anyone can open the demo owner portal; nothing is saved.</p>
            <button type="button" onClick={() => backend.signIn()} className="btn btn-ink w-full">Open demo owner portal</button>
          </div>
        ) : (
          <form onSubmit={submit} className="surface space-y-4 p-6">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-semibold">Email</label>
              <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-semibold">Password</label>
              <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="field" />
            </div>
            {error && <p role="alert" className="text-sm text-sold">{error}</p>}
            {auth.session && !auth.isOwner && !auth.loading && <p role="alert" className="text-sm text-sold">This account is not on the owner list.</p>}
            <button type="submit" disabled={busy} className="btn btn-ink w-full">{busy ? 'Signing in…' : 'Sign in'}</button>
          </form>
        )}
      </main>
    </div>
  );
}
