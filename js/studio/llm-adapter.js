/* Adapter LLM opsional (endpoint OpenAI-compatible).
   Konfigurasi disimpan lokal di prd_studio_llm (bukan bagian data proyek,
   tidak ikut ekspor .json). Generator utama tetap jalan penuh tanpa ini.
   F4: preset penyedia (Google AI Studio dsb), dukungan endpoint lokal tanpa
   API key, timeout yang bisa diatur, penemuan daftar model, dan error
   berkode supaya pemanggil bisa bereaksi tanpa menebak dari teks pesan. */
(function () {
  var KEY = 'prd_studio_llm';
  var DEFAULT_TIMEOUT = 30000;
  var MAX_TIMEOUT = 180000;
  var MIN_TIMEOUT = 5000;

  /* Preset = titik awal yang boleh diubah user. Model default mengikuti
     penyedia (default lama 'gpt-4.1-mini' tidak ada di Google AI Studio,
     sehingga uji koneksi gagal tanpa petunjuk). */
  var PRESETS = [
    {
      id: 'gemini',
      name: 'Google AI Studio (Gemini)',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      model: 'gemini-3.6-flash',
      keyHint: 'Ambil API key gratis di aistudio.google.com/apikey (dimulai "AIza").',
      keyUrl: 'https://aistudio.google.com/apikey'
    },
    {
      id: 'openai',
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4.1-mini',
      keyHint: 'API key dari platform.openai.com (dimulai "sk-").',
      keyUrl: 'https://platform.openai.com/api-keys'
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'openai/gpt-4.1-mini',
      keyHint: 'API key dari openrouter.ai (dimulai "sk-or-").',
      keyUrl: 'https://openrouter.ai/keys'
    },
    {
      id: 'deepseek',
      name: 'DeepSeek (V3 / R1)',
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
      keyHint: 'API key dari platform.deepseek.com (dimulai "sk-").',
      keyUrl: 'https://platform.deepseek.com/api_keys'
    },
    {
      id: 'kimi',
      name: 'Moonshot AI / Kimi (K3 / K1.5)',
      baseUrl: 'https://api.moonshot.cn/v1',
      model: 'moonshot-v1-auto',
      keyHint: 'API key dari platform.moonshot.cn (dimulai "sk-").',
      keyUrl: 'https://platform.moonshot.cn/console/api-keys'
    },
    {
      id: 'groq',
      name: 'Groq (Ultra-Fast Inference)',
      baseUrl: 'https://api.groq.com/openai/v1',
      model: 'llama-3.3-70b-versatile',
      keyHint: 'API key gratis dari console.groq.com/keys (dimulai "gsk_").',
      keyUrl: 'https://console.groq.com/keys'
    },
    {
      id: 'minimax',
      name: 'MiniMax (Hailuo AI)',
      baseUrl: 'https://api.minimax.chat/v1',
      model: 'abab6.5s-chat',
      keyHint: 'API key dari platform.minimaxi.com.',
      keyUrl: 'https://platform.minimaxi.com'
    },
    {
      id: 'ollama',
      name: 'Ollama (lokal, tanpa API key)',
      baseUrl: 'http://localhost:11434/v1',
      model: 'llama3.1',
      keyHint: 'Jalankan "ollama serve" di komputer ini. Tidak perlu API key.'
    },
    {
      id: 'custom',
      name: 'Kustom (endpoint lain yang OpenAI-compatible)',
      baseUrl: '',
      model: '',
      keyHint: 'Isi manual sesuai dokumentasi penyedia.'
    }
  ];

  function presetById(id) {
    var hit = null;
    PRESETS.forEach(function (p) { if (p.id === id) hit = p; });
    return hit;
  }
  function presetFor(baseUrl) {
    var hit = null;
    var b = String(baseUrl || '').toLowerCase().replace(/\/+$/, '');
    if (!b) return null;
    PRESETS.forEach(function (p) {
      if (hit || !p.baseUrl) return;
      if (b === p.baseUrl.toLowerCase().replace(/\/+$/, '')) hit = p;
    });
    if (!hit) {
      if (/generativelanguage\.googleapis\.com/.test(b)) hit = presetById('gemini');
      else if (/api\.openai\.com/.test(b)) hit = presetById('openai');
      else if (/openrouter\.ai/.test(b)) hit = presetById('openrouter');
      else if (/deepseek\.com/.test(b)) hit = presetById('deepseek');
      else if (/moonshot\.cn/.test(b)) hit = presetById('kimi');
      else if (/groq\.com/.test(b)) hit = presetById('groq');
      else if (/minimax\.chat|minimaxi\.com/.test(b)) hit = presetById('minimax');
      else if (/localhost|127\./.test(b)) hit = presetById('ollama');
    }
    return hit;
  }

  function loadCfg() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var c = JSON.parse(raw);
        return {
          baseUrl: String(c.baseUrl || ''),
          apiKey: String(c.apiKey || ''),
          model: String(c.model || ''),
          preset: String(c.preset || ''),
          timeoutMs: clampTimeout(c.timeoutMs)
        };
      }
    } catch (e) {}
    return { baseUrl: '', apiKey: '', model: '', preset: '', timeoutMs: DEFAULT_TIMEOUT };
  }
  function clampTimeout(v) {
    var n = Math.round(Number(v) || 0);
    if (!n) return DEFAULT_TIMEOUT;
    return Math.max(MIN_TIMEOUT, Math.min(MAX_TIMEOUT, n));
  }
  function saveCfg(c) {
    try { localStorage.setItem(KEY, JSON.stringify(c)); return true; }
    catch (e) { return false; }
  }
  var cfg = loadCfg();

  /* R49: re-read setiap dipakai, agar config dari tab lain / clearKey
     di context berbeda langsung terpakai. */
  function currentCfg() {
    cfg = loadCfg();
    return cfg;
  }

  /* B3: validasi URL endpoint — cegah API key dikirim ke host salah ketik
     atau skema http tidak terenkripsi. localhost/127.* boleh http (Ollama dsb). */
  function validateUrl(raw) {
    var s = String(raw || '').trim();
    if (!s) return { ok: false, msg: 'URL endpoint kosong.' };
    var u;
    try { u = new URL(s); } catch (e) { return { ok: false, msg: 'URL tidak valid. Contoh: https://api.openai.com/v1' }; }
    var local = u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '::1' || /^127\./.test(u.hostname);
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && local)) {
      return { ok: false, msg: 'Endpoint harus https:// (http:// hanya diizinkan untuk localhost).' };
    }
    return { ok: true, url: u.href.replace(/\/+$/, ''), local: local };
  }
  function isLocalUrl(raw) {
    var v = validateUrl(raw);
    return !!v.ok && !!v.local;
  }
  /* Endpoint lokal (Ollama, LM Studio) tidak memakai API key. */
  function needsKey(baseUrl) { return !isLocalUrl(baseUrl); }

  function fail(code, msg) {
    var e = new Error(msg);
    e.code = code;
    return e;
  }

  /* B3: controller aktif — dipakai fallback timeout dan tombol Batal. */
  var activeController = null;
  function abortActive() { if (activeController) { activeController.abort(); activeController = null; } }

  /* Satu tempat untuk menyusun URL + header, dipakai chat() dan listModels(). */
  function endpointFor(pathSuffix) {
    var c = currentCfg();
    if (!c.baseUrl) throw fail('NO_CONFIG', 'Endpoint belum diisi. Buka bagian Pengaturan AI.');
    if (needsKey(c.baseUrl) && !c.apiKey) throw fail('NO_CONFIG', 'API key belum diisi. Buka bagian Pengaturan AI.');
    var v = validateUrl(c.baseUrl);
    if (!v.ok) throw fail('BAD_URL', v.msg);
    /* R48: strip trailing slash + path /chat/completions agar user yang
       menempel URL lengkap tidak mendapat rangkap /chat/completions. */
    var base = v.url.replace(/\/chat\/completions$/i, '');
    var headers = { 'Content-Type': 'application/json' };
    /* Key kosong pada endpoint lokal: jangan kirim header Authorization. */
    if (c.apiKey) headers['Authorization'] = 'Bearer ' + c.apiKey;
    return { cfg: c, url: base + pathSuffix, headers: headers };
  }

  function request(pathSuffix, init, timeoutMs) {
    /* Kontrak async: kesalahan konfigurasi pun lewat promise yang ditolak,
       bukan lemparan sinkron. Pemanggil (test, chat, listModels) selalu
       memakai .then/.catch tanpa try/catch tambahan. */
    var ep;
    try { ep = endpointFor(pathSuffix); }
    catch (eCfg) { return Promise.reject(eCfg); }
    var ac = new AbortController();
    activeController = ac;
    var timedOut = false;
    var limit = clampTimeout(timeoutMs || ep.cfg.timeoutMs);
    var timer = setTimeout(function () { timedOut = true; ac.abort(); }, limit);
    init.headers = ep.headers;
    init.signal = ac.signal;
    return fetch(ep.url, init).then(function (r) {
      clearTimeout(timer);
      if (activeController === ac) activeController = null;
      return r;
    }, function (eAbort) {
      clearTimeout(timer);
      if (activeController === ac) activeController = null;
      if (eAbort && eAbort.name === 'AbortError') {
        throw fail(timedOut ? 'TIMEOUT' : 'ABORT',
          timedOut ? 'Waktu tunggu habis (' + Math.round(limit / 1000) + ' detik). Endpoint tidak merespons.'
            : 'Permintaan dibatalkan.');
      }
      if (eAbort && eAbort.name === 'TimeoutError') {
        throw fail('TIMEOUT', 'Waktu tunggu habis (' + Math.round(limit / 1000) + ' detik). Endpoint tidak merespons.');
      }
      /* R47: error jaringan (DNS, CORS preflight, offline) sering TypeError
         tanpa pesan berguna. Terjemahkan ke Bahasa Indonesia. */
      if (eAbort && eAbort.name === 'TypeError') {
        throw fail('NETWORK', 'Tidak bisa terhubung ke endpoint. Periksa URL, koneksi internet, dan CORS di server AI.');
      }
      throw eAbort;
    });
  }

  /* Body error dibaca hemat: hanya error.message, tidak pernah body penuh
     (bisa memantulkan kembali isi PRD). */
  function httpError(r, bodyText) {
    var detail = '';
    try {
      var ej = JSON.parse(bodyText);
      if (ej && ej.error && ej.error.message) detail = String(ej.error.message).replace(/\s+/g, ' ').slice(0, 160);
    } catch (eJ) {}
    var hint = '';
    if (r.status === 401 || r.status === 403) hint = ' Periksa API key.';
    else if (r.status === 404) hint = ' Periksa URL endpoint dan nama model.';
    else if (r.status === 429) hint = ' Kuota atau laju permintaan terlampaui.';
    return fail('HTTP', 'Endpoint menolak (HTTP ' + r.status + ').' + hint + (detail ? ' ' + detail : ''));
  }

  function chat(messages, opts) {
    var c = currentCfg();
    var init = {
      method: 'POST',
      body: JSON.stringify({
        model: c.model || (presetFor(c.baseUrl) || {}).model || 'gpt-4.1-mini',
        messages: messages,
        stream: false,
        temperature: (opts && opts.temperature) != null ? opts.temperature : 0.3
      })
    };
    return request('/chat/completions', init, opts && opts.timeoutMs).then(function (r) {
      return r.text().then(function (bodyText) {
        if (!r.ok) throw httpError(r, bodyText);
        var j;
        try { j = JSON.parse(bodyText); }
        catch (eBad) { throw fail('NOT_JSON', 'Respons server bukan JSON. Periksa URL endpoint (harus berakhir /v1 atau /v1/).'); }
        var txt = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
        if (!txt) throw fail('NO_TEXT', 'Respons tidak berisi teks. Format balasan tidak sesuai OpenAI-compatible.');
        return txt;
      });
    });
  }

  /* Penemuan model: GET {base}/models. Banyak penyedia
     OpenAI-compatible mendukungnya; kalau gagal, pemanggil memakai daftar
     cadangan dari preset. */
  function listModels() {
    var init = { method: 'GET' };
    return request('/models', init).then(function (r) {
      return r.text().then(function (bodyText) {
        if (!r.ok) throw httpError(r, bodyText);
        var j;
        try { j = JSON.parse(bodyText); }
        catch (eBad) { throw fail('NOT_JSON', 'Daftar model bukan JSON. Periksa URL endpoint.'); }
        var arr = (j && j.data) || (j && j.models) || [];
        var ids = [];
        if (Array.isArray(arr)) {
          arr.forEach(function (x) {
            var id = x && (x.id || x.name);
            if (id && ids.indexOf(String(id)) < 0) ids.push(String(id));
          });
        }
        if (!ids.length) throw fail('NO_TEXT', 'Endpoint tidak mengembalikan daftar model.');
        return ids.sort();
      });
    });
  }

  window.LLM = {
    presets: PRESETS,
    presetById: presetById,
    presetFor: presetFor,
    get baseUrl() { return currentCfg().baseUrl; },
    get model() { return currentCfg().model; },
    configured: function () {
      var c = currentCfg();
      if (!c.baseUrl) return false;
      return !!(c.apiKey || !needsKey(c.baseUrl));
    },
    getConfig: function () {
      var c = currentCfg();
      return {
        baseUrl: c.baseUrl, model: c.model, hasKey: !!c.apiKey,
        preset: c.preset, timeoutMs: c.timeoutMs, needsKey: needsKey(c.baseUrl)
      };
    },
    setConfig: function (c) {
      /* Input key kosong = pertahankan key tersimpan (field sengaja dikosongkan
         setelah simpan). Key isian hanya-spasi dianggap kosong, bukan hapus. */
      currentCfg();
      var trimmed = c.apiKey ? String(c.apiKey).trim() : '';
      var key = trimmed || cfg.apiKey;
      /* Ganti endpoint = key lama tidak relevan lagi (key Gemini tidak akan
         pernah valid di OpenAI). Tanpa ini, uji koneksi gagal 401 dengan
         pesan membingungkan. Field key kosong tetap dihormati saat endpoint
         tidak berubah. */
      var newBase = String(c.baseUrl || '').trim();
      if (newBase && newBase !== cfg.baseUrl && !trimmed) key = '';
      var prev = cfg;
      cfg = {
        baseUrl: newBase,
        apiKey: key,
        model: String(c.model || '').trim(),
        preset: c.preset !== undefined ? String(c.preset || '') : cfg.preset,
        timeoutMs: c.timeoutMs !== undefined ? clampTimeout(c.timeoutMs) : cfg.timeoutMs
      };
      if (!saveCfg(cfg)) { cfg = prev; return false; }
      return true;
    },
    /* B3: validasi dipublikasikan agar form Pengaturan bisa memblokir simpan
       sebelum key tersimpan untuk URL yang salah. */
    validateUrl: validateUrl,
    needsKey: needsKey,
    isLocalUrl: isLocalUrl,
    cancel: abortActive,
    clearKey: function () {
      currentCfg();
      cfg = { baseUrl: cfg.baseUrl, apiKey: '', model: cfg.model, preset: cfg.preset, timeoutMs: cfg.timeoutMs };
      return saveCfg(cfg);
    },
    test: function () {
      return chat([{ role: 'user', content: 'Balas dengan satu kata: siap' }], { temperature: 0 })
        .then(function (t) { return t.slice(0, 80); });
    },
    listModels: listModels,
    polishPrd: function (prdText) {
      var sys = 'Kamu editor PRD berbahasa Indonesia. Perbaiki struktur, hilangi ambigu, jaga semua angka dan fakta yang sudah ada. Dilarang mengarang angka baru. Kembalikan hanya markdown PRD utuh, tanpa komentar.';
      return chat([
        { role: 'system', content: sys },
        { role: 'user', content: 'Berikut PRD yang harus dirapikan:\n\n' + prdText }
      ]);
    },
    chat: chat
  };
})();
