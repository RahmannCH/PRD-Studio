/* AndalAI Conversational PRD Builder untuk PRD Studio.
   Mode chat interaktif dengan model AI pilihan user untuk membangun PRD secara
   percakapan: tanya jawab, ekstraksi field, ekspor ke jawaban wawancara.
   ES5 murni tanpa bundler. */
(function () {
  var esc = (window.Exporter && window.Exporter.escMd) || function (x) { return String(x || ''); };

  function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  var SYSTEM_PROMPT = [
    'Kamu adalah AndalAI, asisten PRD Studio yang membantu pengguna membangun PRD (Product Requirements Document) melalui percakapan.',
    'Aturan:',
    '1. Tanyakan satu pertanyaan pada satu waktu, jangan bombardir pengguna.',
    '2. Setelah pengguna menjawab, ekstrak informasi ke field PRD yang relevan.',
    '3. Gunakan format JSON terstruktur saat mengekstrak: {"field": "namaField", "value": "nilai"} di dalam blok ```json```.',
    '4. Field yang tersedia: productName, productType, industry, problem, whyNow, primaryUser, roles, mustHave, shouldHave, wontHave, mainFlow, failFlow, navStructure, styleDirection, layoutPref, visualNeeds, stackPref, integrations, nfr, successMetrics.',
    '5. Jangan mengarang informasi yang tidak diberikan pengguna; tanyakan jika kurang.',
    '6. Bahasa Indonesia natural, ramah, tidak kaku.',
    '7. Setelah semua field penting terisi, ringkas PRD dan tawarkan ekspor.'
  ].join('\n');

  function createSession(opts) {
    opts = opts || {};
    return {
      id: 'chat-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      model: opts.model || 'gpt-4.1-mini',
      baseUrl: opts.baseUrl || '',
      messages: [],
      extracted: {},
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function addMessage(session, role, content) {
    if (!session || !session.messages) return session;
    session.messages.push({ role: role, content: String(content || ''), at: new Date().toISOString() });
    session.updatedAt = new Date().toISOString();
    return session;
  }

  function buildRequest(session) {
    session = session || {};
    var msgs = [{ role: 'system', content: SYSTEM_PROMPT }];
    (session.messages || []).forEach(function (m) {
      msgs.push({ role: m.role, content: m.content });
    });
    return msgs;
  }

  function extractFields(text) {
    text = String(text || '');
    var out = {};
    // Cari blok JSON
    var blocks = text.match(/```json\s*([\s\S]*?)```/g);
    if (blocks) {
      blocks.forEach(function (b) {
        var inner = b.replace(/```json\s*/i, '').replace(/```$/, '').trim();
        try {
          var j = JSON.parse(inner);
          if (Array.isArray(j)) {
            j.forEach(function (item) {
              if (item && item.field && item.value !== undefined) out[item.field] = item.value;
            });
          } else if (j && typeof j === 'object') {
            if (j.field && j.value !== undefined) out[j.field] = j.value;
            else Object.keys(j).forEach(function (k) { if (j[k] !== undefined) out[k] = j[k]; });
          }
        } catch (e) { /* ignore */ }
      });
    }
    // Fallback: cari pola "field: value" sederhana
    var lines = text.split(/\r?\n/);
    lines.forEach(function (line) {
      var m = line.match(/^\s*([a-zA-Z_]+)\s*[:=]\s*(.+)$/);
      if (m && m[1] && m[2]) {
        var key = m[1].trim();
        var val = m[2].trim().replace(/^["']|["']$/g, '');
        var known = ['productName','productType','industry','problem','whyNow','primaryUser','roles','mustHave','shouldHave','wontHave','mainFlow','failFlow','navStructure','styleDirection','layoutPref','visualNeeds','stackPref','integrations','nfr','successMetrics'];
        if (known.indexOf(key) > -1 && !out[key]) out[key] = val;
      }
    });
    return out;
  }

  function mergeExtracted(session, fields) {
    if (!session) return session;
    session.extracted = session.extracted || {};
    Object.keys(fields || {}).forEach(function (k) {
      session.extracted[k] = fields[k];
    });
    return session;
  }

  function exportToAnswers(session) {
    session = session || {};
    var ext = session.extracted || {};
    var answers = {};
    var fieldMap = {
      productName: 'productName', productType: 'productType', industry: 'industry',
      problem: 'problem', whyNow: 'whyNow', primaryUser: 'primaryUser', roles: 'roles',
      mustHave: 'mustHave', shouldHave: 'shouldHave', wontHave: 'wontHave',
      mainFlow: 'mainFlow', failFlow: 'failFlow', navStructure: 'navStructure',
      styleDirection: 'styleDirection', layoutPref: 'layoutPref', visualNeeds: 'visualNeeds',
      stackPref: 'stackPref', integrations: 'integrations', nfr: 'nfr',
      successMetrics: 'successMetrics'
    };
    Object.keys(fieldMap).forEach(function (k) {
      if (ext[k] !== undefined && ext[k] !== null && String(ext[k]).trim() !== '') {
        answers[fieldMap[k]] = ext[k];
      }
    });
    return answers;
  }

  function listSessions() {
    try {
      var raw = (window.localStorage && window.localStorage.getItem) ? window.localStorage.getItem('prd_studio_chat_sessions') : null;
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function saveSession(session) {
    if (!session) return false;
    try {
      var list = listSessions();
      var idx = -1;
      for (var i = 0; i < list.length; i++) { if (list[i].id === session.id) { idx = i; break; } }
      if (idx > -1) list[idx] = session; else list.unshift(session);
      if (list.length > 20) list = list.slice(0, 20);
      if (window.localStorage && window.localStorage.setItem) window.localStorage.setItem('prd_studio_chat_sessions', JSON.stringify(list));
      return true;
    } catch (e) { return false; }
  }

  function loadSession(id) {
    var list = listSessions();
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) return list[i]; }
    return null;
  }

  function deleteSession(id) {
    try {
      var list = listSessions().filter(function (s) { return s.id !== id; });
      if (window.localStorage && window.localStorage.setItem) window.localStorage.setItem('prd_studio_chat_sessions', JSON.stringify(list));
      return true;
    } catch (e) { return false; }
  }

  function summarizeSession(session) {
    session = session || {};
    var ext = session.extracted || {};
    var filled = Object.keys(ext).filter(function (k) { return String(ext[k] || '').trim() !== ''; }).length;
    return {
      id: session.id,
      model: session.model,
      messageCount: (session.messages || []).length,
      extractedCount: filled,
      status: session.status,
      updatedAt: session.updatedAt
    };
  }

  window.ChatMode = {
    SYSTEM_PROMPT: SYSTEM_PROMPT,
    createSession: createSession,
    addMessage: addMessage,
    buildRequest: buildRequest,
    extractFields: extractFields,
    mergeExtracted: mergeExtracted,
    exportToAnswers: exportToAnswers,
    listSessions: listSessions,
    saveSession: saveSession,
    loadSession: loadSession,
    deleteSession: deleteSession,
    summarizeSession: summarizeSession
  };
})();
