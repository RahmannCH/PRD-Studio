/* VideoProduction: turns brief, reference notes, claim ledger, and storyboard into an executable production plan. */
window.VideoProduction = (function () {
  function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
  function lines(value) {
    return String(value || '').split(/\r?\n/).map(function (x) { return clean(x); }).filter(Boolean);
  }
  function build(data, spec, storyboard) {
    data = data || {};
    spec = spec || {};
    storyboard = storyboard || {};
    var summary = spec.summary || {};
    var references = lines(data.videoReferences);
    var claims = lines(data.videoClaims);
    var beats = storyboard.beats || [];
    var isCausal = /explainer|deep-dive/i.test(String(data.productType || ''));
    var storyPattern = isCausal
      ? 'Masalah sehari-hari → pertanyaan/kejanggalan → mekanisme sebab-akibat → bukti → payoff yang menjawab hook.'
      : 'Hook → koreksi ekspektasi → mekanisme/aksi → bukti → payoff/CTA.';
    var out = [
      '# Paket Produksi Video: ' + clean(data.productName || summary.productName || 'Video'),
      '',
      '## 1. Creative brief',
      '- Tujuan: ' + clean(data.videoObjective || summary.oneLiner || 'Explainer; tetapkan tujuan sebelum produksi.'),
      '- Audiens: ' + clean(data.primaryUser || 'Belum ditentukan'),
      '- Platform / rasio: ' + clean(data.videoPlatform || 'YouTube Shorts / Reels') + ' / ' + clean(storyboard.ratio || data.videoRatio || '9:16'),
      '- Durasi / bahasa: ' + clean(String(storyboard.totalDuration || 60) + ' detik') + ' / Indonesia',
      '- Nada: ' + clean(data.videoTone || 'Jelas, ingin tahu, berbasis bukti'),
      '- Batas klaim: jangan nyatakan klaim belum diverifikasi sebagai fakta; label rekonstruksi dan ilustrasi.',
      '',
      '## 2. Referensi dan dekontruksi',
      references.length ? references.map(function (x, i) { return (i + 1) + '. ' + x; }).join('\n') : '- Belum ada referensi terlampir; catat akses, transkrip, frame penting, dan pelajaran yang diadaptasi sebelum produksi.',
      '- Adaptasi: ambil prinsip retensi dan penjelasan, bukan menyalin naskah, shot, atau identitas kreator.',
      '',
      '## 3. Claim ledger',
      claims.length ? claims.map(function (x, i) { return (i + 1) + '. ' + x; }).join('\n') : '- Belum ada klaim bersumber. Riset dan verifikasi sebelum render; angka serta kutipan tidak boleh diada-adakan.',
      '',
      '## 4. Rancangan cerita',
      '- Pola: ' + storyPattern,
      '- Hook: ' + clean(data.problem || 'Ajukan kejanggalan/pertanyaan spesifik yang dijawab video.'),
      '- Janji/payoff: ' + clean(summary.oneLiner || 'Jawab hook dengan mekanisme dan bukti.'),
      '- Urutan: setiap beat menjawab satu pertanyaan dan menyiapkan beat berikutnya; konkretkan abstraksi lewat objek/analogi yang tidak mengubah fakta.',
      '',
      '## 5. Storyboard per shot',
      '| Waktu | Fungsi beat | Narasi | Aksi visual / keadaan | Kamera / fokus | Teks | Audio | Fakta / status / aset |',
      '|---|---|---|---|---|---|---|'
    ];
    beats.forEach(function (b) {
      var assets = b.assets || {};
      var sources = claims.length ? 'Claim ledger: verifikasi pemetaan sumber saat riset' : 'Sumber belum disediakan';
      var status = 'Ilustrasi/rekonstruksi harus diberi label';
      var asset = [].concat(assets.footage || [], assets.props || [], assets.news || []).join('; ') || 'Tentukan aset khusus/reusable';
      var sound = (b.sfx || []).map(function (s) { return s.at + ' ' + s.desc; }).join('; ');
      out.push('| ' + clean(b.timecode) + ' (' + clean(String(b.startSec)) + '-' + clean(String(b.endSec)) + 's) | ' + clean(b.role + ': ' + b.title) + ' | ' + clean(b.vo) + ' | ' + clean(b.layout + '; ' + b.subtext) + ' | ' + clean(b.camera) + ' | ' + clean(b.headline) + ' | VO + BGM duck; ' + clean(sound || 'SFX sesuai motivasi aksi') + ' | ' + sources + '; ' + status + '; ' + clean(asset) + ' |');
    });
    out.push('', '## 6. Rencana produksi',
      '- Aset reusable: font, logo, LUT/grade, SFX/BGM berlisensi yang sudah diverifikasi.',
      '- Aset khusus: subjek/lingkungan/props dari tiap shot; simpan URL sumber, lisensi, dan path lokal.',
      '- 3D: gunakan hanya untuk menjelaskan ruang, skala, atau mekanisme; catat model/material/camera path per shot.',
      '- Audio: mix dialogue, SFX, music, ambience terpisah; VO utama, duck musik saat VO, hindari SFX rutin tanpa motivasi.',
      '- HyperFrames: setiap visual memiliki clip timing eksplisit; GSAP seek-safe; assets lokal; verifikasi storyboard, snapshot, audio durations, dan render.',
      '', '## 7. Quality gates sebelum render',
      '- [ ] Hook dijawab; tiap beat punya fungsi dan tidak mengulang.',
      '- [ ] Tiap klaim faktual punya sumber dan status verifikasi; angka turunan dihitung ulang.',
      '- [ ] Analogi menjaga makna; rekonstruksi/ilustrasi diberi label.',
      '- [ ] VO sesuai durasi; teks terbaca pada rasio target; transisi punya motivasi.',
      '- [ ] Aset memiliki sumber, lisensi, dan lokasi; tidak menyalin referensi.',
      '- [ ] Audio stem seimbang; HyperFrames check bersih; render ditinjau frame dan suara.',
      '', '## Pembagian alat',
      '- PRD Studio: brief, referensi, claim ledger, storyline, storyboard, quality gates, paket produksi.',
      '- Skills produksi: riset/aset/VO/3D/audio sesuai shotlist.',
      '- HyperFrames: komposisi, timeline, validasi, snapshot, render.',
      '- Simpan paket dan final render di History/<nama-proyek>.');
    return out.join('\n');
  }
  return { build: build };
})();
