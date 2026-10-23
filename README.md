# PRD Studio

Wawancara ide produk dalam 7 langkah, lalu terima PRD 12 bagian, roadmap
fase, diagram Mermaid, dan 10 prompt P0 sampai P9 yang siap ditempel ke AI
coding agent. Semua berjalan di browser, tersimpan lokal, dan tetap berfungsi
penuh tanpa koneksi maupun tanpa API key.

Landing page: `index.html`. Aplikasi utama: `studio.html`.

## Fitur

- Wizard 7 langkah dengan tiga tingkat kedalaman (Cepat, Standar, Lengkap).
  Berpindah tingkat hanya mengubah field yang tampil, jawaban yang sudah
  diisi tidak pernah hilang.
- Skor kesiapan 0 sampai 100 dengan rubrik terbuka. Setiap poin bisa
  ditelusuri, hard rule (nama, masalah, tiga Must-have) membatasi skor 59.
- Validator gap dengan kode yang bisa ditindaklanjuti, dari SAMAR sampai
  KLINIK, lengkap dengan daftar perbaikan per langkah.
- Lima output yang saling nyambung dari satu Spec: PRD markdown 12 bagian,
  roadmap fase berurutan, diagram Mermaid (arsitektur, alur, ERD), prompt
  P0 sampai P9, dan Storyboard Video Motion HyperFrames 60 detik (1920x1080 @ 30fps).
- Storyboard kinetik dengan pola Reverse Iceberg (5 babak), cue sheet SFX detik-demi-detik,
  instruksi aset mandiri, dan Master Prompt satu klik untuk AI Agent HyperFrames.
- Ekspor markdown, HTML, brief satu halaman, dan Spec dalam format YAML.
- Spec Pack untuk AI coding agent: enam berkas (REQUIREMENTS, DESIGN, TASKS,
  TRACEABILITY, FEATURES berformat Gherkin, AGENTS) yang siap ditaruh di
  `specs/<slug>/` dan root repo.
- Share link: salin tautan `#s=<token>` berisi jawaban terkompresi — siapa
  pun yang membuka tautan bisa mengimpor proyek yang sama.
- Undo/redo jawaban (`Ctrl+Z` / `Ctrl+Shift+Z`).
- Reverse wizard: tempel ide mentah, dapatkan PRD yang bisa digarap (butuh
  endpoint AI).
- AI opsional lewat endpoint OpenAI-compatible: preset Google AI Studio,
  OpenAI, OpenRouter, Ollama, atau custom. Usulan AI selalu berbentuk kartu
  keputusan Terima atau Tolak, tidak pernah langsung diterapkan.
- Riwayat versi, beberapa proyek, impor dan ekspor data JSON.
- PWA offline, tema gelap dan terang, target sentuh 44px, kontras WCAG AA
  di kedua tema, dukungan `prefers-reduced-motion`.

## Menjalankan

Tidak ada build, tidak ada dependensi runtime. Untuk pengalaman penuh
(service worker, PWA), sajikan lewat server statis:

```
python -m http.server 8000
```

Lalu buka `http://localhost:8000/studio.html`. Untuk sekadar mencoba fitur
wizard, `studio.html` juga bisa dibuka langsung dari filesystem.

## Tes

```
npm run test             unit dan kontrak data (tests/test-prd.js)
npm run test:smoke       alur end-to-end di browser (Playwright)
npm run test:responsive  layout 360px sampai desktop
npm run test:sw          PWA offline
npm run test:a11y        aksesibilitas (axe-core)
npm run test:hygiene     id ganda, inline style, em-dash, mojibake
npm run test:contrast    kontras WCAG AA dua tema
npm run test:all         semua di atas
```

Playwright dibutuhkan hanya untuk tes. Jika belum terpasang:

```
npm install
```

## Struktur

```
studio.html          aplikasi utama
index.html           landing page
og-image.png         gambar Open Graph 1200x630
sw.js                service worker, precache shell
LICENSE              MIT
CHANGELOG.md         riwayat perubahan
CONTRIBUTING.md      panduan kontribusi
css/                 style.css (design system), studio.css (aplikasi)
js/studio/           modul aplikasi, urut sesuai dependensi
  knowledge.js       entitas, endpoint, dan derivasi per tipe produk
  questionnaire.js   daftar field wizard dan tingkat kedalaman
  state.js           penyimpanan, riwayat, proyek
  validator.js       gap dan hard rule
  scorer.js          skor rubrik terbuka
  spec.js            Spec.build: satu sumber kebenaran output
  spec-render.js     renderer brief, json, yaml, html
  generator-*.js     PRD, roadmap, prompt, storyboard
  diagrams.js        Mermaid
  exporter.js        unduhan dan cetak
  render.js          perakitan tampilan hasil
  llm-adapter.js     seam AI, OpenAI-compatible
  ai-advisor.js      usulan AI terstruktur
  reverse.js         reverse wizard
  share.js           share link terkompresi
  undo.js            undo/redo jawaban
  coach.js           saran deterministik
  palette.js         palet perintah Ctrl+K
  wizard.js          langkah, meter skor, daftar gap
  app.js             pengontrol utama
tests/               unit, smoke, responsive, sw, a11y, hygiene, kontras
.github/workflows/   CI (semua suite dijalankan di GitHub Actions)
CONTEXT.md           glosarium dan model domain
docs/                master blueprint UI/UX
```

## Arsitektur data

Alur tunggal: Jawaban menjadi Spec, Spec menjadi output. Semua renderer
membaca objek Spec yang sama, jadi angka dan narasi di PRD, roadmap, diagram,
dan prompt tidak mungkin berbeda satu sama lain.

AI adalah seam opsional di pinggir: tanpa AI semua fitur tetap jalan, dan
usulan AI masuk sebagai keputusan terstruktur yang harus disetujui user
sebelum menempel ke Spec.

Aturan istilah dan domain ada di `CONTEXT.md`. Setiap konsep baru wajib
didefinisikan di sana sebelum dipakai di kode.
