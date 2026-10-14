/* Bootstrap hasil: gate skor + hard rule, tabs keyboard, export (termasuk bundle),
   prompt gate jujur, riwayat aman, pengaturan LLM, pemilih proyek, PWA update. */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var S = window.StudioState;
    var $ = function (id) { return document.getElementById(id); };
    var genBtn = $('generateBtn');
    /* B5: label waktu SELALU format lokal (bukan slice ISO UTC). */
    var fmtDate = (window.PrdShared && window.PrdShared.fmtDate) || function (x) { return String(x || '').slice(0, 10); };
    var fmtDateTime = (window.PrdShared && window.PrdShared.fmtDateTime) || function (x) { return String(x || '').slice(0, 16).replace('T', ' '); };

    function reduced() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    function scrollTo(el, block) {
      if (!el) return;
      try { el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: block || 'start' }); }
      catch (e) { el.scrollIntoView(); }
    }
    function escHtml(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }

    /* Gagal simpan harus terlihat di semua operasi, bukan hilang diam-diam
       setelah location.reload(). */
    function guardSave() {
      if (S.lastSaveFailed && S.lastSaveFailed()) {
        window.UX.toast('Gagal menyimpan ke browser (mode privat penuh?). Perubahan hilang kalau tab ditutup.');
        return false;
      }
      return true;
    }

    /* ---------- Tabs: klik + keyboard roving (Arrow, Home, End) ---------- */
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
    function selectTab(t, focus) {
      tabs.forEach(function (x) {
        var on = x === t;
        x.setAttribute('aria-selected', on ? 'true' : 'false');
        x.tabIndex = on ? 0 : -1;
        $('out-' + x.getAttribute('data-tab')).hidden = !on;
      });
      /* Render Mermaid yang tertunda (mis. saat tema diganti di tab lain) */
      if (t.getAttribute('data-tab') === 'diagram' && window._mermaidDirty && window.renderMermaid) {
        window.renderMermaid();
      }
      if (focus) t.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { selectTab(t); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') n = tabs[0];
        else if (e.key === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); selectTab(n, true); }
      });
    });

    /* Hydrate var prompt tersimpan (P6) sebelum listener.
       R16: `!= null` agar var yang sengaja dikosongkan tetap ter-restore
       (nilai '' valid), bukan tertimpa default HTML. */
    ['varRole', 'varTone', 'varTarget', 'varFormat'].forEach(function (id) {
      var el = $(id);
      if (el && S.data[id] != null) el.value = S.data[id];
    });

    /* ---------- Variabel prompt (P6: persist + L7: salinan ulang bila body berubah) ---------- */
    function varsFromDom() {
      return {
        role: ($('varRole') || {}).value || 'senior engineer dan PM',
        tone: ($('varTone') || {}).value || 'ringkas dan biner',
        target: ($('varTarget') || {}).value || 'tim engineering lokal',
        format: ($('varFormat') || {}).value || 'Markdown'
      };
    }
    /* R15/R17/R18: regenerate dari snapshot inputs tersimpan (bukan wizard
       yang mungkin sudah berubah), debounce, dan saveSoon tanpa syarat. */
    var varTimer = null;
    ['varRole', 'varTone', 'varTarget', 'varFormat'].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('input', function () {
        S.data[id] = el.value;
        /* B4/autosave jujur: variabel prompt ikut melaporkan bila save gagal ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â
           indikator "Tersimpan" palsu membuat user menutup tab yakin data aman. */
        S.saveSoon(400, function (ok) { if (window.Wizard && window.Wizard.stamp) window.Wizard.stamp(ok); });
        if (!S.data.lastResult) return;
        clearTimeout(varTimer);
        varTimer = setTimeout(function () {
          if (!S.data.lastResult) return;
          var src = S.data.lastResult.inputs || S.data;
          var newPrompts = applyPromptEdits(window.GenPrompts(src, S.data.lastResult.prd, varsFromDom()));
          var newBodies = JSON.stringify(newPrompts.map(function (p) { return p.body; }));
          var oldBodies = JSON.stringify(S.data.lastResult.prompts.map(function (p) { return p.body; }));
          if (newBodies !== oldBodies) S.data.copied = {};
          S.data.lastResult.prompts = newPrompts;
          S.save();
          window.RenderOut.prompts(S.data.lastResult.prompts);
        }, 300);
      });
    });

    /* ---------- Tombol export: aktif hanya kalau ada hasil ---------- */
    var exportActs = ['copy-prd', 'dl-prd', 'dl-bab', 'dl-json', 'dl-roadmap-csv', 'print', 'ai-polish', 'copy-mermaid', 'copy-all-prompt', 'dl-prompts'];
    function setExportEnabled(on) {
      exportActs.forEach(function (a) {
        var b = document.querySelector('[data-act="' + a + '"]');
        if (b) b.disabled = !on;
      });
      var hint = $('actionHint');
      if (hint) hint.hidden = on;
    }
    function badge(sc) {
      var b = $('scoreBadge');
      b.className = 'score-badge';
      if (!sc) { b.textContent = ''; return; }
      b.textContent = 'Skor ' + sc.score + ' (' + sc.level + ')';
      b.classList.add(sc.score >= 80 ? 'ok' : (sc.score >= 60 ? 'mid' : 'bad'));
    }
    function paintResultGaps(gaps) {
      var ul = $('resultGaps');
      ul.innerHTML = '';
      (gaps || []).forEach(function (g) {
        var li = document.createElement('li');
        /* P1: gap bisa diklik untuk lompat ke field wizard terkait.
           step dibangun via textContent (bukan innerHTML) agar payload
           impor yang dimanipulasi tidak bisa menyuntik HTML/script. */
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'gap-jump';
        var sb = document.createElement('b');
        sb.textContent = 'Langkah ' + g.step;
        b.appendChild(sb);
        b.appendChild(document.createTextNode(' ' + (g.msg || '')));
        b.addEventListener('click', function () {
          window.Wizard.showStep(g.step, true);
          var target = g.field && $(g.field);
          if (target) {
            target.focus({ preventScroll: true });
            window.UX.scrollTo(target.closest('.field') || target);
          } else {
            window.UX.scrollTo($('wizard'));
          }
        });
        li.appendChild(b);
        ul.appendChild(li);
      });
      var clr = $('resultGapsClear');
      if (clr) clr.classList.toggle('show', !(gaps && gaps.length));
    }

    function applyPromptEdits(prompts) {
      var edits = S.data.promptEdits || {};
      prompts.forEach(function (p) { if (edits[p.id]) p.body = edits[p.id]; });
      return prompts;
    }
    function renderAll(r) {
      try {
        window.RenderOut.prd(r.prd, r.gaps);
        window.RenderOut.roadmap(r.roadmap);
        window.RenderOut.diagrams(r.diagrams);
        window.RenderOut.prompts(applyPromptEdits(r.prompts));
        badge(r.score);
        paintResultGaps(r.gaps);
        setExportEnabled(true);
        updateAiBtn();
      } catch (eRender) {
        /* R12/R13: kegagalan render parsial jangan meninggalkan export aktif
           (fullPrd bisa kosong ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ unduhan .md kosong). Nonaktifkan export.
           B9: badge & daftar gap juga di-reset ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â panel jangan menampilkan
           skor/gap hasil run lama yang sudah tidak ada di layar. */
        window.UX.toast('Sebagian hasil tidak bisa ditampilkan: ' + (eRender && eRender.message ? eRender.message : 'payload rusak'), { level: 'error' });
        badge(null);
        paintResultGaps([]);
        setExportEnabled(false);
        updateAiBtn();
      }
    }
    function clearResult() {
      S.data.lastResult = null;
      S.data.promptEdits = {};
      S.data.copied = {};
      S.data.checks = {};
      S.save();
      /* Reset genStatus agar tidak bilang "Selesai. Skor 85" saat panel kosong. */
      var gs = $('genStatus');
      if (gs) { clearTimeout(gs._timer); gs.textContent = ''; gs.className = 'loading'; }
      $('prdToc').innerHTML = '';
      $('prdSections').innerHTML = '<p class="empty">Belum ada hasil. Selesaikan 7 langkah lalu tekan Susun.</p>';
      $('roadmapDiv').innerHTML = '<p class="empty">Roadmap akan muncul setelah kamu menekan Susun.</p>';
      $('diagramDiv').innerHTML = '<p class="empty">Diagram akan muncul setelah kamu menekan Susun.</p>';
      $('promptDiv').innerHTML = '<p class="empty">10 prompt akan muncul setelah kamu menekan Susun.</p>';
      badge(null);
      paintResultGaps([]);
      var clr = $('resultGapsClear');
      if (clr) clr.classList.remove('show');
      window.RenderOut.clearDiff();
      setExportEnabled(false);
      updateAiBtn();
    }

    if (S.data.lastResult) renderAll(S.data.lastResult); else setExportEnabled(false);

    /* ---------- Generate: hard rule L1-3 + gate skor ---------- */
    genBtn.addEventListener('click', function () {
      window.Wizard.collect();
      var d = S.data;
      var gaps = window.Validator(d);
      var sc = window.Scorer(d, gaps);

      /* Hard rule dulu: validate 1-3 (nama+masalah, persona, must >= 3).
         validate(4..7) tidak ada hard rule, jadi cukup panggil 1..3.
         R22: badge/gap hanya di-paint setelah semua gate lolos (atau di
         jalur score<60), agar run yang ditolak tidak menampilkan "Skor 45". */
      var hard = window.Wizard.validate(1) || window.Wizard.validate(2) || window.Wizard.validate(3);
      if (hard) {
        /* B9: lompat ke langkah gap PERTAMA, bukan langkah terakhir yang
           dikunjungi ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â validate() sudah menandai field error di sana. */
        var firstGap = gaps.filter(function (g) { return g.code === 'NAMA' || g.code === 'MASALAH' || g.code === 'WHYNOW' || g.code === 'PERSONA' || g.code === 'PERAN' || g.code === 'MUST3'; })[0];
        window.Wizard.showStep(firstGap ? firstGap.step : S.data.step);
        scrollTo($('wizard'));
        return;
      }
      if (sc.score < 60) {
        badge(sc);
        var target = gaps.length ? gaps[0].step : 1;
        window.Wizard.showStep(target);
        paintResultGaps(gaps);
        var e = $('formErr');
        e.className = 'err show';
        e.textContent = 'Skor ' + sc.score + ', belum bisa disusun. Perbaikan pertama: ' + (gaps[0] ? gaps[0].msg : 'lengkapi jawaban.') + ' (daftar lengkap di panel Hasil.)';
        scrollTo($('wizard'));
        return;
      }
      badge(sc);

      genBtn.disabled = true;
      var gs = $('genStatus');
      clearTimeout(gs._timer);
      gs.className = 'loading';
      gs.textContent = 'Menyusun';
      var outs = ['out-prd', 'out-roadmap', 'out-diagram', 'out-prompt'];
      outs.forEach(function (id) {
        var el = $(id); if (!el) return;
        el.setAttribute('aria-busy', 'true');
        /* C4: inert menahan fokus & klik selama isi panel masih hasil lama
           (browser lama mengabaikan atribut ini ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â aria-busy tetap jalan). */
        el.setAttribute('inert', '');
      });
      var prevPrompts = d.lastResult ? JSON.stringify(d.lastResult.prompts.map(function (p) { return p.body; })) : null;

      setTimeout(function () {
        try {
          var prd = window.GenPRD(d, sc);
          var roadmap = window.GenRoadmap(d);
          var diagrams = window.GenDiagrams(d);
          var prompts = window.GenPrompts(d, prd, varsFromDom());
          applyPromptEdits(prompts);
          var same = prevPrompts === JSON.stringify(prompts.map(function (p) { return p.body; }));

          if (!same) d.copied = {};

          /* R15: simpan snapshot jawaban saat generate. Regenerasi prompt
             (var berubah) selalu merujuk ke sini, bukan wizard yang mungkin
             sudah diedit sehingga PRD dan prompt tidak lagi cocok. */
          var inputsSnap = JSON.parse(JSON.stringify(d));
          delete inputsSnap.history; delete inputsSnap.lastResult;
          delete inputsSnap.checks; delete inputsSnap.copied; delete inputsSnap.promptEdits;

          /* res = objek baru; lastResult TIDAK merujuk langsung ke entry history. */
          var res = { prd: prd, roadmap: roadmap, diagrams: diagrams, prompts: prompts, at: new Date().toISOString(), score: sc, gaps: gaps, inputs: inputsSnap };
          d.lastResult = res;
          var mainSaved = S.save();
          if (!mainSaved) {
            gs.className = 'gen-err';
            gs.textContent = 'Hasil tampil di layar tapi gagal tersimpan (mode privat penuh?). Salin atau unduh sebelum menutup tab.';
            window.UX.toast('Gagal menyimpan hasil ke browser.');
          }
          renderAll(res);
          window.RenderOut.clearDiff();
          /* pushHistory meng-clone (di state.js), sehingga snapshot & result
             di history BUKAN referensi yang sama dengan d.lastResult. */
          var snap = JSON.parse(JSON.stringify(d));
          delete snap.history;
          delete snap.lastResult;
          var saved = S.pushHistory({ name: d.productName, at: res.at, score: sc.score, snapshot: snap, result: res });
          paintHist();
          if (!saved) {
            /* R23: jangan timpa pesan "gagal tersimpan" yang lebih kritis. */
            if (!gs.textContent || gs.textContent.indexOf('gagal tersimpan') < 0) {
              gs.className = 'gen-err';
              gs.textContent = 'Hasil jadi, tapi gagal simpan ke riwayat (penyimpanan browser penuh?).';
            }
          } else {
            gs.className = 'gen-ok';
            gs.textContent = 'Selesai. Skor ' + sc.score + '. PRD, roadmap, diagram, dan 10 prompt siap.';
            /* R24: simpan timer agar run berikutnya tidak kehilangan kontrol. */
            gs._timer = setTimeout(function () { gs.textContent = ''; gs.className = 'loading'; }, 3200);
          }
        } catch (errGen) {
          gs.className = 'gen-err';
          gs.textContent = 'Generator gagal: ' + (errGen && errGen.message ? errGen.message : 'kesalahan tak dikenal') + '. Coba lagi atau hapus jawaban yang aneh.';
        } finally {
          genBtn.disabled = false;
          outs.forEach(function (id) {
            var el = $(id); if (!el) return;
            el.removeAttribute('aria-busy');
            el.removeAttribute('inert');
          });
        }
      }, 30);
    });

    /* ---------- Aksi ekspor ---------- */
    function fullPrd() {
      /* A3: sumber kebenaran = state, bukan DOM. #prdPre bisa berisi PRD
         lama bila renderAll gagal parsial / tab lain sudah mengganti
         lastResult ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â salin & unduh harus konsisten dengan .json. */
      return (S.data.lastResult && typeof S.data.lastResult.prd === 'string') ? S.data.lastResult.prd : '';
    }
    function hasResult() { return !!S.data.lastResult; }
    function guard() {
      if (hasResult()) return true;
      window.UX.toast('Belum ada hasil. Tekan Susun dulu.');
      return false;
    }
    var clickMap = {
      'copy-prd': function (b) { if (guard()) window.RenderOut.copyText(fullPrd(), b); },
      'dl-prd': function () { if (guard()) window.Exporter.download('PRD-' + window.Exporter.slug(S.data.productName) + '.md', fullPrd()); },
      'dl-bab': function () {
        if (!guard()) return;
        var txt = window.Exporter.bundle(S.data.productName, S.data.lastResult);
        window.Exporter.download('PAKET-LENGKAP-' + window.Exporter.slug(S.data.productName) + '.md', txt);
      },
      'dl-json': function () {
        if (!guard()) return;
        /* B7: sertakan checks/copied/promptEdits + nama proyek ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â round-trip
           eksporÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢impor harus mempertahankan centang roadmap, status gerbang
           prompt, edit prompt, dan nama proyek kustom. lastResult tetap
           dikeluarkan dari answers (sudah ada di payload.result). */
        var act = S.store.projects.filter(function (p) { return p.id === S.activeId(); })[0];
        var payload = { name: act ? act.name : '', answers: {}, result: S.data.lastResult, exportedAt: new Date().toISOString() };
        Object.keys(S.data).forEach(function (k) {
          /* history sengaja tidak ikut: 10 entri ÃƒÆ’Ã¢â‚¬â€ PRD utuh membuat file
             berkali-kali lipat tanpa menambah nilai round-trip. */
          if (['history', 'lastResult'].indexOf(k) < 0) payload.answers[k] = S.data[k];
        });
        window.Exporter.download('PRD-' + window.Exporter.slug(S.data.productName) + '.json', JSON.stringify(payload, null, 2), 'application/json');
      },
      'dl-roadmap-csv': function () {
        if (!guard()) return;
        var csv = window.Exporter.roadmapCsv(S.data.lastResult.roadmap, S.data.checks);
        window.Exporter.download('ROADMAP-' + window.Exporter.slug(S.data.productName) + '.csv', csv, 'text/csv');
      },
      'print': function () {
        if (!guard()) return;
        /* C7: window.print() memblokir sampai dialog ditutup ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â toast harus
           muncul SEBELUM, supaya pengguna tahu dialog sedang dibuka. */
        window.UX.toast('Dialog cetak dibuka.');
        window.print();
      },
      'copy-mermaid': function (b) {
        if (!guard()) return;
        var all = S.data.lastResult.diagrams.map(function (g) { return '%% ' + g.title + '\n' + g.code; }).join('\n\n');
        window.RenderOut.copyText(all, b);
      },
      'copy-all-prompt': function (b) {
        if (!guard()) return;
        var ps = S.data.lastResult.prompts;
        var locked = ps.filter(function (p) { return p.gate && !S.data.copied[p.gate]; });
        if (locked.length) {
          window.UX.toast('Masih ada prompt terkunci (' + locked.map(function (p) { return p.id; }).join(', ') + '). Salin berurutan dulu, atau pakai Unduh PROMPTS.md kalau memang mau melompat.');
          return;
        }
        var all = ps.map(function (p) { return '## ' + p.id + ' ' + p.title + '\n\n' + p.body; }).join('\n\n---\n\n');
        window.RenderOut.copyText(all, b);
      },
      'dl-prompts': function () {
        if (!guard()) return;
        var all = S.data.lastResult.prompts.map(function (p) { return '## ' + p.id + ' ' + p.title + (p.gate ? ' (gerbang: ' + p.gate + ')' : '') + '\n\n' + p.body; }).join('\n\n---\n\n');
        window.Exporter.download('PROMPTS-' + window.Exporter.slug(S.data.productName) + '.md', all);
      },
      'ai-polish': function () {
        /* B3: klik kedua SELAMA permintaan berjalan = tombol Batal. */
        if (aiPolishing) { window.LLM.cancel(); return; }
        if (!guard()) return;
        /* R29: guard window.LLM agar tidak melempar kalau adapter gagal load. */
        if (!window.LLM || !window.LLM.configured()) {
          window.UX.toast('Isi endpoint dan API key di bagian Pengaturan dulu.');
          scrollTo($('pengaturan'));
          return;
        }
        var btn = document.querySelector('[data-act="ai-polish"]');
        /* R30: null-check sebelum dipakai. */
        if (!btn) return;
        aiPolishing = true;
        btn.disabled = true;
        genBtn.disabled = true;
        var old = btn.textContent;
        btn.textContent = 'Batalkan';
        btn.disabled = false;
        var polishTarget = S.data.lastResult;
        var restore = function () {
          aiPolishing = false;
          btn.disabled = false;
          genBtn.disabled = false;
          btn.textContent = old;
        };
        var p;
        try {
          p = window.LLM.polishPrd(fullPrd());
        } catch (eSync) {
          restore();
          window.UX.toast('Gagal: ' + (eSync && eSync.message ? eSync.message : 'tidak diketahui'));
          return;
        }
        p.then(function (out) {
          if (!out || !out.trim()) throw new Error('respons kosong');
          if (S.data.lastResult !== polishTarget) throw new Error('Hasil diganti saat permintaan AI berjalan. Ulangi polesan.');
          if (!/##\s*\d+\./.test(out)) throw new Error('Balasan AI bukan PRD utuh. Periksa prompt dan model.');
          var res = S.data.lastResult;
          /* A4: clone versi PRA-POLES SEBELUM res.prd diganti ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â inilah yang
             harus masuk riwayat sebagai "versi lama", bukan hasil poles. */
          var resBefore = JSON.parse(JSON.stringify(res));
          var prevBodies = JSON.stringify((res.prompts || []).map(function (q) { return q.body; }));
          res.prd = out.trim();
          res.polishedAt = new Date().toISOString();
          var src = res.inputs || S.data;
          res.prompts = applyPromptEdits(window.GenPrompts(src, res.prd, varsFromDom()));
          if (JSON.stringify(res.prompts.map(function (q) { return q.body; })) !== prevBodies) {
            S.data.copied = {};
          }
          /* R27: laporkan bila save gagal, jangan hilang diam-diam. */
          if (!S.save()) {
            window.UX.toast('Polesan tampil tapi gagal tersimpan (mode privat?). Salin atau unduh sebelum menutup tab.', { level: 'error' });
          }
          /* A4: entri riwayat = snapshot pra-poles. Cek return pushHistory
             (false saat kuota penuh) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â toast tidak boleh menyesatkan. */
          var snap = JSON.parse(JSON.stringify(S.data));
          delete snap.history; delete snap.lastResult;
          var pushed = S.pushHistory({ name: S.data.productName, at: res.polishedAt, score: resBefore.score ? resBefore.score.score : null, snapshot: snap, result: resBefore });
          paintHist();
          renderAll(res);
          if (pushed) window.UX.toast('PRD dirapikan AI. Versi lama tersimpan di riwayat.');
          else window.UX.toast('PRD dirapikan, tapi versi lama gagal masuk riwayat (kuota penuh).', { level: 'error' });
        }).catch(function (e) {
          var m = e && e.message ? e.message : 'tidak diketahui';
          window.UX.toast((m.indexOf('dibatalkan') > -1 ? '' : 'Gagal: ') + m, { level: m.indexOf('dibatalkan') > -1 ? 'ok' : 'error' });
        }).then(restore);
      }
    };
    Object.keys(clickMap).forEach(function (a) {
      var b = document.querySelector('[data-act="' + a + '"]');
      if (b) b.addEventListener('click', function () { clickMap[a](b); });
    });
    function updateAiBtn() {
      var btn = document.querySelector('[data-act="ai-polish"]');
      if (btn) btn.title = window.LLM && window.LLM.configured() ? 'Rapikan PRD memakai endpoint kamu' : 'Butuh pengaturan AI di bawah';
      updateIdeBtn();
    }
    /* B3: status polesan berjalan ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â membedakan klik "Batalkan" dari klik mulai. */
    var aiPolishing = false;

    /* ---------- E: reverse-wizard ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ide bebas ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ draft 7 langkah ---------- */
    var ideRunning = false;
    function updateIdeBtn() {
      var b = $('ideBtn');
      if (b) b.hidden = !(window.LLM && typeof window.LLM.configured === 'function' && window.LLM.configured());
    }
    (function reverseWizard() {
      var back = $('ideBack'), text = $('ideText'), status = $('ideStatus'),
        ok = $('ideOk'), cancel = $('ideCancel'), openBtn = $('ideBtn');
      if (!back || !openBtn) return;
      function setStatus(msg, isErr) {
        if (!status) return;
        status.className = isErr ? 'err' : 'hint';
        status.textContent = msg;
      }
      function setRunning(on) {
        ideRunning = on;
        ok.textContent = on ? 'Batalkan' : 'Buat draft';
        if (text) text.disabled = on;
      }
      function closeIde() {
        if (ideRunning && window.LLM && window.LLM.cancel) window.LLM.cancel();
        setRunning(false);
        back.classList.remove('open');
        back.hidden = true;
      }
      openBtn.addEventListener('click', function () {
        if (!window.LLM || !window.LLM.configured()) {
          window.UX.toast('Isi endpoint dan API key di bagian Pengaturan dulu.');
          scrollTo($('pengaturan'));
          return;
        }
        setStatus('', false);
        back.classList.add('open'); back.hidden = false;
        if (text) text.focus();
      });
      cancel.addEventListener('click', closeIde);
      /* Klik luar panel = tutup; sama perilaku dengan modal bawaan. */
      back.addEventListener('click', function (e) { if (e.target === back) closeIde(); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && back.classList.contains('open')) closeIde();
      });
      ok.addEventListener('click', function () {
        if (ideRunning) { closeIde(); return; } /* klik kedua = batalkan chat */
        if (!window.ReverseWizard) {
          setStatus('Modul reverse-wizard tidak termuat. Muat ulang halaman.', true);
          return;
        }
        var ide = (text ? text.value : '').trim();
        if (ide.length < 10) {
          setStatus('Tulis ide minimal 10 karakter supaya AI punya bahan.', true);
          if (text) text.focus();
          return;
        }
        var RW = window.ReverseWizard;
        setRunning(true);
        setStatus('Meminta AI mengisi draft...', false);
        window.LLM.chat([
          { role: 'system', content: RW.SYSTEM },
          { role: 'user', content: RW.buildUser(ide) }
        ], { temperature: 0.2 }).then(function (raw) {
          var draft;
          try { draft = RW.parse(raw); }
          catch (eParse) { throw eParse; }
          var touched = 0;
          RW.TEXT_FIELDS.forEach(function (f) { if (draft[f]) { S.data[f] = draft[f]; touched++; } });
          RW.ENUM_FIELDS.forEach(function (f) { if (draft[f]) { S.data[f] = draft[f]; touched++; } });
          RW.ARR_FIELDS.forEach(function (f) { if (draft[f] && draft[f].length) { S.data[f] = draft[f]; touched++; } });
          if (!touched) throw new Error('AI mengembalikan JSON kosong. Coba lagi.');
          window.Wizard.hydrate();
          window.Wizard.refresh();
          if (!S.save()) {
            window.UX.toast('Draft tampil tapi gagal tersimpan (mode privat?). Salin ide kamu sebelum menutup tab.', { level: 'error' });
          }
          setRunning(false);
          back.classList.remove('open'); back.hidden = true;
          window.UX.toast('Draft terisi dari ide. Periksa tiap langkah sebelum susun.');
          if (window.Wizard && window.Wizard.showStep) window.Wizard.showStep(1, true);
        }).catch(function (e) {
          var m = e && e.message ? e.message : 'tidak diketahui';
          setRunning(false);
          /* Teks ide TETAP di textarea supaya bisa disalin bila perlu ulang. */
          setStatus((m.indexOf('dibatalkan') > -1 ? 'Dibatalkan. ' : 'Gagal: ') + m, m.indexOf('dibatalkan') < 0);
          if (m.indexOf('dibatalkan') > -1) window.UX.toast('Permintaan draft dibatalkan.');
        });
      });
      updateIdeBtn();
    })();

    /* ---------- Pengaturan LLM ---------- */
    (function llmSettings() {
      /* B3: adapter gagal load (404 cache lama / offline) tidak boleh
         mematikan inisialisasi selebihnya ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â paintHist, PWA, tombol export
         berjalan setelah blok ini. Kartu AI disembunyikan dengan catatan. */
      if (!window.LLM || typeof window.LLM.getConfig !== 'function') {
        var card = document.getElementById('pengaturan');
        if (card) {
          var note = document.createElement('p');
          note.className = 'settings-note gen-err';
          note.textContent = 'Modul AI tidak termuat (lampu mati / cache lama). Semua fitur lain tetap jalan. Muat ulang halaman untuk memuat ulang modul.';
          card.insertBefore(note, card.firstChild);
        }
        return;
      }
      var cfg = window.LLM.getConfig();
      $('llmBaseUrl').value = cfg.baseUrl || '';
      $('llmModel').value = cfg.model || '';
      $('llmKey').value = '';
      if (cfg.hasKey) $('llmKey').placeholder = 'Tersimpan di browser ini';
      $('llmKeyToggle').addEventListener('click', function () {
        var inp = $('llmKey');
        var show = inp.type === 'password';
        inp.type = show ? 'text' : 'password';
        this.textContent = show ? 'Sembunyi' : 'Tampil';
        this.setAttribute('aria-pressed', show ? 'true' : 'false');
      });
      $('llmKeyDel').addEventListener('click', function () {
        if (!window.LLM.getConfig().hasKey) { window.UX.toast('Belum ada key tersimpan.'); return; }
        window.UX.confirm('Hapus API key tersimpan?', 'Key dihapus dari localStorage browser ini. Endpoint dan model tetap tersimpan.', 'Hapus key', function () {
          var ok = window.LLM.clearKey();
          $('llmKey').value = '';
          $('llmKey').placeholder = 'sk-...';
          window.UX.toast(ok ? 'Key dihapus.' : 'Gagal menghapus (mode privat?).');
          updateAiBtn();
        }, { danger: true });
      });
      $('llmSave').addEventListener('click', function () {
        /* B3: blokir simpan URL tidak valid sebelum key tersimpan terhadap
           host salah ketik ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â pesan muncul di status panel, bukan toast singkat. */
        var raw = $('llmBaseUrl').value;
        if (raw.trim()) {
          var v = window.LLM.validateUrl(raw);
          if (!v.ok) {
            $('llmStatus').className = 'gen-err';
            $('llmStatus').textContent = v.msg;
            $('llmBaseUrl').focus();
            return;
          }
        }
        var ok = window.LLM.setConfig({
          baseUrl: raw,
          model: $('llmModel').value,
          apiKey: $('llmKey').value
        });
        if (ok && $('llmKey').value) {
          $('llmKey').value = '';
          $('llmKey').placeholder = window.LLM.getConfig().hasKey ? 'Tersimpan di browser ini' : 'sk-...';
        }
        window.UX.toast(ok ? 'Pengaturan AI tersimpan lokal.' : 'Gagal menyimpan (mode privat?). Pengaturan hanya berlaku sesi ini.');
        updateAiBtn();
      });
      $('llmTest').addEventListener('click', function () {
        var st = $('llmStatus');
        st.className = 'loading';
        st.textContent = 'Menguji';
        window.LLM.test().then(function (t) {
          /* Status persisten di panel, bukan hilang ke toast 2,4 detik. */
          st.className = 'gen-ok';
          st.textContent = 'Terhubung. Balasan: ' + t;
        }).catch(function (e) {
          st.className = 'gen-err';
          st.textContent = 'Gagal: ' + (e && e.message ? e.message : 'tidak diketahui');
        });
      });
    })();

    /* ---------- Riwayat ---------- */
    var searchEl = $('histSearch');
    if (searchEl) searchEl.addEventListener('input', paintHist);
    function paintHist() {
      var box = $('histList');
      box.innerHTML = '';
      var q = (searchEl && searchEl.value || '').toLowerCase();
      var h = (S.data.history || []).filter(function (x) { return !q || (x.name || '').toLowerCase().indexOf(q) > -1; });
      if (!h.length) {
        box.innerHTML = '<p class="empty">' + (q ? 'Tidak ada riwayat yang cocok dengan pencarianmu.' : 'Belum ada riwayat. Hasil pertama tersimpan otomatis setelah kamu menekan Susun.') + '</p>';
        return;
      }
      h.forEach(function (item) {
        var row = document.createElement('div'); row.className = 'hist-item';
        var label = document.createElement('span');
        label.className = 'hist-label';
        label.textContent = item.name + ' Ãƒâ€šÃ‚Â· ' + fmtDate(item.at) + ' Ãƒâ€šÃ‚Â· skor ' + (item.score != null ? item.score : '-');
        var wrap = document.createElement('span'); wrap.className = 'hist-actions';
        var load = document.createElement('button'); load.type = 'button'; load.textContent = 'Muat';
        load.addEventListener('click', function () {
          /* L67/R32: bangun ulang data dari blank + snapshot (bukan merge per-key
             yang menyisakan field basi), dan siapkan rollback bila save gagal. */
          var prevData = S.data;
          var prevActive = S.activeId();
          var keep = JSON.parse(JSON.stringify(S.data.history || []));
          var snapClone = JSON.parse(JSON.stringify(item.snapshot || {}));
          delete snapClone.history; delete snapClone.lastResult;
          /* blank-like: reset field yang tidak ada di snapshot agar tidak
             warisan project sekarang. */
          var rebuilt = Object.assign({
            productName: '', productType: 'Aplikasi web', industry: 'Umum / belum tentu',
            problem: '', whyNow: '', primaryUser: '', platform: ['Web responsif'], roles: '',
            mustHave: '', shouldHave: '', wontHave: '', mainFlow: '', failFlow: '', navStructure: '',
            styleDirection: '', layoutPref: '', visualNeeds: '', audio: ['Tanpa audio'],
            stackPref: '', integrations: '', nfr: '', successMetrics: '',
            step: 1, checks: {}, copied: {}, nameEdited: false,
            varRole: '', varTone: '', varTarget: '', varFormat: '', promptEdits: {}
          }, snapClone);
          rebuilt.history = keep;
          rebuilt.lastResult = item.result ? JSON.parse(JSON.stringify(item.result)) : null;
          /* B10: checks/copied/promptEdits adalah PROGRES user di atas konten,
             bukan bagian dari jawaban. Snapshot entri lama menyimpannya dalam
             keadaan waktu itu ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â memakannya diam-diam membatalkan centang
             roadmap & edit prompt yang baru saja dikerjakan. */
          rebuilt.checks = JSON.parse(JSON.stringify(S.data.checks || {}));
          rebuilt.copied = JSON.parse(JSON.stringify(S.data.copied || {}));
          rebuilt.promptEdits = JSON.parse(JSON.stringify(S.data.promptEdits || {}));
          S.data = rebuilt;
          /* active().data sinkron lewat setter di state.js. */
          if (!S.save()) {
            S.data = prevData;
            window.UX.toast('Gagal menyimpan (mode privat penuh?).');
            return;
          }
          try { sessionStorage.setItem('prd_reload_toast', 'Riwayat "' + item.name + '" dimuat.'); sessionStorage.setItem('prd_reload_focus', 'hasil'); } catch (eS) {}
          location.hash = 'hasil';
          location.reload();
        });
        var cmp = document.createElement('button'); cmp.type = 'button'; cmp.textContent = 'Bandingkan';
        cmp.addEventListener('click', function () {
          if (!item.result || !item.result.prd) { window.UX.toast('Entri ini tidak punya PRD tersimpan.'); return; }
          if (!S.data.lastResult) { window.UX.toast('Susun dulu versi sekarang sebelum membandingkan.'); return; }
          var basePrd = item.result.prd;
          if (basePrd === S.data.lastResult.prd && item.prevResult && item.prevResult.prd) {
            basePrd = item.prevResult.prd;
          }
          /* R33: PRD identik + tidak ada prevResult ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ tetap render diff box
             (agar smoke test "diff renders" dan UI konsisten), tapi beri
             catatan di header bahwa tidak ada perbedaan. */
          window.RenderOut.diff(basePrd, S.data.lastResult.prd);
          if (basePrd === S.data.lastResult.prd) {
            var head = document.querySelector('#diffBox .diff-head');
            if (head) head.textContent = 'Perbandingan versi ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â tidak ada perbedaan (versi sebelumnya tidak tersimpan)';
            window.UX.toast('Versi ini identik dengan hasil sekarang. Versi sebelumnya tidak tersimpan untuk entri lama.');
          }
          scrollTo($('diffBox'), 'nearest');
        });
        var del = document.createElement('button'); del.type = 'button'; del.textContent = 'Hapus'; del.className = 'danger';
        del.addEventListener('click', function () {
          window.UX.confirm('Hapus entri riwayat?', item.name + ' (' + fmtDate(item.at) + ') dihapus permanen dari browser ini.', 'Hapus', function () {
            var idx = S.data.history.indexOf(item);
            /* Fallback: cari by id dulu (desain A1), lalu name+at. */
            if (idx < 0 && item.id) {
              idx = -1;
              for (var hi = 0; hi < S.data.history.length; hi++) {
                if (S.data.history[hi] && S.data.history[hi].id === item.id) { idx = hi; break; }
              }
            }
            if (idx < 0) {
              idx = -1;
              for (var hj = 0; hj < S.data.history.length; hj++) {
                var h = S.data.history[hj];
                if (h && h.name === item.name && h.at === item.at) { idx = hj; break; }
              }
            }
            if (idx < 0) { window.UX.toast('Entri sudah tidak ada (mungkin dihapus di tab lain).'); paintHist(); return; }
            var snapshotCopy = JSON.parse(JSON.stringify(S.data.history));
            S.data.history.splice(idx, 1);
            if (!S.save()) {
              S.data.history = snapshotCopy;
              window.UX.toast('Gagal menyimpan (mode privat?). Penghapusan dibatalkan.', { level: 'error' });
              return;
            }
            window.RenderOut.clearDiff();
            paintHist();
            window.UX.toast('Riwayat dihapus.');
          }, { danger: true });
        });
        wrap.appendChild(load); wrap.appendChild(cmp); wrap.appendChild(del);
        row.appendChild(label); row.appendChild(wrap); box.appendChild(row);
      });
    }

    /* ---------- Pemilih proyek ---------- */
    function paintProjects() {
      var sel = $('projSelect');
      var list = S.projectList();
      sel.innerHTML = '';
      list.forEach(function (p) {
        var o = document.createElement('option');
        o.value = p.id;
        o.textContent = p.name + ' (' + p.count + ' riwayat)';
        if (p.id === S.activeId()) o.selected = true;
        sel.appendChild(o);
      });
      var act = list.filter(function (p) { return p.id === S.activeId(); })[0];
      $('projMeta').textContent = act ? 'Terakhir disimpan: ' + fmtDateTime(act.updatedAt) : '';
      $('projDel').disabled = list.length <= 1;
    }
    $('projSelect').addEventListener('change', function () {
      if (S.switchProject(this.value)) {
        try { sessionStorage.setItem('prd_reload_focus', 'projSelect'); } catch (eS) {}
        location.reload();
      } else {
        window.UX.toast('Gagal menyimpan proyek (mode privat penuh?). Perpindahan dibatalkan.');
        paintProjects();
      }
    });
    $('projNew').addEventListener('click', function () {
      window.UX.confirm('Proyek baru?', 'Wizard dikosongkan untuk proyek baru. Proyek lama tetap tersimpan dan bisa dipilih lagi lewat dropdown.', 'Buat proyek', function () {
        S.newProject();
        if (!guardSave()) { paintProjects(); return; }
        try { sessionStorage.setItem('prd_reload_toast', 'Proyek baru dibuat.'); } catch (eS) {}
        location.reload();
      });
    });
    $('projDup').addEventListener('click', function () {
      S.dupProject();
      if (!guardSave()) { paintProjects(); return; }
      /* Toast ditulis ke sesi: reload di tick berikutnya menghapus toast DOM. */
      try { sessionStorage.setItem('prd_reload_toast', 'Proyek diduplikat.'); sessionStorage.setItem('prd_reload_focus', 'projSelect'); } catch (eS) {}
      location.reload();
    });
    $('projRen').addEventListener('click', function () {
      var list = S.projectList();
      var act = list.filter(function (p) { return p.id === S.activeId(); })[0];
      /* C2: modal input kustom ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â window.prompt tidak bisa distyle dan
         diblokir di beberapa WebView. */
      window.UX.prompt('Ganti nama proyek', 'Nama baru untuk proyek ini. Riwayat tidak ikut diubah.', act ? act.name : '', 'Simpan', function (name) {
        if (name == null) return;
        /* L18: validasi nama dulu di pemanggil agar pesan "kosong" dan
           "gagal simpan" tidak tertukar (keduanya mengembalikan false). */
        if (!String(name || '').trim()) {
          window.UX.toast('Nama proyek tidak boleh kosong.', { level: 'error' });
          return;
        }
        if (S.renameActive(name, true)) {
          window.UX.toast('Proyek diganti namanya.');
          paintProjects();
        } else {
          window.UX.toast('Gagal menyimpan nama (mode privat penuh?).', { level: 'error' });
        }
      });
    });
    $('projDel').addEventListener('click', function () {
      var list = S.projectList();
      if (list.length <= 1) { window.UX.toast('Minimal satu proyek harus tersisa.'); return; }
      var act = list.filter(function (p) { return p.id === S.activeId(); })[0];
      window.UX.confirm('Hapus proyek aktif?', '"' + (act ? act.name : '') + '" beserta riwayatnya dihapus permanen. Proyek lain tidak tersentuh.', 'Hapus proyek', function () {
        if (S.delProject(S.activeId())) location.reload();
        else window.UX.toast('Gagal menghapus atau menyimpan (mode privat penuh?).', { level: 'error' });
      }, { danger: true });
    });
    /* P3: Impor payload .json hasil ekspor (Unduh .json). */
    $('projImport').addEventListener('click', function () { $('projImportFile').click(); });
    $('projImportFile').addEventListener('change', function () {
      var f = this.files && this.files[0];
      this.value = '';
      if (!f) return;
      if (f.size > 5 * 1024 * 1024) { window.UX.toast('File terlalu besar (maksimal 5MB).'); return; }
      var reader = new FileReader();
      reader.onerror = function () { window.UX.toast('Gagal membaca file.'); };
      reader.onload = function () {
        try {
          var payload = JSON.parse(String(reader.result));
          var p = S.importProject(payload);
          if (!p) { window.UX.toast('File tidak valid atau gagal disimpan.'); return; }
          var toastMsg = p.resultDropped
            ? 'Proyek "' + p.name + '" diimpor, tetapi PRD di dalam file rusak dan tidak ikut dimuat.'
            : 'Proyek "' + p.name + '" diimpor.';
          try { sessionStorage.setItem('prd_reload_toast', toastMsg); sessionStorage.setItem('prd_reload_focus', 'projSelect'); } catch (eS) {}
          location.reload();
        } catch (e) {
          window.UX.toast('File bukan JSON yang valid.');
        }
      };
      reader.readAsText(f);
    });

    paintHist();
    paintProjects();
    updateAiBtn();

    /* ---------- Pascareload: toast & fokus dari sesi ---------- */
    try {
      var pendToast = sessionStorage.getItem('prd_reload_toast');
      if (pendToast) { sessionStorage.removeItem('prd_reload_toast'); window.UX.toast(pendToast); }
      var pendFocus = sessionStorage.getItem('prd_reload_focus');
      if (pendFocus) {
        sessionStorage.removeItem('prd_reload_focus');
        var fEl = $(pendFocus);
        if (fEl) fEl.focus({ preventScroll: true });
      }
    } catch (eS) {}

    /* ---------- Sinkronisasi antar tab (CRITICAL fix) ----------
       state.js memanggil S.onExternal setelah mengimpor store dari tab lain.
       Tanpa assignment ini, DOM wizard/history/project tidak pernah di-repaint
       ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ tab kedua menulis field basi ke project yang sudah berubah. */
    S.onExternal = function () {
      paintHist();
      paintProjects();
      updateAiBtn();
      if (window.Wizard && typeof window.Wizard.hydrate === 'function') window.Wizard.hydrate();
      /* A2: panel hasil juga harus mengikuti store eksternal ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â tanpa ini
         DOM PRD lama tetap tampil saat tab lain ganti proyek, dan tombol
         salin/AI polish bekerja di atas konten yang sudah tidak sah. */
      try {
        if (S.data.lastResult) renderAll(S.data.lastResult);
        else clearResult();
      } catch (eExt) {
        setExportEnabled(false);
      }
      setExportEnabled(!!S.data.lastResult);
      var gs = $('genStatus');
      if (gs) {
        /* R23: jangan timpa pesan kegagalan simpan kritis. */
        if (/gagal/i.test(gs.textContent || '')) return;
        clearTimeout(gs._timer);
        gs.textContent = 'Data disinkronkan dari tab lain.';
        gs.className = 'loading';
      }
    };

    /* ---------- PWA: update tersedia + indikator offline ---------- */
    (function pwa() {
      var banner = $('offlineBanner');
      var upd = $('pwaUpdate');
      function setOffline(off) { if (banner) banner.hidden = !off; }
      /* D1: koneksi kembali ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ minta SW mengulang precache CDN (font/mermaid)
         yang mungkin gagal saat install tadi. */
      function retryCdn() {
        if (!('serviceWorker' in navigator) || !navigator.serviceWorker) return;
        navigator.serviceWorker.ready.then(function (reg) {
          if (reg && reg.active) reg.active.postMessage({ type: 'retry-cdn' });
        }).catch(function () {});
      }
      window.addEventListener('online', function () { setOffline(false); retryCdn(); });
      window.addEventListener('offline', function () { setOffline(true); });
      setOffline(typeof navigator !== 'undefined' && navigator.onLine === false);
      if (typeof navigator !== 'undefined' && navigator.onLine !== false) retryCdn();
      if ('serviceWorker' in navigator && navigator.serviceWorker) {
        /* controllerchange juga terjadi saat INSTALASI pertama (clients.claim).
           Tanpa penjaga ini, pengunjung baru langsung disuguhkan "Versi baru
           tersedia". Banner update hanya untuk pergantian controller sesudah
           halaman awal sudah dikontrol. */
        var hadController = !!navigator.serviceWorker.controller;
        navigator.serviceWorker.addEventListener('controllerchange', function () {
          if (!hadController) { hadController = true; return; }
          if (upd) upd.hidden = false;
        });
        var reloadBtn = $('pwaReload');
        if (reloadBtn) reloadBtn.addEventListener('click', function () { location.reload(); });
      }
    })();

    window.App = { clearResult: clearResult, paintHist: paintHist, paintProjects: paintProjects };
  });
})();
