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
import { usePageTitle } from '../lib/usePageTitle.js';

function Gallery({ item }) {
  const [index, setIndex] = useState(0);
  const photos = item.photos ?? [];
  const current = photos[index] ?? photos[0];
  return (
    <div className="space-y-3 md:sticky md:top-24 md:self-start">
      <div className="aspect-[4/3] overflow-hidden rounded-[1.5rem] border border-line bg-surface shadow-[var(--shadow-card)]">
        <ItemImage key={current?.id} item={item} photo={current} alt={photos.length ? `${item.title}, photo ${index + 1} of ${photos.length}` : ''} variant="full" eager />
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
                className={`block h-16 w-20 overflow-hidden rounded-xl border-2 transition ${i === index ? 'border-accent' : 'border-transparent opacity-70 hover:opacity-100'}`}
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
      <div className="rounded-2xl border border-sold/40 bg-sold-wash p-5">
        <p className="inline-flex items-center gap-2 rounded-full bg-sold px-3 py-1 font-mono text-xs uppercase tracking-wider text-bg">Sold</p>
        <p className="mt-3 text-sm text-fg-soft">This item has been sold and is no longer available.</p>
        <Link to={`/inventory?${serializeFilters({ ...DEFAULT_FILTERS, category: item.category })}`} className="link mt-3 inline-block text-sm">
          See available {item.category}
        </Link>
      </div>
    );
  }
  return (
    <div className="surface space-y-4 p-5">
      <p className="text-sm text-fg-soft">
        <span className="mr-1.5 inline-flex items-center gap-1.5 rounded-full bg-ok-wash px-2.5 py-0.5 font-mono text-[0.68rem] uppercase tracking-wider text-ok">
          <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden="true" />
          Listed as available
        </span>
        {AVAILABILITY_NOTE}
      </p>
      {tel ? (
        <a id="item-call" href={tel} className="btn btn-accent w-full py-4 text-base tabular">
          <PhoneIcon className="h-5 w-5" />
          Call {SHOP.phone}
        </a>
      ) : (
        <p className="text-sm text-muted">Store phone number not set.</p>
      )}
      <p className="text-sm text-fg-soft">
        Mention item number <ItemTag id={item.item_id} className="text-sm" /> when you call.
      </p>
    </div>
  );
}

/** Native share sheet on phones; copies the link elsewhere. */
function ShareButton({ item }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, text: `${item.title}, ${formatPrice(item.price)}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Share sheet dismissed or clipboard blocked: nothing to do.
    }
  };
  return (
    <button type="button" onClick={share} className="btn btn-outline px-4 py-2 text-sm">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
      </svg>
      <span aria-live="polite">{copied ? 'Link copied' : 'Share'}</span>
    </button>
  );
}

/** Price and Call button pinned to the bottom of the screen on phones. */
function MobileCallBar({ item, watchId }) {
  const tel = telHref();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = document.getElementById(watchId);
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, [watchId]);
  if (!tel || item.status !== 'available') return null;
  return (
    <>
      <div className="h-20 md:hidden" aria-hidden="true" />
      <div
        className={`fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur-xl transition-transform duration-300 md:hidden ${show ? 'translate-y-0' : 'translate-y-full'}`}
        aria-hidden={!show}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-mono text-[0.65rem] uppercase tracking-wider text-muted">Item {item.item_id}</p>
            <p className="font-display text-2xl font-bold tabular tracking-tight">{formatPrice(item.price)}</p>
          </div>
          <a href={tel} tabIndex={show ? 0 : -1} className="btn btn-accent shrink-0">
            <PhoneIcon />
            Call to hold
          </a>
        </div>
      </div>
    </>
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

  usePageTitle(item ? `${item.title} (${item.item_id})` : undefined);
  useEffect(() => {
    if (item) heading.current?.focus();
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
    <article className="space-y-10">
      <div className="flex items-center justify-between gap-3">
        <nav aria-label="Breadcrumb" className="min-w-0 text-sm">
          <ol className="flex items-center gap-2 font-mono text-[0.72rem] uppercase tracking-wider text-muted">
            <li className="shrink-0"><Link to="/inventory" className="text-fg-soft hover:text-accent"><span aria-hidden="true">← </span>Inventory</Link></li>
            <li aria-hidden="true" className="text-line-strong">/</li>
            <li className="truncate">
              <Link to={`/inventory?${serializeFilters({ ...DEFAULT_FILTERS, category: item.category })}`} className="hover:text-accent">{item.category}</Link>
            </li>
          </ol>
        </nav>
        <ShareButton item={item} />
      </div>
      <div className="grid gap-8 md:grid-cols-2 lg:gap-14">
        <Gallery key={item.item_id} item={item} />
        <div className="space-y-6">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <ItemTag id={item.item_id} className="text-base" />
              <span className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted">{item.category}</span>
              {item.condition && <span className="rounded-md border border-line-strong px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-fg-soft">{item.condition}</span>}
            </div>
            <h1 ref={heading} tabIndex={-1} className="text-4xl outline-none sm:text-5xl">{item.title}</h1>
            <p className={`font-display text-5xl font-bold tabular tracking-tight sm:text-6xl ${item.status === 'sold' ? 'text-muted line-through decoration-sold decoration-4' : 'text-accent'}`}>{formatPrice(item.price)}</p>
          </div>
          <Availability item={item} />
          {item.description && <p className="whitespace-pre-line text-lg leading-relaxed text-fg-soft">{item.description}</p>}
          <dl className="surface divide-y divide-line overflow-hidden text-sm">
            {specs.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-4 px-5 py-3.5">
                <dt className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted">{k}</dt>
                <dd className="text-fg">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      {related.data?.items.length > 0 && (
        <section aria-labelledby="related-title" className="space-y-6 border-t border-line pt-12">
          <div>
            <p className="eyebrow">You might also like</p>
            <h2 id="related-title" className="mt-2 text-3xl sm:text-4xl">More {item.category}</h2>
          </div>
          <ProductGrid items={related.data.items} />
        </section>
      )}
      <MobileCallBar item={item} watchId="item-call" />
    </article>
  );
}
