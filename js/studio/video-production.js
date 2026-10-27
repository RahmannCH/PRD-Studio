/* VideoProduction: truthful handoff from saved brief and selected storyboard. */
window.VideoProduction = (function () {
  var STYLES = {
    native: { id: 'native', name: 'Ikuti konsep gerak', source: 'PRD Studio', characteristics: 'Ikuti konsep gerak yang dipilih; tidak memaksakan kulit visual.' },
    'cartoon-collage': { id: 'cartoon-collage', name: 'Cartoon collage', source: 'https://github.com/bangtutorial/bang-motion (MIT) · references/explainer.md', characteristics: 'Kertas hangat bertekstur, cutout ilustrasi, aksen warna dan anotasi tangan; kamera menyusuri satu dunia kolase.' },
    'cartoon-stage': { id: 'cartoon-stage', name: 'Cartoon stage', source: 'https://github.com/bangtutorial/bang-motion (MIT) · references/kartun-panggung.md', characteristics: 'Panggung flat cerah per lokasi; karakter dan objek bergerak; kamera menemani aksi; cut/geser bermotivasi; tanpa caption dan tanpa miniatur.' }
  };
  function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
  function lines(value) { return String(value || '').split(/\r?\n/).map(function (x) { return clean(x); }).filter(Boolean); }
  function splitRow(value) { return String(value || '').split('|').map(function (x) { return clean(x); }); }
  function escapeCell(value) { return clean(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' '); }
  function statusOf(row, index, fallback) { return clean(row[index]) || fallback; }
  function build(data, spec, storyboard) {
    data = data || {}; spec = spec || {}; storyboard = storyboard || {};
    var summary = spec.summary || {};
    var references = lines(data.videoReferences);
    var claims = lines(data.videoClaims);
    var style = STYLES[data.videoVisualStyle || (storyboard.visualStyle && storyboard.visualStyle.id)] || STYLES.native;
    var beats = storyboard.beats || [];
    var isCausal = /explainer|deep-dive/i.test(String(data.productType || ''));
    var storyPattern = isCausal ? 'Masalah sehari-hari → pertanyaan/kejanggalan → mekanisme sebab-akibat → bukti → payoff yang menjawab hook.' : 'Hook → koreksi ekspektasi → mekanisme/aksi → bukti → payoff/CTA.';
    var out = [
      '# Paket Produksi Video: ' + clean(data.productName || summary.productName || 'Video'), '',
      '## 1. Creative brief',
      '- Tujuan: ' + clean(data.videoObjective || summary.oneLiner || 'Belum ditentukan.'),
      '- Audiens: ' + clean(data.primaryUser || 'Belum ditentukan'),
      '- Platform / rasio: ' + clean(data.videoPlatform || 'Belum ditentukan') + ' / ' + clean(storyboard.ratio || data.videoRatio || '16:9'),
      '- Durasi / bahasa: ' + clean(String(storyboard.totalDuration || 60) + ' detik') + ' / Indonesia',
      '- Nada: ' + clean(data.videoTone || 'Belum ditentukan'),
      '- CTA: ' + clean(data.videoCta || 'Belum ditentukan; tidak ada klaim atau janji yang ditambahkan.'),
      '- Batas klaim: klaim belum diverifikasi tidak dinyatakan sebagai fakta; setiap visual diberi status faktual/ilustrasi/rekonstruksi.', '',
      '## 2. Gaya visual (opsional)',
      '- Pilihan: ' + style.name + ' (' + style.id + ')', '- Sumber: ' + style.source,
      '- Ciri: ' + style.characteristics,
      '- Gaya visual terpisah dari konsep gerak: ' + clean(storyboard.concept && storyboard.concept.name || data.videoConcept || 'bawaan'),
      '- Referensi gaya dipakai sebagai prinsip, bukan salinan naskah, shot khas, atau aset.', '',
      '## 3. Referensi dan dekontruksi',
      references.length ? references.map(function (x, i) { var p = splitRow(x); return (i + 1) + '. URL: ' + (p[0] || 'belum ada') + ' | pelajaran: ' + (p[1] || 'belum dicatat') + ' | akses/analisis: ' + (p[2] || 'belum diverifikasi') + ' | frame/audio: ' + (p[3] || 'belum diperiksa'); }).join('\n') : '- Belum ada referensi; analisis belum dilakukan.',
      '- Adaptasi: ambil prinsip narasi/retensi yang teramati saja. Tidak mengklaim analisis visual tanpa inspeksi visual.', '',
      '## 4. Claim ledger',
      claims.length ? claims.map(function (x, i) { var p = splitRow(x); return (i + 1) + '. Klaim: ' + (p[0] || '') + ' | sumber: ' + (p[1] || 'tidak diberikan') + ' | verifikasi: ' + statusOf(p, 2, 'unverified') + ' | batas/ketidakpastian: ' + (p[3] || 'belum dicatat'); }).join('\n') : '- Belum ada klaim bersumber; jangan mengada-adakan angka atau bukti.', '',
      '## 5. Rancangan cerita', '- Pola (kandidat, bukan paksaan): ' + storyPattern,
      '- Hook: ' + clean(data.problem || 'Belum ditentukan.'),
      '- Janji/payoff: ' + clean(summary.oneLiner || data.videoObjective || 'Belum ditentukan.'),
      '- Tiap beat menjawab pertanyaan dan menyiapkan beat berikutnya; analogi harus menjaga makna.', '',
      '## 6. Storyboard per shot',
      '| Waktu global | Fungsi | Narasi | Aksi / subjek / lingkungan | Kamera / fokus | Teks | Klaim / sumber / status | Visual / aset / lisensi | Audio / timebase / mix | Transisi / alasan |',
      '|---|---|---|---|---|---|---|---|---|---|'
    ];
    beats.forEach(function (b) {
      var assets = b.assets || {};
      var evidence = claims.length ? 'belum dipetakan ke shot' : 'klaim/sumber tidak diberikan';
      var depiction = b.depiction || 'ilustrasi/rekonstruksi (label saat produksi)';
      var assetQueries = [].concat(assets.footage || [], assets.props || [], assets.news || []).join('; ');
      var asset = (assetQueries ? 'kandidat pencarian, bukan aset terunduh: ' + assetQueries : 'tidak ada file aset terlampir') + '; lisensi belum diverifikasi';
      var cues = (b.sfx || []).map(function (s) { return String(s.at || '') + ' (offset relatif ke beat) ' + clean(s.desc); }).join('; ');
      var visualAction = clean((b.action || b.layout || '') + '; ' + (b.subject || '') + '; ' + (b.environment || 'lingkungan belum dirinci'));
      out.push('| ' + escapeCell(b.timecode + ' (' + b.startSec + '-' + b.endSec + 's)') + ' | ' + escapeCell(b.role + ': ' + b.title) + ' | ' + escapeCell(b.vo) + ' | ' + escapeCell(visualAction) + ' | ' + escapeCell((b.camera || '') + '; fokus: ' + (b.focus || b.headline || 'belum ditentukan')) + ' | ' + escapeCell(b.headline + '; ' + b.subtext) + ' | ' + escapeCell(evidence + '; verifikasi belum dipetakan') + ' | ' + escapeCell(depiction + '; ' + asset) + ' | ' + escapeCell('VO utama; mix/ducking belum diimplementasikan di spesifikasi' + (cues ? '; SFX ' + cues : '; SFX belum dirinci') + '; BGM/ambience belum ditentukan') + ' | ' + escapeCell((b.transition || 'cut') + '; alasan: perubahan beat/aksi (validasi saat produksi)') + ' |');
    });
    out.push('', '## 7. Rencana produksi',
      '- Query aset hanya kandidat; catat URL final, lisensi, path lokal, dan status per aset sebelum dipakai.',
      '- Bedakan footage faktual, rekonstruksi, diagram, dan ilustrasi. Jangan samakan dengan bukti.',
      '- 3D dipilih jika menjelaskan ruang, skala, atau mekanisme; tulis model/material/camera path per shot.',
      '- Audio stems (VO/SFX/music/ambience), cue timebase, dan ducking perlu diwujudkan serta diperiksa; dokumen ini bukan bukti implementasi.',
      '- HyperFrames: timing eksplisit, timeline seek-safe, assets lokal. Jalankan check, ambil snapshot, render lalu dengarkan/tonton.', '',
      '## 8. Quality gates sebelum render',
      '- [ ] Hook terjawab; beat punya fungsi; timing pas dengan VO.',
      '- [ ] Tiap klaim faktual punya URL sumber, status, ketidakpastian, dan shot mapping eksplisit.',
      '- [ ] Referensi diberi status akses dan analisis; visual hanya diklaim teramati setelah ditinjau.',
      '- [ ] Aset didapat, lisensi dan path dicatat; search query tidak dianggap aset.',
      '- [ ] Audio cue global/relatif jelas; stems dan mix diverifikasi; tidak ada klaim ducking otomatis palsu.',
      '- [ ] Gaya terpilih diterapkan konsisten tapi opsional; transisi beralasan; anti-PPT lolos.',
      '- [ ] HyperFrames check bersih; render diperiksa visual dan audio.', '',
      '## Pembagian alat', '- PRD Studio: brief, referensi, klaim, cerita, storyboard, quality gates, paket produksi.',
      '- Bang Motion: referensi aturan gaya opsional (MIT), bukan aset/naskah untuk disalin.',
      '- Skills produksi: riset, perolehan aset, VO/3D/audio sesuai shotlist.',
      '- HyperFrames: komposisi, timeline, validasi dan render.',
      '- Simpan paket dan final render di History/<nama-proyek>.');
    return out.join('\n');
  }
  function hydrate(data) { data = data || {}; return { vReferences: data.videoReferences || '', vClaimLedger: data.videoClaims || '', vCta: data.videoCta || '', vVisualStyle: data.videoVisualStyle || 'native' }; }
  function directorData(saved, form) {
    saved = saved || {}; form = form || {};
    var result = {};
    Object.keys(saved).forEach(function (k) { result[k] = saved[k]; });
    if (Object.prototype.hasOwnProperty.call(form, 'vReferences')) result.videoReferences = form.vReferences;
    if (Object.prototype.hasOwnProperty.call(form, 'vClaimLedger')) result.videoClaims = form.vClaimLedger;
    if (Object.prototype.hasOwnProperty.call(form, 'vCta')) result.videoCta = form.vCta;
    if (Object.prototype.hasOwnProperty.call(form, 'vVisualStyle')) result.videoVisualStyle = form.vVisualStyle;
    return result;
  }
  function storyboardForExport(result) { return result && result.lastResult && result.lastResult.storyboard || result && result.storyboard || null; }
  function mapClaimToBeat(claimLine) { var p = splitRow(claimLine); return { claim: p[0] || '', source: p[1] || '', status: p[2] || 'unverified' }; }
  function referenceStatus(line) { var p = splitRow(line); return p[2] || 'unverified'; }
  return { build: build, styles: function () { return STYLES; }, hydrate: hydrate, directorData: directorData, storyboardForExport: storyboardForExport, mapClaimToBeat: mapClaimToBeat, referenceStatus: referenceStatus };
})();
