/* Palette: palet perintah Ctrl+K + overlay bantuan pintasan (?).
   Daftar perintah dibangun saat dibuka dari DOM yang ada (tab, ekspor yang
   aktif, tombol wizard, mode kedalaman), jadi tidak ada daftar ganda yang
   bisa basi. Pencocokan fuzzy deterministik: urutan huruf harus muncul,
   bonus untuk kecocokan berurutan, substring, dan awalan kata.

   Interface:
     Palette.init()      -> pasang listener + referensi elemen (sekali)
     Palette.open() / close() / openHelp() / closeHelp() / isOpen()
     Palette.score(text, query) -> angka (makin besar makin cocok, -1 tidak cocok)
*/
window.Palette = (function () {
  var wrap, input, list, helpWrap, helpClose;
  var items = [];
  var active = 0;
  var lastFocus = null;
  var inited = false;

  function score(text, q) {
    var t = String(text == null ? '' : text).toLowerCase();
    var s = String(q == null ? '' : q).toLowerCase().trim();
    if (!s) return 0;
    var ti = 0, sc = 0, streak = 0, first = -1;
    for (var i = 0; i < s.length; i++) {
      var idx = t.indexOf(s.charAt(i), ti);
      if (idx < 0) return -1;
      if (first < 0) first = idx;
      if (idx === ti) { streak++; sc += 3 + streak; }
      else { streak = 0; sc += 1; }
      ti = idx + 1;
    }
    if (t.indexOf(s) > -1) sc += 10;
    if (t.indexOf(s) === 0) sc += 8;
    sc -= first > 6 ? 6 : first;
    return sc;
  }

  function build() {
    var out = [];
    function add(label, kw, run) { out.push({ label: label, kw: kw, run: run }); }
    [['prd', 'PRD'], ['roadmap', 'Roadmap'], ['diagram', 'Diagram'], ['prompt', 'Prompt'], ['video', 'Video / Storyboard'], ['kanban', 'Task Kanban']].forEach(function (t) {
      var btn = document.querySelector('[data-tab="' + t[0] + '"]');
      if (btn) add('Buka tab ' + t[1], 'tab ' + t[1], function () { btn.click(); });
    });
    var toc = document.querySelectorAll('#prdToc a');
    toc.forEach(function (a, i) {
      add('Lompat: ' + (a.textContent || '').trim(), 'seksi bagian ' + (i + 1), function () { a.click(); });
    });
    var acts = [
      ['copy-prd', 'Salin PRD', 'copy salin'],
      ['dl-prd', 'Unduh PRD (.md)', 'unduh markdown'],
      ['dl-html', 'Unduh PRD (.html)', 'unduh html'],
      ['dl-brief', 'Unduh brief (.md)', 'unduh ringkas'],
      ['dl-spec-yaml', 'Unduh spec (.yaml)', 'unduh yaml'],
      ['dl-bab', 'Unduh paket lengkap (.md)', 'unduh semua bab prd paket lengkap markdown'],
      ['dl-prototype', 'Unduh Prototipe HTML (DesainPakeAI)', 'unduh prototipe mockup html desain ui prototype'],
      ['dl-spec-pack', 'Unduh Spec Pack (AI agent)', 'unduh spec pack kiro agen'],
      ['dl-json', 'Unduh arsip (.json)', 'unduh json'],
      ['share-link', 'Salin tautan berbagi', 'tautan share link bagikan'],
      ['copy-video-prompt', 'Salin Master Prompt HyperFrames', 'video hyperframes prompt agent motion'],
      ['copy-storyboard', 'Salin tabel storyboard (.md)', 'storyboard salin video copy'],
      ['dl-storyboard', 'Unduh STORYBOARD.md', 'unduh download storyboard video'],
      ['dl-video-pack', 'Unduh paket proyek video HyperFrames (11 berkas)', 'unduh paket video zip hyperframes runnable'],
      ['dl-roadmap-csv', 'Unduh CSV roadmap', 'unduh csv'],
      ['dl-prompts', 'Unduh PROMPTS.md', 'unduh prompt'],
      ['print', 'Cetak atau PDF', 'print pdf'],
      ['ai-advise', 'Minta usulan AI', 'ai usulan'],
      ['ai-polish', 'Rapikan dengan AI', 'ai rapikan'],
      ['ai-polish-video', 'Poles Storyboard dengan AI', 'ai poles video storyboard naskah'],
      ['copy-all-prompt', 'Salin semua prompt terbuka', 'salin prompt']
    ];
    acts.forEach(function (a) {
      var b = document.querySelector('[data-act="' + a[0] + '"]');
      if (b && !b.disabled) add(a[1], a[2], function () { b.click(); });
    });
    var modeSoft = document.getElementById('modeBtnSoftware');
    if (modeSoft) add('Ganti Mode: PRD Software', 'mode software aplikasi web prd', function () { modeSoft.click(); });
    var modeStory = document.getElementById('modeBtnStoryboard');
    if (modeStory) add('Ganti Mode: Storyboard HyperFrames', 'mode video storyboard hyperframes motion', function () { modeStory.click(); });
    var sample = document.getElementById('fillSampleBtn');
    if (sample) add('Isi contoh jawaban', 'contoh sample demo', function () { sample.click(); });
    var gen = document.getElementById('generateBtn');
    if (gen) add('Susun hasil sekarang', 'susun generate', function () { gen.click(); });
    var theme = document.getElementById('themeToggle');
    if (theme) add('Ganti tema terang atau gelap', 'tema gelap terang', function () { theme.click(); });
    var chips = document.querySelectorAll('#depthChips .chip');
    chips.forEach(function (c) {
      add('Kedalaman: ' + c.textContent.trim(), 'mode kedalaman wawancara', function () { c.click(); });
    });
    var peng = document.getElementById('pengaturan');
    if (peng) add('Buka pengaturan AI', 'pengaturan ai llm', function () { window.UX.scrollTo(peng); });
    return out;
  }

  function paint() {
    var q = input.value;
    var scored = items.map(function (it, i) {
      var s = score(it.label + ' ' + it.kw, q);
      return { it: it, s: s, i: i };
    }).filter(function (r) { return q ? r.s > -1 : true; });
    if (q) {
      scored.sort(function (a, b) { return b.s - a.s || a.i - b.i; });
    }
    var shown = scored.slice(0, 12).map(function (r) { return r.it; });
    list.innerHTML = '';
    active = 0;
    list._shown = shown;
    if (!shown.length) {
      var li0 = document.createElement('li');
      li0.className = 'palette-empty';
      /* listbox wajib berisi option; placeholder ini option nonaktif supaya
         struktur ARIA tetap valid saat filter tidak menemukan apa pun. */
      li0.setAttribute('role', 'option');
      li0.setAttribute('aria-disabled', 'true');
      li0.setAttribute('aria-selected', 'false');
      li0.textContent = 'Tidak ada perintah yang cocok.';
      list.appendChild(li0);
      input.removeAttribute('aria-activedescendant');
      return;
    }
    shown.forEach(function (it, i) {
      var li = document.createElement('li');
      li.id = 'palOpt' + i;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      var span = document.createElement('span');
      span.textContent = it.label;
      li.appendChild(span);
      li.addEventListener('click', function () { run(it); });
      li.addEventListener('mousemove', function () { setActive(i); });
      list.appendChild(li);
    });
    input.setAttribute('aria-activedescendant', 'palOpt0');
  }

  function setActive(i) {
    var shown = list._shown || [];
    if (!shown.length) return;
    active = (i + shown.length) % shown.length;
    var lis = list.querySelectorAll('li');
    lis.forEach(function (li, j) {
      li.setAttribute('aria-selected', j === active ? 'true' : 'false');
    });
    input.setAttribute('aria-activedescendant', 'palOpt' + active);
    var el = list.querySelectorAll('li')[active];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }

  function run(it) {
    close();
    try { it.run(); } catch (e) {
      if (window.UX && window.UX.toast) window.UX.toast('Perintah gagal dijalankan.', { level: 'error' });
    }
  }

  function open() {
    if (!wrap || !wrap.hidden) return;
    lastFocus = document.activeElement;
    items = build();
    wrap.hidden = false;
    input.value = '';
    paint();
    input.focus();
  }
  function close() {
    if (!wrap || wrap.hidden) return;
    wrap.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function isOpen() { return !!(wrap && !wrap.hidden); }

  function openHelp() {
    /* Bantuan tampil di atas palet; tutup palet dulu supaya fokus tunggal. */
    close();
    if (!helpWrap || !helpWrap.hidden) return;
    lastFocus = document.activeElement;
    helpWrap.hidden = false;
    if (helpClose) helpClose.focus();
  }
  function closeHelp() {
    if (!helpWrap || helpWrap.hidden) return;
    helpWrap.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function isTyping(target) {
    if (!target) return false;
    var tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }

  function init() {
    if (inited || typeof document === 'undefined') return;
    wrap = document.getElementById('paletteWrap');
    input = document.getElementById('paletteInput');
    list = document.getElementById('paletteList');
    helpWrap = document.getElementById('helpWrap');
    helpClose = document.getElementById('helpClose');
    if (!wrap || !input || !list || !helpWrap) return;
    inited = true;

    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-controls', 'paletteList');
    input.setAttribute('aria-autocomplete', 'list');
    input.addEventListener('input', paint);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        var shown = list._shown || [];
        if (shown[active]) run(shown[active]);
      } else if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Tab') { e.preventDefault(); /* fokus tetap di input (pola combobox) */ }
    });
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    if (helpClose) helpClose.addEventListener('click', closeHelp);
    helpWrap.addEventListener('click', function (e) { if (e.target === helpWrap) closeHelp(); });

    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (helpWrap && !helpWrap.hidden) { closeHelp(); return; }
        if (isOpen()) close(); else open();
        return;
      }
      if (e.key === 'Escape') {
        if (helpWrap && !helpWrap.hidden) { e.preventDefault(); closeHelp(); return; }
        if (isOpen()) { e.preventDefault(); close(); }
        return;
      }
      if (e.key === '?' && !isTyping(e.target)) {
        e.preventDefault();
        if (isOpen()) close();
        if (helpWrap && helpWrap.hidden) openHelp(); else closeHelp();
      }
    });
  }

  return { init: init, open: open, close: close, openHelp: openHelp, closeHelp: closeHelp, isOpen: isOpen, score: score };
})();
