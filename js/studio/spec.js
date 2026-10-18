/* Spec: satu objek data hasil jawaban user, sumber kebenaran semua output.
   Interface: Spec.build(jawaban, skor) -> spec.
   Semua renderer (markdown, brief, json, yaml, html) membaca spec ini; tidak
   ada yang membaca jawaban mentah lagi. Kriteria, endpoint, risiko, dan
   metrik diturunkan dari Knowledge lewat pencocokan fitur per baris Must,
   jadi output mengikuti isi jawaban, bukan daftar seragam per tipe produk. */
window.Spec = (function () {
  var K = window.Knowledge;
  var SH = window.PrdShared;
  var lines = SH.lines;

  var BASE_CRITERIA = {
    sukses: 'berhasil menampilkan konfirmasi dengan status tersimpan yang bisa diverifikasi ulang',
    gagal: 'gagal menampilkan sebab plus tombol ulangi tanpa kehilangan input'
  };
  var MEDIA_RULES = [
    'suara hanya umpan balik aksi (klik, sukses, gagal)',
    'ada tombol bisu',
    'tanpa autoplay'
  ];
  var SCREEN_STATES = [
    'kosong (panduan isi pertama)',
    'memuat (indikator)',
    'gagal (sebab dan tombol ulangi)'
  ];

  function pad2(x) { return (x < 10 ? '0' : '') + x; }
  /* Tutup kalimat dengan satu titik saja; jawaban user sering sudah
     memakai titik sendiri sehingga dulu muncul "..". */
  function sent(s) {
    var t = String(s || '').trim();
    if (!t) return t;
    return /[.!?]$/.test(t) ? t : t + '.';
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function low(s) { return String(s || '').charAt(0).toLowerCase() + String(s || '').slice(1); }
  function dedupeRisks(list) {
    var seen = {}, sebab = [], mitigasi = [];
    list.forEach(function (r) {
      (r.sebab || []).forEach(function (s) {
        var k = String(s).trim().toLowerCase();
        if (!k || seen[k]) return;
        seen[k] = true; sebab.push(String(s).trim());
      });
      (r.mitigasi || []).forEach(function (s) {
        var k = 'm:' + String(s).trim().toLowerCase();
        if (!k || seen[k]) return;
        seen[k] = true; mitigasi.push(String(s).trim());
      });
    });
    return { sebab: sebab, mitigasi: mitigasi };
  }
  function dedupeEndpoints(list) {
    var seen = {}, out = [];
    list.forEach(function (e) {
      var k = (e.m + ' ' + e.p).toLowerCase();
      if (seen[k]) return;
      seen[k] = true; out.push({ m: e.m, p: e.p, guard: e.guard || '' });
    });
    return out;
  }

  function build(a, score) {
    a = a || {};
    var must = lines(a.mustHave);
    var should = lines(a.shouldHave);
    var wont = lines(a.wontHave);
    var roles = lines(a.roles);
    var integ = lines(a.integrations);
    var platform = Array.isArray(a.platform) ? a.platform : lines(a.platform);
    var audio = Array.isArray(a.audio) ? a.audio : lines(a.audio);
    var kn = K.resolve(a);
    var typeLabel = kn.typeKey;
    var who = (lines(a.primaryUser)[0] || 'pengguna utama').split(',')[0];
    var sc = (typeof score === 'number') ? { score: score, level: '' } : (score || null);
    /* Catatan AI yang sudah diterima user (answers.aiNotes). Kosong berarti
       tidak ada AI terpakai: seluruh alur tetap jalan dari pengetahuan lokal. */
    var ai = (a.aiNotes && typeof a.aiNotes === 'object' && !Array.isArray(a.aiNotes)) ? a.aiNotes : {};
    var aiCriteria = (ai.criteria && typeof ai.criteria === 'object' && !Array.isArray(ai.criteria)) ? ai.criteria : {};
    var aiApplied = { assumptions: 0, risks: 0, criteria: 0, endpoints: 0, questions: 0 };

    /* --- cerita dan kriteria, per baris Must --- */
    var assumptions = [];
    var openQuestions = [];
    var usedFeatures = {};
    var featureOrder = [];

    var stories = must.map(function (m, i) {
      var feats = K.featuresForLine(m);
      feats.forEach(function (f) {
        if (!usedFeatures[f.id]) { usedFeatures[f.id] = f; featureOrder.push(f); }
      });
      var criteria = [BASE_CRITERIA.sukses];
      feats.slice(0, 2).forEach(function (f) {
        f.criteria.slice(0, 2).forEach(function (c) { criteria.push(c); });
      });
      if (!feats.length) {
        criteria.push('cakupan fitur ini dianggap satu layar tanpa integrasi eksternal sampai dikonfirmasi user');
        assumptions.push('Fitur "' + m + '" dianggap satu layar tanpa integrasi eksternal sampai ada jawaban lain.');
        openQuestions.push('Untuk "' + m + '": berapa batas waktu selesai dan apa pesan error saat gagal?');
      }
      /* Kriteria tambahan yang diusulkan AI dan sudah diterima user. */
      var addAi = aiCriteria['M' + (i + 1)];
      if (Array.isArray(addAi)) {
        addAi.forEach(function (c) {
          var t = String(c == null ? '' : c).trim();
          if (!t || criteria.indexOf(t) > -1) return;
          criteria.push(t);
          aiApplied.criteria++;
        });
      }
      criteria.push(BASE_CRITERIA.gagal);
      return {
        id: 'US-' + (i + 1),
        role: who,
        action: low(m),
        outcome: feats.length
          ? feats[0].name.toLowerCase() + ' berjalan andal'
          : 'target harian tercapai',
        criteria: criteria.slice(0, 6),
        features: feats.map(function (f) { return f.id; }),
        source: 'must',
        scopeId: 'M' + (i + 1)
      };
    });

    /* --- metrik: user menang utuh; kalau kosong, turunkan dari pengetahuan --- */
    var userMetrics = lines(a.successMetrics);
    var metrics = userMetrics.length
      ? userMetrics.map(function (x) { return { text: x, source: 'user' }; })
      : kn.metrics.map(function (x) { return { text: x, source: 'industri' }; });
    if (!userMetrics.length) {
      featureOrder.slice(0, 2).forEach(function (f) {
        if (f.metrics && f.metrics[0] && metrics.length < 5) {
          metrics.push({ text: f.metrics[0], source: 'fitur:' + f.id });
        }
      });
      assumptions.push('Metrik diambil dari standar ' + (kn.known ? 'industri ' + a.industry : 'pola umum') +
        ' karena user belum mengisi metrik sukses.');
    }
    /* --- risiko gabungan: pengetahuan tipe/industri dulu, lalu fitur, lalu AI --- */
    var aiRiskItems = (Array.isArray(ai.risks) ? ai.risks : []).map(function (r) {
      return {
        sebab: String((r && r.sebab) || '').trim(),
        mitigasi: String((r && r.mitigasi) || 'belum ditentukan').trim()
      };
    }).filter(function (r) { return r.sebab; });
    var riskGroups = [kn.risks]
      .concat(featureOrder.map(function (f) { return f.risks; }))
      .concat(aiRiskItems.map(function (r) { return { sebab: [r.sebab], mitigasi: [r.mitigasi] }; }))
      .filter(Boolean);
    var risks = dedupeRisks(riskGroups);
    var riskKeys = risks.sebab.map(function (s) { return s.toLowerCase(); });
    aiApplied.risks = aiRiskItems.filter(function (r) { return riskKeys.indexOf(r.sebab.toLowerCase()) > -1; }).length;

    /* --- endpoint gabungan: pengetahuan + fitur + usulan AI yang diterima --- */
    var aiEndpoints = (Array.isArray(ai.endpoints) ? ai.endpoints : []).map(function (e) {
      return {
        m: String((e && e.m) || '').trim().toUpperCase(),
        p: String((e && e.p) || '').trim(),
        guard: String((e && e.guard) || '').trim()
      };
    }).filter(function (e) { return e.m && e.p; });
    var endpoints = dedupeEndpoints(
      (kn.endpoints.list || []).concat(
        featureOrder.reduce(function (acc, f) { return acc.concat(f.endpoints || []); }, []),
        aiEndpoints
      )
    );
    var epKeys = endpoints.map(function (e) { return (e.m + ' ' + e.p).toLowerCase(); });
    aiApplied.endpoints = aiEndpoints.filter(function (e) {
      return epKeys.indexOf((e.m + ' ' + e.p).toLowerCase()) > -1;
    }).length;

    /* --- NFR --- */
    var nfrUser = lines(a.nfr);
    var nfrs = nfrUser.map(function (x) { return { text: x, source: 'user' }; })
      .concat(K.rules.nfr.map(function (x) { return { text: x, source: 'baku' }; }));
    if (nfrUser.length && !/\d/.test(nfrUser.join(' '))) {
      openQuestions.push('NFR belum memuat angka: target waktu, kapasitas data, dan lama penyimpanan berapa?');
    }

    /* --- pertanyaan terbuka tambahan --- */
    if (roles.length < 2) {
      openQuestions.push('Siapa saja peran pengguna dan apa beda hak tiap peran?');
    }
    if (integ.join(' ').match(/midtrans|xendit|payment|pembayaran|stripe/i) && !usedFeatures.bayar) {
      openQuestions.push('Penyedia pembayaran mana yang dipakai dan siapa yang menanggung biaya transaksi?');
    }
    if (should.length >= 2) {
      openQuestions.push('Dari daftar Should, mana yang wajib masuk v1 kalau waktu tersisa tinggal separuh?');
    }
    if (!kn.known) {
      assumptions.push('Industri belum dipilih; model data dan risiko memakai pola umum.');
    }
    /* Asumsi dan pertanyaan dari AI yang sudah diterima user. */
    (Array.isArray(ai.assumptions) ? ai.assumptions : []).forEach(function (x) {
      var t = String((x && x.teks) || x || '').trim();
      if (!t || assumptions.indexOf(t) > -1) return;
      assumptions.push(t);
      aiApplied.assumptions++;
    });
    aiApplied.questions = 0;
    (Array.isArray(ai.questions) ? ai.questions : []).forEach(function (x) {
      var t = String((x && x.teks) || x || '').trim();
      if (!t || openQuestions.indexOf(t) > -1) return;
      openQuestions.push(t);
      aiApplied.questions++;
    });

    return {
      meta: {
        productName: a.productName || '',
        productType: typeLabel,
        industry: a.industry || '',
        platform: platform,
        date: today(),
        score: sc ? sc.score : null,
        scoreLevel: sc ? sc.level : '',
        generator: 'PRD Studio',
        specVersion: 1
      },
      summary: {
        oneLiner: sent((a.productName || '') + ' adalah ' + typeLabel.toLowerCase() + ' untuk ' + (a.primaryUser || '')),
        problem: a.problem || '',
        whyNow: a.whyNow || '',
        primaryUser: a.primaryUser || ''
      },
      personas: [{
        name: who,
        context: a.primaryUser || '',
        need: must[0] || '',
        pain: a.problem || ''
      }],
      scope: {
        must: must.map(function (m, i) { return { id: 'M' + (i + 1), text: m, storyId: 'US-' + (i + 1) }; }),
        should: should.map(function (s, i) { return { id: 'S' + (i + 1), text: s }; }),
        wont: wont.map(function (w) { return { text: w }; })
      },
      stories: stories,
      roles: roles.slice(),
      metrics: metrics,
      entities: kn.entities,
      relationsTail: kn.relationsTail,
      erd: kn.erd,
      endpoints: endpoints,
      apiRules: (kn.endpoints.rules || []).slice(),
      flows: {
        main: a.mainFlow || '',
        fail: a.failFlow || '',
        nav: lines(String(a.navStructure || '').replace(/,/g, '\n')),
        screenStates: SCREEN_STATES.slice()
      },
      ui: {
        style: a.styleDirection || '',
        layout: a.layoutPref || '',
        visual: a.visualNeeds || '',
        rules: K.rules.a11y.slice()
      },
      media: { audio: audio, rules: MEDIA_RULES.slice() },
      nfrs: nfrs,
      risks: risks,
      riskGroups: riskGroups.slice(),
      assumptions: assumptions,
      openQuestions: openQuestions.slice(0, 6),
      aiApplied: aiApplied,
      constraints: {
        stack: a.stackPref || '',
        integrations: integ
      },
      features: featureOrder.map(function (f) { return { id: f.id, name: f.name }; })
    };
  }

  return { build: build, BASE_CRITERIA: BASE_CRITERIA, SCREEN_STATES: SCREEN_STATES, MEDIA_RULES: MEDIA_RULES };
})();
