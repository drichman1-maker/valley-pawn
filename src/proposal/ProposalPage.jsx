// Web version of the client proposal (presentation/deck.html → Valley-Pawn-Proposal.pdf).
// Same words and screenshots as the PDF, laid out as one scrolling page that works on a phone.
// Not linked from the storefront and kept out of search (meta tag here, X-Robots-Tag in vercel.json).
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LogoMark, ArrowIcon } from '../components/SiteLayout.jsx';
import { ScrollToTop } from '../components/ScrollToTop.jsx';
import { usePageTitle } from '../lib/usePageTitle.js';
import dHome from './img/d-home.webp';
import dHomeFeatured from './img/d-home-featured.webp';
import dInventory from './img/d-inventory-tools.webp';
import dItem from './img/d-item.webp';
import dSell from './img/d-sell.webp';
import dImport from './img/d-owner-import-full.webp';
import dItems from './img/d-owner-items.webp';
import dHistory from './img/d-owner-history.webp';
import mHome from './img/m-home.webp';
import mInventory from './img/m-inventory.webp';
import mItem from './img/m-item.webp';

const PDF_URL = '/valley-pawn-proposal.pdf';
const AUTHOR = 'Douglas Richman';
const EMAIL = 'douglasrichman1@gmail.com';

/* ---------- Icons (Lucide, ISC) ---------- */
const Svg = ({ children, className = 'h-6 w-6' }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {children}
  </svg>
);
const I = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  layout: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></>,
  phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />,
  filter: <path d="M3 6h18M7 12h10M10 18h4" />,
  link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  tag: <><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /><circle cx="7.5" cy="7.5" r="1" fill="currentColor" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  eyeOff: <><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><path d="m2 2 20 20" /></>,
  camera: <><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></>,
  history: <><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></>,
  download: <path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />,
  mail: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></>,
};

/* ---------- Building blocks ---------- */
function Browser({ src, url, alt, className = '', crop, eager = false }) {
  return (
    <figure className={`overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9),0_24px_70px_-40px_rgb(201_245_74/0.25)] ${className}`}>
      <div className="flex h-8 items-center gap-1.5 border-b border-line bg-surface-2 px-3 sm:h-9 sm:gap-2 sm:px-4" aria-hidden="true">
        <i className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <i className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <i className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="ml-2 truncate rounded-full bg-bg px-3 py-0.5 font-mono text-[0.75rem] text-muted sm:ml-3">{url}</span>
      </div>
      <div className={crop ? `overflow-hidden ${crop}` : ''}>
        <img src={src} alt={alt} width="1600" height={crop ? undefined : 1000} loading={eager ? 'eager' : 'lazy'} decoding="async" className={`block w-full ${crop ? 'h-full object-cover object-bottom' : 'h-auto'}`} />
      </div>
    </figure>
  );
}

function Phone({ src, alt, className = '', eager = false }) {
  return (
    <figure className={`rounded-[2.4rem] bg-black p-2 shadow-[0_40px_80px_-24px_rgb(0_0_0/0.95)] ring-1 ring-[#2a2f2d] sm:p-2.5 ${className}`}>
      <div className="overflow-hidden rounded-[1.9rem]">
        <img src={src} alt={alt} width="780" height="1688" loading={eager ? 'eager' : 'lazy'} decoding="async" className="block h-auto w-full" />
      </div>
    </figure>
  );
}

