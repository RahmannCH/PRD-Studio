/* Roadmap heuristik: estimasi dari kata kunci, dependensi dari urutan dan keterkaitan. */
(function () {
  /* C1: helper dipindah ke shared.js (satu sumber kebenaran). */
  var lines = window.PrdShared.lines;
  var normType = window.PrdShared.normType;
  function flat(s) {
    /* G15: gabungkan newline/spasi berlebih pada judul fase agar ekspor
       markdown tidak memecah struktur dokumen ("## " di tengah judul). */
    return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  }
  function estimate(m) {
    var t = m.toLowerCase();
    if (/offline|sinkron|printer|bluetooth|payment|pembayaran|realtime|notifikasi push|struk|cetak|thermal/.test(t)) return 'L';
    if (/laporan|grafik|export|dashboard|search|filter|upload|foto|kamera/.test(t)) return 'M';
    if (/crud|tampil|simpan|tambah|hapus|edit|list|form|login|pin/.test(t)) return 'S';
    if (m.length > 60) return 'M';
    if (m.length < 20) return 'XS';
    return 'S';
  }
  function dependsOf(idx, m, all) {
    if (idx === 0) return 'Butuh Fondasi selesai';
    var t = m.toLowerCase();
    if (/struk|cetak|kirim|export|laporan|rekap/.test(t) && all.length) return 'Butuh "' + flat(all[0]).slice(0, 32) + '" selesai';
    return 'Butuh "' + flat(all[idx - 1]).slice(0, 32) + '" selesai';
  }
  window.GenRoadmap = function (a) {
    var must = lines(a.mustHave);
    if (!must.length) must = ['Fitur inti belum diisi, lengkapi langkah 3 dulu'];
    var integ = lines(a.integrations);
    var audio = Array.isArray(a.audio) ? a.audio : [];
    var core = must.map(function (m, i) {
      return { text: m, est: estimate(m), depends: dependsOf(i, m, must) };
    });

    /* Fase adaptif: landing page / dashboard internal / mobile memakai fase
       yang berbeda, bukan template kasir untuk semua. Tiap cabang hanya
       membangun Fase 1-3; Fase integrasi (bila ada) dan Fase rilis di-ekor
       secara bersama di bawah agar G3 (integrasi tidak hilang) dan G8
       (rilis bergantung pada fase terakhir yang benar) berlaku untuk SEMUA
       productType. */
    var t = normType(a.productType);
    var phases;
    if (t === 'Landing page') {
      phases = [
        { fase: 'Fase 1, Fondasi (minggu 1)', depends: 'Tanpa dependensi', items: [
          { text: 'Struktur halaman (' + flat(a.layoutPref) + ')', est: 'M', depends: 'Tanpa dependensi' },
          { text: 'Konten sections dan aset gambar', est: 'M', depends: 'Tanpa dependensi' },
          { text: 'Navigasi: ' + flat(a.navStructure || 'scroll satu halaman'), est: 'S', depends: 'Tanpa dependensi' }
        ]},
        { fase: 'Fase 2, Konversi (' + must.length + ' Must have)', depends: 'Butuh Fase 1 selesai', items: core },
        { fase: 'Fase 3, Kinerja dan SEO', depends: 'Butuh Fase 2 selesai', items: [
          { text: 'Optimasi LCP dan aset gambar', est: 'M', depends: 'Butuh Fase 2 selesai' },
          { text: 'Meta tags, OG image, dan sitemap', est: 'S', depends: 'Butuh Fase 2 selesai' },
          { text: 'Analitik CTA dan form submission', est: 'S', depends: 'Butuh Fase 2 selesai' }
        ]}
      ];
    } else if (t === 'Dashboard internal') {
      phases = [
        { fase: 'Fase 1, Fondasi (minggu 1)', depends: 'Tanpa dependensi', items: [
          { text: 'Layout dashboard (' + flat(a.layoutPref) + ')', est: 'M', depends: 'Tanpa dependensi' },
          { text: 'Auth peran: ' + flat(lines(a.roles).join(', ') || 'admin, viewer'), est: 'M', depends: 'Tanpa dependensi' },
          { text: 'Koneksi dataset dan refresh scheduler', est: 'M', depends: 'Tanpa dependensi' }
        ]},
        { fase: 'Fase 2, Laporan inti (' + must.length + ' Must have)', depends: 'Butuh Fase 1 selesai', items: core },
        { fase: 'Fase 3, Audit dan ekspor', depends: 'Butuh Fase 2 selesai', items: [
          { text: 'Audit log semua aksi tulis', est: 'M', depends: 'Butuh Fase 2 selesai' },
          { text: 'Export CSV dan PDF laporan', est: 'M', depends: 'Butuh Fase 2 selesai' },
          { text: 'Jadwal laporan otomatis via email', est: 'S', depends: 'Butuh Fase 2 selesai' }
        ]}
      ];
    } else if (t === 'Aplikasi mobile') {
      phases = [
        { fase: 'Fase 1, Fondasi (minggu 1)', depends: 'Tanpa dependensi', items: [
          { text: 'Struktur navigasi mobile (' + flat(a.layoutPref) + ')', est: 'M', depends: 'Tanpa dependensi' },
          { text: 'Penyimpanan lokal + SyncQueue offline', est: 'L', depends: 'Tanpa dependensi' },
          { text: 'Navigasi: ' + flat(a.navStructure || 'tab bawah'), est: 'S', depends: 'Tanpa dependensi' }
        ]},
        { fase: 'Fase 2, Fitur inti (' + must.length + ' Must have)', depends: 'Butuh Fase 1 selesai', items: core },
        { fase: 'Fase 3, Sinkronisasi dan media', depends: 'Butuh Fase 2 selesai', items: [
          { text: 'Sync berkala + retry idempotent', est: 'L', depends: 'Butuh Fase 2 selesai' },
          { text: 'Kompresi dan upload media', est: 'M', depends: 'Butuh Fase 2 selesai' },
          { text: 'Notifikasi push lokal', est: 'S', depends: 'Butuh Fase 2 selesai' }
        ]}
      ];
    } else {
      /* Default: Aplikasi web / Marketplace / tipe tak dikenal. */
      phases = [
        { fase: 'Fase 1, Fondasi (minggu 1)', depends: 'Tanpa dependensi', items: [
          { text: 'Struktur layar dasar (' + flat(a.layoutPref) + ')', est: 'M', depends: 'Tanpa dependensi' },
          { text: 'Model data lokal plus antrean offline', est: 'M', depends: 'Tanpa dependensi' },
          { text: 'Navigasi: ' + flat(a.navStructure || 'utama'), est: 'S', depends: 'Tanpa dependensi' }
        ]},
        { fase: 'Fase 2, Inti (' + must.length + ' Must have)', depends: 'Butuh Fase 1 selesai', items: core },
        { fase: 'Fase 3, Pengalaman (' + flat(a.styleDirection) + ')', depends: 'Butuh Fase 2 selesai', items: [
          { text: 'Visual: ' + flat(a.visualNeeds || 'rapikan kontras dan target sentuh'), est: 'S', depends: 'Butuh Fase 2 selesai' },
          { text: 'Audio: ' + flat(audio.join(', ')), est: 'XS', depends: 'Butuh Fase 2 selesai' },
          { text: 'State kosong, memuat, gagal di semua layar', est: 'M', depends: 'Butuh Fase 2 selesai' }
        ]}
      ];
    }

    /* G3: fase integrasi di-ekor untuk SEMUA productType (bukan hanya default). */
    if (integ.length) {
      phases.push({ fase: 'Fase 3b, Integrasi (' + integ.length + ' layanan)', depends: 'Butuh Fase 2 selesai', items: integ.map(function (x) {
        return { text: 'Integrasi: ' + x, est: estimate(x), depends: 'Butuh Fase 2 selesai' };
      })});
    }
    /* G8: rilis bergantung pada fase yang BARU SAJA dipasang (bukan hardcode
       "Fase 3" yang salah bila 3b Integrasi ikut ada di depannya). */
    var lastFase = phases[phases.length - 1].fase;
    phases.push({ fase: 'Fase 4, Rilis dan uji' + (a.stackPref ? ' (' + flat(a.stackPref) + ')' : ''), depends: 'Butuh ' + lastFase + ' selesai', items: [
      { text: 'Uji offline dan perangkat: ' + flat(integ[0] || 'perangkat target'), est: 'M', depends: 'Butuh ' + lastFase + ' selesai' },
      { text: 'Uji HP RAM kecil dan keyboard penuh', est: 'S', depends: 'Butuh ' + lastFase + ' selesai' },
      { text: 'Kriteria rilis: ' + flat(a.nfr || 'cek NFR langkah 6'), est: 'S', depends: 'Butuh ' + lastFase + ' selesai' }
    ]});
    return phases;
  };
})();
