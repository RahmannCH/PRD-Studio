/* PRD Auto-Fix Suggestions untuk PRD Studio.
   Menganalisis PRD dan menghasilkan saran perbaikan konkret
   beserta snippet kode/teks yang bisa langsung diterapkan.
   ES5 murni tanpa bundler. */
(function () {
  function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  function analyzeGaps(spec) {
    spec = spec || {};
    var gaps = [];
    var answers = spec.answers || {};
    var meta = spec.meta || {};

    // Missing product name
    if (!meta.productName && !answers.productName) {
      gaps.push({ id: 'missing-name', severity: 'high', field: 'productName', message: 'Nama produk belum diisi.', fix: 'Isi nama produk yang jelas dan unik.' });
    }
    // Missing problem statement
    if (!answers.problem || String(answers.problem).length < 20) {
      gaps.push({ id: 'weak-problem', severity: 'high', field: 'problem', message: 'Pernyataan masalah terlalu singkat atau kosong.', fix: 'Jelaskan masalah pengguna dalam 2-3 kalimat konkret.' });
    }
    // Missing must-have features
    if (!answers.mustHave || String(answers.mustHave).trim().length < 10) {
      gaps.push({ id: 'missing-features', severity: 'high', field: 'mustHave', message: 'Fitur must-have belum didefinisikan.', fix: 'Daftar minimal 3-5 fitur inti yang harus ada di v1.' });
    }
    // Missing user
    if (!answers.primaryUser) {
      gaps.push({ id: 'missing-user', severity: 'medium', field: 'primaryUser', message: 'Pengguna utama belum didefinisikan.', fix: 'Sebutkan persona utama (siapa, peran, konteks).' });
    }
    // Missing NFR
    if (!answers.nfr || String(answers.nfr).trim().length < 10) {
      gaps.push({ id: 'missing-nfr', severity: 'medium', field: 'nfr', message: 'Non-functional requirements belum didefinisikan.', fix: 'Tambahkan target performa, keamanan, dan availability.' });
    }
    // Missing entities
    if (!spec.entities || spec.entities.length === 0) {
      gaps.push({ id: 'missing-entities', severity: 'medium', field: 'entities', message: 'Entitas data belum didefinisikan.', fix: 'Identifikasi 2-4 entitas utama dengan field-nya.' });
    }
    // Missing endpoints
    if (!spec.endpoints || spec.endpoints.length === 0) {
      gaps.push({ id: 'missing-endpoints', severity: 'low', field: 'endpoints', message: 'API endpoints belum didefinisikan.', fix: 'Daftar endpoint utama (CRUD per entitas).' });
    }
    // Weak flow
    if (!answers.mainFlow || String(answers.mainFlow).length < 15) {
      gaps.push({ id: 'weak-flow', severity: 'medium', field: 'mainFlow', message: 'Alur utama terlalu singkat.', fix: 'Jabarkan langkah utama dari awal hingga selesai.' });
    }
    // No roles
    if (!answers.roles) {
      gaps.push({ id: 'missing-roles', severity: 'low', field: 'roles', message: 'Role pengguna belum didefinisikan.', fix: 'Sebutkan role (admin, user, guest, dll).' });
    }

    return gaps;
  }

  function suggestFixes(spec) {
    var gaps = analyzeGaps(spec);
    return gaps.map(function (g) {
      return {
        id: g.id,
        severity: g.severity,
        field: g.field,
        message: g.message,
        suggestion: g.fix,
        autoFixable: (g.id === 'missing-roles' || g.id === 'missing-endpoints')
      };
    });
  }

  function autoFix(spec, gapIds) {
    spec = JSON.parse(JSON.stringify(spec || {}));
    gapIds = gapIds || [];
    var fixes = [];
    gapIds.forEach(function (id) {
      if (id === 'missing-roles') {
        spec.answers = spec.answers || {};
        if (!spec.answers.roles) {
          spec.answers.roles = 'Admin, User';
          fixes.push('roles set to "Admin, User"');
        }
      }
      if (id === 'missing-endpoints' && spec.entities && spec.entities.length > 0) {
        spec.endpoints = spec.endpoints || [];
        spec.entities.forEach(function (e) {
          var label = e.label.toLowerCase();
          var crud = [
            { m: 'GET', p: '/api/' + label + 's', d: 'List ' + e.label },
            { m: 'POST', p: '/api/' + label + 's', d: 'Create ' + e.label },
            { m: 'GET', p: '/api/' + label + 's/:id', d: 'Get ' + e.label },
            { m: 'PUT', p: '/api/' + label + 's/:id', d: 'Update ' + e.label },
            { m: 'DELETE', p: '/api/' + label + 's/:id', d: 'Delete ' + e.label }
          ];
          crud.forEach(function (ep) {
            var exists = spec.endpoints.some(function (x) { return x.m === ep.m && x.p === ep.p; });
            if (!exists) spec.endpoints.push(ep);
          });
        });
        fixes.push('CRUD endpoints generated for ' + spec.entities.length + ' entities');
      }
    });
    return { spec: spec, fixes: fixes };
  }

  function priorityOrder(gaps) {
    var order = { high: 0, medium: 1, low: 2 };
    var copy = (gaps || []).slice();
    copy.sort(function (a, b) {
      var oa = order[a.severity];
      var ob = order[b.severity];
      if (oa === undefined) oa = 9;
      if (ob === undefined) ob = 9;
      return oa - ob;
    });
    return copy;
  }

  function reportMarkdown(spec) {
    var gaps = priorityOrder(analyzeGaps(spec));
    var lines = [];
    lines.push('# PRD Auto-Fix Report');
    lines.push('');
    lines.push('**Total issues:** ' + gaps.length);
    lines.push('**High:** ' + gaps.filter(function (g) { return g.severity === 'high'; }).length);
    lines.push('**Medium:** ' + gaps.filter(function (g) { return g.severity === 'medium'; }).length);
    lines.push('**Low:** ' + gaps.filter(function (g) { return g.severity === 'low'; }).length);
    lines.push('');
    gaps.forEach(function (g, i) {
      lines.push((i + 1) + '. [' + g.severity.toUpperCase() + '] ' + g.message);
      lines.push('   - Field: ' + g.field);
      lines.push('   - Fix: ' + g.fix);
    });
    if (gaps.length === 0) {
      lines.push('Tidak ada issue. PRD siap!');
    }
    return lines.join('\n');
  }

  window.PRDAutoFix = {
    analyzeGaps: analyzeGaps,
    suggestFixes: suggestFixes,
    autoFix: autoFix,
    priorityOrder: priorityOrder,
    reportMarkdown: reportMarkdown
  };
})();
