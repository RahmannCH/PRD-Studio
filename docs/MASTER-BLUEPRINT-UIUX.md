# Master Blueprint UI/UX: PRD Studio

Dokumen ini adalah rujukan resmi arah pengalaman dan antarmuka PRD Studio.
Isinya mengikat: setiap komponen baru, perubahan token, dan penambahan
permukaan (surface) harus bisa ditelusuri ke salah satu prinsip di sini.
Bila dokumen ini dan implementasi berbeda, salah satunya adalah bug.

Berkas terkait: `css/style.css` (design system), `css/studio.css` (aplikasi),
`js/studio/` (perilaku), `tests/` (bukti otomatis), `CONTEXT.md` (istilah).

---

## 1. Posisi dan prinsip

PRD Studio adalah alat kerja, bukan presentasi. Semua keputusan visual tunduk
pada lima prinsip berikut, berurutan menurut prioritas:

1. Jujur. Skor punya rubrik terbuka, gap menyebut kode dan langkah asalnya,
   dan angka tidak pernah dibulatkan demi kenyamanan. User melihat alasan,
   bukan hasil misterius.
2. Kendali di user. AI tidak pernah menulis ke Spec tanpa persetujuan. Setiap
   usulan AI hadir sebagai kartu keputusan Terima atau Tolak, dan tiap tolak
   tercatat sebagai keputusan sadar.
3. Offline dulu. Tanpa jaringan dan tanpa API key, seluruh alur inti tetap
   berjalan. AI adalah lapisan tambahan, bukan syarat.
4. Satu sumber. Jawaban menjadi Spec, Spec menjadi semua output. UI pun
   mengikuti aturan yang sama: satu definisi field di
   `js/studio/questionnaire.js`, satu definisi token di `css/style.css`.
5. Tanpa hiasan kosong. Setiap efek punya tugas: neu menunjukkan kedalaman
   dan area yang bisa ditekan, glass menandai permukaan yang sedang aktif,
   gerak hanya menguatkan perubahan state.

## 2. Bahasa visual

Material dasar Neumorphism dan lapisan kedua Glassmorphism, dengan pembagian
tugas yang tegas (R-31):

- Neu di wadah statis: kartu langkah, input, cekungan output. Murah GPU,
  tidak memakai blur.
- Glass hanya di permukaan hidup: topbar, tab aktif, panel aksi, bar skor.
  Dosis maksimum 5 sampai 6 elemen blur per viewport.
- Kedalaman memakai pasangan shadow `--neu-dark` dan `--neu-light`, sehingga
  tema gelap dan terang sama-sama membaca bentuk yang sama.
- Dilarang: gradien dekoratif tanpa fungsi, lebih dari dua lapisan blur
  bertumpuk, dan animasi yang tidak dipicu perubahan state.

Dial arah (dipakai untuk menilai setiap tambahan):
ENERGY 2 (tenang, alat kerja), RHYTHM 3 (irama blok sedang), MOTION 1
(transisi hover dan press saja).

## 3. Token

Token adalah satu-satunya jalur warna, jarak, radius, dan gerak. Nilai mentah
di komponen baru dilarang.

### Warna

Dua tema penuh, gelap (default) dan terang lewat `[data-theme="light"]`:

| Peran | Gelap | Terang | Dipakai untuk |
|---|---|---|---|
| --bg / --bg-2 | #0B132B / #1C2541 | #E8EDF5 / #DCE3EF | dasar halaman |
| --surface / --surface-2 | #16213F / #1B2748 | #F3F7FD / #FFFFFF | kartu, elevasi |
| --inset | #0D1630 | #D9E3F1 | input dan well output |
| --text / --muted | #F4F7FB / #A8B3C7 | #14213A / #4A5878 | teks utama dan sekunder |
| --brand | #48CAE4 | #00699F | aksi utama, progres |
| --accent | #FFB703 | #8F5B00 | fokus, penanda langkah aktif |
| --ok / --danger | #5EEA8D / #FF8A8A | #0E7A3D / #B4232A | status simpan dan galat |
| --glass-bg / --glass-line | rgba(16,26,53,.55) / rgba(255,255,255,.18) | rgba(255,255,255,.55) / rgba(30,45,80,.16) | permukaan hidup |

Pembagian makna warna dipegang konsisten: amber (accent) berarti "sedang di
sini atau sedang dipakai", biru (brand) berarti "aksi maju dan progres",
hijau dan merah khusus status sistem. Bukti kontras dijalankan
`tests/contrast-check.py`: seluruh pasangan teks lolos WCAG AA di kedua tema,
termasuk komposit kaca.

### Bentuk dan jarak

Radius: `--radius-xs` 6, `--radius-s` 10, `--radius-m` 14, `--radius-l` 22.
Skala jarak memakai kelipatan 4 dan 8; ritme blok utama 14 sampai 24px.
Lebar konten maksimum `--max` 1180px dengan padding 24px.

### Tipografi

