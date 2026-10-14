/* Prompt chain P0-P9 dengan variabel peran dan gaya yang bisa diedit user. */
(function () {
  function ctx(a) {
    function arr(v) { return String(v || '-').split('\n').map(function (x) { return x.trim(); }).filter(Boolean).join('; '); }
    var platform = Array.isArray(a.platform) ? a.platform : [];
    return 'Konteks produk: "' + (a.productName || '-') + '" (' + (a.productType || '-') +
      ') untuk ' + (a.primaryUser || '-') + '. Platform: ' + platform.join(', ') +
      '. Must: ' + arr(a.mustHave) + '. Wont: ' + arr(a.wontHave) + '.';
  }
  window.GenPrompts = function (a, prd, vars) {
    vars = vars || {};
    var role = vars.role || 'senior engineer dan PM';
    var tone = vars.tone || 'ringkas dan biner';
    var target = vars.target || 'tim engineering lokal';
    var format = vars.format || 'Markdown';
    var audio = Array.isArray(a.audio) ? a.audio : [];
    var c = ctx(a);
    /* G10: prd bisa undefined/null dari pemanggil lama; potong aman. */
    var prdHead = String(prd || '').slice(0, 4000);
    function head(extra) {
      return 'Kamu adalah ' + role + '. Jawab ' + tone + ' untuk ' + target + ' dalam format ' + format + '. ' + c + (extra ? ' ' + extra : '');
    }
    return [
      { id: 'P0', title: 'Buka sesi dan tanam konteks', gate: null, body: head('Baca PRD berikut sampai paham, jangan coding dulu.') + '\n\nPRD:\n' + prdHead + '\n\nBalas dengan ringkasan 5 bullet dan 3 pertanyaan paling penting sebelum coding.' },
      { id: 'P1', title: 'Verifikasi PRD dan tutup celah', gate: null, body: head('Periksa PRD di atas.') + ' Cari: asumsi tanpa dasar, kriteria tidak biner, alur gagal hilang, scope merembet. Keluarkan tabel GAP | DAMPAK | PERBAIKAN, lalu tulis ulang bagian yang cacat saja.' },
      { id: 'P2', title: 'Ekstrak fitur MoSCoW', gate: null, body: head() + ' Ubah PRD jadi fitur F1..Fn Must, Should, Won\'t. Tiap Must punya acceptance biner (angka, state, pesan error).' },
      { id: 'P3', title: 'Tetapkan rules coding', gate: null, body: head() + ' Tulis RULES.md singkat: struktur folder, konvensi nama, simpan offline plus idempotency, aksesibilitas (kontras 4.5:1, keyboard Tab/Escape, target 44px). Stack: ' + (a.stackPref || '-') + '. Rules ini mengikat semua langkah berikut.' },
      { id: 'P4', title: 'Pecah jadi task berurutan', gate: null, body: head() + ' Pecah Must jadi task T1..Tn berurutan dengan dependensi. Format: ID | JUDUL | FILE YANG DISENTUH | VERIFIKASI (perintah build/test plus exit 0). Estimasi XS-L.' },
      { id: 'P5', title: 'Kerjakan fondasi (Fase 1)', gate: 'P4', body: head() + ' Kerjakan hanya task fondasi: struktur layar ' + (a.layoutPref || '-') + ', navigasi ' + (a.navStructure || '-') + ', model lokal. Satu task per respons. Akhiri dengan perintah verifikasi dan file yang diubah.' },
      { id: 'P6', title: 'Kerjakan fitur inti satu per satu', gate: 'P5', body: head() + ' Kerjakan satu Must sesuai urutan P4. Jangan lompat. Untuk tiap fitur tunjukkan kode, cara uji manual 3 langkah, dan bukti kriteria biner terpenuhi.' },
      { id: 'P7', title: 'Poles pengalaman visual dan audio', gate: 'P6', body: head() + ' Terapkan gaya ' + (a.styleDirection || '-') + ' dan audio ' + audio.join(', ') + '. Visual: ' + (a.visualNeeds || '-') + '. Pastikan empty, loading, error state ada di tiap layar. Jangan ubah logika inti.' },
      { id: 'P8', title: 'Uji NFR dan integrasi', gate: 'P7', body: head() + ' Uji: ' + (a.nfr || 'performa, offline, keamanan') + '. Integrasi: ' + (a.integrations || '-') + '. Buat daftar cek PASS/FAIL per item dengan bukti perintah atau langkah.' },
      { id: 'P9', title: 'Review akhir sampai 100 persen', gate: 'P8', body: head() + ' Review segar seolah bukan penulis kode. Cek melawan PRD, RULES, keamanan, aksesibilitas. Jika semua lolos tulis SHIP_CHECK_OK plus ringkasan rilis. Jika gagal, tulis perbaikan bernomor, jangan coding ulang otomatis.' }
    ];
  };
})();
