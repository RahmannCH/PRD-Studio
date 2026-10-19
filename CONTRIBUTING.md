# Contributing

Terima kasih mau berkontribusi. PRD Studio adalah aplikasi statis tanpa
build step; menjaga kesederhanaan itu adalah bagian terpenting dari
kontribusi.

## Mulai

```
git clone https://github.com/RahmannCH/PRD-Studio.git
cd PRD-Studio
npm install          # hanya untuk tes (Playwright + axe-core)
python -m http.server 8000
```

Buka `http://localhost:8000/studio.html`.

## Gate wajib sebelum commit

Semua harus hijau:

```
node --check js/studio/*.js sw.js
node tests/test-prd.js
node tests/hygiene.js
node tests/smoke-prd.js
node tests/responsive-prd.js
node tests/sw-offline-prd.js
node tests/a11y-prd.js
python tests/contrast-check.py
```

Smoke memakai Playwright; bila gagal pada `page.goto` pertama (flake cold
start Chromium), ulangi sekali sebelum curiga ke kode.

## Konvensi

- Bahasa Indonesia di komentar, UI, dan pesan toast.
- ES5 di `js/studio/` (`var`, `function`, tanpa arrow/let) agar konsisten
  dan aman di target lama.
- Tanpa dependensi runtime. Playwright dan axe-core hanya devDependency.
- Setiap modul baru (`js/studio/*.js`) harus muncul di empat tempat:
  `<script>` di `studio.html`, daftar `CORE` di `sw.js`, `load(...)` di
  `tests/test-prd.js`, dan (bila perlu) bump `CACHE` di `sw.js`.
- Teks masuk markdown wajib lewat `Exporter.escMd`.
- Em-dash hanya di `<title>` dan komentar — bukan di body UI.
- Target sentuh minimal 44px; aksesibilitas keyboard dan `aria` bukan
  tambahan belakangan.

## Struktur pengujian

- `tests/test-prd.js` — unit + kontrak data (sinkron, async di blok terakhir).
- `tests/smoke-prd.js` — alur end-to-end di Chromium.
- `tests/responsive-prd.js` — layout 360px sampai desktop.
- `tests/sw-offline-prd.js` — PWA offline.
- `tests/a11y-prd.js` — axe-core, gate serious/critical = 0.
- `tests/hygiene.js` — id ganda, inline style, em-dash, mojibake.
- `tests/contrast-check.py` — kontras WCAG AA dua tema.

## Pull request

- Jelaskan perubahan dan alasannya (bukan hanya apa).
- Sertakan tes untuk perilaku baru atau perbaikan bug.
- Jangan ubah nomor bagian PRD (`## 1.` sampai `## 12.`) — peta
  `STEP_TO_SECT_NUM` di `render.js` bergantung pada nomor itu.
