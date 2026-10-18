/* GenPRD: jembatan kompatibilitas.
   Isi generator pindah ke spec.js (Spec.build) dan spec-render.js
   (SpecRender.markdown). Fungsi ini dipertahankan supaya pemanggil lama
   (render, exporter, tes) tetap bekerja tanpa perubahan. */
window.GenPRD = function (a, score) {
  return window.SpecRender.markdown(window.Spec.build(a, score));
};
