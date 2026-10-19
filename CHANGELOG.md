# Changelog

Semua perubahan penting dicatat di berkas ini. Format mengikuti
[Keep a Changelog](https://keepachangelog.com/); versi memakai
[SemVer](https://semver.org/).

## [Unreleased]

### Ditambahkan
- Gherkin `.feature` sebagai berkas kelima Spec Pack (`FEATURES-<slug>.feature`):
  satu `Scenario` per baris Must, kriteria EARS-lite sebagai `Then`/`And`,
  komentar `# TODO` bila kriteria belum ada (tanpa `Then` palsu).
- Share link: tombol "Salin tautan" menyalin URL dengan `#s=<token>` berisi
  jawaban terkompresi (CompressionStream deflate-raw, fallback base64url
  mentah). Membuka tautan menawarkan impor sebagai proyek baru.
- Undo/redo jawaban: `Ctrl+Z` / `Ctrl+Shift+Z`, stack maksimum 30 snapshot,
  debounce 350ms agar ketikan deras menjadi satu titik undo.
- `og:image` (1200×630) dan meta Open Graph + Twitter Card di `index.html`
  dan `studio.html`.
- `prefers-reduced-motion` mematikan seluruh transisi dan animasi (rule
  global `*` di `style.css`).
- Suite aksesibilitas `tests/a11y-prd.js` (axe-core, 9 permukaan, gate
  serious/critical = 0).
- Font self-host (Inter variable + Poppins 500/600/700) — tanpa CDN.
- Palet perintah `Ctrl+K` dengan fuzzy match dan bantuan `Shift+/`.
- Coach deterministik di panel review (langkah 7): lint kata kabur per
  field + pertanyaan edge-case.
- `LICENSE` (MIT), `.github/workflows/ci.yml`, `CHANGELOG.md`,
  `CONTRIBUTING.md`, `tests/hygiene.js`.

### Diubah
- Spec Pack kini enam berkas (REQUIREMENTS, DESIGN, TASKS, TRACEABILITY,
  FEATURES, AGENTS) — tombol dan toast diperbarui.
- Cache service worker ke `prd-studio-v3.4`.
