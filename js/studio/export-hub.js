/* Multi-Format Export Hub untuk PRD Studio.
   Mengkonversi PRD ke format platform target: Notion, Confluence, Google Docs,
   Linear, Jira, GitHub Issues. ES5 murni tanpa bundler. */
(function () {
  function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  var FORMATS = ['notion', 'confluence', 'gdocs', 'linear', 'jira', 'github'];

  function toNotion(spec) {
    spec = spec || {};
    var lines = [];
    lines.push('# ' + ((spec.meta && spec.meta.productName) || 'Produk'));
    lines.push('');
    lines.push('## Ringkasan');
    lines.push((spec.summary && spec.summary.oneLiner) || '');
    lines.push('');
    if (spec.answers) {
      lines.push('## Detail');
      Object.keys(spec.answers).forEach(function (k) {
        lines.push('**' + k + ':** ' + spec.answers[k]);
      });
      lines.push('');
    }
    if (spec.entities && spec.entities.length) {
      lines.push('## Entitas');
      spec.entities.forEach(function (e) {
        lines.push('- **' + e.label + '**: ' + (e.fields || []).map(function (f) { return f.n; }).join(', '));
      });
      lines.push('');
    }
    if (spec.endpoints && spec.endpoints.length) {
      lines.push('## API Endpoints');
      spec.endpoints.forEach(function (ep) {
        lines.push('- `' + ep.m + ' ' + ep.p + '` — ' + (ep.d || ''));
      });
    }
    return lines.join('\n');
  }

  function toConfluence(spec) {
    spec = spec || {};
    var lines = [];
    lines.push('h1. ' + ((spec.meta && spec.meta.productName) || 'Produk'));
    lines.push('');
    lines.push('h2. Ringkasan');
    lines.push((spec.summary && spec.summary.oneLiner) || '');
    lines.push('');
    if (spec.entities && spec.entities.length) {
      lines.push('h2. Entitas');
      lines.push('||Entity||Fields||');
      spec.entities.forEach(function (e) {
        lines.push('|' + e.label + '|' + (e.fields || []).map(function (f) { return f.n; }).join(', ') + '|');
      });
      lines.push('');
    }
    if (spec.endpoints && spec.endpoints.length) {
      lines.push('h2. API Endpoints');
      lines.push('||Method||Path||Description||');
      spec.endpoints.forEach(function (ep) {
        lines.push('|' + ep.m + '|' + ep.p + '|' + (ep.d || '') + '|');
      });
    }
    return lines.join('\n');
  }

  function toGDocs(spec) {
    // Google Docs uses similar markdown but with specific heading styles
    return toNotion(spec);
  }

  function toLinear(spec) {
    spec = spec || {};
    var issues = [];
    var productName = (spec.meta && spec.meta.productName) || 'Produk';
    issues.push({ title: '[' + productName + '] Setup project', description: 'Inisialisasi proyek dan konfigurasi dasar.', labels: ['setup'] });
    if (spec.entities) {
      spec.entities.forEach(function (e) {
        issues.push({ title: '[' + productName + '] Implement ' + e.label + ' model', description: 'Buat model dan CRUD untuk ' + e.label + '.', labels: ['backend', 'model'] });
      });
    }
    if (spec.endpoints) {
      spec.endpoints.forEach(function (ep) {
        issues.push({ title: '[' + productName + '] ' + ep.m + ' ' + ep.p, description: ep.d || '', labels: ['api', ep.m.toLowerCase()] });
      });
    }
    issues.push({ title: '[' + productName + '] Frontend mockup', description: 'Buat mockup UI sesuai spec.', labels: ['frontend', 'design'] });
    issues.push({ title: '[' + productName + '] Testing & QA', description: 'Unit test dan integration test.', labels: ['testing'] });
    return issues;
  }

  function toJira(spec) {
    spec = spec || {};
    var issues = toLinear(spec).map(function (iss, i) {
      return {
        summary: iss.title,
        description: iss.description,
        issuetype: { name: 'Task' },
        labels: iss.labels,
        priority: { name: i === 0 ? 'High' : 'Medium' }
      };
    });
    return issues;
  }

  function toGitHub(spec) {
    spec = spec || {};
    var issues = toLinear(spec).map(function (iss) {
      return {
        title: iss.title,
        body: iss.description + '\n\nLabels: ' + iss.labels.join(', '),
        labels: iss.labels
      };
    });
    return issues;
  }

  function exportTo(spec, format) {
    format = String(format || '').toLowerCase();
    switch (format) {
      case 'notion': return { format: 'notion', content: toNotion(spec), type: 'markdown' };
      case 'confluence': return { format: 'confluence', content: toConfluence(spec), type: 'wiki' };
      case 'gdocs': case 'google-docs': return { format: 'gdocs', content: toGDocs(spec), type: 'markdown' };
      case 'linear': return { format: 'linear', content: toLinear(spec), type: 'issues' };
      case 'jira': return { format: 'jira', content: toJira(spec), type: 'issues' };
      case 'github': case 'github-issues': return { format: 'github', content: toGitHub(spec), type: 'issues' };
      default: return { format: format, content: null, error: 'Unknown format: ' + format };
    }
  }

  function supportedFormats() {
    return FORMATS.slice();
  }

  function exportAll(spec) {
    var result = {};
    FORMATS.forEach(function (f) { result[f] = exportTo(spec, f); });
    return result;
  }

  window.ExportHub = {
    FORMATS: FORMATS,
    toNotion: toNotion,
    toConfluence: toConfluence,
    toGDocs: toGDocs,
    toLinear: toLinear,
    toJira: toJira,
    toGitHub: toGitHub,
    exportTo: exportTo,
    supportedFormats: supportedFormats,
    exportAll: exportAll
  };
})();
