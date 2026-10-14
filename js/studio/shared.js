/* shared.js — helper lintas modul (C1).
   Satu sumber kebenaran untuk normType / lines / esc / asArray / daftar
   industri / format waktu lokal / sanitasi payload impor. Dimuat pertama
   di studio.html sebelum state.js; test memuatnya sebelum modul lain. */
(function () {
  var W = typeof window !== 'undefined' ? window : globalThis;

  /* Alias tipe produk yang sering diketik manusia → enum resmi.
     Tipe tak dikenal tetap dipakai apa adanya (netral). */
  var TYPE_ALIAS = {
    'dashboard': 'Dashboard internal',
    'mobile': 'Aplikasi mobile',
    'mobile app': 'Aplikasi mobile',
    'aplikasi mobile': 'Aplikasi mobile',
    'landing': 'Landing page',
    'landing page': 'Landing page',
    'marketplace': 'Marketplace',
    'aplikasi web': 'Aplikasi web',
    'web app': 'Aplikasi web',
    'saas': 'SaaS internal'
  };
  function normType(t) {
    t = String(t || '').trim();
    return TYPE_ALIAS[t.toLowerCase()] || t;
  }

  /* Pecah string/baris → array baris bersih; buang SEMUA awalan bullet
     (loop, bukan satu pass) agar "- - item" tidak menghasilkan double bullet. */
  function lines(s) {
    if (Array.isArray(s)) s = s.join('\n');
    return String(s || '').split('\n').map(function (x) {
      var t = x.trim();
      while (/^[-*•]\s+/.test(t)) t = t.replace(/^[-*•]\s+/, '');
      return t;
    }).filter(Boolean);
  }

  /* Escape konten user untuk markdown: < > (cegah raw HTML di viewer),
     backtick (cegah fence terbuka), '#' awal baris (cegah seksi PRD palsu).
     '&' TIDAK di-escape: nama industri mengandung '&' asli dan '&' saja
     tidak memungkinkan XSS di viewer markdown. */
  function esc(s) {
    return String(s || '-').trim()
      .replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/`/g, '\\`')
      .replace(/(^|\n)\s*#/g, '$1\\#') || '-';
  }

  /* Koersi nilai jadi array string unik; string biasa dipecah per baris.
     dipakai platform/audio di ketiga generator agar tidak lagi inkonsisten. */
  function asArray(v, dflt) {
    if (v == null || v === '') return (dflt || []).slice();
    var arr = Array.isArray(v) ? v : lines(v);
    var out = [];
    arr.forEach(function (x) {
      var s = (x == null ? '' : String(x)).trim();
      if (s && out.indexOf(s) < 0) out.push(s);
    });
    return out.length ? out : (dflt || []).slice();
  }

  var INDUSTRIES = ['Umum / belum tentu', 'Retail & F&B', 'Jasa & agency',
    'SaaS internal', 'Marketplace & konten', 'Layanan publik & klinik'];

  /* Waktu lokal (bukan ISO UTC) agar label riwayat/autosave tidak meleset
     7 jam atau berganti tanggal untuk UTC+7. */
  function fmtDate(x) {
    var d = new Date(x);
    if (isNaN(d)) return '';
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function fmtDateTime(x) {
    var d = new Date(x);
    if (isNaN(d)) return '';
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return fmtDate(d) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /* Buang kunci berbahaya (__proto__/constructor/prototype) dari payload
     impor agar prototype pollution tidak lolos Object.assign (B6). */
  function stripUnsafe(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(stripUnsafe);
    var out = {};
    Object.keys(obj).forEach(function (k) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') return;
      var v = obj[k];
      out[k] = (v && typeof v === 'object') ? stripUnsafe(v) : v;
    });
    return out;
  }

  /* Baca properti hanya bila benar-benar milik objek sendiri — mencegah
     lookup 'constructor'/'toString' mengembalikan function (B6). */
  function own(obj, key) {
    return !!(obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, key));
  }

  W.PrdShared = {
    normType: normType, lines: lines, esc: esc, asArray: asArray,
    INDUSTRIES: INDUSTRIES, fmtDate: fmtDate, fmtDateTime: fmtDateTime,
    stripUnsafe: stripUnsafe, own: own
  };
})();
