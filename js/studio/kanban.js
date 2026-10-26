(function () {
  'use strict';

  function deriveTasks(spec, roadmap, taskStates) {
    taskStates = taskStates || {};
    var tasks = [];
    var pName = (spec && spec.meta && spec.meta.nama) || 'Aplikasi';
    var stack = (spec && spec.meta && spec.meta.stackPref) || 'HTML CSS JS vanilla';

    // Fase 1: Fondasi dan UI Mockup
    tasks.push({
      id: 'T0.1',
      phase: 1,
      phaseName: 'Fase 1: Fondasi dan UI Mockup',
      layer: 'foundation',
      title: 'Inisialisasi Proyek dan Struktur Berkas (' + stack + ')',
      detail: 'Setup repositori, file dasar, konfigurasi runtime, dan struktur folder awal untuk ' + pName + '.'
    });
    tasks.push({
      id: 'T0.2',
      phase: 1,
      phaseName: 'Fase 1: Fondasi dan UI Mockup',
      layer: 'frontend',
      title: 'Scaffolding Layout Utama dan Shell Navigasi',
      detail: 'Bangun kerangka visual antarmuka utama, header, navigasi, dan container konten dalam status mockup.'
    });

    var stories = (spec && spec.stories) || [];
    for (var i = 0; i < stories.length; i++) {
      var s = stories[i];
      tasks.push({
        id: 'T1.' + (i + 1) + '-ui',
        phase: 1,
        phaseName: 'Fase 1: Fondasi dan UI Mockup',
        layer: 'frontend',
        title: 'UI Mockup: ' + s.action,
        detail: 'Bangun tampilan, tombol interaksi, dan alur visual untuk fitur: ' + s.action + ' memakai data tiruan (stub).'
      });
    }

    // Fase 2: Logika Inti dan State
    tasks.push({
      id: 'T2.0',
      phase: 2,
      phaseName: 'Fase 2: Logika Inti dan State',
      layer: 'backend',
      title: 'Skema Entitas dan Struktur Penyimpanan Data',
      detail: 'Rancang model data, validasi field, dan mekanisme persistensi state untuk ' + pName + '.'
    });
    for (var j = 0; j < stories.length; j++) {
      var sj = stories[j];
      tasks.push({
        id: 'T2.' + (j + 1) + '-logic',
        phase: 2,
        phaseName: 'Fase 2: Logika Inti dan State',
        layer: 'backend',
        title: 'Logika Bisnis: ' + sj.action,
        detail: 'Implementasikan logika pemrosesan, mutasi data, dan aturan validasi untuk ' + sj.action + '.'
      });
      tasks.push({
        id: 'T2.' + (j + 1) + '-bind',
        phase: 2,
        phaseName: 'Fase 2: Logika Inti dan State',
        layer: 'frontend',
        title: 'Wiring UI ke Data: ' + sj.action,
        detail: 'Hubungkan tampilan mockup dengan state atau data aktual sehingga form dan tombol merespons input nyata.'
      });
    }

    // Fase 3: Integrasi dan Alur Gagal
    tasks.push({
      id: 'T3.1',
      phase: 3,
      phaseName: 'Fase 3: Integrasi dan Alur Gagal',
      layer: 'frontend',
      title: 'Penanganan Error UI, Validasi dan Pesan Ulang',
      detail: 'Pasang indikator loading, pesan galat kontekstual, dan tombol coba lagi saat operasi gagal.'
    });
    tasks.push({
      id: 'T3.2',
      phase: 3,
      phaseName: 'Fase 3: Integrasi dan Alur Gagal',
      layer: 'backend',
      title: 'Sinkronisasi, Offline State dan Proteksi Integritas Data',
      detail: 'Tangani skenario jaringan terputus, retry antrean data, dan pencegahan duplikasi data.'
    });

    // Fase 4: Hardening dan Rilis
    tasks.push({
      id: 'T4.1',
      phase: 4,
      phaseName: 'Fase 4: Hardening dan Rilis',
      layer: 'frontend',
      title: 'Audit UI/UX Responsif dan Aksesibilitas (WCAG AA)',
      detail: 'Verifikasi kontras warna, ukuran target sentuh 44px, dan tampilan pada viewport 360px sampai desktop.'
    });
    tasks.push({
      id: 'T4.2',
      phase: 4,
      phaseName: 'Fase 4: Hardening dan Rilis',
      layer: 'foundation',
      title: 'Pengujian Menyeluruh (Smoke dan Acceptance Test)',
      detail: 'Jalankan skenario verifikasi end-to-end memastikan seluruh kriteria penerimaan terpenuhi.'
    });
    tasks.push({
      id: 'T4.3',
      phase: 4,
      phaseName: 'Fase 4: Hardening dan Rilis',
      layer: 'foundation',
      title: 'Finalisasi Deployment dan Panduan Pengoperasian',
      detail: 'Siapkan konfigurasi rilis produksi dan dokumentasi langkah menjalankan aplikasi.'
    });

    // Pasang status dan batas checkpoint
    for (var k = 0; k < tasks.length; k++) {
      var cur = tasks[k];
      cur.status = taskStates[cur.id] || 'planned';
      var next = tasks[k + 1];
      cur.isCheckpoint = false;
      cur.checkpointReason = '';
      if (next) {
        if (cur.phase !== next.phase) {
          cur.isCheckpoint = true;
          cur.checkpointReason = 'Pergantian Fase (' + cur.phaseName + ' -> ' + next.phaseName + ')';
        } else if (cur.layer === 'frontend' && next.layer === 'backend') {
          cur.isCheckpoint = true;
          cur.checkpointReason = 'Pergantian Layer (Frontend Mockup selesai -> Beralih ke Backend)';
        }
      }
    }

    return tasks;
  }

  function generateMasterPrompt(tasks, spec) {
    var pName = (spec && spec.meta && spec.meta.nama) || 'Aplikasi';
    var stack = (spec && spec.meta && spec.meta.stackPref) || 'HTML CSS JS vanilla';

    var lines = [];
    lines.push('# MASTER PROMPT EKSEKUSI AGENT (NGODINGPAKEAI SPEC)');
    lines.push('');
    lines.push('Proyek: ' + pName);
    lines.push('Stack: ' + stack);
    lines.push('');
    lines.push('## PROTOKOL CHECKPOINT AGENT (WAJIB DIIKUTI)');
    lines.push('1. Kerjakan task secara berurutan sesuai daftar di bawah.');
    lines.push('2. PRIORITAS LAYER: Selesaikan semua task FRONTEND / UI MOCKUP terlebih dahulu menggunakan data dummy/stub sebelum menyentuh Backend atau Database riil.');
    lines.push('3. HARD CHECKPOINT PERGANTIAN LAYER:');
    lines.push('   Ketika sebuah task Frontend selesai dan task berikutnya adalah Backend (atau Fase berganti):');
    lines.push('   - BERHENTI dan JANGAN mulai task berikutnya secara otomatis.');
    lines.push('   - Laporkan ke user: "Selesai milestone [Layer/Fase]. Tampilan UI mockup sudah siap diuji di browser. Silakan coba interaksi terlebih dahulu."');
    lines.push('   - Minta user mengetik kata konfirmasi "lanjut" untuk membuka fase atau layer berikutnya.');
    lines.push('4. PRIVASI DAN KEBERSIHAN:');
    lines.push('   - Jangan simpan kredensial atau API key di repositori.');
    lines.push('   - Catat riwayat ringkasan task di `.studio/task-summary.json`.');
    lines.push('');
    lines.push('## DAFTAR TASK BERURUTAN');
    lines.push('| ID | Fase | Layer | Deskripsi | Checkpoint |');
    lines.push('|---|---|---|---|---|');

    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      var cp = t.isCheckpoint ? 'YA (' + t.checkpointReason + ')' : '-';
      lines.push('| ' + t.id + ' | Fase ' + t.phase + ' | ' + t.layer.toUpperCase() + ' | ' + t.title + ' | ' + cp + ' |');
    }

    lines.push('');
    lines.push('Mulai dengan Task ' + (tasks[0] ? tasks[0].id : 'T0.1') + '. Konfirmasi pemahaman sebelum mulai.');
    return lines.join('\n');
  }

  function generateTaskPrompt(task, spec) {
    var pName = (spec && spec.meta && spec.meta.nama) || 'Aplikasi';
    var stack = (spec && spec.meta && spec.meta.stackPref) || 'HTML CSS JS vanilla';

    var lines = [];
    lines.push('## INSTRUKSI TASK CODING AGENT');
    lines.push('Proyek: ' + pName);
    lines.push('Task: ' + task.id + ' - ' + task.title);
    lines.push('Fase: ' + task.phaseName);
    lines.push('Layer: ' + task.layer.toUpperCase());
    lines.push('Stack: ' + stack);
    lines.push('');
    lines.push('### SPESIFIKASI TASK:');
    lines.push(task.detail);
    lines.push('');
    lines.push('### DEFINISI SELESAI (ACCEPTANCE CRITERIA):');
    lines.push('- Berhasil diimplementasikan sesuai layer ' + task.layer + '.');
    lines.push('- Tidak merusak kode lain di proyek.');
    lines.push('- Teruji secara manual atau unit test lokal.');
    lines.push('');

    if (task.isCheckpoint) {
      lines.push('### ATURAN CHECKPOINT AGENT (PENTING):');
      lines.push('Peringatan: Task ini merupakan batas checkpoint: ' + task.checkpointReason + '.');
      lines.push('Setelah task ini selesai:');
      lines.push('1. JANGAN lanjutkan ke task berikutnya secara otomatis.');
      lines.push('2. BERHENTI dan laporkan ke user bahwa bagian ini selesai dan siap diuji di browser.');
      lines.push('3. Tunggu user mengonfirmasi dengan kata "lanjut" baru beralih ke task berikutnya.');
      lines.push('');
    }

    lines.push('Silakan mulai implementasi task ini.');
    return lines.join('\n');
  }

  window.Kanban = {
    deriveTasks: deriveTasks,
    generateMasterPrompt: generateMasterPrompt,
    generateTaskPrompt: generateTaskPrompt
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.Kanban;
  }
})();
