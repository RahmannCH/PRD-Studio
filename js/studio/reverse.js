/* Reverse-wizard (E): ide bebas → draft jawaban wizard lewat LLM opsional.
   Parser dipisah dari DOM supaya bisa di-unit-test di node tanpa browser. */
(function () {
  var W = typeof window !== 'undefined' ? window : globalThis;
  var SH = W.PrdShared || {};

  /* Field teks (textarea/input): hilang = kosong.
     Field enum (select): nilai kosong TIDAK ditulis balik — biarkan pilihan
     default, supaya hasil AI yang tidak menyebut gaya/layout tidak mengosongkan
     select dan merusak validasi langkah. */
  var TEXT_FIELDS = ['productName', 'problem', 'whyNow', 'primaryUser', 'roles',
    'mustHave', 'shouldHave', 'wontHave', 'mainFlow', 'failFlow', 'navStructure',
    'visualNeeds', 'integrations', 'nfr', 'successMetrics'];
  var ENUM_FIELDS = ['productType', 'industry', 'styleDirection', 'layoutPref', 'stackPref'];
  var ARR_FIELDS = ['platform', 'audio'];

  var SYSTEM = [
    'Kamu adalah asisten wawancara produk berbahasa Indonesia.',
    'Dari ide pengguna, isi kerangka wawancara produk secara jujur dan konkret.',
    'Balas HANYA dengan satu objek JSON valid tanpa teks lain, tanpa komentar, tanpa fence markdown.',
    'Kunci JSON persis: ' + TEXT_FIELDS.concat(ENUM_FIELDS, ARR_FIELDS).join(', ') + '.',
    'Nilai teks berupa string (boleh pakai \\n untuk daftar per baris).',
    'platform dan audio berupa array of string.',
    'Untuk kunci enum (' + ENUM_FIELDS.join(', ') + '), pilih satu nilai yang paling cocok dari pilihan umum produk web/mobile; kalau benar-benar tidak tahu, kosongkan string-nya.',
    'Jangan mengarang angka target atau klaim yang tidak ada di ide.',
    'Kosongkan string bila ide tidak memuat informasinya.'
  ].join(' ');

  function buildUser(ide) {
    return 'Ide produk (2-6 kalimat):\n' + String(ide || '').trim() + '\n\nIsi JSON wawancara untuk ide di atas.';
  }

  /* Buang fence ```json ... ``` yang sering ditambah model walau dilarang. */
  function stripFence(raw) {
    var t = String(raw == null ? '' : raw).trim();
    t = t.replace(/^```(?:json)?\s*/i, '');
    t = t.replace(/\s*```$/, '');
    return t.trim();
  }

  function toArr(v) {
    if (Array.isArray(v)) {
      var out = [];
      v.forEach(function (x) {
        var s = (x == null ? '' : String(x)).trim();
        if (s && out.indexOf(s) < 0) out.push(s);
      });
      return out;
    }
    if (v == null) return [];
    var s = String(v).trim();
    if (!s) return [];
    return SH.lines ? SH.lines(s) : s.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
  }

  /* Parse ketat: bukan objek JSON → melempar (pemanggil menampilkan error di
     modal sehingga teks ide tetap bisa disalin pengguna). */
  function parse(raw) {
    var t = stripFence(raw);
    var j;
    try { j = JSON.parse(t); }
    catch (e) { throw new Error('Balasan AI bukan JSON yang valid. Salin teks ide dari modal sebelum menutupnya.'); }
    if (!j || typeof j !== 'object' || Array.isArray(j)) {
      throw new Error('Balasan AI bukan objek JSON. Coba lagi atau isi langkah manual.');
    }
    var out = {};
    TEXT_FIELDS.forEach(function (f) { out[f] = j[f] == null ? '' : String(j[f]).trim(); });
    ENUM_FIELDS.forEach(function (f) { out[f] = j[f] == null ? '' : String(j[f]).trim(); });
    ARR_FIELDS.forEach(function (f) { out[f] = toArr(j[f]); });
    return out;
  }

  W.ReverseWizard = {
    TEXT_FIELDS: TEXT_FIELDS,
    ENUM_FIELDS: ENUM_FIELDS,
    ARR_FIELDS: ARR_FIELDS,
    SYSTEM: SYSTEM,
    buildUser: buildUser,
    stripFence: stripFence,
    parse: parse
  };
})();
