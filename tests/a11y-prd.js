// Suite a11y (axe-core): index, studio, langkah 7, palet, bantuan, hasil.
// Gate: 0 violation impact serious/critical di semua permukaan.
// Jalankan: node tests/a11y-prd.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.normalize(path.join(ROOT, p));
  if (!f.toLowerCase().startsWith(path.normalize(ROOT).toLowerCase()) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});

let pass = 0, fail = 0;
const ok = (c, name, extra) => { if (c) pass++; else { fail++; console.log('FAIL:', name, extra || ''); } };

(async () => {
  await new Promise(r => server.listen(8767, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ colorScheme: 'dark' });
  const page = await ctx.newPage();

  async function scan(label) {
    const res = await new AxeBuilder({ page }).analyze();
    const bad = res.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    ok(bad.length === 0, 'axe ' + label + ': no serious/critical violations',
      bad.map(v => v.id + ' [' + v.impact + '] ' + v.nodes.length + 'x: ' + v.nodes[0].target.join(' ')).join(' | '));
  }

  // ---------- index (dua tema) ----------
  await page.goto('http://127.0.0.1:8767/index.html');
  await scan('index dark');
  await page.click('#themeToggle');
  await page.waitForTimeout(100);
  await scan('index light');

  // ---------- studio: langkah 1, langkah 7 (coach), palet, bantuan, hasil ----------
  await page.goto('http://127.0.0.1:8767/studio.html');
  await scan('studio step 1');

  await page.click('#fillSampleBtn');
  await page.evaluate(() => window.Wizard.showStep(7, true));
  await page.waitForTimeout(200);
  await scan('studio step 7 (coach)');

  await page.keyboard.press('Control+k');
  await page.waitForSelector('#paletteWrap:not([hidden])');
  await page.fill('#paletteInput', 'unduh');
  await page.waitForTimeout(150);
  await scan('palette open with results');
  await page.keyboard.press('Escape');

  await page.keyboard.press('Shift+Slash');
  await page.waitForTimeout(150);
  await scan('help overlay');
  await page.click('#helpClose');

  await page.click('#generateBtn');
  await page.waitForSelector('#prdSections .sect');
  await scan('results: PRD tab');
  await page.click('[data-tab="roadmap"]');
  await scan('results: roadmap tab');
  await page.click('[data-tab="prompt"]');
  await scan('results: prompt tab');
  await page.click('[data-tab="video"]');
  await scan('results: video storyboard tab');

  await browser.close();
  server.close();
  console.log('PASS ' + pass + ' / FAIL ' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
