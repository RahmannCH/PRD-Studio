/* Render hasil: TOC + seksi (dengan tanda gap), roadmap progres berbasis isi,
   diagram, prompt dengan kunci urut + update in-place, diff riwayat.
   Juga memuat UX helper: toast, confirm modal (ganti alert/confirm blocking). */
(function () {
  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function reduced() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  /* Scrollspy TOC: listener scroll/resize ber-rAF menghitung ulang seksi
     teratas di ambang 96px. IntersectionObserver tidak dipakai karena ambang
     kustom (96px) bukan boundary yang dilaporkan observer, sehingga penanda
     bisa tertinggal satu seksi saat animasi smooth berhenti. Cleanup dipanggil
     saat render ulang supaya listener tidak menumpuk. */
  var tocCleanup = null;
  function spyToc(box, toc) {
    if (tocCleanup) { tocCleanup(); tocCleanup = null; }
    var links = toc.querySelectorAll('a');
    var sects = box.querySelectorAll('.sect');
    if (!links.length || !sects.length) return;
    var ticking = false;
    function mark() {
      ticking = false;
      var best = -1;
      for (var i = 0; i < sects.length; i++) {
        var r = sects[i].getBoundingClientRect();
        if (!r.width && !r.height) continue; /* panel sedang tersembunyi */
        if (r.top <= 96) best = i;
      }
      if (best < 0) best = 0;
      links.forEach(function (a, j) {
        a.classList.toggle('active', j === best);
        if (j === best) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }
    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(mark); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    tocCleanup = function () {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
    mark();
  }
  function scrollTo(el) {
    if (!el) return;
    try { el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); }
    catch (e) { el.scrollIntoView(); }
  }
  window.UX = {
    scrollTo: scrollTo,
    /* B4: dua slot. Slot info (toast) hilang 2,4 dtk; slot error
       (toastErr) persisten, role=alert, bisa ditutup Escape/klik —
       pesan kegagalan simpan/endpoint tidak lagi ditimpa "Tersalin". */
    toast: function (msg, opts) {
      var level = opts && opts.level;
      if (level === 'error') {
        var te = document.getElementById('toastErr');
        if (te) {
          te.textContent = msg;
          te.classList.add('show');
          clearTimeout(te._h);
          te._h = setTimeout(function () { te.classList.remove('show'); }, 12000);
          return;
        }
      }
      var t = document.getElementById('toast');
      if (!t) return;
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(t._h);
      t._h = setTimeout(function () { t.classList.remove('show'); }, 2400);
    },
    confirm: function (title, text, okLabel, onOk, opts) {
      var back = document.getElementById('modalBack');
      if (!back) { if (window.confirm(text)) onOk(); return; }
      var ok = document.getElementById('modalOk');
      var cancel = document.getElementById('modalCancel');
      var trigger = document.activeElement; /* kembalikan fokus ke pemicu, bukan ke wizard */
      /* C8/B8: aksi destruktif → fokus default ke Batal, tombol aksi danger. */
      var danger = !!(opts && opts.danger);
      document.getElementById('modalTitle').textContent = title;
      document.getElementById('modalText').textContent = text;
      ok.textContent = okLabel || 'Lanjutkan';
      ok.className = danger ? 'btn btn-danger btn-sm' : 'btn btn-accent btn-sm';
      function restoreFocus() {
        var f = trigger && document.contains(trigger) ? trigger : null;
        if (!f) f = document.querySelector('.hist-actions button');
        if (!f) f = document.querySelector('#wizard input, #wizard textarea, #wizard select');
        if (f) f.focus({ preventScroll: true });
      }
      function close() {
        back.classList.remove('open');
        ok.removeEventListener('click', onOkClick);
        cancel.removeEventListener('click', close);
        back.removeEventListener('click', onBackdrop);
        document.removeEventListener('keydown', onKey);
        restoreFocus();
      }
      function onOkClick() { close(); onOk(); }
      function onBackdrop(e) { if (e.target === back) close(); }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
        if (e.key === 'Tab') {
          var f = [ok, cancel];
          /* Normalisasi: bila fokus bocor keluar dialog, anggap di index -1
             → Shift+Tab harus jatuh ke cancel, bukan melompat ke ok. */
          var i = f.indexOf(document.activeElement);
          if (i < 0) i = -1;
          e.preventDefault();
          e.stopPropagation();
          var next = i + (e.shiftKey ? -1 : 1);
          if (next < 0) next = f.length - 1;
          if (next >= f.length) next = 0;
          f[next].focus();
        }
      }
      back.classList.add('open');
      ok.addEventListener('click', onOkClick);
      cancel.addEventListener('click', close);
      back.addEventListener('click', onBackdrop);
      document.addEventListener('keydown', onKey);
      (danger ? cancel : ok).focus();
    },
    /* C2: modal input kustom pengganti window.prompt — mengikuti design
       system neu/glass, punya validasi langsung & trap fokus yang benar.
       onOk(null) dipanggil saat batal; onOk(string) saat konfirmasi. */
    prompt: function (title, text, value, okLabel, onOk) {
      var back = document.getElementById('modalBack');
      if (!back) {
        var v = window.prompt(title, value);
        if (v != null) onOk(v);
        return;
      }
      var ok = document.getElementById('modalOk');
      var cancel = document.getElementById('modalCancel');
      var wrap = document.getElementById('modalInputWrap');
      var input = document.getElementById('modalInput');
      var trigger = document.activeElement;
      if (!wrap || !input) { window.UX.confirm(title, text, okLabel, function () { onOk(null); }); return; }
      document.getElementById('modalTitle').textContent = title;
      document.getElementById('modalText').textContent = text;
      ok.textContent = okLabel || 'Simpan';
      ok.className = 'btn btn-primary btn-sm';
      wrap.hidden = false;
      input.value = value == null ? '' : String(value);
      function close(result) {
        back.classList.remove('open');
        wrap.hidden = true;
        ok.removeEventListener('click', onOkClick);
        cancel.removeEventListener('click', onCancel);
        back.removeEventListener('click', onBackdrop);
        document.removeEventListener('keydown', onKey);
        input.removeEventListener('keydown', onInputKey);
        if (trigger && document.contains(trigger)) trigger.focus({ preventScroll: true });
        onOk(result);
      }
      function onOkClick() { close(input.value); }
      function onCancel() { close(null); }
      function onBackdrop(e) { if (e.target === back) close(null); }
      function onInputKey(e) {
        if (e.key === 'Enter') { e.preventDefault(); close(input.value); }
      }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(null); return; }
        if (e.key === 'Tab') {
          var f = [input, ok, cancel];
          var i = f.indexOf(document.activeElement);
          if (i < 0) i = -1;
          e.preventDefault();
          e.stopPropagation();
          var next = i + (e.shiftKey ? -1 : 1);
          if (next < 0) next = f.length - 1;
          if (next >= f.length) next = 0;
          f[next].focus();
        }
      }
      back.classList.add('open');
      ok.addEventListener('click', onOkClick);
      cancel.addEventListener('click', onCancel);
      back.addEventListener('click', onBackdrop);
      document.addEventListener('keydown', onKey);
      input.addEventListener('keydown', onInputKey);
      input.focus();
      input.select();
    }
  };

  /* copyText sekarang mengembalikan Promise<boolean>: true hanya bila teks
     benar-benar masuk papan klip. R6: gerbangurutan P5..P9 hanya boleh
     terbuka setelah copy SUKSES, bukan setelah klik tanpa peduli hasil. */
  function copyText(t, btn) {
    return new Promise(function (resolve) {
      var done = function () {
        window.UX.toast('Tersalin ke papan klip');
        if (btn && document.contains(btn)) {
          var o = btn.getAttribute('data-label') || btn.textContent;
          btn.setAttribute('data-label', o);
          btn.textContent = 'Tersalin';
          setTimeout(function () { if (document.contains(btn)) btn.textContent = o; }, 1400);
        }
        resolve(true);
      };
      var fail = function () { window.UX.toast('Gagal menyalin. Blok teks lalu tekan Ctrl+C.'); resolve(false); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(done, function () { legacy() ? done() : fail(); });
      } else {
        legacy() ? done() : fail();
      }
      function legacy() {
        /* C12/iOS: textarea off-screen butuh readonly (iOS membuka keyboard
           kalau tidak) dan seleksi eksplisit — tanpa ini execCommand diam-diam
           gagal di Safari walau melempar true. */
        var ta = document.createElement('textarea');
        ta.value = t;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '0';
        ta.style.left = '0';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus({ preventScroll: true });
        ta.select();
        try { ta.setSelectionRange(0, ta.value.length); } catch (eSel) {}
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        document.body.removeChild(ta);
        return ok;
      }
    });
  }

  /* Langkah wizard → nomor seksi PRD ("## 4. Scope MoSCoW" dst).
     Dipetakan lewat awalan nomor judul, BUKAN indeks posisi: PRD hasil
     polesan AI atau input user yang menggeser urutan tidak lagi menggeser
     penanda gap ke seksi yang salah. */
  var STEP_TO_SECT_NUM = { 1: [1, 2], 2: [2], 3: [4, 5], 4: [6], 5: [7], 6: [9, 11] };

  function sectIndexByNum(secs, num) {
    for (var i = 1; i < secs.length; i++) {
      if (new RegExp('^' + num + '\\.').test(secs[i].title)) return i;
    }
    return -1;
  }

  /* C5: potong di BATAS KATA + elipsis (slice lama memotong di tengah huruf,
     "## 4. Scope MoSC…" jadi "Scope MoSC"). Judul penuh tetap di title. */
  function cutTitle(s, max) {
    s = String(s == null ? '' : s);
    if (s.length <= max) return s;
    var cut = s.slice(0, max + 1);
    var sp = cut.lastIndexOf(' ');
    if (sp > max * 0.5) cut = cut.slice(0, sp);
    else cut = s.slice(0, max);
    return cut.replace(/[\s,.;:—-]+$/, '') + '…';
  }

  /* R8: simpan edit contenteditable yang masih terbuka ke promptEdits sebelum
     promptDiv di-reset oleh render ulang. */
  function flushOpenEdit(S) {
    document.querySelectorAll('#promptDiv pre[contenteditable="true"]').forEach(function (pre) {
      var item = pre.closest('.prompt-item');
      if (!item || !item.id) return;
      var id = item.id.replace(/^prompt-/, '');
      var body = pre.textContent;
      var list = S.data.lastResult && S.data.lastResult.prompts;
      var orig = list && list.filter(function (q) { return q.id === id; })[0];
      if (orig && body !== orig.body) {
        orig.body = body;
        /* skipSave: pemanggil render ulang yang menyimpan setelah ini. */
        S.setPromptEdit(id, body, true);
      }
      pre.removeAttribute('contenteditable');
      pre.classList.remove('editing');
    });
  }

  window.RenderOut = {
    copyText: copyText,
    prd: function (md, gaps) {      var secs = window.Exporter.parseSections(md);
      var toc = document.getElementById('prdToc');
      var box = document.getElementById('prdSections');
      toc.innerHTML = ''; box.innerHTML = '';
      var sectSteps = {};
      (gaps || []).forEach(function (g) {
        (STEP_TO_SECT_NUM[g.step] || []).forEach(function (num) {
          var si = sectIndexByNum(secs, num);
          if (si < 0) return;
          sectSteps[si] = sectSteps[si] || [];
          if (sectSteps[si].indexOf(g.step) < 0) sectSteps[si].push(g.step);
        });
      });
      secs.forEach(function (s, i) {
        var steps = sectSteps[i];
        var a = document.createElement('a');
        a.href = '#prd-sect-' + i;
        var full = i === 0 ? 'Ringkasan' : s.title;
        a.textContent = cutTitle(full, 34);
        if (a.textContent !== full) a.title = full;
        if (steps) {
          /* C5: penanda gap sebagai elemen terpisah — bukan bintang tempel
             yang ikut terbaca huruf per huruf oleh screen reader. */
          var dot = document.createElement('span');
          dot.className = 'gap-dot';
          dot.textContent = '*';
          dot.setAttribute('aria-hidden', 'true');
          a.appendChild(dot);
          var sr = document.createElement('span');
          sr.className = 'sr-only';
          sr.textContent = ' (ada gap langkah ' + steps.join(', ') + ')';
          a.appendChild(sr);
          a.classList.add('has-gap');
        }
        toc.appendChild(a);
        var d = document.createElement('div');
        d.className = 'sect' + (steps ? ' gapmark' : '');
        d.id = 'prd-sect-' + i;
        var h = document.createElement('h3');
        h.textContent = i === 0 ? 'Judul dan ringkasan' : s.title;
        d.appendChild(h);
        if (steps) {
          var tag = document.createElement('span');
          tag.className = 'gapmark-tag';
          tag.textContent = 'Gap langkah ' + steps.join(', ');
          h.appendChild(tag);
        }
        var pre = document.createElement('pre');
        pre.textContent = s.body;
        pre.setAttribute('tabindex', '0');
        d.appendChild(pre);
        var row = document.createElement('div'); row.className = 'row';
        var b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm'; b.textContent = 'Salin bagian';
        b.addEventListener('click', function () { copyText(s.body, b); });
        row.appendChild(b); d.appendChild(row); box.appendChild(d);
      });
      var hidden = document.createElement('pre'); hidden.id = 'prdPre'; hidden.style.display = 'none';
      hidden.textContent = md; box.appendChild(hidden);
      spyToc(box, toc);
    },
    roadmap: function (phases) {
      var S = window.StudioState;
      var box = document.getElementById('roadmapDiv');
      box.innerHTML = '';
      if (!phases || !phases.length) {
        box.innerHTML = '<p class="empty">Roadmap kosong untuk hasil ini.</p>';
        return;
      }
      /* B2: kunci STABIL berbasis indeks (fase|item), bukan judul fase.
         Judul fase memuat must.length/styleDirection/stackPref — mengedit
         satu baris Must dulu menghapus seluruh centang satu fase.
         Kunci hash lama (content-addressed) tetap dibaca sebagai fallback
         migrasi sekali-lalu-dipindah. */
      function keyOf(fi, ii) { return 'i' + fi + '.' + ii; }
      function legacyKeyOf(fi, ii, it) {
        var raw = phases[fi].fase + '|' + it.text;
        var h = 5381;
        for (var k = 0; k < raw.length; k++) h = ((h << 5) + h + raw.charCodeAt(k)) >>> 0;
        return 'm' + h.toString(36);
      }
      function lookup(fi, ii, it) {
        var key = keyOf(fi, ii);
        if (Object.prototype.hasOwnProperty.call(S.data.checks, key)) return S.data.checks[key];
        var legacy = legacyKeyOf(fi, ii, it);
        if (Object.prototype.hasOwnProperty.call(S.data.checks, legacy)) {
          /* migrasi sekali: pindahkan nilai ke kunci indeks (state.js yang
             menulis + menyimpan, render hanya meminta) */
          return S.migrateCheck(legacy, key);
        }
        return false;
      }
      phases.forEach(function (f, fi) {
        var d = document.createElement('div'); d.className = 'roadmap-fase';
        var h = document.createElement('h3'); h.textContent = f.fase; d.appendChild(h);
        var dep = document.createElement('p');
        dep.textContent = f.depends; d.appendChild(dep);
        var bar = document.createElement('div'); bar.className = 'roadmap-bar';
        var fill = document.createElement('i'); bar.appendChild(fill); d.appendChild(bar);
        var keys = f.items.map(function (it, ii) { return keyOf(fi, ii); });
        f.items.forEach(function (it, ii) {
          var key = keys[ii];
          var lab = document.createElement('label');
          lab.className = 'mile' + (lookup(fi, ii, it) ? ' done' : '');
          var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!lookup(fi, ii, it);
          cb.setAttribute('aria-label', it.text + ' (estimasi ' + it.est + ')');
          cb.addEventListener('change', function () {
            /* B4: simpan gagal harus terlihat — jangan biarkan centang
               berbohong di layar lalu hilang saat reload. Rollback state
               dipegang setCheck; di sini rollback UI-nya. */
            if (!S.setCheck(key, cb.checked)) {
              cb.checked = !cb.checked;
              lab.classList.toggle('done', cb.checked);
              paint();
              window.UX.toast('Gagal menyimpan centang (mode privat?).', { level: 'error' });
              return;
            }
            lab.classList.toggle('done', cb.checked);
            paint();
          });
          var sp = document.createElement('span');
          sp.innerHTML = escHtml(it.text) + '<span class="est">' + escHtml(it.est) + '</span>';
          var depS = document.createElement('p');
          depS.className = 'mile-dep';
          depS.textContent = it.depends;
          lab.appendChild(cb); lab.appendChild(sp); d.appendChild(lab); d.appendChild(depS);
        });
        function paint() {
          var n = keys.filter(function (k, i) { return lookup(phases.indexOf(f), i, f.items[i]); }).length;
          fill.style.width = keys.length ? Math.round(n / keys.length * 100) + '%' : '0%';
        }
        paint();
        box.appendChild(d);
      });
      /* B2: TIDAK auto-delete kunci basi — kunci indeks sangat kecil dan
         penghapusan diam-diam dulu menghapus progres user saat judul berubah. */
    },
    diagrams: function (list) {
      var box = document.getElementById('diagramDiv');
      box.innerHTML = '';
      list.forEach(function (g) {
        var d = document.createElement('div'); d.className = 'diagram-box';
        var h = document.createElement('h3'); h.textContent = g.title; d.appendChild(h);
        var pre = document.createElement('pre');
        pre.className = 'mermaid';
        pre.textContent = g.code;
        pre.setAttribute('data-raw', g.code);
        pre.setAttribute('tabindex', '0');
        d.appendChild(pre);
        var note = document.createElement('p');
        note.className = 'diagram-note';
        note.textContent = 'Memuat renderer Mermaid... Kode sumber di bawah selalu tersedia offline.';
        d.appendChild(note);
        var src = document.createElement('pre');
        src.className = 'diagram-src';
        src.setAttribute('tabindex', '0');
        src.setAttribute('aria-label', 'Kode sumber ' + g.title);
        src.textContent = g.code;
        d.appendChild(src);
        box.appendChild(d);
      });
      window.renderMermaid();
    },
    prompts: function (list) {
      var S = window.StudioState;
      var box = document.getElementById('promptDiv');
      /* R8: flush edit yang masih terbuka SEBELUM innerHTML di-reset, agar
         ketikan di contenteditable tidak hilang saat var berubah / copy
         membuka prompt lain / generate ulang. */
      flushOpenEdit(S);
      box.innerHTML = '';
      list.forEach(function (p) {
        var locked = p.gate && !S.data.copied[p.gate];
        var d = document.createElement('div'); d.className = 'prompt-item' + (locked ? ' locked' : '');
        d.id = 'prompt-' + p.id;
        var h = document.createElement('h3');
        h.textContent = p.id + ', ' + p.title;
        if (locked) {
          var tag = document.createElement('span');
          tag.className = 'lock-tag';
          tag.textContent = 'terkunci sampai ' + p.gate + ' disalin';
          h.appendChild(tag);
        }
        d.appendChild(h);
        var pre = document.createElement('pre');
        pre.setAttribute('tabindex', '0');
        if (locked) {
          /* B11: isi prompt terkunci TIDAK diekspos — kalau body terbaca lewat
             devtools/mouse, aturan berurutan jadi plin-plan (P4 tanpa P3).
             Papan klip tetap terkunci oleh tombol, ini menutup jalur baca. */
          pre.textContent = 'Terkunci. Salin ' + p.gate + ' dulu untuk membuka isi prompt ini.';
          pre.classList.add('locked-body');
          pre.setAttribute('aria-disabled', 'true');
        } else {
          pre.textContent = p.body;
        }
        d.appendChild(pre);
        var row = document.createElement('div'); row.className = 'prompt-actions';
        var b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-primary btn-sm';
        b.textContent = locked ? 'Buka dengan ' + p.gate : 'Salin ' + p.id;
        if (locked) {
          b.addEventListener('click', function () {
            window.UX.toast(p.gate + ' harus disalin dulu agar urutan eksekusi tidak lompat.');
            var g = document.getElementById('prompt-' + p.gate);
            if (g) { g.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' }); var gb = g.querySelector('button'); if (gb) gb.focus(); }
          });
        } else {
          b.addEventListener('click', function () {
            /* R9: saat edit terbuka, salin isi editor (bukan body tersimpan). */
            var editing = pre.getAttribute('contenteditable') === 'true';
            var text = editing ? pre.textContent : p.body;
            /* R6/R7: tandai copied + render ulang hanya setelah copy SUKSES. */
            copyText(text, b).then(function (okCopy) {
              if (!okCopy) return;
              S.setCopied(p.id);
              var unlockedNow = list.some(function (q) {
                return q.gate && q.gate === p.id;
              });
              if (unlockedNow) {
                window.RenderOut.prompts(list);
                var mine = document.getElementById('prompt-' + p.id);
                var btn = mine && mine.querySelector('button.btn-primary');
                if (btn) btn.focus();
              }
            });
          });
        }
        row.appendChild(b);
        /* P2: tombol Edit — ubah body prompt in-place, tersimpan ke promptEdits.
           B11: prompt terkunci tidak bisa diedit (yang terlihat bukan body). */
        if (!locked) {
        var editBtn = document.createElement('button'); editBtn.type = 'button'; editBtn.className = 'btn btn-ghost btn-sm';
        editBtn.textContent = 'Edit';
        editBtn.setAttribute('aria-pressed', 'false');
        function closeEdit(saveIt) {
          pre.removeAttribute('contenteditable');
          pre.classList.remove('editing');
          editBtn.textContent = 'Edit';
          editBtn.setAttribute('aria-pressed', 'false');
          if (!saveIt) { pre.textContent = p.body; return; }
          var newBody = pre.textContent;
          if (newBody !== p.body) {
            p.body = newBody;
            S.setPromptEdit(p.id, newBody);
            window.UX.toast('Prompt ' + p.id + ' diedit dan tersimpan.');
          }
        }
        pre.addEventListener('keydown', function (e) {
          if (e.key === 'Escape' && pre.getAttribute('contenteditable') === 'true') {
            e.preventDefault();
            closeEdit(false);
            editBtn.focus();
          }
        });
        editBtn.addEventListener('click', function () {
          if (pre.getAttribute('contenteditable') === 'true') {
            closeEdit(true);
          } else {
            pre.setAttribute('contenteditable', 'true');
            pre.classList.add('editing');
            pre.focus();
            editBtn.textContent = 'Simpan edit';
            editBtn.setAttribute('aria-pressed', 'true');
          }
        });
        row.appendChild(editBtn);
        }
        d.appendChild(row);
        box.appendChild(d);
      });
    },
    playSfx: function (type) {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        if (!window._sfxCtx) window._sfxCtx = new AC();
        var c = window._sfxCtx;
        if (c.state === 'suspended') c.resume();
        var t = c.currentTime;
        if (type === 'thud') {
          var o1 = c.createOscillator(), g1 = c.createGain();
          o1.type = 'sine'; o1.frequency.setValueAtTime(90, t);
          o1.frequency.exponentialRampToValueAtTime(35, t + 0.35);
          g1.gain.setValueAtTime(1.0, t); g1.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
          o1.connect(g1); g1.connect(c.destination);
          o1.start(t); o1.stop(t + 0.36);
        } else if (type === 'whoosh') {
          var b1 = c.createBuffer(1, c.sampleRate * 0.4, c.sampleRate);
          var d1 = b1.getChannelData(0); for (var i = 0; i < d1.length; i++) d1[i] = (Math.random() * 2 - 1) * 0.4;
          var s1 = c.createBufferSource(); s1.buffer = b1;
          var f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.setValueAtTime(200, t);
          f1.frequency.exponentialRampToValueAtTime(1600, t + 0.2); f1.frequency.exponentialRampToValueAtTime(300, t + 0.4);
          var g2 = c.createGain(); g2.gain.setValueAtTime(0.01, t); g2.gain.linearRampToValueAtTime(0.8, t + 0.2); g2.gain.linearRampToValueAtTime(0.001, t + 0.4);
          s1.connect(f1); f1.connect(g2); g2.connect(c.destination);
          s1.start(t);
        } else if (type === 'chime') {
          [880, 1760].forEach(function (f, idx) {
            var o = c.createOscillator(), g = c.createGain();
            o.type = 'sine'; o.frequency.setValueAtTime(f, t + idx * 0.05);
            g.gain.setValueAtTime(0.4, t + idx * 0.05); g.gain.exponentialRampToValueAtTime(0.001, t + 0.8 + idx * 0.05);
            o.connect(g); g.connect(c.destination); o.start(t + idx * 0.05); o.stop(t + 0.85 + idx * 0.05);
          });
        } else if (type === 'beep') {
          var o3 = c.createOscillator(), g3 = c.createGain();
          o3.type = 'sine'; o3.frequency.setValueAtTime(2400, t);
          g3.gain.setValueAtTime(0.5, t); g3.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
          o3.connect(g3); g3.connect(c.destination); o3.start(t); o3.stop(t + 0.09);
        } else if (type === 'thermal') {
          var b2 = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
          var d2 = b2.getChannelData(0); for (var k = 0; k < d2.length; k++) d2[k] = (k % 30 < 15 ? 0.3 : -0.3) + (Math.random() * 0.2 - 0.1);
          var s2 = c.createBufferSource(); s2.buffer = b2;
          var f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.setValueAtTime(1400, t);
          var g4 = c.createGain(); g4.gain.setValueAtTime(0.5, t); g4.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
          s2.connect(f2); f2.connect(g4); g4.connect(c.destination); s2.start(t);
        } else if (type === 'riser') {
          var o4 = c.createOscillator(), g5 = c.createGain();
          o4.type = 'sawtooth'; o4.frequency.setValueAtTime(180, t);
          o4.frequency.exponentialRampToValueAtTime(1400, t + 1.1);
          g5.gain.setValueAtTime(0.05, t); g5.gain.linearRampToValueAtTime(0.6, t + 1.0); g5.gain.linearRampToValueAtTime(0.001, t + 1.15);
          var f3 = c.createBiquadFilter(); f3.type = 'lowpass'; f3.frequency.setValueAtTime(400, t); f3.frequency.exponentialRampToValueAtTime(2500, t + 1.1);
          o4.connect(f3); f3.connect(g5); g5.connect(c.destination); o4.start(t); o4.stop(t + 1.2);
        } else {
          var o = c.createOscillator(), g = c.createGain();
          o.type = 'sine'; o.frequency.setValueAtTime(1800, t);
          o.frequency.exponentialRampToValueAtTime(80, t + 0.015);
          g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
          o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.02);
        }
      } catch (e) {}
    },
    storyboard: function (sb) {
      var box = document.getElementById('storyboardTimeline');
      if (!box) return;
      box.innerHTML = '';
      if (!sb || !sb.beats || !sb.beats.length) {
        box.innerHTML = '<p class="empty">Storyboard 60 detik akan muncul setelah kamu menekan Susun.</p>';
        return;
      }

      // Selaraskan state radio chips konsep & rasio di UI
      var conceptVal = (sb.concept && sb.concept.id) || 'ui-journey';
      document.querySelectorAll('#videoConceptChips [data-concept]').forEach(function (c) {
        var on = c.getAttribute('data-concept') === conceptVal;
        c.setAttribute('aria-checked', on ? 'true' : 'false');
      });
      var ratioVal = sb.ratio || '16:9';
      document.querySelectorAll('#videoRatioChips [data-ratio]').forEach(function (r) {
        var on = r.getAttribute('data-ratio') === ratioVal;
        r.setAttribute('aria-checked', on ? 'true' : 'false');
      });

      // 1. Meta Summary Bar
      var metaWrap = document.createElement('div');
      metaWrap.className = 'sb-meta-bar';
      metaWrap.innerHTML = '<div class="sb-meta-item"><span class="sb-meta-k">Konsep Gerak</span><span class="sb-meta-v">' + escHtml(sb.concept ? sb.concept.name : 'Ekosistem UI') + '</span></div>' +
        '<div class="sb-meta-item"><span class="sb-meta-k">Format & Rasio</span><span class="sb-meta-v">' + sb.width + 'x' + sb.height + ' (' + escHtml(sb.ratio) + ' @ ' + sb.fps + ' FPS)</span></div>' +
        '<div class="sb-meta-item"><span class="sb-meta-k">Audio Bed & Tempo</span><span class="sb-meta-v">120 BPM (1 Bar = 2.0s) · Ducking -14dB</span></div>' +
        '<div class="sb-meta-item"><span class="sb-meta-k">Struktur Narasi</span><span class="sb-meta-v">Reverse Iceberg (5 Babak)</span></div>';
      box.appendChild(metaWrap);

      // 2. Visual Rhythm Bar (Peta Audio & Beat Grid 60s)
      var rhythmBox = document.createElement('div');
      rhythmBox.className = 'sb-rhythm-container';
      var rHead = document.createElement('div');
      rHead.className = 'sb-rhythm-head';
      rHead.innerHTML = '<span class="sb-rhythm-title">Visual Rhythm & Audio Waveform Map (60.0s @ 120 BPM)</span>' +
        '<span class="sb-rhythm-legend">' +
        '<span class="sb-leg-dot leg-low"></span> Low (Sub 45Hz) ' +
        '<span class="sb-leg-dot leg-mid"></span> Mid (Haptic) ' +
        '<span class="sb-leg-dot leg-high"></span> High (Riser/Whoosh) ' +
        '<span class="sb-leg-dot leg-vo"></span> VO Ducking (-14dB)' +
        '</span>';
      rhythmBox.appendChild(rHead);

      var trackBar = document.createElement('div');
      trackBar.className = 'sb-rhythm-track';
      sb.beats.forEach(function (b) {
        var pct = ((b.durationSec / sb.totalDuration) * 100).toFixed(1);
        var seg = document.createElement('div');
        seg.className = 'sb-rhythm-seg seg-' + b.role.toLowerCase();
        seg.style.width = pct + '%';
        seg.title = b.title + ' (' + b.timecode + ' · ' + pct + '%)';
        seg.innerHTML = '<span class="sb-seg-label">' + escHtml(b.id.toUpperCase()) + '</span>' +
          '<span class="sb-seg-dur">' + b.durationSec + 's</span>';

        // Marker SFX di dalam segment
        (b.sfx || []).forEach(function (s) {
          var dot = document.createElement('i');
          dot.className = 'sb-sfx-pin pin-' + (s.band || 'mid');
          dot.title = s.at + ' [' + (s.band || 'mid').toUpperCase() + '] ' + s.desc;
          seg.appendChild(dot);
        });

        trackBar.appendChild(seg);
      });
      rhythmBox.appendChild(trackBar);
      box.appendChild(rhythmBox);

      // 3. Beat Cards (Second-by-Second Breakdown)
      sb.beats.forEach(function (b, idx) {
        var card = document.createElement('article');
        card.className = 'sb-card neu';
        card.id = 'sb-beat-' + (idx + 1);

        var head = document.createElement('div');
        head.className = 'sb-card-head';
        var bpTag = b.blueprint ? '<span class="sb-blueprint-badge">Blueprint: ' + escHtml(b.blueprint) + '</span>' : '';
        head.innerHTML = '<div class="sb-card-tags">' +
          '<span class="sb-time-chip">' + escHtml(b.timecode) + ' (' + b.durationSec + 's)</span>' +
          '<span class="sb-bar-chip">' + escHtml(b.bars || '') + '</span>' +
          '<span class="sb-role-chip role-' + escHtml(b.role.toLowerCase()) + '">' + escHtml(b.role) + '</span>' +
          bpTag +
          '</div>' +
          '<h3 class="sb-beat-title">' + escHtml(b.title) + '</h3>';
        card.appendChild(head);

        var body = document.createElement('div');
        body.className = 'sb-card-grid';

        // Kolom 1: Narasi & Teks Kinetik
        var col1 = document.createElement('div');
        col1.className = 'sb-col';
        var hlStyleBadge = b.highlightStyle ? '<span class="sb-style-badge">Style: ' + escHtml(b.highlightStyle) + '</span>' : '';
        col1.innerHTML = '<div class="sb-field">' +
          '<span class="sb-label">Naskah Narasi VO (Pacing ~135 WPM)</span>' +
          '<p class="sb-vo-box">' + escHtml(b.vo) + '</p>' +
          '</div>' +
          '<div class="sb-field">' +
          '<span class="sb-label">Tipografi Kinetik ' + hlStyleBadge + '</span>' +
          '<div class="sb-headline-box">' +
          '<strong class="sb-hl">' + escHtml(b.headline) + '</strong>' +
          '<span class="sb-sub">' + escHtml(b.subtext) + '</span>' +
          (b.highlightWord ? '<span class="sb-hl-word">Highlight: "' + escHtml(b.highlightWord) + '"</span>' : '') +
          '</div>' +
          '</div>';
        body.appendChild(col1);

        // Kolom 2: Layout & Kamera
        var col2 = document.createElement('div');
        col2.className = 'sb-col';
        col2.innerHTML = '<div class="sb-field">' +
          '<span class="sb-label">Arsitektur Komposisi & Layout</span>' +
          '<p class="sb-desc-box">' + escHtml(b.layout) + '</p>' +
          '</div>' +
          '<div class="sb-field">' +
          '<span class="sb-label">Koreografi Kamera & VFX</span>' +
          '<p class="sb-desc-box">' + escHtml(b.camera) + '</p>' +
          '</div>';
        body.appendChild(col2);

        // Kolom 3: Sound Design & Aset Mandiri
        var col3 = document.createElement('div');
        col3.className = 'sb-col';
        var sfxHtml = (b.sfx || []).map(function (s) {
          var bandClass = s.band ? ' band-' + s.band : '';
          var bandBadge = s.band ? '<span class="sb-band-badge' + bandClass + '">' + escHtml(s.band.toUpperCase()) + '</span> ' : '';
          var playBtn = '<button class="sb-play-btn" type="button" data-sfx-type="' + escHtml(s.type || 'click') + '" title="Dengarkan simulasi audio Web Audio API" aria-label="Tes suara ' + escHtml(s.desc) + '">▶</button>';
          return '<li class="sb-sfx-item">' + playBtn + '<span class="sb-sfx-time">' + escHtml(s.at) + '</span> ' + bandBadge + escHtml(s.desc) + '</li>';
        }).join('');

        var assetLines = [];
        if (Array.isArray(b.assets)) {
          assetLines = b.assets.map(function (a) {
            return '<li class="sb-asset-item"><code class="sb-query">' + escHtml(a) + '</code></li>';
          });
        } else if (b.assets && typeof b.assets === 'object') {
          (b.assets.news || []).forEach(function (n) {
            assetLines.push('<li class="sb-asset-item"><span class="sb-tag-kind">Berita</span> <code class="sb-query">' + escHtml(n) + '</code></li>');
          });
          (b.assets.props || []).forEach(function (p) {
            assetLines.push('<li class="sb-asset-item"><span class="sb-tag-kind">Vektor/Prop</span> <code class="sb-query">' + escHtml(p) + '</code></li>');
          });
          (b.assets.sfxKeys || []).forEach(function (k) {
            assetLines.push('<li class="sb-asset-item"><span class="sb-tag-kind">Pustaka SFX</span> <code class="sb-query">' + escHtml(k) + '</code></li>');
          });
          if (b.assets.uiMockup) {
            assetLines.push('<li class="sb-asset-item"><span class="sb-tag-kind">UI Mockup</span> <span class="sb-ui-desc">' + escHtml(b.assets.uiMockup) + '</span></li>');
          }
        }
        var assetHtml = assetLines.join('');

        col3.innerHTML = '<div class="sb-field">' +
          '<span class="sb-label">Sound Effects (SFX Cue Sheet)</span>' +
          '<ul class="sb-sfx-list">' + sfxHtml + '</ul>' +
          '</div>' +
          '<div class="sb-field">' +
          '<span class="sb-label">Kueri Aset Mandiri (AI Agent)</span>' +
          '<ul class="sb-asset-list">' + assetHtml + '</ul>' +
          '</div>';
        body.appendChild(col3);

        card.appendChild(body);
        box.appendChild(card);
      });

      // Pasang handler audio play button via delegasi
      if (!box._hasAudioListener) {
        box._hasAudioListener = true;
        box.addEventListener('click', function (e) {
          var btn = e.target.closest('.sb-play-btn');
          if (btn) {
            var st = btn.getAttribute('data-sfx-type') || 'click';
            window.RenderOut.playSfx(st);
            btn.classList.add('playing');
            setTimeout(function () { btn.classList.remove('playing'); }, 300);
          }
        });
      }
    },
    diff: function (oldMd, newMd) {
      var box = document.getElementById('diffBox');
      if (!box) return;
      box.innerHTML = '';
      var h = document.createElement('h3'); h.className = 'diff-head'; h.textContent = 'Perbandingan versi'; box.appendChild(h);
      var olds = String(oldMd == null ? '' : oldMd).split('\n');
      var news = String(newMd == null ? '' : newMd).split('\n');
      var max = Math.max(olds.length, news.length);
      var pre = document.createElement('pre');
      pre.className = 'diff-pre';
      pre.setAttribute('tabindex', '0');
      /* C11: dokumen besar (PRD utuh bisa >8.000 baris per versi) membuat
         loop diff + innerHTML ratusan ribu node menghentikan tab. Batas tegas
         dengan pesan jujur lebih baik daripada freeze. */
      if (olds.length + news.length > 10000) {
        pre.textContent = 'Terlalu besar untuk dibandingkan (' + (olds.length + news.length) + ' baris total, batas 10.000). Unduh kedua versi sebagai .md lalu bandingkan di editor.';
        box.appendChild(pre);
        return;
      }
      /* Tandai baris yang ditampilkan: baris beda + 3 baris konteks di
         sekelilingnya; sisanya diringkas jadi "… N baris identik …". */
      var ctx = 3;
      var show = [];
      for (var s = 0; s < max; s++) show[s] = false;
      for (var i = 0; i < max; i++) {
        if (olds[i] !== news[i]) {
          for (var j = Math.max(0, i - ctx); j <= Math.min(max - 1, i + ctx); j++) show[j] = true;
        }
      }
      var html = '', hiddenRun = 0;
      function flushRun() {
        if (hiddenRun > 0) {
          html += '<span class="diff-same">… ' + hiddenRun + ' baris identik tidak ditampilkan …</span>\n';
          hiddenRun = 0;
        }
      }
      for (var k = 0; k < max; k++) {
        if (!show[k]) { hiddenRun++; continue; }
        flushRun();
        var o = olds[k], n = news[k];
        if (o === n) html += escHtml(n == null ? '' : n) + '\n';
        else {
          if (o != null) html += '<span class="diff-del">- ' + escHtml(o) + '</span>\n';
          if (n != null) html += '<span class="diff-add">+ ' + escHtml(n) + '</span>\n';
        }
      }
      flushRun();
      pre.innerHTML = html;
      box.appendChild(pre);
    },
    clearDiff: function () {
      var box = document.getElementById('diffBox');
      if (box) box.innerHTML = '';
    }
  };
})();
