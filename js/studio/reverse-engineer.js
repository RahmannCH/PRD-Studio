/* Reverse Engineering Assistant untuk PRD Studio.
   Mengubah deskripsi produk/aplikasi yang sudah ada menjadi draft PRD terstruktur:
   ekstraksi entitas, fitur, alur, NFR, dan risiko dari teks deskripsi.
   ES5 murni tanpa bundler. */
(function () {
  function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  function splitSentences(text) {
    return String(text || '').split(/[.!?]\s+/).map(function (s) { return clean(s); }).filter(Boolean);
  }

  function extractEntities(text) {
    // Heuristic: cari kata benda kapital atau frasa "X adalah Y"
    var entities = [];
    var seen = {};
    var sentences = splitSentences(text);
    sentences.forEach(function (s) {
      // Pattern: "X adalah Y" / "X berupa Y"
      var m = s.match(/(\w[\w\s]{2,30})\s+(?:adalah|berupa|merupakan)\s+(.+)/i);
      if (m && m[1]) {
        var name = clean(m[1]);
        if (!seen[name.toLowerCase()]) { seen[name.toLowerCase()] = true; entities.push({ label: name, source: s, type: 'concept' }); }
      }
      // Pattern: kata kapital berurutan (PascalCase / multi-word capitalized)
      var caps = s.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g);
      if (caps) {
        caps.forEach(function (c) {
          if (!seen[c.toLowerCase()]) { seen[c.toLowerCase()] = true; entities.push({ label: clean(c), source: s, type: 'named' }); }
        });
      }
    });
    return entities;
  }

  function extractFeatures(text) {
    var features = [];
    var seen = {};
    var sentences = splitSentences(text);
    var verbs = ['bisa', 'dapat', 'mampu', 'memungkinkan', 'menyediakan', 'mendukung', 'mengelola', 'mencatat', 'menghitung', 'menampilkan', 'mengirim', 'mencetak', 'menyimpan', 'memproses', 'can', 'supports', 'allows', 'provides', 'manages', 'tracks', 'displays', 'sends', 'prints', 'stores', 'processes'];
    sentences.forEach(function (s) {
      var low = s.toLowerCase();
      verbs.forEach(function (v) {
        if (low.indexOf(v) > -1) {
          var idx = low.indexOf(v);
          var phrase = clean(s.slice(idx));
          if (phrase.length > 10 && !seen[phrase.toLowerCase()]) {
            seen[phrase.toLowerCase()] = true;
            features.push({ text: phrase.slice(0, 120), source: s, verb: v });
          }
        }
      });
    });
    return features;
  }

  function extractFlows(text) {
    var flows = [];
    var sentences = splitSentences(text);
    sentences.forEach(function (s) {
      // Pattern: "pertama ... lalu ... kemudian ..."
      if (/pertama|lalu|kemudian|terakhir|first|then|next|finally/i.test(s) && s.length > 30) {
        flows.push({ type: 'sequential', text: s, source: s });
      }
    });
    // Detect numbered steps in full text (handles "1. ... 2. ..." split across sentences)
    var fullText = String(text || '');
    var numbered = fullText.match(/\d+\.\s*[^,\d]+/g);
    if (numbered && numbered.length >= 2) {
      flows.push({ type: 'numbered', steps: numbered.map(function (n) { return clean(n.replace(/^\d+\.\s*/, '')); }), source: 'full-text' });
    }
    return flows;
  }

  function extractNFR(text) {
    var nfr = [];
    var seen = {};
    var sentences = splitSentences(text);
    var keywords = ['detik', 'ms', 'milidetik', 'pengguna', 'concurrent', 'uptime', 'persen', 'MB', 'GB', 'RAM', 'offline', 'online', 'keamanan', 'enkripsi', 'autentikasi', 'otorisasi', 'skalabilitas', 'latensi', 'response time', 'throughput', 'availability'];
    sentences.forEach(function (s) {
      var low = s.toLowerCase();
      var matched = keywords.filter(function (k) { return low.indexOf(k.toLowerCase()) > -1; });
      if (matched.length >= 2 && !seen[s.toLowerCase()]) {
        seen[s.toLowerCase()] = true;
        nfr.push({ text: s, keywords: matched });
      }
    });
    return nfr;
  }

  function extractRisks(text) {
    var risks = [];
    var seen = {};
    var sentences = splitSentences(text);
    var riskWords = ['risiko', 'masalah', 'gagal', 'error', 'putus', 'mati', 'hilang', 'bocor', 'lambat', 'crash', 'timeout', 'risk', 'fail', 'error', 'down', 'lost', 'leak', 'slow'];
    sentences.forEach(function (s) {
      var low = s.toLowerCase();
      var matched = riskWords.filter(function (k) { return low.indexOf(k) > -1; });
      if (matched.length >= 1 && !seen[s.toLowerCase()]) {
        seen[s.toLowerCase()] = true;
        risks.push({ text: s, triggers: matched });
      }
    });
    return risks;
  }

  function extractMetrics(text) {
    var metrics = [];
    var seen = {};
    var sentences = splitSentences(text);
    sentences.forEach(function (s) {
      if (/\d/.test(s) && (s.indexOf('%') > -1 || s.indexOf('detik') > -1 || s.indexOf('menit') > -1 || s.indexOf('jam') > -1 || s.indexOf('pengguna') > -1 || s.indexOf('transaksi') > -1)) {
        if (!seen[s.toLowerCase()]) { seen[s.toLowerCase()] = true; metrics.push({ text: s }); }
      }
    });
    return metrics;
  }

  function reverseEngineer(text, opts) {
    opts = opts || {};
    text = clean(text);
    if (!text) return { entities: [], features: [], flows: [], nfr: [], risks: [], metrics: [], summary: {} };

    var entities = extractEntities(text);
    var features = extractFeatures(text);
    var flows = extractFlows(text);
    var nfr = extractNFR(text);
    var risks = extractRisks(text);
    var metrics = extractMetrics(text);

    // Infer product name
    var nameMatch = text.match(/(?:aplikasi|sistem|platform|app|product|produk)\s+([A-Z][\w\s]{2,30})/i);
    var productName = nameMatch ? clean(nameMatch[1]) : (opts.productName || 'Produk Hasil Reverse Engineering');

    // Infer primary user
    var userMatch = text.match(/(?:pengguna|user|pelanggan|customer|admin|operator)\s+([^.]+)/i);
    var primaryUser = userMatch ? clean(userMatch[1]).slice(0, 80) : '';

    return {
      productName: productName,
      primaryUser: primaryUser,
      entities: entities,
      features: features,
      flows: flows,
      nfr: nfr,
      risks: risks,
      metrics: metrics,
      rawText: text,
      extractedAt: new Date().toISOString(),
      stats: {
        entityCount: entities.length,
        featureCount: features.length,
        flowCount: flows.length,
        nfrCount: nfr.length,
        riskCount: risks.length,
        metricCount: metrics.length
      }
    };
  }

  function toAnswers(result) {
    result = result || {};
    var answers = {};
    if (result.productName) answers.productName = result.productName;
    if (result.primaryUser) answers.primaryUser = result.primaryUser;
    if (result.features && result.features.length) answers.mustHave = result.features.map(function (f) { return f.text; }).join('\n');
    if (result.flows && result.flows.length) {
      var flow = result.flows[0];
      if (flow.type === 'numbered') answers.mainFlow = flow.steps.join(', ');
      else if (flow.text) answers.mainFlow = flow.text;
    }
    if (result.nfr && result.nfr.length) answers.nfr = result.nfr.map(function (n) { return n.text; }).join('\n');
    if (result.risks && result.risks.length) {
      // risks are in aiNotes format
    }
    if (result.metrics && result.metrics.length) answers.successMetrics = result.metrics.map(function (m) { return m.text; }).join('\n');
    return answers;
  }

  function reportMarkdown(result) {
    result = result || {};
    var lines = [];
    lines.push('# Reverse Engineering Report');
    lines.push('');
    lines.push('**Produk:** ' + (result.productName || 'N/A'));
    lines.push('**Pengguna:** ' + (result.primaryUser || 'N/A'));
    lines.push('');
    lines.push('## Entitas Terdeteksi (' + (result.entities || []).length + ')');
    (result.entities || []).forEach(function (e) { lines.push('- ' + e.label + ' (' + e.type + ')'); });
    lines.push('');
    lines.push('## Fitur Terdeteksi (' + (result.features || []).length + ')');
    (result.features || []).forEach(function (f) { lines.push('- ' + f.text); });
    lines.push('');
    lines.push('## Alur Terdeteksi (' + (result.flows || []).length + ')');
    (result.flows || []).forEach(function (f, i) {
      lines.push('### Alur ' + (i + 1) + ' (' + f.type + ')');
      if (f.steps) f.steps.forEach(function (s, j) { lines.push((j + 1) + '. ' + s); });
      else lines.push(f.text);
    });
    lines.push('');
    lines.push('## NFR Terdeteksi (' + (result.nfr || []).length + ')');
    (result.nfr || []).forEach(function (n) { lines.push('- ' + n.text); });
    lines.push('');
    lines.push('## Risiko Terdeteksi (' + (result.risks || []).length + ')');
    (result.risks || []).forEach(function (r) { lines.push('- ' + r.text); });
    lines.push('');
    lines.push('## Metrik Terdeteksi (' + (result.metrics || []).length + ')');
    (result.metrics || []).forEach(function (m) { lines.push('- ' + m.text); });
    return lines.join('\n');
  }

  window.ReverseEngineer = {
    extractEntities: extractEntities,
    extractFeatures: extractFeatures,
    extractFlows: extractFlows,
    extractNFR: extractNFR,
    extractRisks: extractRisks,
    extractMetrics: extractMetrics,
    reverseEngineer: reverseEngineer,
    toAnswers: toAnswers,
    reportMarkdown: reportMarkdown
  };
})();
