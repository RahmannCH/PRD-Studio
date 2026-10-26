/* PRD Version Control & Diff Engine untuk PRD Studio.
   Pelacakan versi PRD, diff antar versi, rollback, dan branching ringan.
   Setiap snapshot menyimpan data + spec + metadata. Diff menghasilkan daftar
   perubahan per field (added/removed/changed) dengan nilai lama dan baru.
   ES5 murni tanpa bundler. */
(function () {
  function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  function snapshotId() { return 'v-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6); }

  function createSnapshot(data, spec, opts) {
    opts = opts || {};
    var snap = {
      id: opts.id || snapshotId(),
      label: opts.label || ('Versi ' + new Date().toLocaleString('id-ID')),
      branch: opts.branch || 'main',
      parent: opts.parent || null,
      data: data ? JSON.parse(JSON.stringify(data)) : {},
      spec: spec ? JSON.parse(JSON.stringify(spec)) : null,
      score: (spec && spec.score) || (data && data.lastResult && data.lastResult.score) || 0,
      createdAt: new Date().toISOString(),
      author: opts.author || 'user',
      note: opts.note || ''
    };
    // Hapus lastResult dari data snapshot untuk menghemat ruang
    if (snap.data && snap.data.lastResult) delete snap.data.lastResult;
    return snap;
  }

  function diffSnapshots(oldSnap, newSnap) {
    oldSnap = oldSnap || {};
    newSnap = newSnap || {};
    var oldData = oldSnap.data || {};
    var newData = newSnap.data || {};
    var changes = [];

    // Diff data fields
    var allKeys = {};
    Object.keys(oldData).forEach(function (k) { allKeys[k] = true; });
    Object.keys(newData).forEach(function (k) { allKeys[k] = true; });

    Object.keys(allKeys).forEach(function (key) {
      // Skip internal fields
      if (key === 'lastResult' || key === 'history' || key === 'checks') return;
      var oldVal = oldData[key];
      var newVal = newData[key];
      var oldStr = (oldVal === null || oldVal === undefined) ? '' : (typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal));
      var newStr = (newVal === null || newVal === undefined) ? '' : (typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal));

      if (oldStr === newStr) return;

      var type = 'changed';
      if (oldStr === '' && newStr !== '') type = 'added';
      if (oldStr !== '' && newStr === '') type = 'removed';

      changes.push({
        field: key,
        type: type,
        oldValue: oldVal,
        newValue: newVal,
        oldDisplay: oldStr.slice(0, 200),
        newDisplay: newStr.slice(0, 200)
      });
    });

    // Diff spec (summary level)
    if (oldSnap.spec && newSnap.spec) {
      var oldSpec = oldSnap.spec;
      var newSpec = newSnap.spec;
      // Compare stories count
      var oldStories = (oldSpec.stories || []).length;
      var newStories = (newSpec.stories || []).length;
      if (oldStories !== newStories) {
        changes.push({ field: 'spec.stories', type: 'changed', oldValue: oldStories, newValue: newStories, oldDisplay: oldStories + ' stories', newDisplay: newStories + ' stories' });
      }
      // Compare must-have count
      var oldMust = ((oldSpec.scope && oldSpec.scope.must) || []).length;
      var newMust = ((newSpec.scope && newSpec.scope.must) || []).length;
      if (oldMust !== newMust) {
        changes.push({ field: 'spec.scope.must', type: 'changed', oldValue: oldMust, newValue: newMust, oldDisplay: oldMust + ' must-have', newDisplay: newMust + ' must-have' });
      }
      // Compare NFR count
      var oldNfr = (oldSpec.nfr || []).length;
      var newNfr = (newSpec.nfr || []).length;
      if (oldNfr !== newNfr) {
        changes.push({ field: 'spec.nfr', type: 'changed', oldValue: oldNfr, newValue: newNfr, oldDisplay: oldNfr + ' NFR', newDisplay: newNfr + ' NFR' });
      }
      // Compare score
      if (oldSnap.score !== newSnap.score) {
        changes.push({ field: 'score', type: 'changed', oldValue: oldSnap.score, newValue: newSnap.score, oldDisplay: oldSnap.score + ' pts', newDisplay: newSnap.score + ' pts' });
      }
    }

    return {
      from: oldSnap.id,
      to: newSnap.id,
      fromLabel: oldSnap.label,
      toLabel: newSnap.label,
      changes: changes,
      addedCount: changes.filter(function (c) { return c.type === 'added'; }).length,
      removedCount: changes.filter(function (c) { return c.type === 'removed'; }).length,
      changedCount: changes.filter(function (c) { return c.type === 'changed'; }).length,
      totalChanges: changes.length
    };
  }

  function diffMarkdown(diffResult) {
    var d = diffResult || {};
    var lines = [];
    lines.push('# Diff: ' + (d.fromLabel || d.from) + ' → ' + (d.toLabel || d.to));
    lines.push('');
    lines.push('**Total perubahan: ' + (d.totalChanges || 0) + '** (tambah: ' + (d.addedCount || 0) + ', hapus: ' + (d.removedCount || 0) + ', ubah: ' + (d.changedCount || 0) + ')');
    lines.push('');
    if (!(d.changes || []).length) {
      lines.push('_Tidak ada perubahan._');
      return lines.join('\n');
    }
    lines.push('| Field | Tipe | Nilai Lama | Nilai Baru |');
    lines.push('|---|---|---|---|');
    (d.changes || []).forEach(function (c) {
      var typeLabel = c.type === 'added' ? '+ Tambah' : (c.type === 'removed' ? '- Hapus' : '~ Ubah');
      lines.push('| ' + c.field + ' | ' + typeLabel + ' | ' + (c.oldDisplay || '-') + ' | ' + (c.newDisplay || '-') + ' |');
    });
    return lines.join('\n');
  }

  /* ===== Version Store (localStorage) ===== */
  function listVersions(projectId) {
    try {
      var key = 'prd_studio_versions_' + (projectId || 'default');
      var raw = (window.localStorage && window.localStorage.getItem) ? window.localStorage.getItem(key) : null;
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function saveVersion(projectId, snapshot) {
    if (!snapshot) return false;
    try {
      var key = 'prd_studio_versions_' + (projectId || 'default');
      var list = listVersions(projectId);
      // Dedup by id
      var idx = -1;
      for (var i = 0; i < list.length; i++) { if (list[i].id === snapshot.id) { idx = i; break; } }
      if (idx > -1) list[idx] = snapshot; else list.unshift(snapshot);
      if (list.length > 50) list = list.slice(0, 50);
      if (window.localStorage && window.localStorage.setItem) window.localStorage.setItem(key, JSON.stringify(list));
      return true;
    } catch (e) { return false; }
  }

  function getVersion(projectId, id) {
    var list = listVersions(projectId);
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) return list[i]; }
    return null;
  }

  function deleteVersion(projectId, id) {
    try {
      var key = 'prd_studio_versions_' + (projectId || 'default');
      var list = listVersions(projectId).filter(function (s) { return s.id !== id; });
      if (window.localStorage && window.localStorage.setItem) window.localStorage.setItem(key, JSON.stringify(list));
      return true;
    } catch (e) { return false; }
  }

  function clearVersions(projectId) {
    try {
      var key = 'prd_studio_versions_' + (projectId || 'default');
      if (window.localStorage && window.localStorage.removeItem) window.localStorage.removeItem(key);
      return true;
    } catch (e) { return false; }
  }

  /* ===== Branch Management ===== */
  function listBranches(projectId) {
    var versions = listVersions(projectId);
    var branches = {};
    versions.forEach(function (v) { branches[v.branch || 'main'] = true; });
    if (!branches['main']) branches['main'] = true;
    return Object.keys(branches);
  }

  function versionsByBranch(projectId, branch) {
    return listVersions(projectId).filter(function (v) { return (v.branch || 'main') === branch; });
  }

  function rollback(projectId, versionId) {
    var snap = getVersion(projectId, versionId);
    if (!snap) return null;
    return { data: snap.data, spec: snap.spec, score: snap.score, label: snap.label };
  }

  function summarizeVersion(v) {
    v = v || {};
    return {
      id: v.id,
      label: v.label,
      branch: v.branch || 'main',
      score: v.score || 0,
      createdAt: v.createdAt,
      author: v.author,
      changeCount: v.changeCount || 0
    };
  }

  window.VersionControl = {
    createSnapshot: createSnapshot,
    diffSnapshots: diffSnapshots,
    diffMarkdown: diffMarkdown,
    listVersions: listVersions,
    saveVersion: saveVersion,
    getVersion: getVersion,
    deleteVersion: deleteVersion,
    clearVersions: clearVersions,
    listBranches: listBranches,
    versionsByBranch: versionsByBranch,
    rollback: rollback,
    summarizeVersion: summarizeVersion
  };
})();
