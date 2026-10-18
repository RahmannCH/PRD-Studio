# CONTEXT.md - Glosarium dan Model Domain PRD Studio

Dokumen ini adalah sumber istilah. Tulis di sini setiap kali sebuah konsep
domain ditemukan atau diperjelas. Istilah di sini dipakai di seluruh keputusan
arsitektur supaya tidak ada dua bagian kode memakai nama berbeda untuk hal yang
sama.

## Untuk apa dokumen ini

PRD Studio mengubah jawaban wawancara mentah menjadi spesifikasi yang bisa
dikerjakan. Istilah di bawah adalah kosakata bersama untuk user, kode, dan
dokumen output. Kalau sebuah nama dipakai di `js/studio/` tapi tidak ada di
sini, itu celah yang belum tertutup.

---

## Istilah inti

### Jawaban
Jawaban pengguna atas kuis. Sumber kebenaran sebelum Spec. Bentuknya objek
datar yang disimpan di `S.data`. Daftar field-nya didefinisikan di
`js/studio/questionnaire.js`, bukan ditulis di HTML.

### Spec
Objek data terstruktur hasil jawaban. Satu-satunya sumber kebenaran untuk
semua output. Berisi entitas, endpoint, story, metrik, risiko, asumsi,
pertanyaan terbuka, fase roadmap, dan rantai prompt.

Spec bukan teks. Spec adalah data yang bisa di-render ke beberapa format.

Interface: `Spec.build(jawaban) -> spec`. Satu fungsi masuk, satu objek keluar.

### Brief
Derivat Spec yang dipakai user: ringkasan satu halaman untuk dibaca manusia
yang tidak mau membaca PRD penuh. Ambil sebagian Spec, bukan sumber sendiri.

### Bagian
Dua belas bagian PRD bernomor tetap, dari `## 1.` sampai `## 12.`. Nomornya
stabil karena `render.js` memetakan nomor bagian ke langkah kuis lewat
`STEP_TO_SECT_NUM`. Menggeser nomor berarti menggeser peta itu.

### Story
Satu user story dengan kriteria terima biner. Bentuknya "Sebagai X saya bisa Y
sehingga Z". Kriteria biner harus bisa dijawab ya atau tidak dengan bukti
konkret: angka, state, atau pesan error. Inilah pembeda spec yang bisa
dieksekusi dari spec yang hanya niat.

### Kriteria Biner
Syarat terukur yang harus terpenuhi agar story dianggap selesai. Dilarang kata
"cepat" atau "nyaman" tanpa angka. Ini yang diperiksa `validator.js` dengan
kode gap `SAMAR`.

### Entitas
Objek domain dalam model data. Punya nama, daftar field, dan relasi ke entitas
lain. Diturunkan dari jenis produk, industri, dan peran yang disebut user.

### Endpoint
Kontrak API: method, path, dan guard, misalnya idempotency-key, otorisasi, atau
aturan validasi. Diturunkan dari fitur yang benar-benar dipilih user, bukan
dari daftar generik per tipe produk.

### Fase
Satuan roadmap. Punya nomor, daftar pekerjaan, estimasi, dan dependensi ke fase
lain. Fase berurutan dan dependensinya harus nyata, bukan asumsi.

### Rantai Prompt
Sepuluh prompt P0 sampai P9 yang mengarahkan AI coding agent menyelesaikan
proyek. P5 ke atas terkunci berurutan: P5 butuh P4 disalin lebih dulu, dan
seterusnya.

### Gerbang Prompt
Relasi "prompt ini hanya boleh dipakai setelah prompt sebelumnya disalin".
Disimpan sebagai data di `generator-prompt.js`, bukan ditulis ulang sebagai
prosa di exporter atau di tes.

### Gap
Temuan validator bahwa jawaban belum cukup untuk menyusun spec. Gap punya kode,
langkah asal, dan pesan. Satu definisi kode gap ada di `js/studio/gaps.js`.

### Hard Rule
Gap yang memblokir tombol Susun walau skor sudah melewati ambang. Nama,
masalah, dan tiga Must-have adalah hard rule. Satu definisi, dipakai bersama
oleh validator, scorer, dan tombol Susun.

### Skor Kesiapan
Angka 0 sampai 100 yang merangkum seberapa lengkap jawaban. Berasal dari poin
rubrik positif dan penalti gap. Hard rule membatasi skor maksimal 59.

### Ambang Susun
Skor minimum 60 tanpa hard rule. Di bawah itu tombol Susun menahan dan
menampilkan daftar perbaikan.

---

## Istilah ekspor

### Spec Pack
Paket lima berkas yang diturunkan deterministik dari Spec untuk serah terima ke
AI coding agent, mengikuti struktur Kiro dan spec-kit: requirements, design,
tasks, traceability, dan AGENTS. Interface: `SpecPack.files(data, res)`.
Letaknya: empat berkas di `specs/<slug>/`, AGENTS di root repo target.

### Kriteria EARS-lite
Kalimat syarat uji berpola KETIKA/JIKA/SELAMA/DI MANA + SISTEM HARUS. Lima tipe
EARS dipetakan ke kata pemicu Indonesia di `criteria.js`. Dipakai Spec Pack;
satu-satunya tempat konversi, jangan tulis ulang di renderer lain.

### Kata kabur
Kata sifat tanpa angka yang membuat kriteria tidak bisa diuji ("cepat",
"mudah"). Daftar ada di `criteria.js`; lint-nya saran, bukan gerbang.

### Traceability
Tabel pemetaan Requirement ke cerita, rentang kriteria, task, milestone, dan
nomor bagian PRD. Turunan otomatis dari Spec dan roadmap; tanda pada milestone
selalu ditandai periksa manual.

---

## Istilah AI

### Profil AI
Satu set konfigurasi panggilan model: endpoint, model, API key, timeout, dan
mode autentikasi. User boleh punya beberapa profil dan memilih satu. Tersimpan
lokal, tidak pernah dikirim ke server kami.

### Preset AI
Konfigurasi profil yang sudah terisi untuk penyedia tertentu. Contoh: preset
Google AI Studio mengisi endpoint OpenAI-compatible dan model Gemini terbaru.
Preset adalah titik awal yang tetap bisa diubah user.

### Seam AI
Tempat perilaku AI bisa diganti tanpa mengubah kode di sekitarnya. Satu seam,
dua adapter: bawaan yang offline tanpa key, dan remote yang OpenAI-compatible.
Tanpa AI, Spec tetap dibangun dari jawaban dan semua fitur tetap jalan.

### Keputusan AI
Usulan terstruktur dari model terhadap Spec: asumsi tambahan, risiko baru,
story yang diperluas, endpoint tambahan, dan pertanyaan untuk user. Selalu
disajikan sebagai kartu review Accept atau Tolak, tidak pernah langsung
diterapkan. AI tidak pernah menjadi sumber kebenaran; user tetap memegang
kendali.

### Advisor
Modul yang merangkai permintaan ke model lalu memvalidasi balasannya terhadap
skema yang diharapkan. Mengembalikan keputusan terstruktur, atau gagal dengan
pesan yang bisa dibaca user.

---

## Aturan yang tidak boleh dilanggar

- Tanpa AI, semua fitur tetap berfungsi penuh dan offline.
- AI tidak pernah menimpa jawaban user tanpa persetujuan eksplisit.
- Nomor bagian tidak bergeser tanpa memperbarui peta bagian.
- Satu istilah punya satu definisi di satu tempat.
