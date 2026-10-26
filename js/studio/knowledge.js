/* Satu sumber pengetahuan domain PRD Studio.
   Sebelumnya pengetahuan yang sama ditulis berulang: model data di templates.js,
   ERD di diagrams.js, endpoint dan risiko di generator-prd.js. Ketiganya bisa
   berbeda diam-diam. Mulai sekarang semuanya didefinisikan SEKALI di sini dalam
   bentuk data, lalu diturunkan ke teks PRD dan ke kode Mermaid oleh fungsi di
   bawah. Menambah industri cukup memanggil Knowledge.registerIndustry. */
(function () {
  /* ---------------------------------------------------------------------
     Aturan baku lintas produk. Dulu kalimat-kalimat ini disalin ke bagian 7,
     9, dan 11 generator. Sekarang satu definisi.
     --------------------------------------------------------------------- */
  var RULES = {
    a11y: [
      'target sentuh minimal 44px',
      'fokus keyboard terlihat',
      'tanpa tombol mati'
    ],
    nfr: [
      'kontras teks 4.5:1',
      'keyboard penuh (Tab, Enter, Escape)',
      'responsif 360px sampai desktop tanpa scroll horizontal'
    ],
    data: [
      'total dan harga dihitung server',
      'respons gagal menyertakan kode sebab'
    ],
    offline: [
      'antrean lokal memakai idempotency_key',
      'sinkron ganda tidak menghasilkan duplikat'
    ]
  };

  /* ---------------------------------------------------------------------
     Bentuk entitas (dipakai bersama oleh teks bagian 10 dan ERD Mermaid):
       { label, erd?, fields:[{n, t, v?, roles?}], rels:[rel], block? }
     rel:
       { to, card:'1-N'|'1-1', verb, md?, erd? }
       { to, card:'N-M', via, viaFields?, verb, back, erd?:'junction'|'direct' }
       { to, card, verb, mdText }        md pakai mdText, ERD tetap normal
       { text, erd:false }               hanya muncul di teks relasi
     --------------------------------------------------------------------- */

  var INDUSTRIES = {
    'Retail & F&B': {
      metrics: [
        'Rekap harian selesai di bawah 5 menit pada jam tutup.',
        'Selisih stok fisik vs sistem di bawah 1 persen per minggu.',
        'Transaksi puncak jam sibuk tercatat tanpa antrean antrian input.'
      ],
      risks: {
        sebab: ['Printer putus di jam sibuk', 'HP kehabisan daya', 'stok ketik salah'],
        mitigasi: ['antrean cetak ulang', 'mode hemat baterai', 'konfirmasi stok setelah simpan']
      },
      entities: [
        { label: 'Kasir', fields: [
          { n: 'id', t: 'string' }, { n: 'nama', t: 'string' },
          { n: 'pin_hash', t: 'string' }, { n: 'aktif', t: 'bool' }
        ], rels: [{ to: 'Transaksi', card: '1-N', verb: 'membuat' }] },
        { label: 'Item', fields: [
          { n: 'id', t: 'string' }, { n: 'nama', t: 'string' }, { n: 'barcode', t: 'string' },
          { n: 'harga', t: 'int' }, { n: 'stok', t: 'int' }
        ], rels: [] },
        { label: 'Transaksi', fields: [
          { n: 'id', t: 'string' }, { n: 'waktu', t: 'date' }, { n: 'kasir_id', t: 'string' },
          { n: 'total', t: 'int' }, { n: 'status', t: 'string', v: 'tersimpan/antre/terkirim' }
        ], rels: [{ to: 'Item', card: 'N-M', via: 'TransaksiItem', viaFields: [
          { n: 'transaksi_id', t: 'string' }, { n: 'item_id', t: 'string' },
          { n: 'jumlah', t: 'int' }, { n: 'harga_satuan', t: 'int' }
        ], verb: 'berisi', back: 'dipesan' }] },
        { label: 'TransaksiItem', fields: [
          { n: 'transaksi_id', t: 'string' }, { n: 'item_id', t: 'string' },
          { n: 'jumlah', t: 'int' }, { n: 'harga_satuan', t: 'int' }
        ], rels: [] }
      ],
      relationsTail: 'Tulis offline masuk antrean dengan idempotency_key.',
      endpoints: {
        list: [
          { m: 'POST', p: '/transactions', guard: 'idempotency-key wajib, total dihitung server' },
          { m: 'GET', p: '/stock?date=YYYY-MM-DD', guard: 'rekap stok harian' },
          { m: 'POST', p: '/print/retry', guard: 'cetak ulang struk terakhir' }
        ],
        rules: ['harga tidak boleh berubah di klien', 'respons gagal menyertakan kode sebab']
      }
    },

    'Jasa & agency': {
      metrics: [
        'Booking jasa selesai di bawah 4 menit tanpa bentrok jadwal.',
        '0 permintaan hilang: semua masuk daftar tindak lanjut berstatus.',
        'Review klien dikumpulkan untuk 100 persen pekerjaan yang selesai.'
      ],
      risks: {
        sebab: ['Jadwal double-book', 'revisi tak terbatas', 'klien batal mendadak'],
        mitigasi: ['kunci jadwal saat konfirmasi', 'batas revisi tertulis', 'daftar tunggu otomatis']
      },
      entities: [
        { label: 'Klien', fields: [
          { n: 'id', t: 'string' }, { n: 'nama', t: 'string' },
          { n: 'kontak', t: 'string' }, { n: 'catatan', t: 'string' }
        ], rels: [{ to: 'Booking', card: '1-N', verb: 'memesan' }] },
        { label: 'Jasa', fields: [
          { n: 'id', t: 'string' }, { n: 'nama', t: 'string' },
          { n: 'durasi', t: 'int' }, { n: 'harga', t: 'int' }
        ], rels: [{ to: 'Booking', card: '1-N', verb: 'dipesan', md: false }] },
        { label: 'Booking', fields: [
          { n: 'id', t: 'string' }, { n: 'klien_id', t: 'string' }, { n: 'jasa_id', t: 'string' },
          { n: 'jadwal', t: 'date' }, { n: 'status', t: 'string', v: 'minta/konfirmasi/selesai/batal' }
        ], rels: [{ to: 'Tagihan', card: '1-1', verb: 'menagih' }] },
        { label: 'Tagihan', fields: [
          { n: 'booking_id', t: 'string' }, { n: 'jumlah', t: 'int' },
          { n: 'status', t: 'string', v: 'belum/lunas' }
        ], rels: [] }
      ],
      endpoints: {
        list: [
          { m: 'POST', p: '/bookings', guard: 'tolak bentrok jadwal, balas kode BENTROK' },
          { m: 'PATCH', p: '/bookings/:id/status', guard: '' },
          { m: 'GET', p: '/agenda?from=YYYY-MM-DD&to=YYYY-MM-DD', guard: '' }
        ],
        rules: ['jadwal divalidasi server terhadap zona waktu', 'respons gagal menyertakan kode sebab']
      }
    },

    'SaaS internal': {
      metrics: [
        'Alur kerja inti selesai di bawah 5 menit oleh staf baru dalam 3 hari.',
        'Semua perubahan data tercatat di audit log siapa-apa-kapan.',
        'Waktu muat halaman kerja di bawah 2 detik pada jaringan kantor.'
      ],
      risks: {
        sebab: ['Hak akses salah tetap', 'data internal bocor lewat tautan', 'migrasi skema gagal'],
        mitigasi: ['cek peran di tiap endpoint', 'tautan berumur pendek', 'migrasi berversi']
      },
      entities: [
        { label: 'Akun', fields: [
          { n: 'id', t: 'string' }, { n: 'email', t: 'string' },
          { n: 'peran', t: 'string', roles: true }, { n: 'pin_hash', t: 'string' }
        ], rels: [
          { to: 'Proyek', card: '1-N', verb: 'memiliki' },
          { to: 'AuditLog', card: '1-N', verb: 'menghasilkan', mdText: 'semua tulis tercatat di AuditLog' }
        ] },
        { label: 'Proyek', fields: [
          { n: 'id', t: 'string' }, { n: 'nama', t: 'string' },
          { n: 'pemilik_id', t: 'string' }, { n: 'status', t: 'string' }
        ], rels: [{ to: 'Tugas', card: '1-N', verb: 'berisi' }] },
        { label: 'Tugas', fields: [
          { n: 'id', t: 'string' }, { n: 'proyek_id', t: 'string' },
          { n: 'penanggung', t: 'string' }, { n: 'tenggat', t: 'date' }, { n: 'status', t: 'string' }
        ], rels: [] },
        { label: 'AuditLog', fields: [
          { n: 'id', t: 'string' }, { n: 'aktor_id', t: 'string' },
          { n: 'aksi', t: 'string' }, { n: 'target', t: 'string' }, { n: 'waktu', t: 'date' }
        ], rels: [] }
      ],
      endpoints: {
        list: [
          { m: 'GET', p: '/tasks?assignee=me&status=open', guard: '' },
          { m: 'POST', p: '/tasks', guard: 'validasi peran pemilik proyek' },
          { m: 'GET', p: '/audit?aktor=&dari=YYYY-MM-DD', guard: '' }
        ],
        rules: ['semua baca tulis melewati otorisasi peran', 'respons gagal menyertakan kode sebab']
      }
    },

    'Marketplace & konten': {
      metrics: [
        'Checkout pengguna baru selesai di bawah 3 menit.',
        'Nol order hilang: setiap order punya status terlacak dari bayar sampai terkirim.',
        'Stok tidak pernah negatif walau dua pembeli bersamaan.'
      ],
      risks: {
        sebab: ['Pesanan ganda saat klik lambat', 'stok race condition', 'penjual telat membalas'],
        mitigasi: ['kunci stok transaksional', 'idempotency checkout', 'pengingat status otomatis']
      },
      entities: [
        { label: 'Penjual', fields: [
          { n: 'id', t: 'string' }, { n: 'nama', t: 'string' },
          { n: 'kontak', t: 'string' }, { n: 'rating', t: 'int' }
        ], rels: [{ to: 'Produk', card: '1-N', verb: 'menjual' }] },
        { label: 'Produk', fields: [
          { n: 'id', t: 'string' }, { n: 'penjual_id', t: 'string' }, { n: 'nama', t: 'string' },
          { n: 'harga', t: 'int' }, { n: 'stok', t: 'int' }
        ], rels: [] },
        { label: 'Pesanan', fields: [
          { n: 'id', t: 'string' }, { n: 'pembeli', t: 'string' }, { n: 'total', t: 'int' },
          { n: 'status', t: 'string', v: 'bayar/kirim/selesai' }
        ], rels: [
          { to: 'Produk', card: 'N-M', via: 'PesananItem', viaFields: [
            { n: 'pesanan_id', t: 'string' }, { n: 'produk_id', t: 'string' },
            { n: 'jumlah', t: 'int' }, { n: 'harga', t: 'int' }
          ], verb: 'berisi', back: 'dipesan' },
          { to: 'Pembayaran', card: '1-N', verb: 'dibayar', md: false }
        ] },
        { label: 'PesananItem', fields: [
          { n: 'pesanan_id', t: 'string' }, { n: 'produk_id', t: 'string' },
          { n: 'jumlah', t: 'int' }, { n: 'harga', t: 'int' }
        ], rels: [] },
        { label: 'Pembayaran', fields: [
          { n: 'pesanan_id', t: 'string' }, { n: 'metode', t: 'string' }, { n: 'status', t: 'string' }
        ], rels: [] }
      ],
      endpoints: {
        list: [
          { m: 'POST', p: '/orders', guard: 'idempotency-key, kunci stok transaksional' },
          { m: 'POST', p: '/orders/:id/pay', guard: 'status pembayaran dipegang server' },
          { m: 'GET', p: '/orders/:id/track', guard: '' }
        ],
        rules: ['harga dan stok selalu divalidasi server', 'respons gagal menyertakan kode sebab']
      }
    },

    'Layanan publik & klinik': {
      metrics: [
        'Waktu tunggu layanan di bawah 15 menit pada 80 persen kunjungan.',
        'Semua nomor antrean terlacak: nol pasien terlewat tanpa catatan.',
        'Data sensitif hanya terbaca oleh petugas yang ditugasi.'
      ],
      risks: {
        sebab: ['Nomor antrean hilang saat listrik mati', 'data sensitif bocor', 'loket salah panggil'],
        mitigasi: ['antrean tersimpan lokal lalu sinkron', 'enkripsi data klinis', 'konfirmasi petugas sebelum panggil']
      },
      entities: [
        { label: 'Petugas', fields: [
          { n: 'id', t: 'string' }, { n: 'nama', t: 'string' },
          { n: 'peran', t: 'string', roles: true }, { n: 'aktif', t: 'bool' }
        ], rels: [{ to: 'Antrean', card: '1-N', verb: 'memanggil', md: false }] },
        { label: 'Layanan', fields: [
          { n: 'id', t: 'string' }, { n: 'nama', t: 'string' },
          { n: 'loket', t: 'string' }, { n: 'estimasi_menit', t: 'int' }
        ], rels: [{ to: 'Antrean', card: '1-N', verb: 'melayani' }] },
        { label: 'Antrean', fields: [
          { n: 'id', t: 'string' }, { n: 'layanan_id', t: 'string' }, { n: 'nomor', t: 'string' },
          { n: 'status', t: 'string', v: 'menunggu/dipanggil/selesai/batal' }, { n: 'waktu', t: 'date' }
        ], rels: [{ to: 'Kunjungan', card: '1-1', verb: 'tercatat' }] },
        { label: 'Kunjungan', fields: [
          { n: 'antrean_id', t: 'string' }, { n: 'data_klien', t: 'string' },
          { n: 'catatan_klinis', t: 'string', v: 'terenkripsi' }
        ], rels: [] }
      ],
      relationsTail: 'Catatan klinis terpisah dari data antrean.',
      endpoints: {
        list: [
          { m: 'POST', p: '/antrean', guard: 'ambil nomor, idempotency per kunjungan' },
          { m: 'POST', p: '/antrean/:id/panggil', guard: 'hanya peran petugas' },
          { m: 'GET', p: '/antrean/antrian?layanan=', guard: '' }
        ],
        rules: ['data klinis tidak ikut di daftar antrean', 'respons gagal menyertakan kode sebab']
      }
    }
  };

  /* ---------------------------------------------------------------------
     Jenis produk. Entitas null berarti warisi dari industri, supaya
     'Aplikasi web' mengikuti konteks industri (perilaku G5 yang lama).
     --------------------------------------------------------------------- */
  var TYPES = {
    'Aplikasi web': { metrics: null, entities: null, risks: null, endpoints: null },
    'Landing page': {
      metrics: [
        'Konversi formulir di atas 5 persen dalam 2 minggu.',
        'LCP di bawah 2.5 detik di HP 4G.',
        'Semua CTA tercatat di analitik, tanpa tombol mati.'
      ],
      risks: {
        sebab: ['Form tidak terkirim karena jaringan lambat', 'aset gambar besar menunda LCP', 'spam bot mengisi form'],
        mitigasi: ['retry submit', 'kompresi aset', 'honeypot dan rate limit']
      },
      entities: [
        { label: 'Page', fields: [
          { n: 'slug', t: 'string' }, { n: 'judul', t: 'string' }, { n: 'sections', t: 'string' }
        ], rels: [
          { text: 'satu Page punya banyak Lead dan Asset', erd: false },
          { to: 'Lead', card: '1-N', verb: 'menerima', md: false },
          { to: 'Asset', card: '1-N', verb: 'memuat', md: false }
        ] },
        { label: 'Lead', fields: [
          { n: 'id', t: 'string' }, { n: 'waktu', t: 'date' }, { n: 'nama', t: 'string' },
          { n: 'kontak', t: 'string' }, { n: 'pesan', t: 'string' }, { n: 'status', t: 'string' }
        ], rels: [] },
        { label: 'Asset', fields: [
          { n: 'id', t: 'string' }, { n: 'path', t: 'string' }, { n: 'alt', t: 'string' }
        ], rels: [] }
      ],
      endpoints: {
        list: [
          { m: 'POST', p: '/leads', guard: 'honeypot + rate limit 5/menit per IP' },
          { m: 'GET', p: '/content?page=slug', guard: '' }
        ],
        rules: ['semua input divalidasi server', 'respons gagal menyertakan kode sebab']
      }
    },
    'Marketplace': {
      metrics: [
        'Checkout selesai di bawah 3 menit untuk pengguna baru.',
        'Semua order punya status terlacak, nol order hilang.',
        'Stok tidak pernah negatif walau order bersamaan.'
      ],
      risks: {
        sebab: ['Pesanan ganda saat klik lambat', 'stok race condition', 'penjual telat membalas'],
        mitigasi: ['kunci stok transaksional', 'idempotency checkout', 'pengingat status otomatis']
      },
      entities: [
        { label: 'Seller', fields: [
          { n: 'id', t: 'string' }, { n: 'nama', t: 'string' }, { n: 'kontak', t: 'string' }
        ], rels: [{ to: 'Product', card: '1-N', verb: 'menjual' }] },
        { label: 'Product', fields: [
          { n: 'id', t: 'string' }, { n: 'nama', t: 'string' },
          { n: 'harga', t: 'int' }, { n: 'stok', t: 'int' }
        ], rels: [] },
        { label: 'Order', fields: [
          { n: 'id', t: 'string' }, { n: 'buyer', t: 'string' },
          { n: 'items', t: 'string' }, { n: 'total', t: 'int' }, { n: 'status', t: 'string' }
        ], rels: [{ to: 'Product', card: 'N-M', via: 'OrderItem', viaFields: [
          { n: 'order_id', t: 'string' }, { n: 'product_id', t: 'string' }, { n: 'qty', t: 'int' }
        ], verb: 'berisi', back: 'dipesan' }] },
        { label: 'Payment', fields: [
          { n: 'order_id', t: 'string' }, { n: 'metode', t: 'string' }, { n: 'status', t: 'string' }
        ], rels: [], erd: false }
      ],
      endpoints: {
        list: [
          { m: 'POST', p: '/orders', guard: 'idempotency-key wajib' },
          { m: 'GET', p: '/products?page=N&limit=20', guard: '' },
          { m: 'PUT', p: '/stock/:id', guard: 'optimistic lock, stok tidak boleh negatif' }
        ],
        rules: ['total dihitung server', 'respons gagal menyertakan kode sebab']
      }
    },
    'Dashboard internal': {
      metrics: [
        'Laporan harian tersedia di bawah 5 detik.',
        'Semua aksi tulis tercatat di audit log.',
        'Hak akses per peran terjaga tanpa eskalasi.'
      ],
      risks: {
        sebab: ['Query dataset besar lambat', 'hak akses salah', 'export gagal di tengah jalan'],
        mitigasi: ['pagination dan cache', 'otorisasi per peran', 'stream export']
      },
      entities: [
        { label: 'Account', fields: [
          { n: 'id', t: 'string' }, { n: 'peran', t: 'string', roles: true }, { n: 'pin_hash', t: 'string' }
        ], rels: [
          { to: 'Report', card: '1-N', verb: 'memiliki' },
          { to: 'AuditLog', card: '1-N', verb: 'menghasilkan', mdText: 'semua tulis tercatat di AuditLog' }
        ] },
        { label: 'Dataset', fields: [
          { n: 'id', t: 'string' }, { n: 'sumber', t: 'string' },
          { n: 'skema', t: 'string' }, { n: 'refresh_at', t: 'date' }
        ], rels: [{ to: 'Report', card: '1-N', verb: 'memberi data', md: false }] },
        { label: 'Report', fields: [
          { n: 'id', t: 'string' }, { n: 'query', t: 'string' },
          { n: 'pemilik', t: 'string' }, { n: 'jadwal', t: 'string' }
        ], rels: [] },
        { label: 'AuditLog', fields: [
          { n: 'id', t: 'string' }, { n: 'aktor', t: 'string' }, { n: 'aksi', t: 'string' }, { n: 'waktu', t: 'date' }
        ], rels: [] }
      ],
      endpoints: {
        list: [
          { m: 'GET', p: '/reports/:id?from=YYYY-MM-DD&to=YYYY-MM-DD', guard: '' },
          { m: 'POST', p: '/datasets/:id/refresh', guard: '' }
        ],
        rules: ['semua tulis tercatat AuditLog', 'hak akses peran diperiksa server']
      }
    },
    'Aplikasi mobile': {
      metrics: [
        'Tugas utama selesai di bawah 3 menit di HP RAM kecil.',
        'Data tersimpan 100 persen walau offline.',
        'Sync berhasil tanpa duplikat (idempotent).'
      ],
      risks: {
        sebab: ['Sinkron ganda saat offline berkepanjangan', 'storage HP penuh', 'notifikasi tidak sampai'],
        mitigasi: ['idempotency_key', 'kuota lokal dengan peringatan', 'fallback silent']
      },
      entities: [
        { label: 'User', fields: [
          { n: 'id', t: 'string' }, { n: 'peran', t: 'string', roles: true }, { n: 'token', t: 'string' }
        ], rels: [
          { to: 'Item', card: '1-N', verb: 'memiliki' },
          { text: 'antrean offline memakai idempotency_key', erd: false }
        ] },
        { label: 'Item', fields: [
          { n: 'id', t: 'string' }, { n: 'pemilik', t: 'string' },
          { n: 'data', t: 'string' }, { n: 'updated_at', t: 'date' }
        ], rels: [
          { to: 'SyncQueue', card: '1-N', verb: 'antre' },
          { to: 'Media', card: '1-N', verb: 'menyimpan', md: false }
        ] },
        { label: 'SyncQueue', fields: [
          { n: 'id', t: 'string' }, { n: 'payload', t: 'string' },
          { n: 'status', t: 'string', v: 'antre/terkirim/gagal' }, { n: 'idempotency_key', t: 'string' }
        ], rels: [] },
        { label: 'Media', fields: [
          { n: 'id', t: 'string' }, { n: 'item_id', t: 'string' }, { n: 'path', t: 'string' }
        ], rels: []
        }
      ],
      endpoints: {
        list: [
          { m: 'POST', p: '/sync', guard: 'idempotency-key wajib, batch payload' },
          { m: 'GET', p: '/items?updated_after=ISO', guard: '' }
        ],
        rules: ['conflict resolved server-wins', 'idempotency_key beda per antrean']
      }
    }
  };

  /* Generik: dipakai saat jenis dan industri sama-sama tidak dikenal. */
  var GENERIC = {
    metrics: [
      'Tugas harian utama selesai di bawah 5 menit dalam 2 minggu pemakaian.',
      'Data tersimpan 100 persen walau offline, nol data hilang.',
      'Pengguna baru mencapai aksi pertama tanpa panduan dalam 3 menit.'
    ],
    risks: {
      sebab: ['Perangkat beda merek', 'HP RAM kecil', 'koneksi putus'],
      mitigasi: ['antrean lokal', 'idempotency', 'mode hemat', 'uji di perangkat target']
    },
    entities: [
      { label: 'User', fields: [
        { n: 'id', t: 'string' }, { n: 'peran', t: 'string', roles: true }, { n: 'pin_hash', t: 'string' }
      ], rels: [{ to: 'Transaction', card: '1-N', verb: 'membuat', md: false }] },
      { label: 'Item', fields: [
        { n: 'id', t: 'string' }, { n: 'nama', t: 'string' }, { n: 'data', t: 'string' }, { n: 'stok', t: 'int' }
      ], rels: [] },
      { label: 'Transaction', fields: [
        { n: 'id', t: 'string' }, { n: 'waktu', t: 'date' },
        { n: 'items', t: 'string' }, { n: 'total', t: 'int' },
        { n: 'status', t: 'string', v: 'tersimpan/antre/terkirim' }
      ], rels: [{ to: 'Item', card: 'N-M', via: 'TransactionItem', verb: 'berisi', back: 'dipakai', erd: 'direct' }] }
    ],
    relationsTail: 'Semua tulis offline masuk antrean dulu.',
    endpoints: {
      list: [
        { m: 'POST', p: '/transactions', guard: 'idempotency-key wajib agar sinkron ganda aman' },
        { m: 'GET', p: '/reports/daily?date=YYYY-MM-DD', guard: '' }
      ],
      rules: ['total dihitung server', 'respons gagal menyertakan kode sebab']
    }
  };

  /* ---------------- penurun (deriver): data -> teks ---------------- */

  function labelToErd(label) {
    return String(label).replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
  }
  function fieldText(f, rolesStr) {
    if (f.roles) return f.n + ': ' + (rolesStr || 'pengguna');
    if (f.v) return f.n + ': ' + f.v;
    return f.n;
  }
  function entitiesToMarkdown(entities, rolesStr, tail) {
    var out = entities.map(function (e) {
      return '- ' + e.label + ' (' + e.fields.map(function (f) { return fieldText(f, rolesStr); }).join(', ') + ')';
    }).join('\n');
    var rels = [];
    entities.forEach(function (e) {
      (e.rels || []).forEach(function (r) {
        if (r.md === false) return;
        if (r.text) { rels.push(r.text); return; }
        if (r.mdText) { rels.push(r.mdText); return; }
        if (r.card === 'N-M') { rels.push(e.label + ' N-M ' + r.to + ' lewat ' + r.via); return; }
        rels.push(e.label + ' ' + r.card + ' ' + r.to);
      });
    });
    var line = 'Relasi: ' + (rels.length ? rels.join(', ') : 'belum ada relasi eksplisit') + '.';
    if (tail) line += ' ' + tail;
    return out + '\n' + line;
  }
  function entitiesToErd(entities) {
    var byLabel = {};
    entities.forEach(function (e) { byLabel[e.label] = e; });
    var lines = [];
    var blocks = [];
    entities.forEach(function (e) {
      if (e.erd === false) return;
      (e.rels || []).forEach(function (r) {
        if (r.erd === false || !r.to || !byLabel[r.to]) return;
        var from = labelToErd(e.label), to = labelToErd(r.to);
        var arrow = r.card === '1-1' ? '||--o|' : '||--o{';
        if (r.card === 'N-M' && r.erd !== 'direct') {
          var via = labelToErd(r.via);
          lines.push('  ' + from + ' ' + arrow + ' ' + via + ' : ' + (r.verb || 'memakai'));
          lines.push('  ' + to + ' ' + arrow + ' ' + via + ' : ' + (r.back || 'memakai'));
        } else {
          lines.push('  ' + from + ' ' + arrow + ' ' + to + ' : ' + (r.verb || 'memakai'));
        }
      });
    });
    entities.forEach(function (e) {
      if (e.erd === false) return;
      var fs = e.fields.slice(0, 4);
      blocks.push('  ' + labelToErd(e.label) + ' {\n' +
        fs.map(function (f) { return '    ' + (f.t || 'string') + ' ' + f.n; }).join('\n') + '\n  }');
    });
    return 'erDiagram\n' + lines.join('\n') + (lines.length ? '\n' : '') + blocks.join('\n');
  }
  function endpointsToMarkdown(ep) {
    var list = (ep && ep.list) || [];
    var out = list.map(function (x) {
      return '- ' + x.m + ' ' + x.p + (x.guard ? ' (' + x.guard + ')' : '');
    }).join('\n');
    if (ep && ep.rules && ep.rules.length) out += '\n- Aturan: ' + ep.rules.join(', ') + '.';
    return out;
  }
  function riskToText(risk) {
    if (!risk) return '';
    var s = risk.sebab.slice();
    if (s.length) s[0] = s[0].charAt(0).toUpperCase() + s[0].slice(1);
    return s.join(', ') + '. Mitigasi: ' + risk.mitigasi.join(', ') + '.';
  }

  /* ---------------- resolusi: jawaban -> pengetahuan gabungan ---------------- */

  function normTypeKey(raw) {
    var t = String(raw || '').trim();
    if (TYPES[t]) return t;
    var low = t.toLowerCase();
    var hit = null;
    Object.keys(TYPES).forEach(function (k) {
      if (k.toLowerCase() === low) hit = k;
    });
    if (hit) return hit;
    if (/landing|company profile/i.test(t)) return 'Landing page';
    if (/marketplace/i.test(t)) return 'Marketplace';
    if (/dashboard|internal/i.test(t)) return 'Dashboard internal';
    if (/mobile|android|ios/i.test(t)) return 'Aplikasi mobile';
    return 'Aplikasi web';
  }
  function resolve(a) {
    a = a || {};
    var tk = normTypeKey(a.productType);
    var t = TYPES[tk] || TYPES['Aplikasi web'];
    var ind = INDUSTRIES[a.industry] || null;
    function pick(tv, iv, gv) {
      if (tv !== null && tv !== undefined) return tv;
      if (ind && iv !== null && iv !== undefined) return iv;
      if (ind && iv === null) { /* industri tidak punya, pakai generik */ }
      return gv;
    }
    var entities = pick(t.entities, ind && ind.entities, GENERIC.entities);
    var endpoints = pick(t.endpoints, ind && ind.endpoints, GENERIC.endpoints);
    var metrics = pick(t.metrics, ind && ind.metrics, GENERIC.metrics);
    var risks = pick(t.risks, ind && ind.risks, GENERIC.risks);
    var tail = t.entities ? (t.relationsTail || '') : (ind ? (ind.relationsTail || '') : GENERIC.relationsTail);
    return {
      typeKey: tk,
      industryKey: ind ? a.industry : null,
      known: !!ind,
      entities: entities,
      endpoints: endpoints,
      metrics: metrics.slice(),
      risks: risks,
      relationsTail: tail,
      erd: entitiesToErd(entities)
    };
  }

  /* ---------------- perluasan oleh user ---------------- */

  function registerIndustry(key, def) {
    var k = String(key || '').trim();
    if (!k) return false;
    if (!def || typeof def !== 'object') return false;
    if (!Array.isArray(def.entities) || !def.entities.length) return false;
    if (!def.entities.every(function (e) { return e && e.label && Array.isArray(e.fields); })) return false;
    INDUSTRIES[k] = {
      metrics: Array.isArray(def.metrics) ? def.metrics : [],
      risks: def.risks && Array.isArray(def.risks.sebab) ? def.risks : { sebab: [], mitigasi: [] },
      entities: def.entities,
      relationsTail: def.relationsTail || '',
      endpoints: def.endpoints && Array.isArray(def.endpoints.list) ? def.endpoints : { list: [], rules: [] }
    };
    syncIndustrySpec();
    return true;
  }
  function industryList() { return Object.keys(INDUSTRIES); }

  /* ---------------- jembatan kompatibilitas ---------------- */
  /* generator-prd.js lama membaca window.IndustrySpec. Jembatan ini
     menurunkannya dari sumber yang sama supaya tidak ada data ganda. */
  function syncIndustrySpec() {
    var table = {};
    Object.keys(INDUSTRIES).forEach(function (k) {
      var d = INDUSTRIES[k];
      table[k] = {
        metrics: d.metrics.slice(),
        model: entitiesToMarkdown(d.entities, '{roles}', d.relationsTail),
        risk: riskToText(d.risks),
        api: endpointsToMarkdown(d.endpoints)
      };
    });
    window.IndustrySpec = table;
  }

  /* ---------------------------------------------------------------------
     Pengetahuan fitur. Dicocokkan ke tiap baris Must/Should milik user,
     sehingga kriteria, endpoint, risiko, dan metrik yang muncul mengikuti
     apa yang benar-benar ditulis user, bukan daftar seragam per tipe produk.
     Setiap entri: { id, name, re, criteria[], endpoints[], risks, metrics[] }
     --------------------------------------------------------------------- */
  var FEATURES = [
    {
      id: 'offline', name: 'Mode offline dan sinkronisasi',
      re: /offline|sinkron|tanpa jaringan|koneksi putus/i,
      criteria: [
        'data tersimpan lokal saat jaringan mati (bukti: entri muncul di daftar antre berstatus menunggu)',
        'saat online, seluruh antrean tersinkron tanpa duplikat (bukti: jumlah data di server sama dengan jumlah entri lokal)',
        'entri yang gagal sinkron tetap ditandai dan bisa dicoba ulang manual'
      ],
      endpoints: [{ m: 'POST', p: '/sync', guard: 'idempotency-key per entri, batch payload' }],
      risks: { sebab: ['sinkron ganda saat koneksi berkedip'], mitigasi: ['idempotency_key per entri'] },
      metrics: ['100 persen aksi tersimpan saat offline (uji: matikan jaringan, ulangi 10 aksi).']
    },
    {
      id: 'cetak', name: 'Cetak struk',
      re: /cetak|print|struk|thermal/i,
      criteria: [
        'struk tercetak dalam 3 detik setelah simpan',
        'cetak ulang struk terakhir tersedia dari daftar transaksi',
        'kegagalan printer menampilkan sebab dan tombol coba lagi tanpa membatalkan transaksi'
      ],
      endpoints: [{ m: 'POST', p: '/print/retry', guard: 'cetak ulang struk terakhir' }],
      risks: { sebab: ['printer mati di jam sibuk'], mitigasi: ['antrean cetak ulang otomatis'] },
      metrics: ['Seluruh transaksi tercetak atau terkirim (uji: 20 transaksi berturut).']
    },
    {
      id: 'stok', name: 'Kelola stok',
      re: /stok/i,
      criteria: [
        'stok berkurang tepat sejumlah kuantitas yang tersimpan',
        'penjualan ditolak dengan pesan sebab saat stok kurang dari jumlah pesan',
        'koreksi stok manual tercatat siapa dan kapan'
      ],
      endpoints: [{ m: 'PUT', p: '/stock/:id', guard: 'optimistic lock, stok tidak boleh negatif' }],
      risks: { sebab: ['stok race condition saat dua perangkat menyimpan bersamaan'], mitigasi: ['kunci stok transaksional di server'] },
      metrics: ['Selisih stok fisik vs sistem di bawah 1 persen per minggu.']
    },
    {
      id: 'rekap', name: 'Rekap dan laporan',
      re: /rekap|laporan|report|ringkas/i,
      criteria: [
        'rekap tersedia dalam 5 detik untuk rentang 1 bulan',
        'angka rekap sama dengan jumlah transaksi pada rentang yang sama (uji: bandingkan manual 1 hari)',
        'rekap bisa dibuka tanpa koneksi dari data terakhir yang tersimpan'
      ],
      endpoints: [{ m: 'GET', p: '/reports/daily?date=YYYY-MM-DD', guard: '' }],
      risks: { sebab: ['query rekap lambat saat data setahun'], mitigasi: ['cache dan pagination'] },
      metrics: ['Rekap harian selesai di bawah 5 menit pada jam tutup.']
    },
    {
      id: 'export', name: 'Export data',
      re: /export|excel|csv|unduh/i,
      criteria: [
        'export selesai di bawah 10 detik untuk 1000 baris',
        'file terbuka di Excel tanpa peringatan format',
        'urutan kolom file sama dengan urutan kolom di layar'
      ],
      endpoints: [{ m: 'GET', p: '/reports/export?format=csv&from=&to=', guard: 'stream, batas 10000 baris per file' }],
      risks: { sebab: ['export gagal di tengah jalan'], mitigasi: ['stream export dan tombol lanjutkan'] },
      metrics: ['Export 1000 baris selesai di bawah 10 detik.']
    },
    {
      id: 'kirim', name: 'Kirim pesan dan notifikasi',
      re: /kirim|whatsapp|notif|pesan|email|sms/i,
      criteria: [
        'pesan terkirim tercatat dengan status dan waktu kirim',
        'kegagalan kirim tidak membatalkan aksi utama',
        'penerima membuka pesan tanpa perlu memasang aplikasi tambahan'
      ],
      endpoints: [{ m: 'POST', p: '/notifications', guard: 'catat status kirim, jangan blokir alur utama' }],
      risks: { sebab: ['kuota pesan habis atau nomor tidak aktif'], mitigasi: ['antrean kirim ulang dan laporan gagal'] },
      metrics: ['Pesan terkirim 100 persen atau tercatat gagal dengan sebab.']
    },
    {
      id: 'bayar', name: 'Pembayaran dan tagihan',
      re: /bayar|pembayaran|payment|invoice|tagihan/i,
      criteria: [
        'status pembayaran dipegang server, klien tidak bisa mengubah sendiri',
        'pembayaran ganda untuk pesanan sama ditolak dengan kode sebab',
        'riwayat pembayaran menampilkan metode dan waktu'
      ],
      endpoints: [{ m: 'POST', p: '/orders/:id/pay', guard: 'status pembayaran dipegang server' }],
      risks: { sebab: ['pembayaran ganda saat klik lambat'], mitigasi: ['idempotency-key di endpoint bayar'] },
      metrics: ['Nol pembayaran ganda dalam sebulan pemakaian.']
    },
    {
      id: 'akses', name: 'Peran dan hak akses',
      re: /pin|login|masuk|peran|role|otorisasi|akses/i,
      criteria: [
        'akses ditolak untuk peran tanpa hak dengan pesan sebab dan kode 403',
        'sesi berakhir otomatis setelah 30 menit tidak aktif',
        'setiap aksi ubah data tercatat aktor dan waktunya'
      ],
      endpoints: [
        { m: 'GET', p: '/me', guard: 'otorisasi peran di server' },
        { m: 'POST', p: '/auth/login', guard: 'rate limit 5 percobaan per menit' }
      ],
      risks: { sebab: ['hak akses salah tetap'], mitigasi: ['cek peran di tiap endpoint dan uji per peran'] },
      metrics: ['Nol akses lintas peran yang lolos dalam uji per peran.']
    },
    {
      id: 'cari', name: 'Pencarian dan filter',
      re: /cari|search|filter|urut|sort/i,
      criteria: [
        'hasil muncul di bawah 1 detik untuk 1000 baris',
        'hasil kosong menampilkan saran perbaikan kata kunci',
        'filter tetap aktif setelah halaman dimuat ulang'
      ],
      endpoints: [{ m: 'GET', p: '/items?q=&page=N&limit=20', guard: 'pagination wajib' }],
      risks: { sebab: ['pencarian lambat saat data besar'], mitigasi: ['indeks kolom yang dicari'] },
      metrics: ['Pencarian di bawah 1 detik untuk 1000 baris.']
    },
    {
      id: 'unggah', name: 'Unggah foto dan media',
      re: /unggah|upload|foto|gambar|media|lampiran/i,
      criteria: [
        'ukuran maksimal 5MB dan tipe gambar divalidasi di server',
        'gambar dikompres di bawah 500KB sebelum dikirim',
        'unggahan gagal bisa diulang tanpa memilih file lagi'
      ],
      endpoints: [{ m: 'POST', p: '/media', guard: 'validasi tipe dan ukuran di server' }],
      risks: { sebab: ['foto besar memperlambat di jaringan lemah'], mitigasi: ['kompresi di klien sebelum kirim'] },
      metrics: ['Unggah foto selesai di bawah 10 detik di jaringan 4G.']
    },
    {
      id: 'edit', name: 'Ubah data',
      re: /edit|ubah|update|koreksi/i,
      criteria: [
        'perubahan tampil di daftar tanpa muat ulang',
        'ubah bersamaan dari dua perangkat tidak menimpa diam-diam (versi terbaru menang dan dicatat)',
        'riwayat ubah menyimpan nilai sebelum dan sesudah'
      ],
      endpoints: [{ m: 'PATCH', p: '/items/:id', guard: 'versi baris ikut dikirim untuk deteksi bentrok' }],
      risks: { sebab: ['dua perangkat mengubah baris yang sama'], mitigasi: ['optimistic lock dan riwayat ubah'] },
      metrics: ['Nol kehilangan perubahan tanpa catatan dalam uji dua perangkat.']
    },
    {
      id: 'hapus', name: 'Hapus dan pemulihan',
      re: /hapus|delete/i,
      criteria: [
        'hapus meminta konfirmasi eksplisit yang menyebut nama data',
        'data terhapus hilang dari seluruh layar dan rekap',
        'pemulihan masih mungkin dalam 30 hari lewat menu arsip'
      ],
      endpoints: [{ m: 'DELETE', p: '/items/:id', guard: 'soft delete, simpan waktu dan aktor' }],
      risks: { sebab: ['hapus tidak sengaja'], mitigasi: ['konfirmasi eksplisit dan arsip 30 hari'] },
      metrics: ['Nol data hilang permanen tanpa arsip dalam sebulan.']
    },
    {
      id: 'grafik', name: 'Grafik dan visualisasi',
      re: /grafik|chart|dashboard|visualisasi/i,
      criteria: [
        'grafik tampil dalam 3 detik untuk data 12 bulan',
        'angka pada grafik sama dengan rekap tabel periode yang sama',
        'grafik tetap terbaca saat dicetak hitam putih'
      ],
      endpoints: [{ m: 'GET', p: '/reports/summary?group=month', guard: 'agregasi di server' }],
      risks: { sebab: ['grafik berat di perangkat RAM kecil'], mitigasi: ['agregasi di server, kirim angka siap tampil'] },
      metrics: ['Grafik 12 bulan tampil di bawah 3 detik.']
    }
  ];

  var STACK_CATALOG = {
    frontend: [
      { id: 'ai-pilih', label: 'Biarkan AI pilih' },
      { id: 'tanstack-start', label: 'TanStack Start' },
      { id: 'nextjs', label: 'Next.js (App Router)' },
      { id: 'react-vite', label: 'React (Vite SPA)' },
      { id: 'remix', label: 'React Router / Remix' },
      { id: 'astro', label: 'Astro' },
      { id: 'vue-nuxt', label: 'Vue.js / Nuxt' },
      { id: 'sveltekit', label: 'SvelteKit' },
      { id: 'solid', label: 'Solid / SolidStart' },
      { id: 'expo', label: 'Expo (React Native)' },
      { id: 'flutter', label: 'Flutter' },
      { id: 'tauri', label: 'Tauri (Desktop)' },
      { id: 'vanilla', label: 'HTML CSS JS vanilla' }
    ],
    backend: [
      { id: 'ai-pilih', label: 'Biarkan AI pilih' },
      { id: 'nodejs-hono', label: 'Node.js (Hono / Fastify)' },
      { id: 'bun-elysia', label: 'Bun (Elysia)' },
      { id: 'python-fastapi', label: 'Python (FastAPI)' },
      { id: 'go-echo', label: 'Go (Echo / Fiber)' },
      { id: 'rust-axum', label: 'Rust (Axum)' },
      { id: 'laravel', label: 'Laravel (PHP)' },
      { id: 'spring-boot', label: 'Java (Spring Boot)' },
      { id: 'cloudflare-workers', label: 'Cloudflare Workers' },
      { id: 'supabase', label: 'Supabase (BaaS)' },
      { id: 'pocketbase', label: 'PocketBase (BaaS)' }
    ],
    database: [
      { id: 'ai-pilih', label: 'Biarkan AI pilih' },
      { id: 'postgresql', label: 'PostgreSQL' },
      { id: 'neon', label: 'Neon (Serverless Postgres)' },
      { id: 'supabase-db', label: 'Supabase Postgres' },
      { id: 'prisma-postgres', label: 'Prisma Postgres' },
      { id: 'mysql', label: 'MySQL' },
      { id: 'sqlite', label: 'SQLite' },
      { id: 'turso', label: 'Turso (libSQL)' },
      { id: 'cloudflare-d1', label: 'Cloudflare D1' },
      { id: 'mongodb', label: 'MongoDB' },
      { id: 'redis', label: 'Redis / Upstash' }
    ],
    deployment: [
      { id: 'ai-pilih', label: 'Biarkan AI pilih' },
      { id: 'docker', label: 'Docker' },
      { id: 'vercel', label: 'Vercel' },
      { id: 'railway', label: 'Railway' },
      { id: 'render', label: 'Render' },
      { id: 'fly', label: 'Fly.io' },
      { id: 'cloudflare-pages', label: 'Cloudflare Pages' },
      { id: 'coolify', label: 'Coolify (PaaS)' },
      { id: 'vps', label: 'VPS (Linux)' }
    ]
  };

  var STARTER_PRESETS = [
    {
      id: 'saas-modern',
      name: 'Fullstack SaaS (TanStack)',
      frontend: 'TanStack Start',
      backend: 'Node.js (Hono / Fastify)',
      database: 'PostgreSQL',
      deployment: 'Docker',
      combined: 'TanStack Start + Hono + PostgreSQL + Docker'
    },
    {
      id: 'nextjs-fullstack',
      name: 'Next.js App Router',
      frontend: 'Next.js (App Router)',
      backend: 'Node.js (Hono / Fastify)',
      database: 'Neon (Serverless Postgres)',
      deployment: 'Vercel',
      combined: 'Next.js + Neon Postgres + Vercel'
    },
    {
      id: 'vite-baas',
      name: 'Lean BaaS (Vite+Supabase)',
      frontend: 'React (Vite SPA)',
      backend: 'Supabase (BaaS)',
      database: 'Supabase Postgres',
      deployment: 'Cloudflare Pages',
      combined: 'React Vite + Supabase + Cloudflare Pages'
    },
    {
      id: 'mobile-expo',
      name: 'Mobile (Expo+Turso)',
      frontend: 'Expo (React Native)',
      backend: 'Node.js (Hono / Fastify)',
      database: 'Turso (libSQL)',
      deployment: 'Railway',
      combined: 'Expo React Native + Hono + Turso'
    },
    {
      id: 'vanilla-cf',
      name: 'Vanilla (CF Pages+D1)',
      frontend: 'HTML CSS JS vanilla',
      backend: 'Cloudflare Workers',
      database: 'Cloudflare D1',
      deployment: 'Cloudflare Pages',
      combined: 'HTML CSS JS vanilla + Cloudflare D1'
    }
  ];

  function composeStack(fe, be, db, dep) {
    var parts = [];
    if (fe && fe !== 'ai-pilih') parts.push(fe);
    if (be && be !== 'ai-pilih') parts.push(be);
    if (db && db !== 'ai-pilih') parts.push(db);
    if (dep && dep !== 'ai-pilih') parts.push(dep);
    return parts.length ? parts.join(', ') : 'Belum tahu, minta saran';
  }

  function matchFeatures(text) {
    var seen = {};
    var out = [];
    String(text || '').split(/\r?\n/).forEach(function (line) {
      FEATURES.forEach(function (f) {
        if (seen[f.id]) return;
        if (f.re.test(line)) { seen[f.id] = true; out.push(f); }
      });
    });
    return out;
  }
  function featuresForLine(line) {
    return FEATURES.filter(function (f) { return f.re.test(String(line || '')); });
  }

  window.Knowledge = {
    rules: RULES,
    types: TYPES,
    industries: INDUSTRIES,
    generic: GENERIC,
    features: FEATURES,
    resolve: resolve,
    registerIndustry: registerIndustry,
    industryList: industryList,
    normTypeKey: normTypeKey,
    matchFeatures: matchFeatures,
    featuresForLine: featuresForLine,
    entitiesToMarkdown: entitiesToMarkdown,
    entitiesToErd: entitiesToErd,
    endpointsToMarkdown: endpointsToMarkdown,
    riskToText: riskToText,
    labelToErd: labelToErd,
    stacks: STACK_CATALOG,
    presets: STARTER_PRESETS,
    composeStack: composeStack
  };
  syncIndustrySpec();
})();
