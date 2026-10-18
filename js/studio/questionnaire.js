/* Questionnaire: satu sumber untuk daftar field wizard dan tiga tingkat
   kedalaman wawancara (lihat CONTEXT.md "Jawaban").

   Tingkat kedalaman mengatur field mana yang TAMPIL, bukan menghapus nilai:
   field tersembunyi tetap tersimpan dan tetap dipakai generator, jadi
   berpindah mode tidak pernah menghilangkan jawaban.

   Pembagian tier mengikuti komponen skor (scorer.js) supaya tidak ada
   komponen yang setengah terlihat:
     inti    : seluruh komponen "nama/masalah", "persona", "must", dan "alur"
     standar : + komponen NFR, di luar scope, metrik, dan integrasi
     lanjutan: + field kosmetik berdefault (gaya, layout, audio, stack)

   Konsekuensi yang dijaga eksplisit:
   - Mode standar (default) = perilaku lama: semua komponen skor terlihat,
     jadi angka skor dan daftar gap tidak berubah dari versi sebelumnya.
   - Mode cepat: komponen NFR/di-luar-scope/metrik/integrasi tersembunyi,
     sehingga Scorer menormalkan skor ke total poin yang terlihat, dan gap
     yang menunjuk field tersembunyi disaring dari daftar perbaikan.
   - Mode lengkap: semua field inti + standar + kosmetik tampil.

   Interface:
     Questionnaire.LEVELS        -> ['cepat','standar','lengkap']
     Questionnaire.FIELDS        -> {id: {step, tier}}
     Questionnaire.normalize(v)  -> level valid (fallback 'standar')
     Questionnaire.hiddenFields(level) -> {fieldId: true}
     Questionnaire.filterGaps(gaps, level) -> gaps yang masih bisa diperbaiki
     Questionnaire.rank(level)   -> 0..2
     Questionnaire.applyDepth(level, doc) -> toggle .field di wizard + chip a11y
*/
window.Questionnaire = (function () {
  var LEVELS = ['cepat', 'standar', 'lengkap'];

  var FIELDS = {
    /* langkah 1 */
    productName: { step: 1, tier: 'inti' },
    productType: { step: 1, tier: 'inti' },
    industry: { step: 1, tier: 'inti' },
    problem: { step: 1, tier: 'inti' },
    whyNow: { step: 1, tier: 'inti' },
    /* langkah 2 */
    primaryUser: { step: 2, tier: 'inti' },
    platform: { step: 2, tier: 'inti' },
    roles: { step: 2, tier: 'inti' },
    /* langkah 3 */
    mustHave: { step: 3, tier: 'inti' },
    shouldHave: { step: 3, tier: 'standar' },
    wontHave: { step: 3, tier: 'standar' },
    /* langkah 4 */
    mainFlow: { step: 4, tier: 'inti' },
    failFlow: { step: 4, tier: 'inti' },
    navStructure: { step: 4, tier: 'inti' },
    /* langkah 5 */
    styleDirection: { step: 5, tier: 'lanjutan' },
    layoutPref: { step: 5, tier: 'lanjutan' },
    visualNeeds: { step: 5, tier: 'standar' },
    audio: { step: 5, tier: 'lanjutan' },
    /* langkah 6 */
    stackPref: { step: 6, tier: 'lanjutan' },
    integrations: { step: 6, tier: 'standar' },
    nfr: { step: 6, tier: 'standar' },
    successMetrics: { step: 6, tier: 'standar' }
  };

  /* Dua ruang nama terpisah: LEVELS memakai nama cepat/standar/lengkap,
     FIELDS memakai tier inti/standar/lanjutan. rank() hanya untuk LEVELS;
     tierRank() memetakan tier ke angka. Jangan gabungkan keduanya: 'inti'
     tidak ada di LEVELS dan 'cepat'/'lengkap' tidak ada di tier. */
  var TIER_RANK = { inti: 0, standar: 1, lanjutan: 2 };
  function rank(level) {
    var i = LEVELS.indexOf(level);
    return i < 0 ? 1 : i;
  }
  function tierRank(tier) {
    return TIER_RANK[tier] == null ? 2 : TIER_RANK[tier];
  }
  function normalize(v) {
    return LEVELS.indexOf(v) > -1 ? v : 'standar';
  }
  /* Field yang terlihat pada sebuah level: tier rank <= rank level. */
  function visibleAt(level) {
    var r = rank(normalize(level));
    var out = {};
    Object.keys(FIELDS).forEach(function (id) {
      out[id] = tierRank(FIELDS[id].tier) <= r;
    });
    return out;
  }
  function hiddenFields(level) {
    var vis = visibleAt(level);
    var out = {};
    Object.keys(vis).forEach(function (id) { if (!vis[id]) out[id] = true; });
    return out;
  }
  /* Gap hanya ditampilkan kalau field yang menjadi sumbernya terlihat.
     Gap tanpa field (tidak bisa dipetakan) selalu lolos. */
  function filterGaps(gaps, level) {
    var hidden = hiddenFields(level);
    return (gaps || []).filter(function (g) {
      return !(g && g.field && hidden[g.field]);
    });
  }

  /* --- penerapan ke DOM wizard --- */
  var CHIP_SUFFIX = 'Chips';
  function fieldIdOf(wrap) {
    /* Cari elemen ber-id di dalam .field; container chips memakai id
       "platformChips" dan dipetakan ke field "platform". */
    var els = wrap.querySelectorAll('[id]');
    for (var i = 0; i < els.length; i++) {
      var id = els[i].id;
      if (id.slice(-CHIP_SUFFIX.length) === CHIP_SUFFIX) id = id.slice(0, -CHIP_SUFFIX.length);
      if (FIELDS[id]) return id;
    }
    return null;
  }
  function applyDepth(level, doc) {
    var d = doc || document;
    level = normalize(level);
    var hidden = hiddenFields(level);
    d.querySelectorAll('#wizard .step .field').forEach(function (wrap) {
      var id = fieldIdOf(wrap);
      if (!id) return;
      wrap.hidden = !!hidden[id];
    });
    /* Chip kedalaman: aria-checked cermin pilihan. */
    d.querySelectorAll('#depthChips .chip').forEach(function (c) {
      c.setAttribute('aria-checked', c.getAttribute('data-depth') === level ? 'true' : 'false');
    });
    /* Field yang sedang difokuskan jangan hilang diam-diam di bawah kursor. */
    var active = d.activeElement;
    if (active && active.closest && active.closest('.field') && active.closest('.field').hidden) {
      var step = active.closest('.step');
      var h = step && step.querySelector('h2');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
      else if (active.blur) active.blur();
    }
    return level;
  }

  return {
    LEVELS: LEVELS,
    FIELDS: FIELDS,
    rank: rank,
    normalize: normalize,
    visibleAt: visibleAt,
    hiddenFields: hiddenFields,
    filterGaps: filterGaps,
    applyDepth: applyDepth
  };
})();
