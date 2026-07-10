/* ==========================================================================
   SERENITY — script.js
   Vanilla JS only. Organized into small, focused modules that each own one
   feature. Every module is initialized once, at the bottom of the file.
   ========================================================================== */

(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const rand = (min, max) => min + Math.random() * (max - min);

  /* ------------------------------------------------------------------------
     MODULE: Audio Engine
     Every sound in Serenity is synthesized live with the Web Audio API —
     no external files to fetch, nothing to ever fail to load.
     ------------------------------------------------------------------------ */
  const AudioEngine = (() => {
    let ctx = null;
    let noiseBuffer = null;

    function getContext() {
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }

    function getNoiseBuffer(c) {
      if (noiseBuffer) return noiseBuffer;
      const length = c.sampleRate * 2;
      const buffer = c.createBuffer(1, length, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      noiseBuffer = buffer;
      return buffer;
    }

    function noiseSource(c) {
      const src = c.createBufferSource();
      src.buffer = getNoiseBuffer(c);
      src.loop = true;
      return src;
    }

    /** Low-frequency oscillator wired into a target AudioParam through a scaling gain. */
    function lfo(c, { freq = 0.15, depth = 200, target }) {
      const osc = c.createOscillator();
      osc.frequency.value = freq;
      const scale = c.createGain();
      scale.gain.value = depth;
      osc.connect(scale).connect(target);
      osc.start();
      return osc;
    }

    /** Schedules a repeating random one-shot event (chirp, crackle, chime...). */
    function scheduleRandomEvents(fn, minMs, maxMs) {
      let cancelled = false;
      const tick = () => {
        if (cancelled) return;
        fn();
        setTimeout(tick, rand(minMs, maxMs));
      };
      const id = setTimeout(tick, rand(minMs, maxMs));
      return () => { cancelled = true; clearTimeout(id); };
    }

    /* ---- Individual ambient "instruments" ---- */

    function rain(c, out) {
      const src = noiseSource(c);
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 700;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6500;
      src.connect(hp).connect(lp).connect(out);
      src.start();
      const lfoOsc = lfo(c, { freq: 0.08, depth: 800, target: lp.frequency });
      return () => { src.stop(); lfoOsc.stop(); };
    }

    function ocean(c, out) {
      const src = noiseSource(c);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      const swell = c.createGain(); swell.gain.value = 0.6;
      src.connect(lp).connect(swell).connect(out);
      src.start();
      const lfoOsc = lfo(c, { freq: 0.09, depth: 0.35, target: swell.gain });
      const lfoFreq = lfo(c, { freq: 0.05, depth: 500, target: lp.frequency });
      return () => { src.stop(); lfoOsc.stop(); lfoFreq.stop(); };
    }

    function fireplace(c, out) {
      const src = noiseSource(c);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
      const bed = c.createGain(); bed.gain.value = 0.5;
      src.connect(lp).connect(bed).connect(out);
      src.start();
      const stopCrackle = scheduleRandomEvents(() => {
        const crackle = c.createBufferSource();
        crackle.buffer = getNoiseBuffer(c);
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = rand(1200, 3200); bp.Q.value = 4;
        const g = c.createGain(); g.gain.value = 0;
        g.gain.setValueAtTime(0, c.currentTime);
        g.gain.linearRampToValueAtTime(rand(0.25, 0.5), c.currentTime + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + rand(0.05, 0.15));
        crackle.connect(bp).connect(g).connect(out);
        crackle.start();
        crackle.stop(c.currentTime + 0.2);
      }, 120, 500);
      return () => { src.stop(); stopCrackle(); };
    }

    function forestBed(c, out) {
      const src = noiseSource(c);
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.5;
      const g = c.createGain(); g.gain.value = 0.25;
      src.connect(bp).connect(g).connect(out);
      src.start();
      return () => src.stop();
    }

    function birdChirps(c, out) {
      const stop = scheduleRandomEvents(() => {
        const notes = [1600, 1800, 2100, 2400];
        let t = c.currentTime;
        const chirps = Math.floor(rand(2, 5));
        for (let i = 0; i < chirps; i++) {
          const osc = c.createOscillator(); osc.type = 'sine';
          const freq = notes[Math.floor(Math.random() * notes.length)];
          osc.frequency.setValueAtTime(freq, t);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.3, t + 0.06);
          const g = c.createGain();
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.18, t + 0.01);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
          osc.connect(g).connect(out);
          osc.start(t); osc.stop(t + 0.15);
          t += rand(0.1, 0.2);
        }
      }, 1500, 4500);
      return stop;
    }

    function forest(c, out) {
      const stopBed = forestBed(c, out);
      const stopBirds = birdChirps(c, out);
      return () => { stopBed(); stopBirds(); };
    }

    function coffeeShop(c, out) {
      const src = noiseSource(c);
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.7;
      const g = c.createGain(); g.gain.value = 0.35;
      src.connect(bp).connect(g).connect(out);
      src.start();
      const lfoOsc = lfo(c, { freq: 0.6, depth: 0.08, target: g.gain });
      const stopClink = scheduleRandomEvents(() => {
        const osc = c.createOscillator(); osc.type = 'triangle';
        osc.frequency.value = rand(1800, 3000);
        const gg = c.createGain();
        gg.gain.setValueAtTime(0.06, c.currentTime);
        gg.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
        osc.connect(gg).connect(out);
        osc.start(); osc.stop(c.currentTime + 0.25);
      }, 2000, 6000);
      return () => { src.stop(); lfoOsc.stop(); stopClink(); };
    }

    function piano(c, out) {
      const scale = [261.6, 293.7, 329.6, 392.0, 440.0]; // C major pentatonic
      let cancelled = false;
      const playNote = () => {
        if (cancelled) return;
        const freq = scale[Math.floor(Math.random() * scale.length)] * (Math.random() > 0.5 ? 1 : 2);
        const t = c.currentTime;
        const osc = c.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
        const osc2 = c.createOscillator(); osc2.type = 'sine'; osc2.frequency.value = freq * 2;
        const g = c.createGain(); g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.14, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, t + 2.6);
        const g2 = c.createGain(); g2.gain.value = 0.05;
        osc.connect(g).connect(out);
        osc2.connect(g2).connect(g);
        osc.start(t); osc2.start(t);
        osc.stop(t + 2.7); osc2.stop(t + 2.7);
        setTimeout(playNote, rand(1400, 3200));
      };
      playNote();
      return () => { cancelled = true; };
    }

    function windChimes(c, out) {
      const scale = [523.3, 587.3, 659.3, 784.0, 880.0, 987.8];
      const stop = scheduleRandomEvents(() => {
        const freq = scale[Math.floor(Math.random() * scale.length)];
        const t = c.currentTime;
        const osc = c.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
        const g = c.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.16, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
        osc.connect(g).connect(out);
        osc.start(t); osc.stop(t + 1.9);
      }, 600, 2200);
      return stop;
    }

    function whiteNoise(c, out) {
      const src = noiseSource(c);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 9000;
      src.connect(lp).connect(out);
      src.start();
      return () => src.stop();
    }

    function wind(c, out) {
      const src = noiseSource(c);
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.6;
      const g = c.createGain(); g.gain.value = 0.4;
      src.connect(bp).connect(g).connect(out);
      src.start();
      const lfoFreq = lfo(c, { freq: 0.12, depth: 250, target: bp.frequency });
      const lfoGain = lfo(c, { freq: 0.2, depth: 0.15, target: g.gain });
      return () => { src.stop(); lfoFreq.stop(); lfoGain.stop(); };
    }

    function thunder(c, out) {
      const stop = scheduleRandomEvents(() => {
        const src = c.createBufferSource();
        src.buffer = getNoiseBuffer(c);
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
        const g = c.createGain();
        const t = c.currentTime;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(rand(0.3, 0.55), t + rand(0.3, 0.8));
        g.gain.exponentialRampToValueAtTime(0.001, t + rand(2, 3.5));
        src.connect(lp).connect(g).connect(out);
        src.start(t); src.stop(t + 4);
      }, 6000, 16000);
      return stop;
    }

    function crickets(c, out) {
      const stop = scheduleRandomEvents(() => {
        let t = c.currentTime;
        const chirps = Math.floor(rand(3, 7));
        for (let i = 0; i < chirps; i++) {
          const osc = c.createOscillator(); osc.type = 'square'; osc.frequency.value = rand(3800, 4400);
          const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 4000; bp.Q.value = 8;
          const g = c.createGain();
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.05, t + 0.005);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
          osc.connect(bp).connect(g).connect(out);
          osc.start(t); osc.stop(t + 0.06);
          t += 0.09;
        }
      }, 300, 900);
      return stop;
    }

    function water(c, out) {
      const src = noiseSource(c);
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 1.2;
      const g = c.createGain(); g.gain.value = 0.22;
      src.connect(bp).connect(g).connect(out);
      src.start();
      const lfoOsc = lfo(c, { freq: 1.1, depth: 300, target: bp.frequency });
      return () => { src.stop(); lfoOsc.stop(); };
    }

    const builders = {
      rain, ocean, fireplace, forest, coffeeshop: coffeeShop, piano,
      windchimes: windChimes, whitenoise: whiteNoise, wind, thunder,
      birds: (c, out) => birdChirps(c, out), crickets, water,
    };

    /**
     * Starts a named ambient layer. Returns a controller with
     * setVolume(0-1) and stop().
     */
    function start(name, initialVolume = 0.6) {
      const c = getContext();
      const output = c.createGain();
      // Fade in smoothly rather than snapping straight to full volume —
      // every layer should arrive like a breath, not a switch flipping.
      output.gain.value = 0;
      output.gain.linearRampToValueAtTime(clamp(initialVolume, 0, 1), c.currentTime + 0.9);

      // An analyser sits between the sound and the speakers so the UI can
      // draw a live waveform without affecting what's actually heard.
      const analyser = c.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      output.connect(analyser).connect(c.destination);

      const stopFn = builders[name] ? builders[name](c, output) : () => {};
      let stopped = false;
      return {
        analyser,
        setVolume(v) {
          output.gain.cancelScheduledValues(c.currentTime);
          output.gain.linearRampToValueAtTime(clamp(v, 0, 1), c.currentTime + 0.25);
        },
        stop() {
          if (stopped) return;
          stopped = true;
          // Fade out first, then release the nodes — avoids an audible click.
          output.gain.cancelScheduledValues(c.currentTime);
          output.gain.setValueAtTime(output.gain.value, c.currentTime);
          output.gain.linearRampToValueAtTime(0, c.currentTime + 0.5);
          setTimeout(() => {
            try { stopFn(); } catch (e) { /* already stopped */ }
            output.disconnect();
            analyser.disconnect();
          }, 550);
        },
      };
    }

    /** A short, gentle chime used for the focus-timer completion moment. */
    function playChime() {
      const c = getContext();
      const notes = [523.3, 659.3, 784.0];
      notes.forEach((freq, i) => {
        const t = c.currentTime + i * 0.18;
        const osc = c.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
        const g = c.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.2, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
        osc.connect(g).connect(c.destination);
        osc.start(t); osc.stop(t + 1.7);
      });
    }

    return { start, playChime };
  })();

  /* ------------------------------------------------------------------------
     MODULE: Mindful-minutes tracker
     A quiet, local-only counter of time spent breathing or focusing today.
     Nothing leaves the browser; it simply resets when the date changes.
     ------------------------------------------------------------------------ */
  const MindfulTracker = (() => {
    const STORAGE_KEY = 'serenity-mindful';
    const todayKey = () => new Date().toDateString();

    function read() {
      try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (raw && raw.date === todayKey()) return raw;
      } catch (e) { /* ignore malformed storage */ }
      return { date: todayKey(), seconds: 0 };
    }

    let state = read();
    const badge = document.getElementById('mindfulBadge');

    function render() {
      const minutes = Math.floor(state.seconds / 60);
      if (badge) badge.textContent = `${minutes} min of calm today`;
    }

    function addSecond() {
      state.seconds += 1;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
      render();
    }

    render();
    return { addSecond };
  })();

  /* ------------------------------------------------------------------------
     MODULE: Toast — brief, gentle notifications
     ------------------------------------------------------------------------ */
  const Toast = (() => {
    const el = document.getElementById('toast');
    let hideTimer = null;

    function show(message, duration = 3600) {
      if (!el) return;
      clearTimeout(hideTimer);
      el.textContent = message;
      el.classList.add('is-visible');
      hideTimer = setTimeout(() => el.classList.remove('is-visible'), duration);
    }

    return { show };
  })();

  /* ------------------------------------------------------------------------
     MODULE: Now Playing bar — persistent player with a live visualizer
     ------------------------------------------------------------------------ */
  const NowPlayingBar = (() => {
    const bar = document.getElementById('nowPlaying');
    const titleEl = document.getElementById('nowPlayingTitle');
    const canvas = document.getElementById('nowPlayingViz');
    const closeBtn = document.getElementById('nowPlayingClose');
    const ctx = canvas ? canvas.getContext('2d') : null;
    let rafId = null;
    let onStop = null;

    function resizeCanvas() {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = 56 * dpr;
      canvas.height = 32 * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(analyser) {
      if (!ctx) return;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const barCount = 14;
      const barWidth = 56 / barCount;

      function frame() {
        analyser.getByteFrequencyData(data);
        ctx.clearRect(0, 0, 56, 32);
        for (let i = 0; i < barCount; i++) {
          const value = data[i + 2] || 0;
          const h = Math.max(2, (value / 255) * 28);
          ctx.fillStyle = 'rgba(201,165,116,0.9)';
          const x = i * barWidth + 1;
          ctx.fillRect(x, 32 - h, barWidth - 1.5, h);
        }
        rafId = requestAnimationFrame(frame);
      }
      frame();
    }

    function show(title, analyser, stopCallback) {
      if (!bar) return;
      titleEl.textContent = title;
      onStop = stopCallback;
      bar.hidden = false;
      bar.classList.add('is-entering');
      resizeCanvas();
      cancelAnimationFrame(rafId);
      draw(analyser);
    }

    function hide() {
      if (!bar) return;
      cancelAnimationFrame(rafId);
      bar.hidden = true;
      bar.classList.remove('is-entering');
      onStop = null;
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (onStop) onStop();
        hide();
      });
    }

    return { show, hide };
  })();

  /* ------------------------------------------------------------------------
     MODULE: Theme (dark mode) toggle
     ------------------------------------------------------------------------ */
  function initTheme() {
    const toggle = document.getElementById('themeToggle');
    const stored = localStorage.getItem('serenity-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = stored || (prefersDark ? 'dark' : 'light');
    applyTheme(initial);

    toggle.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('serenity-theme', next);
    });

    function applyTheme(theme) {
      if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        toggle.setAttribute('aria-pressed', 'true');
      } else {
        document.documentElement.removeAttribute('data-theme');
        toggle.setAttribute('aria-pressed', 'false');
      }
    }
  }

  /* ------------------------------------------------------------------------
     MODULE: Navbar (scroll shrink + mobile menu + smooth active state)
     ------------------------------------------------------------------------ */
  function initNavbar() {
    const navbar = document.getElementById('navbar');
    const burger = document.getElementById('burgerBtn');
    const links = document.getElementById('navLinks');

    window.addEventListener('scroll', () => {
      navbar.classList.toggle('is-scrolled', window.scrollY > 40);
    }, { passive: true });

    burger.addEventListener('click', () => {
      const isOpen = links.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(isOpen));
      burger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    });

    links.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        links.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ------------------------------------------------------------------------
     MODULE: Scroll reveal (IntersectionObserver)
     ------------------------------------------------------------------------ */
  function initScrollReveal() {
    const items = document.querySelectorAll('.reveal');
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    items.forEach((el) => observer.observe(el));
  }

  /* ------------------------------------------------------------------------
     MODULE: Breathing exercise
     4s inhale → 4s hold → 6s exhale → 2s hold, looped, with a running timer.
     ------------------------------------------------------------------------ */
  function initBreathing() {
    const orb = document.getElementById('breatheOrb');
    const label = document.getElementById('breatheLabel');
    const count = document.getElementById('breatheCount');
    const timerDisplay = document.getElementById('breatheTimer');
    const toggleBtn = document.getElementById('breatheToggle');
    const resetBtn = document.getElementById('breatheReset');

    const PATTERNS = {
      calm: [
        { name: 'phase-in', text: 'Breathe in', duration: 4 },
        { name: 'phase-hold', text: 'Hold', duration: 4 },
        { name: 'phase-out', text: 'Breathe out', duration: 6 },
        { name: 'phase-hold', text: 'Hold', duration: 2 },
      ],
      box: [
        { name: 'phase-in', text: 'Breathe in', duration: 4 },
        { name: 'phase-hold', text: 'Hold', duration: 4 },
        { name: 'phase-out', text: 'Breathe out', duration: 4 },
        { name: 'phase-hold', text: 'Hold', duration: 4 },
      ],
      '478': [
        { name: 'phase-in', text: 'Breathe in', duration: 4 },
        { name: 'phase-hold', text: 'Hold', duration: 7 },
        { name: 'phase-out', text: 'Breathe out', duration: 8 },
      ],
    };

    let phases = PATTERNS.calm;
    let running = false;
    let phaseIndex = 0;
    let phaseSecondsLeft = phases[0].duration;
    let totalSeconds = 0;
    let intervalId = null;

    function renderPhase() {
      const phase = phases[phaseIndex];
      orb.classList.remove('phase-in', 'phase-hold', 'phase-out');
      orb.classList.add(phase.name);
      label.textContent = phase.text;
      count.textContent = String(phaseSecondsLeft);
    }

    function tick() {
      totalSeconds++;
      phaseSecondsLeft--;
      const mins = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
      const secs = String(totalSeconds % 60).padStart(2, '0');
      timerDisplay.textContent = `${mins}:${secs}`;
      MindfulTracker.addSecond();
      if (totalSeconds > 0 && totalSeconds % 300 === 0) {
        Toast.show(`${totalSeconds / 60} minutes of steady breathing. Keep going, or rest here.`);
      }

      if (phaseSecondsLeft <= 0) {
        phaseIndex = (phaseIndex + 1) % phases.length;
        phaseSecondsLeft = phases[phaseIndex].duration;
      }
      renderPhase();
    }

    function start() {
      running = true;
      toggleBtn.textContent = 'Pause session';
      renderPhase();
      intervalId = setInterval(tick, 1000);
    }

    function pause() {
      running = false;
      toggleBtn.textContent = 'Resume session';
      clearInterval(intervalId);
      label.textContent = 'Paused';
    }

    function reset() {
      pause();
      phaseIndex = 0;
      phaseSecondsLeft = phases[0].duration;
      totalSeconds = 0;
      timerDisplay.textContent = '00:00';
      orb.classList.remove('phase-in', 'phase-hold', 'phase-out');
      label.textContent = 'Begin';
      count.textContent = '';
      toggleBtn.textContent = 'Begin session';
    }

    function toggle() { running ? pause() : start(); }

    function setPattern(key) {
      phases = PATTERNS[key] || PATTERNS.calm;
      reset();
    }

    toggleBtn.addEventListener('click', toggle);
    orb.addEventListener('click', toggle);
    resetBtn.addEventListener('click', reset);

    document.querySelectorAll('.breathe__patterns .chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.breathe__patterns .chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
        chip.setAttribute('aria-pressed', 'true');
        setPattern(chip.dataset.pattern);
      });
    });
  }

  /* ------------------------------------------------------------------------
     MODULE: Sound library
     Renders cards from data, wires up exclusive playback + volume.
     ------------------------------------------------------------------------ */
  const SOUND_ICONS = {
    rain: '<path d="M6 14v4M10 15v5M14 14v4M18 15v5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M5 11a4 4 0 0 1 .3-8 5 5 0 0 1 9.6-1.2A4.5 4.5 0 0 1 19 11H5Z" stroke="currentColor" stroke-width="1.6"/>',
    ocean: '<path d="M2 12c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M2 17c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    fireplace: '<path d="M12 21c4 0 6-2.5 6-6 0-3-2-4-2-4 .3 2-1 3-1 3 .5-3-2-5-2-7.5C10 9 7 11 7 15c0 3.5 2 6 5 6Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
    forest: '<path d="M12 2 7 10h2l-4 6h5v6h4v-6h5l-4-6h2L12 2Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
    coffeeshop: '<path d="M5 9h11v5a5 5 0 0 1-5 5H9a4 4 0 0 1-4-4V9Z" stroke="currentColor" stroke-width="1.6"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16" stroke="currentColor" stroke-width="1.6"/><path d="M8 4c0 1-1 1-1 2s1 1 1 2M12 4c0 1-1 1-1 2s1 1 1 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
    piano: '<rect x="3" y="6" width="18" height="12" rx="1.5" stroke="currentColor" stroke-width="1.6"/><path d="M7 6v8M11 6v8M15 6v8M19 6v8" stroke="currentColor" stroke-width="1.2"/>',
    windchimes: '<path d="M6 4h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8 4v6M12 4v9M16 4v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="15" r="1" fill="currentColor"/><circle cx="16" cy="12" r="1" fill="currentColor"/>',
    whitenoise: '<path d="M3 12h2l2-6 3 12 3-15 3 12 2-6h3" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/>',
  };

  const SOUND_DEFS = [
    { key: 'rain', title: 'Rain', desc: 'A soft, steady shower', gradient: 'linear-gradient(160deg,#8FA9B8,#4F6B7A)' },
    { key: 'ocean', title: 'Ocean Waves', desc: 'Slow tide, distant and warm', gradient: 'linear-gradient(160deg,#7FB8C9,#2E5C6E)' },
    { key: 'fireplace', title: 'Fireplace', desc: 'A gentle, crackling glow', gradient: 'linear-gradient(160deg,#D9A46B,#8A4B2A)' },
    { key: 'forest', title: 'Forest', desc: 'Leaves, wind, quiet birdsong', gradient: 'linear-gradient(160deg,#9CBF8E,#48664A)' },
    { key: 'coffeeshop', title: 'Coffee Shop', desc: 'Low murmur, warm ambience', gradient: 'linear-gradient(160deg,#C9AE8C,#7A5B3E)' },
    { key: 'piano', title: 'Piano', desc: 'Slow, generative melody', gradient: 'linear-gradient(160deg,#B7A7CE,#5C4A7A)' },
    { key: 'windchimes', title: 'Wind Chimes', desc: 'Bright tones on a passing breeze', gradient: 'linear-gradient(160deg,#AFC9D8,#5E7F92)' },
    { key: 'whitenoise', title: 'White Noise', desc: 'Even, comforting hush', gradient: 'linear-gradient(160deg,#C7C4BC,#77746C)' },
  ];

  function initSoundLibrary() {
    const grid = document.getElementById('soundGrid');
    let activeCard = null;
    let activeController = null;

    grid.innerHTML = SOUND_DEFS.map((def) => `
      <article class="sound-card" data-key="${def.key}" role="listitem">
        <div class="sound-card__art" style="background:${def.gradient}">
          <svg viewBox="0 0 24 24" fill="none">${SOUND_ICONS[def.key]}</svg>
        </div>
        <div class="sound-card__body">
          <h3 class="sound-card__title">${def.title}</h3>
          <p class="sound-card__desc">${def.desc}</p>
          <div class="sound-card__controls">
            <button class="sound-card__play" aria-label="Play ${def.title}">
              <svg class="icon-play" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5Z"/></svg>
              <svg class="icon-pause" viewBox="0 0 24 24" fill="currentColor" style="display:none"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
            </button>
            <div class="sound-card__meta">
              <div class="sound-card__progress"><div class="sound-card__progress-bar"></div></div>
              <label class="visually-hidden" for="vol-${def.key}">${def.title} volume</label>
              <input class="sound-card__volume" id="vol-${def.key}" type="range" min="0" max="100" value="60" aria-label="${def.title} volume">
            </div>
          </div>
        </div>
      </article>
    `).join('');

    grid.querySelectorAll('.sound-card').forEach((card) => {
      const key = card.dataset.key;
      const playBtn = card.querySelector('.sound-card__play');
      const volume = card.querySelector('.sound-card__volume');

      playBtn.addEventListener('click', () => {
        const isPlaying = card.classList.contains('is-playing');

        // Stop whatever else is currently playing — only one sound at a time.
        if (activeCard && activeCard !== card) {
          activeCard.classList.remove('is-playing');
          activeCard.querySelector('.sound-card__play').setAttribute('aria-label', `Play ${activeCard.querySelector('.sound-card__title').textContent}`);
          if (activeController) activeController.stop();
        }

        if (isPlaying) {
          card.classList.remove('is-playing');
          playBtn.setAttribute('aria-label', `Play ${def(card).title}`);
          if (activeController) activeController.stop();
          activeCard = null; activeController = null;
          NowPlayingBar.hide();
        } else {
          card.classList.add('is-playing');
          playBtn.setAttribute('aria-label', `Pause ${def(card).title}`);
          activeController = AudioEngine.start(key, volume.value / 100);
          activeCard = card;
          NowPlayingBar.show(def(card).title, activeController.analyser, () => {
            card.classList.remove('is-playing');
            playBtn.setAttribute('aria-label', `Play ${def(card).title}`);
            if (activeController) activeController.stop();
            activeCard = null; activeController = null;
          });
        }
      });

      volume.addEventListener('input', () => {
        if (card === activeCard && activeController) {
          activeController.setVolume(volume.value / 100);
        }
      });
    });

    function def(card) {
      return SOUND_DEFS.find((d) => d.key === card.dataset.key);
    }
  }

  /* ------------------------------------------------------------------------
     MODULE: Ambient mood mixer — multiple simultaneous toggled layers
     ------------------------------------------------------------------------ */
  const MIXER_ICON = '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>';
  const MIXER_DEFS = [
    { key: 'rain', label: 'Rain' },
    { key: 'thunder', label: 'Thunder' },
    { key: 'wind', label: 'Wind' },
    { key: 'birds', label: 'Birds' },
    { key: 'fireplace', label: 'Fire' },
    { key: 'crickets', label: 'Night Crickets' },
    { key: 'water', label: 'Water' },
  ];

  function initMixer() {
    const grid = document.getElementById('mixerGrid');
    const masterSlider = document.getElementById('mixerMaster');
    const BASE_VOLUME = 0.45;
    const controllers = {};
    let master = (masterSlider ? Number(masterSlider.value) : 70) / 100;

    grid.innerHTML = MIXER_DEFS.map((def) => `
      <button class="mixer__toggle" data-key="${def.key}" role="listitem" aria-pressed="false">
        <svg class="mixer__icon" viewBox="0 0 24 24" fill="none">${MIXER_ICON}</svg>
        <span class="mixer__label">${def.label}</span>
        <span class="switch" aria-hidden="true"></span>
      </button>
    `).join('');

    grid.querySelectorAll('.mixer__toggle').forEach((toggle) => {
      toggle.addEventListener('click', () => {
        const key = toggle.dataset.key;
        const isActive = toggle.classList.toggle('is-active');
        toggle.setAttribute('aria-pressed', String(isActive));

        if (isActive) {
          controllers[key] = AudioEngine.start(key, BASE_VOLUME * master);
        } else if (controllers[key]) {
          controllers[key].stop();
          delete controllers[key];
        }
      });
    });

    // One master fader scales every active layer together, so the whole
    // blend rises and falls as a single, cohesive atmosphere.
    if (masterSlider) {
      masterSlider.addEventListener('input', () => {
        master = Number(masterSlider.value) / 100;
        Object.values(controllers).forEach((controller) => controller.setVolume(BASE_VOLUME * master));
      });
    }
  }

  /* ------------------------------------------------------------------------
     MODULE: Focus timer (pomodoro-style)
     ------------------------------------------------------------------------ */
  function initFocusTimer() {
    const timeEl = document.getElementById('focusTime');
    const stateEl = document.getElementById('focusState');
    const ring = document.getElementById('focusRingProgress');
    const card = document.querySelector('.focus__card');
    const startBtn = document.getElementById('focusStart');
    const pauseBtn = document.getElementById('focusPause');
    const resetBtn = document.getElementById('focusReset');
    const presetButtons = document.querySelectorAll('.focus__presets .chip');
    const sessionsEl = document.getElementById('focusSessions');

    const CIRCUMFERENCE = 2 * Math.PI * 98;
    let totalSeconds = 5 * 60;
    let secondsLeft = totalSeconds;
    let intervalId = null;
    let running = false;

    // Daily session count, persisted locally and reset on a new day.
    const SESSIONS_KEY = 'serenity-focus-sessions';
    function loadSessions() {
      try {
        const raw = JSON.parse(localStorage.getItem(SESSIONS_KEY) || 'null');
        if (raw && raw.date === new Date().toDateString()) return raw.count;
      } catch (e) { /* ignore malformed storage */ }
      return 0;
    }
    let sessionCount = loadSessions();
    function renderSessions() {
      sessionsEl.textContent = `${sessionCount} session${sessionCount === 1 ? '' : 's'} completed today`;
    }
    function recordSession() {
      sessionCount++;
      try { localStorage.setItem(SESSIONS_KEY, JSON.stringify({ date: new Date().toDateString(), count: sessionCount })); } catch (e) { /* storage unavailable */ }
      renderSessions();
    }

    function render() {
      const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
      const secs = String(secondsLeft % 60).padStart(2, '0');
      timeEl.textContent = `${mins}:${secs}`;
      const progress = 1 - secondsLeft / totalSeconds;
      ring.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - progress));
    }

    function setMinutes(minutes) {
      totalSeconds = minutes * 60;
      secondsLeft = totalSeconds;
      card.classList.remove('is-complete');
      stateEl.textContent = 'ready';
      render();
    }

    function tick() {
      secondsLeft--;
      render();
      MindfulTracker.addSecond();
      if (secondsLeft <= 0) {
        complete();
      }
    }

    function start() {
      running = true;
      stateEl.textContent = 'focusing';
      startBtn.disabled = true;
      pauseBtn.disabled = false;
      intervalId = setInterval(tick, 1000);
    }

    function pause() {
      running = false;
      stateEl.textContent = 'paused';
      clearInterval(intervalId);
      startBtn.disabled = false;
      pauseBtn.disabled = true;
    }

    function reset() {
      clearInterval(intervalId);
      running = false;
      secondsLeft = totalSeconds;
      card.classList.remove('is-complete');
      stateEl.textContent = 'ready';
      startBtn.disabled = false;
      pauseBtn.disabled = true;
      render();
    }

    function complete() {
      clearInterval(intervalId);
      running = false;
      stateEl.textContent = 'complete';
      card.classList.add('is-complete');
      startBtn.disabled = false;
      pauseBtn.disabled = true;
      recordSession();
      Toast.show('Session complete — nice work taking that time.');
      try { AudioEngine.playChime(); } catch (e) { /* audio unavailable */ }
    }

    startBtn.addEventListener('click', start);
    pauseBtn.addEventListener('click', pause);
    resetBtn.addEventListener('click', reset);

    presetButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (running) pause();
        presetButtons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        setMinutes(Number(btn.dataset.minutes));
      });
    });

    render();
    renderSessions();
  }

  /* ------------------------------------------------------------------------
     MODULE: Quote generator
     ------------------------------------------------------------------------ */
  const QUOTES = [
    { text: 'Peace is not the absence of noise, but the presence of stillness within it.', author: 'Serenity' },
    { text: 'Slowness is not a delay. It is a different kind of arrival.', author: 'Serenity' },
    { text: 'The quietest room in the house is the one inside your own breath.', author: 'Serenity' },
    { text: 'You do not have to hold the whole day at once. Just this breath.', author: 'Serenity' },
    { text: 'Rest is not earned. It is simply allowed.', author: 'Serenity' },
    { text: 'Let the moment be unfinished. Not everything needs an ending today.', author: 'Serenity' },
    { text: 'Somewhere, rain is falling gently, and it is not in a hurry either.', author: 'Serenity' },
    { text: 'Your mind is not a machine to optimize. It is a garden to tend.', author: 'Serenity' },
    { text: 'A calm mind is not empty — it is spacious.', author: 'Serenity' },
    { text: 'Exhale a little longer than you inhaled. That is the whole secret.', author: 'Serenity' },
  ];

  function initQuoteGenerator() {
    const textEl = document.getElementById('quoteText');
    const authorEl = document.getElementById('quoteAuthor');
    const btn = document.getElementById('quoteBtn');
    let lastIndex = -1;

    function showRandomQuote() {
      let index = lastIndex;
      while (index === lastIndex) index = Math.floor(Math.random() * QUOTES.length);
      lastIndex = index;

      textEl.classList.add('is-fading');
      authorEl.classList.add('is-fading');

      setTimeout(() => {
        textEl.textContent = QUOTES[index].text;
        authorEl.textContent = `— ${QUOTES[index].author}`;
        textEl.classList.remove('is-fading');
        authorEl.classList.remove('is-fading');
      }, 300);
    }

    btn.addEventListener('click', showRandomQuote);
  }

  /* ------------------------------------------------------------------------
     MODULE: Daily mood check
     ------------------------------------------------------------------------ */
  function initMoodCheck() {
    const buttons = document.querySelectorAll('.mood__btn');
    const response = document.getElementById('moodResponse');

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        response.textContent = `Feeling ${btn.dataset.mood.toLowerCase()} today — we're glad you're here.`;
        response.classList.add('is-visible');
      });
    });
  }

  /* ------------------------------------------------------------------------
     MODULE: Nature gallery — generated scenes + mouse-driven parallax tilt
     ------------------------------------------------------------------------ */
  const NATURE_DEFS = [
    { key: 'mountains', caption: 'Mountains', sub: 'Alpine air, wide silence', gradient: 'linear-gradient(180deg,#DCEEFF 0%,#B9CFE0 35%,#7D93A8 60%,#4E5F70 100%)' },
    { key: 'ocean', caption: 'Ocean', sub: 'Slow tide, endless horizon', gradient: 'linear-gradient(180deg,#E8F4F8 0%,#9FD0DE 40%,#3E7A8C 75%,#204F5C 100%)' },
    { key: 'rain', caption: 'Rain', sub: 'A soft grey afternoon', gradient: 'linear-gradient(180deg,#F1EEFF 0%,#C9C7E0 40%,#6E6C88 80%,#3E3D52 100%)' },
    { key: 'forest', caption: 'Forest', sub: 'Filtered light, quiet paths', gradient: 'linear-gradient(180deg,#F7F3EC 0%,#C7D8B8 35%,#6E8C5C 70%,#33452B 100%)' },
    { key: 'sky', caption: 'Sky', sub: 'Nowhere to be, ever', gradient: 'linear-gradient(180deg,#FFFFFF 0%,#DCEEFF 35%,#9AC3E8 70%,#5C8FC2 100%)' },
    { key: 'aurora', caption: 'Aurora', sub: 'Colour, moving slowly', gradient: 'linear-gradient(180deg,#12141C 0%,#1F3A4A 30%,#2E6B5E 55%,#7FBF9E 75%,#F1EEFF 100%)' },
  ];

  /** Lightweight, CSS-only "illustration" layered into each scene — no image assets required. */
  function natureDecor(key) {
    switch (key) {
      case 'mountains':
        return '<div class="decor"><div class="decor-mountain decor-mountain--back"></div><div class="decor-mountain decor-mountain--front"></div><div class="decor-fog"></div></div>';
      case 'ocean':
        return '<div class="decor"><div class="decor-wave decor-wave--3"></div><div class="decor-wave decor-wave--1"></div><div class="decor-wave decor-wave--2"></div></div>';
      case 'rain':
        return '<div class="decor"><div class="decor-rain"></div><div class="decor-fog"></div></div>';
      case 'forest':
        return '<div class="decor"><div class="decor-tree decor-tree--1"></div><div class="decor-tree decor-tree--2"></div><div class="decor-tree decor-tree--3"></div><div class="decor-fog"></div></div>';
      case 'sky':
        return '<div class="decor"><div class="decor-sun"></div><div class="decor-cloud decor-cloud--1"></div><div class="decor-cloud decor-cloud--2"></div></div>';
      case 'aurora':
        return '<div class="decor"><div class="decor-stars"></div><div class="decor-ribbon decor-ribbon--1"></div><div class="decor-ribbon decor-ribbon--2"></div></div>';
      default:
        return '';
    }
  }

  const VIEW_ICON = '<svg viewBox="0 0 24 24" fill="none"><path d="M4 12s3.5-6 8-6 8 6 8 6-3.5 6-8 6-8-6-8-6Z" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="2.4" stroke="currentColor" stroke-width="1.6"/></svg>';

  function initNatureGallery() {
    const grid = document.getElementById('natureGrid');
    grid.innerHTML = NATURE_DEFS.map((def) => `
      <figure class="nature-card" data-key="${def.key}" tabindex="0" aria-label="${def.caption} — press to view full scene">
        <div class="nature-card__scene" style="background:${def.gradient}">
          ${natureDecor(def.key)}
          <div class="nature-card__grain"></div>
        </div>
        <div class="nature-card__scrim"></div>
        <div class="nature-card__view">${VIEW_ICON}<span>View</span></div>
        <figcaption class="nature-card__caption">
          <span class="nature-card__title">${def.caption}</span>
          <span class="nature-card__sub">${def.sub}</span>
        </figcaption>
      </figure>
    `).join('');

    if (prefersReducedMotion) return;

    grid.querySelectorAll('.nature-card').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(800px) rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  /* ------------------------------------------------------------------------
     MODULE: Mini zen garden — canvas sandbox with drifting leaves & ripples
     ------------------------------------------------------------------------ */
  function initZenGarden() {
    const canvas = document.getElementById('zenCanvas');
    const ctx = canvas.getContext('2d');
    let width, height, dpr;
    let mouseX = -1000, mouseY = -1000;
    let leaves = [];
    let ripples = [];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedLeaves();
    }

    function seedLeaves() {
      const count = Math.round((width * height) / 9000);
      leaves = Array.from({ length: count }, () => {
        const baseX = rand(0, width);
        const baseY = rand(0, height);
        return {
          baseX, baseY, x: baseX, y: baseY,
          size: rand(4, 9),
          hue: rand(28, 42),
          rot: rand(0, Math.PI * 2),
          drift: rand(0, Math.PI * 2),
        };
      });
    }

    function drawSand() {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#F1EAD9');
      grad.addColorStop(1, '#E4D8C0');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Raked lines for texture
      ctx.strokeStyle = 'rgba(160,140,105,0.12)';
      ctx.lineWidth = 1;
      for (let y = 10; y < height; y += 14) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= width; x += 20) {
          ctx.lineTo(x, y + Math.sin((x + y) * 0.02) * 3);
        }
        ctx.stroke();
      }
    }

    function drawRipples() {
      ripples.forEach((r) => {
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(120,100,70,${r.alpha})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        r.radius += 1.1;
        r.alpha -= 0.012;
      });
      ripples = ripples.filter((r) => r.alpha > 0);
    }

    function drawLeaves(time) {
      leaves.forEach((leaf) => {
        const dx = leaf.x - mouseX;
        const dy = leaf.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const repelRadius = 90;

        if (dist < repelRadius) {
          const force = (repelRadius - dist) / repelRadius;
          leaf.x += (dx / (dist || 1)) * force * 4;
          leaf.y += (dy / (dist || 1)) * force * 4;
        } else {
          // Ease back toward base position, plus a gentle idle drift
          leaf.x += (leaf.baseX - leaf.x) * 0.02 + Math.sin(time * 0.0006 + leaf.drift) * 0.15;
          leaf.y += (leaf.baseY - leaf.y) * 0.02 + Math.cos(time * 0.0006 + leaf.drift) * 0.15;
        }

        ctx.save();
        ctx.translate(leaf.x, leaf.y);
        ctx.rotate(leaf.rot + Math.sin(time * 0.0003 + leaf.drift) * 0.3);
        ctx.fillStyle = `hsla(${leaf.hue}, 55%, 42%, 0.75)`;
        ctx.beginPath();
        ctx.ellipse(0, 0, leaf.size, leaf.size * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    let lastRipple = 0;
    function handlePointer(x, y, force) {
      mouseX = x; mouseY = y;
      const now = performance.now();
      if (force || now - lastRipple > 260) {
        ripples.push({ x, y, radius: 2, alpha: 0.35 });
        lastRipple = now;
      }
    }

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      handlePointer(e.clientX - rect.left, e.clientY - rect.top, false);
    });
    canvas.addEventListener('mouseleave', () => { mouseX = -1000; mouseY = -1000; });
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      handlePointer(e.clientX - rect.left, e.clientY - rect.top, true);
    });
    canvas.addEventListener('touchmove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const t = e.touches[0];
      handlePointer(t.clientX - rect.left, t.clientY - rect.top, false);
    }, { passive: true });

    function loop(time) {
      ctx.clearRect(0, 0, width, height);
      drawSand();
      drawRipples();
      drawLeaves(time);
      requestAnimationFrame(loop);
    }

    window.addEventListener('resize', resize);
    resize();

    if (prefersReducedMotion) {
      drawSand();
      drawLeaves(0);
    } else {
      requestAnimationFrame(loop);
    }
  }

  /* ------------------------------------------------------------------------
     MODULE: Global floating particles (subtle, behind all content)
     ------------------------------------------------------------------------ */
  function initParticles() {
    if (prefersReducedMotion) return;
    const canvas = document.getElementById('particle-canvas');
    const ctx = canvas.getContext('2d');
    let width, height, particles;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      const count = Math.round((width * height) / 55000);
      particles = Array.from({ length: count }, () => ({
        x: rand(0, width),
        y: rand(0, height),
        r: rand(1, 2.6),
        speed: rand(0.06, 0.22),
        drift: rand(0, Math.PI * 2),
        opacity: rand(0.08, 0.22),
      }));
    }

    function loop(time) {
      ctx.clearRect(0, 0, width, height);
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(160,130,90,0.4)';
      particles.forEach((p) => {
        p.y -= p.speed;
        p.x += Math.sin(time * 0.0003 + p.drift) * 0.15;
        if (p.y < -10) { p.y = height + 10; p.x = rand(0, width); }
        ctx.globalAlpha = p.opacity;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      requestAnimationFrame(loop);
    }

    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(loop);
  }

  /* ------------------------------------------------------------------------
     MODULE: Scroll progress hairline
     ------------------------------------------------------------------------ */
  function initScrollProgress() {
    const bar = document.getElementById('scrollProgress');
    if (!bar) return;
    function update() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
      bar.style.width = `${clamp(progress, 0, 100)}%`;
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ------------------------------------------------------------------------
     MODULE: Cursor glow — a soft light that trails the pointer
     ------------------------------------------------------------------------ */
  function initCursorGlow() {
    const glow = document.getElementById('cursorGlow');
    if (!glow || prefersReducedMotion) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let active = false;

    window.addEventListener('mousemove', (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!active) { active = true; glow.classList.add('is-active'); }
    });
    document.addEventListener('mouseleave', () => { active = false; glow.classList.remove('is-active'); });

    function loop() {
      // Gentle lag gives the glow a soft, floating feel rather than snapping.
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      glow.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  /* ------------------------------------------------------------------------
     MODULE: Scroll-to-top
     ------------------------------------------------------------------------ */
  function initScrollTop() {
    const btn = document.getElementById('scrollTopBtn');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      btn.classList.toggle('is-visible', window.scrollY > 600);
    }, { passive: true });
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  }

  /* ------------------------------------------------------------------------
     MODULE: Scrollspy — highlights the nav link for the section in view
     ------------------------------------------------------------------------ */
  function initScrollSpy() {
    const links = document.querySelectorAll('.navbar__links a');
    if (!links.length || !('IntersectionObserver' in window)) return;
    const sections = Array.from(links)
      .map((link) => document.getElementById(link.getAttribute('href').slice(1)))
      .filter(Boolean);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`));
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    sections.forEach((section) => observer.observe(section));
  }

  /* ------------------------------------------------------------------------
     MODULE: Magnetic buttons — subtle cursor attraction on precision pointers
     ------------------------------------------------------------------------ */
  function initMagneticButtons() {
    if (prefersReducedMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    document.querySelectorAll('.magnetic').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        el.style.transform = `translate(${x * 0.28}px, ${y * 0.28}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ------------------------------------------------------------------------
     MODULE: Hero floaters parallax — drifts gently as the page scrolls
     ------------------------------------------------------------------------ */
  function initHeroParallax() {
    const floaters = document.querySelector('.hero__floaters');
    if (!floaters || prefersReducedMotion) return;
    window.addEventListener('scroll', () => {
      const offset = Math.min(window.scrollY, 800);
      floaters.style.transform = `translateY(${offset * 0.25}px)`;
    }, { passive: true });
  }

  /* ------------------------------------------------------------------------
     MODULE: Nature gallery lightbox
     ------------------------------------------------------------------------ */
  function initNatureLightbox() {
    const lightbox = document.getElementById('lightbox');
    const scene = document.getElementById('lightboxScene');
    const caption = document.getElementById('lightboxCaption');
    const closeBtn = document.getElementById('lightboxClose');
    if (!lightbox) return;
    let lastFocused = null;

    function open(def, trigger) {
      lastFocused = trigger;
      scene.style.background = def.gradient;
      caption.textContent = def.caption;
      lightbox.hidden = false;
      requestAnimationFrame(() => lightbox.classList.add('is-visible'));
      closeBtn.focus();
      document.addEventListener('keydown', onKeydown);
    }

    function close() {
      lightbox.classList.remove('is-visible');
      document.removeEventListener('keydown', onKeydown);
      setTimeout(() => { lightbox.hidden = true; }, 300);
      if (lastFocused) lastFocused.focus();
    }

    function onKeydown(e) { if (e.key === 'Escape') close(); }

    closeBtn.addEventListener('click', close);
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });

    document.getElementById('natureGrid').addEventListener('click', (e) => {
      const card = e.target.closest('.nature-card');
      if (!card) return;
      const def = NATURE_DEFS.find((d) => d.key === card.dataset.key);
      if (def) open(def, card);
    });
    document.getElementById('natureGrid').addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.nature-card');
      if (!card) return;
      e.preventDefault();
      const def = NATURE_DEFS.find((d) => d.key === card.dataset.key);
      if (def) open(def, card);
    });
  }

  /* ------------------------------------------------------------------------
     INIT
     ------------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();

    initTheme();
    initNavbar();
    initSoundLibrary();
    initMixer();
    initBreathing();
    initFocusTimer();
    initQuoteGenerator();
    initMoodCheck();
    initNatureGallery();
    initZenGarden();
    initParticles();
    initScrollReveal();
    initScrollProgress();
    initCursorGlow();
    initScrollTop();
    initScrollSpy();
    initMagneticButtons();
    initHeroParallax();
    initNatureLightbox();
  });
})();