import { Link } from 'react-router-dom';
import { SHOP, servicesEnabled, telHref } from '../config/shop.js';
import { PhoneIcon } from '../components/SiteLayout.jsx';
import { CategoryIcon } from '../components/CategoryArt.jsx';
import { NotFoundPage } from './NotFoundPage.jsx';
import { usePageTitle } from '../lib/usePageTitle.js';

const STEPS = [
  { title: 'Bring it in', body: 'Bring the item and a valid photo ID. Chargers, cases and paperwork help.' },
  { title: 'Free evaluation', body: 'We look it over, test it and check what it sells for. No obligation.' },
  { title: 'Get your offer', body: 'You decide: take the offer, or keep your item. No pressure either way.' },
];

export function SellPage() {
  usePageTitle(servicesEnabled() ? 'Sell or pawn' : undefined);
  const tel = telHref();
  if (!servicesEnabled()) return <NotFoundPage />;
  const { buys, pawnLoans, loanNote } = SHOP.services;

  return (
    <div className="space-y-16">
      <section aria-labelledby="sell-title" className="texture-dark grid items-center gap-10 overflow-hidden rounded-[2rem] px-5 py-12 text-paper sm:px-12 sm:py-16 lg:grid-cols-[1.4fr_1fr]">
        <div className="max-w-3xl space-y-5">
          <p className="eyebrow text-gold-bright">Sell or pawn</p>
          <h1 id="sell-title" className="text-4xl text-paper sm:text-6xl">
            Turn what you own into cash<span className="text-gold-bright">.</span>
          </h1>
          <p className="max-w-2xl text-lg text-paper/75">
            {pawnLoans
              ? 'Sell it outright, or use it for a short-term loan and get it back when you repay. Either way, the evaluation is free.'
              : 'Bring it in for a free evaluation and a fair offer.'}
          </p>
          {tel && (
            <div className="flex flex-wrap gap-3 pt-2">
              <a href={tel} className="btn btn-gold tabular"><PhoneIcon />Call {SHOP.phone}</a>
              <Link to="/visit" className="btn btn-ghost-light">Hours and location</Link>
            </div>
          )}
        </div>
        <div className="rounded-3xl bg-paper p-6 text-ink shadow-[0_30px_60px_-24px_rgb(0_0_0/0.6)] sm:p-8 lg:rotate-[1.5deg]">
          <p className="eyebrow">What to bring</p>
          <ul className="mt-4 divide-y divide-line">
            {['The item itself', 'A valid photo ID', 'Chargers, cases and accessories', 'Receipts or paperwork, if you have them'].map((t) => (
              <li key={t} className="flex items-center gap-3 py-3 font-medium">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-ok" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">The evaluation is free and there is no obligation to accept.</p>
        </div>
      </section>

      <section aria-label="Ways to get cash" className={`grid gap-5 ${pawnLoans ? 'md:grid-cols-2' : ''}`}>
        <div className="surface p-7 sm:p-9">
          <p className="eyebrow">Option 1</p>
          <h2 className="mt-2 text-3xl">Sell it</h2>
          <p className="mt-3 text-ink-soft">We make you an offer and pay you on the spot. The item becomes ours and the deal is done.</p>
          <p className="mt-5 text-sm font-semibold">Best when you no longer need it.</p>
        </div>
        {pawnLoans && (
          <div className="surface p-7 sm:p-9">
            <p className="eyebrow">Option 2</p>
            <h2 className="mt-2 text-3xl">Pawn it</h2>
            <p className="mt-3 text-ink-soft">Your item secures a short-term loan. Repay the loan and fees by the due date and you pick your item back up. No credit check.</p>
            <p className="mt-5 text-sm font-semibold">Best when you want it back.</p>
          </div>
        )}
      </section>

      <section aria-labelledby="how-sell" className="space-y-8">
        <div>
          <p className="eyebrow">How it works</p>
          <h2 id="how-sell" className="mt-1 text-3xl">Three steps, one visit</h2>
        </div>
        <ol className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink font-serif text-lg font-semibold text-gold-bright" aria-hidden="true">{i + 1}</span>
              <div>
                <h3 className="font-sans text-base font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {buys?.length > 0 && (
        <section aria-labelledby="we-buy" className="rounded-[2rem] border border-line bg-paper-deep/60 px-5 py-10 sm:px-10">
          <p className="eyebrow">What we take</p>
          <h2 id="we-buy" className="mt-1 text-3xl">We buy and lend on</h2>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {buys.map((b) => (
              <li key={b} className="flex items-center gap-3 rounded-2xl bg-card p-3 text-sm font-semibold shadow-[var(--shadow-card)]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-wash text-gold-ink">
                  <CategoryIcon category={b} className="h-5 w-5" strokeWidth={1.75} />
                </span>
                {b}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted">Not sure about something? Call and ask{loanNote ? `. ${loanNote}` : '.'}</p>
        </section>
      )}
    </div>
  );
}
