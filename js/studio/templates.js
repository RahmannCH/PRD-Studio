/* Contoh pengisi cepat. Tabel pengetahuan industri pindah ke knowledge.js:
   satu sumber untuk entitas, endpoint, risiko, dan metrik, dipakai bersama
   oleh teks PRD dan diagram ERD. */
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
