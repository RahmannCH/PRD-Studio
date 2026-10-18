/* Service worker PRD Studio: situs jalan penuh offline setelah sekali kunjungan.
   Tanpa build step, jadi daftar CORE ditulis tangan. Kalau menambah file aset baru
   (css/js/ikon), tambahkan juga ke daftar di bawah, kalau tidak file itu belum
   bisa dimuat saat offline.
   Strategi:
   - install   : prefetch aset inti satu per satu (satu aset gagal tidak mematikan
                 seluruh install), termasuk font self-host, plus renderer Mermaid
                 sekali muat.
   - activate  : buang cache versi lama.
   - navigasi  : network-first hanya untuk origin sendiri dan hanya respons ok
                 yang masuk cache (500/404 tidak pernah disimpan).
   - aset same-origin (js/css/font): network-first agar deploy baru langsung
                 terpakai (stale-while-revalidate menyebabkan satu tampilan rusak
                 campur versi).
   - CDN lintas origin (Mermaid) : cache-first (sekali muat, selamanya offline).
   Tidak pakai skipWaiting: update berlaku di muat halaman berikutnya agar
   tidak ada campur aset versi lama dan baru di tengah sesi. */
const CACHE = 'prd-studio-v3.3';
/* D1: cache CDN TERPISAH untuk respons lintas origin. Mermaid diambil dengan
   mode no-cors → respons opaque (status 0, ok=false); tanpa cache terpisah
   respons itu tidak pernah tersimpan dan offline kehilangan renderer diagram.
   Opaque aman di sini: isinya sudah dikunci nama URL-nya, bukan konten yang
   divalidasi. Font kini self-host (CORE), tidak lewat jalur ini lagi. */
const CDN_CACHE = 'prd-cdn-v2';
const CDN_URLS = [
  'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js'
];
const CORE = [
  'index.html',
  'studio.html',
  'manifest.webmanifest',
  'css/style.css',
  'css/fonts.css',
  'css/studio.css',
  'css/print.css',
  'js/studio/theme.js',
  'js/studio/shared.js',
  'js/studio/knowledge.js',
  'js/studio/questionnaire.js',
  'js/studio/state.js',
  'js/studio/templates.js',
  'js/studio/validator.js',
  'js/studio/scorer.js',
  'js/studio/spec.js',
  'js/studio/spec-render.js',
  'js/studio/generator-prd.js',
  'js/studio/generator-roadmap.js',
  'js/studio/generator-prompt.js',
  'js/studio/diagrams.js',
  'js/studio/exporter.js',
  'js/studio/criteria.js',
  'js/studio/spec-pack.js',
  'js/studio/coach.js',
  'js/studio/render.js',
  'js/studio/palette.js',
  'js/studio/llm-adapter.js',
  'js/studio/ai-advisor.js',
  'js/studio/reverse.js',
  'js/studio/wizard.js',
  'js/studio/app.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'fonts/inter-var.woff2',
  'fonts/poppins-500.woff2',
  'fonts/poppins-600.woff2',
  'fonts/poppins-700.woff2'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      /* Per-entry: satu 404/timeout tidak membatalkan seluruh precache. */
      return Promise.all(CORE.map(function (u) { return c.add(u).catch(function () {}); }))
        .then(function () {
          /* URL root ('./') dan resource lintas origin dipisah: kalau host tidak
             melayani direktori atau CDN sedang mati, install tetap sukses. */
          return Promise.all([
            c.add('./').catch(function () {})
          ].concat(CDN_URLS.map(function (u) {
            /* D1: ambil eksplisit (mode cors) sehingga sukses → respons
               cors-ok yang boleh masuk cache; CDN menolak CORS → buang. */
            return fetch(u).then(function (r) { return putCdn(u, r); }).catch(function () {});
          })));
        });
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE && k !== CDN_CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function putSafe(cacheName, req, res) {
  /* S1/S2: hanya cache respons valid — status 200, bukan 206 partial, bukan
     opaque (respons lintas origin tanpa CORS yang tidak bisa divalidasi;
     menyimpannya membuat offline gagal diam-diam tanpa tahu isi apa).
     c.put dipanggil dari waitUntil agar worker tidak diputus di tengah tulis. */
  if (!res || res.status !== 200 || res.type === 'opaque' || res.type === 'opaqueredirect') {
    return Promise.resolve();
  }
  return caches.open(cacheName).then(function (c) { return c.put(req, res); }).catch(function () {});
}

/* D1: khusus CDN — opaque (font no-cors) BOLEH masuk ke cache CDN terpisah.
   Respons error/redirect tetap dibuang. */
function putCdn(urlOrReq, res) {
  if (!res || res.type === 'opaqueredirect') return Promise.resolve();
  var good = res.ok || res.type === 'opaque';
  if (!good) return Promise.resolve();
  var req = (urlOrReq instanceof Request) ? urlOrReq : new Request(urlOrReq);
  return caches.open(CDN_CACHE).then(function (c) { return c.put(req, res.clone()); }).catch(function () {});
}

/* D1: retry precache CDN saat koneksi kembali (dikirim app pada event online)
   — bila pada saat install CDN sedang mati, aset bisa dicoba lagi tanpa
   menunggu update service worker. */
self.addEventListener('message', function (e) {
  if (!e.data || e.data.type !== 'retry-cdn') return;
  e.waitUntil(
    Promise.all(CDN_URLS.map(function (u) {
      return fetch(u).then(function (r) { return putCdn(u, r); }).catch(function () {});
    }))
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  if (req.mode === 'navigate') {
    if (url.origin !== self.location.origin) return;
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok) {
          e.waitUntil(putSafe(CACHE, req, res.clone()));
          return res;
        }
        /* Non-ok (500/404): jangan kembalikan error — fallback ke cache. */
        return caches.match(req).then(function (hit) { return hit || res; });
      }).catch(function () {
        /* D2: URL dengan ?v=123 (deploy) harus jatuh ke entri cache tanpa
           query — tanpa ini, link ber-bookmark versi lama gagal offline. */
        return caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || caches.match('index.html'); });
      })
    );
    return;
  }

  if (url.origin === self.location.origin) {
    var isAsset = /\.(?:js|css)$/.test(url.pathname);
    if (isAsset) {
      e.respondWith(
        fetch(req).then(function (res) {
          if (res && res.ok) {
            e.waitUntil(putSafe(CACHE, req, res.clone()));
            return res;
          }
          return caches.match(req).then(function (hit) { return hit || res; });
        }).catch(function () { return caches.match(req); })
      );
      return;
    }
    e.respondWith(
      caches.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) {
          if (res && res.ok) e.waitUntil(putSafe(CACHE, req, res.clone()));
          return res;
        }).catch(function () { return hit; });
        return hit || net;
      })
    );
    return;
  }

  /* CDN lintas origin: cari di cache utama dulu (entri cors-ok), lalu cache
     CDN terpisah (opaque font). Gagal network → respons error jujur. */
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return caches.open(CDN_CACHE).then(function (c) { return c.match(req); }).then(function (hitCdn) {
        if (hitCdn) return hitCdn;
        return fetch(req).then(function (res) {
          if (res && res.ok) e.waitUntil(putSafe(CACHE, req, res.clone()));
          /* D1: opaque (font no-cors) disimpan terpisah supaya offline
             tidak kehilangan font yang sudah pernah dimuat. */
          e.waitUntil(putCdn(req, res.clone()));
          return res;
        }).catch(function () {
          return Response.error();
        });
      });
    })
  );
  return;
});
