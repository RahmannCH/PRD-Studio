/* Generator PRD adaptif per jenis produk DAN per industri (window.IndustrySpec di templates.js).
   Tanpa asumsi kasir untuk semua produk. Bullet selalu satu tingkat (tanpa "- -"). */
(function () {
  /* C1: normType / lines / esc diserahkan ke shared.js — satu sumber
     kebenaran, perilaku identik dengan duplikat yang dulu ada di file ini. */
  var SH = window.PrdShared;
  var lines = SH.lines;
  var esc = SH.esc;
  var normType = SH.normType;
  function specFor(a) {
    var table = window.IndustrySpec || {};
    var sp = table[a.industry] || null;
    return sp;
  }
  function dataModelFor(a, roles) {
    var t = normType(a.productType);
    if (t === 'Landing page') return '- Page (slug, judul, sections)\n- Lead (id, waktu, nama, kontak, pesan, status)\n- Asset (id, path, alt)\nRelasi: satu Page punya banyak Lead dan Asset.';
    if (t === 'Marketplace') return '- Seller (id, nama, kontak)\n- Product (id, seller_id, nama, harga, stok)\n- Order (id, buyer, items, total, status)\n- Payment (order_id, metode, status)\nRelasi: Seller 1-N Product, Order N-M Product lewat OrderItem.';
    if (t === 'Dashboard internal') return '- Account (id, peran: ' + roles + ', pin_hash)\n- Dataset (id, sumber, skema, refresh_at)\n- Report (id, query, pemilik, jadwal)\n- AuditLog (id, aktor, aksi, waktu)\nRelasi: Account 1-N Report, semua tulis tercatat di AuditLog.';
    if (t === 'Aplikasi mobile') return '- User (id, peran: ' + roles + ', token)\n- Item (id, pemilik, data, updated_at)\n- SyncQueue (id, payload, status: antre/terkirim/gagal, idempotency_key)\n- Media (id, item_id, path)\nRelasi: User 1-N Item, antrean offline memakai idempotency_key.';
    var sp = specFor(a);
    if (sp && sp.model) return sp.model.replace(/\{roles\}/g, function () { return roles; });
    return '- User (id, peran: ' + roles + ', pin_hash)\n- Item (id, nama, data, stok)\n- Transaction (id, waktu, items, total, status: tersimpan/antre/terkirim)\nRelasi: satu Transaction berisi banyak Item lewat TransactionItem. Semua tulis offline masuk antrean dulu.';
  }
  function metricsFor(a) {
    var userMetrics = lines(a.successMetrics);
    if (userMetrics.length) return userMetrics;
    var t = normType(a.productType);
    if (t === 'Landing page') return ['Konversi formulir di atas 5 persen dalam 2 minggu.', 'LCP di bawah 2.5 detik di HP 4G.', 'Semua CTA tercatat di analitik, tanpa tombol mati.'];
    if (t === 'Marketplace') return ['Checkout selesai di bawah 3 menit untuk pengguna baru.', 'Semua order punya status terlacak, nol order hilang.', 'Stok tidak pernah negatif walau order bersamaan.'];
    if (t === 'Dashboard internal') return ['Laporan harian tersedia di bawah 5 detik.', 'Semua aksi tulis tercatat di audit log.', 'Hak akses per peran terjaga tanpa eskalasi.'];
    if (t === 'Aplikasi mobile') return ['Tugas utama selesai di bawah 3 menit di HP RAM kecil.', 'Data tersimpan 100 persen walau offline.', 'Sync berhasil tanpa duplikat (idempotent).'];
    var sp = specFor(a);
    if (sp && sp.metrics) return Array.isArray(sp.metrics) ? sp.metrics.slice() : lines(sp.metrics);
    return ['Tugas harian utama selesai di bawah 5 menit dalam 2 minggu pemakaian.', 'Data tersimpan 100 persen walau offline, nol data hilang.', 'Pengguna baru mencapai aksi pertama tanpa panduan dalam 3 menit.'];
  }
  /* G4: productType dulu untuk risiko (mirror dataModelFor/metricsFor);
     industry hanya untuk tipe default. */
  function riskFor(a, sp) {
    var t = normType(a.productType);
    if (t === 'Landing page') return 'Form tidak terkirim karena jaringan lambat, aset gambar besar menunda LCP, spam bot mengisi form. Mitigasi: retry submit, kompresi aset, honeypot dan rate limit.';
    if (t === 'Dashboard internal') return 'Query dataset besar lambat, hak akses salah, export gagal di tengah jalan. Mitigasi: pagination dan cache, otorisasi per peran, stream export.';
    if (t === 'Aplikasi mobile') return 'Sinkron ganda saat offline berkepanjangan, storage HP penuh, notifikasi tidak sampai. Mitigasi: idempotency_key, kuota lokal dengan peringatan, fallback silent.';
    if (t === 'Marketplace') return 'Pesanan ganda saat klik lambat, stok race condition, penjual telat membalas. Mitigasi: kunci stok transaksional, idempotency checkout, pengingat status otomatis.';
    if (sp && sp.risk) return sp.risk;
    return 'Perangkat beda merek, HP RAM kecil, koneksi putus. Mitigasi: antrean lokal, idempotency, mode hemat, uji di perangkat target.';
  }
  window.GenPRD = function (a, score) {
    var must = lines(a.mustHave), should = lines(a.shouldHave),
        wont = lines(a.wontHave), roles = lines(a.roles), integ = lines(a.integrations);
    var platform = Array.isArray(a.platform) ? a.platform : lines(a.platform);
    var audio = Array.isArray(a.audio) ? a.audio : lines(a.audio);
    var sp = specFor(a);
    /* rolesStr di-escape SEKALI di sini; dataModelFor menerima teks yang
       sudah aman sehingga model §10 tidak membawa HTML mentah (XSS export). */
    var rolesStr = roles.length ? roles.map(esc).join('/') : 'pemilik/kasir';
    var _d = new Date();
    var _p = function (x) { return (x < 10 ? '0' : '') + x; };
    var date = _d.getFullYear() + '-' + _p(_d.getMonth() + 1) + '-' + _p(_d.getDate());
    var sc = (typeof score === 'number') ? { score: score, level: '' } : (score || null);
    var scoreLine = sc ? 'Skor kesiapan ' + sc.score + (sc.level ? ' (' + sc.level + ')' : '') + '.' : '';
    var metrics = metricsFor(a);
    var stories = must.map(function (m, i) {
      var who = esc(a.primaryUser).split(',')[0];
      return 'US-' + (i + 1) + ' Sebagai ' + who + ' saya bisa ' + esc(m.charAt(0).toLowerCase() + m.slice(1)) + ' sehingga target harian tercapai.\n' +
        '  Kriteria biner: berhasil menampilkan konfirmasi dalam 2 detik, gagal menampilkan sebab plus tombol ulangi, status tersimpan dan bisa diverifikasi ulang.';
    });
    var t = normType(a.productType);
    /* G7: typeApi null untuk tipe tak dikenal; fallback ke industri lalu generik. */
    var typeApi = t === 'Landing page'
      ? '- POST /leads (honeypot + rate limit 5/menit per IP)\n- GET /content?page=slug\n- Aturan: semua input divalidasi server, respons gagal menyertakan kode sebab.'
      : t === 'Marketplace'
        ? '- POST /orders (idempotency-key wajib)\n- GET /products?page=N&limit=20\n- PUT /stock/:id (optimistic lock, stok tidak boleh negatif)\n- Aturan: total dihitung server, respons gagal menyertakan kode sebab.'
        : t === 'Dashboard internal'
          ? '- GET /reports/:id?from=YYYY-MM-DD&to=YYYY-MM-DD\n- POST /datasets/:id/refresh\n- Aturan: semua tulis tercatat AuditLog, hak akses peran diperiksa server.'
          : t === 'Aplikasi mobile'
            ? '- POST /sync (idempotency-key wajib, batch payload)\n- GET /items?updated_after=ISO\n- Aturan: conflict resolved server-wins, idempotency_key beda per antrean.'
            : null;
    var api = typeApi || (sp && sp.api) ||
      '- POST /transactions (idempotency-key wajib agar sinkron ganda aman)\n- GET /reports/daily?date=YYYY-MM-DD\n- Aturan: total dihitung server, respons gagal menyertakan kode sebab.';
    return '# PRD: ' + esc(a.productName) + '\n' +
      '_Jenis: ' + esc(t) + ' | Industri: ' + esc(a.industry) + ' | Platform: ' + esc(platform.join(', ')) + ' | Disusun: ' + date + ' via PRD Studio. ' + scoreLine + '_\n\n' +
      '## 1. Ringkasan eksekutif\n' + esc(a.productName) + ' adalah ' + esc(t).toLowerCase() + ' untuk ' + esc(a.primaryUser) + '.\n' +
      'Masalah: ' + esc(a.problem) + '\nAlasan sekarang: ' + esc(a.whyNow) + '\n\n' +
      '## 2. Persona dan problem statement\n' + esc(a.primaryUser) + ' butuh ' + (must[0] ? esc(must[0].charAt(0).toLowerCase() + must[0].slice(1)) : 'menyelesaikan pekerjaan') + ' karena ' + esc(a.problem) + '.\n' +
      'Peran: ' + (roles.length ? roles.map(esc).join(', ') : '-') + '.\n\n' +
      '## 3. Tujuan dan metrik sukses\n' + metrics.map(function (x) { return '- ' + esc(x); }).join('\n') + '\n\n' +
      '## 4. Scope MoSCoW\n**Must (v1 wajib):**\n' + (must.length ? must.map(function (x, i) { return 'M' + (i + 1) + ' ' + esc(x); }).join('\n') : 'M1 (belum diisi)') + '\n\n' +
      '**Should (kalau sempat):**\n' + (should.length ? should.map(function (x, i) { return 'S' + (i + 1) + ' ' + esc(x); }).join('\n') : 'S1 (belum diisi)') + '\n\n' +
      '**Won\'t (tegas di luar v1):**\n' + (wont.length ? wont.map(function (w) { return '- ' + esc(w); }).join('\n') : '- (belum diisi)') + '\n\n' +
      '## 5. User stories dan kriteria terima\n' + (stories.length ? stories.join('\n\n') + '\n\n' : 'Belum ada Must have.\n\n') +
      '## 6. Alur dan sistematika interface\nAlur utama: ' + esc(a.mainFlow) + '\nJalur gagal: ' + esc(a.failFlow) + '\n' +
      'Navigasi: ' + esc(a.navStructure) + '. Setiap layar punya 3 state: kosong (panduan isi pertama), memuat (indikator), gagal (sebab dan tombol ulangi).\n\n' +
      '## 7. Layout dan UI per area\nGaya: ' + esc(a.styleDirection) + '. Pola layout: ' + esc(a.layoutPref) + '.\n' +
      'Aturan: satu titik fokus per layar, target sentuh minimal 44px, fokus keyboard terlihat, tanpa tombol mati.\nVisual: ' + esc(a.visualNeeds) + '\n\n' +
      '## 8. Audio dan media\nKebutuhan: ' + esc(audio.join(', ')) + '.\nAturan: suara hanya umpan balik aksi (klik, sukses, gagal), ada tombol bisu, tanpa autoplay.\n\n' +
      '## 9. Kebutuhan non fungsional\n' + esc(a.nfr) + '\nTambahan baku: kontras teks 4.5:1, keyboard penuh (Tab, Enter, Escape), responsif 360px sampai desktop tanpa scroll horizontal.\n\n' +
      '## 10. Model data (awal)\n' + dataModelFor(a, rolesStr) + '\n\n' +
      '## 11. Endpoint dan aturan (awal)\n' + api + '\nIntegrasi: ' + (integ.length ? esc(integ.join('; ')) : '-') + '.\n\n' +
      '## 12. Risiko dan out of scope\nRisiko: ' + riskFor(a, sp) + '\n' +
      'Out of scope v1 sama dengan daftar Won\'t. Stack: ' + esc(a.stackPref) + '.\n';
  };
})();
