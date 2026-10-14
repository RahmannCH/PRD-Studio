// Functional test PRD Studio — logic level (no DOM).
// Jalankan: node tests/test-prd.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', 'js', 'studio');

// --- mocks ---
const mem = new Map();
global.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: k => mem.delete(k)
};
global.window = global;
global.addEventListener = function () {}; // state.js listens pagehide/beforeunload

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; }
  else { fail++; console.log('FAIL:', name); }
}
function load(f) {
  const code = fs.readFileSync(path.join(root, f), 'utf8');
  (0, eval)(code);
}

// --- seed legacy v2 + checks, then load state (tests migration) ---
const legacy = {
  productName: 'Warung Lama', productType: 'Aplikasi web', problem: 'x'.repeat(30),
  primaryUser: 'Ibu', roles: 'Pemilik', mustHave: 'a\nb\nc', wontHave: 'z', whyNow: 'nanti',
  mainFlow: 'a', failFlow: 'b', navStructure: 'c', visualNeeds: 'd', nfr: '3 detik',
  platform: 'Android', audio: ['Tanpa audio'], step: 3,
  history: [{ name: 'Warung Lama', at: '2026-01-01', score: 70, snapshot: { productName: 'Warung Lama' } }],
  checks: { old: true }
};
localStorage.setItem('prd_studio_v2', JSON.stringify(legacy));
localStorage.setItem('prd_studio_checks', JSON.stringify({ old: true }));

load('shared.js');
load('state.js');
load('templates.js');
load('validator.js');
load('scorer.js');
load('generator-prd.js');
load('generator-roadmap.js');
load('generator-prompt.js');
load('diagrams.js');
load('exporter.js');
load('llm-adapter.js');

const S = window.StudioState;

// 1. migration v2 -> v3
ok(localStorage.getItem('prd_studio_v3'), 'v3 written after v2 migration');
ok(!localStorage.getItem('prd_studio_v2'), 'legacy v2 key removed after migration');
ok(S.projectList().length === 1, 'migrated to 1 project');
ok(Array.isArray(S.data.platform) && S.data.platform[0] === 'Android', 'string platform coerced to array');
ok(S.data.checks.old === true, 'legacy checks merged');
ok(S.data.history.length === 1, 'history preserved');
ok(S.data.productName === 'Warung Lama', 'data preserved');

// 2. gate: empty data must score < 60
const blank = {
  productName: '', productType: 'Aplikasi web', industry: 'Umum / belum tentu',
  problem: '', whyNow: '', primaryUser: '', platform: ['Web responsif'], roles: '',
  mustHave: '', shouldHave: '', wontHave: '', mainFlow: '', failFlow: '', navStructure: '',
  styleDirection: 'Bersih profesional terang', layoutPref: 'Satu layar kasir fokus',
  visualNeeds: '', audio: ['Tanpa audio'], stackPref: 'HTML CSS JS vanilla', integrations: '', nfr: ''
};
{
  const gaps = window.Validator(blank);
  const sc = window.Scorer(blank, gaps);
  ok(sc.score < 60, 'empty data scores below 60 (got ' + sc.score + ')');
  ok(gaps.some(g => g.code === 'NAMA'), 'empty name detected');
}

