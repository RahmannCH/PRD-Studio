// Responsive + tap-target check (Playwright).
// Jalankan: node tests/responsive-prd.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const s = http.createServer((q, r) => {
  let p = q.url.split('?')[0];
  if (p === '/') p = '/index.html';
  const f = path.normalize(path.join(ROOT, p));
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('no'); }
  const M = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
  r.writeHead(200, { 'Content-Type': M[path.extname(f)] || 'application/octet-stream' });
  r.end(fs.readFileSync(f));
});
let pass = 0, fail = 0;
const ok = (c, n, x) => { if (c) pass++; else { fail++; console.log('FAIL:', n, x || ''); } };
(async () => {
  await new Promise(r => s.listen(8769, '127.0.0.1', r));
  const b = await chromium.launch();
  for (const vp of [{ width: 360, height: 720 }, { width: 375, height: 720 }, { width: 768, height: 900 }, { width: 1440, height: 900 }]) {
    const ctx = await b.newContext({ viewport: vp, colorScheme: 'dark' });
    const p = await ctx.newPage();
    for (const page of ['index.html', 'studio.html']) {
      await p.goto('http://127.0.0.1:8769/' + page);
      if (page === 'studio.html') {
        // isi contoh & generate agar elemen hasil (gap-jump, prompt-btn) ada di DOM
        await p.click('#fillSampleBtn');
        await p.click('#generateBtn');
        await p.waitForTimeout(200);
      }
      const over = await p.evaluate(() => {
        const de = document.documentElement;
        const bad = [];
        if (de.scrollWidth > de.clientWidth + 1) {
          document.querySelectorAll('body *').forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.right > de.clientWidth + 2 && r.width > 0 && getComputedStyle(el).position !== 'fixed') {
              bad.push(el.tagName + '.' + (el.className || '').toString().slice(0, 40) + ' right=' + Math.round(r.right));
            }
          });
        }
        return { scroll: de.scrollWidth, client: de.clientWidth, bad: bad.slice(0, 5) };
      });
      ok(over.scroll <= over.client + 1, `${page} no h-overflow @${vp.width}`, JSON.stringify(over));
      // tap target minimum: 44px (WCAG 2.5.8 / antislop)
      const small = await p.evaluate(() => {
        const out = [];
        document.querySelectorAll('button, a.btn, .chip, select, .faq-q, .hist-item button, .toc a, .proj-switch, #projSelect, #themeToggle, .menu-btn, .prompt-vars input, .hist-tools input, .gap-jump').forEach(el => {
          if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return;
          const r = el.getBoundingClientRect();
          if (r.height > 0 && Math.round(r.height) < 44) out.push((el.id || el.className || el.tagName) + ' h=' + Math.round(r.height));
        });
        return out.slice(0, 8);
      });
      ok(small.length === 0, `${page} tap targets >=44px @${vp.width}`, small.join(', '));
    }
    await ctx.close();
  }
  await b.close();
  s.close();
  console.log('PASS ' + pass + ' / FAIL ' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('CRASH', e); process.exit(2); });
