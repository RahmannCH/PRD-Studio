/* Store v3: multi-proyek.
   Skema: { projects: [{id, name, data, updatedAt}], activeId }
   data = jawaban wizard + lastResult + history + checks + copied (snapshot per proyek).
   Migrasi otomatis: v1 / v2 (single proyek) → proyek pertama.
   Validasi lastResult saat load agar payload lama yang rusak tidak membunuh UI. */
(function () {
  var KEY = 'prd_studio_v3';
  var OLD_V2 = 'prd_studio_v2';
  var OLD_V1 = 'prd_studio_v1';
  var SH = window.PrdShared || {};
  var INDUSTRIES = SH.INDUSTRIES || ['Umum / belum tentu', 'Retail & F&B', 'Jasa & agency',
    'SaaS internal', 'Marketplace & konten', 'Layanan publik & klinik'];
  var stripUnsafe = SH.stripUnsafe || function (x) { return x; };

  var blank = {
    productName: '', productType: 'Aplikasi web', industry: 'Umum / belum tentu',
    problem: '', whyNow: '',
    primaryUser: '', platform: ['Web responsif'], roles: '',
    mustHave: '', shouldHave: '', wontHave: '',
    mainFlow: '', failFlow: '', navStructure: '',
    styleDirection: 'Bersih profesional terang', layoutPref: 'Satu layar kasir fokus',
    visualNeeds: '', audio: ['Tanpa audio'],
    stackPref: 'HTML CSS JS vanilla', integrations: '', nfr: '',
    step: 1, lastResult: null, history: [], checks: {}, copied: {},
    nameEdited: false, varRole: '', varTone: '', varTarget: '', varFormat: '',
    promptEdits: {}, successMetrics: '', risks: '', assumptions: '', dependencies: '',
    /* Catatan AI yang sudah diterima user (kartu Terima di panel usulan AI).
       Terpisah dari field 'assumptions' milik user: ini data terstruktur
       yang dibaca Spec.build, bukan teks bebas. */
    aiNotes: { assumptions: [], risks: [], criteria: {}, endpoints: [], questions: [] },
    /* Tingkat kedalaman wawancara: 'cepat' | 'standar' | 'lengkap'.
       Mengatur field mana yang tampil, bukan menghapus nilai jawaban. */
    depth: 'standar'
  };

  function strArr(v, dflt) {
    var arr = Array.isArray(v) ? v : (typeof v === 'string' && v.trim() ? [v] : []);
    var out = [];
    arr.forEach(function (x) {
      var s = typeof x === 'string' ? x.trim() : (x == null ? '' : String(x).trim());
      if (s && out.indexOf(s) < 0) out.push(s);
    });
    return out.length ? out : dflt.slice();
  }

  var TEXT_FIELDS = ['productName','productType','problem','whyNow','primaryUser','roles',
    'mustHave','shouldHave','wontHave','mainFlow','failFlow','navStructure',
    'styleDirection','layoutPref','visualNeeds','stackPref','integrations','nfr','successMetrics',
    'varRole','varTone','varTarget','varFormat','risks','assumptions','dependencies'];

  /* Payload rusak (bukan string, item tanpa field wajib) jangan sampai
     melempar .trim()/.map() di validator/render: satu throw saat hydrate
     mematikan seluruh binding listener wizard. step di-coerce ke 1..7
     integer agar paintResultGaps tidak membentuk "Langkah NaN" atau
     menyuntik HTML mentah dari payload impor yang dimanipulasi. */
  function validResult(r) {
    if (!r || typeof r !== 'object') return null;
    if (typeof r.prd !== 'string' || !r.prd) return null;
    if (!Array.isArray(r.prompts)) return null;
    r.prompts = r.prompts.filter(function (p) {
      return p && typeof p === 'object' && typeof p.id === 'string' &&
        typeof p.title === 'string' && typeof p.body === 'string';
    });
    if (!r.prompts.length) return null;
    /* B6: gate yang tidak merujuk ke id prompt yang ada → buang.
       Gate P99 / gate basi dari impor bisa mengunci P6-P9 selamanya. */
    var promptIds = {};
    r.prompts.forEach(function (p) { promptIds[p.id] = true; });
    r.prompts.forEach(function (p) {
      if (p.gate != null && (typeof p.gate !== 'string' || !promptIds[p.gate] || p.gate === p.id)) p.gate = null;
    });
    r.diagrams = (Array.isArray(r.diagrams) ? r.diagrams : []).filter(function (g) {
      return g && typeof g === 'object' && typeof g.id === 'string' && typeof g.code === 'string';
    });
    r.roadmap = (Array.isArray(r.roadmap) ? r.roadmap : []).filter(function (f) {
      return f && typeof f === 'object' && typeof f.fase === 'string' && Array.isArray(f.items);
    });
    if (typeof r.score === 'number') r.score = { score: r.score, level: r.score >= 80 ? 'Siap susun' : (r.score >= 60 ? 'Hampir siap' : 'Belum siap') };
    if (!r.score || typeof r.score !== 'object' || typeof r.score.score !== 'number') r.score = { score: 0, level: 'Belum siap' };
    r.gaps = (Array.isArray(r.gaps) ? r.gaps : []).filter(function (g) {
      return g && typeof g === 'object' && typeof g.msg === 'string';
    }).map(function (g) {
      var step = Math.round(Number(g.step));
      if (!isFinite(step) || step < 1 || step > 7) step = 1;
      return {
        step: step, msg: g.msg,
        code: typeof g.code === 'string' ? g.code : '',
        field: typeof g.field === 'string' ? g.field : ''
      };
    });
    return r;
  }

  /* aiNotes: bentuk kanonik tunggal. Item asing dibuang, teks dipotong
     supaya payload impor yang dimanipulasi tidak bisa menahan payload raksasa
     atau menyelipkan struktur aneh ke renderer. */
  function normalizeAiNotes(v) {
    var out = { assumptions: [], risks: [], criteria: {}, endpoints: [], questions: [] };
    if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
    function txt(x) { return String(x == null ? '' : x).replace(/\s+/g, ' ').trim().slice(0, 300); }
    (Array.isArray(v.assumptions) ? v.assumptions : []).slice(0, 20).forEach(function (x) {
      var t = txt(x && x.teks !== undefined ? x.teks : x);
      if (t) out.assumptions.push({ teks: t, alasan: txt(x && x.alasan) });
    });
    (Array.isArray(v.risks) ? v.risks : []).slice(0, 20).forEach(function (x) {
      var s = txt(x && x.sebab);
      if (s) out.risks.push({ sebab: s, mitigasi: txt(x && x.mitigasi) || 'belum ditentukan', terkait: txt(x && x.terkait).slice(0, 8) });
    });
    if (v.criteria && typeof v.criteria === 'object' && !Array.isArray(v.criteria)) {
      Object.keys(v.criteria).slice(0, 20).forEach(function (k) {
        if (!/^M\d+$/.test(k)) return;
        var list = (Array.isArray(v.criteria[k]) ? v.criteria[k] : []).slice(0, 6)
          .map(txt).filter(Boolean);
        if (list.length) out.criteria[k] = list;
      });
    }
    (Array.isArray(v.endpoints) ? v.endpoints : []).slice(0, 20).forEach(function (x) {
      var m = txt(x && x.m).toUpperCase(), p = txt(x && x.p);
      if (!m || !p || p.charAt(0) !== '/') return;
      out.endpoints.push({ m: m, p: p, guard: txt(x && x.guard), untuk: txt(x && x.untuk).slice(0, 8) });
    });
    (Array.isArray(v.questions) ? v.questions : []).slice(0, 20).forEach(function (x) {
      var t = txt(x && x.teks !== undefined ? x.teks : x);
      if (t) out.questions.push({ teks: t, untuk: txt(x && x.untuk).slice(0, 8) });
    });
    return out;
  }

  function normalizeData(d) {
    if (!d || typeof d !== 'object' || Array.isArray(d)) d = {};
    /* B6: buang kunci berbahaya (__proto__ dkk) dari payload impor sebelum
       Object.assign — mencegah prototype pollution. */
    d = stripUnsafe(d);
    var out = Object.assign(JSON.parse(JSON.stringify(blank)), d);
    out.platform = strArr(out.platform, ['Web responsif']);
    out.audio = strArr(out.audio, ['Tanpa audio']);
    TEXT_FIELDS.forEach(function (f) {
      if (typeof out[f] !== 'string') out[f] = out[f] == null ? '' : String(out[f]);
    });
    if (INDUSTRIES.indexOf(out.industry) < 0) out.industry = 'Umum / belum tentu';
    if (!Array.isArray(out.history)) out.history = [];
    out.history = out.history.filter(function (h) { return h && typeof h === 'object'; }).map(function (h, i) {
      return {
        /* A1: id unik per entri — dedupe lama (by-name) sudah dibuang;
           id dipakai sebagai kunci stabil dan identitas entri. */
        id: typeof h.id === 'string' && h.id ? h.id : (String(h.at || '') + '-' + i + '-' + uid()),
        name: String(h.name || 'Tanpa nama'),
        at: String(h.at || ''),
        score: typeof h.score === 'number' ? h.score : null,
        snapshot: (h.snapshot && typeof h.snapshot === 'object' && !Array.isArray(h.snapshot)) ? stripUnsafe(h.snapshot) : null,
        result: validResult(h.result),
        prevResult: validResult(h.prevResult)
      };
    }).slice(0, 10);
    if (!out.checks || typeof out.checks !== 'object' || Array.isArray(out.checks)) out.checks = {};
    if (!out.copied || typeof out.copied !== 'object' || Array.isArray(out.copied)) out.copied = {};
    if (!out.promptEdits || typeof out.promptEdits !== 'object' || Array.isArray(out.promptEdits)) out.promptEdits = {};
    /* aiNotes dari payload impor bisa berbentuk apa saja; paksa ke bentuk
       kanonik supaya Spec.build tidak perlu mempertahankan asumsi bentuk. */
    out.aiNotes = normalizeAiNotes(out.aiNotes);
    out.depth = window.Questionnaire ? window.Questionnaire.normalize(out.depth)
      : (['cepat', 'standar', 'lengkap'].indexOf(out.depth) > -1 ? out.depth : 'standar');
    out.nameEdited = !!out.nameEdited;
    out.lastResult = validResult(out.lastResult);
    out.step = Math.max(1, Math.min(7, Math.round(Number(out.step) || 1)));
    return out;
  }

  function uid() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function makeProject(name, data) {
    return { id: uid(), name: name || 'Proyek tanpa nama', data: normalizeData(data), updatedAt: new Date().toISOString() };
  }

  function normalizeStore(s) {
    if (!s || typeof s !== 'object' || !Array.isArray(s.projects) || !s.projects.length) return null;
    var seenIds = {};
    var projects = s.projects.filter(function (p) { return p && typeof p === 'object' && p.data; }).map(function (p) {
      var id = String(p.id || uid());
      while (seenIds[id]) id = uid();
      seenIds[id] = true;
      return { id: id, name: String(p.name || 'Proyek'), data: normalizeData(p.data), updatedAt: p.updatedAt || new Date().toISOString() };
    });
    if (!projects.length) return null;
    var activeId = projects.some(function (p) { return p.id === s.activeId; }) ? s.activeId : projects[0].id;
    return { projects: projects, activeId: activeId };
  }

  function legacyToStore(raw, extraChecks) {
    var d = normalizeData(JSON.parse(raw));
    if (extraChecks) { try { d.checks = Object.assign(d.checks, JSON.parse(extraChecks)); } catch (e) {} }
    var p = makeProject(d.productName || 'Proyek pertama', d);
    return { projects: [p], activeId: p.id };
  }

  function clearLegacy() {
    try { localStorage.removeItem(OLD_V2); localStorage.removeItem(OLD_V1); localStorage.removeItem('prd_studio_checks'); } catch (e) {}
  }

  function load() {
    var fresh;
    try {
      var raw = localStorage.getItem(KEY);
      /* Kunci v3 ada walau isinya rusak: JANGAN jatuh ke data v2 basi yang
         akan langsung menimpa v3 saat disimpan. Simpan payload rusak ke
         kunci cadangan sebelum menimpa, lalu mulai kosong saja. */
      if (raw) {
        var st = null;
        try { st = normalizeStore(JSON.parse(raw)); } catch (eBad) { st = null; }
        if (st) {
          if (st.activeId !== (function () { try { return JSON.parse(raw).activeId; } catch (e) { return st.activeId; } })()) {
            try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {}
          }
          clearLegacy();
          return st;
        }
        try { localStorage.setItem(KEY + '_backup', raw); } catch (eBak) {}
        fresh = makeProject('Proyek 1', null);
        var storeBad = { projects: [fresh], activeId: fresh.id };
        var wroteBad = false;
        try { localStorage.setItem(KEY, JSON.stringify(storeBad)); wroteBad = true; } catch (e) {}
        if (wroteBad) clearLegacy();
        return storeBad;
      }
      var v2 = localStorage.getItem(OLD_V2);
      if (v2) {
        try {
          var st2 = legacyToStore(v2, localStorage.getItem('prd_studio_checks'));
          /* Hapus key legacy HANYA bila write v3 sukses: kalau quota penuh,
             data lama tetap utuh agar percobaan berikutnya masih bisa migrasi. */
          var wrote2 = false;
          try { localStorage.setItem(KEY, JSON.stringify(st2)); wrote2 = true; } catch (e) {}
          if (wrote2) clearLegacy();
          return st2;
        } catch (eMig) {
          /* Payload v2 rusak: buang kuncinya supaya tidak di-retry tiap load. */
          clearLegacy();
        }
      }
      var v1 = localStorage.getItem(OLD_V1);
      if (v1) {
        try {
          var st3 = legacyToStore(v1, localStorage.getItem('prd_studio_checks'));
          var wrote3 = false;
          try { localStorage.setItem(KEY, JSON.stringify(st3)); wrote3 = true; } catch (e) {}
          if (wrote3) clearLegacy();
          return st3;
        } catch (eMig1) {
          clearLegacy();
        }
      }
    } catch (e) {}
    fresh = makeProject('Proyek 1', null);
    return { projects: [fresh], activeId: fresh.id };
  }

  var store = load();
  function active() {
    return store.projects.filter(function (p) { return p.id === store.activeId; })[0] || store.projects[0];
  }

  var data = active().data;

  /* Gagal simpan harus terlihat, bukan diam-diam hilang saat reload. */
  var lastSaveFailed = false;
  function save() {
    active().updatedAt = new Date().toISOString();
    try { localStorage.setItem(KEY, JSON.stringify(store)); lastSaveFailed = false; return true; }
    catch (e) { lastSaveFailed = true; return false; }
  }

  /* Save debounced (trailing) untuk ketikan: JSON.stringify seluruh store
     multi-proyek per keypress terasa di HP murah. flushSave() untuk unload. */
  var saveTimer = null;
  function saveSoon(ms, done) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveTimer = null;
      var ok = save();
      if (done) done(ok);
    }, ms || 400);
  }
  function flushSave() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; save(); }
  }
  window.addEventListener('pagehide', flushSave);
  window.addEventListener('beforeunload', flushSave);

  /* Dua tab Studio terbuka: tab yang menerima event storage menyinkronkan
     store in-memory dari tulisan tab lain supaya edit tidak saling
     ditimpa diam-diam tanpa jejak. */
  window.addEventListener('storage', function (e) {
    if (e.key !== KEY || e.newValue == null) return;
    try {
      var st = normalizeStore(JSON.parse(e.newValue));
      if (!st) return;
      /* B12: batalkan save tertunda milik tab ini SEBELUM mengimpor store
         eksternal — flushSave() di pagehide tidak boleh menimpa ulang
         tulisan tab lain dengan memori basi tab ini. */
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      store.projects = st.projects;
      store.activeId = st.activeId;
      data = active().data;
      if (window.StudioState && typeof window.StudioState.onExternal === 'function') {
        window.StudioState.onExternal();
      }
    } catch (e2) {}
  });

  window.StudioState = {
    get data() { return data; },
    set data(v) { data = v; if (active()) active().data = v; },
    store: store,
    save: save,
    saveSoon: saveSoon,
    onExternal: null,
    lastSaveFailed: function () { return lastSaveFailed; },
    /* Blank kanonik: satu-satunya cara membuat data jawaban kosong. Dipakai
       muat riwayat dan proyek baru supaya tidak ada dua definisi skema yang
       bisa saling menyimpang (dulu app.js menulis ulang blank sendiri dan
       menghilangkan risks/assumptions/dependencies/aiNotes saat memuat). */
    /* Progres user di atas konten (centang roadmap, prompt tersalin, edit
       prompt) adalah transisi state, bukan urusan view. render.js hanya
       memanggil setter ini; rollback saat simpan gagal ada di satu tempat
       dan bisa diuji tanpa DOM. */
    setCheck: function (key, on) {
      if (!key) return false;
      var had = Object.prototype.hasOwnProperty.call(data.checks, key);
      var prev = data.checks[key];
      data.checks[key] = !!on;
      if (!save()) {
        if (had) data.checks[key] = prev; else delete data.checks[key];
        return false;
      }
      return true;
    },
    migrateCheck: function (fromKey, toKey) {
      if (!fromKey || !toKey || fromKey === toKey) return false;
      var v = !!data.checks[fromKey];
      data.checks[toKey] = v;
      delete data.checks[fromKey];
      saveSoon(400);
      return v;
    },
    setCopied: function (id) {
      if (!id || data.copied[id]) return !!id;
      data.copied[id] = true;
      if (!save()) { delete data.copied[id]; return false; }
      return true;
    },
    setPromptEdit: function (id, body, skipSave) {
      if (!id) return false;
      var had = Object.prototype.hasOwnProperty.call(data.promptEdits, id);
      var prev = data.promptEdits[id];
      data.promptEdits[id] = String(body == null ? '' : body);
      /* skipSave: flush sebelum render ulang — pemanggil yang menyimpan. */
      if (skipSave) return true;
      if (!save()) {
        if (had) data.promptEdits[id] = prev; else delete data.promptEdits[id];
        return false;
      }
      return true;
    },
    blank: function () { return normalizeData({}); },
    projectList: function () {
      return store.projects.map(function (p) { return { id: p.id, name: p.name, updatedAt: p.updatedAt, count: (p.data.history || []).length }; });
    },
    activeId: function () { return store.activeId; },
    renameActive: function (name, manual, skipSave) {
      var n = String(name || '').trim();
      if (!n) return false;
      var prevName = active().name;
      active().name = n;
      /* A1: riwayat TIDAK disentuh sama sekali (auto maupun manual).
         Dedupe-by-name sudah dibuang — menulis ulang nama history hanya
         membuang-buang kuota tanpa guna, dan dulu justru memicu penghapusan
         massal saat pushHistory berikutnya. */
      if (manual) data.nameEdited = true;
      if (skipSave) return true;
      if (!save()) { active().name = prevName; return false; }
      return true;
    },
    switchProject: function (id) {
      if (!store.projects.some(function (p) { return p.id === id; })) return false;
      if (!save()) return false;
      var prev = store.activeId;
      store.activeId = id;
      data = active().data;
      if (!save()) { /* rollback jika save kedua gagal */
        store.activeId = prev;
        data = active().data;
        return false;
      }
      return true;
    },
    newProject: function (name) {
      save();
      var p = makeProject(name || ('Proyek ' + (store.projects.length + 1)), null);
      var prevActive = store.activeId;
      store.projects.push(p);
      store.activeId = p.id;
      data = p.data;
      if (!save()) {
        store.projects.pop();
        store.activeId = prevActive;
        data = active().data;
        return null;
      }
      return p;
    },
    dupProject: function () {
      save();
      var src = active();
      var copy = JSON.parse(JSON.stringify(src));
      copy.id = uid();
      copy.name = src.name + ' (salinan)';
      copy.updatedAt = new Date().toISOString();
      if (copy.data && Array.isArray(copy.data.history)) {
        copy.data.history.forEach(function (h) { if (h) delete h.prevResult; });
      }
      var prevActive = store.activeId;
      store.projects.push(copy);
      store.activeId = copy.id;
      data = copy.data;
      if (!save()) {
        store.projects.pop();
        store.activeId = prevActive;
        data = active().data;
        return null;
      }
      return copy;
    },
    /* Impor payload .json hasil ekspor: {answers, result, exportedAt}.
       result rusak ditandai lewat properti resultDropped agar pemanggil
       bisa memperingatkan pengguna, bukan diam-diam membuang PRD-nya. */
    importProject: function (payload) {
      if (!payload || typeof payload !== 'object' || !payload.answers || typeof payload.answers !== 'object') return null;
      var answers = payload.answers;
      var name = String(payload.name || answers.productName || 'Proyek impor').trim() || 'Proyek impor';
      var p = makeProject(name, answers);
      if (payload.result) {
        p.data.lastResult = validResult(payload.result);
        if (p.data.lastResult) {
          var snap = JSON.parse(JSON.stringify(answers));
          delete snap.history; delete snap.lastResult;
          p.data.history = [{ name: name, at: payload.exportedAt || new Date().toISOString(), score: p.data.lastResult.score ? p.data.lastResult.score.score : null, snapshot: snap, result: JSON.parse(JSON.stringify(p.data.lastResult)) }];
        } else {
          p.resultDropped = true;
        }
      }
      var prevActive = store.activeId;
      store.projects.push(p);
      store.activeId = p.id;
      data = p.data;
      if (!save()) {
        store.projects.pop();
        store.activeId = prevActive;
        data = active().data;
        return null;
      }
      return p;
    },
    delProject: function (id) {
      if (store.projects.length <= 1) return false;
      var i = store.projects.findIndex(function (p) { return p.id === id; });
      if (i < 0) return false;
      var removed = store.projects.splice(i, 1)[0];
      var prevActive = store.activeId;
      if (store.activeId === id) { store.activeId = store.projects[0].id; data = active().data; }
      if (!save()) { /* rollback: kembalikan proyek yang terlanjur di-splice */
        store.projects.splice(i, 0, removed);
        store.activeId = prevActive;
        data = active().data;
        return false;
      }
      return true;
    },
    clearRun: function () {
      data.checks = {};
      data.copied = {};
      data.promptEdits = {};
      data.lastResult = null;
      save();
    },
    reset: function () {
      var h = data.history || [];
      data = normalizeData({ history: h });
      active().data = data;
      save();
    },
    pushHistory: function (entry) {
      /* Clone entry agar history TIDAK berbagi referensi dengan lastResult:
         AI polish / toggle checkbox mengubah lastResult, bukan snapshot riwayat. */
      var clone;
      try { clone = JSON.parse(JSON.stringify(entry)); } catch (eClone) { return false; }
      var prevHist = data.history || [];
      /* A1: cap 10 + ID unik, TANPA dedupe-by-name. Setiap generate =
         satu versi tersimpan; rename tidak pernah menghapus riwayat.
         prevResult diambil dari entri terbaru (bukan "yang namanya sama"). */
      if (!clone.id || prevHist.some(function (h) { return h && h.id === clone.id; })) {
        clone.id = 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      }
      if (!clone.at) clone.at = new Date().toISOString();
      if ((!clone.prevResult || !clone.prevResult.prd) && prevHist.length && prevHist[0].result && prevHist[0].result.prd) {
        clone.prevResult = prevHist[0].result;
      }
      data.history = [clone].concat(prevHist).slice(0, 10);
      if (!save()) { data.history = prevHist; return false; }
      return true;
    }
  };
})();
