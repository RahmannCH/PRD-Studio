/* Diagram Mermaid: use case, ERD, flowchart. Kode sumber selalu tersedia offline,
   render butuh CDN sekali. Gagal CDN → catatan jujur, kode tetap bisa disalin. */
(function () {
  /* C1: helper dipindah ke shared.js (satu sumber kebenaran). */
  var lines = window.PrdShared.lines;
  var normType = window.PrdShared.normType;
  /* Bersihkan karakter yang merusak sintaks Mermaid: kurung (mematikan bentuk `((...))`),
     kurung siku, pipe, kutip, tanda # % ; dll. Baris baru ikut dibuang: label
     berisi \n (mis. dari textarea jalur gagal) memutus statement Mermaid. */
  function safe(s) { return String(s || '').replace(/[\r\n]+/g, ' ').replace(/[\[\](){}|"'#%;<>`~]/g, '').slice(0, 42); }
  function q(s) { return '"' + safe(s) + '"'; }
  /* G5: ERD generik dulu sadar industri agar tidak beda model dengan PRD §10. */
  var INDUSTRY_ERD = {
    'Retail & F&B': 'erDiagram\n  KASIR ||--o{ TRANSAKSI : membuat\n  TRANSAKSI ||--o{ TRANSAKSI_ITEM : berisi\n  ITEM ||--o{ TRANSAKSI_ITEM : dipesan\n  KASIR {\n    string id\n    string nama\n  }\n  TRANSAKSI {\n    string id\n    string status\n  }\n  ITEM {\n    string id\n    int stok\n  }',
    'Jasa & agency': 'erDiagram\n  KLIEN ||--o{ BOOKING : memesan\n  JASA ||--o{ BOOKING : dipesan\n  BOOKING ||--o{ TAGIHAN : menagih\n  KLIEN {\n    string id\n    string nama\n  }\n  JASA {\n    string id\n    int durasi\n  }\n  BOOKING {\n    string id\n    string jadwal\n    string status\n  }',
    'SaaS internal': 'erDiagram\n  AKUN ||--o{ PROYEK : memiliki\n  PROYEK ||--o{ TUGAS : berisi\n  AKUN ||--o{ AUDIT_LOG : menghasilkan\n  AKUN {\n    string id\n    string peran\n  }\n  PROYEK {\n    string id\n    string status\n  }\n  TUGAS {\n    string id\n    string status\n  }',
    'Marketplace & konten': 'erDiagram\n  PENJUAL ||--o{ PRODUK : menjual\n  PESANAN ||--o{ PESANAN_ITEM : berisi\n  PRODUK ||--o{ PESANAN_ITEM : dipesan\n  PESANAN ||--o{ PEMBAYARAN : dibayar\n  PENJUAL {\n    string id\n    string nama\n  }\n  PRODUK {\n    string id\n    int harga\n    int stok\n  }\n  PESANAN {\n    string id\n    string status\n  }',
    'Layanan publik & klinik': 'erDiagram\n  PETUGAS ||--o{ ANTREAN : memanggil\n  LAYANAN ||--o{ ANTREAN : melayani\n  ANTREAN ||--o{ KUNJUNGAN : tercatat\n  PETUGAS {\n    string id\n    string peran\n  }\n  LAYANAN {\n    string id\n    string loket\n  }\n  ANTREAN {\n    string id\n    string status\n  }\n  KUNJUNGAN {\n    string id\n    string data_klinis\n  }'
  };
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
    var erd;
    var t = normType(a.productType);
    if (t === 'Landing page') {
      erd = 'erDiagram\n  PAGE ||--o{ LEAD : menerima\n  PAGE {\n    string slug\n    string judul\n  }\n  LEAD {\n    string id\n    string kontak\n    string status\n  }';
    } else if (t === 'Marketplace') {
      erd = 'erDiagram\n  SELLER ||--o{ PRODUCT : menjual\n  ORDER ||--o{ ORDER_ITEM : berisi\n  PRODUCT ||--o{ ORDER_ITEM : dipesan\n  SELLER {\n    string id\n    string nama\n  }\n  PRODUCT {\n    string id\n    string nama\n    int harga\n    int stok\n  }\n  ORDER {\n    string id\n    string buyer\n    string status\n  }\n  ORDER_ITEM {\n    string order_id\n    string product_id\n    int qty\n  }';
    } else if (t === 'Dashboard internal') {
      erd = 'erDiagram\n  ACCOUNT ||--o{ REPORT : memiliki\n  ACCOUNT ||--o{ AUDIT_LOG : menghasilkan\n  DATASET ||--o{ REPORT : memberi data\n  ACCOUNT {\n    string id\n    string peran\n  }\n  DATASET {\n    string id\n    string sumber\n  }\n  REPORT {\n    string id\n    string query\n  }\n  AUDIT_LOG {\n    string id\n    string aktor\n    string aksi\n  }';
    } else if (t === 'Aplikasi mobile') {
      erd = 'erDiagram\n  USER ||--o{ ITEM : memiliki\n  ITEM ||--o{ SYNC_QUEUE : antre\n  ITEM ||--o{ MEDIA : menyimpan\n  USER {\n    string id\n    string token\n  }\n  ITEM {\n    string id\n    string data\n  }\n  SYNC_QUEUE {\n    string id\n    string status\n    string idempotency_key\n  }\n  MEDIA {\n    string id\n    string path\n  }';
    } else if (INDUSTRY_ERD[a.industry]) {
      /* G5: Aplikasi web / tipe tak dikenal mengikuti model industri agar ERD
         selaras dengan PRD §10 (bukan hardcode USER/TRANSAKSI/ITEM). */
      erd = INDUSTRY_ERD[a.industry];
    } else {
      erd = 'erDiagram\n  USER ||--o{ TRANSAKSI : membuat\n  TRANSAKSI ||--o{ ITEM : berisi\n  USER {\n    string id\n    string peran\n  }\n  TRANSAKSI {\n    string id\n    date waktu\n    string status\n  }\n  ITEM {\n    string id\n    string nama\n    int jumlah\n  }';
    }
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
