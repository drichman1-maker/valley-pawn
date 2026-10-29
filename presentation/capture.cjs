// Retakes the proposal deck screenshots from the running demo server.
// Usage: node capture.cjs <base-url> <out-dir> <sample-import.csv>
const { chromium } = require('playwright');
const path = require('path');

const [, , BASE, OUT, CSV] = process.argv;
const out = (n) => path.join(OUT, n);

async function ready(page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
}

async function scrollTo(page, selector, offset) {
  await page.evaluate(([sel, off]) => {
    const el = document.querySelector(sel);
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - off, behavior: 'instant' });
  }, [selector, offset]);
  await page.waitForTimeout(500);
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });

  // Desktop: 1440x900 at 2x, matching the original captures (2880x1800).
  const desk = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  const d = await desk.newPage();

  await d.goto(`${BASE}/`);
  await ready(d);
  await d.screenshot({ path: out('d-home.png') });

  await scrollTo(d, 'nav[aria-label="Categories"]', 96);
  await d.screenshot({ path: out('d-home-featured.png') });

  await d.goto(`${BASE}/inventory?category=Tools`);
  await ready(d);
  await d.screenshot({ path: out('d-inventory-tools.png') });

  await d.goto(`${BASE}/item/VP-24098`);
  await ready(d);
  await d.screenshot({ path: out('d-item.png') });

  await d.goto(`${BASE}/sell`);
  await ready(d);
  await d.screenshot({ path: out('d-sell.png') });

  // Owner portal. The demo keeps state in memory, so stay inside the app (client-side links only).
  await d.goto(`${BASE}/owner/sign-in`);
  await ready(d);
  await d.getByRole('button', { name: 'Open demo owner portal' }).click();
  await d.waitForURL('**/owner/import');
  await d.setInputFiles('#import-file', CSV);
  await d.getByRole('button', { name: 'Prepare preview' }).click();
  await d.getByRole('heading', { name: '5. Review and publish' }).waitFor();
  await d.waitForTimeout(600);
  await d.screenshot({ path: out('d-owner-import-full.png'), fullPage: true });

  await d.getByRole('button', { name: /^Publish \d+ change/ }).click();
  await d.getByText(/Published sample-import\.csv/).waitFor();
  await d.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));

  await d.getByRole('link', { name: 'Items and photos' }).click();
  await d.waitForURL('**/owner/items');
  await d.getByRole('table').waitFor();
  await d.waitForTimeout(500);
  await d.screenshot({ path: out('d-owner-items.png') });

  await d.getByRole('link', { name: 'History and restore' }).click();
  await d.waitForURL('**/owner/history');
  await d.getByText(/Before import of sample-import\.csv/).waitFor();
  await d.waitForTimeout(500);
  await d.screenshot({ path: out('d-owner-history.png') });

  // Phone: 390x844 at 3x, matching the original captures (1170x2532).
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: 'dark' });
  const m = await phone.newPage();

  await m.goto(`${BASE}/`);
  await ready(m);
  await m.screenshot({ path: out('m-home.png') });

  await m.goto(`${BASE}/inventory`);
  await ready(m);
  await scrollTo(m, 'ul[aria-label="Quick category filter"]', 86);
  await m.screenshot({ path: out('m-inventory.png') });

  await m.goto(`${BASE}/item/VP-24115`);
  await ready(m);
  await m.screenshot({ path: out('m-item.png') });

  await browser.close();
  console.log('done');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
