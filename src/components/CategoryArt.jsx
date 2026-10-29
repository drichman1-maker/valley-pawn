// Category artwork used wherever an item has no photo yet. Line icons (Lucide, ISC license)
// on a tinted tile, so a catalog without photos still reads as intentional.

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

const THEMES = {
  tools: ['#f5ecd9', '#e9d8b4', '#7a5418'],
  jewelry: ['#f7ebe6', '#eacfc4', '#8a4b3a'],
  electronics: ['#e9eef3', '#d0dae4', '#3b5268'],
  music: ['#e8f0ea', '#cfe0d3', '#2f6b45'],
  camera: ['#eeeaf3', '#d9d1e5', '#55457a'],
  watch: ['#f1ece4', '#e0d6c6', '#5b4a32'],
  games: ['#e6eff1', '#cde0e4', '#2c6470'],
  sport: ['#eff1e3', '#dde1c6', '#5c6627'],
  coins: ['#f4eddb', '#e6d8b8', '#7a5f18'],
  tag: ['#f1ede6', '#e2dbcf', '#5d645f'],
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

export function CategoryIcon({ category, className = '', strokeWidth = 1.5 }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {ICONS[artKey(category)]}
    </svg>
  );
}

/** Full-bleed tile: tinted gradient, soft halo, centered icon. */
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
      <CategoryIcon category={category} className="pointer-events-none absolute -bottom-6 -right-6 h-40 w-40 opacity-[0.07]" strokeWidth={1} />
      <span className={`absolute rounded-full bg-white/45 ${halo}`} aria-hidden="true" />
      <CategoryIcon category={category} className={`relative ${icon}`} strokeWidth={size === 'lg' ? 1.1 : 1.35} />
      {size === 'lg' && <span className="relative mt-4 text-sm font-medium opacity-80">Photo coming soon</span>}
    </div>
  );
}
