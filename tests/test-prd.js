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
load('share.js');
load('knowledge.js');
load('questionnaire.js');
load('state.js');
load('templates.js');
load('validator.js');
load('scorer.js');
load('spec.js');
load('spec-render.js');
load('generator-prd.js');
load('generator-roadmap.js');
load('generator-prompt.js');
load('generator-storyboard.js');
load('diagrams.js');
load('exporter.js');
load('criteria.js');
load('spec-pack.js');
load('coach.js');
load('undo.js');
load('kanban.js');
load('cinematic.js');
load('template-browser.js');
load('chat-mode.js');
load('quality-gate.js');
load('version-control.js');
load('agent-prompt-library.js');
load('collab-review.js');
load('reverse-engineer.js');
load('prd-analytics.js');
load('code-scaffold.js');
load('dep-graph.js');
load('prd-templates.js');
load('export-hub.js');
load('prd-diff.js');
load('palette.js');
load('llm-adapter.js');
load('ai-advisor.js');

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

// 22. Manifest: sw.js CORE harus sinkron dengan <script> di studio.html
// Kelas bug ini sudah nyata terjadi: shared.js sempat tidak masuk CORE, jadi
// aplikasi jalan online tapi 500 saat offline. Tak ada tes yang menangkapnya.
{
  const appRoot = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(appRoot, 'studio.html'), 'utf8');
  const sw = fs.readFileSync(path.join(appRoot, 'sw.js'), 'utf8');

  const scripts = (html.match(/<script src="([^"]+)"><\/script>/g) || [])
    .map(s => s.match(/<script src="([^"]+)"><\/script>/)[1])
    .filter(p => p.indexOf('js/') === 0);
  ok(scripts.length > 0, 'studio.html declares module scripts (' + scripts.length + ')');

  const coreBlock = /const CORE = \[([\s\S]*?)\];/.exec(sw);
  ok(!!coreBlock, 'sw.js has a CORE list');
  const core = (coreBlock ? coreBlock[1] : '')
    .split(',')
    .map(s => (s.match(/'([^']+)'/) || [])[1])
    .filter(Boolean);

  const missing = scripts.filter(p => core.indexOf(p) < 0);
  ok(missing.length === 0, 'every studio.html module is precached in sw.js CORE',
    missing.join(','));

  const stale = core.filter(p => p.indexOf('js/') === 0 && scripts.indexOf(p) < 0);
  ok(stale.length === 0, 'sw.js CORE has no modules studio.html dropped', stale.join(','));

  // Urutan <script> harus menghormati dependensi: shared.js lebih dulu.
  ok(scripts[0] === 'js/studio/theme.js' || scripts[0] === 'js/studio/shared.js',
    'shared/theme load first (got ' + scripts[0] + ')');
  const sharedIdx = scripts.indexOf('js/studio/shared.js');
  const consumers = ['state.js', 'validator.js', 'scorer.js', 'generator-prd.js', 'diagrams.js'];
  const bad = consumers.filter(f => scripts.indexOf('js/studio/' + f) < sharedIdx);
  ok(bad.length === 0, 'shared.js loads before every consumer', bad.join(','));
}

// 23. Knowledge: satu sumber, ERD tidak boleh lepas dari model data §10
{
  const K = window.Knowledge;
  const r = K.resolve(sample);
  ok(r.entities.length >= 3, 'retail resolves entities');
  ok(r.erd.indexOf('erDiagram') === 0, 'erd derived from knowledge');

  const erdTables = (r.erd.match(/^ {2}([A-Z_]+) \|\|--/gm) || []).map(s => s.trim().split(' ')[0]);
  const mdLabels = r.entities.filter(e => e.erd !== false).map(e => K.labelToErd(e.label));
  const mdSet = new Set(mdLabels);
  const orphans = erdTables.filter(t => !mdSet.has(t));
  ok(orphans.length === 0, 'ERD has no table absent from PRD model text', orphans.join(','));
  ok(r.erd.indexOf('TRANSAKSI_ITEM') > -1, 'N-M relation renders its junction table');

  // 23b. Architectural Stack Catalog & Presets
  ok(K.stacks && K.stacks.frontend && K.stacks.backend && K.stacks.database && K.stacks.deployment, 'stack catalog has 4 pillars');
  ok(K.stacks.frontend.length >= 10, 'frontend catalog has 10+ options');
  ok(K.stacks.backend.length >= 10, 'backend catalog has 10+ options');
  ok(K.presets.length >= 5, 'starter presets has 5+ presets');
  const composed = K.composeStack('TanStack Start', 'Node.js (Hono / Fastify)', 'PostgreSQL', 'Docker');
  ok(composed === 'TanStack Start, Node.js (Hono / Fastify), PostgreSQL, Docker', 'composeStack combines 4 pillars');
  const aiFallback = K.composeStack('ai-pilih', 'ai-pilih', 'ai-pilih', 'ai-pilih');
  ok(aiFallback === 'Belum tahu, minta saran', 'composeStack defaults when all AI-pilih');

  const model = window.IndustrySpec['Retail & F&B'].model;
  ok(model.indexOf('Kasir (id, nama, pin_hash, aktif)') > -1, 'model text keeps field list');
  ok(window.IndustrySpec['SaaS internal'].model.indexOf('peran: {roles}') > -1,
    'bridge keeps {roles} placeholder for the generator to substitute');
  const saas = (score => window.GenPRD(Object.assign({}, sample, { productType: 'Aplikasi web', industry: 'SaaS internal' }), score))(80);
  ok(saas.indexOf('peran: Pemilik/Kasir/Pelanggan (terima struk via WhatsApp)') > -1,
    'generator substitutes real roles into the model text');

  // Anti-drift: risiko Marketplace harus berasal dari Knowledge, bukan literal
  // kedua di generator. Kalau salah satu disunting sendiri, tes ini gagal.
  const mkt = Object.assign({}, sample, { productType: 'Marketplace', industry: 'Marketplace & konten' });
  const prdMkt = (score => window.GenPRD(mkt, score))(80);
  const riskLine = K.riskToText(K.types['Marketplace'].risks);
  ok(prdMkt.indexOf('- ' + riskLine) > -1, 'PRD risk bullet matches Knowledge for Marketplace');

  // Risiko fitur ikut muncul karena Must menyebut offline/stok/cetak/rekap
  const offlineRisk = K.riskToText(K.features.filter(f => f.id === 'offline')[0].risks);
  ok(prdMkt.indexOf('- ' + offlineRisk) > -1, 'feature-matched risk surfaces in PRD');
  ok(prdMkt.match(/^Risiko:$/m) !== null, 'risks render as a labeled group of bullets');

  // registerIndustry: perluasan oleh user, dengan validasi bentuk
  ok(K.registerIndustry('', {}) === false, 'registerIndustry rejects empty key');
  ok(K.registerIndustry('Uji X', { entities: [] }) === false, 'registerIndustry rejects no entities');
  ok(K.registerIndustry('Uji X', { entities: [{ label: 'Foo', fields: [{ n: 'id', t: 'string' }], rels: [] }] }) === true,
    'registerIndustry accepts well-formed industry');
  const r2 = K.resolve({ productType: 'Aplikasi web', industry: 'Uji X' });
  ok(r2.known === true && r2.entities[0].label === 'Foo', 'resolve uses the registered industry');
  ok(window.IndustrySpec['Uji X'].model.indexOf('Foo') > -1, 'compat bridge regenerated after register');
}

// 24. Spec + renderer: satu spec, banyak format, kontrak 12 bagian dijaga
{
  const SR = window.SpecRender;
  const sp = window.Spec.build(sample, { score: 80, level: 'Siap' });
  const mdOut = SR.markdown(sp);
  const briefOut = SR.brief(sp);
  const yamlOut = SR.yaml(sp);
  const htmlOut = SR.html(sp);
  const jsonOut = SR.json(sp);
  const protoOut = SR.prototypeHtml(sp);

  ok(typeof SR.prototypeHtml === 'function', 'SpecRender exports prototypeHtml');
  ok(protoOut.indexOf('<!DOCTYPE html>') === 0, 'prototypeHtml produces a standalone document');
  ok(protoOut.indexOf('DesainPakeAI Prototype') > -1, 'prototypeHtml carries DesainPakeAI title');
  ok(protoOut.indexOf('Design Tokens (DesainPakeAI System)') > -1, 'prototypeHtml defines design tokens');
  ok(protoOut.indexOf('form id="mockForm"') > -1, 'prototypeHtml has interactive mock form');

  ok(JSON.parse(jsonOut).meta.productName === sample.productName, 'json round-trips the spec');
  ok((htmlOut.match(/<h2>/g) || []).length === 12, 'html renders exactly 12 sections');
  ok(htmlOut.indexOf('<!DOCTYPE html>') === 0 && /<\/html>\s*$/.test(htmlOut), 'html is a standalone document');
  ok(!/style="/.test(htmlOut), 'html has no inline style attributes');
  ok(yamlOut.indexOf('meta:') === 0 || /^meta:/m.test(yamlOut), 'yaml starts with the meta block');
  ok(yamlOut.indexOf('productName: ' + sample.productName) > -1, 'yaml carries plain scalars');

  // YAML harus mengutip nilai yang memuat titik dua (kalau tidak, parser rusak)
  const weird = window.Spec.build(Object.assign({}, sample, { problem: 'Target: 30 detik per transaksi' }));
  const wy = SR.yaml(weird);
  ok(/problem: "Target: 30 detik per transaksi"/.test(wy), 'yaml quotes scalars containing a colon');

  // Semua metrik muncul di md dan brief (satu spec, banyak renderer)
  ok(sp.metrics.every(x => mdOut.indexOf(x.text) > -1), 'every metric reaches the markdown PRD');
  ok(sp.metrics.every(x => briefOut.indexOf(x.text) > -1), 'every metric reaches the brief');

  // Modul baru: temuan fitur wajib terlihat di cerita
  ok(sp.features.some(f => f.id === 'offline'), 'offline feature detected from Must line');
  const us1 = sp.stories[0];
  ok(us1.criteria.some(c => c.indexOf('daftar antre') > -1), 'story carries feature-specific binary criteria');

  // Tidak ada ".." akibat jawaban yang sudah berakhir titik
  ok(mdOut.indexOf('..') < 0, 'no double full stop in PRD');
  ok(briefOut.indexOf('..') < 0, 'no double full stop in brief');

  // Asumsi dan pertanyaan terbuka jujur saat fitur tidak dikenali
  const vague = window.Spec.build(Object.assign({}, sample, { mustHave: 'Fitur ajaib khusus' }));
  ok(vague.assumptions.length >= 1, 'unmatched Must produces an explicit assumption');
  ok(vague.openQuestions.length >= 1, 'unmatched Must produces an open question');
}

// 25. AIAdvisor + aiNotes: parse ketat, merge idempotent, Spec menyerapnya
{
  const A = window.AIAdvisor;
  const good = '```json\n' + JSON.stringify({
    asumsi: [{ teks: '  Asumsi   A ', alasan: 'karena x' }],
    risiko: [{ sebab: 'Sebab B', mitigasi: 'Mitigasi B', terkait: 'M1' }],
    kriteria: [{ mustId: 'm1', tambah: ['Kriteria X', 'Kriteria X'] }],
    endpoint: [{ metode: 'post', path: '/x', guard: 'auth', untuk: 'M1' }, { metode: 'FLY', path: 'x' }],
    pertanyaan: [{ teks: 'Berapa lama?', untuk: 'M1' }]
  }) + '\n```';
  const d = A.parse(good);
  ok(d.asumsi[0].teks === 'Asumsi A', 'advisor collapses whitespace in text');
  ok(d.kriteria[0].mustId === 'M1', 'advisor uppercases mustId');
  ok(d.endpoint.length === 1 && d.endpoint[0].m === 'POST', 'advisor drops invalid method');
  ok(d.endpoint[0].p === '/x', 'advisor keeps valid path');
  ok(A.describe(d).total === 5, 'advisor describe counts all buckets');
  ok(A.allIds(d).length === 5, 'advisor exposes stable ids for accept-all');

  let threw = null;
  try { A.parse('halo, ini bukan json'); } catch (e) { threw = e; }
  ok(threw && threw.code === 'BAD_JSON', 'advisor rejects non-JSON with BAD_JSON');
  threw = null;
  try { A.parse('[1,2]'); } catch (e) { threw = e; }
  ok(threw && threw.code === 'BAD_SHAPE', 'advisor rejects array payloads');

  const many = { asumsi: Array.from({ length: 10 }, (_, i) => ({ teks: 'A' + i })) };
  ok(A.parse(JSON.stringify(many)).asumsi.length === 6, 'advisor caps items per bucket');

  // merge: hanya id yang diterima; item sama tidak menumpuk saat diulang
  const m1 = A.merge({}, d, ['a0', 'c0']);
  ok(m1.assumptions.length === 1 && m1.criteria.M1.length === 1, 'merge writes only accepted items');
  ok(m1.risks.length === 0 && m1.endpoints.length === 0, 'merge skips rejected items');
  const m2 = A.merge({ aiNotes: m1 }, d, ['a0', 'c0', 'e0']);
  ok(m2.assumptions.length === 1, 'merge is idempotent for the same text');
  ok(m2.criteria.M1.length === 1, 'merge dedupes repeated criteria');
  ok(m2.endpoints.length === 1, 'merge adds the newly accepted endpoint');

  // Spec menyerap aiNotes tanpa AI aktif; semuanya dari data
  const specAns = Object.assign({}, sample, { aiNotes: {
    assumptions: [{ teks: 'Asumsi dari AI', alasan: '' }],
    risks: [{ sebab: 'Risiko dari AI', mitigasi: 'Mitigasi AI', terkait: 'M1' }],
    criteria: { M1: ['Kriteria dari AI'] },
    endpoints: [{ m: 'GET', p: '/ai-endpoint', guard: 'auth', untuk: 'M1' }],
    questions: [{ teks: 'Pertanyaan dari AI?', untuk: 'M1' }]
  } });
  const sp = window.Spec.build(specAns, { score: 80, level: 'Siap' });
  ok(sp.assumptions.indexOf('Asumsi dari AI') > -1, 'spec absorbs accepted AI assumption');
  ok(sp.risks.sebab.indexOf('Risiko dari AI') > -1, 'spec absorbs accepted AI risk');
  ok(sp.stories[0].criteria.indexOf('Kriteria dari AI') > -1, 'spec absorbs accepted AI criteria');
  ok(sp.endpoints.some(x => x.p === '/ai-endpoint'), 'spec absorbs accepted AI endpoint');
  ok(sp.openQuestions.indexOf('Pertanyaan dari AI?') > -1, 'spec absorbs accepted AI question');
  ok(sp.aiApplied.criteria === 1 && sp.aiApplied.endpoints === 1 && sp.aiApplied.risks === 1,
    'spec counts accepted AI items honestly');

  // uiAnswers klaim AI ganda tidak menghasilkan duplikat di PRD
  const mdAi = window.SpecRender.markdown(sp);
  ok((mdAi.match(/Risiko dari AI/g) || []).length === 1, 'AI risk appears exactly once in the PRD');
  ok(mdAi.indexOf('Kriteria dari AI') > -1, 'AI criteria reaches the markdown');

  // llm-adapter: preset, timeout clamp, key dibuang saat endpoint pindah
  const L = window.LLM;
  ok(L.presets.some(p => p.id === 'gemini' && /googleapis/.test(p.baseUrl)), 'gemini preset present');
  ok(L.presets.some(p => p.id === 'deepseek' && /deepseek/.test(p.baseUrl)), 'deepseek preset present');
  ok(L.presets.some(p => p.id === 'kimi' && /moonshot/.test(p.baseUrl)), 'kimi preset present');
  ok(L.presets.some(p => p.id === 'groq' && /groq/.test(p.baseUrl)), 'groq preset present');
  ok(L.presets.some(p => p.id === 'minimax' && /minimax/.test(p.baseUrl)), 'minimax preset present');
  ok(L.presetFor('https://api.openai.com/v1') && L.presetFor('https://api.openai.com/v1').id === 'openai',
    'presetFor recognises OpenAI endpoint');
  ok(L.presetFor('https://api.deepseek.com/v1') && L.presetFor('https://api.deepseek.com/v1').id === 'deepseek',
    'presetFor recognises DeepSeek endpoint');
  ok(L.presetFor('https://api.moonshot.cn/v1') && L.presetFor('https://api.moonshot.cn/v1').id === 'kimi',
    'presetFor recognises Moonshot/Kimi endpoint');
  ok(L.presetFor('https://api.groq.com/openai/v1') && L.presetFor('https://api.groq.com/openai/v1').id === 'groq',
    'presetFor recognises Groq endpoint');
  ok(L.isLocalUrl('http://localhost:11434/v1') === true, 'localhost counts as local');
  ok(L.needsKey('http://localhost:11434/v1') === false, 'local endpoint needs no key');
  ok(L.needsKey('https://api.openai.com/v1') === true, 'remote endpoint needs key');
  L.setConfig({ baseUrl: 'https://a.example/v1', model: 'm', apiKey: 'sk-a', timeoutMs: 1000 });
  ok(L.getConfig().timeoutMs === 5000, 'timeout clamped to the 5s floor');
  L.setConfig({ baseUrl: 'https://a.example/v1', model: 'm', apiKey: 'sk-a', timeoutMs: 999999 });
  ok(L.getConfig().timeoutMs === 180000, 'timeout clamped to the 180s ceiling');
  L.setConfig({ baseUrl: 'https://b.example/v1', model: 'm' });
  ok(L.getConfig().hasKey === false, 'changing endpoint drops the stale key');
  L.clearKey();
  L.setConfig({ baseUrl: '', model: '' });
  let sync = false;
  let p = null;
  try { p = L.test(); } catch (e) { sync = true; }
  ok(!sync, 'LLM.test never throws synchronously (async contract)');
  ok(p && typeof p.then === 'function' && typeof p.catch === 'function',
    'LLM.test returns a promise even when unconfigured');
  if (p) p.catch(() => {});

  // Struktur UI seam AI: panel review, preset, timeout, penemuan model
  const html = fs.readFileSync(path.join(__dirname, '..', 'studio.html'), 'utf8');
  ok(html.indexOf('id="aiReview"') > -1, 'studio.html has the AI review container');
  ok(/data-act="ai-advise"/.test(html), 'studio.html has the AI advise button');
  ok(html.indexOf('id="llmPreset"') > -1 && html.indexOf('id="llmTimeout"') > -1,
    'studio.html has preset and timeout controls');
  ok(html.indexOf('id="llmModelList"') > -1 && html.indexOf('id="llmModelsBtn"') > -1,
    'studio.html has model discovery controls');
  ok(html.indexOf('id="llmKeyUrl"') > -1, 'studio.html has the key help slot');
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  ok(app.indexOf('AIAdvisor.merge') > -1 && app.indexOf('function aiAdvise') > -1,
    'app.js wires the advisor panel');
  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'studio.css'), 'utf8');
  ok(css.indexOf('.ai-card') > -1 && css.indexOf('.ai-review') > -1, 'studio.css styles the review cards');
}

