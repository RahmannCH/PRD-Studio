/* Coach: pemeriksa kualitas jawaban deterministik, tanpa AI.
   Dua peran:
   1. review(data) : temuan gaya jawaban (kata belum terukur, NFR tanpa
      angka, pengguna terlalu umum) sebagai saran, bukan gerbang. Validator
      tetap satu-satunya gerbang kelulusan.
   2. edge(data)   : celah skenario yang belum dibahas di jawaban (keadaan
      kosong, jaringan mati, hak akses, konflik data, retensi data) sebagai
      pertanyaan lanjutan. Semua pemicu berbasis kata kunci pada jawaban.

   Interface:
     Coach.review(data) -> [{field, step, pesan}]
     Coach.edge(data)   -> [{kode, q, step, field}]
*/
window.Coach = (function () {
  var C = window.Criteria;

  function lines(s) {
    return String(s == null ? '' : s).split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
  }
  var GENERIC_USER = /^(pengguna|user|semua orang|orang|user umum|pengguna umum|pengguna aplikasi)$/i;

  function review(data) {
    var d = data || {};
    var out = [];
    function push(field, step, pesan) { out.push({ field: field, step: step, pesan: pesan }); }

    /* Kata kabur hanya diperiksa di field yang menjadi kriteria/alur/metrik.
       problem dan whyNow adalah narasi, kata seperti "sering" di sana wajar
       dan bukan sinyal jawaban tidak siap. */
    [['mainFlow', 4], ['failFlow', 4], ['nfr', 6], ['successMetrics', 6]].forEach(function (pair) {
      var w = C.vagueWords(d[pair[0]]);
      if (w.length) push(pair[0], pair[1],
        'Kata belum terukur (' + w.join(', ') + '). Ganti dengan angka atau kondisi yang bisa diperiksa.');
    });
    lines(d.mustHave).forEach(function (m) {
      var w = C.vagueWords(m);
      if (w.length) push('mustHave', 3,
        'Must "' + m.slice(0, 48) + '": kata belum terukur (' + w.join(', ') + ').');
    });
    var nfr = String(d.nfr || '').trim();
    if (nfr && !/\d/.test(nfr)) push('nfr', 6, 'NFR belum memuat angka: target waktu, kapasitas, atau lama penyimpanan.');
    var sm = String(d.successMetrics || '').trim();
    if (sm && !/\d/.test(sm)) push('successMetrics', 6, 'Metrik sukses sebaiknya memuat angka target.');
    if (GENERIC_USER.test(String(d.primaryUser || '').trim())) {
      push('primaryUser', 2, 'Pengguna utama masih umum. Sebut peran dan konteks pemakaiannya.');
    }
    return out;
  }

  function edge(data) {
    var d = data || {};
    var blob = [d.mustHave, d.shouldHave, d.mainFlow, d.failFlow, d.nfr,
      d.integrations, d.successMetrics, d.roles].join('\n');
    function has(re) { return re.test(blob); }
    var out = [];
    function ask(kode, q, step, field) { out.push({ kode: kode, q: q, step: step, field: field }); }

    if (has(/stok|daftar|list|riwayat|rekap|antre|pesanan/i) && !has(/kosong|belum ada|awal kali/i)) {
      ask('EMPTY', 'Apa yang tampil saat daftar masih kosong, dan bagaimana cara mengisi data pertama?', 4, 'mainFlow');
    }
    if (!has(/offline|internet|jaringan|koneksi|mati|putus/i)) {
      ask('OFFLINE', 'Apa yang terjadi ke aksi utama bila jaringan mati di tengah jalan?', 4, 'failFlow');
    }
    if (lines(d.roles).length >= 2 && !has(/hak|izin|akses|pin|peran/i)) {
      ask('PERAN', 'Apa yang terjadi bila peran tanpa hak mencoba membuka fitur terlarang?', 2, 'roles');
    }
    if (has(/transaksi|pesanan|absen|pembayaran/i) && !has(/duplikat|ganda|bersamaan|konflik|sinkron/i)) {
      ask('KONFLIK', 'Bagaimana bila dua pengguna mengubah data yang sama nyaris bersamaan?', 4, 'failFlow');
    }
    if (has(/pelanggan|data pengguna|transaksi/i) && !has(/simpan|hapus|retensi|arsip|privasi/i)) {
      ask('DATA', 'Berapa lama data disimpan, siapa yang boleh menghapus, dan apa yang terjadi setelah dihapus?', 6, 'nfr');
    }
    return out;
  }

  return { review: review, edge: edge };
})();