function Section({ id, eyebrow, title, children, className = '' }) {
  return (
    <section aria-labelledby={id} className={`mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-24 ${className}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="mt-3 max-w-4xl text-4xl sm:text-6xl">{title}</h2>
      {children}
    </section>
  );
}

function Bullets({ items, className = '' }) {
  return (
    <ul className={`grid gap-7 ${className}`}>
      {items.map((b) => (
        <li key={b.title} className="grid grid-cols-[2.75rem_1fr] gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-wash text-accent ring-1 ring-accent/20">
            <Svg className="h-5 w-5">{I[b.icon]}</Svg>
          </span>
          <div>
            <h3 className="font-sans text-lg font-semibold tracking-tight sm:text-xl">{b.title}</h3>
            <p className="mt-1 text-fg-soft">{b.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

const Tag = ({ children }) => <span className="item-tag align-middle text-base">{children}</span>;

const StepNum = ({ n, hot }) => (
  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-mono text-lg font-semibold ${hot ? 'bg-accent text-accent-ink shadow-[0_0_0_6px_rgb(201_245_74/0.15)]' : 'bg-surface-2 text-accent ring-1 ring-line-strong'}`} aria-hidden="true">
    {n}
  </span>
);

/* ---------- Page ---------- */
export default function ProposalPage() {
  usePageTitle('Online inventory proposal');
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  return (
    <div className="min-h-screen overflow-x-clip bg-bg text-fg">
      <ScrollToTop />
      <a href="#proposal-main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-ink">
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <LogoMark className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
            <div className="min-w-0">
              <p className="truncate font-display text-[1.2rem] font-bold leading-none tracking-tight sm:text-[1.35rem]">Valley Pawn</p>
              <p className="mt-1 truncate font-mono text-[0.75rem] uppercase tracking-[0.2em] text-accent"><span className="hidden min-[440px]:inline">Online inventory </span>Proposal</p>
            </div>
          </div>
          <a href={PDF_URL} download className="btn btn-outline shrink-0 px-3.5 py-2 text-sm">
            <Svg className="h-4 w-4">{I.download}</Svg>
            <span className="max-[359px]:sr-only">PDF</span>
          </a>
        </div>
      </header>

      <main id="proposal-main">
        {/* 1 · Cover */}
        <section aria-labelledby="cover-title" className="glow relative overflow-hidden border-b border-line">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:grid-cols-[1fr_1.05fr]">
            <div className="min-w-0">
              <p className="eyebrow">Proposal · October 2026</p>
              <h1 id="cover-title" className="mt-4 text-[3.2rem] leading-[0.95] sm:text-7xl lg:text-[5.4rem]">
                Your shelves, online. <span className="text-accent">Always current.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-fg-soft sm:text-xl">
                A searchable storefront for your customers, and an owner portal that updates straight from the spreadsheet you already keep.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/" className="btn btn-accent">See the live preview <ArrowIcon /></Link>
                <a href={PDF_URL} download className="btn btn-outline"><Svg className="h-4 w-4">{I.download}</Svg>Download PDF</a>
              </div>
              <p className="mt-8 font-mono text-[0.75rem] uppercase tracking-[0.18em] text-muted">Prepared by <span className="text-fg-soft">{AUTHOR}</span></p>
            </div>
            <div className="relative min-w-0 pb-10 sm:pb-16">
              <Browser src={dHome} url="yourshop.com" alt="The storefront home page: Great finds, fair prices, with a search bar and featured items" eager className="lg:translate-x-6" />
              <Phone src={mItem} alt="An item page on a phone, with the price and a Call button" eager className="absolute -bottom-2 left-3 w-[28%] min-w-[96px] -rotate-3 sm:left-6 lg:-left-10" />
            </div>
          </div>
        </section>

        {/* 2 · Opportunity */}
        <Section id="opportunity" eyebrow="The opportunity" title="Customers shop online before they ever walk in the door.">
          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              ['They search first', 'People look up “drill near me” or “used guitar” on their phone. If your stock isn’t online, they find someone else’s.'],
              ['“Do you have…?” calls', 'Staff spend time on the phone describing what’s in the case. A link answers that question before they dial.'],
              ['Stock changes daily', 'Pawn and resale inventory turns over fast. A website is only useful if keeping it current takes minutes, not hours.'],
            ].map(([t, b], i) => (
              <li key={t} className="surface p-6 sm:p-8">
                <StepNum n={i + 1} />
                <h3 className="mt-6 text-2xl">{t}</h3>
                <p className="mt-3 text-fg-soft">{b}</p>
              </li>
            ))}
          </ol>
        </Section>

        {/* 3 · Solution */}
        <Section id="solution" eyebrow="The solution" title="One website, two sides." className="border-t border-line">
          <div className="mt-12 grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <Bullets items={[
              { icon: 'search', title: 'A storefront for customers', body: 'Browse, search and filter everything that’s for sale, with prices, condition and item numbers.' },
              { icon: 'layout', title: 'An owner portal for you', body: 'Upload your inventory spreadsheet, preview the changes, publish. Add photos from your phone.' },
              { icon: 'phone', title: 'Built to bring people in', body: 'Every page leads to one action: call the shop with the item number, then come pick it up.' },
            ]} />
            <Browser src={dHomeFeatured} url="yourshop.com" alt="Shop by category tiles and featured items with shelf-tag artwork" />
          </div>
        </Section>

        {/* 4 · Find anything */}
        <Section id="find" eyebrow="For your customers" title="Find anything in seconds." className="border-t border-line">
          <div className="mt-12 grid items-start gap-12 lg:grid-cols-[1.25fr_0.75fr]">
            <Browser src={dInventory} url="yourshop.com/inventory?category=Tools" alt="The inventory page filtered to Tools, with category chips, filters and four items" />
            <Bullets items={[
              { icon: 'search', title: 'Search everything', body: 'By item, brand, model, or the number on the shelf tag.' },
              { icon: 'filter', title: 'Filter and sort', body: 'Category, condition and price range. Newest first or by price.' },
              { icon: 'link', title: 'Shareable links', body: 'Every search and every item has its own link to text or post on Facebook.' },
              { icon: 'clock', title: 'Always current', body: 'The site shows when inventory was last updated, so customers trust it.' },
            ]} />
          </div>
        </Section>

        {/* 5 · Item page */}
        <Section id="item" eyebrow="For your customers" title="Every item gets its own page." className="border-t border-line">
          <div className="mt-12 grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <ul className="grid gap-7">
              <li className="grid grid-cols-[2.75rem_1fr] gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-wash text-accent ring-1 ring-accent/20"><Svg className="h-5 w-5">{I.tag}</Svg></span>
                <div>
                  <h3 className="font-sans text-lg font-semibold tracking-tight sm:text-xl">Matches your shelf tag</h3>
                  <p className="mt-1 text-fg-soft">The item number <Tag>VP-24098</Tag> is the one on the tag, so the call is quick.</p>
                </div>
              </li>
              <li className="grid grid-cols-[2.75rem_1fr] gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-wash text-accent ring-1 ring-accent/20"><Svg className="h-5 w-5">{I.phone}</Svg></span>
                <div>
                  <h3 className="font-sans text-lg font-semibold tracking-tight sm:text-xl">One tap to call</h3>
                  <p className="mt-1 text-fg-soft">A big Call button on every item, always in reach.</p>
                </div>
              </li>
              <li className="grid grid-cols-[2.75rem_1fr] gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-wash text-accent ring-1 ring-accent/20"><Svg className="h-5 w-5">{I.check}</Svg></span>
                <div>
                  <h3 className="font-sans text-lg font-semibold tracking-tight sm:text-xl">Sold means sold</h3>
                  <p className="mt-1 text-fg-soft">Old links show “Sold” with similar items, never a dead page.</p>
                </div>
              </li>
            </ul>
            <Browser src={dItem} url="yourshop.com/item/VP-24098" alt="An item page for a Fender Stratocaster, with the price, availability and a Call button" />
          </div>
        </Section>

        {/* 6 · Mobile */}
        <section aria-labelledby="mobile" className="glow border-y border-line">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="eyebrow">For your customers</p>
              <h2 id="mobile" className="mt-3 text-4xl sm:text-6xl">Made for the phone in their pocket.</h2>
              <p className="mt-6 max-w-xl text-lg text-fg-soft">
                Most shoppers will find you on a phone. Every screen is designed for it first: big tap targets, a Call button always in reach, and pages that load fast on a cell signal.
              </p>
            </div>
            <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0" aria-label="Phone screenshots">
              <li className="w-[62%] shrink-0 snap-center sm:mt-12 sm:w-auto"><Phone src={mHome} alt="Home page on a phone" /></li>
              <li className="w-[62%] shrink-0 snap-center sm:w-auto"><Phone src={mInventory} alt="Inventory grid on a phone" /></li>
              <li className="w-[62%] shrink-0 snap-center sm:mt-12 sm:w-auto"><Phone src={mItem} alt="Item page on a phone" /></li>
            </ul>
          </div>
        </section>

        {/* 7 · Sell & pawn */}
        <Section id="sellers" eyebrow="For your business" title="Bring in sellers, not just buyers.">
          <div className="mt-12 grid items-center gap-12 lg:grid-cols-[1.2fr_0.8fr]">
            <Browser src={dSell} url="yourshop.com/sell" alt="The Sell and Pawn page: Turn what you own into cash, with what to bring" />
            <div>
              <p className="text-lg text-fg-soft">
                Buying and lending is half of a pawn shop’s business. A dedicated page explains selling and pawning in plain language and sends people to the counter with the right things in hand.
              </p>
              <Bullets className="mt-8" items={[
                { icon: 'check', title: 'Sell or pawn, side by side', body: 'Clear choice between selling outright and a short-term loan.' },
                { icon: 'layout', title: 'Your list, your wording', body: 'Shows only what you buy and lend on, and only once you turn it on.' },
              ]} />
            </div>
          </div>
        </Section>

        {/* 8 · Spreadsheet */}
        <Section id="spreadsheet" eyebrow="For you" title="Update it from the spreadsheet you already keep." className="border-t border-line">
          <div className="mt-12 grid items-start gap-12 lg:grid-cols-[0.75fr_1.25fr]">
            <ol className="grid gap-7">
              {[
                ['1', 'Upload Excel or CSV', 'Your existing file. Columns are matched automatically.'],
                ['2', 'Check the preview', 'See exactly what’s new, what changed and any rows with problems.'],
                ['3', 'Publish', 'All changes go live together. Nothing changes until you click.'],
                ['↺', 'Undo anytime', 'Every publish saves a restore point you can roll back to.'],
              ].map(([n, t, b]) => (
                <li key={t} className="flex gap-4">
                  <StepNum n={n} hot={n === '↺'} />
                  <div>
                    <h3 className="text-2xl">{t}</h3>
                    <p className="mt-1 text-fg-soft">{b}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Browser src={dImport} url="yourshop.com/owner/import" alt="The import preview: two new items, two changed items, and a Publish 4 changes button" crop="aspect-[16/11]" />
          </div>
        </Section>

        {/* 9 · Control */}
        <Section id="control" eyebrow="For you" title="You stay in control." className="border-t border-line">
          <div className="mt-12 grid items-center gap-12 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="relative pb-[18%]">
              <Browser src={dItems} url="yourshop.com/owner/items" alt="The owner's items list, with a status menu for each item" className="w-[88%]" />
              <Browser src={dHistory} url="yourshop.com/owner/history" alt="History and restore, with a restore point saved before an import" className="absolute bottom-0 right-0 w-[78%]" />
            </div>
            <Bullets items={[
              { icon: 'eyeOff', title: 'Drafts stay private', body: 'Hold items back until they’re priced and photographed.' },
              { icon: 'camera', title: 'Photos from your phone', body: 'Snap, upload, reorder. Images are resized automatically.' },
              { icon: 'check', title: 'Mark sold in one click', body: 'Change any item’s status right from the list.' },
              { icon: 'history', title: 'Full history', body: 'See every import and restore an earlier version.' },
            ]} />
          </div>
        </Section>

        {/* 10 · Under the hood */}
        <Section id="trust" eyebrow="Under the hood" title="Built to be trusted with your business." className="border-t border-line">
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Secure by design', 'Only approved owner accounts can change anything. Hidden items are blocked by the database itself, not just the page.'],
              ['All-or-nothing updates', 'An import either publishes completely or not at all. No half-updated catalog if something goes wrong.'],
              ['Nothing gets lost', 'Items are archived, never deleted. Every publish saves a restore point.'],
              ['Fast everywhere', 'Hosted on Vercel’s global network with a Supabase database. Nothing to install or maintain in the shop.'],
              ['Tested', 'More than 70 automated tests cover spreadsheet reading, publishing, restores, owner access and the storefront.'],
              ['Accessible', 'Works with keyboards and screen readers, with readable type and strong contrast.'],
            ].map(([t, b]) => (
              <li key={t} className="surface p-6 sm:p-8">
                <h3 className="text-2xl">{t}</h3>
                <p className="mt-3 text-fg-soft">{b}</p>
              </li>
            ))}
          </ul>
        </Section>

        {/* 11 · Launch plan */}
        <Section id="launch" eyebrow="Getting started" title="From preview to live in four steps." className="border-t border-line">
          <ol className="relative mt-12 grid gap-8 md:grid-cols-4 md:gap-6">
            <span aria-hidden="true" className="absolute left-6 top-6 h-[calc(100%-3rem)] w-0.5 bg-gradient-to-b from-line-strong to-accent md:left-6 md:right-6 md:h-0.5 md:w-auto md:bg-gradient-to-r" />
            {[
              ['Your details', 'Shop name, logo, address, hours, phone, what you buy and lend on, and the promises you make to customers.'],
              ['Set up accounts', 'Database, owner logins for you and any staff, and your web address.'],
              ['Load inventory', 'Import your current spreadsheet, add photos of featured items, review drafts.'],
              ['Go live', 'Launch, then share the link on Google, Facebook, receipts and the shop door.'],
            ].map(([t, b], i) => (
              <li key={t} className="relative flex gap-5 md:block">
                <StepNum n={i + 1} hot={i === 3} />
                <div>
                  <h3 className="text-2xl md:mt-6">{t}</h3>
                  <p className="mt-2 text-fg-soft">{b}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="block-accent mt-12 flex items-start gap-4 rounded-2xl p-6 sm:items-center sm:p-8">
            <Svg className="mt-0.5 h-7 w-7 shrink-0 sm:mt-0 sm:h-8 sm:w-8">{I.camera}</Svg>
            <p className="text-lg"><strong>What we need from you:</strong> your inventory spreadsheet as it is today, store hours and contact details, and a logo if you have one.</p>
          </div>
        </Section>

        {/* 12 · Next step */}
        <section aria-labelledby="next" className="glow relative overflow-hidden border-t border-line">
          <svg aria-hidden="true" viewBox="0 0 64 64" className="pointer-events-none absolute -bottom-16 -right-10 h-[26rem] w-[26rem] opacity-[0.1] sm:h-[36rem] sm:w-[36rem]">
            <path d="M32 12a7 7 0 0 0-4.6 12.3c-2.5 1.4-4.2 3.6-4.2 6.2h17.6c0-2.6-1.7-4.8-4.2-6.2A7 7 0 0 0 32 12Zm-6.5 21-2.3 12h17.6l-2.3-12Zm-5.5 14a3 3 0 0 0-3 3v2h30v-2a3 3 0 0 0-3-3Z" fill="var(--color-accent)" />
          </svg>
          <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
            <p className="eyebrow">Next step</p>
            <h2 id="next" className="mt-4 max-w-4xl text-5xl sm:text-7xl">See it working with <span className="text-accent">your inventory.</span></h2>
            <p className="mt-6 max-w-2xl text-lg text-fg-soft">
              The preview runs today with sample items. Send over your current spreadsheet and we’ll load it so you can click through your own shop.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a href={`mailto:${EMAIL}?subject=${encodeURIComponent('Valley Pawn online inventory')}`} className="btn btn-accent">
                <Svg className="h-4 w-4">{I.mail}</Svg>Email {AUTHOR}
              </a>
              <Link to="/" className="btn btn-outline">See the live preview <ArrowIcon /></Link>
              <a href={PDF_URL} download className="btn btn-outline"><Svg className="h-4 w-4">{I.download}</Svg>Download PDF</a>
            </div>
            <p className="mt-6 break-all font-mono text-sm text-muted">{EMAIL}</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <p className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-6 font-mono text-[0.75rem] uppercase tracking-wider text-muted sm:px-6">
          <span>Valley Pawn · Online inventory proposal</span>
          <span>Prepared by {AUTHOR} · October 2026</span>
        </p>
      </footer>
    </div>
  );
}

