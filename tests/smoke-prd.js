// Smoke test PRD Studio (Playwright): wizard, generate, gate, multi-proyek, tema.
// Jalankan: node tests/smoke-prd.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };

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
  await new Promise(r => server.listen(8765, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'], colorScheme: 'dark' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  // ---------- index ----------
  const r1 = await page.goto('http://127.0.0.1:8765/index.html');
  ok(r1.status() === 200, 'index served 200', r1.status());
  await page.click('.faq-q');
  ok(await page.getAttribute('.faq-q', 'aria-expanded') === 'true', 'FAQ expands');
  ok((await page.getAttribute('.faq-a', 'hidden')) === null, 'FAQ answer visible');
  ok(await page.getAttribute('#isi', 'tabindex') === '-1', 'main fokusable');
  await page.click('#themeToggle');
  ok(await page.getAttribute('html', 'data-theme') === 'light', 'theme toggles to light', await page.getAttribute('html','data-theme'));
  ok(await page.getAttribute('meta[name="theme-color"]', 'content') === '#E8EDF5', 'theme-color follows light');
  await page.click('#themeToggle');

  // ---------- studio: wizard + sample ----------
  const r2 = await page.goto('http://127.0.0.1:8765/studio.html');
  ok(r2.status() === 200, 'studio served 200', r2.status());
  ok((await page.textContent('#stepMeta')).includes('Langkah 1'), 'wizard step 1');
  await page.click('#fillSampleBtn');
  ok(await page.inputValue('#productName') === 'Kasir Warung Pintar', 'sample fills name');
  ok(await page.textContent('#readyScore') !== 'Skor 0', 'score paints', await page.textContent('#readyScore'));

  // chip terakhir tidak boleh dilepas
  await page.evaluate(() => { document.querySelector('#platformChips .chip[data-val="Web responsif"]').click(); });
  const pressedCount = await page.evaluate(() => document.querySelectorAll('#platformChips .chip[aria-pressed="true"]').length);
  ok(pressedCount >= 1, 'minimal satu chip tetap aktif', pressedCount);

  // ---------- action hint sebelum generate ----------
  ok(await page.getAttribute('#actionHint', 'hidden') === null, 'actionHint visible before generate');
  const exportDisabled = await page.evaluate(() => document.querySelector('[data-act="copy-prd"]').disabled);
  ok(exportDisabled, 'copy-prd disabled before generate');

  // ---------- generate ----------
  await page.click('#generateBtn');
  await page.waitForSelector('#prdSections .sect', { timeout: 5000 });
  await page.waitForTimeout(200);
  const badge = await page.textContent('#scoreBadge');
  ok(/Skor \d+/.test(badge), 'score badge', badge);
  const genCls = await page.getAttribute('#genStatus', 'class');
  ok(genCls && genCls.indexOf('gen-ok') > -1, 'genStatus gen-ok after generate', genCls);
  ok(await page.getAttribute('#actionHint', 'hidden') !== null, 'actionHint hidden after generate');
  const nSect = await page.locator('#prdSections .sect').count();
  ok(nSect >= 12, 'PRD sections rendered', nSect);
  const nToc = await page.locator('#prdToc a').count();
  ok(nToc >= 12, 'TOC rendered', nToc);

  // gaps kosong => pesan "semua gap tertutup" tampil
  const gapsShow = await page.evaluate(() => document.querySelector('#resultGapsClear').classList.contains('show'));
  ok(gapsShow, 'resultGapsClear shown when sample has zero gaps');
  await page.click('[data-tab="roadmap"]');
  ok(await page.getAttribute('#out-roadmap', 'hidden') === null, 'roadmap tab opens');
  const nFase = await page.locator('.roadmap-fase').count();
  ok(nFase >= 4, 'roadmap fases', nFase);
  await page.click('[data-tab="diagram"]');
  const nDiag = await page.locator('.diagram-box').count();
  ok(nDiag === 3, '3 diagrams', nDiag);
  await page.click('[data-tab="prompt"]');
  const nPrompt = await page.locator('.prompt-item').count();
  ok(nPrompt === 10, '10 prompts', nPrompt);
  const nLocked = await page.locator('.prompt-item.locked').count();
  ok(nLocked === 5, '5 prompts locked initially', nLocked);

  // export buttons aktif
  const exportEnabled = await page.evaluate(() => !document.querySelector('[data-act="copy-prd"]').disabled);
  ok(exportEnabled, 'copy-prd enabled after generate');

  // keyboard tab navigation (ArrowLeft)
  await page.focus('#tab-prompt');
  await page.keyboard.press('ArrowLeft');
  ok(await page.getAttribute('#tab-diagram', 'aria-selected') === 'true', 'arrow key moves tab');

  // ---------- prompt gate berantai ----------
  await page.click('[data-tab="prompt"]');
  const lockedBefore = await page.locator('.prompt-item.locked').count();
  await page.click('#prompt-P4 button');
  await page.waitForTimeout(300);
  const lockedAfter = await page.locator('.prompt-item.locked').count();
  ok(lockedAfter < lockedBefore, 'P4 copy unlocks P5', lockedBefore + '->' + lockedAfter);
  // P6 masih terkunci (gerbang berantai: P6 butuh P5)
  const p6Locked = await page.evaluate(() => document.getElementById('prompt-P6').classList.contains('locked'));
  ok(p6Locked, 'P6 still locked after only P4 copied (sequential gate)');
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  ok(clipboard.length > 200, 'clipboard got prompt text', clipboard.length);

  // L-M1: uji rantai penuh sampai P9 unlock saat P8 disalin
  await page.click('#prompt-P5 button.btn-primary');
  await page.waitForTimeout(100);
  await page.click('#prompt-P6 button.btn-primary');
  await page.waitForTimeout(100);
  await page.click('#prompt-P7 button.btn-primary');
  await page.waitForTimeout(100);
  await page.click('#prompt-P8 button.btn-primary');
  await page.waitForTimeout(100);
  const p9Locked = await page.evaluate(() => document.getElementById('prompt-P9').classList.contains('locked'));
  ok(!p9Locked, 'P9 unlocks after P8 copied (L-M1 fix)');

  // L-M3: edit prompt P0, ubah varRole, pastikan edit bertahan di DOM
  const editBtnP0 = await page.locator('#prompt-P0 button:has-text("Edit")');
  await editBtnP0.click();
  await page.evaluate(() => { document.querySelector('#prompt-P0 pre').textContent = 'CUSTOM_EDIT_BODY_TEST'; });
  await editBtnP0.click(); // click 'Simpan edit'
  await page.fill('#varRole', 'arsitek sistem');
  // debounce regenerate = 300ms; tunggu sampai bodies berubah dan copied di-reset
  await page.waitForTimeout(450);
  const p0BodyAfterVar = await page.evaluate(() => document.querySelector('#prompt-P0 pre').textContent);
  ok(p0BodyAfterVar === 'CUSTOM_EDIT_BODY_TEST', 'P0 body survives varRole edit (L-M3 fix)', p0BodyAfterVar);

  // bulk copy saat masih terkunci (copied di-reset setelah var berubah) harus ditolak
  await page.click('[data-act="copy-all-prompt"]');
  await page.waitForTimeout(100);
  const toast = await page.textContent('#toast');
  ok(toast.includes('terkunci') || toast.includes('Salin berurutan'), 'bulk copy gated', toast);

  // ---------- gate skor: nama dikosongkan => hard rule menahan ----------
  await page.fill('#productName', '');
  await page.click('#generateBtn');
  await page.waitForTimeout(400);
  const errText = await page.textContent('#formErr');
  ok(errText.includes('nama produk'), 'empty name blocked', errText);
  const stepNow = await page.textContent('#stepMeta');
  ok(stepNow.includes('Langkah 1'), 'jumped back to step 1', stepNow);
  // field productName ditandai .field.err
  const nameErr = await page.evaluate(() => {
    const inp = document.getElementById('productName');
    return inp && inp.closest('.field') && inp.closest('.field').classList.contains('err');
  });
  ok(nameErr, 'productName field marked .field.err');
  const ariaInv = await page.getAttribute('#productName', 'aria-invalid');
  ok(ariaInv === 'true', 'productName aria-invalid=true');

  // ---------- autosave jujur ----------
  await page.fill('#productName', 'Kasir Uji');
  await page.waitForTimeout(600);
  const stamp = await page.textContent('#autosaveNote');
  ok(stamp.includes('Tersimpan otomatis') || stamp.includes('Gagal'), 'autosave stamp', stamp);

  // ---------- tema di studio ----------
  await page.click('#themeToggle');
  ok(await page.getAttribute('html', 'data-theme') === 'light', 'studio theme light');
  const metaC = await page.getAttribute('meta[name="theme-color"]', 'content');
  ok(metaC === '#E8EDF5', 'studio theme-color updated', metaC);
  await page.click('#themeToggle');

  // ---------- LLM: key dipakai password, toggle tampil, hapus key ----------
  ok(await page.getAttribute('#llmKey', 'type') === 'password', 'llmKey is password type');
  // reverse-wizard: tombol draft hanya tampil setelah AI dikonfigurasi
  ok(await page.getAttribute('#ideBtn', 'hidden') !== null, 'ideBtn hidden without AI config');
  await page.fill('#llmBaseUrl', 'https://api.example.com/v1');
  await page.fill('#llmModel', 'gpt-test');
  const bgKey = await page.evaluate(() => getComputedStyle(document.getElementById('llmKey')).backgroundColor);
  const bgAny = await page.evaluate(() => getComputedStyle(document.getElementById('llmBaseUrl')).backgroundColor);
  ok(bgKey === bgAny, 'llmKey shares input styling (not UA default)', bgKey + ' vs ' + bgAny);
  await page.fill('#llmKey', 'sk-test-123');
  await page.click('#llmKeyToggle');
  ok(await page.getAttribute('#llmKey', 'type') === 'text', 'key toggle shows text');
  ok(await page.getAttribute('#llmKeyToggle', 'aria-pressed') === 'true', 'toggle aria-pressed');
  // simpan key
  await page.click('#llmSave');
  await page.waitForTimeout(150);
  const phAfter = await page.getAttribute('#llmKey', 'placeholder');
  ok(phAfter === 'Tersimpan di browser ini', 'placeholder updates after save', phAfter);
  const hasKeyDel = await page.locator('#llmKeyDel').count();
  ok(hasKeyDel === 1, 'llmKeyDel button present');
  // ---------- reverse-wizard (E): modal, validasi, escape ----------
  ok(await page.getAttribute('#ideBtn', 'hidden') === null, 'ideBtn visible after AI config');
  await page.click('#ideBtn');
  ok(await page.getAttribute('#ideBack', 'class').then(c => c.indexOf('open') > -1), 'ide modal opens');
  await page.fill('#ideText', 'pendek');
  await page.click('#ideOk');
  const ideShort = await page.textContent('#ideStatus');
  ok(ideShort.indexOf('minimal 10 karakter') > -1, 'short idea rejected', ideShort);
  ok(await page.getAttribute('#ideBack', 'class').then(c => c.indexOf('open') > -1), 'modal stays open on validation error');
  await page.keyboard.press('Escape');
  ok(await page.getAttribute('#ideBack', 'class').then(c => c.indexOf('open') === -1), 'Escape closes ide modal');
  // hapus key (ada modal konfirmasi)
  await page.click('#llmKeyDel');
  ok((await page.getAttribute('#modalBack', 'class')).indexOf('open') > -1, 'delete key asks confirmation');
  await page.click('#modalOk');
  await page.waitForTimeout(150);
  const phDel = await page.getAttribute('#llmKey', 'placeholder');
  ok(phDel === 'sk-...', 'placeholder back after delete', phDel);
  ok(await page.getAttribute('#modalBack', 'class').then(c => c.indexOf('open') === -1), 'modal closes after delete');
  // key hilang => configured() false lagi => tombol draft ikut sembunyi
  ok(await page.getAttribute('#ideBtn', 'hidden') !== null, 'ideBtn hides again after key delete');
  // test tanpa key => status persisten .gen-err
  await page.click('#llmTest');
  await page.waitForTimeout(600);
  const llmCls = await page.getAttribute('#llmStatus', 'class');
  ok(llmCls && llmCls.indexOf('gen-err') > -1, 'llmTest no-key gives persistent gen-err', llmCls);
  const llmMsg = await page.textContent('#llmStatus');
  ok(llmMsg.length > 0, 'llmStatus keeps message (not cleared)', JSON.stringify(llmMsg));

  // ---------- PWA chrome ----------
  ok(await page.getAttribute('#offlineBanner', 'hidden') !== null, 'offlineBanner hidden by default');
  ok(await page.getAttribute('#pwaUpdate', 'hidden') !== null, 'pwaUpdate hidden by default');

  // ---------- modal konfirmasi + multi proyek ----------
  await page.click('#projNew');
  ok(await page.getAttribute('#modalBack', 'class') === 'modal-back open', 'modal opens');
  await page.keyboard.press('Escape');
  ok((await page.getAttribute('#modalBack', 'class')).indexOf('open') === -1, 'escape closes modal');
  await page.click('#projNew');
  const nav1 = page.waitForNavigation({ waitUntil: 'load' });
  await page.click('#modalOk');
  await nav1;
  await page.waitForSelector('#projSelect');
  const nProj = await page.locator('#projSelect option').count();
  ok(nProj === 2, 'project count after new', nProj);
  const afterNew = await page.inputValue('#productName');
  ok(afterNew === '', 'new project starts blank', JSON.stringify(afterNew));
  ok(await page.locator('#prdSections .empty').count() === 1, 'result cleared for new project');

  // rename via modal UX.prompt (C2 — window.prompt sudah dibuang)
  await page.click('#projRen');
  await page.waitForSelector('#modalInput', { state: 'visible' });
  await page.fill('#modalInput', 'Proyek Baru Nama');
  await page.click('#modalOk');
  await page.waitForTimeout(200);
  const optText = await page.locator('#projSelect option:checked').textContent();
  ok(optText.indexOf('Proyek Baru Nama') === 0, 'rename updates option', optText);
  ok(await page.getAttribute('#modalBack', 'class').then(c => c.indexOf('open') === -1), 'rename modal closes');

  // ---------- riwayat ----------
  const nav2 = page.waitForNavigation({ waitUntil: 'load' });
  await page.selectOption('#projSelect', { index: 0 });
  await nav2;
  await page.waitForSelector('#histList .hist-item');
  const nHist = await page.locator('#histList .hist-item').count();
  ok(nHist >= 1, 'history entry saved', nHist);
  await page.click('.hist-item button:has-text("Bandingkan")');
  ok(await page.locator('#diffBox .diff-pre').count() === 1, 'diff renders');

  // ---------- print css memuat ----------
  const printLinks = await page.evaluate(() => [...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.getAttribute('href')));
  ok(printLinks.some(h => h.includes('print.css')), 'print.css linked in studio', printLinks);

  // ---------- tanpa error runtime ----------
  const realErrors = errors.filter(e => !/mermaid|Failed to load resource|net::ERR/i.test(e));
  ok(realErrors.length === 0, 'no runtime errors', realErrors.join(' | '));

  await browser.close();
  server.close();
  console.log('PASS ' + pass + ' / FAIL ' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('CRASH', e); process.exit(2); });
