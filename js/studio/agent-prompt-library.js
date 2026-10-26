/* AI Agent Prompt Library & Adapter untuk PRD Studio.
   Katalog prompt teroptimasi per agen coding (Cursor, Claude Code, Copilot,
   Windsurf, Aider, Devin) dengan format, best practice, dan integrasi.
   Menghasilkan prompt siap pakai yang disesuaikan dengan agen target.
   ES5 murni tanpa bundler. */
(function () {
  function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  var AGENTS = {
    'cursor': {
      id: 'cursor',
      name: 'Cursor',
      icon: '⚡',
      format: 'markdown-rules',
      description: 'Cursor AI IDE dengan .cursorrules dan Composer',
      promptTemplate: function (spec, projectName) {
        var lines = [];
        lines.push('# .cursorrules - ' + projectName);
        lines.push('');
        lines.push('## Project Context');
        lines.push('Project: ' + projectName);
        lines.push('Stack: ' + (spec && spec.meta && spec.meta.stackPref ? spec.meta.stackPref : 'TBD'));
        lines.push('');
        lines.push('## Coding Standards');
        lines.push('- Gunakan ES5/TypeScript sesuai stack');
        lines.push('- Semua fungsi harus memiliki unit test');
        lines.push('- Jangan ubah file di luar scope task');
        lines.push('- Ikuti struktur folder yang sudah ada');
        lines.push('');
        lines.push('## Task Execution');
        lines.push('Baca TASKS.md untuk daftar task. Kerjakan satu task per sesi.');
        lines.push('Setelah selesai, update checkbox [x] di TASKS.md.');
        lines.push('Jalankan linter dan test sebelum commit.');
        lines.push('');
        lines.push('## Constraints');
        lines.push('- Jangan hapus file yang ada');
        lines.push('- Jangan ubah konfigurasi tanpa approval');
        lines.push('- Semua perubahan harus reversible');
        return lines.join('\n');
      },
      bestPractices: [
        'Gunakan Composer (Ctrl+I) untuk multi-file edits',
        'Set .cursorrules di root project',
        'Gunakan @codebase untuk context retrieval',
        'Aktifkan auto-import untuk konsistensi',
        'Gunakan /fix untuk bug fixing otomatis'
      ],
      integration: 'Letakkan .cursorrules di root repo. Cursor akan membacanya otomatis.'
    },
    'claude-code': {
      id: 'claude-code',
      name: 'Claude Code',
      icon: '🤖',
      format: 'claude-md',
      description: 'Claude Code CLI dengan CLAUDE.md dan slash commands',
      promptTemplate: function (spec, projectName) {
        var lines = [];
        lines.push('# CLAUDE.md - ' + projectName);
        lines.push('');
        lines.push('## Project Overview');
        lines.push(projectName + ' - ' + (spec && spec.summary && spec.summary.oneLiner ? spec.summary.oneLiner : 'Project'));
        lines.push('');
        lines.push('## Architecture');
        lines.push('- Stack: ' + (spec && spec.meta && spec.meta.stackPref ? spec.meta.stackPref : 'TBD'));
        lines.push('- Lihat specs/ untuk requirements dan design');
        lines.push('');
        lines.push('## Commands');
        lines.push('- Build: npm run build');
        lines.push('- Test: npm test');
        lines.push('- Lint: npm run lint');
        lines.push('');
        lines.push('## Workflow');
        lines.push('1. Baca AGENTS.md untuk aturan eksekusi');
        lines.push('2. Baca TASKS.md untuk daftar task');
        lines.push('3. Kerjakan satu task per sesi');
        lines.push('4. Update checkbox setelah selesai');
        lines.push('5. Jalankan test sebelum commit');
        lines.push('');
        lines.push('## Constraints');
        lines.push('- Jangan ubah file di luar scope');
        lines.push('- Jangan commit tanpa test hijau');
        lines.push('- Gunakan conventional commits');
        return lines.join('\n');
      },
      bestPractices: [
        'Gunakan /init untuk generate CLAUDE.md otomatis',
        'Gunakan --allowedTools untuk restrict akses',
        'Gunakan /compact untuk hemat token',
        'Gunakan MCP servers untuk integrasi eksternal',
        'Gunakan /review untuk code review'
      ],
      integration: 'Letakkan CLAUDE.md di root repo. Claude Code membacanya otomatis saat startup.'
    },
    'copilot': {
      id: 'copilot',
      name: 'GitHub Copilot',
      icon: '🐙',
      format: 'copilot-instructions',
      description: 'GitHub Copilot dengan .github/copilot-instructions.md',
      promptTemplate: function (spec, projectName) {
        var lines = [];
        lines.push('# Copilot Instructions - ' + projectName);
        lines.push('');
        lines.push('## Project');
        lines.push(projectName);
        lines.push('');
        lines.push('## Stack');
        lines.push(spec && spec.meta && spec.meta.stackPref ? spec.meta.stackPref : 'TBD');
        lines.push('');
        lines.push('## Guidelines');
        lines.push('- Ikuti pola yang sudah ada di codebase');
        lines.push('- Gunakan nama variabel deskriptif');
        lines.push('- Tambahkan komentar untuk logika kompleks');
        lines.push('- Handle error dengan try-catch');
        lines.push('- Tulis test untuk setiap fungsi baru');
        lines.push('');
        lines.push('## File Structure');
        lines.push('Lihat AGENTS.md untuk struktur proyek dan aturan.');
        return lines.join('\n');
      },
      bestPractices: [
        'Letakkan di .github/copilot-instructions.md',
        'Gunakan @workspace untuk context',
        'Gunakan /fix untuk perbaikan',
        'Gunakan /explain untuk dokumentasi',
        'Gunakan /tests untuk generate test'
      ],
      integration: 'Buat file .github/copilot-instructions.md. Copilot akan membacanya otomatis.'
    },
    'windsurf': {
      id: 'windsurf',
      name: 'Windsurf',
      icon: '🏄',
      format: 'windsurf-rules',
      description: 'Windsurf (Codeium) dengan .windsurfrules',
      promptTemplate: function (spec, projectName) {
        var lines = [];
        lines.push('# .windsurfrules - ' + projectName);
        lines.push('');
        lines.push('## Context');
        lines.push('Project: ' + projectName);
        lines.push('Stack: ' + (spec && spec.meta && spec.meta.stackPref ? spec.meta.stackPref : 'TBD'));
        lines.push('');
        lines.push('## Rules');
        lines.push('- Ikuti arsitektur yang sudah ada');
        lines.push('- Jangan ubah file di luar scope task');
        lines.push('- Gunakan naming convention yang konsisten');
        lines.push('- Tambahkan test untuk setiap perubahan');
        lines.push('- Jalankan linter sebelum selesai');
        lines.push('');
        lines.push('## References');
        lines.push('Baca specs/ untuk requirements dan design.');
        lines.push('Baca TASKS.md untuk daftar task.');
        return lines.join('\n');
      },
      bestPractices: [
        'Gunakan Cascade untuk multi-step edits',
        'Set .windsurfrules di root',
        'Gunakan @codebase untuk context',
        'Aktifkan auto-complete untuk speed',
        'Gunakan /explain untuk dokumentasi'
      ],
      integration: 'Letakkan .windsurfrules di root repo. Windsurf membacanya otomatis.'
    },
    'aider': {
      id: 'aider',
      name: 'Aider',
      icon: '🔧',
      format: 'aider-config',
      description: 'Aider CLI dengan .aider.conf.yml dan conventions',
      promptTemplate: function (spec, projectName) {
        var lines = [];
        lines.push('# Aider Configuration - ' + projectName);
        lines.push('');
        lines.push('## Conventions');
        lines.push('auto-commits: true');
        lines.push('dirty-commits: false');
        lines.push('attribute-author: false');
        lines.push('attribute-committer: false');
        lines.push('');
        lines.push('## Read Files');
        lines.push('read: AGENTS.md');
        lines.push('read: TASKS.md');
        lines.push('read: specs/' + (spec && spec.meta && spec.meta.slug ? spec.meta.slug : 'produk') + '/requirements.md');
        lines.push('');
        lines.push('## Instructions');
        lines.push('Kerjakan satu task per sesi. Update checkbox setelah selesai.');
        lines.push('Jalankan test sebelum commit. Gunakan conventional commits.');
        return lines.join('\n');
      },
      bestPractices: [
        'Gunakan --read untuk context files',
        'Gunakan /add untuk menambah file',
        'Gunakan /diff untuk review changes',
        'Gunakan /test untuk run tests',
        'Gunakan /commit untuk commit otomatis'
      ],
      integration: 'Buat .aider.conf.yml di root. Aider membacanya saat startup.'
    },
    'devin': {
      id: 'devin',
      name: 'Devin',
      icon: '🧠',
      format: 'devin-instructions',
      description: 'Devin AI Software Engineer dengan knowledge base',
      promptTemplate: function (spec, projectName) {
        var lines = [];
        lines.push('# Devin Instructions - ' + projectName);
        lines.push('');
        lines.push('## Project');
        lines.push(projectName);
        lines.push('Stack: ' + (spec && spec.meta && spec.meta.stackPref ? spec.meta.stackPref : 'TBD'));
        lines.push('');
        lines.push('## Setup');
        lines.push('1. Clone repository');
        lines.push('2. Install dependencies');
        lines.push('3. Baca AGENTS.md untuk aturan');
        lines.push('4. Baca TASKS.md untuk daftar task');
        lines.push('');
        lines.push('## Execution');
        lines.push('Kerjakan task satu per satu. Update checkbox setelah selesai.');
        lines.push('Jalankan test sebelum PR. Buat PR untuk setiap task.');
        lines.push('');
        lines.push('## Constraints');
        lines.push('Jangan ubah file di luar scope task.');
        lines.push('Semua perubahan harus memiliki test.');
        return lines.join('\n');
      },
      bestPractices: [
        'Buat Devin Knowledge dengan docs proyek',
        'Gunakan Devin Playbooks untuk workflow',
        'Set approval mode untuk review',
        'Gunakan Devin Search untuk codebase exploration',
        'Monitor progress via Devin dashboard'
      ],
      integration: 'Upload ke Devin Knowledge base. Devin akan menggunakan sebagai context.'
    }
  };

  function getAgent(id) { return AGENTS[id] || null; }
  function listAgents() { return Object.keys(AGENTS).map(function (k) { return AGENTS[k]; }); }
  function agentIds() { return Object.keys(AGENTS); }

  function generatePrompt(agentId, spec, projectName) {
    var agent = getAgent(agentId);
    if (!agent) return null;
    return agent.promptTemplate(spec || {}, projectName || 'Produk');
  }

  function generateAllPrompts(spec, projectName) {
    var out = {};
    Object.keys(AGENTS).forEach(function (id) {
      out[id] = generatePrompt(id, spec, projectName);
    });
    return out;
  }

  function matchAgent(hint) {
    hint = String(hint || '').toLowerCase();
    if (/cursor/.test(hint)) return 'cursor';
    if (/claude/.test(hint)) return 'claude-code';
    if (/copilot|github/.test(hint)) return 'copilot';
    if (/windsurf|codeium/.test(hint)) return 'windsurf';
    if (/aider/.test(hint)) return 'aider';
    if (/devin/.test(hint)) return 'devin';
    return null;
  }

  function agentComparison() {
    return Object.keys(AGENTS).map(function (id) {
      var a = AGENTS[id];
      return {
        id: a.id,
        name: a.name,
        icon: a.icon,
        format: a.format,
        description: a.description,
        bestPractices: a.bestPractices,
        integration: a.integration
      };
    });
  }

  window.AgentPromptLibrary = {
    AGENTS: AGENTS,
    getAgent: getAgent,
    listAgents: listAgents,
    agentIds: agentIds,
    generatePrompt: generatePrompt,
    generateAllPrompts: generateAllPrompts,
    matchAgent: matchAgent,
    agentComparison: agentComparison
  };
})();
