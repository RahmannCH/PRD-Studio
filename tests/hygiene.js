/* Higienis: id ganda, atribut style inline, em-dash di body, mojibake.
   Dipakai lokal dan di CI. Exit code 1 bila ada masalah "keras" (dup-id,
   inline-style, mojibake). Em-dash hanya dicatat sebagai peringatan karena
   aturannya kontekstual (boleh di komentar dan <title>). */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
let hard = 0;

function read(f) { return fs.readFileSync(path.join(root, f), 'utf8'); }

for (const f of ['index.html', 'studio.html']) {
  const src = read(f);
  const ids = [...src.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
  const dup = ids.filter((v, i) => ids.indexOf(v) !== i);
  if (dup.length) { hard++; console.log('DUP-ID', f, [...new Set(dup)].join(', ')); }
  const lines = src.split(/\r?\n/);
  lines.forEach((l, i) => {
    if (/style="/.test(l)) { hard++; console.log('INLINE-STYLE', f + ':' + (i + 1), l.trim().slice(0, 100)); }
    if (/—/.test(l) && !/<title>/.test(l) && !/<!--/.test(l) && !/^\s*\/\*/.test(l)) {
      console.log('EM-DASH', f + ':' + (i + 1), l.trim().slice(0, 120));
    }
    /* Mojibake cp1252: "Ã…" menandakan teks UTF-8 yang salah dibaca. */
    if (/Ã/.test(l)) { hard++; console.log('MOJIBAKE', f + ':' + (i + 1), l.trim().slice(0, 100)); }
  });
}

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(js|css)$/.test(e.name)) {
      const rel = path.relative(root, p);
      const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
      lines.forEach((l, i) => {
        if (/—/.test(l)) console.log('EM-DASH-CODE', rel + ':' + (i + 1), l.trim().slice(0, 120));
        if (/Ã/.test(l)) { hard++; console.log('MOJIBAKE', rel + ':' + (i + 1), l.trim().slice(0, 100)); }
      });
    }
  }
}
walk(path.join(root, 'js'));
for (const f of ['sw.js']) {
  const lines = read(f).split(/\r?\n/);
  lines.forEach((l, i) => {
    if (/—/.test(l)) console.log('EM-DASH-CODE', f + ':' + (i + 1), l.trim().slice(0, 120));
    if (/Ã/.test(l)) { hard++; console.log('MOJIBAKE', f + ':' + (i + 1), l.trim().slice(0, 100)); }
  });
}

if (hard) {
  console.log('HIGIENE: ' + hard + ' masalah keras');
  process.exit(1);
}
console.log('HIGIENE OK');
