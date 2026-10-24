/* Generator Storyboard & Motion HyperFrames 60 Detik (1920x1080 @ 30fps & 1080x1920 @ 30fps).
   Menghasilkan storyboard babak per babak, pemetaan blueprint resmi HyperFrames,
   petunjuk kamera, sound design (SFX), kueri pencarian aset mandiri multi-kategori,
   kode sintesis audio prosedural 7-instrumen, dan Master Prompt HyperFrames otonom.
   Mendukung 4 konsep gerak dan rasio 16:9 / 9:16.
   ES5 murni untuk lingkungan browser tanpa bundler. */
(function () {
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

  /* Konsep gerak adaptif */
  var CONCEPTS = {
    'ui-journey': {
      id: 'ui-journey',
      name: 'Ekosistem UI Interaktif',
      tagline: 'Kamera menukik ke UI haptic, kursor interaktif, data mekar seketika',
      cameraStyle: 'Kamera dinamis mendekati titik klik (camTo scale 1.6x), jeda saat haptic click, lalu mundur ke wide (camWide)',
      bgStyle: 'OLED Black (#080C14) dengan radial accent glow (opacity 22%) dan butiran film grain 3%',
      cardStyle: 'Double-bezel machined hardware card: outer ring border-white/8 + inner inset shadow'
    },
    'kinetic-term': {
      id: 'kinetic-term',
      name: 'Tipografi Kinetik & Terminal Monospace',
      tagline: 'Tipografi kalimat pendek masif, jendela terminal hidup, eksekusi kode 0ms',
      cameraStyle: 'Whip-pan horizontal cepat antar kata kunci, tracking kamera di sumbu Z menembus teks',
      bgStyle: 'Deep Console Vantablack (#050810) dengan scanning line CRT tipis dan partikel terminal mikro',
      cardStyle: 'Matrix code block dengan header jendela macOS/Linux dan syntax highlighting tajam'
    },
    'visual-journal': {
      id: 'visual-journal',
      name: 'Jurnalisme Data & Bukti Nyata',
      tagline: 'Headline berita asli berstabilo kuning, counter angka melesat, grafik reaktif',
      cameraStyle: 'Low-angle isometric tilt, rack focus dari headline berita ke counter metrik utama',
      bgStyle: 'Warm Dark Charcoal (#0F1218) dengan aksen highlighter kuning/amber dan grid isometrik tipis',
      cardStyle: 'Editorial clipping card dengan tag sumber berita asli dan garis pangkas rapi'
    },
    'object-relay': {
      id: 'object-relay',
      name: 'Estafet Benda & Transformasi',
      tagline: 'Satu objek pahlawan bertransformasi sepanjang babak membawa transisi adegan',
      cameraStyle: 'Kamera mengunci objek pahlawan yang melayang di tengah sambil semesta di belakangnya berganti',
      bgStyle: 'Clean Contrast Canvas dengan gradien radial 2-warna berputar lambat',
      cardStyle: 'Floating 3D container dengan depth of field dan pantulan cahaya rim-light'
    }
  };

  function GenStoryboard(data, spec, opts) {
    data = data || {};
    opts = opts || {};
    if (!spec && window.Spec && typeof window.Spec.build === 'function') {
      spec = window.Spec.build(data);
    }
    spec = spec || { summary: {}, scope: { must: [] }, stories: [], nfr: [] };

    var conceptKey = opts.concept || data.videoConcept || 'ui-journey';
    if (!CONCEPTS[conceptKey]) conceptKey = 'ui-journey';
    var concept = CONCEPTS[conceptKey];

    var ratio = opts.ratio || data.videoRatio || '16:9';
    var isVertical = ratio === '9:16';
    var width = isVertical ? 1080 : 1920;
    var height = isVertical ? 1920 : 1080;

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
        bars: 'Bar 1-3 (Ketukan 1-12 pada 120 BPM)',
        timecode: '00:00 - 00:06',
        role: 'HOOK_PAIN',
        blueprint: 'overwhelm-surround',
        rules: ['depth-of-field-blur', 'motion-blur-streak', 'reactive-displacement'],
        vo: 'Setiap hari, ' + problem.slice(0, 85) + ' [jeda 0.5s]. Waktu terbuang sia-sia hanya untuk pekerjaan berulang.',
        headline: 'MASALAH LAMA, BIAYA BESAR',
        subtext: problem.slice(0, 65),
        highlightWord: 'BIAYA BESAR',
        highlightStyle: 'under',
        layout: isVertical
          ? 'Stacked Card: Headline atas, kartu bukti masalah di bawah dengan aksen bahaya merah lembut'
          : 'Asymmetric Split: Teks headline di kiri atas, kartu bukti masalah di kanan dengan grain 3%',
        camera: 'Slow continuous push-in (scale 1.0 -> 1.08), ' + concept.cameraStyle,
        sfx: [
          { at: '00:00.0', band: 'high', type: 'riser', desc: 'Riser atmosferik gelap (riser-dark-4s.wav)' },
          { at: '00:01.8', band: 'mid', type: 'click', desc: 'Mechanical friction / paper tear (paper-tear-harsh.wav)' },
          { at: '00:04.5', band: 'mid', type: 'click', desc: 'Clock ticking anxious (ticker-heavy.wav)' },
          { at: '00:05.4', band: 'low', type: 'thud', desc: 'Sub-bass impact drop 45Hz (sub-drop-punch.wav)' }
        ],
        assets: {
          news: [
            'headline berita: "' + problem.slice(0, 35) + ' site:kompas.com OR site:detik.com"',
            'studi kasus UMKM: "kerugian akibat pembukuan manual sistem lama"'
          ],
          props: [
            'texture: crumpled paper / nota robek PNG transparent 4K',
            'icon: warning-octagon-line SVG (Phosphor Light)',
            'overlay: noise-dither-grain SVG'
          ],
          sfxKeys: [
            'paper-tear-rip-crisp',
            'heavy-metal-cash-box-slam',
            'deep-riser-cinematic-tension-4s',
            'sub-bass-drop-40hz-heavy'
          ],
          uiMockup: 'Kartu keluhan dengan avatar pengguna, cap "BELUM SELESAI" miring merah, timestamp merah'
        },
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
        bars: 'Bar 4-7 (Ketukan 13-28 pada 120 BPM)',
        timecode: '00:06 - 00:14',
        role: 'VALUE_CLAIM',
        blueprint: 'device-surface-showcase',
        rules: ['spring-pop-entrance', 'split-tilt-cards', 'svg-path-draw'],
        vo: 'Kenalkan ' + name + ' [jeda 0.4s]. ' + firstSentence(oneLiner, 'Solusi yang mengubah cara kerja selamanya') + '.',
        headline: name.toUpperCase(),
        subtext: oneLiner.slice(0, 75),
        highlightWord: name.toUpperCase(),
        highlightStyle: 'pill',
        layout: isVertical
          ? 'Centered Hero Showcase: Logo bersinar di atas, kartu perangkat ' + name + ' floating di tengah bawah'
          : 'Hero Hardware Card: ' + concept.cardStyle + ' dengan pendaran aksen biru/cyan di tengah panggung',
        camera: 'Fast whip-pan transisi kilat, kamera mundur dari kegelapan ke wide-shot panggung bercahaya penuh',
        sfx: [
          { at: '00:06.0', band: 'high', type: 'whoosh', desc: 'Cinematic air whoosh melesat (whoosh-air-whip.wav)' },
          { at: '00:07.0', band: 'mid', type: 'click', desc: 'Haptic switch click menyalakan panggung (switch-mechanical-on.wav)' },
          { at: '00:08.5', band: 'low', type: 'thud', desc: 'Resonant warm 808 sub hit (bass-hit-warm.wav)' },
          { at: '00:12.5', band: 'high', type: 'chime', desc: 'Crystalline shimmer ambient swell (crystal-shimmer.wav)' }
        ],
        assets: {
          news: [
            'brand mention / release note: "' + name + ' platform rilis resmi"'
          ],
          props: [
            'official brand vector: logo-' + slug + '.svg',
            'hardware container: laptop mockup borderless / sleek smartphone vector'
          ],
          sfxKeys: [
            'air-pressure-whoosh-fast',
            'haptic-mechanical-switch-clack',
            'sub-resonant-808-boom',
            'crystalline-ambient-shimmer-high'
          ],
          uiMockup: 'Header aplikasi ' + name + ' dengan status "Sistem Siap" hijau, pendaran glow di sekeliling'
        },
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
        bars: 'Bar 8-19 (Ketukan 29-76 pada 120 BPM)',
        timecode: '00:14 - 00:38',
        role: 'CORE_MECHANICS',
        blueprint: 'cursor-ui-demo',
        rules: ['multi-phase-camera', 'cursor-click-ripple', 'press-release-spring', 'waterfall-entry'],
        vo: 'Tiga langkah selesai [jeda 0.3s]. Pertama, ' + must1.slice(0, 60) + ' [jeda 0.4s]. Kedua, ' + must2.slice(0, 60) + ' [jeda 0.4s]. Dan ketiga, ' + must3.slice(0, 60) + '.',
        headline: 'TIGA LANGKAH INSTAN',
        subtext: '1. ' + must1.slice(0, 30) + ' | 2. ' + must2.slice(0, 30) + ' | 3. ' + must3.slice(0, 30),
        highlightWord: 'TIGA LANGKAH',
        highlightStyle: 'box',
        layout: isVertical
          ? 'Vertical Interlocking Bento: 3 kartu vertikal bertingkat saling bereaksi dengan kursor virtual'
          : 'Triple Interactive Bento: Kartu 1 input cepat, Kartu 2 animasi proses, Kartu 3 hasil instan',
        camera: 'Kamera menukik (scale 1.6x) mengikuti kursor ke tombol aksi, klik terjadi, lalu geser halus ke hasil',
        sfx: [
          { at: '00:14.5', band: 'high', type: 'whoosh', desc: 'Swift camera pan whoosh (whoosh-soft.wav)' },
          { at: '00:16.0', band: 'mid', type: 'click', desc: 'Keyboard mechanical clack rapid typing (keystrokes-fast.wav)' },
          { at: '00:22.0', band: 'mid', type: 'beep', desc: 'Process completion hum (digital-process-hum.wav)' },
          { at: '00:28.0', band: 'high', type: 'thermal', desc: 'Crisp thermal print chatter / data packet sound (hardware-action.wav)' },
          { at: '00:34.0', band: 'high', type: 'chime', desc: 'Success harmony chime (ui-success-bell.wav)' },
          { at: '00:37.2', band: 'low', type: 'thud', desc: 'Sub bass transition sweep (bass-sweep-deep.wav)' }
        ],
        assets: {
          news: [
            'arsitektur teknologi: "' + stack + ' performa tinggi offline sync"'
          ],
          props: [
            'icon: lightning-charge-line, database-check-line, file-text-line (Phosphor Light)',
            'cursor: custom precision arrow SVG dengan animasi ripple klik haptik'
          ],
          sfxKeys: [
            'rapid-mechanical-keyboard-typing-3clicks',
            'thermal-printer-stepper-motor-buzz-2s',
            'network-disconnect-soft-warning',
            'seamless-sync-harpsichord-success'
          ],
          uiMockup: 'Simulasi alur transaksi nyata: baris input terisi otomatis, tombol "Proses" tertekan, notifikasi hijau muncul'
        },
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
        bars: 'Bar 20-25 (Ketukan 77-100 pada 120 BPM)',
        timecode: '00:38 - 00:50',
        role: 'HARD_EVIDENCE',
        blueprint: 'dataviz-countup',
        rules: ['counting-dynamic-scale', 'stat-bars-and-fills', 'vertical-spring-ticker'],
        vo: 'Teruji dan terbukti [jeda 0.4s]. ' + nfrMetric + ' [jeda 0.4s]. Fondasi ' + stack + ' memastikan keandalan tanpa kompromi.',
        headline: 'BUKTI PERFORMA TANGGUH',
        subtext: nfrMetric + ' · Efisiensi maksimal teruji',
        highlightWord: 'TERUJI DAN TERBUKTI',
        highlightStyle: 'marker',
        layout: isVertical
          ? 'Vertical Metric Tower: Counter angka raksasa di atas, grafik batang performa di bawah'
          : 'Isometric Data-Viz Matrix: Counter angka melesat (stat count-up) di kiri, diagram batang reaktif di kanan',
        camera: 'Low-angle isometric 3D tilt, grid garis ukur bernapas, angka bercahaya saat mencapai 100%',
        sfx: [
          { at: '00:38.2', band: 'high', type: 'beep', desc: 'High-speed numeric ticker (counter-fast-click.wav)' },
          { at: '00:41.5', band: 'low', type: 'thud', desc: 'Heavy sub-bass slam saat counter mencapai angka kunci (heavy-sub-slam.wav)' },
          { at: '00:45.0', band: 'mid', type: 'whoosh', desc: 'Bar chart rise sound / whoosh swell (bar-rise-whoosh.wav)' },
          { at: '00:48.5', band: 'high', type: 'riser', desc: 'Reverse cymbal riser menuju penutup (reverse-cymbal-riser.wav)' }
        ],
        assets: {
          news: [
            'benchmark report: "hasil uji beban performa latency ' + stack + '"'
          ],
          props: [
            'chart: SVG animated bar chart with glow filter',
            'badge: ' + stack + ' official monocrome badge'
          ],
          sfxKeys: [
            'high-speed-digital-counter-ticker',
            'heavy-anvil-bass-slam',
            'rising-sine-sweep-frequency',
            'data-transfer-chatter-packet'
          ],
          uiMockup: 'Panel dashboard analitik: grafik efisiensi menanjak, metrik hijau "100% Selesai"'
        },
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
        bars: 'Bar 26-30 (Ketukan 101-120 pada 120 BPM)',
        timecode: '00:50 - 01:00',
        role: 'OUTRO_CTA',
        blueprint: 'logo-assemble-lockup',
        rules: ['scale-swap-transition', 'depth-scatter-assemble', 'magnetic-button-hover'],
        vo: 'Tinggalkan cara lama [jeda 0.3s]. Beralih ke ' + name + ' hari ini dan buktikan sendiri.',
        headline: name.toUpperCase(),
        subtext: 'Buka sekarang · Tanpa akun · Langsung pakai',
        highlightWord: name.toUpperCase(),
        highlightStyle: 'pill',
        layout: 'Centered Brand Lockup: Logo besar bercahaya + Tombol Pill Aksen Buka Sekarang ↗',
        camera: 'Push-through melintasi grid angka menuju logo sentral, diakhiri hold tenang yang elegan',
        sfx: [
          { at: '00:50.0', band: 'high', type: 'riser', desc: 'Impactful reverse swell audio (reverse-swell.wav)' },
          { at: '00:52.0', band: 'low', type: 'thud', desc: 'Definitive brand sonic punch (brand-sonic-punch.wav)' },
          { at: '00:54.0', band: 'high', type: 'chime', desc: 'Subtle high-resonance chime (crystal-chime-long.wav)' },
          { at: '00:58.5', band: 'mid', type: 'whoosh', desc: 'Smooth master audio fade-out to black' }
        ],
        assets: {
          news: [],
          props: [
            'logo: logo-' + slug + '-hires.svg',
            'cta button: nested pill island with arrow icon circle'
          ],
          sfxKeys: [
            'reverse-cymbal-orchestral-swell',
            'brand-sonic-signature-ding-crystal',
            'low-pass-filter-smooth-decay'
          ],
          uiMockup: 'Tombol pill bercahaya dengan efek magnetic hover glow di bawah logo'
        },
        hyperframes: {
          subcomp: '05-outro',
          path: 'compositions/frames/05-outro.html'
        }
      }
    ];

    function toMarkdownTable() {
      var lines = [];
      lines.push('| Detik | Babak & Blueprint | Narasi VO (135 WPM) | Visual Kinetik & Layout | Kamera & VFX | Sound Effects (SFX Cue Sheet) | Resep Aset Mandiri (AI Agent) |');
      lines.push('|---|---|---|---|---|---|---|');
      beats.forEach(function (b) {
        var sfxStr = b.sfx.map(function (s) {
          return '`' + s.at + '` [' + s.band + '] ' + s.desc;
        }).join('<br>');

        var assetItems = [];
        if (b.assets.news && b.assets.news.length) assetItems.push('📰 **Berita:** ' + b.assets.news.join('; '));
        if (b.assets.props && b.assets.props.length) assetItems.push('🎨 **Props:** ' + b.assets.props.join('; '));
        if (b.assets.sfxKeys && b.assets.sfxKeys.length) assetItems.push('🎧 **SFX Library:** ' + b.assets.sfxKeys.join(', '));
        if (b.assets.uiMockup) assetItems.push('💻 **UI:** ' + b.assets.uiMockup);
        var assetStr = assetItems.join('<br>');

        lines.push('| **' + b.timecode + '** | **' + b.role + '**<br>_Blueprint: ' + b.blueprint + '_ | ' + esc(b.vo) + ' | **' + esc(b.headline) + '**<br>' + esc(b.subtext) + '<br>_' + esc(b.layout) + '_ | ' + esc(b.camera) + ' | ' + sfxStr + ' | ' + assetStr + ' |');
      });
      return lines.join('\n');
    }

    function buildFrameSpec() {
      return [
        '# frame.md — Design Tokens untuk HyperFrames',
        '# Dihasilkan otomatis oleh PRD Studio (Konsep: ' + concept.name + ', Rasio: ' + ratio + ')',
        '',
        '```yaml',
        'format: "' + width + 'x' + height + '"',
        'ratio: "' + ratio + '"',
        'fps: 30',
        'duration: 60.0',
        'concept: "' + concept.id + '"',
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
        'audio:',
        '  bpm: 120',
        '  ducking_db: -14',
        '  master_volume: 0.9',
        '```'
      ].join('\n');
    }

    function buildProceduralAudioScript() {
      return [
        '/* sfx-synth.js — Sintesis Audio Prosedural 7-Instrumen Web Audio API (Offline Fallback)',
        '   Dipakai HyperFrames saat merender bila file audio eksternal tidak tersedia. */',
        '(function () {',
        '  var ctx = null;',
        '  function getCtx() {',
        '    if (!ctx && typeof window !== "undefined") {',
        '      var AC = window.AudioContext || window.webkitAudioContext;',
        '      if (AC) ctx = new AC();',
        '    }',
        '    if (ctx && ctx.state === "suspended") { ctx.resume(); }',
        '    return ctx;',
        '  }',
        '  window.SfxSynth = {',
        '    click: function (t) {',
        '      var c = getCtx(); if (!c) return;',
        '      var o = c.createOscillator(), g = c.createGain();',
        '      o.type = "sine"; o.frequency.setValueAtTime(1800, t || c.currentTime);',
        '      o.frequency.exponentialRampToValueAtTime(80, (t || c.currentTime) + 0.015);',
        '      g.gain.setValueAtTime(0.7, t || c.currentTime);',
        '      g.gain.exponentialRampToValueAtTime(0.001, (t || c.currentTime) + 0.015);',
        '      o.connect(g); g.connect(c.destination);',
        '      o.start(t || c.currentTime); o.stop((t || c.currentTime) + 0.02);',
        '    },',
        '    thud: function (t) {',
        '      var c = getCtx(); if (!c) return;',
        '      var o = c.createOscillator(), g = c.createGain();',
        '      o.type = "sine"; o.frequency.setValueAtTime(90, t || c.currentTime);',
        '      o.frequency.exponentialRampToValueAtTime(35, (t || c.currentTime) + 0.35);',
        '      g.gain.setValueAtTime(1.0, t || c.currentTime);',
        '      g.gain.exponentialRampToValueAtTime(0.001, (t || c.currentTime) + 0.35);',
        '      o.connect(g); g.connect(c.destination);',
        '      o.start(t || c.currentTime); o.stop((t || c.currentTime) + 0.36);',
        '    },',
        '    whoosh: function (t) {',
        '      var c = getCtx(); if (!c) return;',
        '      var b = c.createBuffer(1, c.sampleRate * 0.4, c.sampleRate);',
        '      var d = b.getChannelData(0);',
        '      for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.4;',
        '      var src = c.createBufferSource(); src.buffer = b;',
        '      var f = c.createBiquadFilter(); f.type = "bandpass";',
        '      f.frequency.setValueAtTime(200, t || c.currentTime);',
        '      f.frequency.exponentialRampToValueAtTime(1600, (t || c.currentTime) + 0.2);',
        '      f.frequency.exponentialRampToValueAtTime(300, (t || c.currentTime) + 0.4);',
        '      var g = c.createGain();',
        '      g.gain.setValueAtTime(0.01, t || c.currentTime);',
        '      g.gain.linearRampToValueAtTime(0.8, (t || c.currentTime) + 0.2);',
        '      g.gain.linearRampToValueAtTime(0.001, (t || c.currentTime) + 0.4);',
        '      src.connect(f); f.connect(g); g.connect(c.destination);',
        '      src.start(t || c.currentTime);',
        '    },',
        '    chime: function (t) {',
        '      var c = getCtx(); if (!c) return;',
        '      [880, 1760].forEach(function (freq, idx) {',
        '        var o = c.createOscillator(), g = c.createGain();',
        '        o.type = "sine"; o.frequency.setValueAtTime(freq, (t || c.currentTime) + idx * 0.05);',
        '        g.gain.setValueAtTime(0.4, (t || c.currentTime) + idx * 0.05);',
        '        g.gain.exponentialRampToValueAtTime(0.001, (t || c.currentTime) + 0.8 + idx * 0.05);',
        '        o.connect(g); g.connect(c.destination);',
        '        o.start((t || c.currentTime) + idx * 0.05); o.stop((t || c.currentTime) + 0.85 + idx * 0.05);',
        '      });',
        '    },',
        '    thermal: function (t) {',
        '      var c = getCtx(); if (!c) return;',
        '      var b = c.createBuffer(1, c.sampleRate * 0.6, c.sampleRate);',
        '      var d = b.getChannelData(0);',
        '      for (var i = 0; i < d.length; i++) d[i] = (i % 30 < 15 ? 0.3 : -0.3) + (Math.random() * 0.2 - 0.1);',
        '      var src = c.createBufferSource(); src.buffer = b;',
        '      var f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(1400, t || c.currentTime);',
        '      var g = c.createGain(); g.gain.setValueAtTime(0.5, t || c.currentTime);',
        '      g.gain.exponentialRampToValueAtTime(0.001, (t || c.currentTime) + 0.6);',
        '      src.connect(f); f.connect(g); g.connect(c.destination);',
        '      src.start(t || c.currentTime);',
        '    },',
        '    beep: function (t) {',
        '      var c = getCtx(); if (!c) return;',
        '      var o = c.createOscillator(), g = c.createGain();',
        '      o.type = "sine"; o.frequency.setValueAtTime(2400, t || c.currentTime);',
        '      g.gain.setValueAtTime(0.6, t || c.currentTime);',
        '      g.gain.exponentialRampToValueAtTime(0.001, (t || c.currentTime) + 0.08);',
        '      o.connect(g); g.connect(c.destination);',
        '      o.start(t || c.currentTime); o.stop((t || c.currentTime) + 0.09);',
        '    },',
        '    riser: function (t) {',
        '      var c = getCtx(); if (!c) return;',
        '      var o = c.createOscillator(), g = c.createGain();',
        '      o.type = "sawtooth"; o.frequency.setValueAtTime(180, t || c.currentTime);',
        '      o.frequency.exponentialRampToValueAtTime(1400, (t || c.currentTime) + 1.2);',
        '      g.gain.setValueAtTime(0.05, t || c.currentTime);',
        '      g.gain.linearRampToValueAtTime(0.7, (t || c.currentTime) + 1.1);',
        '      g.gain.linearRampToValueAtTime(0.001, (t || c.currentTime) + 1.25);',
        '      var f = c.createBiquadFilter(); f.type = "lowpass";',
        '      f.frequency.setValueAtTime(400, t || c.currentTime);',
        '      f.frequency.exponentialRampToValueAtTime(2500, (t || c.currentTime) + 1.2);',
        '      o.connect(f); f.connect(g); g.connect(c.destination);',
        '      o.start(t || c.currentTime); o.stop((t || c.currentTime) + 1.3);',
        '    }',
        '  };',
        '})();'
      ].join('\n');
    }

    function buildMasterPrompt() {
      var lines = [];
      lines.push('# MASTER PROMPT: Bangun Video HyperFrames 60 Detik Berkelas Dunia');
      lines.push('');
      lines.push('Kamu adalah **Principal Motion Graphic Designer & Video Engineer** kelas dunia.');
      lines.push('Tugasmu adalah merancang, menyusun kode, mencari aset mandiri, dan me-render video promosi 60 detik (' + width + 'x' + height + ' @ 30fps) menggunakan **HyperFrames**.');
      lines.push('');
      lines.push('## Data Produk');
      lines.push('- **Nama Produk:** ' + name);
      lines.push('- **Tipe:** ' + type);
      lines.push('- **Target Audiens:** ' + user);
      lines.push('- **Nilai Utama:** ' + oneLiner);
      lines.push('- **Arah Visual:** ' + styleDir);
      lines.push('- **Stack:** ' + stack);
      lines.push('- **Konsep Gerak:** ' + concept.name + ' (' + concept.tagline + ')');
      lines.push('- **Rasio & Resolusi:** ' + ratio + ' (' + width + 'x' + height + ')');
      lines.push('- **Koreografi Kamera:** ' + concept.cameraStyle);
      lines.push('- **Desain Latar Belakang:** ' + concept.bgStyle);
      lines.push('- **Desain Kartu UI:** ' + concept.cardStyle);
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
      lines.push('## Resep Pencarian Aset Mandiri untuk AI Agent:');
      lines.push('Gunakan kueri pencarian berikut untuk menemukan aset nyata (jangan memakai placeholder):');
      beats.forEach(function (b) {
        lines.push('### ' + b.title);
        lines.push('- **Blueprint HyperFrames:** `' + b.blueprint + '` | Rules: `' + b.rules.join('`, `') + '`');
        if (b.assets.news && b.assets.news.length) lines.push('- **Berita/Isu:** `' + b.assets.news.join('`, `') + '`');
        if (b.assets.props && b.assets.props.length) lines.push('- **Props/Vektor:** `' + b.assets.props.join('`, `') + '`');
        if (b.assets.sfxKeys && b.assets.sfxKeys.length) lines.push('- **Pustaka SFX:** `' + b.assets.sfxKeys.join('`, `') + '`');
        if (b.assets.uiMockup) lines.push('- **UI Mockup:** ' + b.assets.uiMockup);
      });
      lines.push('');
      lines.push('## Protokol Eksekusi Mandiri untuk AI Agent:');
      lines.push('Jalankan langkah-langkah berikut secara berurutan:');
      lines.push('1. Scaffold proyek: `npx hyperframes init videos/' + slug + ' --non-interactive --example=blank`');
      lines.push('2. Buat sub-komposisi modular di `videos/' + slug + '/compositions/frames/`:');
      beats.forEach(function (b) {
        lines.push('   - `' + b.hyperframes.path + '` (Blueprint: ' + b.blueprint + ', durasi ' + b.durationSec + 's)');
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
      concept: concept,
      concepts: CONCEPTS,
      ratio: ratio,
      isVertical: isVertical,
      width: width,
      height: height,
      beats: beats,
      markdown: toMarkdownTable(),
      frameSpec: buildFrameSpec(),
      proceduralAudio: buildProceduralAudioScript(),
      masterPrompt: buildMasterPrompt()
    };
  }

  GenStoryboard.CONCEPTS = CONCEPTS;
  window.GenStoryboard = GenStoryboard;
})();
