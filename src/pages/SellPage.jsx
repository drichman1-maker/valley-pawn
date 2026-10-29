import { Link } from 'react-router-dom';
import { SHOP, servicesEnabled, telHref } from '../config/shop.js';
import { ArrowIcon, PhoneIcon } from '../components/SiteLayout.jsx';
import { CategoryIcon } from '../components/CategoryArt.jsx';
import { NotFoundPage } from './NotFoundPage.jsx';
import { usePageTitle } from '../lib/usePageTitle.js';

const STEPS = [
  { title: 'Bring it in', body: 'Bring the item and a valid photo ID. Chargers, cases and paperwork help.' },
  { title: 'Free evaluation', body: 'We look it over, test it and check what it sells for. No obligation.' },
  { title: 'Get your offer', body: 'You decide: take the offer, or keep your item. No pressure either way.' },
];

const BRING = ['The item itself', 'A valid photo ID', 'Chargers, cases and accessories', 'Receipts or paperwork, if you have them'];

export function SellPage() {
  usePageTitle(servicesEnabled() ? 'Sell or pawn' : undefined);
  const tel = telHref();
  if (!servicesEnabled()) return <NotFoundPage />;
  const { buys, pawnLoans, loanNote } = SHOP.services;

  return (
    <div className="space-y-20">
      <section aria-labelledby="sell-title" className="glow grid items-center gap-10 overflow-hidden rounded-[2rem] border border-line px-5 py-14 sm:px-12 sm:py-20 lg:grid-cols-[1.4fr_1fr]">
        <div className="max-w-3xl space-y-6">
          <p className="eyebrow">Sell or pawn</p>
          <h1 id="sell-title" className="text-5xl sm:text-7xl">
            Turn what you own into <span className="text-accent">cash.</span>
          </h1>
          <p className="max-w-2xl text-lg text-fg-soft">
            {pawnLoans
              ? 'Sell it outright, or use it for a short-term loan and get it back when you repay. Either way, the evaluation is free.'
              : 'Bring it in for a free evaluation and a fair offer.'}
          </p>
          {tel && (
            <div className="flex flex-wrap gap-3 pt-2">
              <a href={tel} className="btn btn-accent tabular"><PhoneIcon />Call {SHOP.phone}</a>
              <Link to="/visit" className="btn btn-outline">Hours and location</Link>
            </div>
          )}
        </div>
        <div className="rounded-3xl border border-white/10 bg-surface p-6 shadow-[0_40px_80px_-24px_rgb(0_0_0/0.9)] sm:p-8 lg:rotate-[1.5deg]">
          <p className="eyebrow">What to bring</p>
          <ul className="mt-4 divide-y divide-line">
            {BRING.map((t, i) => (
              <li key={t} className="flex items-center gap-3 py-3 font-medium">
                <span className="font-mono text-xs text-accent tabular" aria-hidden="true">0{i + 1}</span>
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">The evaluation is free and there is no obligation to accept.</p>
        </div>
      </section>

      <section aria-label="Ways to get cash" className={`grid gap-4 ${pawnLoans ? 'md:grid-cols-2' : ''}`}>
        <div className="surface relative overflow-hidden p-7 sm:p-10">
          <p className="eyebrow">Option 1</p>
          <h2 className="mt-3 text-4xl">Sell it</h2>
          <p className="mt-4 text-fg-soft">We make you an offer and pay you on the spot. The item becomes ours and the deal is done.</p>
          <p className="mt-6 inline-block rounded-full bg-accent-wash px-3 py-1 font-mono text-[0.68rem] uppercase tracking-wider text-accent">Best when you no longer need it</p>
        </div>
        {pawnLoans && (
          <div className="surface relative overflow-hidden p-7 sm:p-10">
            <p className="eyebrow">Option 2</p>
            <h2 className="mt-3 text-4xl">Pawn it</h2>
            <p className="mt-4 text-fg-soft">Your item secures a short-term loan. Repay the loan and fees by the due date and you pick your item back up. No credit check.</p>
            <p className="mt-6 inline-block rounded-full bg-accent-wash px-3 py-1 font-mono text-[0.68rem] uppercase tracking-wider text-accent">Best when you want it back</p>
          </div>
        )}
      </section>

      <section aria-labelledby="how-sell" className="space-y-8">
        <div>
          <p className="eyebrow">How it works</p>
          <h2 id="how-sell" className="mt-2 text-4xl sm:text-5xl">Three steps, one visit</h2>
        </div>
        <ol className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-5 bg-surface p-6 sm:block sm:p-7">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-sm font-semibold text-accent-ink" aria-hidden="true">{i + 1}</span>
              <div>
                <h3 className="font-display text-xl font-semibold tracking-tight sm:mt-6">{s.title}</h3>
                <p className="mt-2 text-sm text-fg-soft">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {buys?.length > 0 && (
        <section aria-labelledby="we-buy" className="surface px-5 py-10 sm:px-10">
          <p className="eyebrow">What we take</p>
          <h2 id="we-buy" className="mt-2 text-4xl">We buy and lend on</h2>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {buys.map((b) => (
              <li key={b} className="flex items-center gap-3 rounded-2xl border border-line bg-bg p-3 text-sm font-medium transition hover:border-accent/60">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-wash text-accent">
                  <CategoryIcon category={b} className="h-5 w-5" strokeWidth={1.75} />
                </span>
                {b}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted">Not sure about something? Call and ask{loanNote ? `. ${loanNote}` : '.'}</p>
          {tel && <a href={tel} className="btn btn-accent mt-5 tabular"><PhoneIcon />Call {SHOP.phone} <ArrowIcon /></a>}
        </section>
      )}
    </div>
  );
}
