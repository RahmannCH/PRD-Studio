/* Generator Storyboard & Motion HyperFrames 60 Detik (1920x1080 @ 30fps).
   Menghasilkan storyboard babak per babak, petunjuk kamera, sound design (SFX),
   kueri pencarian aset mandiri untuk AI agent, dan Master Prompt HyperFrames.
   Ditata dengan pola Reverse Iceberg (Nilai dulu, bukti menyusul).
   ES5 murni untuk lingkungan browser tanpa bundler. */
(function () {
  var SH = window.PrdShared || {};
  var esc = (window.Exporter && window.Exporter.escMd) || function (x) { return String(x || ''); };

  function clean(s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
  }

  function firstSentence(text, fallback) {
    var s = clean(text);
    if (!s) return fallback || '';
    var m = s.match(/^([^.!?]+[.!?]?)/);
    return m ? m[1].trim() : s;
  }

  function GenStoryboard(data, spec) {
    data = data || {};
    if (!spec && window.Spec && typeof window.Spec.build === 'function') {
      spec = window.Spec.build(data);
    }
    spec = spec || { summary: {}, scope: { must: [] }, stories: [], nfr: [] };

    var name = clean(data.productName) || 'Produk';
    var slug = (window.Exporter && window.Exporter.slug) ? window.Exporter.slug(name) : 'produk';
    var type = clean(data.productType) || 'Aplikasi Web';
    var user = clean(data.primaryUser) || 'pengguna utama';
    var problem = clean(data.problem) || 'proses manual lambat dan rentan salah';
    var whyNow = clean(data.whyNow) || 'kebutuhan otomatisasi semakin mendesak';
    var oneLiner = clean(spec.summary && spec.summary.oneLiner) || (name + ' adalah solusi modern untuk ' + user);
    var styleDir = clean(data.styleDirection) || 'Bersih profesional terang';
    var stack = clean(data.stackPref) || 'HTML CSS JS vanilla';

    var mustList = (spec.scope && Array.isArray(spec.scope.must)) ? spec.scope.must : [];
    var must1 = mustList[0] ? clean(mustList[0].text) : 'Pencatatan data instan dan akurat';
    var must2 = mustList[1] ? clean(mustList[1].text) : 'Otomatisasi alur kerja harian';
    var must3 = mustList[2] ? clean(mustList[2].text) : 'Laporan terpusat siap pakai';

    var nfrList = Array.isArray(spec.nfr) ? spec.nfr : [];
    var nfrMetric = nfrList[0] ? clean(nfrList[0].text || nfrList[0]) : 'Respons di bawah 2 detik';

    var beats = [
      {
        id: 'beat-01',
        title: 'Babak 1: The Cold Open / Pain Hook',
        startSec: 0,
        endSec: 6,
        durationSec: 6.0,
        timecode: '00:00 - 00:06',
        role: 'HOOK_PAIN',
        vo: 'Setiap hari, ' + problem.slice(0, 90) + '. Waktu habis hanya untuk pekerjaan berulang.',
        headline: 'MASALAH LAMA, BIAYA BESAR',
        subtext: problem.slice(0, 60),
        layout: 'Asymmetric Bento dengan fokus masalah, kontras redup, aksen bahaya lembut',
        camera: 'Slow drift push-in (scale 1.0 -> 1.08), ambient mesh glow redup + film grain 3%',
        sfx: [
          { at: '00:00.0', desc: 'Riser atmosferik misterius' },
          { at: '00:02.5', desc: 'Suara kertas / gesekan mekanik berat' },
          { at: '00:05.2', desc: 'Sub-bass impact drop menandai akhir rasa sakit' }
        ],
        assets: [
          'Berita headline masalah: "' + problem.slice(0, 40) + ' site:kompas.com OR site:detik.com"',
          'Foto situasi nyata dokumen / antrean manual resolusi tinggi'
        ],
        hyperframes: {
          subcomp: '01-hook',
          path: 'compositions/frames/01-hook.html'
        }
      },
      {
        id: 'beat-02',
        title: 'Babak 2: The Value Statement (Reverse Iceberg)',
        startSec: 6,
        endSec: 14,
        durationSec: 8.0,
        timecode: '00:06 - 00:14',
        role: 'VALUE_CLAIM',
        vo: 'Kenalkan ' + name + '. ' + firstSentence(oneLiner, 'Solusi yang mengubah cara kerja selamanya') + '.',
        headline: name.toUpperCase(),
        subtext: oneLiner.slice(0, 75),
        layout: 'Hero Hardware Card (Double-bezel machined UI) dengan radial accent glow menyala',
        camera: 'Whip-pan transisi kilat, kamera mundur ke wide shot, panggung terang benderang',
        sfx: [
          { at: '00:06.0', desc: 'Fast energy whoosh mendaratkan logo' },
          { at: '00:07.2', desc: 'Crisp mechanical switch clack' },
          { at: '00:12.0', desc: 'Ambient shimmer nada optimis' }
        ],
        assets: [
          'Logo vektor resmi SVG ' + name,
          'Frame mockup perangkat minimalis (laptop/ponsel)'
        ],
        hyperframes: {
          subcomp: '02-value',
          path: 'compositions/frames/02-value.html'
        }
      },
      {
        id: 'beat-03',
        title: 'Babak 3: Core Mechanism / Product in Action',
        startSec: 14,
        endSec: 38,
        durationSec: 24.0,
        timecode: '00:14 - 00:38',
        role: 'CORE_MECHANICS',
        vo: 'Pertama, ' + must1 + '. Kedua, ' + must2 + '. Ditambah ' + must3 + '. Semua terhubung dalam satu sistem yang responsif.',
        headline: 'TIGA LANGKAH INSTAN',
        subtext: '1. ' + must1.slice(0, 35) + ' | 2. ' + must2.slice(0, 35) + ' | 3. ' + must3.slice(0, 35),
        layout: 'Triple Interactive Bento: kartu 1 aksi cepat, kartu 2 animasi proses, kartu 3 hasil instan',
        camera: 'Kamera menukik dinamis (scale 1.5x) ke kartu aksi aktif, pan horizontal halus antar alur',
        sfx: [
          { at: '00:15.0', desc: '3x rapid UI click / tap haptic' },
          { at: '00:22.5', desc: 'Data processing hum / digital chime' },
          { at: '00:30.0', desc: 'Success confirmation chord' },
          { at: '00:37.0', desc: 'Whoosh sweep transisi ke data' }
        ],
        assets: [
          'Komponen UI HTML asli dari mainFlow produk',
          'Ikon vektor ringan (Phosphor Light / Remix Line)'
        ],
        hyperframes: {
          subcomp: '03-mechanism',
          path: 'compositions/frames/03-mechanism.html'
        }
      },
      {
        id: 'beat-04',
        title: 'Babak 4: Hard Evidence / Benchmark & NFR',
        startSec: 38,
        endSec: 50,
        durationSec: 12.0,
        timecode: '00:38 - 00:50',
        role: 'HARD_EVIDENCE',
        vo: 'Bukan sekadar janji. ' + nfrMetric + '. Dibangun di atas fondasi ' + stack + ' yang tangguh dan teruji.',
        headline: 'BUKTI PERFORMA TANGGUH',
        subtext: nfrMetric + ' · Efisiensi terbukti',
        layout: 'Isometric Data-Viz: penghitung angka melesat (stat count-up) + grafik batang animasi',
        camera: 'Low-angle isometric tilt 3D, grid teknis berdenyut, highlight angka berpendar',
        sfx: [
          { at: '00:38.2', desc: 'Rapid counting ticker clock' },
          { at: '00:42.0', desc: 'Heavy bass thud saat angka 100% terkunci' },
          { at: '00:48.5', desc: 'Reverse sweep riser menuju penutup' }
        ],
        assets: [
          'Diagram metrik performa SVG / HTML canvas bar',
          'Badge teknologi: ' + stack
        ],
        hyperframes: {
          subcomp: '04-proof',
          path: 'compositions/frames/04-proof.html'
        }
      },
      {
        id: 'beat-05',
        title: 'Babak 5: Outro & Call to Action',
        startSec: 50,
        endSec: 60,
        durationSec: 10.0,
        timecode: '00:50 - 01:00',
        role: 'OUTRO_CTA',
        vo: 'Tinggalkan cara lama. Gunakan ' + name + ' hari ini dan rasakan perbedaannya.',
        headline: name.toUpperCase(),
        subtext: 'Mulai sekarang · Tersedia online',
        layout: 'Centered Brand Lockup: Logo besar bercahaya + Tombol Pill Aksen Buka Sekarang',
        camera: 'Push-through cepat melintasi grid angka menuju logo sentral, diakhiri hold tenang',
        sfx: [
          { at: '00:50.0', desc: 'Reverse cymbal swell dramatis' },
          { at: '00:52.5', desc: 'Punchy brand sonic logo ding' },
          { at: '00:58.0', desc: 'Smooth audio fade out' }
        ],
        assets: [
          'Logo utama vektor resolusi ultra-tinggi',
          'URL atau QR code tujuan'
        ],
        hyperframes: {
          subcomp: '05-outro',
          path: 'compositions/frames/05-outro.html'
        }
      }
    ];

    function toMarkdownTable() {
      var lines = [];
      lines.push('| Detik | Babak | Narasi VO (135 WPM) | Visual Kinetik & Layout | Kamera & VFX | Sound Effects (SFX) |');
      lines.push('|---|---|---|---|---|---|');
      beats.forEach(function (b) {
        var sfxStr = b.sfx.map(function (s) { return s.at + ' ' + s.desc; }).join('<br>');
        lines.push('| **' + b.timecode + '** | **' + b.role + '** | ' + esc(b.vo) + ' | **' + esc(b.headline) + '**<br>' + esc(b.subtext) + '<br>_' + esc(b.layout) + '_ | ' + esc(b.camera) + ' | ' + sfxStr + ' |');
      });
      return lines.join('\n');
    }

    function buildFrameSpec() {
      return [
        '# frame.md — Design Tokens untuk HyperFrames',
        '',
        '```yaml',
        'format: "1920x1080"',
        'fps: 30',
        'duration: 60.0',
        'palette:',
        '  background: "#080C14"',
        '  surface: "#0E1524"',
        '  surface_accent: "#162238"',
        '  text_primary: "#F4F7FB"',
        '  text_muted: "rgba(244, 247, 251, 0.65)"',
        '  brand_primary: "#48CAE4"',
        '  brand_glow: "rgba(72, 202, 228, 0.22)"',
        '  danger: "#FF4D4D"',
        '  success: "#00E599"',
        'typography:',
        '  display: "Satoshi, Plus Jakarta Sans, system-ui"',
        '  body: "Plus Jakarta Sans, system-ui"',
        '  mono: "JetBrains Mono, monospace"',
        'motion:',
        '  default_ease: "cubic-bezier(0.32, 0.72, 0, 1)"',
        '  spring_ease: "cubic-bezier(0.175, 0.885, 0.32, 1.275)"',
        '  camera_drift: "cubic-bezier(0.25, 1, 0.5, 1)"',
        '```'
      ].join('\n');
    }

    function buildMasterPrompt() {
      var lines = [];
      lines.push('# MASTER PROMPT: Bangun Video HyperFrames 60 Detik Berkelas Dunia');
      lines.push('');
      lines.push('Kamu adalah **Principal Motion Graphic Designer & Video Engineer** kelas dunia.');
      lines.push('Tugasmu adalah merancang, menyusun kode, mencari aset mandiri, dan me-render video promosi 60 detik (1920x1080 @ 30fps) menggunakan **HyperFrames**.');
      lines.push('');
      lines.push('## Data Produk');
      lines.push('- **Nama Produk:** ' + name);
      lines.push('- **Tipe:** ' + type);
      lines.push('- **Target Audiens:** ' + user);
      lines.push('- **Nilai Utama:** ' + oneLiner);
      lines.push('- **Arah Visual:** ' + styleDir);
      lines.push('- **Stack:** ' + stack);
      lines.push('');
      lines.push('## Storyboard Detik demi Detik (Wajib Diikuti Presisi)');
      lines.push(toMarkdownTable());
      lines.push('');
      lines.push('## HUKUM ANTI-PPT & ANTI-SLOP (Pelanggaran = GAGAL):');
      lines.push('1. **Dilarang Slide Deck:** Dilarang membuat adegan berupa `<section>` yang dinyalakan-dimatikan dengan `autoAlpha`. Kamera harus menyusuri satu semesta ruang berkelanjutan (continuous world).');
      lines.push('2. **Aturan 2 Baris Tipografi:** Judul utama dilarang melebihi 2–3 baris. Gunakan font display 64–100px yang tegas, jangan biarkan teks membungkus panjang.');
      lines.push('3. **Latar Belakang Bernapas:** Latar belakang wajib memiliki 3 lapis: (a) ambient radial glow + film grain tipis; (b) subjek kartu/UI; (c) garis ukur atau metadata monospace halus.');
      lines.push('4. **Semua Gerakan Punya Suara:** Setiap transisi visual, teks mendarat, atau interaksi kartu WAJIB dipasangkan tag `<audio>` SFX sesuai detik di tabel.');
      lines.push('5. **Desain Haptic Double-Bezel:** Setiap kartu UI harus memiliki outer shell (`border: 1px solid rgba(255,255,255,0.08)`) dan inner core berkilau (`box-shadow: inset 0 1px 1px rgba(255,255,255,0.15)`).');
      lines.push('');
      lines.push('## Protokol Eksekusi Mandiri untuk AI Agent:');
      lines.push('Jalankan langkah-langkah berikut secara berurutan:');
      lines.push('1. Scaffold proyek: `npx hyperframes init videos/' + slug + ' --non-interactive --example=blank`');
      lines.push('2. Buat sub-komposisi modular di `videos/' + slug + '/compositions/frames/`:');
      beats.forEach(function (b) {
        lines.push('   - `' + b.hyperframes.path + '` (durasi ' + b.durationSec + 's)');
      });
      lines.push('3. Susun `index.html` root yang merakit kelima sub-komposisi di atas.');
      lines.push('4. Tulis timeline GSAP tunggal yang seekable: `window.__timelines["<id>"] = tl`. Tanpa `Math.random` acak, tanpa konflik transform CSS.');
      lines.push('5. Siapkan trek audio: letakkan BGM dengan ducking -14dB saat narasi VO aktif, dan bunyikan tag `<audio id="...">` untuk SFX.');
      lines.push('6. Lakukan audit otomatis: `npx hyperframes check --json` di folder proyek. Wajib perbaiki sampai 0 error.');
      lines.push('7. Render video final: `npx hyperframes render --format mp4`.');
      lines.push('');
      lines.push('Mulai sekarang dari Langkah 1.');
      return lines.join('\n');
    }

    return {
      name: name,
      slug: slug,
      totalDuration: 60.0,
      fps: 30,
      beats: beats,
      markdown: toMarkdownTable(),
      frameSpec: buildFrameSpec(),
      masterPrompt: buildMasterPrompt()
    };
  }

  window.GenStoryboard = GenStoryboard;
})();
