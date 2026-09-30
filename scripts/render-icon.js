// Renders src/assets/icon.svg to build/icon.png (512x512) for the desktop builds.
// Usage: node scripts/render-icon.js   (needs Playwright + Chromium available)
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const svg = fs.readFileSync(path.join(__dirname, '..', 'src', 'assets', 'icon.svg'), 'utf8');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await page.locator('svg').screenshot({ path: path.join(__dirname, '..', 'build', 'icon.png'), omitBackground: true });
  await browser.close();
  console.log('build/icon.png written');
})();
