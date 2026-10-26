/* Quality Gate Dashboard & PRD Health Score untuk PRD Studio.
   Analisis multi-dimensi PRD: kelengkapan, kejelasan, keterukuran, konsistensi,
   dan kesiapan eksekusi. Menghasilkan skor kesehatan (0-100), grade (A-F),
   serta rekomendasi tindakan per bagian.
   ES5 murni tanpa bundler. */
(function () {
  function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  function wordCount(s) { return clean(s).split(/\s+/).filter(Boolean).length; }

  function hasNumber(s) { return /\d/.test(String(s || '')); }

  function vagueWords(s) {
    var vague = ['cepat', 'mudah', 'bagus', 'optimal', 'segera', 'efisien', 'baik', 'lancar', 'stabil', 'aman'];
    var low = String(s || '').toLowerCase();
    var found = [];
    vague.forEach(function (w) { if (low.indexOf(w) > -1) found.push(w); });
    return found;
  }

  /* ===== Dimensi Penilaian ===== */
  var DIMENSIONS = [
    { id: 'completeness', name: 'Kelengkapan', weight: 0.25, desc: 'Semua 12 bagian PRD terisi dengan substansi' },
    { id: 'clarity', name: 'Kejelasan', weight: 0.20, desc: 'Teks jelas, tidak ambigu, tanpa kata kabur' },
    { id: 'measurability', name: 'Keterukuran', weight: 0.20, desc: 'Metrik, NFR, dan kriteria memiliki angka' },
    { id: 'consistency', name: 'Konsistensi', weight: 0.15, desc: 'Tidak ada kontradiksi antar bagian' },
    { id: 'executability', name: 'Kesiapan Eksekusi', weight: 0.20, desc: 'Task, roadmap, dan prompt siap untuk agent' }
  ];

  function scoreCompleteness(spec) {
    var checks = [];
    var m = spec.meta || {};
    var s = spec.summary || {};
    var sc = spec.scope || {};
    var details = [];

    // Meta
    if (clean(m.productName)) { checks.push(1); details.push({ item: 'Nama produk', ok: true }); }
    else { checks.push(0); details.push({ item: 'Nama produk', ok: false, fix: 'Isi nama produk di Langkah 1' }); }

    if (clean(m.productType) && m.productType !== 'Aplikasi web') { checks.push(1); details.push({ item: 'Tipe produk', ok: true }); }
    else { checks.push(0.5); details.push({ item: 'Tipe produk', ok: false, fix: 'Pilih tipe produk spesifik' }); }

    // Summary
    if (clean(s.problem) && wordCount(s.problem) >= 10) { checks.push(1); details.push({ item: 'Masalah', ok: true }); }
    else { checks.push(0); details.push({ item: 'Masalah', ok: false, fix: 'Jelaskan masalah minimal 10 kata' }); }

    if (clean(s.primaryUser)) { checks.push(1); details.push({ item: 'Pengguna utama', ok: true }); }
    else { checks.push(0); details.push({ item: 'Pengguna utama', ok: false, fix: 'Definisikan pengguna utama' }); }

    if (clean(s.oneLiner)) { checks.push(1); details.push({ item: 'Ringkasan satu kalimat', ok: true }); }
    else { checks.push(0); details.push({ item: 'Ringkasan satu kalimat', ok: false, fix: 'Isi ringkasan produk' }); }

    // Scope
    var mustCount = (sc.must || []).length;
    if (mustCount >= 3) { checks.push(1); details.push({ item: 'Must-have (' + mustCount + ')', ok: true }); }
    else { checks.push(mustCount / 3); details.push({ item: 'Must-have (' + mustCount + ')', ok: false, fix: 'Tambah minimal 3 fitur wajib' }); }

    if ((sc.wont || []).length >= 1) { checks.push(1); details.push({ item: 'Wont-have', ok: true }); }
    else { checks.push(0); details.push({ item: 'Wont-have', ok: false, fix: 'Definisikan batas lingkup (wont-have)' }); }

    // Stories
    if ((spec.stories || []).length >= 3) { checks.push(1); details.push({ item: 'User stories (' + (spec.stories || []).length + ')', ok: true }); }
    else { checks.push(((spec.stories || []).length) / 3); details.push({ item: 'User stories', ok: false, fix: 'Tambah minimal 3 user story' }); }

    // NFR
    if ((spec.nfr || []).length >= 2) { checks.push(1); details.push({ item: 'NFR (' + (spec.nfr || []).length + ')', ok: true }); }
    else { checks.push(((spec.nfr || []).length) / 2); details.push({ item: 'NFR', ok: false, fix: 'Tambah minimal 2 non-functional requirement' }); }

    // Metrics
    if ((spec.metrics || []).length >= 2) { checks.push(1); details.push({ item: 'Metrik sukses (' + (spec.metrics || []).length + ')', ok: true }); }
    else { checks.push(((spec.metrics || []).length) / 2); details.push({ item: 'Metrik sukses', ok: false, fix: 'Tambah minimal 2 metrik terukur' }); }

    // Risks
    if ((spec.risks || []).length >= 1) { checks.push(1); details.push({ item: 'Risiko (' + (spec.risks || []).length + ')', ok: true }); }
    else { checks.push(0); details.push({ item: 'Risiko', ok: false, fix: 'Identifikasi minimal 1 risiko' }); }

    var total = checks.reduce(function (a, b) { return a + b; }, 0);
    var max = checks.length;
    return { score: max ? Math.round((total / max) * 100) : 0, details: details, filled: checks.filter(function (c) { return c >= 0.9; }).length, total: max };
  }

  function scoreClarity(spec) {
    var issues = [];
    var score = 100;
    var texts = [];
    var s = spec.summary || {};
    var sc = spec.scope || {};
    if (s.problem) texts.push(s.problem);
    if (s.oneLiner) texts.push(s.oneLiner);
    (sc.must || []).forEach(function (m) { texts.push(m.text || m); });
    (spec.stories || []).forEach(function (st) { texts.push(st.action || ''); });

    texts.forEach(function (t) {
      var vw = vagueWords(t);
      if (vw.length) {
        score -= vw.length * 5;
        issues.push({ text: clean(t).slice(0, 60), vague: vw, fix: 'Ganti kata kabur: ' + vw.join(', ') + ' dengan angka/ukuran' });
      }
      if (wordCount(t) < 5 && t.length > 0) {
        score -= 3;
        issues.push({ text: clean(t).slice(0, 60), vague: [], fix: 'Perjelas, terlalu singkat' });
      }
    });

    return { score: Math.max(0, Math.min(100, score)), issues: issues };
  }

  function scoreMeasurability(spec) {
    var checks = [];
    var details = [];
    var nfr = spec.nfr || [];
    var metrics = spec.metrics || [];
    var sc = spec.scope || {};

    var nfrWithNumber = nfr.filter(function (n) { return hasNumber(n.text || n); }).length;
    if (nfr.length > 0) {
      var nfrRatio = nfrWithNumber / nfr.length;
      checks.push(nfrRatio);
      details.push({ item: 'NFR terukur (' + nfrWithNumber + '/' + nfr.length + ')', ok: nfrRatio >= 0.8, fix: nfrRatio < 0.8 ? 'Tambahkan angka ke NFR' : null });
    } else {
      checks.push(0);
      details.push({ item: 'NFR terukur (0/0)', ok: false, fix: 'Tambahkan NFR dengan angka' });
    }

    var metricsWithNumber = metrics.filter(function (m) { return hasNumber(m.text || m); }).length;
    if (metrics.length > 0) {
      var mRatio = metricsWithNumber / metrics.length;
      checks.push(mRatio);
      details.push({ item: 'Metrik terukur (' + metricsWithNumber + '/' + metrics.length + ')', ok: mRatio >= 0.8, fix: mRatio < 0.8 ? 'Tambahkan angka ke metrik' : null });
    } else {
      checks.push(0);
      details.push({ item: 'Metrik terukur (0/0)', ok: false, fix: 'Tambahkan metrik dengan angka' });
    }

    var criteriaCount = 0, criteriaWithNumber = 0;
    (sc.must || []).forEach(function (m) {
      (m.criteria || []).forEach(function (c) {
        criteriaCount++;
        if (hasNumber(c)) criteriaWithNumber++;
      });
    });
    if (criteriaCount > 0) {
      var cRatio = criteriaWithNumber / criteriaCount;
      checks.push(cRatio);
      details.push({ item: 'Kriteria terukur (' + criteriaWithNumber + '/' + criteriaCount + ')', ok: cRatio >= 0.5, fix: cRatio < 0.5 ? 'Tambahkan angka ke kriteria penerimaan' : null });
    } else {
      checks.push(0);
      details.push({ item: 'Kriteria terukur (0/0)', ok: false, fix: 'Tambahkan kriteria penerimaan' });
    }

    var total = checks.reduce(function (a, b) { return a + b; }, 0);
    return { score: checks.length ? Math.round((total / checks.length) * 100) : 0, details: details };
  }

  function scoreConsistency(spec) {
    var issues = [];
    var score = 100;
    var s = spec.summary || {};
    var sc = spec.scope || {};

    // Cek wont-have vs must-have overlap
    var mustText = (sc.must || []).map(function (m) { return clean(m.text || m).toLowerCase(); }).join(' ');
    var wontText = (sc.wont || []).map(function (w) { return clean(w).toLowerCase(); }).join(' ');
    // Simple overlap check
    var wontWords = wontText.split(/\s+/).filter(function (w) { return w.length > 4; });
    wontWords.forEach(function (w) {
      if (mustText.indexOf(w) > -1) {
        score -= 10;
        issues.push({ type: 'overlap', desc: 'Kata "' + w + '" muncul di must-have dan wont-have', fix: 'Pastikan tidak ada kontradiksi antara wajib dan tidak' });
      }
    });

    // Cek primaryUser vs roles
    if (s.primaryUser && !(spec.roles || []).length && !clean(s.roles)) {
      // roles might be in summary
    }

    // Cek successMetrics vs nfr
    if ((spec.metrics || []).length === 0 && (spec.nfr || []).length > 0) {
      score -= 5;
      issues.push({ type: 'gap', desc: 'Ada NFR tapi tidak ada metrik sukses', fix: 'Tambahkan metrik sukses yang terukur' });
    }

    return { score: Math.max(0, Math.min(100, score)), issues: issues };
  }

  function scoreExecutability(spec) {
    var checks = [];
    var details = [];
    var roadmap = spec.roadmap || [];
    var prompts = spec.prompts || [];

    if (roadmap.length >= 3) { checks.push(1); details.push({ item: 'Roadmap (' + roadmap.length + ' fase)', ok: true }); }
    else { checks.push(roadmap.length / 3); details.push({ item: 'Roadmap', ok: false, fix: 'Tambahkan minimal 3 fase roadmap' }); }

    if (prompts.length >= 1) { checks.push(1); details.push({ item: 'Prompt eksekusi (' + prompts.length + ')', ok: true }); }
    else { checks.push(0); details.push({ item: 'Prompt eksekusi', ok: false, fix: 'Generate prompt untuk agent' }); }

    if (spec.entities && spec.entities.length >= 2) { checks.push(1); details.push({ item: 'Entitas data (' + spec.entities.length + ')', ok: true }); }
    else { checks.push((spec.entities || []).length / 2); details.push({ item: 'Entitas data', ok: false, fix: 'Definisikan minimal 2 entitas' }); }

    if (spec.endpoints && spec.endpoints.length >= 2) { checks.push(1); details.push({ item: 'Endpoint API (' + spec.endpoints.length + ')', ok: true }); }
    else { checks.push((spec.endpoints || []).length / 2); details.push({ item: 'Endpoint API', ok: false, fix: 'Definisikan minimal 2 endpoint' }); }

    var total = checks.reduce(function (a, b) { return a + b; }, 0);
    return { score: checks.length ? Math.round((total / checks.length) * 100) : 0, details: details };
  }

  function gradeFromScore(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  function analyze(spec) {
    spec = spec || {};
    var comp = scoreCompleteness(spec);
    var clar = scoreClarity(spec);
    var meas = scoreMeasurability(spec);
    var cons = scoreConsistency(spec);
    var exec = scoreExecutability(spec);

    var scores = {
      completeness: comp.score,
      clarity: clar.score,
      measurability: meas.score,
      consistency: cons.score,
      executability: exec.score
    };

    var weighted = 0;
    DIMENSIONS.forEach(function (d) {
      weighted += (scores[d.id] || 0) * d.weight;
    });
    var healthScore = Math.round(weighted);

    var allIssues = [];
    clar.issues.forEach(function (i) { allIssues.push({ dimension: 'clarity', severity: 'medium', ...i }); });
    cons.issues.forEach(function (i) { allIssues.push({ dimension: 'consistency', severity: 'high', ...i }); });
    comp.details.filter(function (d) { return !d.ok; }).forEach(function (d) {
      allIssues.push({ dimension: 'completeness', severity: 'high', desc: d.item + ' belum terisi', fix: d.fix });
    });
    meas.details.filter(function (d) { return !d.ok; }).forEach(function (d) {
      allIssues.push({ dimension: 'measurability', severity: 'medium', desc: d.item, fix: d.fix });
    });
    exec.details.filter(function (d) { return !d.ok; }).forEach(function (d) {
      allIssues.push({ dimension: 'executability', severity: 'low', desc: d.item, fix: d.fix });
    });

    var topIssues = allIssues.sort(function (a, b) {
      var sev = { high: 0, medium: 1, low: 2 };
      return (sev[a.severity] || 2) - (sev[b.severity] || 2);
    }).slice(0, 10);

    return {
      healthScore: healthScore,
      grade: gradeFromScore(healthScore),
      dimensions: DIMENSIONS.map(function (d) {
        return { id: d.id, name: d.name, weight: d.weight, score: scores[d.id], desc: d.desc };
      }),
      details: {
        completeness: comp,
        clarity: clar,
        measurability: meas,
        consistency: cons,
        executability: exec
      },
      issues: allIssues,
      topIssues: topIssues,
      summary: healthScore >= 80 ? 'PRD siap eksekusi dengan kualitas tinggi.' :
               healthScore >= 60 ? 'PRD cukup baik, perlu perbaikan di beberapa area.' :
               'PRD perlu pengerjaan ulang di banyak area.'
    };
  }

  function reportMarkdown(analysisResult) {
    var a = analysisResult;
    var lines = [];
    lines.push('# Quality Gate Report');
    lines.push('');
    lines.push('**Health Score: ' + a.healthScore + '/100 (Grade ' + a.grade + ')**');
    lines.push('');
    lines.push(a.summary);
    lines.push('');
    lines.push('## Dimensi Penilaian');
    lines.push('| Dimensi | Bobot | Skor |');
    lines.push('|---|---|---|');
    a.dimensions.forEach(function (d) {
      lines.push('| ' + d.name + ' | ' + Math.round(d.weight * 100) + '% | ' + d.score + ' |');
    });
    lines.push('');
    if (a.topIssues.length) {
      lines.push('## Top Issues');
      a.topIssues.forEach(function (i, idx) {
        lines.push((idx + 1) + '. [' + i.severity.toUpperCase() + '] ' + (i.desc || i.text || '') + (i.fix ? ' → ' + i.fix : ''));
      });
    }
    return lines.join('\n');
  }

  window.QualityGate = {
    DIMENSIONS: DIMENSIONS,
    analyze: analyze,
    reportMarkdown: reportMarkdown,
    gradeFromScore: gradeFromScore,
    scoreCompleteness: scoreCompleteness,
    scoreClarity: scoreClarity,
    scoreMeasurability: scoreMeasurability,
    scoreConsistency: scoreConsistency,
    scoreExecutability: scoreExecutability
  };
})();
