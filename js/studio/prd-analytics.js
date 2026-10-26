/* PRD Analytics & Insights Dashboard untuk PRD Studio.
   Analisis lintas proyek: completion rate, distribusi skor, gap umum,
   tren kualitas, dan rekomendasi berbasis data historis.
   ES5 murni tanpa bundler. */
(function () {
  function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  function listProjects() {
    try {
      if (window.StudioState && typeof window.StudioState.projectList === 'function') {
        return window.StudioState.projectList() || [];
      }
    } catch (e) {}
    try {
      var raw = (window.localStorage && window.localStorage.getItem) ? window.localStorage.getItem('prd_studio_v3') : null;
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && Array.isArray(parsed.projects)) return parsed.projects;
      }
    } catch (e) {}
    return [];
  }

  function projectScore(p) {
    if (!p) return 0;
    if (typeof p.score === 'number') return p.score;
    if (p.lastResult && typeof p.lastResult.score === 'number') return p.lastResult.score;
    if (p.result && typeof p.result.score === 'number') return p.result.score;
    return 0;
  }

  function projectStatus(p) {
    var sc = projectScore(p);
    if (sc >= 80) return 'complete';
    if (sc >= 60) return 'near';
    if (sc > 0) return 'in_progress';
    return 'not_started';
  }

  function industryDistribution(projects) {
    var dist = {};
    (projects || []).forEach(function (p) {
      var ind = (p.data && p.data.industry) || p.industry || 'Umum';
      dist[ind] = (dist[ind] || 0) + 1;
    });
    return dist;
  }

  function scoreDistribution(projects) {
    var buckets = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
    (projects || []).forEach(function (p) {
      var sc = projectScore(p);
      if (sc <= 20) buckets['0-20']++;
      else if (sc <= 40) buckets['21-40']++;
      else if (sc <= 60) buckets['41-60']++;
      else if (sc <= 80) buckets['61-80']++;
      else buckets['81-100']++;
    });
    return buckets;
  }

  function completionRate(projects) {
    if (!projects || !projects.length) return 0;
    var complete = projects.filter(function (p) { return projectStatus(p) === 'complete'; }).length;
    return Math.round((complete / projects.length) * 100);
  }

  function averageScore(projects) {
    if (!projects || !projects.length) return 0;
    var total = projects.reduce(function (a, p) { return a + projectScore(p); }, 0);
    return Math.round(total / projects.length);
  }

  function topGaps(projects) {
    var gapCounts = {};
    (projects || []).forEach(function (p) {
      var gaps = (p.data && p.data.gaps) || (p.lastResult && p.lastResult.gaps) || (p.result && p.result.gaps) || [];
      if (Array.isArray(gaps)) {
        gaps.forEach(function (g) {
          var key = (typeof g === 'string') ? g : (g.text || g.name || g.id || String(g));
          if (key) gapCounts[key] = (gapCounts[key] || 0) + 1;
        });
      }
    });
    var sorted = Object.keys(gapCounts).map(function (k) { return { gap: k, count: gapCounts[k] }; });
    sorted.sort(function (a, b) { return b.count - a.count; });
    return sorted.slice(0, 10);
  }

  function qualityTrend(projects) {
    // Group by month of creation/update
    var byMonth = {};
    (projects || []).forEach(function (p) {
      var dateStr = p.createdAt || p.updatedAt || (p.data && p.data.createdAt) || '';
      var month = dateStr ? dateStr.slice(0, 7) : 'unknown';
      if (!byMonth[month]) byMonth[month] = { count: 0, totalScore: 0 };
      byMonth[month].count++;
      byMonth[month].totalScore += projectScore(p);
    });
    return Object.keys(byMonth).sort().map(function (m) {
      var d = byMonth[m];
      return { month: m, count: d.count, avgScore: d.count ? Math.round(d.totalScore / d.count) : 0 };
    });
  }

  function insights(projects) {
    var insights = [];
    var cr = completionRate(projects);
    var avg = averageScore(projects);
    var dist = scoreDistribution(projects);
    var gaps = topGaps(projects);
    var ind = industryDistribution(projects);

    if (projects.length === 0) {
      insights.push({ type: 'info', text: 'Belum ada proyek. Mulai dengan membuat PRD pertama.' });
      return insights;
    }

    if (cr < 30) {
      insights.push({ type: 'warning', text: 'Completion rate rendah (' + cr + '%). Banyak PRD belum selesai.' });
    } else if (cr >= 70) {
      insights.push({ type: 'success', text: 'Completion rate baik (' + cr + '%). Mayoritas PRD selesai.' });
    }

    if (avg < 60) {
      insights.push({ type: 'warning', text: 'Rata-rata skor rendah (' + avg + '). Perlu peningkatan kualitas PRD.' });
    } else if (avg >= 80) {
      insights.push({ type: 'success', text: 'Rata-rata skor tinggi (' + avg + '). Kualitas PRD sangat baik.' });
    }

    if (dist['0-20'] > 0) {
      insights.push({ type: 'warning', text: dist['0-20'] + ' PRD dengan skor 0-20. Perlu perhatian.' });
    }

    if (gaps.length > 0) {
      insights.push({ type: 'info', text: 'Gap paling umum: "' + gaps[0].gap + '" (' + gaps[0].count + 'x).' });
    }

    var indCount = Object.keys(ind).length;
    if (indCount === 1) {
      insights.push({ type: 'info', text: 'Semua proyek di industri yang sama. Diversifikasi industri bisa memperkaya portofolio.' });
    }

    return insights;
  }

  function analyze(projects) {
    projects = projects || listProjects();
    return {
      totalProjects: projects.length,
      completionRate: completionRate(projects),
      averageScore: averageScore(projects),
      scoreDistribution: scoreDistribution(projects),
      industryDistribution: industryDistribution(projects),
      topGaps: topGaps(projects),
      qualityTrend: qualityTrend(projects),
      insights: insights(projects),
      statusBreakdown: {
        complete: projects.filter(function (p) { return projectStatus(p) === 'complete'; }).length,
        near: projects.filter(function (p) { return projectStatus(p) === 'near'; }).length,
        in_progress: projects.filter(function (p) { return projectStatus(p) === 'in_progress'; }).length,
        not_started: projects.filter(function (p) { return projectStatus(p) === 'not_started'; }).length
      }
    };
  }

  function reportMarkdown(analysisResult) {
    var a = analysisResult || {};
    var lines = [];
    lines.push('# PRD Analytics Report');
    lines.push('');
    lines.push('**Total Proyek:** ' + (a.totalProjects || 0));
    lines.push('**Completion Rate:** ' + (a.completionRate || 0) + '%');
    lines.push('**Rata-rata Skor:** ' + (a.averageScore || 0));
    lines.push('');
    lines.push('## Distribusi Skor');
    lines.push('| Rentang | Jumlah |');
    lines.push('|---|---|');
    var sd = a.scoreDistribution || {};
    Object.keys(sd).forEach(function (k) { lines.push('| ' + k + ' | ' + sd[k] + ' |'); });
    lines.push('');
    lines.push('## Status Proyek');
    var sb = a.statusBreakdown || {};
    lines.push('- Selesai: ' + (sb.complete || 0));
    lines.push('- Hampir siap: ' + (sb.near || 0));
    lines.push('- Dalam progress: ' + (sb.in_progress || 0));
    lines.push('- Belum dimulai: ' + (sb.not_started || 0));
    lines.push('');
    if (a.topGaps && a.topGaps.length) {
      lines.push('## Gap Paling Umum');
      a.topGaps.forEach(function (g, i) { lines.push((i + 1) + '. ' + g.gap + ' (' + g.count + 'x)'); });
      lines.push('');
    }
    if (a.insights && a.insights.length) {
      lines.push('## Insights');
      a.insights.forEach(function (ins) { lines.push('- [' + ins.type.toUpperCase() + '] ' + ins.text); });
    }
    return lines.join('\n');
  }

  window.PRDAnalytics = {
    listProjects: listProjects,
    projectScore: projectScore,
    projectStatus: projectStatus,
    industryDistribution: industryDistribution,
    scoreDistribution: scoreDistribution,
    completionRate: completionRate,
    averageScore: averageScore,
    topGaps: topGaps,
    qualityTrend: qualityTrend,
    insights: insights,
    analyze: analyze,
    reportMarkdown: reportMarkdown
  };
})();
