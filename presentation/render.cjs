const { chromium } = require('playwright');
const path = require('path');
const [,, html, pdf, pngDir] = process.argv;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('file://' + path.resolve(html), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: pdf, width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
  if (pngDir) {
    const n = await p.locator('.slide').count();
    for (let i = 0; i < n; i++) await p.locator('.slide').nth(i).screenshot({ path: `${pngDir}/slide-${String(i + 1).padStart(2, '0')}.png` });
  }
  await b.close();
})();
