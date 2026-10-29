import { SHOP, AVAILABILITY_NOTE, shopName, telHref } from '../config/shop.js';
import { PhoneIcon } from '../components/SiteLayout.jsx';
import { usePageTitle } from '../lib/usePageTitle.js';

const card = 'surface space-y-3 p-6';

export function VisitPage() {
  usePageTitle('Hours and location');
  const tel = telHref();
  return (
    <div className="space-y-8">
      <div className="max-w-2xl space-y-2">
        <p className="eyebrow">Come see us</p>
        <h1 className="text-4xl sm:text-5xl">Visit {shopName()}</h1>
        <p className="text-lg text-ink-soft">{AVAILABILITY_NOTE}</p>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <section aria-labelledby="addr" className={card}>
          <h2 id="addr" className="text-xl">Address</h2>
          {SHOP.address ? <p className="text-ink-soft">{SHOP.address}</p> : <p className="text-muted">Address not set.</p>}
          {SHOP.mapsUrl && <a href={SHOP.mapsUrl} target="_blank" rel="noreferrer" className="link">Open in Maps (new tab)</a>}
        </section>
        <section aria-labelledby="hours" className={card}>
          <h2 id="hours" className="text-xl">Hours</h2>
          {SHOP.hours.length ? (
            <dl className="divide-y divide-line">
              {SHOP.hours.map((h) => (
                <div key={h.days} className="flex justify-between gap-4 py-2 text-sm"><dt className="text-ink-soft">{h.days}</dt><dd className="font-semibold tabular">{h.time}</dd></div>
              ))}
            </dl>
          ) : <p className="text-muted">Hours not set.</p>}
        </section>
        <section aria-labelledby="phone" className={card}>
          <h2 id="phone" className="text-xl">Phone</h2>
          <p className="text-sm text-ink-soft">Have an item number? Call and we will check the shelf for you.</p>
          {tel ? <a href={tel} className="btn btn-gold tabular"><PhoneIcon />Call {SHOP.phone}</a> : <p className="text-muted">Phone number not set.</p>}
        </section>
      </div>
    </div>
  );
}
