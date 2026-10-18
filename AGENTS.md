# AGENTS.md: PRD Studio

Panduan untuk AI coding agent yang bekerja di repo ini. Produk: aplikasi web statis berbahasa Indonesia yang mengubah wawancara 7 langkah menjadi PRD 12 bagian, roadmap, diagram Mermaid, dan rantai 10 prompt. Tanpa build step, offline penuh, AI opsional.

## Gate wajib sebelum commit

```
node tests/test-prd.js
node tests/smoke-prd.js
node tests/responsive-prd.js
node tests/sw-offline-prd.js
python tests/contrast-check.py
```

Semua harus hijau. Smoke memakai Playwright; bila gagal pada `page.goto` pertama (flake cold start Chromium), ulangi sekali sebelum curiga ke kode. Plus scan higienis: 0 id ganda di `studio.html`/`index.html`, 0 atribut `style="` inline, em-dash hanya di komentar dan `<title>`.

## Arsitektur

- Tanpa bundler. Setiap file di `js/studio/` adalah IIFE yang menempel ke `window` (`window.Spec`, `window.Scorer`, dst) dan dibaca dengan urutan tetap dari `<script>` di `studio.html`.
- Semua renderer membaca satu sumber: `Spec.build(jawaban) -> spec`. Jangan membaca jawaban mentah di renderer baru.
- Nomor bagian PRD `## 1.` sampai `## 12.` stabil karena `render.js` memetakan nomor ke langkah lewat `STEP_TO_SECT_NUM`. Menggeser nomor berarti menggeser peta itu.
- Kosakata domain ada di `CONTEXT.md`. Pakai istilah itu di kode, UI, dan tes.

## Menambah modul baru (mudah terlewat)

Satu file baru wajib muncul di empat tempat, atau ada yang rusak diam-diam:

1. `<script>` di `studio.html` pada posisi urutan dependensi yang benar.
2. Daftar `CORE` di `sw.js` (kalau tidak, modul gagal saat offline).
3. `load(...)` di `tests/test-prd.js` (kalau tidak, blok tesnya melempar).
4. Naikkan `CACHE` di `sw.js` supaya service worker lama tidak menyajikan campuran versi.

Blok tes nomor 22 memverifikasi sinkron `studio.html` dan `CORE` secara otomatis; dua tempat lain tidak.

## Konvensi

- Bahasa Indonesia di komentar dan UI. Komentar menjelaskan keputusan dan kelas bug yang dijaga, bukan menerangkan baris.
- Gaya kode di `js/studio/`: ES5 (`var`, `function`), tanpa arrow/let, supaya konsisten dan aman di semua target.
- Teks masuk markdown wajib lewat `Exporter.escMd` (satu sumber escape).
- Target sentuh minimal 44px; aksesibilitas keyboard dan `aria` bukan tambahan belakangan.
- Jangan tambah dependensi runtime. Yang ada hanya Playwright sebagai devDependency untuk tes.

## Dokumen rujukan

- `CONTEXT.md`: glosarium dan aturan domain yang tidak boleh dilanggar.
- `docs/MASTER-BLUEPRINT-UIUX.md`: arah desain, token, dan gerbang mutu UI.
- `README.md`: gambaran produk dan cara menjalankan.