Poppins untuk judul (`--font-head`), Inter untuk isi (`--font-body`).
Judul langkah 23px, meta langkah 13px uppercase dengan letter-spacing, teks
isi 14 sampai 14.5px, teks bantu 12.5 sampai 13px. Panjang baris dijaga di
bawah 75 karakter; konten panjang memakai `overflow-wrap:anywhere` agar
tidak ada scroll horizontal di 360px.

### Gerak

`--ease-spring` untuk masukan (muncul, buka), `--ease-out-expo` untuk
keluaran (tutup, selesai). Durasi 150 sampai 450ms. Durasi terpanjang ada di
meter skor (450ms) karena perubahan angka harus terbaca sebagai transisi,
bukan lompatan. Hormati `prefers-reduced-motion`: transisi menjadi instan.

### Lapisan z

Skala terpusat: `--z-topbar` 50, `--z-skip` 60, `--z-modal` 80, `--z-toast`
90, `--z-pwa` 94. Komponen baru dilarang menulis angka z sendiri.

## 4. Peta informasi

Satu halaman aplikasi (`studio.html`), tiga zona:

1. Topbar (glass, sticky): menu, tema, pemilih proyek dengan aksi proyek
   (baru, duplikat, ubah nama, hapus, impor), meta proyek.
2. Alur utama dua kolom di desktop, satu kolom di bawah 900px:
   - Kolom kiri `#wizard`: pemilih kedalaman, progres 7 langkah, meter skor
     kesiapan, rubrik terbuka, form langkah aktif, kotak review dan gap.
   - Kolom kanan `#hasil`: tombol Susun, badge skor, daftar gap hasil, dan
     empat tab output: PRD markdown, Roadmap, Diagram, Prompt P0-P9.
     Panel review AI (`#aiReview`) menumpang tepat di atas output saat usulan
     tersedia.
3. Zona bawah: pengaturan AI (`#pengaturan`), riwayat (`#riwayat`) dengan
   pencarian dan diff, lalu modal-modal: preview, konfirmasi, reverse wizard
   (`#ideModal`).

Navigasi keyboard: skip link, `#nav` ringkas untuk lompat antar zona, dialog
memakai perangkap fokus, dan Escape selalu menutup modal teratas.

## 5. Alur inti

### First run

Landing `index.html` menjelaskan janji produk dalam satu layar, tombol masuk
ke `studio.html`. Di dalam aplikasi, keadaan kosong selalu menawarkan dua
jalan: isi contoh (`#fillSampleBtn`) atau jawab dari nol, dengan hint netral
yang menjelaskan mengapa field itu ada.

### Siklus kerja

Jawab langkah, meter bergerak, gap muncul kontekstual per langkah. Tombol
Susun menahan selama hard rule belum beres atau skor di bawah ambang 60, dan
menjelaskan alasannya, bukan sekadar mati. Setelah Susun, output terisi dan
tujuh tombol ekspor aktif. Riwayat menyimpan versi, dan tab output bisa
dipratinjau serta diunduh terpisah.

### Kedalaman wawancara

Chip Cepat, Standar, Lengkap di kepala wizard mengatur field yang tampil,
bukan nilai yang tersimpan. Kontraknya:

- Standar adalah default dan setara perilaku penuh sebelumnya.
- Cepat menyembunyikan komponen yang tidak dituntut (NFR, metrik, di luar
  scope, integrasi, kosmetik). Skor dinormalkan ke poin yang terlihat dan
  rubrik menyatakan skala mode secara terbuka.
- Semua jawaban bertahan saat mode berganti; generator tetap membaca field
  tersembunyi. Tidak pernah ada data yang diam-diam terbuang.
- Chip adalah radiogroup: panah kiri dan kanan berpindah mode, `aria-checked`
  mencerminkan pilihan, dan fokus tidak pernah hilang ke elemen tersembunyi.

### Reverse wizard

Modal terpisah dengan textarea besar. Tanpa konfigurasi AI, modal menjelaskan
apa yang kurang dan mengarahkan ke pengaturan, bukan gagal diam-diam.
Hasilnya masuk sebagai jawaban yang tetap bisa diedit.

### Seam AI

Pengaturan memilih preset (Google AI Studio, OpenAI, OpenRouter, Ollama,
custom), model dengan tombol daftar model, key dengan bantuan tautan, dan
timeout. Tombol uji koneksi memberi status berkode. Saat usulan tersedia,
kartu keputusan menampilkan usulan, alasan, dan dampaknya; Terima semua ada
tapi tetap eksplisit; menutup tanpa memilih tidak mengubah apa pun.

## 6. Katalog komponen dan state

Setiap komponen wajib punya state: default, hover, focus-visible, active,
disabled, dan bila relevan loading, error, serta empty. Tidak ada komponen
tanpa focus-visible (cincin accent 2px, offset 3px).

- Tombol: primer (brand, teks `--brand-ink`), sekunder (surface neu),
  bahaya (danger). Loading memakai atribut disabled dan teks kerja.
