/* ShareLink: bagikan isi jawaban lewat URL hash terkompresi.
   Alur: answers → JSON → deflate-raw (bila CompressionStream ada) → base64url → #s=<data>.
   Decode: base64url → inflate bila perlu → JSON → payload {answers}.
   Tanpa server; hash tidak pernah dikirim ke jaringan. Bila CompressionStream
   tidak ada (browser lama), payload tetap valid tapi lebih panjang (penanda '1').
   ES5 murni — DecompressionStream dipakai lewat window bila tersedia. */
(function () {
  var STR = window.PrdShared && window.PrdShared.stripUnsafe || function (x) { return x; };

  /* Kunci jawaban yang layak dibagikan: sama dengan ekspor .json
     (tanpa history, tanpa lastResult — PRD utuh bisa ratusan KB). */
  var SHARE_KEYS = ['productName', 'productType', 'industry', 'problem', 'whyNow',
    'primaryUser', 'platform', 'roles', 'mustHave', 'shouldHave', 'wontHave',
    'mainFlow', 'failFlow', 'navStructure', 'styleDirection', 'layoutPref',
    'visualNeeds', 'audio', 'stackPref', 'integrations', 'nfr', 'successMetrics',
    'risks', 'assumptions', 'dependencies', 'step', 'depth', 'nameEdited',
    'varRole', 'varTone', 'varTarget', 'varFormat', 'checks', 'copied', 'promptEdits', 'aiNotes'];

  function pick(answers) {
    if (!answers || typeof answers !== 'object') return {};
    var out = {};
    SHARE_KEYS.forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(answers, k)) out[k] = answers[k];
    });
    return STR(out);
  }

  /* base64url: A-Z a-z 0-9 - _ tanpa '=' — aman di hash dan query. */
  function b64urlEncode(bytes) {
    var bin = '';
    var i;
    for (i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function b64urlDecode(s) {
    var b = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) b += '=';
    var bin = atob(b);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function hasCompression() {
    return typeof window !== 'undefined' &&
      typeof window.CompressionStream === 'function' &&
      typeof window.DecompressionStream === 'function';
  }

  function uint8ToB64(u8) { return b64urlEncode(u8); }

  function b64ToUint8(s) { return b64urlDecode(s); }

  /* deflate-raw: format paling ringan; format 'gzip' juga didukung penerima
     yang hanya punya DecompressionStream (keduanya standar web). */
  function compress(bytes) {
    var cs = new window.CompressionStream('deflate-raw');
    var writer = cs.writable.getWriter();
    writer.write(bytes);
    writer.close();
    return new Response(cs.readable).arrayBuffer().then(function (ab) {
      return new Uint8Array(ab);
    });
  }

  function decompress(bytes, format) {
    var ds = new window.DecompressionStream(format);
    var writer = ds.writable.getWriter();
    writer.write(bytes);
    writer.close();
    return new Response(ds.readable).arrayBuffer().then(function (ab) {
      return new Uint8Array(ab);
    });
  }

  function encodeAsync(answers) {
    var json = JSON.stringify(pick(answers));
    var raw = new TextEncoder().encode(json);
    if (!hasCompression()) {
      return Promise.resolve('1' + uint8ToB64(raw));
    }
    return compress(raw).then(function (comp) {
      /* Tanda '2' = deflate-raw. Bila kompresi membesar (data sudah acak),
         pakai mentah saja dengan tanda '1'. */
      if (comp.length >= raw.length) return '1' + uint8ToB64(raw);
      return '2' + uint8ToB64(comp);
    });
  }

  function decodeAsync(token) {
    if (typeof token !== 'string' || !token) return Promise.resolve(null);
    var flag = token.charAt(0);
    var body = token.slice(1);
    var bytes;
    try { bytes = b64ToUint8(body); } catch (e) { return Promise.resolve(null); }
    if (flag === '1') {
      try {
        var text = new TextDecoder().decode(bytes);
        return Promise.resolve(JSON.parse(text));
      } catch (e2) { return Promise.resolve(null); }
    }
    if (flag === '2') {
      if (!hasCompression()) return Promise.resolve(null);
      return decompress(bytes, 'deflate-raw').then(function (raw) {
        try { return JSON.parse(new TextDecoder().decode(raw)); } catch (e) { return null; }
      }).catch(function () { return null; });
    }
    return Promise.resolve(null);
  }

  function toUrl(answers, base) {
    var origin = base || (typeof location !== 'undefined' ? location.origin + location.pathname : '');
    return encodeAsync(answers).then(function (token) {
      return origin + '#s=' + token;
    });
  }

  function fromHash(hash) {
    var h = typeof hash === 'string' ? hash : (typeof location !== 'undefined' ? location.hash : '');
    var m = /[#&]s=([A-Za-z0-9_-]+)/.exec(h || '');
    if (!m) return Promise.resolve(null);
    return decodeAsync(m[1]);
  }

  window.ShareLink = {
    encode: encodeAsync,
    decode: decodeAsync,
    toUrl: toUrl,
    fromHash: fromHash,
    hasCompression: hasCompression
  };
})();
