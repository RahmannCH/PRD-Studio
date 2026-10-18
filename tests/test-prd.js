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
load('diagrams.js');
load('exporter.js');
load('criteria.js');
load('spec-pack.js');
load('coach.js');
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
  ok(L.presetFor('https://api.openai.com/v1') && L.presetFor('https://api.openai.com/v1').id === 'openai',
    'presetFor recognises OpenAI endpoint');
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
  ok(files.length === 5, 'spec pack has five files');
  ok(files[0].name === 'REQUIREMENTS-' + slug + '.md' && files[4].name === 'AGENTS-' + slug + '.md',
    'spec pack filenames follow the export naming');
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
  const ag = files[4].text;
  ok(ag.indexOf('## Sumber kebenaran') > -1 && ag.indexOf('specs/' + slug + '/tasks.md') > -1,
    'agents file points at the spec pack');
  ok(ag.indexOf('## Di luar lingkup') > -1, 'agents file lists non-goals');
  ok(ag.indexOf('- ' + sample.wontHave.split('\n')[0]) > -1, 'agents file carries the real wont list');

  // Deterministik: dua panggilan identik.
  ok(window.SpecPack.tasks(sample, res) === tasks, 'task generation is deterministic');

  // Data kosong tetap menghasilkan lima berkas yang jujur.
  const emptyFiles = window.SpecPack.files({}, null);
  ok(emptyFiles.length === 5 && emptyFiles.every(f => f.text.length > 0), 'empty data still yields five non-empty files');
  ok(emptyFiles[0].text.indexOf('Belum ada Must') > -1, 'empty requirements says what to do next');

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

console.log('PASS ' + pass + ' / FAIL ' + fail);
process.exit(fail ? 1 : 0);