#!/usr/bin/env node
/* task-runner.js - Offline CLI Task Runner and Checkpoint Engine
   Menjalankan alur task coding agent secara offline-first dengan perlindungan
   checkpoint layer (Frontend Mockup First) dan ringkasan privasi lokal.
   Tanpa dependensi eksternal, hanya menggunakan stdlib Node.js. */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const cwd = process.cwd();
const SUMMARY_DIR = path.join(cwd, '.studio');
const SUMMARY_FILE = path.join(SUMMARY_DIR, 'task-summary.json');

function findTaskFile() {
  const candidates = [
    'TASKS.md',
    'tasks.md',
    ...fs.readdirSync(cwd).filter(f => /^TASKS-.*\.md$/i.test(f))
  ];
  for (const c of candidates) {
    const p = path.join(cwd, c);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function parseTasks(content) {
  const lines = content.split(/\r?\n/);
  const tasks = [];
  let currentPhase = 'Fase 1';
  let currentPhaseNum = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(/^##\s+(?:Fase\s+(\d+)|(Fondasi|Requirement\s+\d+))/i);
    if (headerMatch) {
      if (headerMatch[1]) {
        currentPhaseNum = parseInt(headerMatch[1], 10);
        currentPhase = 'Fase ' + currentPhaseNum;
      } else if (headerMatch[2] && headerMatch[2].toLowerCase() === 'fondasi') {
        currentPhaseNum = 1;
        currentPhase = 'Fase 1: Fondasi';
      }
    }

    const taskMatch = line.match(/^-\s*\[([ xX])\]\s+([A-Z0-9.-]+)\s+(.+)$/);
    if (taskMatch) {
      const done = taskMatch[1].toLowerCase() === 'x';
      const id = taskMatch[2];
      const title = taskMatch[3].trim();

      let layer = 'backend';
      if (/ui|tampilan|layout|halaman|form|komponen|mockup|antarmuka|css|html/i.test(title)) {
        layer = 'frontend';
      } else if (/fondasi|setup|inisialisasi|proyek|struktur/i.test(title)) {
        layer = 'foundation';
      }

      tasks.push({
        id: id,
        phase: currentPhaseNum,
        phaseName: currentPhase,
        layer: layer,
        title: title,
        done: done,
        lineIndex: i
      });
    }
  }

  for (let j = 0; j < tasks.length; j++) {
    const cur = tasks[j];
    const next = tasks[j + 1];
    cur.isCheckpoint = false;
    cur.checkpointReason = '';
    if (next) {
      if (cur.phase !== next.phase) {
        cur.isCheckpoint = true;
        cur.checkpointReason = 'Pergantian Fase (' + cur.phaseName + ' -> ' + next.phaseName + ')';
      } else if (cur.layer === 'frontend' && next.layer === 'backend') {
        cur.isCheckpoint = true;
        cur.checkpointReason = 'Pergantian Layer (Frontend Mockup selesai -> Pindah ke Backend)';
      }
    }
  }

  return tasks;
}

function printStatus(tasks) {
  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  console.log('\n======================================================');
  console.log('  PRD STUDIO TASK KANBAN RUNNER');
  console.log('  Progress: ' + done + ' / ' + total + ' task selesai (' + pct + '%)');
  console.log('======================================================\n');

  const groups = {
    'Fase 1': tasks.filter(t => t.phase === 1),
    'Fase 2': tasks.filter(t => t.phase === 2),
    'Fase 3': tasks.filter(t => t.phase === 3),
    'Fase 4': tasks.filter(t => t.phase >= 4)
  };

  for (const pName in groups) {
    const list = groups[pName];
    if (!list.length) continue;
    console.log('[' + pName + ']');
    list.forEach(t => {
      const mark = t.done ? '[x]' : '[ ]';
      const badge = t.layer === 'frontend' ? '(FE)' : (t.layer === 'backend' ? '(BE)' : '(FD)');
      const cp = t.isCheckpoint ? ' <CHECKPOINT>' : '';
      console.log('  ' + mark + ' ' + badge + ' ' + t.id + ' ' + t.title + cp);
    });
    console.log('');
  }
}

function getNextTask(tasks) {
  for (let i = 0; i < tasks.length; i++) {
    if (!tasks[i].done) return { task: tasks[i], prev: tasks[i - 1] || null };
  }
  return null;
}

function logSummary(task) {
  if (!fs.existsSync(SUMMARY_DIR)) {
    fs.mkdirSync(SUMMARY_DIR, { recursive: true });
  }
  let summaries = [];
  if (fs.existsSync(SUMMARY_FILE)) {
    try { summaries = JSON.parse(fs.readFileSync(SUMMARY_FILE, 'utf8')); } catch (e) {}
  }
  summaries.push({
    taskId: task.id,
    title: task.title,
    layer: task.layer,
    phase: task.phase,
    completedAt: new Date().toISOString()
  });
  fs.writeFileSync(SUMMARY_FILE, JSON.stringify(summaries, null, 2), 'utf8');
}

function markTaskDone(taskFilePath, task) {
  const content = fs.readFileSync(taskFilePath, 'utf8');
  const lines = content.split(/\r?\n/);
  lines[task.lineIndex] = lines[task.lineIndex].replace(/^-\s*\[\s*\]/, '- [x]');
  fs.writeFileSync(taskFilePath, lines.join('\n'), 'utf8');
  logSummary(task);
}

function runInteractive() {
  const taskFile = findTaskFile();
  if (!taskFile) {
    console.error('Error: Berkas TASKS.md atau TASKS-<slug>.md tidak ditemukan di direktori ini.');
    process.exit(1);
  }

  const content = fs.readFileSync(taskFile, 'utf8');
  const tasks = parseTasks(content);

  const arg = process.argv[2];
  if (arg === '--status' || arg === '-s') {
    printStatus(tasks);
    return;
  }

  const nextObj = getNextTask(tasks);
  if (!nextObj) {
    printStatus(tasks);
    console.log('Semua task telah selesai 100%. Selamat, proyek siap dirilis!');
    return;
  }

  const current = nextObj.task;
  const prev = nextObj.prev;

  if (prev && prev.isCheckpoint) {
    console.log('\n======================================================');
    console.log('  CHECKPOINT TERDETEKSI: ' + prev.checkpointReason);
    console.log('======================================================');
    console.log('Sebelum memulai task berikutnya (' + current.id + '):');
    console.log('1. Pastikan Anda telah meninjau hasil task sebelumnya di browser / lokal.');
    console.log('2. Uji alur antarmuka dan interaksi yang baru dibangun.');
    console.log('');

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Ketik "lanjut" untuk melanjutkan eksekusi: ', function (ans) {
      rl.close();
      if (ans.trim().toLowerCase() !== 'lanjut') {
        console.log('Eksekusi ditunda. Jalankan ulang script saat Anda siap.');
        process.exit(0);
      }
      displayTaskAndPrompt(taskFile, current);
    });
  } else {
    displayTaskAndPrompt(taskFile, current);
  }
}