// 26. F6: blank kanonik + setter progres dengan rollback
{
  const S = window.StudioState;
  const b1 = S.blank();
  const b2 = S.blank();
  ok(b1 !== b2 && b1.aiNotes !== b2.aiNotes, 'blank returns a fresh deep object each call');
  ok('risks' in b1 && 'assumptions' in b1 && 'dependencies' in b1,
    'blank carries the text fields the old hand-written copy dropped');
  ok(Array.isArray(b1.aiNotes.assumptions) && typeof b1.aiNotes.criteria === 'object',
    'blank carries the canonical aiNotes shape');
  ok(b1.lastResult === null && Array.isArray(b1.history) && b1.step === 1, 'blank starts clean');

  // setter progres: sukses, no-op aman, rollback saat simpan gagal
  const keysBefore = Object.keys(S.data.checks).length;
  ok(S.setCheck('i9.9', true) === true && S.data.checks['i9.9'] === true, 'setCheck saves');
  const realSet = global.localStorage.setItem;
  global.localStorage.setItem = () => { throw new Error('quota'); };
  ok(S.setCheck('i9.9', false) === false && S.data.checks['i9.9'] === true,
    'setCheck rolls back the value when the save fails');
  ok(S.setCopied('P9') === false && !S.data.copied['P9'],
    'setCopied rolls back on failure');
  ok(S.setPromptEdit('P9', 'x') === false && !S.data.promptEdits['P9'],
    'setPromptEdit rolls back on failure');
  ok(S.setPromptEdit('P9', 'x', true) === true && S.data.promptEdits['P9'] === 'x',
    'setPromptEdit skipSave writes without persisting');
  global.localStorage.setItem = realSet;
  delete S.data.promptEdits['P9'];
  ok(S.migrateCheck('i9.9', 'i0.0') === true && S.data.checks['i0.0'] === true && !('i9.9' in S.data.checks),
    'migrateCheck moves the value to the new key');
  delete S.data.checks['i0.0'];
  ok(S.setCheck('', true) === false && Object.keys(S.data.checks).length === keysBefore,
    'setCheck rejects empty keys');
  const src = fs.readFileSync(path.join(root, 'render.js'), 'utf8');
  ok(src.indexOf('S.setCheck(') > -1 && src.indexOf('S.setCopied(') > -1 && src.indexOf('S.setPromptEdit(') > -1,
    'render.js delegates progress writes to state setters');
  ok(!/S\.data\.checks\[[^\]]+\] =/.test(src) && !/S\.data\.copied\[[^\]]+\] =/.test(src) && src.indexOf('S.data.promptEdits[') < 0,
    'render.js no longer mutates progress state directly');
}

// 27. F3: questionnaire sebagai sumber field + kedalaman menggeser skala dengan jujur
{
  const Q = window.Questionnaire;
  ok(Array.isArray(Q.LEVELS) && Q.LEVELS.join(',') === 'cepat,standar,lengkap', 'three depth levels defined');
  ok(Q.normalize('aneh') === 'standar', 'unknown depth falls back to standar');

  // Setiap field wizard yang penting harus terdaftar (id nyata di studio.html).
  const htmlFields = [...fs.readFileSync(path.join(__dirname, '..', 'studio.html'), 'utf8')
    .matchAll(/id="([a-zA-Z]+)"/g)].map(m => m[1]);
  const known = Object.keys(Q.FIELDS);
  ok(known.length >= 20, 'questionnaire lists the wizard fields (' + known.length + ')');
  ok(known.every(id => htmlFields.indexOf(id) > -1 || id === 'platform' || id === 'audio'),
    'every questionnaire field exists in studio.html (chips map to their container)');
  ok(Q.FIELDS.platform && Q.FIELDS.audio && Q.FIELDS.platform.tier === 'inti',
    'chips fields registered with a tier');

  // Tier mempartisi semua field; tiap langkah 1-6 punya field, langkah 1-4 inti.
  const tiers = {};
  known.forEach(id => tiers[Q.FIELDS[id].tier] = (tiers[Q.FIELDS[id].tier] || 0) + 1);
  ok(tiers.inti && tiers.standar && tiers.lanjutan, 'all three tiers are in use', JSON.stringify(tiers));
  for (let s = 1; s <= 6; s++) {
    ok(known.some(id => Q.FIELDS[id].step === s), 'step ' + s + ' has at least one field');
  }
  ok(['productName', 'problem', 'whyNow', 'primaryUser', 'roles', 'mustHave', 'mainFlow', 'failFlow', 'navStructure']
    .every(id => Q.FIELDS[id].tier === 'inti'),
    'hard rules and flow fields are core (never hide in cepat)');

  // Komponen skor tidak boleh setengah terlihat: field satu komponen setier.
  const comp = [['productName', 'problem', 'whyNow'], ['primaryUser', 'roles'], ['mustHave'],
    ['mainFlow', 'failFlow', 'navStructure'], ['nfr'], ['wontHave', 'visualNeeds']];
  comp.forEach(c => {
    const ts = new Set(c.map(id => Q.FIELDS[id].tier));
    ok(ts.size === 1, 'score component shares one tier: ' + c.join('+'), [...ts].join(','));
  });

  // filterGaps membuang gap field tersembunyi, gap tanpa field tetap lolos.
  const gs = [
    { code: 'NFR', step: 6, field: 'nfr' },
    { code: 'NAMA', step: 1, field: 'productName' },
    { code: 'TABRAK', step: 3, field: 'mustHave' },
    { code: 'X', step: 3, field: '' }
  ];
  const cepatG = Q.filterGaps(gs, 'cepat');
  ok(cepatG.length === 3 && !cepatG.some(g => g.code === 'NFR'), 'cepat hides gaps of hidden fields');
  ok(Q.filterGaps(gs, 'standar').length === 4, 'standar keeps every gap');

  // Mode standar (default) WAJIB identik dengan skor tanpa opsi: 0 regresi.
  const plain = window.Scorer(sample, []);
  const standar = window.Scorer(sample, [], { hidden: Q.hiddenFields('standar') });
  ok(plain.score === standar.score, 'standar mode keeps the 0-100 scale identical (' + plain.score + ' vs ' + standar.score + ')');
  const plainNoNfr = window.Scorer(Object.assign({}, sample, { nfr: '' }), []);
  const cepatNoNfr = window.Scorer(Object.assign({}, sample, { nfr: '' }), [], { hidden: Q.hiddenFields('cepat') });
  ok(cepatNoNfr.score >= plainNoNfr.score, 'cepat does not punish hidden NFR');
  ok(cepatNoNfr.parts.some(p => p.name === 'Skala mode kedalaman'), 'depth scaling is disclosed in the rubric');
  // Semua komponen inti masih terlihat di cepat; komponen NFR hilang dari rubrik.
  ok(!cepatNoNfr.parts.some(p => p.name === 'NFR terukur'), 'cepat drops the NFR component from the rubric');
  ok(cepatNoNfr.parts.some(p => p.name === 'Must biner'), 'cepat keeps core components');

  // Nilai tersembunyi tetap terbaca generator: depth bukan penghapus data.
  const hiddenAns = Object.assign({}, sample, { depth: 'cepat' });
  ok(window.Spec.build(hiddenAns, 80).nfrs.length > 0, 'hidden fields still feed the spec (values preserved)');

  // state.js menyimpan depth dan menormalkannya.
  ok(window.StudioState.blank().depth === 'standar', 'blank carries the default depth');
  ok(['cepat', 'standar', 'lengkap'].indexOf(window.StudioState.blank().depth) > -1, 'blank depth is canonical');
}

