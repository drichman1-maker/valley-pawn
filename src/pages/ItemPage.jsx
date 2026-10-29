import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useBackend } from '../lib/backend/BackendContext.jsx';
import { useAsync } from '../lib/useAsync.js';
import { DEFAULT_FILTERS, serializeFilters } from '../lib/url/filters.js';
import { ItemImage } from '../components/ItemImage.jsx';
import { ItemTag } from '../components/ItemTag.jsx';
import { ProductGrid } from '../components/ProductCard.jsx';
import { ErrorState, Loading } from '../components/States.jsx';
import { NotFoundPage } from './NotFoundPage.jsx';
import { formatDate, formatPrice } from '../lib/format.js';
import { AVAILABILITY_NOTE, SHOP, telHref } from '../config/shop.js';
import { PhoneIcon } from '../components/SiteLayout.jsx';

function Gallery({ item }) {
  const [index, setIndex] = useState(0);
  const photos = item.photos ?? [];
  const current = photos[index] ?? photos[0];
  return (
    <div className="space-y-3 md:sticky md:top-24 md:self-start">
      <div className="aspect-[4/3] overflow-hidden rounded-[1.5rem] border border-line bg-card shadow-[var(--shadow-card)]">
        <ItemImage key={current?.id} category={item.category} photo={current} alt={photos.length ? `${item.title}, photo ${index + 1} of ${photos.length}` : ''} variant="full" eager />
      </div>
      {photos.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Photos">
          {photos.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-pressed={i === index}
                aria-label={`Show photo ${i + 1}`}
                className={`block h-16 w-20 overflow-hidden rounded-xl border-2 transition ${i === index ? 'border-gold-ink' : 'border-transparent opacity-80 hover:opacity-100'}`}
              >
                <ItemImage photo={p} category={item.category} alt="" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Availability({ item }) {
  const tel = telHref();
  if (item.status === 'sold') {
    return (
      <div className="rounded-2xl border border-sold/30 bg-card p-5 shadow-[var(--shadow-card)]">
        <p className="inline-flex items-center gap-2 rounded-full bg-sold/10 px-3 py-1 text-sm font-semibold text-sold">Sold</p>
        <p className="mt-1 text-sm text-ink-soft">This item has been sold and is no longer available.</p>
        <Link to={`/inventory?${serializeFilters({ ...DEFAULT_FILTERS, category: item.category })}`} className="link mt-3 inline-block text-sm">
          See available {item.category}
        </Link>
      </div>
    );
  }
  return (
    <div className="surface space-y-4 p-5">
      <p className="text-sm">
        <span className="mr-1 inline-flex items-center gap-1.5 rounded-full bg-ok-wash px-2.5 py-0.5 font-semibold text-ok">
          <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden="true" />
          Listed as available.
        </span>{' '}
        {AVAILABILITY_NOTE}
      </p>
      {tel ? (
        <a href={tel} className="btn btn-gold w-full py-3.5 text-base tabular">
          <PhoneIcon className="h-5 w-5" />
          Call {SHOP.phone}
        </a>
      ) : (
        <p className="text-sm text-muted">Store phone number not set.</p>
      )}
      <p className="text-sm text-ink-soft">
        Mention item number <ItemTag id={item.item_id} className="text-sm" /> when you call.
      </p>
    </div>
  );
}

export function ItemPage() {
  const { itemId } = useParams();
  const backend = useBackend();
  const heading = useRef(null);
  const { loading, data: item, error, reload } = useAsync(() => backend.getPublicItem(itemId), [backend, itemId]);
  const related = useAsync(
    () => (item?.status === 'available' ? backend.searchPublicItems({ ...DEFAULT_FILTERS, category: item.category }, { pageSize: 4, exclude: item.item_id }) : Promise.resolve(null)),
    [backend, item?.item_id],
  );

  useEffect(() => {
    if (item) {
      document.title = `${item.title} (${item.item_id})`;
      heading.current?.focus();
    }
  }, [item]);

  if (loading) return <Loading />;
  if (error) return <ErrorState title="This item could not be loaded." error={error} onRetry={reload} />;
  if (!item) return <NotFoundPage title="Item not found" message="This item isn't listed. It may have been removed from the catalog or the link may be mistyped." />;

  const specs = [
    ['Condition', item.condition],
    ['Brand', item.brand],
    ['Model', item.model],
    ['Included', item.accessories],
    ['Category', item.category],
    ['Listed', formatDate(item.date_added)],
  ].filter(([, v]) => v);

  return (
    <article className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link to="/inventory" className="link inline-flex items-center gap-1.5 no-underline hover:underline"><span aria-hidden="true">←</span> Back to inventory</Link>
      </nav>
      <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
        <Gallery key={item.item_id} item={item} />
        <div className="space-y-5">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <ItemTag id={item.item_id} className="text-base" />
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{item.category}</span>
            </div>
            <h1 ref={heading} tabIndex={-1} className="text-3xl outline-none sm:text-4xl">{item.title}</h1>
            <p className={`font-serif text-4xl font-semibold tabular ${item.status === 'sold' ? 'text-muted line-through' : ''}`}>{formatPrice(item.price)}</p>
          </div>
          <Availability item={item} />
          {item.description && <p className="whitespace-pre-line text-lg leading-relaxed text-ink-soft">{item.description}</p>}
          <dl className="surface divide-y divide-line overflow-hidden text-sm">
            {specs.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-4 px-5 py-3">
                <dt className="font-semibold text-muted">{k}</dt>
                <dd className="text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      {related.data?.items.length > 0 && (
        <section aria-labelledby="related-title" className="space-y-5 border-t border-line pt-10">
          <h2 id="related-title" className="text-2xl sm:text-3xl">More {item.category}</h2>
          <ProductGrid items={related.data.items} />
        </section>
      )}
    </article>
  );
}
