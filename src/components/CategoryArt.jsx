// Category artwork used wherever an item has no photo yet. Line icons (Lucide, ISC license)
// on a deep tinted tile, so a catalog without photos still reads as intentional.

const ICONS = {
  tools: (
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  ),
  jewelry: (
    <>
      <path d="M6 3h12l4 6-10 13L2 9Z" />
      <path d="M11 3 8 9l4 13 4-13-3-6" />
      <path d="M2 9h20" />
    </>
  ),
  electronics: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </>
  ),
  camera: (
    <>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </>
  ),
  watch: (
    <>
      <circle cx="12" cy="12" r="6" />
      <path d="M12 10v2l1 1" />
      <path d="m16.13 7.66-.81-4.05a2 2 0 0 0-2-1.61h-2.68a2 2 0 0 0-1.95 1.61l-.81 4.05" />
      <path d="m7.88 16.36.8 4a2 2 0 0 0 1.96 1.64h2.72a2 2 0 0 0 1.96-1.6l.81-4.05" />
    </>
  ),
  games: (
    <>
      <path d="M6 11h4M8 9v4M15 12h.01M18 10h.01" />
      <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258A4 4 0 0 0 17.32 5z" />
    </>
  ),
  sport: (
    <>
      <circle cx="18.5" cy="17.5" r="3.5" />
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="15" cy="5" r="1" />
      <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
    </>
  ),
  coins: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
      <path d="M7 6h1v4" />
      <path d="m16.71 13.88.7.71-2.82 2.82" />
    </>
  ),
  tag: (
    <>
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </>
  ),
};

/* [tint-from, tint-to, light ink] per category. Deep hues so the paper tag and the lime item
   number both sit on top with room to spare. */
const THEMES = {
  tools: ['#2f2712', '#15120a', '#eac86a'],
  jewelry: ['#331a21', '#170c0f', '#f3a8bb'],
  electronics: ['#162536', '#0b131b', '#8ec4f2'],
  music: ['#152b1d', '#0a170f', '#8ee6ab'],
  camera: ['#271d38', '#120d1c', '#c6abf3'],
  watch: ['#2e2518', '#17120b', '#dec79c'],
  games: ['#122d32', '#091719', '#7fe1ee'],
  sport: ['#282f13', '#14180a', '#d3e67c'],
  coins: ['#322a10', '#171408', '#f3d46b'],
  tag: ['#22251f', '#111310', '#b9bfb6'],
};

const MATCHERS = [
  [/tool|hardware|garden|lawn|auto/i, 'tools'],
  [/jewel|ring|gold|silver|diamond/i, 'jewelry'],
  [/watch/i, 'watch'],
  [/camera|photo|lens/i, 'camera'],
  [/game|console/i, 'games'],
  [/music|instrument|guitar|audio/i, 'music'],
  [/electr|computer|phone|tv|tablet|laptop/i, 'electronics'],
  [/sport|outdoor|bike|golf|fitness|hunt|fish/i, 'sport'],
  [/coin|collect|bullion|antique/i, 'coins'],
];

export const artKey = (category = '') => MATCHERS.find(([re]) => re.test(category))?.[1] ?? 'tag';
export const artInk = (category) => THEMES[artKey(category)][2];

export function CategoryIcon({ category, className = '', strokeWidth = 1.5 }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {ICONS[artKey(category)]}
    </svg>
  );
}

