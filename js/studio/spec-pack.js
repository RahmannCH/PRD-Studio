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

  function nleMarkers(data, res) {
    var spec = specOf(data, res);
    var sb = (window.GenStoryboard) ? window.GenStoryboard(data, spec) : null;
    return sb ? sb.nleMarkers : '';
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

  function taskRunner() {
    return [
      '#!/usr/bin/env node',
      '/* task-runner.js - Offline CLI Task Runner and Checkpoint Engine */',
      'const fs = require("fs");',
      'const path = require("path");',
      'const readline = require("readline");',
      'const cwd = process.cwd();',
      'const SUMMARY_DIR = path.join(cwd, ".studio");',
      'const SUMMARY_FILE = path.join(SUMMARY_DIR, "task-summary.json");',
      'function findTaskFile() {',
      '  const candidates = ["TASKS.md", "tasks.md", ...fs.readdirSync(cwd).filter(f => /^TASKS-.*\\.md$/i.test(f))];',
      '  for (const c of candidates) { const p = path.join(cwd, c); if (fs.existsSync(p)) return p; }',
      '  return null;',
      '}',
      'function parseTasks(content) {',
      '  const lines = content.split(/\\r?\\n/);',
      '  const tasks = [];',
      '  let curPhase = "Fase 1", curPhaseNum = 1;',
      '  for (let i = 0; i < lines.length; i++) {',
      '    const line = lines[i];',
      '    const hm = line.match(/^##\\s+(?:Fase\\s+(\\d+)|(Fondasi|Requirement\\s+\\d+))/i);',
      '    if (hm) {',
      '      if (hm[1]) { curPhaseNum = parseInt(hm[1], 10); curPhase = "Fase " + curPhaseNum; }',
      '      else if (hm[2] && hm[2].toLowerCase() === "fondasi") { curPhaseNum = 1; curPhase = "Fase 1: Fondasi"; }',
      '    }',
      '    const tm = line.match(/^-\\s*\\[([ xX])\\]\\s+([A-Z0-9.-]+)\\s+(.+)$/);',
      '    if (tm) {',
      '      const done = tm[1].toLowerCase() === "x";',
      '      const id = tm[2];',
      '      const title = tm[3].trim();',
      '      let layer = "backend";',
      '      if (/ui|tampilan|layout|halaman|form|komponen|mockup|antarmuka|css|html/i.test(title)) layer = "frontend";',
      '      else if (/fondasi|setup|inisialisasi|proyek|struktur/i.test(title)) layer = "foundation";',
      '      tasks.push({ id, phase: curPhaseNum, phaseName: curPhase, layer, title, done, lineIndex: i });',
      '    }',
      '  }',
      '  for (let j = 0; j < tasks.length; j++) {',
      '    const cur = tasks[j], next = tasks[j + 1];',
      '    cur.isCheckpoint = false; cur.checkpointReason = "";',
      '    if (next) {',
      '      if (cur.phase !== next.phase) {',
      '        cur.isCheckpoint = true;',
      '        cur.checkpointReason = "Pergantian Fase (" + cur.phaseName + " -> " + next.phaseName + ")";',
      '      } else if (cur.layer === "frontend" && next.layer === "backend") {',
      '        cur.isCheckpoint = true;',
      '        cur.checkpointReason = "Pergantian Layer (Frontend Mockup selesai -> Pindah ke Backend)";',
      '      }',
      '    }',
      '  }',
      '  return tasks;',
      '}',
      'function printStatus(tasks) {',
      '  const total = tasks.length, done = tasks.filter(t => t.done).length;',
      '  const pct = total ? Math.round((done / total) * 100) : 0;',
      '  console.log("\\n======================================================");',
      '  console.log("  PRD STUDIO TASK KANBAN RUNNER");',
      '  console.log("  Progress: " + done + " / " + total + " task selesai (" + pct + "%)");',
      '  console.log("======================================================\\n");',
      '  const pList = [...new Set(tasks.map(t => t.phase))].sort();',
      '  pList.forEach(p => {',
      '    console.log("[Fase " + p + "]");',
      '    tasks.filter(t => t.phase === p).forEach(t => {',
      '      const mark = t.done ? "[x]" : "[ ]";',
      '      const badge = t.layer === "frontend" ? "(FE)" : (t.layer === "backend" ? "(BE)" : "(FD)");',
      '      const cp = t.isCheckpoint ? " <CHECKPOINT>" : "";',
      '      console.log("  " + mark + " " + badge + " " + t.id + " " + t.title + cp);',
      '    });',
      '    console.log("");',
      '  });',
      '}',
      'function getNextTask(tasks) {',
      '  for (let i = 0; i < tasks.length; i++) { if (!tasks[i].done) return { task: tasks[i], prev: tasks[i - 1] || null }; }',
      '  return null;',
      '}',
      'function markTaskDone(taskFilePath, task) {',
      '  const content = fs.readFileSync(taskFilePath, "utf8");',
      '  const lines = content.split(/\\r?\\n/);',
      '  lines[task.lineIndex] = lines[task.lineIndex].replace(/^-\\s*\\[\\s*\\]/, "- [x]");',
      '  fs.writeFileSync(taskFilePath, lines.join("\\n"), "utf8");',
      '  if (!fs.existsSync(SUMMARY_DIR)) fs.mkdirSync(SUMMARY_DIR, { recursive: true });',
      '  let summaries = [];',
      '  if (fs.existsSync(SUMMARY_FILE)) { try { summaries = JSON.parse(fs.readFileSync(SUMMARY_FILE, "utf8")); } catch (e) {} }',
      '  summaries.push({ taskId: task.id, title: task.title, layer: task.layer, phase: task.phase, completedAt: new Date().toISOString() });',
      '  fs.writeFileSync(SUMMARY_FILE, JSON.stringify(summaries, null, 2), "utf8");',
      '}',
      'function run() {',
      '  const tf = findTaskFile();',
      '  if (!tf) { console.error("Error: Berkas TASKS.md tidak ditemukan."); process.exit(1); }',
      '  const tasks = parseTasks(fs.readFileSync(tf, "utf8"));',
      '  const arg = process.argv[2];',
      '  if (arg === "--status" || arg === "-s") { printStatus(tasks); return; }',
      '  const nextObj = getNextTask(tasks);',
      '  if (!nextObj) { printStatus(tasks); console.log("Semua task telah selesai 100%. Selamat!"); return; }',
      '  const cur = nextObj.task, prev = nextObj.prev;',
      '  if (prev && prev.isCheckpoint) {',
      '    console.log("\\n======================================================");',
      '    console.log("  CHECKPOINT TERDETEKSI: " + prev.checkpointReason);',
      '    console.log("======================================================");',
      '    console.log("Pastikan antarmuka telah ditinjau sebelum masuk ke backend.");',
      '    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });',
      '    rl.question("Ketik lanjut untuk melanjutkan: ", ans => {',
      '      rl.close();',
      '      if (ans.trim().toLowerCase() !== "lanjut") { console.log("Ditunda."); process.exit(0); }',
      '      showTask(tf, cur);',
      '    });',
      '  } else { showTask(tf, cur); }',
      '}',
      'function showTask(tf, task) {',
      '  console.log("\\nTASK AKTIF: " + task.id + " (" + task.layer.toUpperCase() + ")");',
      '  console.log("Judul: " + task.title);',
      '  console.log("Fase : " + task.phaseName);',
      '  console.log("\\nPrompt Coding Agent:");',
      '  console.log("```markdown\\nKerjakan: " + task.id + " - " + task.title + "\\n```\\n");',
      '  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });',
      '  rl.question("Apakah sudah selesai? (y/N): ", ans => {',
      '    rl.close();',
      '    if (ans.trim().toLowerCase() === "y") {',
      '      markTaskDone(tf, task);',
      '      console.log("Task " + task.id + " ditandai SELESAI.");',
      '    }',
      '  });',
      '}',
      'if (require.main === module) run();',
      'module.exports = { parseTasks, getNextTask };'
    ].join('\n');
  }

  function videoFiles(data, res) {
    var slug = slugOf(data);
    var spec = specOf(data, res);
    var sb = res && (res.storyboard || (res.lastResult && res.lastResult.storyboard));
    if (!sb && data && data.lastResult) sb = data.lastResult.storyboard;
    if (!sb && window.GenStoryboard) sb = window.GenStoryboard(data, spec, { visualStyle: data && data.videoVisualStyle });
    if (sb && window.VideoProduction && window.VideoProduction.build) data = window.VideoProduction.directorData(data, res && res.videoForm || {});
    if (!sb) return [];
    var out = [
      { name: 'STORYBOARD-' + slug + '.md', text: sb.markdown, type: 'text/markdown' },
      { name: 'FRAME-' + slug + '.md', text: sb.frameSpec, type: 'text/markdown' },
      { name: 'AGENT-HYPERFRAMES-' + slug + '.md', text: sb.masterPrompt, type: 'text/markdown' },
      { name: 'MARKERS-' + slug + '.csv', text: sb.nleMarkers || '', type: 'text/csv' },
      { name: 'PRODUCTION-' + slug + '.md', text: (window.VideoProduction && window.VideoProduction.build) ? window.VideoProduction.build(data, spec, sb) : '', type: 'text/markdown' },
      { name: 'index.html', text: sb.rootHtml || '', type: 'text/html' }
    ];
    (sb.subcompHtmls || []).forEach(function (f) {
      out.push({ name: f.name.replace(/^compositions\/frames\//, ''), text: f.text, type: 'text/html' });
    });
    out.push({ name: 'sfx-synth.js', text: sb.proceduralAudio || '', type: 'application/javascript' });
    out.push({ name: 'lint-anti-ppt.js', text: antiPptLinter(), type: 'application/javascript' });
    return out;
  }

  function inferStack(data) {
    var sp = String((data && data.stackPref) || '').toLowerCase();
    var fe = 'ai-pilih', be = 'ai-pilih', db = 'ai-pilih', dep = 'ai-pilih';
    if (/tanstack/.test(sp)) fe = 'TanStack Start';
    else if (/next\.?js/.test(sp)) fe = 'Next.js (App Router)';
    else if (/react.*vite|vite.*react/.test(sp)) fe = 'React (Vite SPA)';
    else if (/expo/.test(sp)) fe = 'Expo (React Native)';
    else if (/svelte/.test(sp)) fe = 'SvelteKit';
    else if (/vue|nuxt/.test(sp)) fe = 'Vue.js / Nuxt';
    else if (/astro/.test(sp)) fe = 'Astro';
    else if (/vanilla|html css js/.test(sp)) fe = 'HTML CSS JS vanilla';
    if (/hono|fastify|node/.test(sp)) be = 'Node.js (Hono / Fastify)';
    else if (/fastapi|python/.test(sp)) be = 'Python (FastAPI)';
    else if (/echo|fiber|go\b/.test(sp)) be = 'Go (Echo / Fiber)';
    else if (/axum|rust/.test(sp)) be = 'Rust (Axum)';
    else if (/supabase/.test(sp)) be = 'Supabase (BaaS)';
    else if (/cloudflare workers/.test(sp)) be = 'Cloudflare Workers';
    else if (/laravel/.test(sp)) be = 'Laravel (PHP)';
    else if (/spring/.test(sp)) be = 'Java (Spring Boot)';
    if (/neon/.test(sp)) db = 'Neon (Serverless Postgres)';
    else if (/postgres/.test(sp)) db = 'PostgreSQL';
    else if (/supabase/.test(sp)) db = 'Supabase Postgres';
    else if (/turso/.test(sp)) db = 'Turso (libSQL)';
    else if (/cloudflare d1|d1\b/.test(sp)) db = 'Cloudflare D1';
    else if (/sqlite/.test(sp)) db = 'SQLite';
    else if (/mongo/.test(sp)) db = 'MongoDB';
    else if (/mysql/.test(sp)) db = 'MySQL';
    if (/vercel/.test(sp)) dep = 'Vercel';
    else if (/docker/.test(sp)) dep = 'Docker';
    else if (/cloudflare pages/.test(sp)) dep = 'Cloudflare Pages';
    else if (/railway/.test(sp)) dep = 'Railway';
    else if (/fly\.?io/.test(sp)) dep = 'Fly.io';
    else if (/render/.test(sp)) dep = 'Render';
    return { frontend: fe, backend: be, database: db, deployment: dep };
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
    if (opts && opts.includeScaffold) {
      var stack = inferStack(data);
      var tpl = (window.TemplateBrowser && typeof window.TemplateBrowser.matchTemplate === 'function') ? window.TemplateBrowser.matchTemplate(stack) : null;
      if (tpl) {
        var sc = (window.TemplateBrowser && typeof window.TemplateBrowser.scaffoldMarkdown === 'function') ? window.TemplateBrowser.scaffoldMarkdown(tpl, data) : '';
        if (sc) base = base.concat([{ name: 'SCAFFOLD-' + slug + '.md', text: sc, type: 'text/markdown' }]);
      }
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
    taskRunner: taskRunner,
    storyboard: storyboard,
    agentHyperframes: agentHyperframes,
    nleMarkers: nleMarkers,
    videoFiles: videoFiles
  };
})();
