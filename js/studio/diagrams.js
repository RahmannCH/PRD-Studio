/* Diagram Mermaid: use case, ERD, flowchart. Kode sumber selalu tersedia offline,
   render butuh CDN sekali. Gagal CDN → catatan jujur, kode tetap bisa disalin. */
(function () {
  /* C1: helper dipindah ke shared.js (satu sumber kebenaran). */
  var lines = window.PrdShared.lines;
  /* Bersihkan karakter yang merusak sintaks Mermaid: kurung (mematikan bentuk `((...))`),
     kurung siku, pipe, kutip, tanda # % ; dll. Baris baru ikut dibuang: label
     berisi \n (mis. dari textarea jalur gagal) memutus statement Mermaid. */
  function safe(s) { return String(s || '').replace(/[\r\n]+/g, ' ').replace(/[\[\](){}|"'#%;<>`~]/g, '').slice(0, 42); }
  function q(s) { return '"' + safe(s) + '"'; }
  window.GenDiagrams = function (a) {
    var roles = lines(a.roles);
    if (!roles.length) roles = ['Pengguna'];
    var must = lines(a.mustHave);
    if (!must.length) must = ['Fitur inti'];
    /* G12: quote label aktor agar kata terlarang Mermaid (end, graph, A & B,
       Admin -- Manager) tidak merusak render. G13: tandai item yang dipangkas. */
    var shown = must.slice(0, 6);
    var extraN = must.length - shown.length;
    var usecase = 'flowchart LR\n' + roles.map(function (r, i) {
      return '  U' + i + '(("' + safe(r) + '"))';
    }).join('\n') + '\n  SYS["' + safe(a.productName || 'Sistem') + '"]\n' +
      shown.map(function (m, i) { return '  SYS --- F' + i + '[' + q(m) + ']'; }).join('\n') +
      (extraN > 0 ? '\n  SYS --- MORE["… dan ' + extraN + ' fitur lainnya"]' : '') + '\n' +
      roles.map(function (_, i) { return '  U' + i + ' --- SYS'; }).join('\n');
    /* ERD diturunkan dari Knowledge: sumber yang sama dengan PRD bagian 10,
       jadi teks model data dan diagram tidak bisa lagi berbeda diam-diam. */
    var erd = window.Knowledge.resolve(a).erd;
    var nav = lines(String(a.navStructure || '').replace(/,/g, '\n'));
    if (!nav.length) nav = ['Beranda', 'Utama', 'Pengaturan'];
    var flow = 'flowchart TD\n  A["Mulai: ' + safe(nav[0]) + '"] --> B["' + safe(must[0] || 'Aksi utama') + '"]\n' +
      '  B --> C{Berhasil?}\n  C -- Ya --> D["' + safe(nav[1] || 'Konfirmasi') + '"]\n' +
      '  C -- Tidak --> E["Gagal: ' + safe(a.failFlow || 'tampilkan sebab plus tombol ulangi') + '"]\n  E --> B';
    return [
      { id: 'usecase', title: 'Use case: aktor dan scope', code: usecase },
      { id: 'erd', title: 'ERD awal', code: erd },
      { id: 'flow', title: 'Flowchart utama dan jalur gagal', code: flow }
    ];
  };
  /* G16: flag di-scope modul + pending re-run agar render yang diminta saat
     sedang sibuk TIDAK hilang (bukan cuma return false lalu hilang selamanya). */
  var _rendering = false;
  var _pending = false;
  window.renderMermaid = function () {
    function note(msg, isErr) {
      document.querySelectorAll('.diagram-note').forEach(function (n) {
        n.textContent = msg;
        n.classList.toggle('err', !!isErr);
      });
    }
    function themeOf() {
      return document.documentElement.getAttribute('data-theme') === 'light' ? 'neutral' : 'dark';
    }
    function run() {
      if (_rendering) { _pending = true; return false; }
      _rendering = true;
      try {
        /* G20: securityLevel strict + flowchart.htmlLabels false (bukan root
           htmlLabels — mermaid 10 hanya membaca config.flowchart.htmlLabels). */
        window.mermaid.initialize({ startOnLoad: false, theme: themeOf(), securityLevel: 'strict', flowchart: { htmlLabels: false } });
        var all = Array.prototype.slice.call(document.querySelectorAll('.mermaid:not([data-processed])'));
        var els = all.filter(function (el) { return el.offsetParent !== null; });
        window._mermaidDirty = all.length - els.length > 0;
        if (!els.length) { _rendering = false; return true; }
        var okN = 0, failN = 0;
        var i = 0;
        function next() {
          try {
            if (i >= els.length) {
              _rendering = false;
              if (!failN) note('Diagram dirender via Mermaid CDN.');
              else if (!okN) note('Render diagram gagal, kode sumber di bawah tetap bisa disalin.', true);
              else note(okN + ' dari ' + (okN + failN) + ' diagram dirender. Diagram gagal tetap menampilkan kode sumbernya.', true);
              if (_pending) { _pending = false; window.renderMermaid(); }
              return;
            }
            var el = els[i++];
            /* suppressErrors:false agar .catch benar-benar fire saat parse error.
               suppressErrors:true membuat promise SELALU resolve (mermaid 10
               menangkap error internal), sehingga .catch = dead code dan
               failN selalu 0 — user lihat raw source tapi note bilang "dirender". */
            Promise.resolve(window.mermaid.run({ nodes: [el], suppressErrors: false }))
              .then(function () {
                if (el.querySelector('svg')) okN++;
                else { failN++; el.removeAttribute('data-processed'); }
              })
              .catch(function (err) {
                failN++;
                el.textContent = el.getAttribute('data-raw') || el.textContent;
                el.removeAttribute('data-processed');
                if (window.console && console.error) console.error('Mermaid render failed:', err);
              })
              .then(next);
          } catch (eRun) {
            _rendering = false;
            _pending = false;
            note('Render diagram gagal, kode sumber di bawah tetap bisa disalin.', true);
          }
        }
        next();
        return true;
      } catch (e) {
        _rendering = false;
        _pending = false;
        note('Render diagram gagal, kode sumber di bawah tetap bisa disalin.', true);
        return false;
      }
    }
    if (window.mermaid) return run();
    if (!document.getElementById('mermaid-cdn')) {
      var s = document.createElement('script');
      s.id = 'mermaid-cdn';
      /* G17: pin patch version eksplisit agar CDN tidak berubah diam-diam
         di luar jalur v10. */
      s.src = 'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js';
      s.onload = run;
      s.onerror = function () {
        note('Koneksi ke CDN Mermaid gagal. Diagram tidak tergambar, tapi kode sumber tetap utuh dan bisa disalin untuk dirender nanti.', true);
        s.remove();
      };
      document.head.appendChild(s);
    }
    return false;
  };
  /* Dipanggil theme.js saat tema berganti: render ulang dengan palet baru.
     Kalau tab diagram sedang tersembunyi, render ditunda sampai tab dibuka. */
  window.mermaidThemeSync = function () {
    if (!window.mermaid) return;
    document.querySelectorAll('.mermaid').forEach(function (el) {
      if (!el.hasAttribute('data-raw')) return;
      el.textContent = el.getAttribute('data-raw');
      el.removeAttribute('data-processed');
    });
    window._mermaidDirty = true;
    window.renderMermaid();
  };
})();
