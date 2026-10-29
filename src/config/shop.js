// STORE DETAILS — edit before launch.
// Anything left null is hidden on the site (no fake phone numbers or hours are shown).
// Trust claims ("licensed", "items tested", "phone holds") only appear when listed here
// with approved: true. Only add claims the owner has confirmed are accurate.

const OWNER_SHOP = {
  name: null, // e.g. 'Valley Resale & Pawn'
  tagline: null, // e.g. 'Buy · Sell · Pawn'
  cityState: null, // e.g. 'Springfield, IL'
  address: null, // e.g. '1420 S. 6th Street, Springfield, IL 62703'
  phone: null, // e.g. '(217) 555-0198'  — shown and dialable only when set
  hours: [], // e.g. [{ days: 'Monday–Friday', time: '9 AM – 6 PM' }, { days: 'Sunday', time: 'Closed' }]
  mapsUrl: null, // e.g. 'https://maps.google.com/?q=...'
  about: null, // one or two sentences written/approved by the owner
  claims: [
    // { text: 'Licensed pawnbroker (Illinois license #12345)', approved: false },
    // { text: 'Phone holds available for 24 hours', approved: false },
  ],
};

// SHOWCASE profile for the client preview build only (`npm run build:demo` with
// VITE_DEMO_SHOWCASE=true and no Supabase variables). Every detail is a labeled sample:
// the phone uses the reserved fictional 555-01xx range and the address is marked as a sample.
const SHOWCASE_SHOP = {
  name: 'Valley Pawn',
  tagline: 'Buy · Sell · Pawn',
  cityState: null,
  address: '123 Main Street (sample address)',
  phone: '(555) 010-0199',
  hours: [
    { days: 'Monday – Friday', time: '9 AM – 7 PM' },
    { days: 'Saturday', time: '9 AM – 5 PM' },
    { days: 'Sunday', time: 'Closed' },
  ],
  mapsUrl: null,
  about: 'Quality pre-owned tools, jewelry, electronics and instruments, inspected and fairly priced.',
  claims: [
    { text: 'Every item inspected before it is listed', approved: true },
    { text: 'Call ahead and we will set an item aside for you', approved: true },
    { text: 'Fair offers to buy, sell or pawn', approved: true },
  ],
};

const env = import.meta.env ?? {};
export const IS_SHOWCASE = env.VITE_DEMO_MODE === 'true' && env.VITE_DEMO_SHOWCASE === 'true' && !env.VITE_SUPABASE_URL;

export const SHOP = IS_SHOWCASE ? SHOWCASE_SHOP : OWNER_SHOP;

export const AVAILABILITY_NOTE = 'Please call to confirm availability before visiting.';

export const shopName = () => SHOP.name ?? 'Shop name not set';
export const approvedClaims = () => SHOP.claims.filter((c) => c.approved && c.text);
export const telHref = () => (SHOP.phone ? `tel:${SHOP.phone.replace(/[^\d+]/g, '')}` : null);
export const isShopConfigured = () => Boolean(SHOP.name && SHOP.phone && SHOP.address);