// 3. validator fixes
{
  const a = Object.assign({}, blank, { productName: 'KasirX', problem: 'Rapikan laporan penjualan harian warung setiap malam tanpa hitung manual', whyNow: 'Bulan depan audit', primaryUser: 'Ibu', roles: 'Pemilik', mustHave: 'Catat transaksi offline\nCetak struk 58mm dalam 2 detik\nRekap harian otomatis', wontHave: 'Pembayaran online', mainFlow: 'a', failFlow: 'b', navStructure: 'c', visualNeeds: 'd', nfr: 'buka di bawah 3 detik' });
  const gaps = window.Validator(a);
  ok(!gaps.some(g => g.code === 'INTEGRASI'), 'no INTEGRASI false positive from "Rapikan"');
  ok(!gaps.some(g => g.code === 'SAMAR'), 'no SAMAR when digits present');
}
{
  const a = Object.assign({}, blank, { productName: 'KasirX', problem: 'Warung cepat ingin sistem bagus yang optimal dan aman untuk semua', whyNow: 'x', primaryUser: 'y', roles: 'z', mustHave: 'Catat transaksi offline\nCetak struk 58mm dalam 2 detik\nRekap harian otomatis', wontHave: 'Pembayaran online', mainFlow: 'a', failFlow: 'b', navStructure: 'c', visualNeeds: 'd', nfr: '3 detik' });
  const gaps = window.Validator(a);
  const samar = gaps.filter(g => g.code === 'SAMAR');
  ok(samar.length >= 2, 'SAMAR detected without digits (got ' + samar.length + ')');
  ok(samar.every(g => g.step === 1), 'SAMAR in problem maps to step 1');
  const words = samar.map(g => g.msg.match(/"(\w+)"/)[1]);
  ok(new Set(words).size === words.length, 'no duplicate SAMAR words');
}
{
  // SAMAR per-baris: satu baris berangka tidak mematikan deteksi baris lain
  const a = Object.assign({}, blank, { productName: 'KasirX', problem: 'Sistem harus cepat\nTarget buka di bawah 3 detik untuk semua', whyNow: 'x', primaryUser: 'y', roles: 'z', mustHave: 'Catat transaksi offline\nCetak struk 58mm dalam 2 detik\nRekap harian otomatis', wontHave: 'Pembayaran online', mainFlow: 'a', failFlow: 'b', navStructure: 'c', visualNeeds: 'd', nfr: '3 detik' });
  const gaps = window.Validator(a);
  ok(gaps.some(g => g.code === 'SAMAR' && g.msg.indexOf('cepat') > -1), 'digit on one line does not disable SAMAR on another');
}
{
  // TABRAK: must overlapping wont
  const a = Object.assign({}, blank, { productName: 'KasirX', problem: 'Rapikan laporan penjualan harian warung tiap malam', whyNow: 'x', primaryUser: 'y', roles: 'z', mustHave: 'Cetak struk 58mm dalam 2 detik\nCatat transaksi offline\nRekap harian otomatis', wontHave: 'Tidak ada cetak struk fisik di v1', mainFlow: 'a', failFlow: 'b', navStructure: 'c', visualNeeds: 'd', nfr: '3 detik' });
  const gaps = window.Validator(a);
  // "Tidak ada cetak struk" = negasi, bukan tabrak
  ok(!gaps.some(g => g.code === 'TABRAK'), 'negated wont ("Tidak ada ...") is NOT a TABRAK');
}
{
  const a = Object.assign({}, blank, { productName: 'KasirX', problem: 'Rapikan laporan penjualan harian warung tiap malam', whyNow: 'x', primaryUser: 'y', roles: 'z', mustHave: 'Cetak struk 58mm dalam 2 detik\nCatat transaksi offline\nRekap harian otomatis', wontHave: 'Cetak struk fisik di luar v1', mainFlow: 'a', failFlow: 'b', navStructure: 'c', visualNeeds: 'd', nfr: '3 detik' });
  const gaps = window.Validator(a);
  ok(gaps.some(g => g.code === 'TABRAK'), 'real TABRAK overlap detected');
}

// 4. scorer consistency: never 100 with open gaps
{
  const a = Object.assign({}, blank, { productName: 'KasirX', problem: 'Warung cepat ingin sistem bagus tanpa ukuran sama sekali', whyNow: 'x', primaryUser: 'y', roles: 'z', mustHave: 'Catat transaksi offline\nCetak struk 58mm dalam 2 detik\nRekap harian otomatis', wontHave: 'Pembayaran online', mainFlow: 'a', failFlow: 'b', navStructure: 'c', visualNeeds: 'd', nfr: '3 detik' });
  const gaps = window.Validator(a);
  const sc = window.Scorer(a, gaps);
  ok(sc.score < 100, 'gap open => score < 100 (got ' + sc.score + ')');
  ok(sc.parts.some(p => p.name.indexOf('Penalti') > -1), 'penalty visible in parts');
}

