export function Loading({ label = 'Loading…' }) {
  return (
    <p role="status" className="flex items-center justify-center gap-3 py-12 font-mono text-sm text-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-accent" aria-hidden="true" />
      {label}
    </p>
  );
}

export function ErrorState({ title = 'Something went wrong', error, onRetry }) {
  return (
    <div role="alert" className="rounded-2xl border border-sold/40 bg-sold-wash p-5">
      <p className="font-semibold text-sold">{title}</p>
      {error && <p className="mt-1 text-sm text-fg-soft">{error.message ?? String(error)}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-outline mt-3 px-4 py-1.5 text-sm">
          Try again
        </button>
      )}
    </div>
  );
}

export function Notice({ tone = 'info', children }) {
  const styles = {
    info: 'border-line bg-surface',
    warn: 'border-accent/50 bg-accent-wash',
    error: 'border-sold/40 bg-sold-wash text-sold',
    ok: 'border-ok/30 bg-ok-wash',
  };
  return <div className={`rounded-xl border px-4 py-3 text-sm ${styles[tone]}`}>{children}</div>;
}
