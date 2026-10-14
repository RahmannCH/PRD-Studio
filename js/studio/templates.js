/* Contoh pengisi cepat + tabel spesifikasi industri untuk generator PRD.
   Tiap industri menyesuaikan metrik, model data, risiko, dan aturan API.
   Field {roles} pada model diganti daftar peran user saat generate. */
window.StudioSample = {
  productName: 'Kasir Warung Pintar',
  productType: 'Aplikasi web',
  industry: 'Retail & F&B',
  problem: 'Pemilik warung mencatat transaksi di buku tulis, struk sering hilang dan rekap harian memakan 1 jam tiap malam.',
  whyNow: 'Ada 20 warung mitra yang menunggu versi digital bulan depan untuk laporan ke koperasi.',
  primaryUser: 'Ibu pemilik warung 35-50 tahun, pakai HP Android RAM 2GB, tidak terbiasa menu rumit.',
  platform: ['Web responsif', 'Android'],
  roles: 'Pemilik\nKasir\nPelanggan (terima struk via WhatsApp)',
  mustHave: 'Catat transaksi offline dan sinkron saat online\nCetak struk thermal 58mm\nRekap harian otomatis\nKelola stok sederhana',
  shouldHave: 'Grafik mingguan\nExport Excel\nPIN terpisah untuk kasir',
  wontHave: 'Tidak ada pembayaran online di v1\nTidak ada multi cabang\nTidak ada loyalty poin',
  mainFlow: '1 Buka layar Kasir, 2 ketuk barang atau ketik harga, 3 terima uang, 4 cetak atau kirim struk, 5 stok berkurang otomatis',
  failFlow: 'Listrik atau internet mati: transaksi tetap tersimpan lokal dengan status antre, lalu sinkron otomatis dan tandai ganda jika duplikat.',
  navStructure: 'Kasir, Stok, Laporan, Pengaturan',
  styleDirection: 'Bersih profesional terang',
  layoutPref: 'Satu layar kasir fokus',
  visualNeeds: 'Tombol besar minimal 48px, ikon keranjang dan printer yang jelas, foto barang dari kamera HP, tanpa ilustrasi stok.',
  audio: ['Bunyi klik kasir (SFX)'],
  stackPref: 'HTML CSS JS vanilla',
  integrations: 'Printer thermal XPrinter via USB atau Bluetooth\nWhatsApp untuk kirim struk teks',
  nfr: 'Buka di RAM 2GB di bawah 3 detik, 100 persen transaksi offline tersimpan, PIN 4 digit untuk kasir, kontras teks minimal 4.5:1.',
  successMetrics: 'Waktu catat transaksi di bawah 30 detik\nRekap harian otomatis tanpa hitung manual\nStruk terkirim 100 persen (cetak atau WhatsApp)'
};

