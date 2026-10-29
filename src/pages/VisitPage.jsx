import { SHOP, AVAILABILITY_NOTE, shopName, telHref } from '../config/shop.js';
import { PhoneIcon } from '../components/SiteLayout.jsx';
import { usePageTitle } from '../lib/usePageTitle.js';

export function VisitPage() {
  usePageTitle('Hours and location');
  const tel = telHref();
  return (
    <div className="space-y-10">
      <div className="max-w-2xl space-y-3">
        <p className="eyebrow">Come see us</p>
        <h1 className="text-5xl sm:text-7xl">Visit {shopName()}</h1>
        <p className="text-lg text-fg-soft">{AVAILABILITY_NOTE}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <section aria-labelledby="addr" className="surface space-y-3 p-6 sm:p-7">
          <p className="eyebrow">Address</p>
          <h2 id="addr" className="text-2xl">Find us</h2>
          {SHOP.address ? <p className="text-fg-soft">{SHOP.address}</p> : <p className="text-muted">Address not set.</p>}
          {SHOP.mapsUrl && <a href={SHOP.mapsUrl} target="_blank" rel="noreferrer" className="link">Open in Maps (new tab)</a>}
        </section>
        <section aria-labelledby="hours" className="surface space-y-3 p-6 sm:p-7">
          <p className="eyebrow">Hours</p>
          <h2 id="hours" className="text-2xl">When we're open</h2>
          {SHOP.hours.length ? (
            <dl className="divide-y divide-line">
              {SHOP.hours.map((h) => (
                <div key={h.days} className="flex justify-between gap-4 py-2 text-sm"><dt className="text-fg-soft">{h.days}</dt><dd className="font-mono tabular">{h.time}</dd></div>
              ))}
            </dl>
          ) : <p className="text-muted">Hours not set.</p>}
        </section>
        <section aria-labelledby="phone" className="block-accent space-y-3 rounded-2xl p-6 sm:p-7">
          <p className="eyebrow text-accent-ink/70">Phone</p>
          <h2 id="phone" className="text-2xl text-accent-ink">Call ahead</h2>
          <p className="text-sm text-accent-ink/75">Have an item number? Call and we will check the shelf for you.</p>
          {tel ? <a href={tel} className="btn bg-accent-ink text-accent tabular hover:bg-black"><PhoneIcon />Call {SHOP.phone}</a> : <p className="text-accent-ink/70">Phone number not set.</p>}
        </section>
      </div>
    </div>
  );
}
