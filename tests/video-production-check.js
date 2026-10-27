/* Run with: node tests/video-production-check.js */
const fs = require('fs');
const vm = require('vm');
const context = { window: {}, console };
vm.runInNewContext(fs.readFileSync(require('path').join(__dirname, '../js/studio/video-production.js'), 'utf8'), context);
const VP = context.window.VideoProduction;
const hydrated = VP.hydrate({ videoVisualStyle: 'cartoon-stage', videoReferences: 'ref', videoClaims: 'claim', videoCta: 'go' });
if (hydrated.vVisualStyle !== 'cartoon-stage' || hydrated.vReferences !== 'ref' || hydrated.vClaimLedger !== 'claim' || hydrated.vCta !== 'go') throw new Error('hydrate failed');
const cleared = VP.directorData({ videoReferences: 'old', videoClaims: 'old', videoCta: 'old', videoVisualStyle: 'cartoon-stage' }, { vReferences: '', vClaimLedger: '', vCta: '', vVisualStyle: 'native' });
if (cleared.videoReferences !== '' || cleared.videoClaims !== '' || cleared.videoCta !== '' || cleared.videoVisualStyle !== 'native') throw new Error('clearing/reselecting form values failed');
const pack = VP.build({ videoVisualStyle: 'cartoon-stage', videoReferences: 'https://example.test | motion idea | inspected | audio not checked', videoClaims: '2s target | https://example.test | unverified | target only', videoCta: 'Learn more' }, { summary: { productName: 'Demo' } }, { visualStyle: { id: 'cartoon-stage' }, concept: { name: 'UI journey' }, beats: [{ timecode: '00:00', startSec: 0, endSec: 3, role: 'HOOK', title: 'Hook', vo: 'Test', headline: 'Test', subtext: 'Test', camera: 'pan', sfx: [{ at: 1, desc: 'hit' }], assets: { footage: ['query'] } }] });
for (const s of ['Cartoon stage', 'https://example.test', 'unverified', 'kandidat pencarian', 'belum diimplementasikan', 'offset relatif ke beat']) if (!pack.includes(s)) throw new Error('missing export detail: ' + s);
console.log('PASS video-production-check');
