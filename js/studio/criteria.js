/* Criteria: EARS-lite untuk Spec Pack. Mengubah kriteria cerita menjadi
   kalimat berpola KETIKA/JIKA/SELAMA/DI MANA + SISTEM HARUS supaya bisa
   diuji, lalu menandai kata kabur yang membuat kriteria tidak terukur
   (lihat CONTEXT.md "Kriteria EARS-lite" dan "Kata kabur").

   Lima tipe EARS dipetakan ke kata pemicu Indonesia:
     event     : KETIKA   (ketika, saat, when)
     kondisional: JIKA    (jika, bila, kalau, apabila, if)
     keadaan   : SELAMA   (selama, while)
     opsional  : DI MANA  (di mana, where)
     default   : KETIKA <peran> <aksi> saat kriteria tidak menyebut pemicu

   Interface:
     Criteria.toEars(teks, {role, action}) -> satu kalimat EARS-lite
     Criteria.vagueWords(teks) -> daftar kata kabur yang ditemukan
     Criteria.lint(daftar) -> {bersih: [...], kabur: [{teks, kata}]}
*/
window.Criteria = (function () {
  /* Urutan penting: "di mana" dicek sebelum "where/while" agar frasa
     Indonesia tidak terpotong. Pemetaan keyword memakai kata pertama saja. */
  var TRIGGERS = [
    ['ketika', 'KETIKA'], ['saat', 'KETIKA'], ['when', 'KETIKA'],
    ['jika', 'JIKA'], ['bila', 'JIKA'], ['kalau', 'JIKA'], ['apabila', 'JIKA'], ['if', 'JIKA'],
    ['selama', 'SELAMA'], ['while', 'SELAMA'],
    ['di mana', 'DI MANA'], ['where', 'DI MANA']
  ];
  /* Kata sifat tanpa angka yang lolos validator tapi tidak bisa diuji.
     Daftar sengaja pendek dan spesifik; lint bersifat saran, bukan gerbang. */
  var VAGUE = ['cepat', 'lambat', 'mudah', 'nyaman', 'modern', 'menarik', 'cantik',
    'canggih', 'inovatif', 'intuitif', 'ramah', 'mulus', 'lancar', 'optimal',
    'fleksibel', 'simpel', 'banyak', 'sedikit', 'sering', 'jarang'];

  function sent(s) {
    var t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
    if (!t) return t;
    if (/[.,!?]$/.test(t)) t = t.slice(0, -1);
    return t;
  }
  function vagueWords(text) {
    var t = String(text == null ? '' : text).toLowerCase();
    var found = [];
    VAGUE.forEach(function (w) {
      if (new RegExp('\\b' + w + '\\b', 'i').test(t) && found.indexOf(w) < 0) found.push(w);
    });
    if (/\buser[- ]friendly\b/.test(t) && found.indexOf('user-friendly') < 0) found.push('user-friendly');
    return found;
  }
  /* Kalimat yang sudah memuat SISTEM HARUS/SHALL tidak ditulis ulang:
     toEars harus idempoten supaya aman dipanggil dua kali. */
  function hasModal(t) { return /SISTEM HARUS|\bSHALL\b/i.test(t); }
  function toEars(text, ctx) {
    var t = sent(text);
    if (!t) return '';
    if (hasModal(t)) return t + '.';

    /* Pemicu di awal kalimat: "ketika pembayaran gagal, tampilkan alasan"
       -> "KETIKA pembayaran gagal, SISTEM HARUS menampilkan alasan." */
    for (var i = 0; i < TRIGGERS.length; i++) {
      var w = TRIGGERS[i][0];
      var re = new RegExp('^' + w.replace(' ', '\\s+') + '\\b[\\s,]*', 'i');
      if (re.test(t)) {
        var rest = t.replace(re, '');
        /* Pemisah kondisi dan respons: koma, titik koma, atau penghubung
           "maka"/"then". Tanpa pemisah, seluruh sisa dianggap kondisi. */
        var m = /^(.+?)(?:,|;|\s+maka\s+|\s+then\s+)(.+)$/i.exec(rest);
        if (m) {
          var cond = m[1].trim();
          var resp = m[2].replace(/^[\s,;]+/, '').trim();
          if (cond && resp) return TRIGGERS[i][1] + ' ' + cond + ', SISTEM HARUS ' + resp + '.';
        }
        return TRIGGERS[i][1] + ' ' + rest.replace(/^[\s,;]+/, '').trim() + ', SISTEM HARUS memenuhi kriteria ini.';
      }
    }
    /* Tanpa pemicu: rakit dari konteks cerita. */
    var role = ctx && ctx.role ? sent(ctx.role) : '';
    var action = ctx && ctx.action ? sent(ctx.action) : '';
    if (role && action) return 'KETIKA ' + role + ' ' + action + ', SISTEM HARUS ' + t + '.';
    if (action) return 'KETIKA ' + action + ', SISTEM HARUS ' + t + '.';
    return 'SISTEM HARUS ' + t + '.';
  }
  function lint(list) {
    var out = { bersih: [], kabur: [] };
    (list || []).forEach(function (x) {
      var t = String(x == null ? '' : x).trim();
      if (!t) return;
      var v = vagueWords(t);
      if (v.length) out.kabur.push({ teks: t, kata: v });
      else out.bersih.push(t);
    });
    return out;
  }

  return { toEars: toEars, vagueWords: vagueWords, lint: lint, TRIGGERS: TRIGGERS, VAGUE: VAGUE };
})();
