/* Advisor AI: meminta usulan terstruktur atas Spec lalu memvalidasinya.
   Prinsip (lihat CONTEXT.md "Keputusan AI"): AI tidak pernah menimpa jawaban
   user. Keluarannya selalu berupa daftar usulan dengan id stabil, disajikan
   sebagai kartu Terima/Tolak di UI, dan hanya yang diterima yang ditulis ke
   answers.aiNotes (lalu dipakai Spec.build pada penyusunan berikutnya).
   Tanpa AI, seluruh aplikasi tetap berjalan: modul ini tidak pernah dipanggil.

   Interface:
     AIAdvisor.buildRequest(spec) -> {system, user}
     AIAdvisor.parse(text) -> decisions        (murni, melempar Error berkode)
     AIAdvisor.blank() -> decisions
     AIAdvisor.ask(spec) -> Promise<decisions> (memakai window.LLM.chat)
     AIAdvisor.describe(decisions) -> {total, buckets}
     AIAdvisor.merge(answers, decisions, acceptedIds) -> answers.aiNotes
*/
window.AIAdvisor = (function () {
  var MAX_PER_BUCKET = 6;
  var MAX_TEXT = 220;
  var METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

  var SYSTEM = [
    'Kamu analis produk berbahasa Indonesia yang teliti dan jujur.',
    'Tugasmu meninjau spesifikasi produk yang sudah ada dan mengusulkan PERBAIKAN KONKRET, bukan mengulang isi yang sudah ada.',
    'Aturan keras:',
    '1. Balas HANYA satu objek JSON valid tanpa penjelasan, tanpa pagar kode.',
    '2. Semua teks dalam Bahasa Indonesia, kalimat pendek, tanpa angka karangan yang tidak bisa diuji.',
    '3. Setiap usulan harus bisa diverifikasi ya atau tidak, sebutkan bukti atau angka bila menambah kriteria.',
    '4. Rujuk fitur lewat id yang ada (M1, M2, dan seterusnya); jangan mengarang id baru.',
    '5. Kalau tidak ada usulan untuk sebuah bagian, kirim array kosong. Jangan mengisi demi mengisi.',
    '6. Dilarang menyalin ulang kriteria, risiko, atau endpoint yang sudah tercantum di spesifikasi.'
  ].join('\n');

  var SCHEMA = [
    'Balas dengan bentuk JSON persis seperti ini:',
    '{',
    '  "asumsi": [{"teks": "asumsi yang diambil karena data belum ada", "alasan": "mengapa perlu"}],',
    '  "risiko": [{"sebab": "hal yang bisa gagal", "mitigasi": "tindakan pencegahan", "terkait": "M1"}],',
    '  "kriteria": [{"mustId": "M1", "tambah": ["kriteria biner tambahan yang bisa diuji"]}],',
    '  "endpoint": [{"metode": "GET|POST|PUT|PATCH|DELETE", "path": "/contoh", "guard": "aturan pelindung", "untuk": "M2"}],',
    '  "pertanyaan": [{"teks": "pertanyaan singkat untuk user", "untuk": "M3"}]',
    '}',
    'Maksimal ' + MAX_PER_BUCKET + ' item per bagian. Field "terkait"/"untuk" boleh dikosongkan.'
  ].join('\n');

  /* Ringkas spec menjadi bahan yang cukup untuk menilai: tanpa entitas penuh
     dan tanpa markdown, supaya prompt hemat dan id fitur tetap terlihat. */
  function digest(spec) {
    var d = {
      produk: spec.meta.productName,
      jenis: spec.meta.productType,
      industri: spec.meta.industry,
      pengguna: spec.summary.primaryUser,
      masalah: spec.summary.problem,
      must: spec.scope.must.map(function (m) { return m.id + ': ' + m.text; }),
      should: spec.scope.should.map(function (s) { return s.id + ': ' + s.text; }),
      wont: spec.scope.wont.map(function (w) { return w.text; }),
      metrik: spec.metrics.map(function (m) { return m.text; }),
      peran: spec.roles,
      alurUtama: spec.flows.main,
      jalurGagal: spec.flows.fail,
      nfr: spec.nfrs.map(function (n) { return n.text; }),
      endpointTersedia: spec.endpoints.map(function (e) { return e.m + ' ' + e.p + (e.guard ? ' (' + e.guard + ')' : ''); }),
      risikoTersedia: spec.riskGroups.map(function (r) { return window.Knowledge.riskToText(r); }),
      asumsiTersedia: spec.assumptions,
      pertanyaanTersedia: spec.openQuestions,
      integrasi: spec.constraints.integrations,
      stack: spec.constraints.stack
    };
    return d;
  }

  function buildRequest(spec) {
    return {
      system: SYSTEM,
      user: 'Spesifikasi produk saat ini (JSON):\n' + JSON.stringify(digest(spec), null, 2) +
        '\n\n' + SCHEMA
    };
  }

  function clean(s, max) {
    return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max || MAX_TEXT);
  }
  function bad(code, msg) {
    var e = new Error(msg);
    e.code = code;
    return e;
  }
  /* Balasan model sering dibungkus pagar kode walau sudah dilarang. */
  function stripFence(t) {
    var s = String(t || '').trim();
    if (s.indexOf('```') === 0) {
      s = s.replace(/^```[a-zA-Z]*\s*/, '').replace(/```\s*$/, '');
    }
    return s.trim();
  }

  function parse(text) {
    var raw = stripFence(text);
    var j;
    try { j = JSON.parse(raw); }
    catch (e) {
      throw bad('BAD_JSON', 'Balasan AI bukan JSON yang bisa dibaca. Coba lagi atau ganti model.');
    }
    if (!j || typeof j !== 'object' || Array.isArray(j)) {
      throw bad('BAD_SHAPE', 'Struktur balasan AI tidak sesuai skema usulan.');
    }
    return normalize(j);
  }

  function normalize(j) {
    var out = blank();

    function arr(x) { return Array.isArray(x) ? x : []; }

    arr(j.asumsi).slice(0, MAX_PER_BUCKET).forEach(function (a, i) {
      var teks = clean(a && a.teks);
      if (!teks) return;
      out.asumsi.push({ id: 'a' + i, teks: teks, alasan: clean(a.alasan) });
    });
    arr(j.risiko).slice(0, MAX_PER_BUCKET).forEach(function (r, i) {
      var sebab = clean(r && r.sebab);
      if (!sebab) return;
      out.risiko.push({ id: 'r' + i, sebab: sebab, mitigasi: clean(r.mitigasi) || 'belum ditentukan', terkait: clean(r.terkait, 8) });
    });
    arr(j.kriteria).slice(0, MAX_PER_BUCKET).forEach(function (c, i) {
      var mid = clean(c && (c.mustId || c.id), 8).toUpperCase();
      if (!/^M\d+$/.test(mid)) return;
      var tambah = arr(c.tambah).map(function (x) { return clean(x); }).filter(Boolean).slice(0, 3);
      if (!tambah.length) return;
      out.kriteria.push({ id: 'c' + i, mustId: mid, tambah: tambah });
    });
    arr(j.endpoint).slice(0, MAX_PER_BUCKET).forEach(function (e, i) {
      var m = clean(e && (e.metode || e.method), 8).toUpperCase();
      if (METHODS.indexOf(m) < 0) return;
      var p = clean(e && (e.path || e.p), 120);
      if (!p || p.charAt(0) !== '/') return;
      out.endpoint.push({ id: 'e' + i, m: m, p: p, guard: clean(e.guard), untuk: clean(e.untuk, 8) });
    });
    arr(j.pertanyaan).slice(0, MAX_PER_BUCKET).forEach(function (q, i) {
      var teks = clean(q && q.teks);
      if (!teks) return;
      out.pertanyaan.push({ id: 'q' + i, teks: teks, untuk: clean(q.untuk, 8) });
    });
    return out;
  }

  function blank() {
    return { asumsi: [], risiko: [], kriteria: [], endpoint: [], pertanyaan: [] };
  }
  function describe(d) {
    d = d || blank();
    var total = d.asumsi.length + d.risiko.length + d.kriteria.length + d.endpoint.length + d.pertanyaan.length;
    return {
      total: total,
      buckets: [
        { key: 'kriteria', label: 'Kriteria biner tambahan', n: d.kriteria.length },
        { key: 'risiko', label: 'Risiko dan mitigasi', n: d.risiko.length },
        { key: 'endpoint', label: 'Endpoint', n: d.endpoint.length },
        { key: 'asumsi', label: 'Asumsi', n: d.asumsi.length },
        { key: 'pertanyaan', label: 'Pertanyaan untuk kamu', n: d.pertanyaan.length }
      ].filter(function (b) { return b.n > 0; })
    };
  }
  /* Semua id usulan yang ada, dipakai UI untuk "Terima semua". */
  function allIds(d) {
    d = d || blank();
    return d.asumsi.concat(d.risiko, d.kriteria, d.endpoint, d.pertanyaan).map(function (x) { return x.id; });
  }

  function ask(spec, opts) {
    /* Ambil adapter saat dipanggil, bukan saat modul dimuat: llm-adapter
       bisa diganti versi baru (cache/PWA) tanpa memuat ulang halaman ini. */
    var L = window.LLM;
    if (!L || !L.chat) return Promise.reject(bad('NO_LLM', 'Modul AI belum termuat. Muat ulang halaman.'));
    var req = buildRequest(spec);
    return L.chat([
      { role: 'system', content: req.system },
      { role: 'user', content: req.user }
    ], { temperature: 0.2, timeoutMs: opts && opts.timeoutMs }).then(function (text) {
      return parse(text);
    }).then(function (d) {
      var n = describe(d).total;
      if (!n) throw bad('EMPTY', 'AI tidak menemukan usulan baru untuk spesifikasi ini.');
      return d;
    });
  }

  /* Tulis hanya item yang diterima ke answers.aiNotes. Idempotent: item yang
     teksnya sudah ada tidak ditambahkan dua kali, sehingga menekan Minta
     usulan dua kali tidak menumpuk duplikat. */
  function merge(answers, decisions, acceptedIds) {
    var acc = {};
    (acceptedIds || allIds(decisions)).forEach(function (id) { acc[id] = true; });
    var d = decisions || blank();
    var prev = (answers && answers.aiNotes) || blank();
    var out = {
      assumptions: (prev.assumptions || []).slice(),
      risks: (prev.risks || []).slice(),
      criteria: JSON.parse(JSON.stringify(prev.criteria || {})),
      endpoints: (prev.endpoints || []).slice(),
      questions: (prev.questions || []).slice()
    };
    function hasText(list, key, text) {
      return list.some(function (x) { return clean(x && x[key]) === text; });
    }
    d.asumsi.forEach(function (a) {
      if (!acc[a.id] || hasText(out.assumptions, 'teks', a.teks)) return;
      out.assumptions.push({ teks: a.teks, alasan: a.alasan });
    });
    d.risiko.forEach(function (r) {
      if (!acc[r.id]) return;
      var dup = out.risks.some(function (x) { return clean(x.sebab) === r.sebab; });
      if (dup) return;
      out.risks.push({ sebab: r.sebab, mitigasi: r.mitigasi, terkait: r.terkait });
    });
    d.kriteria.forEach(function (c) {
      if (!acc[c.id]) return;
      var list = out.criteria[c.mustId] || (out.criteria[c.mustId] = []);
      c.tambah.forEach(function (t) {
        if (list.indexOf(t) < 0) list.push(t);
      });
    });
    d.endpoint.forEach(function (e) {
      if (!acc[e.id]) return;
      var dup = out.endpoints.some(function (x) { return x.m === e.m && x.p === e.p; });
      if (dup) return;
      out.endpoints.push({ m: e.m, p: e.p, guard: e.guard, untuk: e.untuk });
    });
    d.pertanyaan.forEach(function (q) {
      if (!acc[q.id] || hasText(out.questions, 'teks', q.teks)) return;
      out.questions.push({ teks: q.teks, untuk: q.untuk });
    });
    return out;
  }

  return {
    SYSTEM: SYSTEM,
    buildRequest: buildRequest,
    parse: parse,
    blank: blank,
    ask: ask,
    describe: describe,
    allIds: allIds,
    merge: merge,
    MAX_PER_BUCKET: MAX_PER_BUCKET
  };
})();
