/* PRD Onboarding & Guided Tour untuk PRD Studio.
   Sistem tur terpandu untuk pengguna baru dengan step-by-step
   highlight dan progress tracking. ES5 murni tanpa bundler. */
(function () {
  function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  var TOUR_STEPS = [
    { id: 'welcome', title: 'Selamat Datang', body: 'PRD Studio membantu Anda membuat PRD profesional secara terstruktur.', target: null },
    { id: 'wizard', title: 'Wizard PRD', body: 'Isi wizard langkah demi langkah untuk membangun PRD Anda.', target: '#wizard' },
    { id: 'stack', title: 'Stack Matrix', body: 'Pilih stack teknologi dari 4 kategori: Frontend, Backend, Database, Infra.', target: '#stack-matrix' },
    { id: 'quality', title: 'Quality Gate', body: 'Cek kualitas PRD Anda dengan 5 dimensi penilaian.', target: '#quality-gate' },
    { id: 'kanban', title: 'Task Kanban', body: 'Pecah PRD menjadi task granular dengan checkpoint Frontend Mockup First.', target: '#kanban' },
    { id: 'export', title: 'Export', body: 'Export PRD ke berbagai format: Notion, Confluence, Jira, GitHub.', target: '#export' },
    { id: 'done', title: 'Selesai', body: 'Anda siap membuat PRD pertama Anda!', target: null }
  ];

  function createTour() {
    return { steps: TOUR_STEPS.slice(), currentIndex: 0, completed: false, skipped: false };
  }

  function currentStep(tour) {
    if (!tour || !tour.steps || tour.currentIndex >= tour.steps.length) return null;
    return tour.steps[tour.currentIndex];
  }

  function nextStep(tour) {
    if (!tour) return null;
    if (tour.currentIndex < tour.steps.length - 1) {
      tour.currentIndex++;
    } else {
      tour.completed = true;
    }
    return currentStep(tour);
  }

  function prevStep(tour) {
    if (!tour) return null;
    if (tour.currentIndex > 0) {
      tour.currentIndex--;
    }
    return currentStep(tour);
  }

  function skipTour(tour) {
    if (!tour) return;
    tour.skipped = true;
    tour.completed = true;
  }

  function progress(tour) {
    if (!tour || !tour.steps || tour.steps.length === 0) return 0;
    return Math.round((tour.currentIndex / (tour.steps.length - 1)) * 100);
  }

  function isComplete(tour) {
    return !!(tour && (tour.completed || tour.skipped));
  }

  function resetTour(tour) {
    if (!tour) return;
    tour.currentIndex = 0;
    tour.completed = false;
    tour.skipped = false;
  }

  function goToStep(tour, stepId) {
    if (!tour || !tour.steps) return null;
    for (var i = 0; i < tour.steps.length; i++) {
      if (tour.steps[i].id === stepId) {
        tour.currentIndex = i;
        return tour.steps[i];
      }
    }
    return null;
  }

  function totalSteps(tour) {
    return (tour && tour.steps) ? tour.steps.length : 0;
  }

  window.PRDOnboarding = {
    TOUR_STEPS: TOUR_STEPS,
    createTour: createTour,
    currentStep: currentStep,
    nextStep: nextStep,
    prevStep: prevStep,
    skipTour: skipTour,
    progress: progress,
    isComplete: isComplete,
    resetTour: resetTour,
    goToStep: goToStep,
    totalSteps: totalSteps
  };
})();
