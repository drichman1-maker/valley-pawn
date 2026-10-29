import { Link } from 'react-router-dom';
import { ItemImage } from './ItemImage.jsx';
import { ItemTag } from './ItemTag.jsx';
import { formatPrice } from '../lib/format.js';

export const itemPath = (id) => `/item/${encodeURIComponent(id)}`;

export function ProductCard({ item }) {
  return (
    <li className="list-none">
      <Link
        to={itemPath(item.item_id)}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-[var(--shadow-card)] transition duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-lift)]"
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <ItemImage photo={item.photos?.[0]} category={item.category} alt="" className="transition duration-500 group-hover:scale-[1.04]" />
          <ItemTag id={item.item_id} className="absolute left-2.5 top-2.5 text-[0.7rem] sm:text-xs" />
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted">{item.category}</p>
            {item.condition && <span className="hidden shrink-0 rounded-full bg-paper-deep px-2 py-0.5 text-[0.7rem] font-medium text-ink-soft sm:inline">{item.condition}</span>}
          </div>
          <h3 className="min-h-[2.6em] font-sans text-[0.95rem] font-semibold leading-snug text-ink line-clamp-2 group-hover:text-gold-ink">{item.title}</h3>
          <p className="mt-auto pt-2 font-serif text-xl font-semibold tabular sm:text-[1.35rem]">{formatPrice(item.price)}</p>
        </div>
      </Link>
    </li>
  );
}

export function ProductGrid({ items, compact = false }) {
  const cols = compact ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-3 lg:grid-cols-4';
  return <ul className={`grid grid-cols-2 gap-3 sm:gap-5 ${cols}`}>{items.map((i) => <ProductCard key={i.item_id} item={i} />)}</ul>;
}
