import { Link } from 'react-router-dom';

export function Pagination({ page, total, pageSize, hrefFor }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const link = 'btn btn-outline px-4 py-2 text-sm';
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-3">
      {page > 1 ? <Link className={link} to={hrefFor(page - 1)}>Previous</Link> : <span className={`${link} opacity-40`} aria-hidden="true">Previous</span>}
      <span className="text-sm text-muted tabular">Page {page} of {pages}</span>
      {page < pages ? <Link className={link} to={hrefFor(page + 1)}>Next</Link> : <span className={`${link} opacity-40`} aria-hidden="true">Next</span>}
    </nav>
  );
}