// 28. Paket 1: Criteria EARS-lite + SpecPack lima berkas untuk AI agent
{
  const C = window.Criteria;

  // EARS-lite: pemicu eksplisit, penghubung maka, konteks cerita, idempoten.
  ok(C.toEars('ketika pembayaran gagal, tampilkan alasan') ===
    'KETIKA pembayaran gagal, SISTEM HARUS tampilkan alasan.',
    'toEars maps an explicit "ketika" clause');
  ok(C.toEars('Jika kuota habis maka blokir unggahan') ===
    'JIKA kuota habis, SISTEM HARUS blokir unggahan.',
    'toEars splits on the "maka" connector');
  ok(C.toEars('Selama sinkronisasi, tampilkan indikator') ===
    'SELAMA sinkronisasi, SISTEM HARUS tampilkan indikator.',
    'toEars maps a state trigger (selama)');
  ok(C.toEars('menampilkan konfirmasi', { role: 'kasir', action: 'mencatat transaksi' }) ===
    'KETIKA kasir mencatat transaksi, SISTEM HARUS menampilkan konfirmasi.',
    'toEars builds a default event from story context');
  ok(C.toEars('transaksi tersimpan') === 'SISTEM HARUS transaksi tersimpan.',
    'toEars without trigger or context stays honest');
  const earsOnce = C.toEars('KETIKA a, SISTEM HARUS b');
  ok(C.toEars(earsOnce) === earsOnce, 'toEars is idempotent for existing EARS sentences');

  // Kata kabur: kata utuh (kecepatan tidak dihitung), frasa user-friendly ikut.
  ok(C.vagueWords('pencarian cepat dan mudah').join(',') === 'cepat,mudah', 'vague words found in order');
  ok(C.vagueWords('kecepatan muat 2 detik').length === 0, 'kecepatan is not flagged (whole word only)');
  ok(C.vagueWords('antarmuka user friendly').indexOf('user-friendly') > -1, 'user-friendly phrase is flagged');
  const li = C.lint(['beranda memuat 2 detik', 'pencarian mudah', '']);
  ok(li.bersih.length === 1 && li.kabur.length === 1 && li.kabur[0].kata[0] === 'mudah',
    'lint splits measurable and vague items');

  // SpecPack: bentuk berkas dan isi kunci.
  const res = { score: sc, roadmap: roadmap };
  const slug = window.Exporter.slug(sample.productName);
  const files = window.SpecPack.files(sample, res);
  ok(files.length === 6, 'spec pack has six files');
  const scaffoldFiles = window.SpecPack.files(sample, res, { includeScaffold: true });
  ok(scaffoldFiles.length === 7, 'spec pack with includeScaffold yields seven files');
  ok(scaffoldFiles[6].name === 'SCAFFOLD-' + slug + '.md', 'scaffold file naming follows export convention');
  ok(scaffoldFiles[6].text.indexOf('# SCAFFOLD:') > -1, 'scaffold file contains scaffold header');
  ok(files[0].name === 'REQUIREMENTS-' + slug + '.md' && files[4].name === 'FEATURES-' + slug + '.feature' &&
    files[5].name === 'AGENTS-' + slug + '.md', 'spec pack filenames follow the export naming');
  const req = files[0].text;
  ok(req.indexOf('### Requirement 1:') > -1, 'requirements are numbered like Kiro');
  ok(req.indexOf('**User Story:** Sebagai') > -1, 'user story line present');
  ok(/^1\. (KETIKA|JIKA|SELAMA|DI MANA|SISTEM HARUS)/m.test(req), 'criteria render as EARS-lite sentences');
  ok(req.indexOf('specs/' + slug + '/requirements.md') > -1, 'requirements states where the file belongs');

  // Escape: Must berisi HTML mentah tidak boleh lolos.
  const evil = Object.assign({}, sample, { mustHave: '<img src=x onerror=alert(1)>\nAbsen foto harian' });
  const reqEvil = window.SpecPack.requirements(evil, res);
  ok(reqEvil.indexOf('<img') < 0 && reqEvil.indexOf('&lt;img') > -1, 'raw HTML in Must is escaped');
  ok(typeof window.Exporter.escMd === 'function' && window.Exporter.escMd('<b>x') === '&lt;b&gt;x',
    'escMd is exported as the canonical markdown escape');

  // Lint kata kabur muncul di requirements.
  const vagueAns = Object.assign({}, sample, { mustHave: 'Pencarian cepat dan mudah' });
  const reqVague = window.SpecPack.requirements(vagueAns, null);
  ok(reqVague.indexOf('Kata belum terukur: cepat, mudah') > -1, 'vague words surfaced per requirement');

  // tasks: kotak centang, referensi R, milestone roadmap ikut.
  const tasks = files[2].text;
  ok(tasks.indexOf('- [ ] T1.1') > -1, 'tasks use numbered checkboxes');
  ok(/R1\.1 sampai R1\.\d/.test(tasks), 'tasks reference requirement criteria range');
  ok(tasks.indexOf('## Milestone roadmap') > -1 && tasks.indexOf('### ' + roadmap[0].fase) > -1,
    'roadmap phases become milestone sections');
  ok(tasks.indexOf('## Definisi selesai') > -1, 'tasks close with an honest done list');

  // traceability: satu baris per requirement + peta nomor bagian PRD.
  const tr = files[3].text;
  ok(/^\| R1 /m.test(tr), 'traceability has one row per requirement');
  ok(tr.indexOf('§5') > -1 && tr.indexOf('| T1.1, T1.2 |') > -1, 'traceability links task ids and PRD sections');

  // AGENTS.md: pointer, non-goals, dan larangan jujur.
  const ag = files[5].text;
  ok(ag.indexOf('## Sumber kebenaran') > -1 && ag.indexOf('specs/' + slug + '/tasks.md') > -1,
    'agents file points at the spec pack');
  ok(ag.indexOf('## Di luar lingkup') > -1, 'agents file lists non-goals');
  ok(ag.indexOf('- ' + sample.wontHave.split('\n')[0]) > -1, 'agents file carries the real wont list');

  // Deterministik: dua panggilan identik.
  ok(window.SpecPack.tasks(sample, res) === tasks, 'task generation is deterministic');

  // Data kosong tetap menghasilkan enam berkas yang jujur.
  const emptyFiles = window.SpecPack.files({}, null);
  ok(emptyFiles.length === 6 && emptyFiles.every(f => f.text.length > 0), 'empty data still yields six non-empty files');
  ok(emptyFiles[0].text.indexOf('Belum ada Must') > -1, 'empty requirements says what to do next');

  // Gherkin: berkas .feature punya struktur Feature/Scenario/When/Then yang jujur.
  const feat = files[4].text;
  ok(/^# Berkas Spec Pack PRD Studio. Letakkan sebagai `specs\//m.test(feat), 'feature file states its path');
  ok(/^Feature: /m.test(feat), 'feature has a Feature line');
  ok(/^  Scenario: R1 /m.test(feat), 'feature has one scenario per requirement');
  ok(/^    When /m.test(feat) && /^    Then /m.test(feat), 'scenario has When and Then steps');
  const featN = (feat.match(/^\s+Scenario:/gm) || []).length;
  const storiesN = (sample.mustHave || '').split('\n').filter(Boolean).length;
  ok(featN === storiesN, 'one scenario per Must line', featN + ' vs ' + storiesN);
  // Data kosong: tanpa Must, tanpa kebohongan Then.
  const featEmpty = window.SpecPack.features({}, null);
  ok(featEmpty.indexOf('Feature: ') > -1 && featEmpty.indexOf('Then ') < 0 && featEmpty.indexOf('TODO') > -1,
    'empty features file has a TODO comment instead of fake Then');
  // Escaping: karakter markdown tidak di-escape di .feature, tapi newline dirapikan.
  const featEvil = window.SpecPack.features(evil, res);
  ok(featEvil.indexOf('\n    ') > -1 && featEvil.indexOf('<img') > -1, 'feature keeps literal text but step is single-line');
  ok(!/^\s{4}Then .*\n\s{4}(?!And\b)/m.test(featEvil.split('Scenario: R1 ')[1] || ''), 'Then step is single-line');

  // Jalur lolos: setiap fungsi boleh dipanggil tanpa roadmap.
  ok(window.SpecPack.traceability(sample, { score: sc }).indexOf('| R1 ') > -1,
    'traceability works without a roadmap (fase column shows -)');

  // Wiring UI: tombol + peta aksi.
  const html2 = fs.readFileSync(path.join(__dirname, '..', 'studio.html'), 'utf8');
  ok(/data-act="dl-spec-pack"/.test(html2), 'studio.html has the spec pack button');
  const app2 = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  ok(app2.indexOf("'dl-spec-pack'") > -1, 'app.js maps the spec pack act');
}

// 29. Paket 2: Coach deterministik + skor fuzzy palet
{
  const Coach = window.Coach;

  // Sampel sudah rapi: tanpa temuan kualitas.
  ok(Coach.review(sample).length === 0, 'clean sample has no quality findings');

  // Temuan muncul saat jawaban kabur.
  const messy = Object.assign({}, sample, {
    nfr: 'harus cepat dan nyaman',
    primaryUser: 'pengguna',
    successMetrics: 'lebih banyak penjualan',
    mustHave: 'Cari produk dengan cepat dan mudah'
  });
  const f = Coach.review(messy);
  ok(f.some(x => x.field === 'nfr'), 'NFR without numbers is flagged');
  ok(f.some(x => x.field === 'primaryUser'), 'generic user is flagged');
  ok(f.some(x => x.field === 'successMetrics'), 'metric without numbers is flagged');
  ok(f.some(x => x.field === 'mustHave'), 'vague Must line is flagged per line');
  ok(f.every(x => x.step >= 1 && x.step <= 7 && x.pesan), 'findings carry step and message');

  // Celah skenario: sampel menutup offline/peran/konflik/data, membiarkan empty state.
  const e = Coach.edge(sample);
  ok(e.some(x => x.kode === 'EMPTY'), 'sample still raises the empty-state question');
  ok(!e.some(x => x.kode === 'OFFLINE'), 'offline covered by failFlow is not re-asked');
  ok(!e.some(x => x.kode === 'PERAN'), 'PIN/hak mention silences the permission question');
  ok(!e.some(x => x.kode === 'KONFLIK'), 'duplicate handling in failFlow silences the conflict question');

  // Data kosong: hanya pertanyaan offline yang tersisa.
  const eEmpty = Coach.edge({});
  ok(eEmpty.length === 1 && eEmpty[0].kode === 'OFFLINE', 'empty data raises only the offline question');

  // Fuzzy palette: substring menang, awalan dapat bonus, tidak cocok = -1.
  const P = window.Palette;
  ok(P.score('Unduh Spec Pack (AI agent)', 'unduh spec') > P.score('Unduh brief (.md)', 'unduh spec'),
    'substring match outranks scattered match');
  ok(P.score('abc def', 'ab') > P.score('xx abc', 'ab'), 'prefix match gets a bonus');
  ok(P.score('abc', 'zz') === -1, 'no match returns -1');
  ok(P.score('abc', '') === 0, 'empty query scores 0');

  // Wiring UI: palet, bantuan, dan panel coach ada di studio.html.
  const html3 = fs.readFileSync(path.join(__dirname, '..', 'studio.html'), 'utf8');
  ok(html3.indexOf('id="paletteWrap"') > -1 && html3.indexOf('id="paletteInput"') > -1 &&
    html3.indexOf('id="paletteList"') > -1, 'palette markup present');
  ok(html3.indexOf('id="helpWrap"') > -1 && html3.indexOf('id="helpClose"') > -1, 'help overlay markup present');
  ok(html3.indexOf('id="coachBox"') > -1, 'coach panel present on step 7');
  const app3 = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  ok(app3.indexOf('Palette.init()') > -1, 'app.js initialises the palette');
  const wiz = fs.readFileSync(path.join(root, 'wizard.js'), 'utf8');
  ok(wiz.indexOf('paintCoach') > -1 && wiz.indexOf('window.Coach') > -1, 'wizard paints coach findings on review');
}

// 30. Paket 3: Undo/redo jawaban
{
  const U = window.Undo;
  ok(typeof U.mark === 'function' && typeof U.undo === 'function' && typeof U.redo === 'function',
    'Undo exposes mark/undo/redo');
  ok(U.canUndo() === false && U.canRedo() === false, 'stacks start empty');

  // Simulasi: mark sebelum mutasi → undo mengembalikan nilai lama.
  const S = window.StudioState;
  const d = S.data;
  U.clear();
  d.productName = 'Sebelum';
  U.mark();
  d.productName = 'Sesudah';
  // flushMark dipanggil di dalam undo(): pending → stack → pop.
  const didUndo = U.undo();
  ok(didUndo === true, 'undo returns true when a snapshot exists');
  ok(d.productName === 'Sebelum', 'undo restores the pre-mutation value');
  ok(U.canRedo() === true, 'redo becomes available after undo');
  const didRedo = U.redo();
  ok(didRedo === true, 'redo returns true');
  ok(d.productName === 'Sesudah', 'redo restores the post-mutation value');

  // Stack kosong: undo/redo jujur false.
  U.clear();
  ok(U.undo() === false && U.redo() === false, 'empty stacks return false');

  // Kapasitas: 31 mark melebihi MAX 30.
  U.clear();
  for (let i = 0; i < 31; i++) {
    d.productName = 'v' + i;
    U.mark();
    d.productName = 'v' + (i + 1);
    U.undo(); // commit mark + pop, siapkan iterasi berikutnya dengan stack bersih-ish
  }
  ok(U._stacks().undo <= 30, 'undo stack is capped at 30');

  // history/lastResult tidak ikut snapshot.
  U.clear();
  d.productName = 'Aman';
  d.history = [{ id: 'h1', name: 'x' }];
  U.mark();
  d.productName = 'Baru';
  d.history = [];
  U.undo();
  ok(d.productName === 'Aman', 'undo restores productName even with history churn');
  ok(Array.isArray(d.history) && d.history.length === 0, 'history is NOT restored by undo (out of scope)');

  // Wiring: Ctrl+Z keybinding + mark di input handler.
  const wiz2 = fs.readFileSync(path.join(root, 'wizard.js'), 'utf8');
  ok(wiz2.indexOf("e.key.toLowerCase() === 'z'") > -1, 'wizard binds Ctrl+Z for undo');
  ok(wiz2.indexOf('window.Undo.mark()') > -1, 'wizard calls Undo.mark before mutation');
  const html5 = fs.readFileSync(path.join(__dirname, '..', 'studio.html'), 'utf8');
  ok(html5.indexOf('js/studio/undo.js') > -1, 'studio.html loads undo.js');
  U.clear();
}

// 31. Paket 3: og/twitter meta + reduced-motion + og-image
{
  const idx = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  ok(idx.indexOf('property="og:image"') > -1 && idx.indexOf('og-image.png') > -1, 'index.html has og:image');
  ok(idx.indexOf('name="twitter:card"') > -1 && idx.indexOf('summary_large_image') > -1, 'index.html has twitter:card');
  ok(idx.indexOf('property="og:title"') > -1 && idx.indexOf('property="og:description"') > -1, 'index.html has og:title and og:description');
  ok(idx.indexOf('og:image:width') > -1 && idx.indexOf('og:image:height') > -1, 'og image dimensions declared');
  const st = fs.readFileSync(path.join(__dirname, '..', 'studio.html'), 'utf8');
  ok(st.indexOf('property="og:image"') > -1, 'studio.html has og:image');
  // og-image.png ada dan bukan placeholder kosong.
  const ogPath = path.join(__dirname, '..', 'og-image.png');
  ok(fs.existsSync(ogPath), 'og-image.png exists');
  const ogSize = fs.statSync(ogPath).size;
  ok(ogSize > 10000, 'og-image.png is a real image (>10KB)', ogSize);
  // reduced-motion: rule global di style.css berlaku untuk studio (star selector).
  const cssAll = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8');
  ok(cssAll.indexOf('prefers-reduced-motion: reduce') > -1 &&
    cssAll.indexOf('* { transition:none !important; animation:none !important; }') > -1,
    'style.css disables all transitions under prefers-reduced-motion');
}

// 32. Storyboard & HyperFrames Motion Engine (60 Detik Standar)
{
  const G = window.GenStoryboard;
  ok(typeof G === 'function', 'GenStoryboard is exported as a function');

  const sb = G(sample);
  ok(sb && sb.totalDuration === 60.0 && sb.fps === 30, 'storyboard runs for exactly 60.0 seconds at 30 fps');
  ok(Array.isArray(sb.beats) && sb.beats.length === 5, 'storyboard has five distinct beats (Reverse Iceberg)');

  const durSum = sb.beats.reduce((acc, b) => acc + b.durationSec, 0);
  ok(Math.abs(durSum - 60.0) < 0.001, 'sum of beat durations matches 60.0 seconds exactly');

  // Per-beat contract
  ok(sb.beats[0].role === 'HOOK_PAIN' && sb.beats[0].durationSec === 6.0, 'beat 1 is hook pain (6s)');
  ok(sb.beats[1].role === 'VALUE_CLAIM' && sb.beats[1].durationSec === 8.0, 'beat 2 is value claim (8s)');
  ok(sb.beats[2].role === 'CORE_MECHANICS' && sb.beats[2].durationSec === 24.0, 'beat 3 is core mechanics (24s)');
  ok(sb.beats[3].role === 'HARD_EVIDENCE' && sb.beats[3].durationSec === 12.0, 'beat 4 is hard evidence (12s)');
  ok(sb.beats[4].role === 'OUTRO_CTA' && sb.beats[4].durationSec === 10.0, 'beat 5 is outro CTA (10s)');

  // All beats have camera, layout, sfx cues, and autonomous asset queries
  ok(sb.beats.every(b => b.sfx && b.sfx.length >= 2), 'every beat has at least two timestamped SFX cues');
  ok(sb.beats.every(b => b.assets && (Array.isArray(b.assets) ? b.assets.length >= 1 : (b.assets.props && b.assets.props.length >= 1))), 'every beat provides autonomous search queries for AI agents');
  ok(sb.beats.every(b => b.camera && b.layout && b.headline), 'every beat defines camera motion, layout archetype, and kinetic headline');

  // Master Prompt
  ok(sb.masterPrompt.indexOf('npx hyperframes init') > -1, 'master prompt includes hyperframes init');
  ok(sb.masterPrompt.indexOf('npx hyperframes check') > -1, 'master prompt includes hyperframes check');
  ok(sb.masterPrompt.indexOf('npx hyperframes render') > -1, 'master prompt includes hyperframes render');
  ok(sb.masterPrompt.indexOf('Dilarang Slide Deck') > -1, 'master prompt enforces anti-PPT continuous camera law');

  // SpecPack integration
  const SP = window.SpecPack;
  ok(typeof SP.storyboard === 'function' && typeof SP.agentHyperframes === 'function', 'SpecPack exports storyboard and agentHyperframes');
  const sbMd = SP.storyboard(sample);
  ok(sbMd.indexOf('00:00 - 00:06') > -1 && sbMd.indexOf('HOOK_PAIN') > -1, 'SpecPack.storyboard returns markdown table with timecodes');
  const vFiles = SP.videoFiles(sample);
  ok(vFiles.length === 12 && vFiles[0].name.indexOf('STORYBOARD-') === 0 && vFiles[3].name.indexOf('MARKERS-') === 0 && vFiles[vFiles.length - 1].name === 'lint-anti-ppt.js', 'SpecPack.videoFiles returns twelve runnable video project files (incl. index.html, 5 subcomps, markers, sfx-synth, and linter)');
  const fullFiles = SP.files(sample, null, { includeVideo: true });
  ok(fullFiles.length === 18, 'SpecPack.files with includeVideo returns eighteen files (6 software + 12 video)');

  // Multi-concept & 9:16 vertical ratio adaptation
  const sb916 = G(sample, null, { concept: 'kinetic-term', ratio: '9:16' });
  ok(sb916.isVertical === true && sb916.width === 1080 && sb916.height === 1920, 'vertical 9:16 ratio sets 1080x1920 dimension');
  ok(sb916.concept.id === 'kinetic-term', 'kinetic-term concept selected');
  ok(sb.proceduralAudio.indexOf('window.SfxSynth') > -1, 'procedural audio synthesizer script generated');

  const sbRelax = G(sample, null, { tempo: 'relax' });
  ok(sbRelax.tempo.bpm === 100 && sbRelax.tempo.id === 'relax', 'relax tempo sets 100 BPM');

  ok(Object.keys(sb.concepts).length === 12, 'twelve motion concepts defined (incl. 3d-explainer, engineering-cutaway, scientific-explainer, causal-metaphor)');
  ok(sb.beats.every(b => b.motionVerb && b.gsapEasing), 'every beat defines an explicit motion verb and GSAP easing');
  ok(sb.beats.every(b => b.aiVisualPrompt && b.cameraMotionPrompt), 'every beat defines 3D visual prompt and camera motion prompt');
  ok(sb.beats.every(b => b.threeJsSnippet && b.threeJsSnippet.indexOf('THREE.') > -1), 'every beat defines a runnable Three.js procedural snippet');
  ok(typeof sb.nleMarkers === 'string' && sb.nleMarkers.indexOf('Record In') > -1, 'storyboard produces NLE timeline markers CSV');
  const sb3d = G(sample, null, { concept: '3d-explainer', ratio: '9:16' });
  ok(sb3d.concept.id === '3d-explainer' && sb3d.concept.name.indexOf('3D Spatial') > -1, '3d-explainer concept selected');
  const sbCutaway = G(sample, null, { concept: 'engineering-cutaway', ratio: '9:16' });
  ok(sbCutaway.concept.id === 'engineering-cutaway' && sbCutaway.concept.name.indexOf('Potongan Melintang') > -1, 'engineering-cutaway concept selected');
  ok(sb.proceduralAudio.indexOf('cash:') > -1 && sb.proceduralAudio.indexOf('keytype:') > -1 && sb.proceduralAudio.indexOf('scan:') > -1 && sb.proceduralAudio.indexOf('heartbeat:') > -1 && sb.proceduralAudio.indexOf('siren:') > -1 && sb.proceduralAudio.indexOf('geiger:') > -1, 'procedural audio synth implements 22 instruments');
  ok(sb.assetMatrix && Array.isArray(sb.assetMatrix.broll) && Array.isArray(sb.assetMatrix.sfx) && sb.assetMatrix.directSearchUrls, 'comprehensive multi-platform asset matrix generated');

  // AI Director: draft and polish contracts
  ok(G.ai && typeof G.ai.buildDraftRequest === 'function' && typeof G.ai.parseDraft === 'function', 'GenStoryboard.ai exposes draft builder and parser');
  const dReq = G.ai.buildDraftRequest('Ide video kasir instan hemat waktu');
  ok(dReq.length === 2 && dReq[0].content.indexOf('sutradara') > -1, 'buildDraftRequest produces system and user prompts');
  const dParsed = G.ai.parseDraft('```json\n{"vSubject":"Kasir Kilat","vVideoType":"Product Launch Promo (60s)","vMust1":"Scan barcode","vConcept":"ui-journey"}\n```');
  ok(dParsed.vSubject === 'Kasir Kilat' && dParsed.vMust1 === 'Scan barcode' && dParsed.vConcept === 'ui-journey', 'parseDraft parses JSON with fences');

  ok(typeof G.ai.buildPolishRequest === 'function' && typeof G.ai.parsePolish === 'function', 'GenStoryboard.ai exposes polish builder and parser');
  const pReq = G.ai.buildPolishRequest(sb.beats);
  ok(pReq.length === 2 && pReq[1].content.indexOf('beat-01') > -1, 'buildPolishRequest passes beat structures');
  const pParsed = G.ai.parsePolish('[{"id":"beat-01","vo":"Tiap sore nota robek.","headline":"BOROS WAKTU"}]');
  ok(pParsed.length === 1 && pParsed[0].id === 'beat-01' && pParsed[0].headline === 'BOROS WAKTU', 'parsePolish parses polished beats');

  // Markup & palette verification
  const htmlSt = fs.readFileSync(path.join(__dirname, '..', 'studio.html'), 'utf8');
  ok(htmlSt.indexOf('data-tab="video"') > -1 && htmlSt.indexOf('id="out-video"') > -1, 'studio.html has video tab and panel');
  ok(htmlSt.indexOf('id="storyboardTimeline"') > -1, 'studio.html contains storyboard timeline container');
  ok(htmlSt.indexOf('data-act="copy-video-prompt"') > -1 && htmlSt.indexOf('data-act="dl-video-pack"') > -1, 'studio.html has video prompt and video pack buttons');
  ok(htmlSt.indexOf('data-act="dl-nle-markers"') > -1, 'studio.html has dl-nle-markers button');
  ok(htmlSt.indexOf('id="modeSwitcher"') > -1 && htmlSt.indexOf('id="storyboardWorkspace"') > -1, 'studio.html contains dedicated mode switcher and storyboard workspace');
  ok(htmlSt.indexOf('id="videoDirector"') > -1 && htmlSt.indexOf('id="btnPullSoftware"') > -1, 'studio.html contains director form and pull software button');
  ok(htmlSt.indexOf('id="btnAiVideoDraft"') > -1 && htmlSt.indexOf('data-act="ai-polish-video"') > -1, 'studio.html has AI video draft and polish buttons');

  const renderSt = fs.readFileSync(path.join(root, 'render.js'), 'utf8');
  ok(renderSt.indexOf('startAudioSimulation') > -1 && renderSt.indexOf('sb-sim-btn') > -1, 'render.js implements real-time audio simulation');
  ok(renderSt.indexOf('playBgmBeat') > -1 && renderSt.indexOf('sb-live-viewport-card') > -1, 'render.js implements live viewport preview and BGM beat loop');

  const appSt = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  ok(appSt.indexOf("'copy-video-prompt'") > -1 && appSt.indexOf("'dl-video-pack'") > -1 && appSt.indexOf('RenderOut.storyboard') > -1, 'app.js wires video prompt, pack download, and storyboard rendering');
  ok(appSt.indexOf("'dl-nle-markers'") > -1, 'app.js wires dl-nle-markers export handler');
  ok(appSt.indexOf('setStudioMode') > -1 && appSt.indexOf('btnPullSoftware') > -1 && appSt.indexOf('ai-polish-video') > -1, 'app.js wires studio mode switching, director form, and AI polish');

  const palSt = fs.readFileSync(path.join(root, 'palette.js'), 'utf8');
  ok(palSt.indexOf('copy-video-prompt') > -1 && palSt.indexOf('dl-video-pack') > -1 && palSt.indexOf("['video', 'Video / Storyboard']") > -1, 'palette.js lists video commands in Ctrl+K');
  ok(palSt.indexOf('dl-nle-markers') > -1, 'palette.js lists dl-nle-markers in Ctrl+K');
  ok(palSt.indexOf('Ganti Mode: PRD Software') > -1 && palSt.indexOf('Ganti Mode: Storyboard HyperFrames') > -1, 'palette.js lists studio mode switcher commands in Ctrl+K');
  ok(palSt.indexOf('ai-polish-video') > -1, 'palette.js lists ai polish video command in Ctrl+K');

  // Empty data fallback
  const sbEmpty = G({});
  ok(sbEmpty && sbEmpty.totalDuration === 60.0 && sbEmpty.beats.length === 5, 'empty data produces honest 60s fallback storyboard');
}

// 34. Task Kanban and Checkpoint Engine (Ide 2)
{
  const KB = window.Kanban;
  ok(KB && typeof KB.deriveTasks === 'function', 'Kanban module exposes deriveTasks');
  ok(typeof KB.generateMasterPrompt === 'function', 'Kanban module exposes generateMasterPrompt');
  ok(typeof KB.generateTaskPrompt === 'function', 'Kanban module exposes generateTaskPrompt');

  const sample = window.StudioSample;
  const spec = window.Spec.build(sample, { score: 90, level: 'Siap' });
  const roadmap = window.GenRoadmap(sample);
  const tasks = KB.deriveTasks(spec, roadmap, {});

  ok(tasks.length >= 15, 'derived tasks has 15+ granular tasks');
  const phases = [...new Set(tasks.map(t => t.phase))];
  ok(phases.length >= 4, 'tasks cover all 4 phases');

  const layers = [...new Set(tasks.map(t => t.layer))];
  ok(layers.includes('frontend') && layers.includes('backend') && layers.includes('foundation'), 'tasks cover frontend, backend, foundation');

  const checkpoints = tasks.filter(t => t.isCheckpoint);
  ok(checkpoints.length >= 2, 'tasks have at least 2 hard checkpoints');
  ok(checkpoints.some(c => c.checkpointReason.indexOf('Pergantian') > -1), 'checkpoints explain phase or layer transition');

  const masterPrompt = KB.generateMasterPrompt(tasks, spec);
  ok(masterPrompt.indexOf('# MASTER PROMPT EKSEKUSI AGENT') > -1, 'master prompt has header');
  ok(masterPrompt.indexOf('HARD CHECKPOINT') > -1, 'master prompt specifies hard checkpoint rule');
  ok(masterPrompt.indexOf(tasks[0].id) > -1, 'master prompt lists tasks');

  const taskPrompt = KB.generateTaskPrompt(tasks[0], spec);
  ok(taskPrompt.indexOf('INSTRUKSI TASK CODING AGENT') > -1, 'task prompt has header');
  ok(taskPrompt.indexOf(tasks[0].id) > -1, 'task prompt contains task ID');

  // SpecPack.taskRunner & scripts/task-runner.js (Ide 3)
  ok(typeof window.SpecPack.taskRunner === 'function', 'SpecPack exposes taskRunner generator');
  const runnerScript = window.SpecPack.taskRunner();
  ok(runnerScript.indexOf('#!/usr/bin/env node') > -1, 'taskRunner has node shebang');
  ok(runnerScript.indexOf('CHECKPOINT TERDETEKSI') > -1, 'taskRunner includes checkpoint warning');

  const cliRunner = require(path.join(__dirname, '..', 'scripts', 'task-runner.js'));
  const testSampleTasks = '# Tasks\n## Fondasi\n- [ ] T0.1 Setup\n- [ ] T0.2 Mockup UI\n## Req 1\n- [ ] T1.1 API DB';
  const parsedCliTasks = cliRunner.parseTasks(testSampleTasks);
  ok(parsedCliTasks.length === 3, 'cli task runner parses 3 tasks');
  ok(parsedCliTasks[1].layer === 'frontend', 'cli task runner identifies frontend layer');
  ok(parsedCliTasks[1].isCheckpoint === true, 'cli task runner flags layer checkpoint');

  // Test state persistence
  S.setTaskState('T0.1', 'in-progress');
  ok(S.data.taskStates['T0.1'] === 'in-progress', 'setTaskState sets task state in StudioState');
  S.setTaskState('T0.1', 'done');
  ok(S.data.taskStates['T0.1'] === 'done', 'setTaskState marks task as done');
  S.clearRun();
  ok(Object.keys(S.data.taskStates).length === 0, 'clearRun clears task states');

  // Cinematic 3D Visual & Audio Design System (Ide 6)
  const C = window.Cinematic;
  ok(C && typeof C.composeScene === 'function', 'Cinematic module exposes composeScene');
  ok(typeof C.soundDesign === 'function', 'Cinematic module exposes soundDesign');
  ok(typeof C.listCatalog === 'function', 'Cinematic module exposes listCatalog');

  const sampleC = window.StudioSample;
  const specC = window.Spec.build(sampleC, { score: 90, level: 'Siap' });
  const sbC = window.GenStoryboard(sampleC, specC, { concept: 'ui-journey', ratio: '16:9', tempo: 'standard' });

  ok(sbC.beats.length === 5, 'storyboard has 5 beats');
  ok(sbC.beats.every(b => b.cinematic && b.cinematic.cameraRig && b.cinematic.depthStack), 'every beat carries cinematic scene');
  ok(sbC.beats.every(b => b.soundDesign && Array.isArray(b.soundDesign.buses)), 'every beat carries sound design');

  const scene0 = sbC.beats[0].cinematic;
  ok(scene0.aspectRatio === '16:9', 'cinematic scene carries aspect ratio');
  ok(scene0.fps === 30, 'cinematic scene fps is 30');
  ok(Array.isArray(scene0.vfx) && scene0.vfx.length >= 2, 'cinematic scene has VFX list');

  const cat = C.listCatalog();
  ok(Array.isArray(cat.cameraRigs) && cat.cameraRigs.length >= 8, 'catalog lists 8+ camera rigs');
  ok(Array.isArray(cat.transitions) && cat.transitions.length >= 8, 'catalog lists 8+ transitions');
  ok(Array.isArray(cat.colorGrades) && cat.colorGrades.length >= 6, 'catalog lists 6+ color grades');
  ok(Array.isArray(cat.audioBuses) && cat.audioBuses.length === 4, 'catalog lists 4 audio buses');

  ok(typeof C.CAMERA_RIGS['orbit-360'] === 'object', 'CAMERA_RIGS exposes orbit-360');
  ok(typeof C.COLOR_GRADES['cinematic-teal-orange'] === 'object', 'COLOR_GRADES exposes cinematic-teal-orange');

  // Verify engineering-cutaway cinematic scene mapping
  const sbEng = window.GenStoryboard(sampleC, specC, { concept: 'engineering-cutaway', ratio: '9:16', tempo: 'fast' });
  const engScene0 = sbEng.beats[0].cinematic;
  ok(engScene0.cameraRig.id === 'dutch-stress-angle', 'engineering-cutaway beat 1 uses dutch-stress-angle rig');
  ok(engScene0.depthStack.name.indexOf('Cutaway Strata') > -1, 'engineering-cutaway uses cutaway-strata depth stack');
  ok(engScene0.vfx.some(v => v.id === 'stress-vector-cone'), 'engineering-cutaway beat 1 attaches stress-vector-cone VFX');
  const engScene2 = sbEng.beats[2].cinematic;
  ok(engScene2.vfx.some(v => v.id === 'hydraulic-pumping-spray'), 'engineering-cutaway beat 3 attaches hydraulic-pumping-spray VFX');

  // Verify scientific-explainer cinematic scene mapping
  const sbSci = window.GenStoryboard(sampleC, specC, { concept: 'scientific-explainer', ratio: '9:16', tempo: 'standard' });
  const sciScene0 = sbSci.beats[0].cinematic;
  ok(sciScene0.cameraRig.id === 'scale-oscillator', 'scientific-explainer beat 1 uses scale-oscillator rig');
  ok(sciScene0.vfx.some(v => v.id === 'fresnel-planet-glow'), 'scientific-explainer beat 1 attaches fresnel-planet-glow VFX');
  const sciScene2 = sbSci.beats[2].cinematic;
  ok(sciScene2.vfx.some(v => v.id === 'magnetic-flux-field'), 'scientific-explainer beat 3 attaches magnetic-flux-field VFX');

  // Template Browser & Codebase Scaffold (Ide 7)
  const TB = window.TemplateBrowser;
  ok(TB && Array.isArray(TB.TEMPLATES) && TB.TEMPLATES.length >= 8, 'TemplateBrowser exposes 8+ templates');
  ok(typeof TB.matchTemplate === 'function', 'TemplateBrowser exposes matchTemplate');
  ok(typeof TB.scaffoldMarkdown === 'function', 'TemplateBrowser exposes scaffoldMarkdown');

  const nextTpl = TB.matchTemplate({ frontend: 'Next.js (App Router)', backend: 'Node.js (Hono / Fastify)', database: 'Neon (Serverless Postgres)', deployment: 'Vercel' });
  ok(nextTpl && nextTpl.id === 'nextjs-saas', 'matchTemplate picks nextjs-saas for Next.js stack');

  const vanillaTpl = TB.matchTemplate({ frontend: 'HTML CSS JS vanilla', backend: 'Cloudflare Workers', database: 'Cloudflare D1', deployment: 'Cloudflare Pages' });
  ok(vanillaTpl && vanillaTpl.id === 'vanilla-cf', 'matchTemplate picks vanilla-cf for vanilla stack');

  const filtered = TB.templatesByTier('lean');
  ok(Array.isArray(filtered) && filtered.length >= 2, 'templatesByTier filters lean tier');

  const byStack = TB.templatesByStack({ frontend: 'React (Vite SPA)' });
  ok(Array.isArray(byStack) && byStack.length >= 1, 'templatesByStack filters by frontend');

  const md = TB.scaffoldMarkdown(nextTpl, window.StudioSample ? window.StudioSample : {});
  ok(md.indexOf('# SCAFFOLD:') > -1, 'scaffoldMarkdown has header');
  ok(md.indexOf('## Struktur File') > -1, 'scaffoldMarkdown has file tree section');
  ok(md.indexOf('## Perintah Instalasi') > -1, 'scaffoldMarkdown has install command');
  ok(md.indexOf('## Variabel Environment') > -1, 'scaffoldMarkdown has env vars');
  ok(md.indexOf('nextjs-saas') > -1 || md.indexOf('Next.js SaaS Starter') > -1, 'scaffoldMarkdown names template');

  const tree = TB.fileTreeText(nextTpl);
  ok(typeof tree === 'string' && tree.indexOf('package.json') > -1, 'fileTreeText includes package.json');

  // AndalAI Conversational PRD Chat Mode (Ide 9)
  const CM = window.ChatMode;
  ok(CM && typeof CM.createSession === 'function', 'ChatMode exposes createSession');
  ok(typeof CM.addMessage === 'function', 'ChatMode exposes addMessage');
  ok(typeof CM.buildRequest === 'function', 'ChatMode exposes buildRequest');
  ok(typeof CM.extractFields === 'function', 'ChatMode exposes extractFields');
  ok(typeof CM.exportToAnswers === 'function', 'ChatMode exposes exportToAnswers');

  const sess = CM.createSession({ model: 'gpt-4.1-mini', baseUrl: 'https://api.openai.com/v1' });
  ok(sess && sess.id && sess.messages.length === 0, 'createSession starts empty');
  ok(sess.model === 'gpt-4.1-mini', 'createSession stores model');
  ok(sess.status === 'active', 'createSession status active');

  CM.addMessage(sess, 'user', 'Saya mau bikin kasir warung');
  CM.addMessage(sess, 'assistant', 'Baik, apa nama produknya?');
  ok(sess.messages.length === 2, 'addMessage appends messages');
  ok(sess.messages[0].role === 'user', 'first message role user');

  const req = CM.buildRequest(sess);
  ok(Array.isArray(req) && req.length === 3, 'buildRequest includes system + 2 messages');
  ok(req[0].role === 'system', 'buildRequest first is system');

  const extractedJson = CM.extractFields('Baik. ```json\n[{"field":"productName","value":"Kasir Warung"},{"field":"problem","value":"catat manual"}]\n```');
  ok(extractedJson.productName === 'Kasir Warung', 'extractFields parses JSON block productName');
  ok(extractedJson.problem === 'catat manual', 'extractFields parses JSON block problem');

  const extractedFallback = CM.extractFields('productName: Kasir Pintar\nproblem: lambat');
  ok(extractedFallback.productName === 'Kasir Pintar', 'extractFields fallback parses productName');
  ok(extractedFallback.problem === 'lambat', 'extractFields fallback parses problem');

  CM.mergeExtracted(sess, extractedJson);
  ok(sess.extracted.productName === 'Kasir Warung', 'mergeExtracted stores productName');

  const answers = CM.exportToAnswers(sess);
  ok(answers.productName === 'Kasir Warung', 'exportToAnswers maps productName');
  ok(answers.problem === 'catat manual', 'exportToAnswers maps problem');

  const sum = CM.summarizeSession(sess);
  ok(sum.messageCount === 2, 'summarizeSession counts messages');
  ok(sum.extractedCount === 2, 'summarizeSession counts extracted');

  // localStorage round-trip
  const saved = CM.saveSession(sess);
  ok(saved === true, 'saveSession returns true');
  const loaded = CM.loadSession(sess.id);
  ok(loaded && loaded.id === sess.id, 'loadSession retrieves saved session');
  const deleted = CM.deleteSession(sess.id);
  ok(deleted === true, 'deleteSession returns true');
  ok(CM.loadSession(sess.id) === null, 'deleteSession removes session');

  // Quality Gate Dashboard & PRD Health Score (Ide 10)
  const QG = window.QualityGate;
  ok(QG && typeof QG.analyze === 'function', 'QualityGate exposes analyze');
  ok(typeof QG.reportMarkdown === 'function', 'QualityGate exposes reportMarkdown');
  ok(Array.isArray(QG.DIMENSIONS) && QG.DIMENSIONS.length === 5, 'QualityGate has 5 dimensions');

  const sampleQ = window.StudioSample;
  const specQ = window.Spec.build(sampleQ, { score: 90, level: 'Siap' });
  const analysisQ = QG.analyze(specQ);
  ok(analysisQ && typeof analysisQ.healthScore === 'number', 'analyze returns healthScore');
  ok(analysisQ.healthScore >= 0 && analysisQ.healthScore <= 100, 'healthScore in range 0-100');
  ok(['A','B','C','D','F'].indexOf(analysisQ.grade) > -1, 'grade is A-F');
  ok(Array.isArray(analysisQ.dimensions) && analysisQ.dimensions.length === 5, 'analysis has 5 dimensions');
  ok(Array.isArray(analysisQ.topIssues), 'analysis has topIssues array');
  ok(typeof analysisQ.summary === 'string' && analysisQ.summary.length > 0, 'analysis has summary');

  const reportQ = QG.reportMarkdown(analysisQ);
  ok(reportQ.indexOf('# Quality Gate Report') > -1, 'reportMarkdown has header');
  ok(reportQ.indexOf('Health Score:') > -1, 'reportMarkdown has health score');
  ok(reportQ.indexOf('| Dimensi |') > -1, 'reportMarkdown has dimension table');

  // Empty spec yields low score
  const emptyAnalysis = QG.analyze({});
  ok(emptyAnalysis.healthScore < 60, 'empty spec yields low health score');

  // Grade function
  ok(QG.gradeFromScore(95) === 'A', 'gradeFromScore 95 = A');
  ok(QG.gradeFromScore(50) === 'F', 'gradeFromScore 50 = F');

  // PRD Version Control & Diff Engine (Ide 11)
  const VC = window.VersionControl;
  ok(VC && typeof VC.createSnapshot === 'function', 'VersionControl exposes createSnapshot');
  ok(typeof VC.diffSnapshots === 'function', 'VersionControl exposes diffSnapshots');
  ok(typeof VC.diffMarkdown === 'function', 'VersionControl exposes diffMarkdown');

  const v1data = { productName: 'Kasir', problem: 'manual', mustHave: 'catat' };
  const v1spec = { score: 60, stories: [{ action: 'a' }], scope: { must: [{ text: 'm1' }] }, nfr: [{ text: 'n1' }] };
  const snap1 = VC.createSnapshot(v1data, v1spec, { label: 'v1', branch: 'main' });
  ok(snap1 && snap1.id && snap1.label === 'v1', 'createSnapshot creates snapshot with label');
  ok(snap1.branch === 'main', 'createSnapshot stores branch');
  ok(snap1.score === 60, 'createSnapshot stores score');

  const v2data = { productName: 'Kasir', problem: 'otomatis', mustHave: 'catat\nlapor' };
  const v2spec = { score: 80, stories: [{ action: 'a' }, { action: 'b' }], scope: { must: [{ text: 'm1' }, { text: 'm2' }] }, nfr: [{ text: 'n1' }, { text: 'n2' }] };
  const snap2 = VC.createSnapshot(v2data, v2spec, { label: 'v2', branch: 'main', parent: snap1.id });
  ok(snap2.parent === snap1.id, 'createSnapshot stores parent');

  const diff = VC.diffSnapshots(snap1, snap2);
  ok(diff && Array.isArray(diff.changes), 'diffSnapshots returns changes array');
  ok(diff.totalChanges > 0, 'diff has changes');
  ok(diff.addedCount >= 0 && diff.changedCount >= 0, 'diff counts are non-negative');
  ok(diff.changes.some(c => c.field === 'problem' && c.type === 'changed'), 'diff detects problem change');
  ok(diff.changes.some(c => c.field === 'score' && c.type === 'changed'), 'diff detects score change');

  const diffMd = VC.diffMarkdown(diff);
  ok(diffMd.indexOf('# Diff:') > -1, 'diffMarkdown has header');
  ok(diffMd.indexOf('| Field |') > -1, 'diffMarkdown has table');

  // localStorage round-trip
  const savedVc = VC.saveVersion('proj1', snap1);
  ok(savedVc === true, 'saveVersion returns true');
  const listed = VC.listVersions('proj1');
  ok(Array.isArray(listed) && listed.length === 1, 'listVersions returns saved version');
  const got = VC.getVersion('proj1', snap1.id);
  ok(got && got.id === snap1.id, 'getVersion retrieves snapshot');
  const branches = VC.listBranches('proj1');
  ok(Array.isArray(branches) && branches.indexOf('main') > -1, 'listBranches includes main');

  const del = VC.deleteVersion('proj1', snap1.id);
  ok(del === true, 'deleteVersion returns true');
  ok(VC.getVersion('proj1', snap1.id) === null, 'deleteVersion removes version');

  const cleared = VC.clearVersions('proj1');
  ok(cleared === true, 'clearVersions returns true');
  ok(VC.listVersions('proj1').length === 0, 'clearVersions empties list');

  // Rollback
  VC.saveVersion('proj2', snap1);
  const rb = VC.rollback('proj2', snap1.id);
  ok(rb && rb.data.productName === 'Kasir', 'rollback returns data');
  ok(rb.score === 60, 'rollback returns score');

  // Branch filtering
  const snapBranch = VC.createSnapshot(v1data, v1spec, { label: 'feat', branch: 'feature-x' });
  VC.saveVersion('proj3', snapBranch);
  const featVersions = VC.versionsByBranch('proj3', 'feature-x');
  ok(featVersions.length === 1, 'versionsByBranch filters by branch');

  // AI Agent Prompt Library & Adapter (Ide 12)
  const APL = window.AgentPromptLibrary;
  ok(APL && typeof APL.generatePrompt === 'function', 'AgentPromptLibrary exposes generatePrompt');
  ok(typeof APL.listAgents === 'function', 'AgentPromptLibrary exposes listAgents');
  ok(typeof APL.matchAgent === 'function', 'AgentPromptLibrary exposes matchAgent');

  const agents = APL.listAgents();
  ok(Array.isArray(agents) && agents.length === 6, 'listAgents returns 6 agents');
  ok(agents.some(a => a.id === 'cursor'), 'cursor agent present');
  ok(agents.some(a => a.id === 'claude-code'), 'claude-code agent present');
  ok(agents.some(a => a.id === 'copilot'), 'copilot agent present');

  const sampleApl = window.StudioSample;
  const specApl = window.Spec.build(sampleApl, { score: 90, level: 'Siap' });
  const cursorPrompt = APL.generatePrompt('cursor', specApl, 'Kasir Warung');
  ok(typeof cursorPrompt === 'string' && cursorPrompt.indexOf('.cursorrules') > -1, 'cursor prompt has cursorrules header');
  ok(cursorPrompt.indexOf('Kasir Warung') > -1, 'cursor prompt includes project name');

  const claudePrompt = APL.generatePrompt('claude-code', specApl, 'Kasir Warung');
  ok(claudePrompt.indexOf('CLAUDE.md') > -1, 'claude-code prompt has CLAUDE.md header');

  const allPrompts = APL.generateAllPrompts(specApl, 'Kasir Warung');
  ok(typeof allPrompts === 'object', 'generateAllPrompts returns object');
  ok(Object.keys(allPrompts).length === 6, 'generateAllPrompts generates 6 prompts');

  ok(APL.matchAgent('cursor ide') === 'cursor', 'matchAgent recognizes cursor');
  ok(APL.matchAgent('claude code cli') === 'claude-code', 'matchAgent recognizes claude-code');
  ok(APL.matchAgent('github copilot') === 'copilot', 'matchAgent recognizes copilot');
  ok(APL.matchAgent('windsurf codeium') === 'windsurf', 'matchAgent recognizes windsurf');
  ok(APL.matchAgent('aider cli') === 'aider', 'matchAgent recognizes aider');
  ok(APL.matchAgent('devin ai') === 'devin', 'matchAgent recognizes devin');
  ok(APL.matchAgent('unknown') === null, 'matchAgent returns null for unknown');

  const comparison = APL.agentComparison();
  ok(Array.isArray(comparison) && comparison.length === 6, 'agentComparison returns 6 entries');
  ok(comparison[0].bestPractices.length > 0, 'comparison includes best practices');

  // PRD Collaboration & Review Mode (Ide 13)
  const CR = window.CollabReview;
  ok(CR && typeof CR.createReview === 'function', 'CollabReview exposes createReview');
  ok(typeof CR.addComment === 'function', 'CollabReview exposes addComment');
  ok(typeof CR.approve === 'function', 'CollabReview exposes approve');

  const review = CR.createReview({ title: 'Review PRD Kasir', prdId: 'proj1' });
  ok(review && review.id && review.status === 'draft', 'createReview starts in draft');
  ok(review.title === 'Review PRD Kasir', 'createReview stores title');

  CR.addReviewer(review, 'alice');
  CR.addReviewer(review, 'bob');
  ok(review.reviewers.length === 2, 'addReviewer adds reviewers');
  CR.removeReviewer(review, 'bob');
  ok(review.reviewers.length === 1, 'removeReviewer removes reviewer');
  CR.addReviewer(review, 'bob');

  CR.submitForReview(review);
  ok(review.status === 'review', 'submitForReview changes status to review');

  CR.addComment(review, 'summary', 'alice', 'Perjelas masalah utama');
  ok(review.comments.length === 1, 'addComment adds comment');
  ok(review.comments[0].section === 'summary', 'comment has section');
  ok(review.comments[0].author === 'alice', 'comment has author');

  // Reply
  const parentId = review.comments[0].id;
  CR.addComment(review, 'summary', 'bob', 'Setuju, perlu detail', parentId);
  ok(review.comments[0].replies.length === 1, 'reply added to parent');

  // Resolve
  CR.resolveComment(review, parentId);
  ok(review.comments[0].resolved === true, 'resolveComment marks resolved');
  const unresolved = CR.getUnresolvedComments(review);
  ok(unresolved.length === 1, 'getUnresolvedComments has unresolved reply');

  CR.unresolveComment(review, parentId);
  ok(review.comments[0].resolved === false, 'unresolveComment unmarks');

  // Approve
  CR.approve(review, 'alice');
  ok(review.approvals.length === 1, 'approve records approval');
  CR.approve(review, 'bob');
  ok(review.status === 'approved', 'auto-approve when all reviewers approved');

  // Request changes
  const review2 = CR.createReview({ title: 'Review 2' });
  CR.submitForReview(review2);
  CR.requestChanges(review2, 'alice', 'Tambah metrik');
  ok(review2.status === 'changes_requested', 'requestChanges sets status');

  // Transition
  ok(CR.canTransition(review2, 'draft') === true, 'canTransition allows valid transition');
  ok(CR.canTransition(review2, 'approved') === false, 'canTransition blocks invalid transition');
  CR.transition(review2, 'draft');
  ok(review2.status === 'draft', 'transition changes status');

  // Summary
  const reviewSum = CR.reviewSummary(review);
  ok(reviewSum.status === 'approved', 'reviewSummary status approved');
  ok(reviewSum.approvalCount === 2, 'reviewSummary approval count');
  ok(reviewSum.commentCount === 1, 'reviewSummary comment count (top-level)');
  ok(reviewSum.isFullyApproved === true, 'reviewSummary isFullyApproved');

  // Comments by section
  const bySection = CR.getCommentsBySection(review);
  ok(bySection.summary && bySection.summary.length === 1, 'getCommentsBySection groups by section');

  // localStorage round-trip
  const savedR = CR.saveReview('proj1', review);
  ok(savedR === true, 'saveReview returns true');
  const gotR = CR.getReview('proj1', review.id);
  ok(gotR && gotR.id === review.id, 'getReview retrieves review');
  const listR = CR.listReviews('proj1');
  ok(Array.isArray(listR) && listR.length === 1, 'listReviews returns saved review');
  const delR = CR.deleteReview('proj1', review.id);
  ok(delR === true, 'deleteReview returns true');
  ok(CR.getReview('proj1', review.id) === null, 'deleteReview removes review');

  // Find comment (including replies)
  const review3 = CR.createReview({ title: 'R3' });
  CR.addComment(review3, 'general', 'alice', 'Top comment');
  const cid = review3.comments[0].id;
  CR.addComment(review3, 'general', 'bob', 'Reply', cid);
  const found = CR.findComment(review3.comments, cid);
  ok(found !== null, 'findComment finds top comment');
  const replyId = review3.comments[0].replies[0].id;
  const foundReply = CR.findComment(review3.comments, replyId);
  ok(foundReply !== null, 'findComment finds nested reply');

  // Reverse Engineering Assistant (Ide 14)
  const RE = window.ReverseEngineer;
  ok(RE && typeof RE.reverseEngineer === 'function', 'ReverseEngineer exposes reverseEngineer');
  ok(typeof RE.extractEntities === 'function', 'ReverseEngineer exposes extractEntities');
  ok(typeof RE.extractFeatures === 'function', 'ReverseEngineer exposes extractFeatures');
  ok(typeof RE.toAnswers === 'function', 'ReverseEngineer exposes toAnswers');
  ok(typeof RE.reportMarkdown === 'function', 'ReverseEngineer exposes reportMarkdown');

  const reText = 'Aplikasi Kasir Warung adalah sistem pencatatan transaksi retail. Pengguna bisa mencatat transaksi offline dan sinkron saat online. Sistem mendukung cetak struk thermal 58mm. Pengguna adalah ibu pemilik warung. Target: transaksi selesai di bawah 30 detik. Risiko: printer putus di jam sibuk. Langkah: 1. Buka layar kasir, 2. Ketuk barang, 3. Terima uang, 4. Cetak struk.';
  const reResult = RE.reverseEngineer(reText);
  ok(reResult && reResult.productName, 'reverseEngineer returns productName');
  ok(reResult.entities.length >= 0, 'reverseEngineer returns entities');
  ok(reResult.features.length >= 1, 'reverseEngineer extracts features');
  ok(reResult.flows.length >= 1, 'reverseEngineer extracts flows');
  ok(reResult.nfr.length >= 0, 'reverseEngineer returns nfr');
  ok(reResult.risks.length >= 1, 'reverseEngineer extracts risks');
  ok(reResult.metrics.length >= 1, 'reverseEngineer extracts metrics');
  ok(reResult.stats.featureCount === reResult.features.length, 'stats featureCount matches');

  const reAnswers = RE.toAnswers(reResult);
  ok(typeof reAnswers === 'object', 'toAnswers returns object');
  ok(reAnswers.mustHave && reAnswers.mustHave.indexOf('mencatat') > -1, 'toAnswers maps features to mustHave');
  ok(reAnswers.mainFlow && reAnswers.mainFlow.length > 0, 'toAnswers maps flow to mainFlow');

  const reMd = RE.reportMarkdown(reResult);
  ok(reMd.indexOf('# Reverse Engineering Report') > -1, 'reportMarkdown has header');
  ok(reMd.indexOf('## Entitas Terdeteksi') > -1, 'reportMarkdown has entities section');
  ok(reMd.indexOf('## Fitur Terdeteksi') > -1, 'reportMarkdown has features section');

  // Empty text
  const reEmpty = RE.reverseEngineer('');
  ok(reEmpty.entities.length === 0, 'empty text yields no entities');
  ok(reEmpty.features.length === 0, 'empty text yields no features');

  // extractEntities standalone
  const ents = RE.extractEntities('Kasir adalah sistem pencatatan. Admin mengelola data.');
  ok(Array.isArray(ents), 'extractEntities returns array');

  // extractFeatures standalone
  const feats = RE.extractFeatures('Sistem bisa mencatat transaksi. Dapat mencetak struk.');
  ok(Array.isArray(feats) && feats.length >= 1, 'extractFeatures returns features');

  // PRD Analytics & Insights Dashboard (Ide 15)
  const PA = window.PRDAnalytics;
  ok(PA && typeof PA.analyze === 'function', 'PRDAnalytics exposes analyze');
  ok(typeof PA.reportMarkdown === 'function', 'PRDAnalytics exposes reportMarkdown');
  ok(typeof PA.completionRate === 'function', 'PRDAnalytics exposes completionRate');

  const paProjects = [
    { name: 'P1', score: 85, data: { industry: 'Retail', gaps: ['gap-a'] }, createdAt: '2026-01-01' },
    { name: 'P2', score: 45, data: { industry: 'SaaS', gaps: ['gap-a', 'gap-b'] }, createdAt: '2026-02-01' },
    { name: 'P3', score: 92, data: { industry: 'Retail', gaps: [] }, createdAt: '2026-03-01' },
    { name: 'P4', score: 0, data: { industry: 'Mobile' }, createdAt: '2026-04-01' }
  ];

  const paAnalysis = PA.analyze(paProjects);
  ok(paAnalysis && typeof paAnalysis.totalProjects === 'number', 'analyze returns totalProjects');
  ok(paAnalysis.totalProjects === 4, 'totalProjects is 4');
  ok(paAnalysis.completionRate === 50, 'completionRate is 50 (2 of 4 complete)');
  ok(paAnalysis.averageScore > 0, 'averageScore is positive');
  ok(paAnalysis.scoreDistribution && typeof paAnalysis.scoreDistribution === 'object', 'scoreDistribution is object');
  ok(paAnalysis.industryDistribution && paAnalysis.industryDistribution.Retail === 2, 'industryDistribution counts Retail');
  ok(Array.isArray(paAnalysis.topGaps) && paAnalysis.topGaps.length > 0, 'topGaps returns gaps');
  ok(paAnalysis.topGaps[0].gap === 'gap-a', 'topGaps sorted by count');
  ok(Array.isArray(paAnalysis.qualityTrend) && paAnalysis.qualityTrend.length === 4, 'qualityTrend has 4 months');
  ok(Array.isArray(paAnalysis.insights) && paAnalysis.insights.length > 0, 'insights returns array');
  ok(paAnalysis.statusBreakdown && paAnalysis.statusBreakdown.complete === 2, 'statusBreakdown complete count');

  const paReport = PA.reportMarkdown(paAnalysis);
  ok(paReport.indexOf('# PRD Analytics Report') > -1, 'reportMarkdown has header');
  ok(paReport.indexOf('Total Proyek:') > -1, 'reportMarkdown has total projects');
  ok(paReport.indexOf('Completion Rate:') > -1, 'reportMarkdown has completion rate');

  // Empty projects
  const paEmpty = PA.analyze([]);
  ok(paEmpty.totalProjects === 0, 'empty analyze returns 0 projects');
  ok(paEmpty.completionRate === 0, 'empty completion rate is 0');
  ok(Array.isArray(paEmpty.insights) && paEmpty.insights.length > 0, 'empty has insights');

  // Standalone functions
  ok(PA.completionRate(paProjects) === 50, 'completionRate standalone');
  ok(PA.averageScore(paProjects) > 0, 'averageScore standalone');
  const paDist = PA.scoreDistribution(paProjects);
  ok(typeof paDist === 'object', 'scoreDistribution standalone');
  const paInd = PA.industryDistribution(paProjects);
  ok(paInd.Retail === 2 && paInd.SaaS === 1, 'industryDistribution standalone');

  // PRD-to-Code Scaffold Generator (Ide 16)
  const CS = window.CodeScaffold;
  ok(CS && typeof CS.generateScaffold === 'function', 'CodeScaffold exposes generateScaffold');
  ok(typeof CS.scaffoldToMarkdown === 'function', 'CodeScaffold exposes scaffoldToMarkdown');

  const csSample = window.StudioSample;
  const csSpec = window.Spec.build(csSample, { score: 90, level: 'Siap' });
  const csScaffold = CS.generateScaffold(csSpec, 'Kasir Warung');
  ok(csScaffold && csScaffold.projectName === 'Kasir Warung', 'generateScaffold returns projectName');
  ok(csScaffold.fileCount >= 5, 'generateScaffold produces 5+ files');
  ok(Array.isArray(csScaffold.files), 'generateScaffold returns files array');

  const csPaths = csScaffold.files.map(function (f) { return f.path; });
  ok(csPaths.indexOf('package.json') > -1, 'scaffold includes package.json');
  ok(csPaths.indexOf('src/index.js') > -1, 'scaffold includes src/index.js');
  ok(csPaths.indexOf('README.md') > -1, 'scaffold includes README.md');
  ok(csPaths.indexOf('.gitignore') > -1, 'scaffold includes .gitignore');

  const csEntityPaths = csPaths.filter(function (p) { return p.indexOf('src/models/') === 0; });
  ok(csEntityPaths.length >= 1, 'scaffold includes entity models');

  const pkgFile = csScaffold.files.filter(function (f) { return f.path === 'package.json'; })[0];
  ok(pkgFile.content.indexOf('"name"') > -1, 'package.json has name field');
  ok(pkgFile.content.indexOf('kasir-warung') > -1, 'package.json has slug name');

  const indexFile = csScaffold.files.filter(function (f) { return f.path === 'src/index.js'; })[0];
  ok(indexFile.content.indexOf('http.createServer') > -1, 'index.js has http server');
  ok(indexFile.content.indexOf('/health') > -1, 'index.js has health endpoint');

  const readmeFile = csScaffold.files.filter(function (f) { return f.path === 'README.md'; })[0];
  ok(readmeFile.content.indexOf('# Kasir Warung') > -1, 'README has project title');

  const csMd = CS.scaffoldToMarkdown(csScaffold);
  ok(csMd.indexOf('# Code Scaffold:') > -1, 'scaffoldToMarkdown has header');
  ok(csMd.indexOf('```') > -1, 'scaffoldToMarkdown has code blocks');

  const csEmpty = CS.generateScaffold({}, 'Empty Project');
  ok(csEmpty.fileCount >= 5, 'empty spec still produces scaffold');
  ok(csEmpty.files.filter(function (f) { return f.path === 'package.json'; }).length === 1, 'empty spec has package.json');

  const pkg = CS.generatePackageJson(csSpec, 'Test App');
  ok(typeof pkg === 'string' && pkg.length > 0, 'generatePackageJson returns string');

  const model = CS.generateEntityModel({ label: 'User', fields: [{ n: 'id', t: 'string' }, { n: 'name', t: 'string' }] });
  ok(model.indexOf('function User') > -1, 'generateEntityModel creates constructor');
  ok(model.indexOf('this.id') > -1, 'generateEntityModel includes id field');

  const testFile = CS.generateTestFile(csSpec, 'Test App');
  ok(testFile.indexOf('describe') > -1, 'generateTestFile has describe block');

  // Dependency Graph & Critical Path (Ide 17)
  const DG = window.DepGraph;
  ok(DG && typeof DG.createGraph === 'function', 'DepGraph exposes createGraph');
  ok(typeof DG.analyzeGraph === 'function', 'DepGraph exposes analyzeGraph');
  ok(typeof DG.criticalPath === 'function', 'DepGraph exposes criticalPath');

  const dg = DG.createGraph();
  DG.addNode(dg, 'A', 'Task A');
  DG.addNode(dg, 'B', 'Task B');
  DG.addNode(dg, 'C', 'Task C');
  DG.addNode(dg, 'D', 'Task D');
  DG.addEdge(dg, 'A', 'B', 'blocks');
  DG.addEdge(dg, 'A', 'C', 'blocks');
  DG.addEdge(dg, 'B', 'D', 'blocks');
  DG.addEdge(dg, 'C', 'D', 'blocks');

  ok(Object.keys(dg.nodes).length === 4, 'graph has 4 nodes');
  ok(dg.edges.length === 4, 'graph has 4 edges');

  const dgSucc = DG.successors(dg, 'A');
  ok(Array.isArray(dgSucc) && dgSucc.length === 2, 'successors of A returns 2');
  const dgPred = DG.predecessors(dg, 'D');
  ok(Array.isArray(dgPred) && dgPred.length === 2, 'predecessors of D returns 2');

  const dgTopo = DG.topologicalSort(dg);
  ok(!dgTopo.hasCycle, 'no cycle in DAG');
  ok(dgTopo.sorted.length === 4, 'topological sort returns 4 nodes');
  ok(dgTopo.sorted.indexOf('A') < dgTopo.sorted.indexOf('B'), 'A before B in topo order');

  const dgAnalysis = DG.analyzeGraph(dg, { A: 2, B: 3, C: 1, D: 2 });
  ok(dgAnalysis.nodeCount === 4, 'analyzeGraph nodeCount is 4');
  ok(dgAnalysis.blocksEdges === 4, 'analyzeGraph blocksEdges is 4');
  ok(!dgAnalysis.hasCycle, 'analyzeGraph no cycle');
  ok(dgAnalysis.criticalPath && dgAnalysis.criticalPath.path.length > 0, 'critical path has nodes');
  ok(dgAnalysis.roots.length === 1, 'one root node');
  ok(dgAnalysis.leaves.length === 1, 'one leaf node');
  ok(dgAnalysis.roots[0] === 'A', 'root is A');
  ok(dgAnalysis.leaves[0] === 'D', 'leaf is D');

  // Critical path: A(2) -> B(3) -> D(2) = 7 or A(2) -> C(1) -> D(2) = 5, so critical is A-B-D = 7
  ok(dgAnalysis.criticalPath.totalDuration === 7, 'critical path total duration is 7');

  // Cycle detection
  const dgCycle = DG.createGraph();
  DG.addNode(dgCycle, 'X', 'X');
  DG.addNode(dgCycle, 'Y', 'Y');
  DG.addEdge(dgCycle, 'X', 'Y', 'blocks');
  DG.addEdge(dgCycle, 'Y', 'X', 'blocks');
  const dgCycleTopo = DG.topologicalSort(dgCycle);
  ok(dgCycleTopo.hasCycle === true, 'cycle detected');

  // removeNode
  const dg2 = DG.createGraph();
  DG.addNode(dg2, 'P', 'P');
  DG.addNode(dg2, 'Q', 'Q');
  DG.addEdge(dg2, 'P', 'Q', 'blocks');
  DG.removeNode(dg2, 'P');
  ok(!dg2.nodes['P'], 'removeNode removes node');
  ok(dg2.edges.length === 0, 'removeNode removes edges');

  // reportMarkdown
  const dgReport = DG.reportMarkdown(dgAnalysis);
  ok(dgReport.indexOf('# Dependency Graph') > -1, 'reportMarkdown has header');
  ok(dgReport.indexOf('Critical Path') > -1, 'reportMarkdown has critical path section');

  // addEdge auto-creates nodes
  const dg3 = DG.createGraph();
  DG.addEdge(dg3, 'M', 'N', 'blocks');
  ok(dg3.nodes['M'] && dg3.nodes['N'], 'addEdge auto-creates nodes');

  // Empty graph
  const dgEmpty = DG.createGraph();
  const dgEmptyAnalysis = DG.analyzeGraph(dgEmpty, {});
  ok(dgEmptyAnalysis.nodeCount === 0, 'empty graph has 0 nodes');
  ok(dgEmptyAnalysis.criticalPath.totalDuration === 0, 'empty critical path is 0');

  // PRD Template Library (Ide 18)
  const PT = window.PRDTemplateLibrary;
  ok(PT && typeof PT.listTemplates === 'function', 'PRDTemplateLibrary exposes listTemplates');
  ok(typeof PT.getTemplate === 'function', 'PRDTemplateLibrary exposes getTemplate');
  ok(typeof PT.applyTemplate === 'function', 'PRDTemplateLibrary exposes applyTemplate');
  ok(typeof PT.templateSpec === 'function', 'PRDTemplateLibrary exposes templateSpec');

  const ptList = PT.listTemplates();
  ok(Array.isArray(ptList) && ptList.length >= 5, 'listTemplates returns 5+ templates');

  const ptIds = ptList.map(function (t) { return t.id; });
  ok(ptIds.indexOf('saas-b2b') > -1, 'saas-b2b template present');
  ok(ptIds.indexOf('ecommerce') > -1, 'ecommerce template present');
  ok(ptIds.indexOf('mobile-app') > -1, 'mobile-app template present');

  const ptTmpl = PT.getTemplate('saas-b2b');
  ok(ptTmpl && ptTmpl.id === 'saas-b2b', 'getTemplate returns template');
  ok(ptTmpl.answers && ptTmpl.answers.productName, 'template has answers');
  ok(Array.isArray(ptTmpl.entities) && ptTmpl.entities.length > 0, 'template has entities');
  ok(Array.isArray(ptTmpl.endpoints) && ptTmpl.endpoints.length > 0, 'template has endpoints');

  const ptNull = PT.getTemplate('nonexistent');
  ok(ptNull === null, 'getTemplate returns null for unknown');

  const ptIndustries = PT.industries();
  ok(Array.isArray(ptIndustries) && ptIndustries.length > 0, 'industries returns array');

  const ptByInd = PT.templatesByIndustry('SaaS');
  ok(Array.isArray(ptByInd) && ptByInd.length >= 1, 'templatesByIndustry filters by industry');

  // applyTemplate merges defaults
  const ptAnswers = PT.applyTemplate('ecommerce', {});
  ok(ptAnswers.productName === 'Toko Online', 'applyTemplate sets productName');
  ok(ptAnswers.mustHave && ptAnswers.mustHave.length > 0, 'applyTemplate sets mustHave');

  // applyTemplate respects user overrides
  const ptAnswers2 = PT.applyTemplate('ecommerce', { productName: 'My Store' });
  ok(ptAnswers2.productName === 'My Store', 'applyTemplate respects user override');

  // templateSpec
  const ptSpec = PT.templateSpec('mobile-app');
  ok(ptSpec && ptSpec.meta && ptSpec.meta.productName, 'templateSpec returns spec with meta');
  ok(Array.isArray(ptSpec.entities), 'templateSpec has entities');
  ok(Array.isArray(ptSpec.endpoints), 'templateSpec has endpoints');
  ok(ptSpec.templateId === 'mobile-app', 'templateSpec has templateId');

  const ptSpecNull = PT.templateSpec('nonexistent');
  ok(ptSpecNull === null, 'templateSpec returns null for unknown');

  // All templates have required fields
  PT.listTemplates().forEach(function (t) {
    var full = PT.getTemplate(t.id);
    ok(full.answers && full.answers.productName, t.id + ' has productName');
    ok(Array.isArray(full.entities), t.id + ' has entities array');
    ok(Array.isArray(full.endpoints), t.id + ' has endpoints array');
  });

  // Multi-Format Export Hub (Ide 19)
  const EH = window.ExportHub;
  ok(EH && typeof EH.exportTo === 'function', 'ExportHub exposes exportTo');
  ok(typeof EH.exportAll === 'function', 'ExportHub exposes exportAll');
  ok(typeof EH.supportedFormats === 'function', 'ExportHub exposes supportedFormats');

  const ehSpec = window.Spec.build(window.StudioSample, { score: 90, level: 'Siap' });
  const ehFormats = EH.supportedFormats();
  ok(Array.isArray(ehFormats) && ehFormats.length === 6, 'supportedFormats returns 6 formats');

  // notion
  const ehNotion = EH.exportTo(ehSpec, 'notion');
  ok(ehNotion && ehNotion.format === 'notion', 'exportTo notion returns format');
  ok(ehNotion.type === 'markdown', 'notion type is markdown');
  ok(typeof ehNotion.content === 'string' && ehNotion.content.length > 0, 'notion content is string');

  // confluence
  const ehConf = EH.exportTo(ehSpec, 'confluence');
  ok(ehConf.format === 'confluence', 'exportTo confluence returns format');
  ok(ehConf.content.indexOf('h1.') > -1, 'confluence uses h1. heading');

  // linear
  const ehLinear = EH.exportTo(ehSpec, 'linear');
  ok(ehLinear.format === 'linear', 'exportTo linear returns format');
  ok(ehLinear.type === 'issues', 'linear type is issues');
  ok(Array.isArray(ehLinear.content) && ehLinear.content.length > 0, 'linear content is issues array');
  ok(ehLinear.content[0].title && ehLinear.content[0].labels, 'linear issue has title and labels');

  // jira
  const ehJira = EH.exportTo(ehSpec, 'jira');
  ok(ehJira.format === 'jira', 'exportTo jira returns format');
  ok(Array.isArray(ehJira.content) && ehJira.content.length > 0, 'jira content is issues array');
  ok(ehJira.content[0].summary && ehJira.content[0].issuetype, 'jira issue has summary and issuetype');

  // github
  const ehGh = EH.exportTo(ehSpec, 'github');
  ok(ehGh.format === 'github', 'exportTo github returns format');
  ok(Array.isArray(ehGh.content) && ehGh.content.length > 0, 'github content is issues array');
  ok(ehGh.content[0].title && ehGh.content[0].body, 'github issue has title and body');

  // gdocs
  const ehGdocs = EH.exportTo(ehSpec, 'gdocs');
  ok(ehGdocs.format === 'gdocs', 'exportTo gdocs returns format');

  // unknown format
  const ehUnknown = EH.exportTo(ehSpec, 'unknown-format');
  ok(ehUnknown.error, 'unknown format returns error');

  // exportAll
  const ehAll = EH.exportAll(ehSpec);
  ok(typeof ehAll === 'object', 'exportAll returns object');
  ok(ehAll.notion && ehAll.linear && ehAll.jira, 'exportAll has all formats');

  // toNotion standalone
  const ehN = EH.toNotion(ehSpec);
  ok(typeof ehN === 'string' && ehN.length > 0, 'toNotion returns string');

  // toConfluence standalone
  const ehC = EH.toConfluence(ehSpec);
  ok(typeof ehC === 'string' && ehC.indexOf('h1.') > -1, 'toConfluence returns wiki format');

  // toLinear standalone
  const ehL = EH.toLinear(ehSpec);
  ok(Array.isArray(ehL) && ehL.length > 0, 'toLinear returns issues array');

  // Empty spec
  const ehEmpty = EH.exportTo({}, 'notion');
  ok(ehEmpty.content.length > 0, 'empty spec still produces content');

  // PRD Diff & Merge (Ide 20)
  const PD = window.PRDDiff;
  ok(PD && typeof PD.diffSpecs === 'function', 'PRDDiff exposes diffSpecs');
  ok(typeof PD.mergeSpecs === 'function', 'PRDDiff exposes mergeSpecs');
  ok(typeof PD.diffMarkdown === 'function', 'PRDDiff exposes diffMarkdown');

  const pdSpecA = { meta: { productName: 'App A' }, answers: { mustHave: 'login' }, entities: [{ label: 'User', fields: [{ n: 'id', t: 'string' }] }], endpoints: [{ m: 'GET', p: '/users' }] };
  const pdSpecB = { meta: { productName: 'App B' }, answers: { mustHave: 'login, signup' }, entities: [{ label: 'User', fields: [{ n: 'id', t: 'string' }] }, { label: 'Post', fields: [{ n: 'title', t: 'string' }] }], endpoints: [{ m: 'GET', p: '/users' }, { m: 'POST', p: '/posts' }] };

  const pdDiff = PD.diffSpecs(pdSpecA, pdSpecB);
  ok(pdDiff && typeof pdDiff.totalChanges === 'number', 'diffSpecs returns totalChanges');
  ok(pdDiff.hasChanges === true, 'diffSpecs detects changes');
  ok(pdDiff.added.length > 0, 'diffSpecs detects added items');
  ok(pdDiff.changed.length > 0, 'diffSpecs detects changed items');
  ok(Array.isArray(pdDiff.unchanged), 'diffSpecs returns unchanged array');

  // Identical specs
  const pdDiffSame = PD.diffSpecs(pdSpecA, pdSpecA);
  ok(pdDiffSame.hasChanges === false, 'identical specs have no changes');
  ok(pdDiffSame.totalChanges === 0, 'identical specs totalChanges is 0');

  // flattenSpec
  const pdFlat = PD.flattenSpec(pdSpecA);
  ok(typeof pdFlat === 'object', 'flattenSpec returns object');
  ok(pdFlat['meta.productName'] === 'App A', 'flattenSpec includes meta.productName');

  // mergeSpecs union
  const pdMerged = PD.mergeSpecs(pdSpecA, pdSpecB, 'union');
  ok(pdMerged.meta.productName === 'App B', 'merged meta overridden by B');
  ok(pdMerged.entities.length === 2, 'merged entities union (2)');
  ok(pdMerged.endpoints.length === 2, 'merged endpoints union (2)');

  // mergeSpecs theirs
  const pdTheirs = PD.mergeSpecs(pdSpecA, pdSpecB, 'theirs');
  ok(pdTheirs.meta.productName === 'App B', 'theirs returns B');

  // mergeSpecs ours
  const pdOurs = PD.mergeSpecs(pdSpecA, pdSpecB, 'ours');
  ok(pdOurs.meta.productName === 'App A', 'ours returns A');

  // diffMarkdown
  const pdMd = PD.diffMarkdown(pdDiff);
  ok(pdMd.indexOf('# PRD Diff Report') > -1, 'diffMarkdown has header');
  ok(pdMd.indexOf('Total changes:') > -1, 'diffMarkdown has total changes');

  // summary
  const pdSummary = PD.summary(pdDiff);
  ok(typeof pdSummary.added === 'number', 'summary returns added count');
  ok(typeof pdSummary.total === 'number', 'summary returns total');

  // Empty specs
  const pdEmpty = PD.diffSpecs({}, {});
  ok(pdEmpty.hasChanges === false, 'empty specs have no changes');
  const pdEmptyMerge = PD.mergeSpecs({}, {}, 'union');
  ok(typeof pdEmptyMerge === 'object', 'merge empty specs works');
}

/* 33. ShareLink: encode/decode async, fallback tanpa kompresi, hash parsing.
   Blok async terakhir — laporan PASS/FAIL dicetak setelah promise selesai. */
(function shareLinkTests() {
  var SL = window.ShareLink;
  var done = function () {
    console.log('PASS ' + pass + ' / FAIL ' + fail);
    process.exit(fail ? 1 : 0);
  };
  if (!SL) {
    console.error('FAIL: ShareLink module missing');
    console.log('PASS ' + pass + ' / FAIL ' + (fail + 1));
    process.exit(1);
  }
  ok(typeof SL.encode === 'function' && typeof SL.decode === 'function' &&
    typeof SL.toUrl === 'function' && typeof SL.fromHash === 'function',
    'ShareLink exposes encode/decode/toUrl/fromHash');

  var answers = { productName: 'Warung Pintar', problem: 'Kasir manual', mustHave: 'catat jual', depth: 'lengkap', history: [{ secret: true }], lastResult: { prd: 'RAHASIA' } };
  SL.encode(answers).then(function (token) {
    ok(typeof token === 'string' && token.length > 0, 'encode returns a non-empty token');
    ok(/^[12][A-Za-z0-9_-]*$/.test(token), 'token is base64url with version flag');
    return SL.decode(token);
  }).then(function (decoded) {
    ok(decoded && decoded.productName === 'Warung Pintar', 'round-trip preserves productName');
    ok(decoded.mustHave === 'catat jual', 'round-trip preserves mustHave');
    ok(decoded.history === undefined && decoded.lastResult === undefined,
      'history and lastResult are excluded from share payload');
    return SL.toUrl(answers, 'https://example.test/studio.html');
  }).then(function (url) {
    ok(/^https:\/\/example\.test\/studio\.html#s=[12][A-Za-z0-9_-]*$/.test(url), 'toUrl produces a full URL with hash');
    var m = /#s=([A-Za-z0-9_-]+)/.exec(url);
    ok(!!m, 'URL contains an s= token');
    return SL.fromHash(url.replace(/^https:\/\/example\.test\/studio\.html/, ''));
  }).then(function (fromHash) {
    ok(fromHash && fromHash.productName === 'Warung Pintar', 'fromHash decodes the token from a hash string');
    return SL.fromHash('#other=1');
  }).then(function (noHash) {
    ok(noHash === null, 'fromHash returns null when no s= token is present');
    return SL.decode('xINVALID!');
  }).then(function (bad) {
    ok(bad === null, 'decode returns null for garbage input');
    return SL.encode({});
  }).then(function (emptyTok) {
    return SL.decode(emptyTok);
  }).then(function (emptyDec) {
    ok(emptyDec && typeof emptyDec === 'object' && !Object.keys(emptyDec).length,
      'empty answers round-trip to an empty object');
    var html4 = fs.readFileSync(path.join(__dirname, '..', 'studio.html'), 'utf8');
    ok(html4.indexOf('data-act="share-link"') > -1, 'studio.html has the share-link button');
    var app4 = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    ok(app4.indexOf("'share-link'") > -1 && app4.indexOf('ShareLink.fromHash') > -1,
      'app.js maps the share act and handles hash import on load');
    var pal = fs.readFileSync(path.join(root, 'palette.js'), 'utf8');
    ok(pal.indexOf('share-link') > -1, 'palette lists the share command');
  }).catch(function (e) {
    ok(false, 'share link async test threw: ' + (e && e.message ? e.message : e));
  }).then(done);
})();