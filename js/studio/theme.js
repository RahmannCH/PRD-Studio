/* Tema gelap terang. Disimpan lokal, hormati preferensi OS saat pertama kali. */
(function () {
  var KEY = 'prd_studio_theme';
  function current() {
    try {
      var s = localStorage.getItem(KEY);
      if (s === 'light' || s === 'dark') return s;
    } catch (e) {}
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    return 'dark';
  }
  function apply(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(KEY, t); } catch (e) {}
    var b = document.getElementById('themeToggle');
    if (b) {
      b.textContent = t === 'light' ? 'Tema: Terang' : 'Tema: Gelap';
      b.setAttribute('aria-pressed', t === 'light' ? 'true' : 'false');
    }
    /* meta theme-color ikut tema (browser chrome di mobile) */
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'light' ? '#E8EDF5' : '#0B132B');
    /* render ulang diagram Mermaid dengan palet yang cocok */
    if (window.mermaidThemeSync) window.mermaidThemeSync();
  }
  document.addEventListener('DOMContentLoaded', function () {
    apply(current());
    var b = document.getElementById('themeToggle');
    if (b) b.addEventListener('click', function () {
      var now = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      apply(now);
    });
  });
  window.StudioTheme = { apply: apply };
})();
