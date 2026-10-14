/* Adapter LLM opsional (endpoint OpenAI-compatible).
   Konfigurasi disimpan lokal di prd_studio_llm (bukan bagian data proyek,
   tidak ikut ekspor .json). Generator utama tetap jalan penuh tanpa ini. */
(function () {
  var KEY = 'prd_studio_llm';
  function loadCfg() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var c = JSON.parse(raw);
        return { baseUrl: String(c.baseUrl || ''), apiKey: String(c.apiKey || ''), model: String(c.model || '') };
      }
    } catch (e) {}
    return { baseUrl: '', apiKey: '', model: '' };
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
    return { ok: true, url: u.href.replace(/\/+$/, '') };
  }

  /* B3: controller aktif — dipakai fallback timeout dan tombol Batal. */
  var activeController = null;
  function abortActive() { if (activeController) { activeController.abort(); activeController = null; } }

  function chat(messages, opts) {
    var c = currentCfg();
    if (!c.baseUrl || !c.apiKey) {
      return Promise.reject(new Error('Endpoint atau API key belum diisi. Buka bagian Pengaturan.'));
    }
    var v = validateUrl(c.baseUrl);
    if (!v.ok) return Promise.reject(new Error(v.msg));
    /* R48: strip trailing slash + path /chat/completions agar user yang
       menempel URL lengkap tidak mendapat rangkap /chat/completions. */
    var base = v.url.replace(/\/chat\/completions$/i, '');
    var url = base + '/chat/completions';
    /* B3: AbortController SELALU dipasang (bukan hanya AbortSignal.timeout
       yang tidak ada di Safari lama) + tombol Batal bisa membatalkan. */
    var ac = new AbortController();
    activeController = ac;
    var timedOut = false;
    var timer = setTimeout(function () { timedOut = true; ac.abort(); }, 30000);
    var init = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + c.apiKey },
      body: JSON.stringify({
        model: c.model || 'gpt-4.1-mini',
        messages: messages,
        stream: false,
        temperature: (opts && opts.temperature) != null ? opts.temperature : 0.3
      }),
      signal: ac.signal
    };
    return fetch(url, init).then(function (r) {
      clearTimeout(timer);
      if (activeController === ac) activeController = null;
      return r.text().then(function (bodyText) {
        if (!r.ok) {
          /* B3: jangan tempel potongan body mentah (bisa memantul isi PRD).
             Ambil hanya field error.message bila server membawanya. */
          var detail = '';
          try {
            var ej = JSON.parse(bodyText);
            if (ej && ej.error && ej.error.message) detail = String(ej.error.message).replace(/\s+/g, ' ').slice(0, 160);
          } catch (eJ) {}
          throw new Error('Endpoint menolak (HTTP ' + r.status + ').' + (detail ? ' ' + detail : ''));
        }
        var j;
        try { j = JSON.parse(bodyText); }
        catch (eBad) { throw new Error('Respons server bukan JSON. Periksa URL endpoint (harus berakhir /v1 atau /v1/).'); }
        var txt = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
        if (!txt) throw new Error('Respons tidak berisi teks. Format balasan tidak sesuai OpenAI-compatible.');
        return txt;
      });
    }, function (eAbort) {
      clearTimeout(timer);
      if (activeController === ac) activeController = null;
      if (eAbort && eAbort.name === 'AbortError') {
        throw new Error(timedOut ? 'Waktu tunggu habis (30 detik). Endpoint tidak merespons.' : 'Permintaan dibatalkan.');
      }
      if (eAbort && eAbort.name === 'TimeoutError') {
        throw new Error('Waktu tunggu habis (30 detik). Endpoint tidak merespons.');
      }
      /* R47: error jaringan (DNS, CORS preflight, offline) sering TypeError
         tanpa pesan berguna. Terjemahkan ke Bahasa Indonesia. */
      if (eAbort && eAbort.name === 'TypeError') {
        throw new Error('Tidak bisa terhubung ke endpoint. Periksa URL, koneksi internet, dan CORS di server AI.');
      }
      throw eAbort;
    });
  }

  window.LLM = {
    get baseUrl() { return currentCfg().baseUrl; },
    get model() { return currentCfg().model; },
    configured: function () { var c = currentCfg(); return !!(c.baseUrl && c.apiKey); },
    getConfig: function () { var c = currentCfg(); return { baseUrl: c.baseUrl, model: c.model, hasKey: !!c.apiKey }; },
    setConfig: function (c) {
      /* Input key kosong = pertahankan key tersimpan (field sengaja dikosongkan
         setelah simpan). Key isian hanya-spasi dianggap kosong, bukan hapus. */
      currentCfg();
      var trimmed = c.apiKey ? String(c.apiKey).trim() : '';
      var key = trimmed || cfg.apiKey;
      var prev = cfg;
      cfg = { baseUrl: String(c.baseUrl || '').trim(), apiKey: key, model: String(c.model || '').trim() };
      if (!saveCfg(cfg)) { cfg = prev; return false; }
      return true;
    },
    /* B3: validasi dipublikasikan agar form Pengaturan bisa memblokir simpan
       sebelum key tersimpan untuk URL yang salah. */
    validateUrl: validateUrl,
    cancel: abortActive,
    clearKey: function () {
      currentCfg();
      cfg = { baseUrl: cfg.baseUrl, apiKey: '', model: cfg.model };
      return saveCfg(cfg);
    },
    test: function () {
      return chat([{ role: 'user', content: 'Balas dengan satu kata: siap' }], { temperature: 0 })
        .then(function (t) { return t.slice(0, 80); });
    },
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