// 5. sample flow
const sample = Object.assign({}, blank, window.StudioSample);
{
  const gaps = window.Validator(sample);
  const sc = window.Scorer(sample, gaps);
  ok(gaps.length === 0, 'sample has zero gaps (got ' + gaps.length + ': ' + gaps.map(g=>g.code).join(',') + ')');
  ok(sc.score >= 60, 'sample passes gate (score ' + sc.score + ')');
}
const sc = window.Scorer(sample, window.Validator(sample));
const prd = window.GenPRD(sample, sc);
{
  const secs = window.Exporter.parseSections(prd);
  ok(secs.length >= 12, 'PRD has >= 12 sections (got ' + secs.length + ')');
  ok(!/^- - /m.test(prd), 'no "- - " double bullets');
  ok(prd.indexOf(sample.productName) > -1, 'PRD contains product name');
  ok(prd.indexOf('Retail & F&B') > -1 || prd.indexOf(sample.industry) > -1, 'PRD contains industry line');
}
const roadmap = window.GenRoadmap(sample);
{
  ok(roadmap.length >= 4, 'roadmap >= 4 phases (got ' + roadmap.length + ')');
  ok(roadmap.every(f => f.fase && f.depends && Array.isArray(f.items) && f.items.length), 'phases have fase/depends/items');
  ok(roadmap.every(f => f.items.every(i => i.text && i.est && i.depends)), 'items have text/est/depends');
}
const prompts = window.GenPrompts(sample, prd, {});
{
  ok(prompts.length === 10, '10 prompts (got ' + prompts.length + ')');
  ok(prompts.map(p => p.id).join(',') === 'P0,P1,P2,P3,P4,P5,P6,P7,P8,P9', 'prompt ids ordered P0-P9');
  const gates = prompts.filter(p => p.gate);
  ok(gates.length === 5, '5 gated prompts (got ' + gates.length + ')');
  ok(gates.every(p => prompts.some(q => q.id === p.gate)), 'every gate references an earlier prompt');
  // Gerbang berantai penuh: P5<-P4, P6<-P5, P7<-P6, P8<-P7, P9<-P8
  const byId = {};
  prompts.forEach(p => { byId[p.id] = p.gate; });
  ok(byId.P5 === 'P4' && byId.P6 === 'P5' && byId.P7 === 'P6' && byId.P8 === 'P7' && byId.P9 === 'P8',
    'gates fully sequential P5..P9 (got ' + JSON.stringify({P5:byId.P5,P6:byId.P6,P7:byId.P7,P8:byId.P8,P9:byId.P9}) + ')');
  const role = window.GenPrompts(sample, prd, { role: 'tester QA', tone: 'santai' });
  ok(role[0].body.indexOf('tester QA') > -1, 'custom role applied');
}
const diagrams = window.GenDiagrams(sample);
{
  ok(diagrams.length === 3, '3 diagrams');
  ok(diagrams.every(d => d.code && d.title), 'diagram has code+title');
}

