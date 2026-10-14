/* Wizard 7 langkah: navigasi, validasi, chips, autosave jujur, meter skor + rubrik,
   gap live (dengan status kosong), review. Akses: window.Wizard */
(function () {
  var S = window.StudioState;
  var FIELDS = ['productName','productType','industry','problem','whyNow','primaryUser','roles',
    'mustHave','shouldHave','wontHave','mainFlow','failFlow','navStructure',
    'styleDirection','layoutPref','visualNeeds','stackPref','integrations','nfr','successMetrics'];
  function $(id) { return document.getElementById(id); }
  function val(id) { var el = $(id); return el ? el.value : ''; }
  function set(id, v) { var el = $(id); if (el) el.value = v == null ? '' : v; }
  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function reduced() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  var textTimer = null;
  function paintText(r) {
    var score = $('readyScore'), tip = $('readyTip');
    if (score) {
      var msg = 'Skor ' + r.sc.score + ' (' + r.sc.level + ')';
      /* U19: jangan tulis ulang textContent kalau tidak berubah agar
         aria-live tidak mengumumkan skor yang sama berulang-ulang. */
      if (score.textContent !== msg) score.textContent = msg;
    }
    if (tip) tip.textContent = r.gaps.length ? 'Perbaikan berikutnya: ' + r.gaps[0].msg : 'Semua terisi. Lanjut ke langkah 7 dan susun.';
    paintRubric(r.sc);
    paintLive(r);
    if (S.data.step === 7) paintReview(r);
  }
  function paintRubric(sc) {
    var ul = $('rubric');
    if (!ul) return;
    ul.innerHTML = '';
    (sc.parts || []).forEach(function (p) {
      var li = document.createElement('li');
      var got = p.pts.split('/')[0];
      var max = p.pts.split('/')[1];
      var bad = p.pts.charAt(0) === '-' || (max && Number(got) < Number(max) * 0.6);
      li.innerHTML = '<span>' + escHtml(p.name) + '</span><b class="' + (bad ? 'bad' : 'good') + '">' + escHtml(p.pts) + '</b>';
      ul.appendChild(li);
    });
  }

  function hydrate() {
    FIELDS.forEach(function (f) {
      var el = $(f);
      if (!el) return;
      if (el.tagName === 'SELECT') {
        /* L5: value tersimpan yang tidak ada di <option> saat ini jangan
           dipaksa jadi '' (akan ter-catat balik oleh collect berikutnya).
           Tambahkan opsi sementara supaya pilihan lama tetap terlihat. */
        var v = S.data[f] == null ? '' : String(S.data[f]);
        var has = false;
        for (var i = 0; i < el.options.length; i++) {
          if (el.options[i].value === v) { has = true; break; }
        }
        if (!has && v) {
          var opt = document.createElement('option');
          opt.value = v;
          opt.textContent = v;
          el.appendChild(opt);
        }
        el.value = v;
      } else {
        el.value = S.data[f] == null ? '' : S.data[f];
      }
    });
    syncChips('platformChips', S.data.platform);
    syncChips('audioChips', S.data.audio);
    /* R19: var* ikut di-hydrate agar DOM dan state tidak beda setelah reset/sample. */
    ['varRole', 'varTone', 'varTarget', 'varFormat'].forEach(function (id) {
      var el = $(id);
      if (el) el.value = S.data[id] == null ? '' : S.data[id];
    });
    showStep(S.data.step || 1, true, true);
    refresh(true);
  }
  /* collectData: perbarui state dari DOM tanpa menulis storage.
     collect: collectData + save segera (dipakai validasi/navigasi).
     Ketikan memakai collectData + saveSoon agar stringify store tidak
     berjalan tiap keypress. */
  function collectData() {
    var prevName = S.data.productName;
    FIELDS.forEach(function (f) { S.data[f] = val(f); });
    S.data.platform = readChips('platformChips');
    S.data.audio = readChips('audioChips');
    /* Nama proyek mengikuti nama produk HANYA bila belum diganti manual
       (renameActive dengan manual=true menandai nameEdited). skipSave=true
       agar tiap ketikan tidak memicu save sinkron (biar saveSoon yang jalan). */
    if (!S.data.nameEdited && S.data.productName.trim() && S.data.productName !== prevName)
      S.renameActive(S.data.productName.trim(), false, true);
  }
  function collect(silent) {
    collectData();
    var ok = S.save();
    if (!silent) stamp(ok);
    return ok;
  }
  function stamp(ok) {
    var n = $('autosaveNote');
    if (!n) return;
    if (ok === false) {
      n.textContent = 'Gagal menyimpan (mode privat penuh?). Jawaban hilang kalau tab ditutup.';
      n.className = 'autosave warn';
      return;
    }
    n.className = 'autosave';
    var t = new Date();
    var p = function (x) { return (x < 10 ? '0' : '') + x; };
    var msg = 'Tersimpan otomatis ' + p(t.getHours()) + ':' + p(t.getMinutes()) + ':' + p(t.getSeconds()) + '.';
    if (n.textContent !== msg) n.textContent = msg;
  }
  function readChips(id) {
    var out = [];
    document.querySelectorAll('#' + id + ' .chip').forEach(function (c) {
      if (c.getAttribute('aria-pressed') === 'true') out.push(c.getAttribute('data-val'));
    });
    if (out.length) return out;
    /* Fallback: paksa chip pertama aktif di DOM supaya layar dan data tidak beda. */
    var first = document.querySelector('#' + id + ' .chip');
    if (first) first.setAttribute('aria-pressed', 'true');
    return first ? [first.getAttribute('data-val')] : [];
  }
  function syncChips(id, vals) {
    document.querySelectorAll('#' + id + ' .chip').forEach(function (c) {
      c.setAttribute('aria-pressed', vals.indexOf(c.getAttribute('data-val')) > -1 ? 'true' : 'false');
    });
  }
  function analyze() {
    var gaps = window.Validator(S.data);
    var sc = window.Scorer(S.data, gaps);
    return { gaps: gaps, sc: sc };
  }
  function refresh(immediate) {
    var r = analyze();
    var fill = $('readyFill');
    if (fill) fill.style.width = r.sc.score + '%';
    clearTimeout(textTimer);
    if (immediate) {
      paintText(r);
      paintGapList($('liveGaps'), $('liveClear'), r.gaps, 3);
      if (S.data.step === 7) paintGapList($('reviewGaps'), $('reviewClear'), r.gaps, 99);
    } else {
      /* Teks + gap list + aria-live di-debounce 600ms agar pembaca layar tidak spam tiap ketikan. */
      textTimer = setTimeout(function () {
        var r2 = analyze();
        paintText(r2);
        paintGapList($('liveGaps'), $('liveClear'), r2.gaps, 3);
        if (S.data.step === 7) paintGapList($('reviewGaps'), $('reviewClear'), r2.gaps, 99);
      }, 600);
    }
  }
  function paintGapList(listEl, clearEl, gaps, limit) {
    if (!listEl) return;
    listEl.innerHTML = '';
    gaps.slice(0, limit).forEach(function (g) {
      var li = document.createElement('li');
      li.textContent = 'Langkah ' + g.step + ': ' + g.msg;
      listEl.appendChild(li);
    });
    if (clearEl) clearEl.classList.toggle('show', gaps.length === 0);
  }
  function showStep(n, silent, skipSave) {
    n = Math.round(Number(n));
    if (!isFinite(n) || n < 1) n = 1;
    n = Math.min(7, n);
    S.data.step = n;
    if (!skipSave) S.save();
    document.querySelectorAll('.step').forEach(function (s) {
      s.hidden = Number(s.getAttribute('data-step')) !== n;
    });
    var bars = document.querySelectorAll('#progress i');
    bars.forEach(function (b, i) {
      b.className = i + 1 < n ? 'done' : (i + 1 === n ? 'now' : '');
    });
    var meta = $('stepMeta');
    if (meta) meta.textContent = 'Langkah ' + n + ' dari 7';
    var back = $('backBtn'); if (back) back.disabled = n === 1;
    var next = $('nextBtn'); if (next) next.textContent = n === 7 ? 'Ke hasil' : 'Lanjut';
    refresh(true);
    if (!silent) {
      var h = document.querySelector('.step[data-step="' + n + '"] h2');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
      window.UX.scrollTo(document.getElementById('wizard'));
    }
  }
  function err(msg, fieldIds) {
    var e = $('formErr');
    /* Tandai field yang gagal SEBELUM banner tampil: border danger +
       aria-invalid menunjukkan kontrol mana yang perlu diperbaiki. */
    document.querySelectorAll('.field.err').forEach(function (f) {
      f.classList.remove('err');
      var c = f.querySelector('input, textarea, select');
      if (c) c.removeAttribute('aria-invalid');
    });
    (fieldIds || []).forEach(function (id) {
      var c = $(id);
      if (!c) return;
      var f = c.closest('.field');
      if (f) f.classList.add('err');
      c.setAttribute('aria-invalid', 'true');
    });
    if (!msg) { e.className = 'err'; e.textContent = ''; return false; }
    /* Tampilkan dulu (role=alert tidak diumumkan saat elemen masih display:none),
       baru tulis teksnya. */
    e.className = 'err show';
    e.textContent = msg;
    return true;
  }
  function validate(n) {
    collect();
    if (n === 1 && (!S.data.productName.trim() || S.data.productName.trim().length < 3 || !S.data.problem.trim() || S.data.problem.trim().length < 20))
      return err('Isi nama produk (min 3 huruf) dan masalah utama (min 20 huruf). Dua ini mengunci seluruh PRD.', ['productName', 'problem']);
    if (n === 2 && !S.data.primaryUser.trim())
      return err('Tulis siapa pengguna utamanya dalam satu kalimat.', ['primaryUser']);
    if (n === 3) {
      var m = S.data.mustHave.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
      if (m.length < 3) return err('Must have baru ' + m.length + '. Tambah sampai minimal 3, satu per baris.', ['mustHave']);
    }
    err(null); return false;
  }
  function paintLive(r) {
    var d = S.data;
    var box = $('liveBox');
    if (!box) return;
    box.innerHTML = '';
    var t = document.createElement('div');
    var mustN = d.mustHave.split('\n').map(function (x) { return x.trim(); }).filter(Boolean).length;
    t.innerHTML = '<b>' + escHtml(d.productName || '(nama belum diisi)') + '</b> · ' + escHtml(d.productType) +
      ' · ' + escHtml(d.industry) +
      '<br>Masalah: ' + escHtml(d.problem ? d.problem.slice(0, 90) + (d.problem.length > 90 ? '...' : '') : '-') +
      '<br>Pengguna: ' + escHtml(d.primaryUser || '-') + ' | Platform: ' + escHtml(d.platform.join(', ')) +
      '<br>Must have: ' + mustN + ' item | Skor: ' + r.sc.score;
    box.appendChild(t);
  }
  function paintReview(r) {
    var d = S.data;
    var rb = $('reviewBox');
    if (rb) rb.textContent =
      'Produk: ' + (d.productName || '-') + ' (' + d.productType + ', ' + d.industry + ') | Skor ' + r.sc.score + ' (' + r.sc.level + ')\n' +
      'Masalah: ' + (d.problem || '-') + '\nPengguna: ' + (d.primaryUser || '-') +
      '\nMust:\n' + (d.mustHave || '-') + '\nWon\'t:\n' + (d.wontHave || '-') +
      '\nAlur: ' + (d.mainFlow || '-') + '\nGagal: ' + (d.failFlow || '-') +
      '\nGaya: ' + d.styleDirection + ' | Layout: ' + d.layoutPref + ' | Stack: ' + d.stackPref;
  }

  document.addEventListener('DOMContentLoaded', function () {
    hydrate();
    FIELDS.forEach(function (f) {
      var el = $(f);
      if (!el) return;
      /* L51: <select> memicu input DAN change. Hanya bind salah satu agar
         collect+refresh tidak berjalan dua kali tiap ganti pilihan. */
      if (el.tagName === 'SELECT') {
        el.addEventListener('change', function () { collect(); refresh(true); });
      } else {
        el.addEventListener('input', function () {
          collectData();
          refresh();
          S.saveSoon(400, function (ok) { stamp(ok); });
        });
      }
    });
    document.querySelectorAll('.chips').forEach(function (box) {
      box.addEventListener('click', function (e) {
        var c = e.target.closest('.chip'); if (!c) return;
        var on = c.getAttribute('aria-pressed') === 'true';
        if (on && box.querySelectorAll('.chip[aria-pressed="true"]').length <= 1) {
          /* Tolak melepas chip terakhir: state data selalu punya minimal satu pilihan. */
          window.UX.toast('Minimal satu pilihan tetap aktif.');
          return;
        }
        c.setAttribute('aria-pressed', on ? 'false' : 'true');
        collect(); refresh(true);
      });
    });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        /* B8/R55: jangan majukan wizard saat sedang di konteks lain —
           modal (confirm/prompt), editor prompt, pencarian riwayat,
           variabel prompt, atau pemilih proyek (Enter di sana = pilih). */
        var mb = document.getElementById('modalBack');
        if (mb && mb.classList.contains('open')) return;
        var ae = document.activeElement;
        if (ae && (ae.isContentEditable || (ae.closest && ae.closest('#promptDiv')))) return;
        if (ae && (ae.closest('#pengaturan') || ae.closest('#histSearch') ||
                   ae.closest('.prompt-vars') || ae.closest('#projSelect') ||
                   (ae.id && ae.id.indexOf('modalInput') === 0))) return;
        e.preventDefault();
        var nb = $('nextBtn');
        if (nb) nb.click();
      }
    });
    $('backBtn').addEventListener('click', function () { showStep(S.data.step - 1); });
    $('nextBtn').addEventListener('click', function () {
      var n = S.data.step;
      if (validate(n)) {
        /* U29: pindahkan fokus ke kontrol pertama yang gagal validasi. */
        var first = document.querySelector('.field.err input, .field.err textarea, .field.err select');
        if (first) first.focus();
        return;
      }
      refresh(true);
      err(null);
      if (n < 7) showStep(n + 1);
      else {
        var h = document.getElementById('hasil');
        window.UX.scrollTo(h);
        /* U22: fokus ikut pindah ke #hasil (sudah tabindex=-1) agar
           pengguna keyboard tidak tertinggal di tombol yang ter-scroll off. */
        if (h) h.focus({ preventScroll: true });
      }
    });
    $('resetBtn').addEventListener('click', function () {
      window.UX.confirm('Hapus semua jawaban?', 'Jawaban 7 langkah dihapus. Riwayat dan proyek lain tetap aman.', 'Hapus jawaban', function () {
        S.reset();
        if (window.App && window.App.clearResult) window.App.clearResult();
        hydrate();
        /* B4/autosave jujur: laporkan bila reset gagal tersimpan. */
        var okSave = S.lastSaveFailed && S.lastSaveFailed() ? false : true;
        stamp(okSave);
        window.UX.toast(okSave ? 'Jawaban dikosongkan.' : 'Jawaban dikosongkan di layar, tapi gagal tersimpan.', okSave ? undefined : { level: 'error' });
      }, { danger: true });
    });
    $('fillSampleBtn').addEventListener('click', function () {
      /* L53/G19: deep-copy agar array platform/audio tidak berbagi referensi
         antar proyek; reset nameEdited dan successMetrics (tidak ada di sample). */
      var sample = JSON.parse(JSON.stringify(window.StudioSample));
      sample.nameEdited = false;
      if (sample.successMetrics == null) sample.successMetrics = '';
      Object.keys(sample).forEach(function (k) { S.data[k] = sample[k]; });
      S.clearRun();
      if (window.App && window.App.clearResult) window.App.clearResult();
      S.renameActive(sample.productName);
      S.save();
      hydrate(); stamp(true);
      window.UX.toast('Contoh Kasir Warung Pintar dimuat.');
    });
    window.Wizard = { showStep: showStep, collect: collect, analyze: analyze, validate: validate, refresh: refresh, hydrate: hydrate, stamp: stamp };
  });
})();