window.IndustrySpec = {
  'Retail & F&B': {
    metrics: [
      'Rekap harian selesai di bawah 5 menit pada jam tutup.',
      'Selisih stok fisik vs sistem di bawah 1 persen per minggu.',
      'Transaksi puncak jam sibuk tercatat tanpa antrean antrian input.'
    ],
    model: '- Kasir (id, nama, pin_hash, aktif)\n- Item (id, nama, barcode, harga, stok)\n- Transaksi (id, waktu, kasir_id, total, status: tersimpan/antre/terkirim)\n- TransaksiItem (transaksi_id, item_id, jumlah, harga_satuan)\nRelasi: Kasir 1-N Transaksi, Transaksi N-M Item lewat TransaksiItem. Tulis offline masuk antrean dengan idempotency_key.',
    risk: 'Printer putus di jam sibuk, HP kehabisan daya, stok ketik salah. Mitigasi: antrean cetak ulang, mode hemat baterai, konfirmasi stok setelah simpan.',
    api: '- POST /transactions (idempotency-key wajib, total dihitung server)\n- GET /stock?date=YYYY-MM-DD (rekap stok harian)\n- POST /print/retry (cetak ulang struk terakhir)\n- Aturan: harga tidak boleh berubah di klien, respons gagal menyertakan kode sebab.'
  },
  'Jasa & agency': {
    metrics: [
      'Booking jasa selesai di bawah 4 menit tanpa bentrok jadwal.',
      '0 permintaan hilang: semua masuk daftar tindak lanjut berstatus.',
      'Review klien dikumpulkan untuk 100 persen pekerjaan yang selesai.'
    ],
    model: '- Klien (id, nama, kontak, catatan)\n- Jasa (id, nama, durasi, harga)\n- Booking (id, klien_id, jasa_id, jadwal, status: minta/konfirmasi/selesai/batal)\n- Tagihan (booking_id, jumlah, status: belum/lunas)\nRelasi: Klien 1-N Booking, Booking 1-1 Tagihan.',
    risk: 'Jadwal double-book, revisi tak terbatas, klien batal mendadak. Mitigasi: kunci jadwal saat konfirmasi, batas revisi tertulis, daftar tunggu otomatis.',
    api: '- POST /bookings (tolak bentrok jadwal, balas kode BENTROK)\n- PATCH /bookings/:id/status\n- GET /agenda?from=YYYY-MM-DD&to=YYYY-MM-DD\n- Aturan: jadwal divalidasi server terhadap zona waktu, respons gagal menyertakan kode sebab.'
  },
  'SaaS internal': {
    metrics: [
      'Alur kerja inti selesai di bawah 5 menit oleh staf baru dalam 3 hari.',
      'Semua perubahan data tercatat di audit log siapa-apa-kapan.',
      'Waktu muat halaman kerja di bawah 2 detik pada jaringan kantor.'
    ],
    model: '- Akun (id, email, peran: {roles}, pin_hash)\n- Proyek (id, nama, pemilik_id, status)\n- Tugas (id, proyek_id, penanggung, tenggat, status)\n- AuditLog (id, aktor_id, aksi, target, waktu)\nRelasi: Akun 1-N Proyek, Proyek 1-N Tugas, semua tulis tercatat di AuditLog.',
    risk: 'Hak akses salah tetap, data internal bocor lewat tautan, migrasi skema gagal. Mitigasi: cek peran di tiap endpoint, tautan berumur pendek, migrasi berversi.',
    api: '- GET /tasks?assignee=me&status=open\n- POST /tasks (validasi peran pemilik proyek)\n- GET /audit?aktor=&dari=YYYY-MM-DD\n- Aturan: semua baca tulis melewati otorisasi peran, respons gagal menyertakan kode sebab.'
  },
  'Marketplace & konten': {
    metrics: [
      'Checkout pengguna baru selesai di bawah 3 menit.',
      'Nol order hilang: setiap order punya status terlacak dari bayar sampai terkirim.',
      'Stok tidak pernah negatif walau dua pembeli bersamaan.'
    ],
    model: '- Penjual (id, nama, kontak, rating)\n- Produk (id, penjual_id, nama, harga, stok)\n- Pesanan (id, pembeli, total, status: bayar/kirim/selesai)\n- PesananItem (pesanan_id, produk_id, jumlah, harga)\n- Pembayaran (pesanan_id, metode, status)\nRelasi: Penjual 1-N Produk, Pesanan N-M Produk lewat PesananItem.',
    risk: 'Pesanan ganda saat klik lambat, stok race condition, penjual telat membalas. Mitigasi: kunci stok transaksional, idempotency checkout, pengingat status otomatis.',
    api: '- POST /orders (idempotency-key, kunci stok transaksional)\n- POST /orders/:id/pay (status pembayaran dipegang server)\n- GET /orders/:id/track\n- Aturan: harga dan stok selalu divalidasi server, respons gagal menyertakan kode sebab.'
  },
  'Layanan publik & klinik': {
    metrics: [
      'Waktu tunggu layanan di bawah 15 menit pada 80 persen kunjungan.',
      'Semua nomor antrean terlacak: nol pasien terlewat tanpa catatan.',
      'Data sensitif hanya terbaca oleh petugas yang ditugasi.'
    ],
    model: '- Petugas (id, nama, peran: {roles}, aktif)\n- Layanan (id, nama, loket, estimasi_menit)\n- Antrean (id, layanan_id, nomor, status: menunggu/dipanggil/selesai/batal, waktu)\n- Kunjungan (antrean_id, data_klien, catatan_klinis terenkripsi)\nRelasi: Layanan 1-N Antrean, Antrean 1-1 Kunjungan. Catatan klinis terpisah dari data antrean.',
    risk: 'Nomor antrean hilang saat listrik mati, data sensitif bocor, loket salah panggil. Mitigasi: antrean tersimpan lokal lalu sinkron, enkripsi data klinis, konfirmasi petugas sebelum panggil.',
    api: '- POST /antrean (ambil nomor, idempotency per kunjungan)\n- POST /antrean/:id/panggil (hanya peran petugas)\n- GET /antrean/antrian?layanan=\n- Aturan: data klinis tidak ikut di daftar antrean, respons gagal menyertakan kode sebab.'
  }
};