// 5b. failFlow multi-baris tidak merusak sintaks diagram
{
  const a = Object.assign({}, sample, { failFlow: 'Listrik mati,\ndata tersimpan lokal\nlalu sinkron saat online' });
  const ds = window.GenDiagrams(a);
  const flow = ds.find(d => d.id === 'flow');
  ok(flow && flow.code.indexOf('E["Gagal:') > -1, 'failure node quoted');
  ok(flow && !/E\["Gagal:[^\]]*\n/.test(flow.code), 'no raw newline inside E label');
}

// 5c. tanggal lokal, bukan UTC
{
  const d = new Date();
  const p = x => (x < 10 ? '0' : '') + x;
  const local = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  ok(prd.indexOf('Disusun: ' + local) > -1, 'PRD date is local date (' + local + ')');
}

// 5d. baris user diawali "## " tidak jadi seksi palsu
// (dulu pakai `< 16` — tautologi: baseline 13, bug menambah jadi 14 tetap lolos)
{
  const baseSecs = window.Exporter.parseSections(prd).length;
  const a = Object.assign({}, sample, { problem: 'Pemilik warung mencatat di buku\n## Bagian ini bukan seksi\nsering hilang dan sulit rekap harian' });
  const out = window.GenPRD(a, window.Scorer(a, window.Validator(a)));
  const secs = window.Exporter.parseSections(out);
  ok(secs.length === baseSecs, 'no phantom section from "## " in user input (got ' + secs.length + ', baseline ' + baseSecs + ')');
  ok(!secs.some(s => s.title.indexOf('Bagian ini bukan seksi') > -1), 'injected "## " line never becomes a section title');
  ok(!/^## Bagian ini bukan seksi$/m.test(out), 'injected line stays escaped body text, not a raw heading');
}

// 5e. industri: metrics jadi bullet terpisah, bukan satu baris koma
{
  ['Retail & F&B', 'Jasa & agency', 'SaaS internal', 'Marketplace & konten', 'Layanan publik & klinik'].forEach(ind => {
    const a = Object.assign({}, sample, { industry: ind });
    const out = window.GenPRD(a, window.Scorer(a, window.Validator(a)));
    const m = out.match(/## 3\. Tujuan dan metrik sukses\n([\s\S]*?)\n\n/);
    ok(m && m[1].split('\n').filter(l => l.startsWith('- ')).length === 3,
      'industry ' + ind + ' renders 3 separate metric bullets');
  });
}

// 6. bundle export
{
  const res = { prd, roadmap, diagrams, prompts };
  const bundle = window.Exporter.bundle('Kasir Warung', res);
  ok(bundle.indexOf('# Roadmap') > -1 && bundle.indexOf('# Diagram Mermaid') > -1 && bundle.indexOf('# Prompt chain') > -1, 'bundle has roadmap+diagram+prompt sections');
  ok(bundle.indexOf('P9') > -1, 'bundle includes P9');
}

// 7. industry variants
{
  const industries = ['Retail & F&B', 'Jasa & agency', 'SaaS internal', 'Marketplace & konten', 'Layanan publik & klinik', 'Umum / belum tentu'];
  industries.forEach(ind => {
    const a = Object.assign({}, sample, { industry: ind });
    const out = window.GenPRD(a, window.Scorer(a, window.Validator(a)));
    ok(out.length > 500, 'PRD generated for industry ' + ind);
    if (ind !== 'Umum / belum tentu') ok(window.IndustrySpec[ind], 'IndustrySpec has key ' + ind);
  });
}

// 8. multi-project API
{
  const n0 = S.projectList().length;
  const p2 = S.newProject('Proyek Dua');
  ok(S.projectList().length === n0 + 1, 'newProject adds');
  ok(S.activeId() === p2.id, 'newProject activates');
  S.data.productName = 'Dua'; S.save();
  const dup = S.dupProject();
  ok(dup.name.indexOf('salinan') > -1 && S.projectList().length === n0 + 2, 'dupProject');
  ok(JSON.parse(localStorage.getItem('prd_studio_v3')).projects.length === n0 + 2, 'projects persisted');
  const first = S.projectList()[0].id;
  ok(S.switchProject(first), 'switchProject works');
  ok(S.data.productName !== 'Dua' || first === p2.id, 'switch loads other data');
  ok(S.delProject(p2.id), 'delProject');
  ok(S.projectList().length === n0 + 1, 'project count back');
}

// 9. clearRun / reset / pushHistory
{
  S.data.lastResult = { prd: 'x', prompts: [], diagrams: [], roadmap: [] };
  S.data.checks = { a: true }; S.data.copied = { P4: true };
  S.clearRun();
  ok(S.data.lastResult === null && !S.data.checks.a && !S.data.copied.P4, 'clearRun resets result/checks/copied');
  S.data.history = [];
  for (let i = 0; i < 12; i++) S.pushHistory({ name: 'P' + i, at: 't', score: i });
  ok(S.data.history.length === 10, 'history capped at 10');
  // A1: push dengan nama SAMA tetap jadi entri terpisah (desain cap 10 + timestamp)
  S.data.history = [];
  for (let i = 0; i < 5; i++) S.pushHistory({ name: 'Produk Sama', at: 't' + i, score: i });
  ok(S.data.history.length === 5, 'history keeps every push with same name (no dedupe)');
  ok(S.data.history.every(h => typeof h.id === 'string' && h.id), 'every history entry has unique id');
  ok(new Set(S.data.history.map(h => h.id)).size === 5, 'history ids unique');
  // A1: rename tidak boleh menghapus/menulis history
  const idsBefore = S.data.history.map(h => h.id).join(',');
  S.renameActive('Nama Baru', true);
  ok(S.data.history.map(h => h.id).join(',') === idsBefore, 'renameActive does not touch history');
  ok(S.data.history[0].name === 'Produk Sama', 'history entry names unchanged after rename');
  // push SETELAH rename tetap menambah (bukan menggantikan semua)
  S.pushHistory({ name: 'Nama Baru', at: 't9', score: 9 });
  ok(S.data.history.length === 6, 'push after rename appends, does not wipe');
  const hBefore = S.data.history.length;
  S.reset();
  ok(S.data.history.length === hBefore && S.data.productName === '', 'reset clears answers, keeps history');
}

// 10. lastResult validation on load (corrupt payload survives)
{
  mem.set('prd_studio_v3', JSON.stringify({
    projects: [{ id: 'x', name: 'X', updatedAt: 't', data: { lastResult: { prd: 5, score: 'bad', prompts: 'no' }, step: 99, platform: 42 } }],
    activeId: 'x'
  }));
  // reload state.js in a fresh eval scope
  const code = fs.readFileSync(path.join(root, 'state.js'), 'utf8');
  (0, eval)(code);
  ok(window.StudioState.data.lastResult === null, 'corrupt lastResult dropped');
  ok(window.StudioState.data.step === 7, 'step clamped to 7');
  ok(Array.isArray(window.StudioState.data.platform), 'bad platform coerced');
}

// 11. field non-string di storage dijadikan string (bug lama: .trim() throw mematikan wizard)
{
  mem.set('prd_studio_v3', JSON.stringify({
    projects: [{ id: 'y', name: 'Y', updatedAt: 't', data: { productName: 12345, problem: null, roles: ['a','b'], mustHave: 999 } }],
    activeId: 'y'
  }));
  const code = fs.readFileSync(path.join(root, 'state.js'), 'utf8');
  (0, eval)(code);
  const d = window.StudioState.data;
  ok(d.productName === '12345', 'numeric productName coerced to string');
  ok(d.problem === '', 'null problem coerced to empty string');
  ok(typeof d.roles === 'string', 'array roles coerced to string');
  ok(typeof d.mustHave === 'string', 'numeric mustHave coerced to string');
  // validator harus jalan tanpa throw
  let threw = false;
  try { window.Validator(d); } catch (e) { threw = true; }
  ok(!threw, 'Validator survives coerced data');
}

// 12. v3 corrupt + v2 basi ada: mulai kosong, JANGAN jatuh ke v2, v2 dibuang
{
  mem.clear();
  mem.set('prd_studio_v3', '{corrupt!!');
  mem.set('prd_studio_v2', JSON.stringify({ productName: 'Basi Sekali' }));
  const code = fs.readFileSync(path.join(root, 'state.js'), 'utf8');
  (0, eval)(code);
  ok(window.StudioState.data.productName !== 'Basi Sekali', 'corrupt v3 does not fall back to stale v2');
  ok(!mem.has('prd_studio_v2'), 'stale v2 removed after corrupt-v3 reset');
  ok(mem.has('prd_studio_v3'), 'v3 rewritten fresh');
}

// 13. roadmap payload validResult: item tanpa items dibuang, bukan melempar
{
  mem.clear();
  mem.set('prd_studio_v3', JSON.stringify({
    projects: [{ id: 'z', name: 'Z', updatedAt: 't', data: {
      productName: 'Zed',
      lastResult: {
        prd: '# PRD: Zed\n## 1. Ringkasan eksekutif\nisi',
        prompts: [{ id: 'P0', title: 't', body: 'b' }],
        roadmap: [{ fase: 'rusak' }, { fase: 'baik', depends: 'd', items: [{ text: 'x', est: 'S', depends: '-' }] }],
        diagrams: [{ id: 'usecase', title: 't', code: 'flowchart LR\nA-->B' }, { id: 'bad' }],
        score: 70,
        gaps: [{ step: 1, msg: 'm' }, 'sampah']
      }
    } }],
    activeId: 'z'
  }));
  const code = fs.readFileSync(path.join(root, 'state.js'), 'utf8');
  (0, eval)(code);
  const r = window.StudioState.data.lastResult;
  ok(r && r.roadmap.length === 1 && r.roadmap[0].fase === 'baik', 'roadmap item without items filtered out');
  ok(r && r.diagrams.length === 1 && r.diagrams[0].id === 'usecase', 'diagram without code filtered out');
  ok(r && r.gaps.length === 1 && r.gaps[0].msg === 'm', 'gap without msg filtered out');
}

// 14. LLM: key whitespace-only mempertahankan key lama
{
  mem.clear();
  const code = fs.readFileSync(path.join(root, 'llm-adapter.js'), 'utf8');
  (0, eval)(code);
  ok(window.LLM.setConfig({ baseUrl: 'https://x/v1', model: 'm', apiKey: 'sk-abc' }) === true, 'setConfig saves');
  ok(window.LLM.setConfig({ baseUrl: 'https://x/v1', model: 'm', apiKey: '   ' }) === true, 'whitespace key accepted as no-change');
  ok(window.LLM.getConfig().hasKey === true, 'stored key survives whitespace-only input');
  ok(window.LLM.clearKey() === true, 'clearKey works');
  ok(window.LLM.getConfig().hasKey === false, 'key cleared');
  // rollback: save gagal (quota) harus mengembalikan config lama
  const realSet = global.localStorage.setItem;
  global.localStorage.setItem = () => { throw new Error('quota'); };
  window.LLM.setConfig({ baseUrl: 'https://y/v1', model: 'm2', apiKey: 'sk-zzz' });
  global.localStorage.setItem = realSet;
  ok(window.LLM.getConfig().baseUrl === 'https://x/v1', 'failed save rolls back baseUrl');
  ok(window.LLM.getConfig().hasKey === false, 'failed save keeps key state');
}

// 15. clearRun resets promptEdits; renameActive('') fails
{
  mem.clear();
  const code = fs.readFileSync(path.join(root, 'state.js'), 'utf8');
  (0, eval)(code);
  const S = window.StudioState;
  S.data.promptEdits = { P0: 'custom body' };
  S.clearRun();
  ok(Object.keys(S.data.promptEdits).length === 0, 'clearRun wipes promptEdits');
  ok(S.renameActive('') === false, 'renameActive with empty string returns false');
  ok(S.renameActive('   ') === false, 'renameActive with spaces returns false');
}

// 16. importProject validation + rollback on failure
{
  mem.clear();
  const code = fs.readFileSync(path.join(root, 'state.js'), 'utf8');
  (0, eval)(code);
  const S = window.StudioState;
  const initId = S.activeId();
  ok(S.importProject(null) === null, 'importProject rejects null');
  ok(S.importProject({}) === null, 'importProject rejects payload without answers');
  ok(S.importProject({ answers: 'string' }) === null, 'importProject rejects non-object answers');
  const valid = S.importProject({ answers: { productName: 'Imported App' } });
  ok(valid && valid.name === 'Imported App', 'importProject accepts valid answers');
  // rollback if save fails
  const realSet = global.localStorage.setItem;
  global.localStorage.setItem = () => { throw new Error('quota'); };
  const failImport = S.importProject({ answers: { productName: 'Will Fail' } });
  global.localStorage.setItem = realSet;
  ok(failImport === null, 'importProject returns null on quota fail');
  ok(S.activeId() === valid.id, 'activeId preserved on failed import');
}

// 17. Exporter.roadmapCsv: BOM, 5 columns, formula protection
{
  const expCode = fs.readFileSync(path.join(root, 'exporter.js'), 'utf8');
  (0, eval)(expCode);
  const fakeRoadmap = [{
    fase: 'Fase 1',
    depends: 'Tanpa',
    items: [
      { text: '=1+1', est: 'S', depends: 'Tanpa' },
      { text: 'Fitur aman', est: 'M', depends: 'Fase 1' }
    ]
  }];
  const csv = window.Exporter.roadmapCsv(fakeRoadmap, {});
  ok(csv.startsWith('\uFEFF'), 'CSV starts with UTF-8 BOM');
  ok(csv.includes('"Fase","Item","Estimasi","Dependensi","Status"'), 'CSV has 5 headers');
  ok(csv.includes("\"'=1+1\""), 'CSV escapes leading formula character');
  ok(csv.includes('"Belum"'), 'CSV includes status column');
}

// 18. GenPRD: productType takes precedence over industry for endpoints & metrics
{
  const prdCode = fs.readFileSync(path.join(root, 'generator-prd.js'), 'utf8');
  const tmplCode = fs.readFileSync(path.join(root, 'templates.js'), 'utf8');
  (0, eval)(tmplCode);
  (0, eval)(prdCode);
  const landingPRD = window.GenPRD({
    productName: 'Landing X',
    productType: 'Landing page',
    industry: 'Retail & F&B',
    platform: ['Web'],
    audio: ['Tanpa'],
    primaryUser: 'Pengunjung',
    problem: 'Konversi rendah dan lemot sekali',
    whyNow: 'Ada promo besar',
    mustHave: 'Form pendaftaran\nCTA whatsapp\nHero banner',
    shouldHave: '', wontHave: 'Tidak ada login',
    mainFlow: 'Buka, baca, submit', failFlow: 'Error coba lagi', navStructure: 'Home',
    styleDirection: 'Bersih', layoutPref: 'Landing', visualNeeds: 'Foto',
    stackPref: 'Vanilla', integrations: '', nfr: 'LCP 2 detik'
  }, { score: 90, level: 'Siap' });
  ok(landingPRD.includes('POST /leads'), 'Landing page uses leads endpoint even with Retail industry');
  ok(!landingPRD.includes('POST /transactions'), 'Landing page does NOT get transaction endpoint from Retail');
  ok(landingPRD.includes('Konversi formulir'), 'Landing page keeps landing metrics over industry');
}

// 19. hard-cap scorer (B1): gap kritikal NAMA/MASALAH/MUST3 membatasi skor
{
  /* Pakai sample YANG SUDAH LENGKAP + satu gap kritikal — skor mentahnya
     di atas 60, jadi test benar-benar membuktikan pemotongan (bukan sekadar
     skor rendah karena data memang kosong). */
  const cap = (code, name) => {
    const gaps = window.Validator(sample).concat([{ code: code, step: 1, msg: 'x' }]);
    const s = window.Scorer(sample, gaps);
    ok(s.score <= 59, name + ' capped at 59 (got ' + s.score + ')');
    ok(s.level === 'Perlu lengkapi', name + ' level is "Perlu lengkapi" (got ' + s.level + ')');
    ok(s.parts.some(p => p.name.indexOf('Batas hard-rule') > -1), name + ' hard-rule visible in parts');
  };
  cap('NAMA', 'NAMA gap');
  cap('MASALAH', 'MASALAH gap');
  cap('MUST3', 'MUST3 gap');
  const soft = window.Scorer(sample, window.Validator(sample).concat([{ code: 'TIPGRAM', step: 1, msg: 'x' }]));
  ok(!soft.parts.some(p => p.name.indexOf('Batas hard-rule') > -1), 'non-critical gap does not trigger hard-cap');
}

// 20. importProject: prototype pollution tidak lolos (B6)
{
  /* state.js di-eval ulang di blok 16 — pakai instance TERBARU, bukan S lama. */
  const S2 = window.StudioState;
  const p = S2.importProject({
    name: 'Proto Attack',
    answers: { productName: 'Proto App', checks: { __proto__: { polluted: 1 } }, copied: { constructor: { x: 1 } } }
  });
  ok(!!p, 'import with __proto__ payload still accepted');
  ok(!Object.keys(S2.data.checks).some(k => k === '__proto__'), '__proto__ key stripped from checks');
  ok({}.polluted === undefined, 'Object.prototype not polluted by import');
  ok(!Object.keys(S2.data.copied).some(k => k === 'constructor'), 'constructor key stripped from copied');
}

// 21. reverse-wizard parser (E)
{
  load('reverse.js');
  const RW = window.ReverseWizard;
  ok(typeof RW.parse === 'function' && typeof RW.SYSTEM === 'string', 'ReverseWizard module loaded');
  ok(RW.SYSTEM.indexOf('productName') > -1 && RW.SYSTEM.indexOf('platform') > -1, 'system prompt names required keys');
  let threw = false;
  try { RW.parse('bukan json sama sekali'); } catch (e) { threw = true; }
  ok(threw, 'non-JSON reply throws');
  threw = false;
  try { RW.parse('[1,2]'); } catch (e) { threw = true; }
  ok(threw, 'array reply throws');
  const fenced = RW.parse('```json\n{"productName":"Sayur Pagi","problem":"Ibu butuh sayur segar tiap pagi","platform":"Web responsif\\nAndroid"}\n```');
  ok(fenced.productName === 'Sayur Pagi', 'markdown fence stripped before parse');
  ok(Array.isArray(fenced.platform) && fenced.platform.length === 2, 'newline string coerced to platform array');
  ok(fenced.problem === 'Ibu butuh sayur segar tiap pagi', 'text field kept');
  ok(fenced.whyNow === '', 'missing text field defaults to empty string');
  ok(fenced.industry === '', 'missing enum field stays empty (default preserved)');
  ok(Array.isArray(fenced.audio) && fenced.audio.length === 0, 'missing array field defaults to []');
}

console.log('PASS ' + pass + ' / FAIL ' + fail);
process.exit(fail ? 1 : 0);
