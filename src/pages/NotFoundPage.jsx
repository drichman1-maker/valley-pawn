import { Link } from 'react-router-dom';
import { usePageTitle } from '../lib/usePageTitle.js';

export function NotFoundPage({ title = 'Page not found', message = "There's nothing at this address." }) {
  usePageTitle(title);
  return (
    <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
      <p className="eyebrow">Nothing here</p>
      <h1 className="text-4xl">{title}</h1>
      <p className="text-ink-soft">{message}</p>
      <Link to="/inventory" className="btn btn-ink">Browse inventory</Link>
    </div>
  );
}
