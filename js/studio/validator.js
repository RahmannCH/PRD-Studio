/* Validator: temukan gap konkret dengan kode, pesan, langkah, dan field terkait.
   Perbaikan: SAMAR per-baris, TABRAK dedupe + negasi longgar (cek di mana saja
   dalam baris, bukan hanya prefiks), INTEGRASI/PAYMENT bebas false-positive
   dari baris bernegasi, plus gap types baru (klinik compliance, payment tanpa
   provider, metrik sukses kosong). */
(function () {
  /* C1: helper dipindah ke shared.js (satu sumber kebenaran).
     Varian ini juga membuang awalan bullet, sehingga "- M1 ..." dihitung
     sebagai "M1 ..." — panjang/pesan gap tidak lagi bengkok oleh format. */
  var lines = window.PrdShared.lines;
  var VAGUE = ['segera', 'cepat', 'aman', 'mudah', 'bagus', 'optimal', 'canggih',
    'lengkap', 'terbaik', 'efisien', 'ringan', 'responsif'];
  /* Negasi longgar: kata penegas di MANA SAJA dalam baris menandai "bukan konflik".
     "di luar" TIDAK termasuk: "Cetak struk fisik di luar v1" adalah tabrak nyata
     (must "Cetak struk ..."), bukan negasi. Negasi sejati memakai "tidak ada",
     "tanpa", "bukan", "exclude", dll. */
  var NEG = /\b(tidak|belum|bukan|tanpa|no\b|exclude|out of scope|bukan bagian|nanti saja|tidak ada|tidak menyediakan)\b/i;
  var STOP = {};
  ('yang di ke dari untuk dengan dan atau ini itu ada tidak bisa harus akan pada oleh saat supaya agar biar ' +
    'lebih juga saja baru lama semua setiap para kami kita anda kamu dia mereka saya sangat hampir sekitar ' +
    'antara dalam luar seperti misal contoh yaitu adalah merupakan').split(' ').forEach(function (w) { STOP[w] = true; });
  function contentWords(s) {
    return String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter(function (w) {
      return w.length >= 4 && !STOP[w];
    });
  }
  function vagueIn(text) {
    var low = String(text || '').toLowerCase();
    var found = [];
    VAGUE.forEach(function (w) {
      var re = new RegExp('\\b' + w + '\\b');
      if (re.test(low)) found.push(w);
    });
    return found;
  }
  window.Validator = function (a) {
    /* Coerce dulu: truthy non-string (impor/legacy) jangan melempar .trim(). */
    a = Object.assign({}, a);
    ['productName', 'productType', 'problem', 'whyNow', 'primaryUser', 'roles',
      'mustHave', 'shouldHave', 'wontHave', 'mainFlow', 'failFlow', 'navStructure',
      'visualNeeds', 'nfr', 'integrations', 'successMetrics', 'industry'].forEach(function (k) {
      a[k] = a[k] == null ? '' : String(a[k]);
    });
    var gaps = [];
    var seen = {};
    function gap(code, step, msg, field) {
      var k = code + '|' + (field || '') + '|' + msg;
      if (seen[k]) return;
      seen[k] = true;
      gaps.push({ code: code, step: step, msg: msg, field: field || '' });
    }

    if (!a.productName || a.productName.trim().length < 3)
      gap('NAMA', 1, 'Nama produk kurang dari 3 karakter.', 'productName');
    if (!a.problem || a.problem.trim().length < 20)
      gap('MASALAH', 1, 'Masalah utama kurang dari 20 karakter. Tulis siapa rugi apa.', 'problem');
    if (!a.whyNow || !a.whyNow.trim())
      gap('WHYNOW', 1, 'Alasan sekarang kosong. Tulis tenggat atau pemicu nyata.', 'whyNow');
    if (!a.primaryUser || !a.primaryUser.trim())
      gap('PERSONA', 2, 'Persona kosong. Tulis satu kalimat: siapa, umur, perangkat.', 'primaryUser');
    if (!lines(a.roles).length)
      gap('PERAN', 2, 'Peran pengguna kosong. Minimal 1 baris.', 'roles');

    var must = lines(a.mustHave);
    if (must.length < 3)
      gap('MUST3', 3, 'Must have baru ' + must.length + ', butuh minimal 3.', 'mustHave');
    must.forEach(function (m, i) {
      if (m.length < 8)
        gap('MUST-PENDEK', 3, 'M' + (i + 1) + ' terlalu pendek: "' + m.slice(0, 30) + '". Tambah objek dan ukuran.', 'mustHave');
    });
    if (!lines(a.wontHave).length)
      gap('WONT', 3, 'Won\'t kosong. Tulis minimal 1 yang tegas di luar v1 agar scope tidak merembet.', 'wontHave');
    var wontLines = lines(a.wontHave);
    /* TABRAK: cocokkan kata KONTEN bersama (>=2), bukan bigram posisional.
       Bigram generik ("sistem ini") memicu false positive; urutan terbalik
       ("Struk dicetak" vs "Cetak struk") luput. Negasi dicek di seluruh baris. */
    must.forEach(function (m) {
      var mWords = contentWords(m);
      if (mWords.length < 2) return;
      var real = wontLines.some(function (w) {
        if (NEG.test(w)) return false;
        var wSet = contentWords(w);
        var shared = 0;
        for (var i = 0; i < mWords.length; i++) {
          if (wSet.indexOf(mWords[i]) > -1) shared++;
        }
        return shared >= 2;
      });
      if (real)
        gap('TABRAK', 3, 'Must "' + m.slice(0, 30) + '" bertabrakan dengan Won\'t. Tegaskan salah satu.', 'mustHave');
    });

    if (!a.mainFlow || !a.mainFlow.trim())
      gap('ALUR', 4, 'Alur utama kosong.', 'mainFlow');
    if (!a.failFlow || !a.failFlow.trim())
      gap('GAGAL', 4, 'Jalur gagal kosong. Tulis apa yang tersimpan dan tombol ulangi.', 'failFlow');
    if (!a.navStructure || !a.navStructure.trim())
      gap('NAV', 4, 'Navigasi kosong.', 'navStructure');
    if (!a.visualNeeds || !a.visualNeeds.trim())
      gap('VISUAL', 5, 'Kebutuhan visual kosong. Tulis ukuran target sentuh atau sumber gambar.', 'visualNeeds');

    var nfr = a.nfr;
    if (!nfr.trim())
      gap('NFR', 6, 'NFR kosong. Tulis minimal waktu buka atau aturan offline.', 'nfr');
    else if (!/\d/.test(nfr))
      gap('NFR-ANGKA', 6, 'NFR tanpa angka. Tambah detik, persen, atau jumlah (contoh: di bawah 3 detik).', 'nfr');

    if (!lines(a.successMetrics).length)
      gap('METRIK', 6, 'Metrik sukses kosong. Tulis minimal 1 angka target (konversi, waktu muat, jumlah order).', 'successMetrics');

    var vagueSeen = {};
    function scanVague(text, step, label, field) {
      lines(text).forEach(function (line) {
        if (/\d/.test(line)) return;
        vagueIn(line).forEach(function (w) {
          /* Key per-field (bukan step): kata sama di problem dan whyNow
             keduanya langkah 1 tapi field berbeda — keduanya harus terlapor. */
          var k = w + '@' + field;
          if (vagueSeen[k]) return;
          vagueSeen[k] = true;
          gap('SAMAR', step, 'Kata "' + w + '" di ' + label + ' tanpa angka pendukung. Ganti dengan ukuran.', field);
        });
      });
    }
    scanVague(a.problem, 1, 'masalah utama', 'problem');
    scanVague(a.whyNow, 1, 'alasan sekarang', 'whyNow');
    scanVague(a.mustHave, 3, 'must have', 'mustHave');
    scanVague(a.nfr, 6, 'NFR', 'nfr');

    /* INTEGRASI/PAYMENT: scan semua kolom yang mungkin menyebut perangkat
       atau layanan; baris bernegasi ("tanpa payment gateway di v1") di-skip
       agar tidak memicu gap palsu. \b pada SETIANG alternative. */
    var DEV = /\b(printer|whatsapp|payment|pembayaran|qris|gps|kamera|push|bluetooth|usb)\b/i;
    var PAY = /\b(payment|pembayaran|qris|midtrans|xendit|stripe)\b/i;
    var allScan = [a.mustHave, a.shouldHave, a.nfr, a.mainFlow, a.failFlow, a.visualNeeds].join('\n');
    var devMention = false, payMention = false;
    lines(allScan).forEach(function (line) {
      if (NEG.test(line)) return;
      if (DEV.test(line)) devMention = true;
      if (PAY.test(line)) payMention = true;
    });
    var integrationsLow = a.integrations.toLowerCase();
    var hasIntegrations = lines(a.integrations).length > 0;
    if (devMention && !hasIntegrations)
      gap('INTEGRASI', 6, 'Jawaban menyebut perangkat atau layanan tapi kolom integrasi kosong.', 'integrations');

    /* Gap types: compliance klinik + payment tanpa provider.
       KLINIK: case-insensitive, terima "sensitif" tanpa spasi leading. */
    if (a.industry === 'Layanan publik & klinik' && !/enkripsi|sensitif|privasi|hipaa|pdp\b/i.test(nfr))
      gap('KLINIK', 6, 'Industri klinik/publik: NFR harus menyebut enkripsi atau privasi data sensitif.', 'nfr');
    if (payMention && !/midtrans|xendit|stripe|qris|payment gateway/i.test(integrationsLow))
      gap('PAYMENT', 6, 'Fitur bayar disebut tapi provider/integrasi pembayaran belum ditulis.', 'integrations');

    return gaps;
  };
})();
