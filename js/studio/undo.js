/* Undo: Ctrl+Z / Ctrl+Shift+Z untuk jawaban wizard.
   Menyimpan snapshot JSON field jawaban (tanpa history/lastResult yang besar).
   Stack maksimum 30. mark() dipanggil SEBELUM mutasi (collectData) supaya
   undo mengembalikan nilai sebelum ketikan/chip/select terakhir.
   Debounce 350ms: ketikan deras menjadi satu titik undo, bukan per huruf. */
(function () {
  var MAX = 30;
  var undoStack = [];
  var redoStack = [];
  var pendingBefore = null;
  var markTimer = null;

  function answersView(d) {
    if (!d || typeof d !== 'object') return {};
    var out = {};
    Object.keys(d).forEach(function (k) {
      if (k === 'history' || k === 'lastResult') return;
      var v = d[k];
      /* salin dangkal: array/string/number/bool; objek (aiNotes, checks) di-clone. */
      out[k] = (v && typeof v === 'object') ? JSON.parse(JSON.stringify(v)) : v;
    });
    return out;
  }

  function snapStr(d) { return JSON.stringify(answersView(d)); }

  function currentData() {
    return (window.StudioState && window.StudioState.data) || {};
  }

  function applyView(view) {
    var S = window.StudioState;
    if (!S) return false;
    var d = S.data;
    Object.keys(view).forEach(function (k) { d[k] = view[k]; });
    /* field yang ada di data tapi tidak di view (jarang) biarkan — view
       selalu berisi seluruh SHARE_KEYS kecuali history/lastResult. */
    S.save();
    return true;
  }

  /* Panggil SEBELUM mutasi. Menyimpan "sebelum" bila belum ada pending. */
  function mark() {
    if (pendingBefore != null) return; /* sudah ada dalam jendela debounce */
    pendingBefore = snapStr(currentData());
    clearTimeout(markTimer);
    markTimer = setTimeout(function () {
      /* jendela selesai: commit "sebelum" ke stack, buang redo. */
      if (pendingBefore != null) {
        undoStack.push(pendingBefore);
        if (undoStack.length > MAX) undoStack.shift();
        redoStack.length = 0;
        pendingBefore = null;
      }
    }, 350);
  }

  /* Paksa commit pending (mis. sebelum undo manual) agar snapshot terakhir
     tidak hilang. */
  function flushMark() {
    clearTimeout(markTimer);
    if (pendingBefore != null) {
      undoStack.push(pendingBefore);
      if (undoStack.length > MAX) undoStack.shift();
      redoStack.length = 0;
      pendingBefore = null;
    }
  }

  function undo() {
    flushMark();
    if (!undoStack.length) return false;
    var cur = snapStr(currentData());
    var prev = undoStack.pop();
    redoStack.push(cur);
    try { applyView(JSON.parse(prev)); } catch (e) { return false; }
    return true;
  }

  function redo() {
    flushMark();
    if (!redoStack.length) return false;
    var cur = snapStr(currentData());
    var next = redoStack.pop();
    undoStack.push(cur);
    try { applyView(JSON.parse(next)); } catch (e) { return false; }
    return true;
  }

  function canUndo() { return undoStack.length > 0 || pendingBefore != null; }
  function canRedo() { return redoStack.length > 0; }

  function clear() { undoStack.length = 0; redoStack.length = 0; pendingBefore = null; clearTimeout(markTimer); }

  window.Undo = {
    mark: mark,
    undo: undo,
    redo: redo,
    canUndo: canUndo,
    canRedo: canRedo,
    clear: clear,
    _stacks: function () { return { undo: undoStack.length, redo: redoStack.length }; }
  };
})();
