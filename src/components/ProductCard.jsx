import { Link } from 'react-router-dom';
import { ItemImage } from './ItemImage.jsx';
import { ItemTag } from './ItemTag.jsx';
import { formatPrice } from '../lib/format.js';

export const itemPath = (id) => `/item/${encodeURIComponent(id)}`;

export function ProductCard({ item, large = false }) {
  return (
    <li className="list-none">
      <Link
        to={itemPath(item.item_id)}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)] transition duration-300 hover:-translate-y-1 hover:border-line-strong hover:shadow-[var(--shadow-lift)]"
      >
        <div className={`relative overflow-hidden ${large ? 'aspect-[5/4]' : 'aspect-[4/3]'}`}>
          <ItemImage photo={item.photos?.[0]} item={item} alt="" className="transition duration-700 ease-out group-hover:scale-[1.05]" />
          <ItemTag id={item.item_id} className="absolute left-2.5 top-2.5 text-sm sm:left-3 sm:top-3" />
          {item.condition && (
            <span className={`absolute right-3 top-3 rounded-md border border-white/10 bg-black/55 px-2 py-1 font-mono text-[0.75rem] uppercase tracking-wider text-fg-soft backdrop-blur hidden lg:inline`}>
              {item.condition}
            </span>
          )}
        </div>
        <div className={`flex flex-1 flex-col gap-1.5 ${large ? 'p-5' : 'p-3.5 sm:p-4'}`}>
          <p className="truncate font-mono text-[0.75rem] uppercase tracking-[0.18em] text-muted">
            {item.category}
            {item.condition && <span className="lg:hidden"> · {item.condition}</span>}
          </p>
          <h3 className={`min-h-[2.6em] font-sans font-semibold leading-snug text-fg line-clamp-2 transition-colors group-hover:text-accent ${large ? 'text-lg' : 'text-[0.95rem]'}`}>{item.title}</h3>
          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
            <p className={`font-display font-bold tabular tracking-tight ${large ? 'text-3xl' : 'text-xl sm:text-2xl'}`}>{formatPrice(item.price)}</p>
            <span className="mb-1 flex h-7 w-7 items-center justify-center rounded-full border border-line-strong text-muted transition group-hover:border-accent group-hover:bg-accent group-hover:text-accent-ink" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M7 17 17 7M8 7h9v9" /></svg>
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}

export function ProductGrid({ items, compact = false, large = false }) {
  const cols = large ? 'sm:grid-cols-2 lg:grid-cols-4' : compact ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-3 lg:grid-cols-4';
  return (
    <ul className={`grid grid-cols-2 gap-3 sm:gap-5 ${cols}`}>
      {items.map((i) => <ProductCard key={i.item_id} item={i} large={large} />)}
    </ul>
  );
}
