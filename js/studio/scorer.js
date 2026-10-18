/* Scorer 0-100. Rubrik terbuka: tiap komponen ditampilkan di langkah 7 (scorer.parts).
   Konsistensi skor-gap: TABRAK, SAMAR, dan INTEGRASI memotong skor supaya
   tidak pernah ada "skor 100" selama masih ada gap terbuka yang belum dihitung komponennya.
   Mode kedalaman (ops.hidden = {fieldId:true}): komponen yang seluruh field-nya
   tersembunyi dikeluarkan dari total poin, dan skor dinormalkan ke poin yang
   masih bisa dicapai. Tanpa ops (atau mode penuh), skala tetap 0-100. */
(function () {
  /* C1: helper dipindah ke shared.js (satu sumber kebenaran). */
  var lines = window.PrdShared.lines;
  window.Scorer = function (a, gaps, opts) {
    /* Coerce dulu: truthy non-string jangan melempar .trim(). */
    a = Object.assign({}, a);
    ['productName', 'problem', 'whyNow', 'primaryUser', 'roles',
      'mustHave', 'wontHave', 'mainFlow', 'failFlow', 'navStructure', 'visualNeeds', 'nfr'].forEach(function (k) {
      a[k] = a[k] == null ? '' : String(a[k]);
    });
    var hidden = (opts && opts.hidden) || {};
    function visible(fields) {
      return fields.some(function (f) { return !hidden[f]; });
    }
    var score = 0;
    var possible = 0;
    var parts = [];
    /* fields = field wizard yang menopang komponen ini; komponen dengan
       seluruh field tersembunyi tidak dihitung sama sekali. */
    function add(name, pts, got, fields) {
      if (fields && !visible(fields)) return;
      possible += pts;
      got = Math.max(0, Math.min(pts, got));
      score += got;
      parts.push({ name: name, pts: got + '/' + pts });
    }
    add('Nama dan masalah', 20,
      (a.productName.trim().length >= 3 ? 7 : 0) +
      (a.problem.trim().length >= 20 ? 8 : 0) +
      (a.whyNow.trim() ? 5 : 0),
      ['productName', 'problem', 'whyNow']);
    add('Persona dan peran', 15,
      (a.primaryUser.trim() ? 8 : 0) + (lines(a.roles).length ? 7 : 0),
      ['primaryUser', 'roles']);
    var must = lines(a.mustHave);
    add('Must biner', 20,
      (must.length >= 3 ? 10 : Math.round(must.length / 3 * 10)) +
      (must.filter(function (m) { return m.length >= 8; }).length >= 3 ? 10 : 0),
      ['mustHave']);
    add('Alur dan gagal', 15,
      (a.mainFlow.trim() ? 6 : 0) + (a.failFlow.trim() ? 6 : 0) + (a.navStructure.trim() ? 3 : 0),
      ['mainFlow', 'failFlow', 'navStructure']);
    add('NFR terukur', 15,
      (!a.nfr.trim() ? 0 : (/\d/.test(a.nfr) ? 15 : 7)),
      ['nfr']);
    add('Out of scope tegas', 15,
      (lines(a.wontHave).length ? 10 : 0) + (a.visualNeeds.trim() ? 5 : 0),
      ['wontHave', 'visualNeeds']);

    var g = gaps || [];
    var clash = g.filter(function (x) { return x.code === 'TABRAK'; }).length;
    var samar = g.filter(function (x) { return x.code === 'SAMAR'; }).length;
    var integr = g.filter(function (x) { return x.code === 'INTEGRASI'; }).length;
    var pendek = g.filter(function (x) { return x.code === 'MUST-PENDEK'; }).length;
    var klinik = g.filter(function (x) { return x.code === 'KLINIK'; }).length;
    var payment = g.filter(function (x) { return x.code === 'PAYMENT'; }).length;
    var metrik = g.filter(function (x) { return x.code === 'METRIK'; }).length;
    var penalty = clash * 5 + Math.min(samar, 3) * 2 + integr * 3 + pendek * 3 + klinik * 4 + payment * 3 + Math.min(metrik, 1) * 2;
    if (penalty > 0) parts.push({ name: 'Penalti gap (tabrak/samar/integrasi/pendek/klinik/payment/metrik)', pts: '-' + penalty });
    score = Math.max(0, Math.min(100, score - penalty));
    /* Mode kedalaman: skor dinormalkan ke poin yang masih bisa dicapai
       (mode cepat tidak menuntut NFR/metrik/di-luar-scope). Transparan
       lewat parts supaya angka tidak jatuh dari langit. */
    if (possible > 0 && possible < 100) {
      score = Math.round(score / possible * 100);
      parts.push({ name: 'Skala mode kedalaman', pts: 'dari ' + possible + ' poin yang tampil' });
    }
    /* B1: hard-rule gagal = skor DIPATOK di bawah gerbang generate (60).
       Tanpa ini, mustHave kosong tetap menembus 80 "Siap susun" sementara
       tombol Susun menolak — meter dan aksi saling menyalahkan pengguna. */
    var hardFail = g.some(function (x) { return x.code === 'NAMA' || x.code === 'MASALAH' || x.code === 'MUST3'; });
    if (hardFail && score > 59) {
      score = 59;
      parts.push({ name: 'Batas hard-rule (nama/masalah/must)', pts: 'di bawah 60' });
    }
    var level = hardFail ? 'Perlu lengkapi' : (score >= 80 ? 'Siap susun' : (score >= 60 ? 'Hampir siap' : 'Belum siap'));
    return { score: score, parts: parts, level: level };
  };
})();