/** Full-bleed tile: deep tinted gradient, soft halo, centered icon. */
export function CategoryArt({ category, label, size = 'md', className = '' }) {
  const [from, to, ink] = THEMES[artKey(category)];
  const icon = size === 'lg' ? 'h-24 w-24 sm:h-28 sm:w-28' : 'h-12 w-12 sm:h-14 sm:w-14';
  const halo = size === 'lg' ? 'h-52 w-52 sm:h-60 sm:w-60' : 'h-24 w-24 sm:h-28 sm:w-28';
  return (
    <div
      className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden ${className}`}
      style={{ background: `linear-gradient(145deg, ${from}, ${to})`, color: ink }}
      role="img"
      aria-label={label}
    >
      <CategoryIcon category={category} className="pointer-events-none absolute -bottom-6 -right-6 h-40 w-40 opacity-[0.08]" strokeWidth={1} />
      <span className={`absolute rounded-full bg-white/[0.04] ${halo}`} aria-hidden="true" />
      <CategoryIcon category={category} className={`relative ${icon}`} strokeWidth={size === 'lg' ? 1.1 : 1.35} />
      {size === 'lg' && <span className="relative mt-4 font-mono text-xs uppercase tracking-wider opacity-80">Photo coming soon</span>}
    </div>
  );
}

const hash = (s = '') => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Brand line and detail line for the tag, from the item's own fields. */
function tagText(item) {
  const brand = item.brand?.trim();
  if (brand) {
    const rest = item.title.replace(new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'i'), '');
    return [brand, item.model?.trim() || rest];
  }
  // No brand: lead with the first few words (up to a comma), the rest goes on the detail line.
  const words = item.title.split(/\s+/);
  let n = 0;
  while (n < words.length && n < 3 && (n === 0 || `${words.slice(0, n + 1).join(' ')}`.length <= 16)) {
    n += 1;
    if (/[,(]$/.test(words[n - 1])) break;
  }
  return [words.slice(0, n).join(' ').replace(/[,(]$/, ''), words.slice(n).join(' ')];
}

const TAG_PAPER = '#f6f4ec';
const TAG_INK = '#121412';
const TAG_SOFT = '#4a504c';

/**
 * Artwork for an item with no photo yet: a paper shelf tag lettered with the item's brand and
 * model, hung on the category's deep tint. Unique per item, so a grid never repeats one picture.
 */
export function ItemArt({ item, label, brandName, size = 'md', className = '' }) {
  const [from, to, ink] = THEMES[artKey(item.category)];
  const [headline, detail] = tagText(item);
  const tilt = ((hash(item.item_id) % 9) - 4) * 0.9;
  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden [container-type:inline-size] ${className}`}
      style={{ background: `radial-gradient(120% 90% at 30% 10%, ${from}, ${to})`, color: ink }}
      role="img"
      aria-label={label}
    >
      <CategoryIcon category={item.category} className="pointer-events-none absolute -bottom-[8%] -right-[6%] h-[62%] w-auto opacity-[0.1]" strokeWidth={1} />
      <svg aria-hidden="true" className="absolute left-0 top-0 h-full w-full" viewBox="0 0 100 75" preserveAspectRatio="none">
        <path d="M 36 -2 C 31 12, 23 26, 19.4 37.5" fill="none" stroke={ink} strokeOpacity="0.5" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 1.25 }} />
      </svg>
      <div className="relative w-[70%]" style={{ transform: `rotate(${tilt}deg)`, transformOrigin: '6% 50%', filter: 'drop-shadow(0 10px 18px rgb(0 0 0 / 0.5)) drop-shadow(0 1px 1px rgb(0 0 0 / 0.4))' }}>
        <div
          className="relative flex flex-col justify-center py-[6cqw] pl-[11cqw] pr-[5cqw]"
          style={{ background: TAG_PAPER, clipPath: 'polygon(9cqw 0, 100% 0, 100% 100%, 9cqw 100%, 0 50%)', borderRadius: '0 1.6cqw 1.6cqw 0' }}
        >
          <span className="absolute left-[3.6cqw] top-1/2 h-[3cqw] w-[3cqw] -translate-y-1/2 rounded-full" style={{ background: to, boxShadow: `inset 0 0 0 0.45cqw ${TAG_SOFT}66` }} />
          <span className="absolute inset-y-[3cqw] left-[8.4cqw] border-l border-dashed" style={{ borderColor: `${TAG_SOFT}55` }} />
          <span className="flex items-center gap-[1.5cqw] font-mono font-semibold uppercase" style={{ fontSize: '2.5cqw', letterSpacing: '0.18em', color: TAG_SOFT }}>
            <CategoryIcon category={item.category} className="h-[3.6cqw] w-[3.6cqw]" strokeWidth={2} />
            {brandName || item.category}
          </span>
          <span className="mt-[1.5cqw] line-clamp-2 font-display font-bold leading-[1.0]" style={{ fontSize: headline.length > 13 ? '7.2cqw' : '9cqw', letterSpacing: '-0.03em', color: TAG_INK }}>
            {headline}
          </span>
          {detail && (
            <span className="mt-[1.6cqw] line-clamp-2 font-sans font-medium leading-snug" style={{ fontSize: '3.5cqw', color: TAG_SOFT }}>
              {detail}
            </span>
          )}
        </div>
      </div>
      {size === 'lg' && <span className="absolute bottom-[4%] left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/50 px-3 py-1 font-mono text-[0.68rem] uppercase tracking-wider text-fg-soft backdrop-blur">Photo coming soon</span>}
    </div>
  );
}
