/* Renderer Spec ke beberapa format output. Satu spec, banyak bentuk:
   markdown (PRD 12 bagian, kontrak lama dipertahankan), brief (ringkasan satu
   halaman), json, yaml, dan html (dokumen mandiri siap cetak).
   Semua renderer hanya membaca objek spec; tidak ada yang menyentuh jawaban
   mentah, jadi format baru otomatis ikut begitu spec bertambah. */
window.SpecRender = (function () {
  var SH = window.PrdShared;
  var esc = SH.esc;
  function sent(s) {
    var t = String(s || '').trim();
    if (!t) return t;
    return /[.!?]$/.test(t) ? t : t + '.';
  }

  /* ---------------- markdown: PRD 12 bagian ---------------- */

  function markdown(spec) {
    var m = spec.meta;
    var scoreLine = (m.score !== null && m.score !== undefined)
      ? 'Skor kesiapan ' + m.score + (m.scoreLevel ? ' (' + m.scoreLevel + ')' : '') + '.'
      : '';
    var roles = spec.roles || [];
    var relRoles = roles.length ? roles.map(esc).join('/') : 'pemilik/kasir';
    var model = window.Knowledge.entitiesToMarkdown(spec.entities, relRoles, spec.relationsTail);
    var who = spec.personas[0] ? spec.personas[0].name : 'pengguna utama';

    var s1 = esc(m.productName) + ' adalah ' + esc(m.productType).toLowerCase() + ' untuk ' + esc(sent(spec.summary.primaryUser)) + '\n' +
      'Masalah: ' + esc(sent(spec.summary.problem)) + '\nAlasan sekarang: ' + esc(sent(spec.summary.whyNow));

    var must0 = spec.scope.must[0] ? spec.scope.must[0].text : '';
    var s2 = esc(who) + ' butuh ' +
      (must0 ? esc(String(must0).charAt(0).toLowerCase() + String(must0).slice(1)) : 'menyelesaikan pekerjaan') +
      ' karena ' + esc(sent(spec.summary.problem)) + '\n' +
      'Peran: ' + (roles.length ? roles.map(esc).join(', ') : '-') + '.';

    var s3 = spec.metrics.map(function (x) { return '- ' + esc(x.text); }).join('\n');

    var s4 = '**Must (v1 wajib):**\n' +
      (spec.scope.must.length
        ? spec.scope.must.map(function (x) { return x.id + ' ' + esc(x.text); }).join('\n')
        : 'M1 (belum diisi)') + '\n\n' +
      '**Should (kalau sempat):**\n' +
      (spec.scope.should.length
        ? spec.scope.should.map(function (x) { return x.id + ' ' + esc(x.text); }).join('\n')
        : 'S1 (belum diisi)') + '\n\n' +
      '**Won\'t (tegas di luar v1):**\n' +
      (spec.scope.wont.length
        ? spec.scope.wont.map(function (w) { return '- ' + esc(w.text); }).join('\n')
        : '- (belum diisi)');

    var s5 = spec.stories.length
      ? spec.stories.map(function (st) {
        return st.id + ' Sebagai ' + esc(st.role) + ' saya bisa ' + esc(st.action) +
          ' sehingga ' + esc(st.outcome) + '.\n' +
          '  Kriteria biner: ' + st.criteria.map(esc).join(', ') + '.';
      }).join('\n\n')
      : 'Belum ada Must have.';

    var s6 = 'Alur utama: ' + esc(spec.flows.main) + '\n' +
      'Jalur gagal: ' + esc(spec.flows.fail) + '\n' +
      'Navigasi: ' + esc(spec.flows.nav.join(', ')) + '. Setiap layar punya 3 state: ' +
      spec.flows.screenStates.map(function (x) { return esc(x); }).join(', ') + '.';

    var s7 = 'Gaya: ' + esc(spec.ui.style) + '. Pola layout: ' + esc(spec.ui.layout) + '.\n' +
      'Aturan: satu titik fokus per layar, ' + spec.ui.rules.map(esc).join(', ') + '.\n' +
      'Visual: ' + esc(spec.ui.visual);

    var s8 = 'Kebutuhan: ' + (spec.media.audio.length ? esc(spec.media.audio.join(', ')) : '-') + '.\n' +
      'Aturan: ' + spec.media.rules.map(esc).join(', ') + '.';

    var nfrUser = spec.nfrs.filter(function (n) { return n.source === 'user'; })
      .map(function (n) { return esc(n.text); });
    var nfrBaku = spec.nfrs.filter(function (n) { return n.source === 'baku'; })
      .map(function (n) { return esc(n.text); });
    var s9 = (nfrUser.length ? nfrUser.join('\n') + '\n' : '') +
      'Tambahan baku: ' + nfrBaku.join(', ') + '.';

    var s11 = (spec.endpoints.length
      ? spec.endpoints.map(function (e) {
        return '- ' + e.m + ' ' + e.p + (e.guard ? ' (' + e.guard + ')' : '');
      }).join('\n')
      : '- (belum ada endpoint)') +
      (spec.apiRules.length ? '\n- Aturan: ' + spec.apiRules.map(esc).join(', ') + '.' : '') + '\n' +
      'Integrasi: ' + (spec.constraints.integrations.length ? esc(spec.constraints.integrations.join('; ')) : '-') + '.';

    var riskText = 'Risiko:\n' + spec.riskGroups.map(function (r) {
      return '- ' + esc(window.Knowledge.riskToText(r));
    }).join('\n');

    var s12 = riskText + '\n' +
      'Out of scope v1 sama dengan daftar Won\'t. Stack: ' + esc(sent(spec.constraints.stack));
    if (spec.assumptions.length) {
      s12 += '\nAsumsi yang perlu dikonfirmasi:\n' +
        spec.assumptions.map(function (x) { return '- ' + esc(x); }).join('\n');
    }
    if (spec.openQuestions.length) {
      s12 += '\nPertanyaan terbuka:\n' +
        spec.openQuestions.map(function (x) { return '- ' + esc(x); }).join('\n');
    }

    return '# PRD: ' + esc(m.productName) + '\n' +
      '_Jenis: ' + esc(m.productType) + ' | Industri: ' + esc(m.industry) + ' | Platform: ' +
      esc(m.platform.join(', ')) + ' | Disusun: ' + m.date + ' via ' + m.generator + '. ' + scoreLine + '_\n\n' +
      '## 1. Ringkasan eksekutif\n' + s1 + '\n\n' +
      '## 2. Persona dan problem statement\n' + s2 + '\n\n' +
      '## 3. Tujuan dan metrik sukses\n' + s3 + '\n\n' +
      '## 4. Scope MoSCoW\n' + s4 + '\n\n' +
      '## 5. User stories dan kriteria terima\n' + s5 + '\n\n' +
      '## 6. Alur dan sistematika interface\n' + s6 + '\n\n' +
      '## 7. Layout dan UI per area\n' + s7 + '\n\n' +
      '## 8. Audio dan media\n' + s8 + '\n\n' +
      '## 9. Kebutuhan non fungsional\n' + s9 + '\n\n' +
      '## 10. Model data (awal)\n' + model + '\n\n' +
      '## 11. Endpoint dan aturan (awal)\n' + s11 + '\n\n' +
      '## 12. Risiko dan out of scope\n' + s12 + '\n';
  }

  /* ---------------- brief: ringkasan satu halaman ---------------- */

  function brief(spec) {
    var m = spec.meta;
    var out = '# Brief: ' + esc(m.productName) + '\n' +
      '_' + esc(m.productType) + ' | ' + esc(m.industry) + ' | ' + m.date + '_\n\n' +
      esc(spec.summary.oneLiner) + '\n\n' +
      '**Masalah:** ' + esc(sent(spec.summary.problem)) + '\n\n' +
      '**Taruhan sekarang:** ' + esc(sent(spec.summary.whyNow)) + '\n\n' +
      '**Metrik sukses:**\n' + spec.metrics.map(function (x) { return '- ' + esc(x.text); }).join('\n') + '\n\n' +
      '**Must have v1:**\n' + spec.scope.must.map(function (x) { return '- ' + x.id + ' ' + esc(x.text); }).join('\n') + '\n\n' +
      '**Cerita kunci:**\n' + spec.stories.slice(0, 3).map(function (st) {
        return '- ' + st.id + ' Sebagai ' + esc(st.role) + ' saya bisa ' + esc(st.action) + ' (' + st.criteria.length + ' kriteria biner)';
      }).join('\n');
    if (spec.features.length) {
      out += '\n\n**Fitur yang dikenali dari jawaban:**\n' +
        spec.features.map(function (f) { return '- ' + esc(f.name); }).join('\n');
    }
    if (spec.openQuestions.length) {
      out += '\n\n**Perlu jawaban user:**\n' + spec.openQuestions.map(function (q) { return '- ' + esc(q); }).join('\n');
    }
    return out + '\n';
  }

  /* ---------------- json ---------------- */

  function json(spec) {
    return JSON.stringify(spec, null, 2);
  }

  /* ---------------- yaml (dumper mandiri, tanpa dependensi) ---------------- */

  function yScalar(v) {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    var s = String(v);
    if (s === '') return '""';
    if (/^[\s\-?:,[\]{}#&*!|>'"%@`]/.test(s) || /[\n:#]/.test(s)) {
      return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
    }
    return s;
  }
  function yLines(v, indent) {
    var pad = '  '.repeat(indent);
    if (Array.isArray(v)) {
      if (!v.length) return pad + '[]';
      return v.map(function (x) {
        if (x !== null && typeof x === 'object') {
          var sub = yLines(x, indent + 1).split('\n');
          sub[0] = pad + '- ' + sub[0].trim();
          return sub.join('\n');
        }
        return pad + '- ' + yScalar(x);
      }).join('\n');
    }
    if (v !== null && typeof v === 'object') {
      var keys = Object.keys(v);
      if (!keys.length) return pad + '{}';
      return keys.map(function (k) {
        var val = v[k];
        if (val !== null && typeof val === 'object' && (!Array.isArray(val) || val.length)) {
          return pad + k + ':\n' + yLines(val, indent + 1);
        }
        if (Array.isArray(val)) return pad + k + ': []';
        return pad + k + ': ' + yScalar(val);
      }).join('\n');
    }
    return pad + yScalar(v);
  }
  function yaml(spec) {
    return yLines(spec, 0) + '\n';
  }

  /* ---------------- html: dokumen mandiri siap cetak ---------------- */

  /* Konverter markdown minimal untuk bentuk yang kita kendalikan sendiri.
     Konten SUDAH di-escape markdown() (satu tempat), jadi di sini tidak ada
     escape HTML lagi: kalau di-escape ulang, heading "## " ikut berubah jadi
     "\## " dan seluruh struktur dokumen hilang. Deteksi struktur dilakukan
     pada baris apa adanya, lalu escape markdown (\\# dan \\`) dikembalikan
     menjadi karakter biasa supaya teks user tampil utuh. */
  function mdToHtml(md) {
    var lines = String(md || '').replace(/\r\n/g, '\n').split('\n');
    var out = [];
    var listOpen = false;
    function closeList() { if (listOpen) { out.push('</ul>'); listOpen = false; } }
    function inline(s) {
      return s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    }
    lines.forEach(function (line) {
      if (/^# /.test(line)) { closeList(); out.push('<h1>' + inline(line.slice(2)) + '</h1>'); return; }
      if (/^## /.test(line)) { closeList(); out.push('<h2>' + inline(line.slice(3)) + '</h2>'); return; }
      if (/^_/.test(line) && /_$/.test(line)) { closeList(); out.push('<p class="doc-meta">' + inline(line.slice(1, -1)) + '</p>'); return; }
      if (/^- /.test(line) || /^[MS]\d+ /.test(line)) {
        if (!listOpen) { out.push('<ul>'); listOpen = true; }
        out.push('<li>' + inline(line.replace(/^- /, '')) + '</li>');
        return;
      }
      if (/^ {2}\S/.test(line)) { closeList(); out.push('<p class="criteria">' + inline(line.trim()) + '</p>'); return; }
      if (!line.trim()) { closeList(); return; }
      closeList(); out.push('<p>' + inline(line) + '</p>');
    });
    closeList();
    return out.join('\n').replace(/\\#/g, '#').replace(/\\`/g, '`');
  }
  function html(spec) {
    var m = spec.meta;
    var md = markdown(spec);
    var body = mdToHtml(md);
    var title = 'PRD: ' + String(m.productName || '');
    return '<!DOCTYPE html>\n<html lang="id">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<title>' + esc(title) + '</title>\n<style>\n' + HTML_CSS + '</style>\n</head>\n<body>\n' +
      '<main class="doc">\n' + body + '\n</main>\n' +
      '<footer class="doc-foot">Dokumen ini dihasilkan PRD Studio dari jawaban wawancara. ' +
      'Data lengkap ada di berkas .json dan .yaml pada ekspor yang sama.</footer>\n' +
      '</body>\n</html>\n';
  }
  var HTML_CSS = [
    ':root{color-scheme:light}',
    '*{box-sizing:border-box}',
    'body{margin:0;background:#f4f4f2;color:#1c1c1c;font:16px/1.65 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}',
    '.doc{max-width:820px;margin:0 auto;background:#fff;padding:56px 64px;box-shadow:0 1px 3px rgba(0,0,0,.08)}',
    'h1{font-size:30px;line-height:1.25;margin:0 0 8px}',
    'h2{font-size:20px;margin:36px 0 10px;padding-top:14px;border-top:1px solid #e3e3df;color:#00699F}',
    'p{margin:8px 0}',
    'ul{margin:8px 0;padding-left:22px}',
    'li{margin:4px 0}',
    '.doc-meta{color:#555;font-size:14px;margin:0 0 4px}',
    '.criteria{color:#333;margin:2px 0 10px}',
    '.doc-foot{max-width:820px;margin:0 auto;padding:18px 64px 48px;color:#555;font-size:13px}',
    'section,h2{break-inside:avoid;page-break-inside:avoid}',
    '@media print{body{background:#fff}.doc{box-shadow:none;padding:0 12mm;max-width:none}.doc-foot{padding:6mm 12mm}}',
    '@media (max-width:640px){.doc{padding:24px 18px}.doc-foot{padding:14px 18px 32px}}'
  ].join('\n');

  return { markdown: markdown, brief: brief, json: json, yaml: yaml, html: html, mdToHtml: mdToHtml };
})();