function displayTaskAndPrompt(taskFile, task) {
  console.log('\n------------------------------------------------------');
  console.log('TASK AKTIF: ' + task.id + ' (' + task.layer.toUpperCase() + ')');
  console.log('Judul: ' + task.title);
  console.log('Fase : ' + task.phaseName);
  console.log('------------------------------------------------------\n');
  console.log('PROMPT CODING AGENT:');
  console.log('```markdown');
  console.log('Kerjakan task: ' + task.id + ' - ' + task.title);
  console.log('Layer: ' + task.layer.toUpperCase() + ' | Fase: ' + task.phaseName);
  console.log('Selesaikan implementasi mandiri dan uji lokal sebelum menandai selesai.');
  console.log('```\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Apakah task ini sudah selesai dikerjakan? (y/N): ', function (ans) {
    rl.close();
    if (ans.trim().toLowerCase() === 'y') {
      markTaskDone(taskFile, task);
      console.log('Task ' + task.id + ' ditandai SELESAI di ' + path.basename(taskFile));
      console.log('Ringkasan tersimpan di .studio/task-summary.json\n');
    } else {
      console.log('Task tetap dalam status berjalan.');
    }
  });
}

if (require.main === module) {
  runInteractive();
}

module.exports = {
  parseTasks: parseTasks,
  getNextTask: getNextTask
};
