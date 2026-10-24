/* SpecPack: ekspor Spec menjadi paket berkas yang siap dipakai AI coding
   agent, mengikuti struktur Kiro (requirements/design/tasks per fitur) dan
   spec-kit (spec/plan/tasks), plus AGENTS.md dan berkas Gherkin .feature
   untuk repo target.
   Semua isi diturunkan deterministik dari Spec: tidak ada AI, tidak ada
   jaringan. Referensi kebutuhan ke task ditandai otomatis dari kemiripan
   kata Must dengan teks task, jadi selalu ditandai "periksa manual".

   Interface:
     SpecPack.files(data, res) -> [{name, text, type}] enam berkas
     SpecPack.requirements(data, res) / design / tasks / traceability /
     agents / features
*/
window.SpecPack = (function () {
  var E = window.Exporter;
  var C = window.Criteria;

  /* Kata yang terlalu umum untuk dijadikan bukti kecocokan task-requirement. */
  var STOP = ['dengan', 'untuk', 'yang', 'dan', 'atau', 'pada', 'dari', 'tanpa',
    'serta', 'agar', 'bisa', 'dapat', 'user', 'pengguna', 'aplikasi', 'fitur',
    'data', 'dalam', 'satu', 'dua', 'tiga', 'oleh', 'juga', 'tiap', 'setiap'];

  function esc(s) { return E.escMd(s); }
  function name(data) { return String((data && data.productName) || '').trim() || 'Tanpa nama'; }
  function slugOf(data) { return E.slug(data && data.productName); }
  function specOf(data, res) { return window.Spec.build(data || {}, (res && res.score) || null); }
  function joined(list) { return (list || []).filter(Boolean).join(', '); }
  /* Sel tabel markdown: pipe harus di-escape, baris baru jadi spasi. */
  function cell(s) { return esc(String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim()); }
  function note(slug, rel) {
    return '_Berkas Spec Pack PRD Studio. Letakkan sebagai `' + rel + '`._';
  }
  function head(title, slug, rel) {
    return ['# ' + title, '', note(slug, rel), ''];
  }
  function tokens(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/).filter(function (w) { return w.length >= 4 && STOP.indexOf(w) < 0; });
  }
  /* Requirement yang berbagi minimal satu kata bermakna dengan teks task. */
  function storyRefs(text, spec, cap) {
    var tk = tokens(text);
    if (!tk.length) return [];
    var out = [];
    for (var i = 0; i < spec.stories.length && out.length < (cap || 2); i++) {
      var st = tokens(spec.stories[i].action);
      var hit = tk.some(function (w) { return st.indexOf(w) > -1; });
      if (hit) out.push('R' + (i + 1));
    }
    return out;
  }

  function requirements(data, res) {
    var spec = specOf(data, res);
    var slug = slugOf(data);
    var out = head('Requirements: ' + name(data), slug, 'specs/' + slug + '/requirements.md');
    out.push('## Konteks', '');
    var ctx = [];
    if (spec.summary.oneLiner) ctx.push('- Produk: ' + esc(spec.summary.oneLiner));
    if (spec.meta.industry) ctx.push('- Industri: ' + esc(spec.meta.industry));
    if (spec.meta.platform.length) ctx.push('- Platform: ' + esc(joined(spec.meta.platform)));
    if (spec.summary.problem) ctx.push('- Masalah: ' + esc(spec.summary.problem));
    if (spec.summary.primaryUser) ctx.push('- Pengguna utama: ' + esc(spec.summary.primaryUser));
    out.push(ctx.length ? ctx.join('\n') : '_Konteks belum diisi._', '');
    if (!spec.stories.length) {
      out.push('_Belum ada Must di langkah 3. Isi jawaban lalu tekan Susun ulang._', '');
      return out.join('\n');
    }
    spec.stories.forEach(function (s, i) {
      var n = i + 1;
      var mustText = (spec.scope.must[i] && spec.scope.must[i].text) || s.action;
      out.push('### Requirement ' + n + ': ' + esc(mustText), '');
      out.push('**User Story:** Sebagai ' + esc(s.role) + ', saya bisa ' + esc(s.action) +
        ', sehingga ' + esc(s.outcome) + '.', '');
      out.push('Kriteria (EARS-lite):', '');
      var vague = [];
      s.criteria.forEach(function (c, j) {
        var ears = C.toEars(c, { role: s.role, action: s.action });
        out.push((j + 1) + '. ' + esc(ears));
        C.vagueWords(c).forEach(function (w) { if (vague.indexOf(w) < 0) vague.push(w); });
      });
      C.vagueWords(mustText).forEach(function (w) { if (vague.indexOf(w) < 0) vague.push(w); });
      out.push('');
      if (vague.length) {
        out.push('_Kata belum terukur: ' + vague.join(', ') +
          '. Ganti dengan angka, state, atau pesan error yang bisa diperiksa._', '');
      }
    });
    return out.join('\n');
  }

  function design(data, res) {
    var spec = specOf(data, res);
    var slug = slugOf(data);
    var out = head('Design: ' + name(data), slug, 'specs/' + slug + '/design.md');

    out.push('## Ikhtisar', '');
    var ov = [];
    if (spec.summary.oneLiner) ov.push('- ' + esc(spec.summary.oneLiner));
    if (spec.constraints.stack) ov.push('- Stack pilihan: ' + esc(spec.constraints.stack));
    if (spec.meta.platform.length) ov.push('- Platform: ' + esc(joined(spec.meta.platform)));
    out.push(ov.length ? ov.join('\n') : '_Ikhtisar belum diisi._', '');

    if (spec.flows.main || spec.flows.fail || spec.flows.nav.length) {
      out.push('## Alur', '');
      if (spec.flows.main) out.push('**Alur utama:** ' + esc(spec.flows.main), '');
      if (spec.flows.fail) out.push('**Alur gagal:** ' + esc(spec.flows.fail), '');
      spec.flows.nav.forEach(function (n) { out.push('- ' + esc(n)); });
      out.push('');
    }
    out.push('## State layar', '');
    spec.flows.screenStates.forEach(function (s) { out.push('- ' + esc(s)); });
    out.push('');

    out.push('## Model data', '');
    if (spec.entities.length) {
      spec.entities.forEach(function (e) {
        var fields = (e.fields || []).map(function (f) { return f.n; }).join(', ');
        out.push('- **' + esc(e.label) + '**: ' + esc(fields));
      });
      if (spec.relationsTail) out.push('', esc(spec.relationsTail));
    } else {
      out.push('_Model data belum diturunkan._');
    }
    out.push('');
    if (spec.erd) out.push('```mermaid', spec.erd, '```', '');

    out.push('## API', '');
    if (spec.endpoints.length) {
      out.push('| Metode | Path | Guard |', '| --- | --- | --- |');
      spec.endpoints.forEach(function (e) {
        out.push('| ' + cell(e.m) + ' | ' + cell(e.p) + ' | ' + cell(e.guard || '-') + ' |');
      });
      spec.apiRules.forEach(function (r) { out.push('- ' + esc(r)); });
    } else {
      out.push('_Endpoint belum diturunkan._');
    }
    out.push('');

    out.push('## Non fungsional', '');
    if (spec.nfrs.length) spec.nfrs.forEach(function (x) { out.push('- ' + esc(x.text)); });
    else out.push('_Belum ada NFR._');
    out.push('');

    out.push('## UI dan aksesibilitas', '');
    var ui = [];
    if (spec.ui.style) ui.push('- Gaya: ' + esc(spec.ui.style));
    if (spec.ui.layout) ui.push('- Layout: ' + esc(spec.ui.layout));
    if (spec.ui.visual) ui.push('- Kebutuhan visual: ' + esc(spec.ui.visual));
    spec.ui.rules.forEach(function (r) { ui.push('- ' + esc(r)); });
    out.push(ui.join('\n'), '');

    if (spec.risks.sebab.length || spec.assumptions.length) {
      out.push('## Risiko dan asumsi', '');
      spec.risks.sebab.forEach(function (s, i) {
        var m = spec.risks.mitigasi[i] || 'belum ditentukan';
        out.push('- **' + esc(s) + '**: mitigasi ' + esc(m));
      });
      spec.assumptions.forEach(function (a) { out.push('- Asumsi: ' + esc(a)); });
      out.push('');
    }
    if (spec.openQuestions.length) {
      out.push('## Pertanyaan terbuka', '');
      spec.openQuestions.forEach(function (q) { out.push('- ' + esc(q)); });
      out.push('');
    }
    return out.join('\n');
  }

  function tasks(data, res) {
    var spec = specOf(data, res);
    var slug = slugOf(data);
    var out = head('Tasks: ' + name(data), slug, 'specs/' + slug + '/tasks.md');
    out.push('Legenda: R<n> menunjuk Requirement n di requirements.md. ' +
      'Tanda R pada milestone ditandai otomatis dari kemiripan kata, periksa sebelum dikerjakan.', '');

    var found = [];
    if (spec.constraints.stack) found.push('- [ ] T0.1 Menyiapkan proyek dengan stack: ' + esc(spec.constraints.stack) + '.');
    if (spec.entities.length) found.push('- [ ] T0.2 Menyiapkan model data sesuai design.md.');
    if (spec.roles.length >= 2) found.push('- [ ] T0.3 Menyiapkan otentikasi dan hak akses untuk peran: ' + esc(joined(spec.roles)) + '.');
    if (spec.endpoints.length) found.push('- [ ] T0.4 Menyiapkan endpoint dasar sesuai tabel API di design.md.');
    if (found.length) {
      out.push('## Fondasi', '', found.join('\n'), '');
    }

    spec.stories.forEach(function (s, i) {
      var n = i + 1;
      var mustText = (spec.scope.must[i] && spec.scope.must[i].text) || s.action;
      out.push('## Requirement ' + n + ': ' + esc(mustText), '');
      out.push('- [ ] T' + n + '.1 Membangun "' + esc(mustText) + '" sampai kriteria R' + n +
        '.1 sampai R' + n + '.' + s.criteria.length + ' lulus.');
      out.push('- [ ] T' + n + '.2 Verifikasi tiap kriteria dengan bukti konkret: angka, state, atau pesan error.');
      out.push('');
    });

    var roadmap = (res && Array.isArray(res.roadmap)) ? res.roadmap : [];
    if (roadmap.length) {
      out.push('## Milestone roadmap', '');
      roadmap.forEach(function (f) {
        out.push('### ' + esc(f.fase));
        if (f.depends) out.push('_Bergantung pada: ' + esc(f.depends) + '_');
        out.push('');
        (f.items || []).forEach(function (it) {
          var refs = storyRefs(it.text, spec, 2);
          var meta = [];
          if (it.est) meta.push(it.est);
          if (it.depends) meta.push('dep: ' + it.depends);
          out.push('- [ ] ' + esc(it.text) +
            (meta.length ? ' (' + esc(meta.join('; ')) + ')' : '') +
            (refs.length ? ' [' + refs.join(', ') + ']' : ''));
        });
        out.push('');
      });
    }

    out.push('## Definisi selesai', '');
    out.push('- [ ] Semua kotak di atas dicentang dengan bukti verifikasi.');
    if (spec.nfrs.some(function (x) { return x.source === 'user'; })) {
      out.push('- [ ] NFR terukur diuji dan hasilnya dicatat.');
    }
    out.push('- [ ] Kriteria yang tidak bisa diuji dilaporkan ke pemilik proyek, bukan dianggap lulus.');
    return out.join('\n');
  }

  function fasesFor(story, spec, roadmap) {
    var st = tokens(story.action);
    var names = [];
    (roadmap || []).forEach(function (f) {
      var hit = (f.items || []).some(function (it) {
        var tk = tokens(it.text);
        return tk.some(function (w) { return st.indexOf(w) > -1; });
      });
      if (hit) names.push(f.fase);
    });
    return names;
  }

  function traceability(data, res) {
    var spec = specOf(data, res);
    var slug = slugOf(data);
    var roadmap = (res && Array.isArray(res.roadmap)) ? res.roadmap : [];
    var out = head('Traceability: ' + name(data), slug, 'specs/' + slug + '/traceability.md');
    if (!spec.stories.length) {
      out.push('_Belum ada Requirement. Isi Must di langkah 3 lalu tekan Susun ulang._', '');
      return out.join('\n');
    }
    out.push('| Requirement | Cerita | Kriteria | Task | Milestone | PRD |',
      '| --- | --- | --- | --- | --- | --- |');
    spec.stories.forEach(function (s, i) {
      var n = i + 1;
      var mustText = (spec.scope.must[i] && spec.scope.must[i].text) || s.action;
      var short = mustText.length > 44 ? mustText.slice(0, 41).trim() + '...' : mustText;
      var fases = fasesFor(s, spec, roadmap);
      out.push('| R' + n + ' ' + cell(short) + ' | ' + cell(s.id) +
        ' | R' + n + '.1 sampai R' + n + '.' + s.criteria.length +
        ' | T' + n + '.1, T' + n + '.2' +
        ' | ' + cell(fases.length ? fases.join(', ') : '-') +
        ' | §5 |');
    });
    out.push('');
    out.push('PRD memakai nomor bagian tetap: §4 scope MoSCoW, §5 cerita, §9 NFR, §10 model data, §11 endpoint.');
    return out.join('\n');
  }

  function agents(data, res) {
    var spec = specOf(data, res);
    var slug = slugOf(data);
    var out = ['# AGENTS.md: ' + name(data), '',
      '_Panduan untuk AI coding agent. Letakkan di root repo proyek._', ''];
    out.push('## Produk', '');
    if (spec.summary.oneLiner) out.push(esc(spec.summary.oneLiner), '');
    if (spec.summary.problem) out.push('Masalah yang dipecahkan: ' + esc(spec.summary.problem), '');
    out.push('## Sumber kebenaran', '');
    out.push('- `specs/' + slug + '/requirements.md`: apa yang dibangun. Kriteria bernomor R<n>.<m>.');
    out.push('- `specs/' + slug + '/design.md`: model data, API, NFR, risiko.');
    out.push('- `specs/' + slug + '/tasks.md`: urutan kerja; satu kotak satu pekerjaan.');
    out.push('- `specs/' + slug + '/traceability.md`: peta Requirement ke task dan milestone.');
    out.push('');
    out.push('## Aturan kerja', '');
    out.push('- Kerjakan dari tasks.md berurutan; satu kotak dicentang hanya dengan bukti.');
    out.push('- Pertahankan kriteria dan scope; ajukan perubahan ke pemilik proyek dulu.');
    if (spec.nfrs.some(function (x) { return x.source === 'user'; })) {
      out.push('- Pertahankan angka NFR yang sudah ditetapkan di design.md.');
    }
    if (spec.constraints.stack) out.push('- Stack: ' + esc(spec.constraints.stack) + '. Konsultasikan sebelum mengganti.');
    out.push('');
    out.push('## Di luar lingkup', '');
    if (spec.scope.wont.length) spec.scope.wont.forEach(function (w) { out.push('- ' + esc(w.text)); });
    else out.push('- Tidak ada pengecualian tercatat.');
    out.push('');
    out.push('## Perintah', '');
    out.push('Belum ditentukan di Spec Pack. Tanyakan pemilik proyek sebelum menjalankan perintah yang mengubah sistem.', '');
    out.push('## Verifikasi', '');
    out.push('- Setiap kriteria R diuji dengan angka, state, atau pesan error.');
    out.push('- Kriteria yang tidak bisa diuji dilaporkan, bukan dianggap lulus.');
    return out.join('\n');
  }

  /* Gherkin bukan markdown: tidak ada escape escMd, baris tunggal per step,
     dan komentar memakai #. Feature tanpa kriteria sengaja dibiarkan tanpa
     Then berisi kepalsuan, hanya komentar TODO, supaya tidak lulus uji. */
  function gk(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }

  function features(data, res) {
    var spec = specOf(data, res);
    var slug = slugOf(data);
    var out = [];
    out.push('# Feature: ' + gk(name(data)));
    out.push('# Berkas Spec Pack PRD Studio. Letakkan sebagai `specs/' + slug + '/features.feature`.');
    out.push('# Kriteria diturunkan dari requirements.md (EARS-lite). Selaraskan saat requirements berubah.');
    out.push('');
    out.push('Feature: ' + gk(name(data)));
    if (spec.summary.oneLiner) out.push('  ' + gk(spec.summary.oneLiner));
    out.push('');
    if (spec.summary.primaryUser) {
      out.push('  Background:');
      out.push('    Given pengguna utama: ' + gk(spec.summary.primaryUser));
      out.push('');
    }
    if (!spec.stories.length) {
      out.push('  # TODO belum ada Must di langkah 3, skenario belum bisa disusun.');
      return out.join('\n');
    }
    spec.stories.forEach(function (s, i) {
      var n = i + 1;
      var mustText = (spec.scope.must[i] && spec.scope.must[i].text) || s.action;
      out.push('  Scenario: R' + n + ' ' + gk(mustText));
      out.push('    When ' + gk(s.role) + ' ' + gk(s.action));
      if (s.criteria.length) {
        s.criteria.forEach(function (c, j) {
          var ears = C.toEars(c, { role: s.role, action: s.action });
          out.push('    ' + (j === 0 ? 'Then ' : 'And ') + gk(ears));
        });
      } else {
        out.push('    # TODO kriteria untuk R' + n + ' belum ditentukan di requirements.md.');
      }
      out.push('');
    });
    return out.join('\n');
  }

  function storyboard(data, res) {
    var spec = specOf(data, res);
    var sb = (window.GenStoryboard) ? window.GenStoryboard(data, spec) : null;
    return sb ? sb.markdown : '';
  }

  function agentHyperframes(data, res) {
    var spec = specOf(data, res);
    var sb = (window.GenStoryboard) ? window.GenStoryboard(data, spec) : null;
    return sb ? sb.masterPrompt : '';
  }

  function antiPptLinter() {
    return [
      '#!/usr/bin/env node',
      '/* lint-anti-ppt.js — Pemeriksa Kepatuhan Hukum Anti-PPT HyperFrames */',
      'const fs = require("fs");',
      'const path = require("path");',
      'let errors = 0;',
      'function err(msg) { console.error("ANTI-PPT VIOLATION: " + msg); errors++; }',
      'const root = process.cwd();',
      'const indexHtml = path.join(root, "index.html");',
      'if (fs.existsSync(indexHtml)) {',
      '  const src = fs.readFileSync(indexHtml, "utf8");',
      '  if ((src.match(/class=["\']scene["\']/g) || []).length >= 3 && /autoAlpha/.test(src)) {',
      '    err("Ditemukan 3+ adegan berganti dengan autoAlpha (pola slide deck terlarang). Wajib gunakan kamera/dunia berkelanjutan.");',
      '  }',
      '  if (/font-family:[^;]*(Inter|Roboto|Arial|Helvetica)/i.test(src)) {',
      '    err("Menggunakan font generic terlarang (Inter/Roboto/Arial). Wajib gunakan Satoshi / Plus Jakarta Sans.");',
      '  }',
      '  if (!/window\\.__timelines/i.test(src)) {',
      '    err("Tidak mendaftarkan timeline GSAP ke window.__timelines.");',
      '  }',
      '}',
      'if (errors) { console.log("Total " + errors + " pelanggaran."); process.exit(1); }',
      'console.log("Anti-PPT Linter: Lolos 100%. Komposisi layak diproduksi.");'
    ].join('\n');
  }

  function videoFiles(data, res) {
    var slug = slugOf(data);
    var spec = specOf(data, res);
    var sb = (window.GenStoryboard) ? window.GenStoryboard(data, spec) : null;
    if (!sb) return [];
    var out = [
      { name: 'STORYBOARD-' + slug + '.md', text: sb.markdown, type: 'text/markdown' },
      { name: 'FRAME-' + slug + '.md', text: sb.frameSpec, type: 'text/markdown' },
      { name: 'AGENT-HYPERFRAMES-' + slug + '.md', text: sb.masterPrompt, type: 'text/markdown' },
      { name: 'index.html', text: sb.rootHtml || '', type: 'text/html' }
    ];
    (sb.subcompHtmls || []).forEach(function (f) {
      out.push({ name: f.name.replace(/^compositions\/frames\//, ''), text: f.text, type: 'text/html' });
    });
    out.push({ name: 'sfx-synth.js', text: sb.proceduralAudio || '', type: 'application/javascript' });
    out.push({ name: 'lint-anti-ppt.js', text: antiPptLinter(), type: 'application/javascript' });
    return out;
  }

  function files(data, res, opts) {
    var slug = slugOf(data);
    var base = [
      { name: 'REQUIREMENTS-' + slug + '.md', text: requirements(data, res), type: 'text/markdown' },
      { name: 'DESIGN-' + slug + '.md', text: design(data, res), type: 'text/markdown' },
      { name: 'TASKS-' + slug + '.md', text: tasks(data, res), type: 'text/markdown' },
      { name: 'TRACEABILITY-' + slug + '.md', text: traceability(data, res), type: 'text/markdown' },
      { name: 'FEATURES-' + slug + '.feature', text: features(data, res), type: 'text/plain' },
      { name: 'AGENTS-' + slug + '.md', text: agents(data, res), type: 'text/markdown' }
    ];
    if (opts && opts.includeVideo) {
      return base.concat(videoFiles(data, res));
    }
    return base;
  }

  return {
    files: files,
    requirements: requirements,
    design: design,
    tasks: tasks,
    traceability: traceability,
    agents: agents,
    features: features,
    storyboard: storyboard,
    agentHyperframes: agentHyperframes,
    videoFiles: videoFiles
  };
})();
