export function Loading({ label = 'Loading…' }) {
  return (
    <p role="status" className="flex items-center justify-center gap-3 py-12 text-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-gold-ink" aria-hidden="true" />
      {label}
    </p>
  );
}

export function ErrorState({ title = 'Something went wrong', error, onRetry }) {
  return (
    <div role="alert" className="rounded-2xl border border-sold/30 bg-card p-5 shadow-[var(--shadow-card)]">
      <p className="font-semibold text-sold">{title}</p>
      {error && <p className="mt-1 text-sm text-ink-soft">{error.message ?? String(error)}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-outline mt-3 px-4 py-1.5 text-sm">
          Try again
        </button>
      )}
    </div>
  );
}

export function Notice({ tone = 'info', children }) {
  const styles = { info: 'border-line bg-card', warn: 'border-gold bg-gold-wash', error: 'border-sold/40 bg-card text-sold', ok: 'border-ok/30 bg-ok-wash' };
  return <div className={`rounded-xl border px-4 py-3 text-sm ${styles[tone]}`}>{children}</div>;
}