- Input dan textarea: cekungan neu, fokus dengan cincin, hint di bawah
  field, pesan error per field dari `#formErr` dan kotak review.
- Chip: radiogroup untuk kedalaman dan platform; target sentuh minimal 44px.
- Kartu langkah: judul, hint, isi; hanya satu langkah aktif per waktu.
- Meter skor: track inset, isi brand, tip teks di bawahnya, dan rubrik
  daftar terbuka.
- Badge dan status: warna mengikuti makna (ok, danger, accent), selalu
  disertai teks, tidak pernah warna saja.
- Panel review AI: daftar kartu usulan, aksi Terima atau Tolak per kartu,
  Terima semua, Tutup. Kartu yang sudah diputus menonjolkan hasil keputusan.
- Riwayat: daftar versi dengan waktu, skor saat itu, snapshot dan diff.
- Modal: perangkap fokus, tombol batal selalu tersedia, aksi destruktif
  merah dan menyebut konsekuensinya.
- Toast: informasi singkat, tidak pernah memuat aksi kritis.

Keadaan kosong selalu menjelaskan langkah berikutnya. Keadaan galat selalu
menyebut sebab dan jalan keluarnya dalam bahasa manusia.

## 7. Aksesibilitas

Target: WCAG 2.1 AA, sebagian AAA pada teks utama.

- Kontras: dijaga otomatis lewat `tests/contrast-check.py` untuk kedua tema,
  termasuk pasangan di atas permukaan kaca.
- Fokus: cincin accent yang terlihat di semua kontrol, tidak ada
  `outline:none` telanjang. Fokus yang jatuh ke elemen tersembunyi dipindah
  ke judul langkah oleh `questionnaire.js`.
- Keyboard: seluruh alur bisa diselesaikan tanpa tetikus. Panel output
  memakai pola tab yang benar, dialog mengunci fokus.
- ARIA: `aria-live` untuk status (skor, status simpan, status AI), radiogroup
  untuk chip, label eksplisit untuk setiap input, `aria-describedby` untuk
  hint.
- Target sentuh minimal 44px, diuji di `tests/responsive-prd.js`.
- Teks tidak pernah menjadi satu-satunya pembawa makna.

## 8. Nada bahasa

Bahasa Indonesia kerja, tanpa emoji, tanpa em-dash di teks antarmuka.
Kalimat memakai kata kerja dan menyebut objek konkret: "Susun PRD", bukan
"Lanjutkan". Pesan galat menyebut apa yang terjadi dan apa yang bisa
dilakukan. Tidak ada humor di jalur galat. Angka selalu disertai satuan.
Istilah produk mengikuti `CONTEXT.md`, tidak ditemukan sinonim liar di UI.

## 9. Performa dan offline

- Tanpa bundler dan tanpa dependensi runtime; semua modul dimuat berurutan
  sesuai dependensi dan dicache di CORE service worker.
- Precache menyertakan seluruh shell; `tests/sw-offline-prd.js` membuktikan
  reload tetap 200 saat offline.
- Efek blur dibatasi seperti pasal 2, transisi hanya pada properti murah
  (opacity, transform), dan meter memakai width transition pada elemen
  kecil.
- Data user tidak pernah meninggalkan perangkat kecuali user sendiri
  mengirim ke endpoint AI yang dikonfigurasinya.

## 10. Gerbang mutu

Perubahan UI/UX tidak diterima tanpa bukti otomatis berikut:

```
node tests/test-prd.js        kontrak data, modul, dan struktur UI
node tests/smoke-prd.js       alur end-to-end termasuk kedalaman dan AI
node tests/responsive-prd.js  360px sampai desktop, target sentuh
node tests/sw-offline-prd.js  shell offline
python tests/contrast-check.py  kontras AA dua tema
```

Ditambah tiga pemeriksaan higienis yang dijalankan saat audit: nol id
ganda, nol atribut `style=` inline, dan nol em-dash di body UI.

## 11. Tata kelola

- Istilah baru wajib masuk `CONTEXT.md` sebelum dipakai di kode atau UI.
- Satu definisi di satu tempat: daftar field di `questionnaire.js`, kode gap
  di `gaps.js`, preset AI di `llm-adapter.js`, token di `style.css`.
- Komponen baru wajib menunjuk prinsip di pasal 1 dan token di pasal 3 pada
  catatan review-nya. Bila butuh pengecualian, dokumen ini yang diubah lebih
  dulu, bukan implementasinya.

## 12. Arah berikutnya

Kandidat yang sudah selaras dengan blueprint, menunggu prioritas:

- Multi-profil AI di pengaturan (storage sudah satu profil, UI menunggu).
- Mode banding dua versi riwayat berdampingan.
- Tour onboarding pertama kali yang bisa dilewati dan tidak muncul lagi.
- Preferensi kedalaman per proyek dengan saran otomatis dari jenis produk.
