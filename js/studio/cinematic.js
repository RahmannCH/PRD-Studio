/* Cinematic 3D Visual & Audio Design System untuk HyperFrames Storyboard.
   Menyediakan rig kamera 3D, tumpukan kedalaman, pencahayaan, VFX, tata suara
   spasial, grammar transisi, dan color grading layaknya produksi video profesional.
   ES5 murni tanpa bundler. */
(function () {
  var esc = (window.Exporter && window.Exporter.escMd) || function (x) { return String(x || ''); };

  function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  /* ===== Rig Kamera 3D ===== */
  var CAMERA_RIGS = {
    'dolly-in': { id: 'dolly-in', name: 'Dolly In Dramatis', movement: 'Majuan linier sumbu Z menuju subjek', axis: 'Z', easing: 'power3.inOut', depth: 'foreground -> subject', dof: 'shallow (f/1.8)', parallax: 'high' },
    'orbit-360': { id: 'orbit-360', name: 'Orbit 360 Derajat', movement: 'Rotasi kamera mengelilingi subjek pada sumbu Y', axis: 'Y', easing: 'sine.inOut', depth: 'subject center', dof: 'deep (f/8)', parallax: 'medium' },
    'crane-up': { id: 'crane-up', name: 'Crane Up Reveal', movement: 'Naik vertikal lalu mundur memperlihatkan konteks', axis: 'Y+Z', easing: 'power2.out', depth: 'wide reveal', dof: 'deep', parallax: 'high' },
    'push-in': { id: 'push-in', name: 'Push In Subjek', movement: 'Dekatkan kamera ke wajah/objek kunci', axis: 'Z', easing: 'power4.out', depth: 'macro', dof: 'shallow', parallax: 'low' },
    'whip-pan': { id: 'whip-pan', name: 'Whip Pan Transisi', movement: 'Sapuan horizontal cepat antar adegan', axis: 'X', easing: 'expo.inOut', depth: 'flat', dof: 'deep', parallax: 'none' },
    'rack-focus': { id: 'rack-focus', name: 'Rack Focus', movement: 'Pindah fokus dari foreground ke background', axis: 'Z', easing: 'sine.out', depth: 'layered', dof: 'variable', parallax: 'medium' },
    'drone-flyover': { id: 'drone-flyover', name: 'Drone Flyover', movement: 'Terbang di atas landscape/semesta data', axis: 'Y+Z', easing: 'power1.inOut', depth: 'aerial', dof: 'deep', parallax: 'high' },
    'macro-push': { id: 'macro-push', name: 'Macro Push Detail', movement: 'Dekat ekstrem ke tekstur/permukaan', axis: 'Z', easing: 'power2.in', depth: 'macro', dof: 'shallow', parallax: 'low' },
    'cutaway-slice': { id: 'cutaway-slice', name: 'Irisan Melintang Isometrik (Cutaway)', movement: 'Kamera terkunci 45 derajat isometrik dengan bidang belah mengekspos interior subterranean', axis: 'Isometric-XYZ', easing: 'power2.out', depth: 'subsurface', dof: 'deep (f/5.6)', parallax: 'structured' },
    'spatial-match-cut': { id: 'spatial-match-cut', name: 'Spatial Anchor Match-Cut', movement: 'Subjek inti terkunci pada titik koordinat layar yang sama sementara dunia di belakangnya bertransformasi', axis: 'Locked-Anchor', easing: 'none', depth: 'anchored-subject', dof: 'variable', parallax: 'background-only' },
    'dutch-stress-angle': { id: 'dutch-stress-angle', name: 'Canted Dutch Stress Tilt', movement: 'Kamera miring 10 derajat menukik ke bawah mempertegas kegagalan mekanikal atau anomali', axis: 'Roll-Z', easing: 'back.out(1.4)', depth: 'low-angle-stress', dof: 'shallow (f/2.0)', parallax: 'high' },
    'scale-oscillator': { id: 'scale-oscillator', name: 'Macro-to-Micro Scale Sweep', movement: 'Swoop kamera dari observasi kosmik makro meluncur ke sampel fisik mikro dalam satu tarikan napas', axis: 'Hyper-Z', easing: 'expo.inOut', depth: 'macro -> micro', dof: 'adaptive', parallax: 'extreme' }
  };

  /* ===== Tumpukan Kedalaman 3D ===== */
  var DEPTH_STACKS = {
    '3-layer': { name: '3 Layer Standar', layers: [
      { id: 'fg', name: 'Foreground', z: 120, blur: 0, parallax: 1.4, opacity: 1.0, role: 'elemen UI / partikel depan' },
      { id: 'mg', name: 'Midground', z: 0, blur: 0, parallax: 1.0, opacity: 1.0, role: 'subjek utama / kartu' },
      { id: 'bg', name: 'Background', z: -240, blur: 4, parallax: 0.4, opacity: 0.7, role: 'lingkungan / gradient' }
    ]},
    '5-layer-cinematic': { name: '5 Layer Sinematik', layers: [
      { id: 'fg2', name: 'Foreground Extreme', z: 200, blur: 2, parallax: 1.8, opacity: 0.9, role: 'partikel / bokeh depan' },
      { id: 'fg', name: 'Foreground', z: 100, blur: 0, parallax: 1.4, opacity: 1.0, role: 'overlay / caption' },
      { id: 'mg', name: 'Midground', z: 0, blur: 0, parallax: 1.0, opacity: 1.0, role: 'subjek utama' },
      { id: 'bg', name: 'Background', z: -180, blur: 3, parallax: 0.5, opacity: 0.8, role: 'lingkungan' },
      { id: 'bg2', name: 'Background Deep', z: -400, blur: 8, parallax: 0.2, opacity: 0.5, role: 'skybox / gradient jauh' }
    ]},
    'flat-ui': { name: 'Flat UI (2D)', layers: [
      { id: 'mg', name: 'Midground', z: 0, blur: 0, parallax: 1.0, opacity: 1.0, role: 'UI tunggal' }
    ]},
    'cutaway-strata': { name: 'Cutaway Strata 4-Lapisan (Teknik & Subgrade)', layers: [
      { id: 'hud', name: 'HUD Top Pill & Dimensi', z: 150, blur: 0, parallax: 1.5, opacity: 1.0, role: 'top pill header, garis ukur dimensi, widget timbangan' },
      { id: 'surface', name: 'Lapisan Luar / Beban Kendaraan', z: 50, blur: 0, parallax: 1.15, opacity: 1.0, role: 'aspal aus, roda silinder pemadat, astronaut, kulit cryostat' },
      { id: 'subsurface', name: 'Irisan Dalam (Core Subterranean)', z: 0, blur: 0, parallax: 1.0, opacity: 1.0, role: 'batuan agregat pondasi, pori air, plasma ring, inti matahari' },
      { id: 'bg-env', name: 'Lingkungan Jauh / Kosmik', z: -320, blur: 6, parallax: 0.3, opacity: 0.65, role: 'horizon langit, fasilitas lab Hefei, tata surya' }
    ]}
  };

  /* ===== Rig Pencahayaan ===== */
  var LIGHTING_RIGS = {
    'studio-3point': { id: 'studio-3point', name: 'Studio 3-Point', key: { angle: 45, intensity: 1.0, color: '#FFFFFF' }, fill: { angle: -30, intensity: 0.4, color: '#BFD7FF' }, rim: { angle: 135, intensity: 0.7, color: '#7DD3FC' }, ambient: 0.15 },
    'dramatic-side': { id: 'dramatic-side', name: 'Dramatic Side Light', key: { angle: 80, intensity: 1.2, color: '#FFD9A8' }, fill: { angle: -60, intensity: 0.2, color: '#3B82F6' }, rim: { angle: 160, intensity: 0.9, color: '#F472B6' }, ambient: 0.08 },
    'neon-cyber': { id: 'neon-cyber', name: 'Neon Cyberpunk', key: { angle: 30, intensity: 1.1, color: '#00F0FF' }, fill: { angle: -45, intensity: 0.5, color: '#FF00E5' }, rim: { angle: 120, intensity: 1.0, color: '#7C3AED' }, ambient: 0.12 },
    'warm-documentary': { id: 'warm-documentary', name: 'Warm Documentary', key: { angle: 40, intensity: 0.9, color: '#FFE4C4' }, fill: { angle: -25, intensity: 0.45, color: '#FDE68A' }, rim: { angle: 150, intensity: 0.5, color: '#F59E0B' }, ambient: 0.2 },
    'cold-forensic': { id: 'cold-forensic', name: 'Cold Forensic', key: { angle: 50, intensity: 1.0, color: '#E0F2FE' }, fill: { angle: -40, intensity: 0.3, color: '#94A3B8' }, rim: { angle: 130, intensity: 0.6, color: '#38BDF8' }, ambient: 0.1 }
  };

  /* ===== VFX Presets ===== */
  var VFX_PRESETS = {
    'film-grain': { id: 'film-grain', name: 'Film Grain', intensity: 0.03, blend: 'overlay', desc: 'Butiran film 3% untuk tekstur sinematik' },
    'bokeh-particles': { id: 'bokeh-particles', name: 'Bokeh Particles', count: 40, size: '2-8px', color: 'accent', blur: 6, desc: 'Partikel bokeh mengambang di foreground' },
    'chromatic-aberration': { id: 'chromatic-aberration', name: 'Chromatic Aberration', offset: '1.5px', blend: 'screen', desc: 'Pemisahan RGB pada edge untuk kesan lensa' },
    'lens-flare': { id: 'lens-flare', name: 'Lens Flare', intensity: 0.6, color: 'warm', desc: 'Flare lensa saat cahaya key menembus' },
    'motion-blur-streak': { id: 'motion-blur-streak', name: 'Motion Blur Streak', length: '12px', angle: 'direction', desc: 'Garis motion blur pada objek bergerak cepat' },
    'glitch-digital': { id: 'glitch-digital', name: 'Digital Glitch', intensity: 0.4, rgbSplit: true, scanlines: true, desc: 'Glitch digital untuk transisi data' },
    'volumetric-light': { id: 'volumetric-light', name: 'Volumetric Light', density: 0.3, color: 'key', desc: 'Sinar volumetrik dari key light' },
    'depth-of-field': { id: 'depth-of-field', name: 'Depth of Field', fStop: 1.8, focusDistance: 'subject', blurBg: 6, desc: 'Bokeh latar belakang tajam' },
    'stress-vector-cone': { id: 'stress-vector-cone', name: 'Kerucut Distribusi Tegangan Fisik', intensity: 0.85, color: '#FF7A00', desc: 'Vektor gradien tekanan beban ban ke tanah dasar' },
    'magnetic-flux-field': { id: 'magnetic-flux-field', name: 'Garis Medan Magnetik Helikal', count: 24, size: '1.5px', color: '#00F0FF', desc: 'Kurungan medan magnet toroid mengurung plasma fusi' },
    'hydraulic-pumping-spray': { id: 'hydraulic-pumping-spray', name: 'Aksi Pompa Hidrolik Pori Air', intensity: 0.8, color: '#38BDF8', desc: 'Semburan air bertekanan tinggi akibat kompresi ban kendaraan' },
    'fresnel-planet-glow': { id: 'fresnel-planet-glow', name: 'Fresnel Atmosphere Limb Glow', intensity: 1.2, color: '#60A5FA', desc: 'Pendaran atmosfer tipis pada siluet tepi planet di ruang hampa' }
  };

  /* ===== Grammar Transisi ===== */
  var TRANSITIONS = {
    'cut': { id: 'cut', name: 'Hard Cut', duration: 0, easing: 'none', desc: 'Potongan tegas tanpa transisi' },
    'whip-pan': { id: 'whip-pan', name: 'Whip Pan', duration: 0.35, easing: 'expo.inOut', desc: 'Sapuan kamera cepat dengan motion blur' },
    'morph': { id: 'morph', name: 'Morph Transform', duration: 0.6, easing: 'power2.inOut', desc: 'Transformasi bentuk dari satu objek ke objek lain' },
    'match-cut': { id: 'match-cut', name: 'Match Cut', duration: 0.0, easing: 'none', desc: 'Potongan berdasarkan kesamaan bentuk/gerak' },
    'fade': { id: 'fade', name: 'Cross Fade', duration: 0.5, easing: 'sine.inOut', desc: 'Fade silang antar adegan' },
    'glitch': { id: 'glitch', name: 'Glitch Cut', duration: 0.25, easing: 'steps(4)', desc: 'Potongan dengan glitch digital' },
    'iris': { id: 'iris', name: 'Iris Wipe', duration: 0.7, easing: 'power2.out', desc: 'Bukaan iris dari titik fokus' },
    'zoom-blur': { id: 'zoom-blur', name: 'Zoom Blur', duration: 0.4, easing: 'expo.out', desc: 'Zoom dengan radial blur' }
  };

  /* ===== Color Grading LUT ===== */
  var COLOR_GRADES = {
    'cinematic-teal-orange': { id: 'cinematic-teal-orange', name: 'Teal & Orange', shadows: '#0D3B4C', highlights: '#F5A623', contrast: 1.15, saturation: 1.1, desc: 'Klasik sinema Hollywood' },
    'cold-forensic': { id: 'cold-forensic', name: 'Cold Forensic', shadows: '#0F172A', highlights: '#E2E8F0', contrast: 1.25, saturation: 0.85, desc: 'Dingin investigatif' },
    'warm-documentary': { id: 'warm-documentary', name: 'Warm Documentary', shadows: '#2A1F14', highlights: '#FDE68A', contrast: 1.05, saturation: 1.05, desc: 'Hangat dokumenter' },
    'neon-cyber': { id: 'neon-cyber', name: 'Neon Cyber', shadows: '#0B0420', highlights: '#00F0FF', contrast: 1.3, saturation: 1.25, desc: 'Neon cyberpunk' },
    'monochrome-ink': { id: 'monochrome-ink', name: 'Monochrome Ink', shadows: '#000000', highlights: '#FFFFFF', contrast: 1.4, saturation: 0.0, desc: 'Hitam putih tinta' },
    'golden-hour': { id: 'golden-hour', name: 'Golden Hour', shadows: '#3B2F1E', highlights: '#FFD08A', contrast: 1.1, saturation: 1.15, desc: 'Cahaya emas senja' }
  };

  /* ===== Bus Audio Spasial ===== */
  var AUDIO_BUSES = {
    'dialogue': { id: 'dialogue', name: 'Dialogue (VO)', freq: '80Hz-12kHz', compression: 'light', reverb: 'dry', pan: 'center', ducking: 'none' },
    'sfx': { id: 'sfx', name: 'SFX', freq: '40Hz-16kHz', compression: 'medium', reverb: 'room', pan: 'positional', ducking: 'duck under dialogue -6dB' },
    'music': { id: 'music', name: 'Music Bed', freq: '20Hz-18kHz', compression: 'heavy', reverb: 'hall', pan: 'stereo', ducking: 'duck under dialogue -8dB' },
    'ambience': { id: 'ambience', name: 'Ambience', freq: '20Hz-8kHz', compression: 'light', reverb: 'natural', pan: 'stereo', ducking: 'duck under dialogue -4dB' }
  };

  /* ===== Komposer Scene ===== */
  function composeScene(beat, concept, tempo, ratio) {
    beat = beat || {};
    concept = concept || {};
    tempo = tempo || { bpm: 120, barSec: 2.0 };
    var isVertical = ratio === '9:16';
    var cid = (concept && concept.id) || '';

    var rigId = (cid === 'kinetic-term') ? 'push-in' : 'dolly-in';
    if (cid === 'engineering-cutaway') {
      if (beat.id === 'beat-01') rigId = 'dutch-stress-angle';
      else if (beat.id === 'beat-02') rigId = 'cutaway-slice';
      else if (beat.id === 'beat-03') rigId = 'spatial-match-cut';
      else if (beat.id === 'beat-04') rigId = 'cutaway-slice';
      else rigId = 'macro-push';
    } else if (cid === 'scientific-explainer') {
      if (beat.id === 'beat-01') rigId = 'scale-oscillator';
      else if (beat.id === 'beat-02') rigId = 'orbit-360';
      else if (beat.id === 'beat-03') rigId = 'macro-push';
      else if (beat.id === 'beat-04') rigId = 'spatial-match-cut';
      else rigId = 'scale-oscillator';
    } else if (cid === 'causal-metaphor') {
      if (beat.id === 'beat-01') rigId = 'spatial-match-cut';
      else if (beat.id === 'beat-02') rigId = 'dutch-stress-angle';
      else if (beat.id === 'beat-03') rigId = 'rack-focus';
      else if (beat.id === 'beat-04') rigId = 'cutaway-slice';
      else rigId = 'crane-up';
    } else if (cid === '3d-explainer') {
      if (beat.id === 'beat-01') rigId = 'dutch-stress-angle';
      else if (beat.id === 'beat-02') rigId = 'orbit-360';
      else if (beat.id === 'beat-03') rigId = 'rack-focus';
      else if (beat.id === 'beat-04') rigId = 'spatial-match-cut';
      else rigId = 'crane-up';
    } else {
      if (beat.id === 'beat-01') rigId = 'push-in';
      if (beat.id === 'beat-02') rigId = 'orbit-360';
      if (beat.id === 'beat-03') rigId = 'rack-focus';
      if (beat.id === 'beat-05') rigId = 'crane-up';
    }
    var rig = CAMERA_RIGS[rigId] || CAMERA_RIGS['dolly-in'];

    var depthKey = (cid === 'object-relay' || cid === '3d-explainer') ? '5-layer-cinematic' : '3-layer';
    if (cid === 'engineering-cutaway' || cid === 'scientific-explainer') depthKey = 'cutaway-strata';
    var depth = DEPTH_STACKS[depthKey] || DEPTH_STACKS['3-layer'];

    var lightKey = (cid === 'cyber-surveillance' || cid === '3d-explainer') ? 'neon-cyber' : ((cid === 'investigative-leak') ? 'cold-forensic' : ((cid === 'engineering-cutaway') ? 'chiaroscuro' : ((cid === 'scientific-explainer') ? 'rim-dramatic' : 'studio-3point')));
    var light = LIGHTING_RIGS[lightKey] || LIGHTING_RIGS['studio-3point'];

    var vfx = ['film-grain', 'depth-of-field'];
    if (cid === 'engineering-cutaway') {
      if (beat.id === 'beat-01') vfx.push('stress-vector-cone');
      if (beat.id === 'beat-03') vfx.push('hydraulic-pumping-spray');
      if (beat.id === 'beat-04') vfx.push('motion-blur-streak');
    } else if (cid === 'scientific-explainer') {
      if (beat.id === 'beat-01') vfx.push('fresnel-planet-glow');
      if (beat.id === 'beat-03') vfx.push('magnetic-flux-field');
      if (beat.id === 'beat-04') vfx.push('bokeh-particles');
    } else {
      if (beat.id === 'beat-01') vfx.push('volumetric-light');
      if (beat.id === 'beat-03') vfx.push('motion-blur-streak');
      if (beat.id === 'beat-04') vfx.push('bokeh-particles');
    }

    var transId = (beat.id === 'beat-01') ? 'zoom-blur' : ((beat.id === 'beat-02') ? ((cid === 'scientific-explainer' || cid === 'causal-metaphor') ? 'morph' : 'whip-pan') : ((beat.id === 'beat-03') ? 'match-cut' : ((beat.id === 'beat-04') ? 'iris-in' : 'cross-dissolve')));
    var transition = TRANSITIONS[transId] || TRANSITIONS['cut'];

    var gradeKey = (cid === 'visual-journal') ? 'warm-documentary' : ((cid === 'cyber-surveillance' || cid === '3d-explainer') ? 'neon-cyber' : ((cid === 'investigative-leak') ? 'cold-forensic' : ((cid === 'engineering-cutaway') ? 'bleach-bypass' : ((cid === 'scientific-explainer') ? 'technicolor-contrast' : 'cinematic-teal-orange'))));
    var grade = COLOR_GRADES[gradeKey] || COLOR_GRADES['cinematic-teal-orange'];

    return {
      cameraRig: rig,
      depthStack: depth,
      lighting: light,
      vfx: vfx.map(function (k) { return VFX_PRESETS[k]; }).filter(Boolean),
      transition: transition,
      colorGrade: grade,
      aspectRatio: isVertical ? '9:16' : '16:9',
      resolution: isVertical ? '1080x1920' : '1920x1080',
      fps: 30
    };
  }

  function soundDesign(beat, concept, tempo) {
    beat = beat || {};
    tempo = tempo || { bpm: 120 };
    var buses = ['dialogue', 'sfx', 'music', 'ambience'];
    var musicMood = 'Tensi Investigasi & Misteri';
    if (beat.id === 'beat-02') musicMood = 'Optimisme & Solusi Futuristik';
    if (beat.id === 'beat-05') musicMood = 'Krisis & Urgensi Tinggi';
    return {
      buses: buses.map(function (k) { return AUDIO_BUSES[k]; }),
      musicMood: musicMood,
      bpm: tempo.bpm,
      ducking: 'VO aktif: music -8dB, ambience -4dB, SFX -6dB',
      spatial: 'Stereo L/R dengan panning posisional pada SFX; VO center mono',
      masterLoudness: '-14 LUFS (standar platform video)'
    };
  }

  function listCatalog() {
    return {
      cameraRigs: Object.keys(CAMERA_RIGS).map(function (k) { return CAMERA_RIGS[k]; }),
      depthStacks: Object.keys(DEPTH_STACKS).map(function (k) { return DEPTH_STACKS[k]; }),
      lightingRigs: Object.keys(LIGHTING_RIGS).map(function (k) { return LIGHTING_RIGS[k]; }),
      vfxPresets: Object.keys(VFX_PRESETS).map(function (k) { return VFX_PRESETS[k]; }),
      transitions: Object.keys(TRANSITIONS).map(function (k) { return TRANSITIONS[k]; }),
      colorGrades: Object.keys(COLOR_GRADES).map(function (k) { return COLOR_GRADES[k]; }),
      audioBuses: Object.keys(AUDIO_BUSES).map(function (k) { return AUDIO_BUSES[k]; })
    };
  }

  window.Cinematic = {
    CAMERA_RIGS: CAMERA_RIGS,
    DEPTH_STACKS: DEPTH_STACKS,
    LIGHTING_RIGS: LIGHTING_RIGS,
    VFX_PRESETS: VFX_PRESETS,
    TRANSITIONS: TRANSITIONS,
    COLOR_GRADES: COLOR_GRADES,
    AUDIO_BUSES: AUDIO_BUSES,
    composeScene: composeScene,
    soundDesign: soundDesign,
    listCatalog: listCatalog
  };
})();
