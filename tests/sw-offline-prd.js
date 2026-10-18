// Service worker offline + deploy-skew check (Playwright).
// Jalankan: node tests/sw-offline-prd.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
// D4: baca nama cache dari sw.js — hardcode pernah membuat versi cache berubah
// tanpa test sadar (test lolos padahal cek cache lama).
const CACHE = /const\s+CACHE\s*=\s*'([^']+)'/.exec(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'))[1];
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.normalize(path.join(ROOT, p));
  if (!f.toLowerCase().startsWith(path.normalize(ROOT).toLowerCase()) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});

let pass = 0, fail = 0;
const ok = (c, n, x) => { if (c) pass++; else { fail++; console.log('FAIL:', n, x === undefined ? '' : x); } };

(async () => {
  await new Promise(r => server.listen(8770, '127.0.0.1', r));
  const b = await chromium.launch();
  const ctx = await b.newContext({ colorScheme: 'dark' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  // --- 1. kunjungan pertama: SW aktif + cache terisi ---
  await page.goto('http://127.0.0.1:8770/index.html');
  const hasManifest = await page.evaluate(() => !!document.querySelector('link[rel=manifest]'));
  ok(hasManifest, 'manifest linked');
  const swState = await page.evaluate(async (cacheName) => {
    if (!('serviceWorker' in navigator)) return 'unsupported';
    const reg = await navigator.serviceWorker.register('sw.js');
    await navigator.serviceWorker.ready;
    const cache = await caches.open(cacheName);
    const keys = (await cache.keys()).map(r => new URL(r.url).pathname);
    return { scope: reg.scope, cached: keys };
  }, CACHE);
  ok(swState !== 'unsupported', 'SW supported', JSON.stringify(swState));
  const need = ['index.html', 'studio.html', 'css/style.css', 'js/studio/app.js', 'icons/icon-512.png', 'manifest.webmanifest'];
  const missing = need.filter(n => !swState.cached.some(k => k.endsWith(n)));
  ok(missing.length === 0, 'core assets prefetched', missing.join(','));
  const controlled = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    return !!navigator.serviceWorker.controller;
  });
  ok(controlled, 'page controlled by SW');

  // beri waktu add('./') + aktivasi bersih
  await page.waitForTimeout(600);

  // --- 2. matikan server TOTAL (bukan sekadar emulate offline) ---
  await new Promise(r => { server.close(r); if (server.closeAllConnections) server.closeAllConnections(); });

  // --- 3. reload daring-mati: harus dari cache ---
  const offlineIndex = await page.reload({ waitUntil: 'load' }).then(r => r.status()).catch(() => 'nav-ok-no-response');
  const h1 = await page.textContent('h1');
  ok(h1.includes('7 langkah'), 'index reloads offline', h1.slice(0, 60));
  console.log('  (reload offline status:', offlineIndex + ')');

  // --- 4. buka studio offline + wawancara + susun penuh ---
  await page.goto('http://127.0.0.1:8770/studio.html', { waitUntil: 'load' });
  ok(await page.locator('#wizard').count() === 1, 'studio loads offline');
  await page.click('#fillSampleBtn');
  ok(await page.inputValue('#productName') === 'Kasir Warung Pintar', 'sample works offline');
  await page.click('#generateBtn');
  await page.waitForSelector('#prdSections .sect', { timeout: 5000 });
  const nSect = await page.locator('#prdSections .sect').count();
  ok(nSect >= 12, 'generate works offline', nSect);
  await page.click('[data-tab="prompt"]');
  ok(await page.locator('.prompt-item').count() === 10, 'prompts offline');

  // --- 5. tema + ikon terpasang di cache ---
  const extras = await page.evaluate(async (cacheName) => {
    const c = await caches.open(cacheName);
    const keys = (await c.keys()).map(r => new URL(r.url).pathname);
    return { icon: keys.some(k => k.includes('icon-192')), icon512: keys.some(k => k.includes('icon-512')) };
  }, CACHE);
  ok(extras.icon && extras.icon512, 'icons cached for install');

  const realErrors = errors.filter(e => !/Failed to load resource|net::ERR|Font/i.test(e));
  ok(realErrors.length === 0, 'no runtime errors offline', realErrors.join(' | '));

  await b.close();
  console.log('PASS ' + pass + ' / FAIL ' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('CRASH', e); process.exit(2); });
