/* Exporter: unduh md, json, prompts; bundle semua output jadi satu file; parse seksi PRD. */
(function () {
  function slug(s) {
    return String(s || 'produk').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'produk';
  }
  /* escMd: escape konten user untuk markdown bundle (roadmap/prompt/diagram).
     Selaras dengan esc() di shared.js: < > (XSS di viewer markdown),
     backtick (prompt bisa diedit user → bisa menanam fence ```), '#' awal
     baris (seksi PRD/paket palsu). '&' TIDAK di-escape agar "Retail & F&B"
     tidak berubah jadi "&amp;". PRD sudah di-escape di generator. */
  function escMd(s) {
    return String(s == null ? '' : s)
      .replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/`/g, '\\`')
      .replace(/(^|\n)\s*#/g, '$1\\#');
  }
  function download(name, text, type) {
    var blob = new Blob([text], { type: (type || 'text/markdown') + ';charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
    /* C7: tanpa umpan balik, pengguna menekan tombol lagi karena yakin
       tidak ada yang terjadi (unduhan bisa tersembunyi di bar unduhan). */
    if (window.UX && window.UX.toast) window.UX.toast(name + ' diunduh.');
  }
  function parseSections(md) {
    var text = String(md == null ? '' : md);
    var parts = text.split(/^## /m);
    var head = parts.shift();
    return [{ title: 'Judul dan ringkasan', body: head.trim() }].concat(parts.map(function (p) {
      var nl = p.indexOf('\n');
      var title = nl > -1 ? p.slice(0, nl).trim() : p.trim();
      var body = nl > -1 ? p.slice(nl + 1).trim() : '';
      return { title: title, body: '## ' + p.trim() };
    }));
  }
  /* Bundle: PRD + roadmap + diagram + prompt dalam satu markdown utuh. */
  function bundle(name, res) {
    if (!res) return '';
    /* R46: fullPrd/textContent bisa kosong bila render parsial gagal —
       tetap beri bundle utuh dari field tersimpan, jangan file hampir kosong. */
    var prd = String(res.prd || '').trim() || '_PRD belum tersedia di hasil ini._';
    var out = ['# Paket lengkap: ' + (name || 'Proyek'), '_Disusun via PRD Studio_', '', '---', '', 'Bagian ini adalah PRD utuh.', '', prd, '', '---', '', '# Roadmap', ''];
    (res.roadmap || []).forEach(function (f) {
      out.push('## ' + escMd(f.fase));
      out.push('_' + escMd(f.depends) + '_');
      (f.items || []).forEach(function (it) { out.push('- [' + escMd(it.est) + '] ' + escMd(it.text) + ' (' + escMd(it.depends) + ')'); });
      out.push('');
    });
    out.push('---', '', '# Diagram Mermaid', '', 'Butuh renderer Mermaid (editor, VS Code, atau https://mermaid.live).', '');
    /* B7: fence 4 backtick — kalau judul/body mengandung ``` (prompt bisa
       diedit user), fence 3 akan bocor dan merusak sisa dokumen. */
    (res.diagrams || []).forEach(function (g) { out.push('## ' + escMd(g.title), '', '````mermaid', String(g.code || ''), '````', ''); });
    out.push('---', '', '# Prompt chain P0-P9', '', 'Salin berurutan. Gerbang berantai: P5 butuh P4, P6 butuh P5, P7 butuh P6, P8 butuh P7, P9 butuh P8.', '');
    (res.prompts || []).forEach(function (p) { out.push('## ' + escMd(p.id) + ' ' + escMd(p.title) + (p.gate ? ' (gerbang: ' + escMd(p.gate) + ')' : ''), '', escMd(p.body), '', '---', ''); });
    /* Catatan keamanan: mermaid code sengaja TIDAK di-escape (harus utuh
       untuk renderer), tapi berasal dari safe() di diagrams.js. */
    return out.join('\n');
  }
  /* CSV roadmap: fase,item,estimasi,dependensi,status.
     B7: kunci checks harus SAMA dengan render.js — 'i<fi>.<ii>' (indeks
     stabil). Kunci hash lama ('m...') tetap dicoba sebagai fallback migrasi. */
  function roadmapCsv(roadmap, checks) {
    checks = (checks && typeof checks === 'object' && !Array.isArray(checks)) ? checks : {};
    var own = (window.PrdShared && window.PrdShared.own) || function (o, k) { return !!(o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k)); };
    var rows = [['Fase', 'Item', 'Estimasi', 'Dependensi', 'Status']];
    (roadmap || []).forEach(function (f, fi) {
      (f.items || []).forEach(function (it, ii) {
        var key = 'i' + fi + '.' + ii;
        var legacy = 'm' + (function () {
          var raw = f.fase + '|' + it.text;
          var h = 5381;
          for (var k = 0; k < raw.length; k++) h = ((h << 5) + h + raw.charCodeAt(k)) >>> 0;
          return h.toString(36);
        })();
        var done = own(checks, key) ? !!checks[key] : !!checks[legacy];
        var status = done ? 'Selesai' : 'Belum';
        rows.push([f.fase, it.text, it.est, it.depends, status]);
      });
    });
    /* B7: baris pakai \r\n — Excel menganggap \n mentah sebagai satu sel
       panjang saat double-click import. */
    var body = rows.map(function (r) {
      return r.map(function (c) {
        var s = String(c == null ? '' : c);
        /* R43: guard formula Excel/Sheets — cukup prefiks spasi/tab/newline
             ditambah karakter formula. Regex lama `^[=+\-@]` melepas spasi
             pengaman dan menganggap " -Judul" sebagai formula.
             B7: guard `|` juga — pipe memecah pemetaan kolom di sebagian
             spreadsheet yang mengimport CSV bukan-berkutip dengan benar. */
        if (/^\s*[=+\-@\t\r|]/.test(s)) s = "'" + s;
        return '"' + s.replace(/"/g, '""') + '"';
      }).join(',');
    }).join('\r\n');
    return '\uFEFF' + body;
  }
  window.Exporter = { slug: slug, escMd: escMd, download: download, parseSections: parseSections, bundle: bundle, roadmapCsv: roadmapCsv };
})();
