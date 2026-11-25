// Lantern Kitchen — sound: every effect and the music loop are synthesized
// with the Web Audio API. No audio files are loaded, so the game stays
// fully offline. Audio starts only after the first user gesture.

const LKSound = (() => {
  let ctx = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;
  let sizzleNodes = null;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  function unlock() {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = 0) {
    const c = ensure();
    if (!c || muted) return;
    try {
      const t0 = c.currentTime + when;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(c.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    } catch (e) { /* audio is best-effort */ }
  }

  function noise(dur, vol, filterFreq, when = 0) {
    const c = ensure();
    if (!c || muted) return;
    try {
      const t0 = c.currentTime + when;
      const len = Math.max(1, Math.floor(c.sampleRate * dur));
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource();
      src.buffer = buf;
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = filterFreq || 1800;
      f.Q.value = 0.8;
      const g = c.createGain();
      g.gain.value = vol || 0.15;
      src.connect(f).connect(g).connect(c.destination);
      src.start(t0);
    } catch (e) { /* audio is best-effort */ }
  }

  const sfx = {
    pickup() { tone(520, 0.09, 'triangle', 0.12); tone(780, 0.08, 'triangle', 0.08, 0.05); },
    place() { tone(300, 0.08, 'triangle', 0.12); tone(210, 0.1, 'sine', 0.1, 0.04); },
    chop() { noise(0.07, 0.22, 900); tone(140, 0.06, 'square', 0.08); },
    chopDone() { tone(660, 0.09, 'triangle', 0.12); tone(880, 0.12, 'triangle', 0.1, 0.07); },
    ding() { tone(1046, 0.25, 'sine', 0.14); tone(1568, 0.35, 'sine', 0.1, 0.08); },
    serve() {
      tone(523, 0.12, 'triangle', 0.14); tone(659, 0.12, 'triangle', 0.14, 0.09);
      tone(784, 0.2, 'triangle', 0.16, 0.18); tone(1046, 0.3, 'sine', 0.12, 0.27);
    },
    error() { tone(160, 0.16, 'sawtooth', 0.09, 0, 110); },
    trash() { noise(0.15, 0.14, 500); },
    tick() { tone(880, 0.05, 'square', 0.05); },
    rush() { tone(392, 0.14, 'square', 0.1); tone(523, 0.14, 'square', 0.1, 0.12); tone(659, 0.22, 'square', 0.12, 0.24); },
    burn() { tone(220, 0.3, 'sawtooth', 0.08, 0, 130); },
    click() { tone(700, 0.05, 'triangle', 0.07); },
  };

  function sizzleStart() {
    const c = ensure();
    if (!c || muted || sizzleNodes) return;
    try {
      const len = c.sampleRate;
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const f = c.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 3200;
      const g = c.createGain();
      g.gain.value = 0.028;
      src.connect(f).connect(g).connect(c.destination);
      src.start();
      sizzleNodes = { src, g };
    } catch (e) { sizzleNodes = null; }
  }

  function sizzleStop() {
    if (!sizzleNodes) return;
    try { sizzleNodes.src.stop(); } catch (e) {}
    sizzleNodes = null;
  }

  // A gentle music-box loop: a pentatonic walk over a soft bass.
  // Steps are scheduled on a timer so the loop survives tab pauses.
  const MELODY = [523, 587, 659, 784, 880, 784, 659, 587, 659, 784, 1046, 880, 784, 659, 587, 523];
  const BASS = [131, 131, 175, 196, 131, 175, 196, 220, 196, 175, 131, 131, 175, 196, 220, 196];

  function musicStart() {
    if (musicTimer) return;
    musicStep = 0;
    musicTimer = setInterval(() => {
      if (muted) return;
      const i = musicStep % MELODY.length;
      tone(MELODY[i], 0.42, 'sine', 0.045);
      if (musicStep % 2 === 0) tone(BASS[i], 0.8, 'sine', 0.035);
      // A low harmony every fourth step, to keep the loop from going flat.
      if (musicStep % 4 === 2) tone(MELODY[i] / 2, 0.5, 'sine', 0.02);
      musicStep++;
    }, 300);
  }

  function musicStop() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }

  function setMuted(m) {
    muted = !!m;
    if (muted) sizzleStop();
  }

  function isMuted() { return muted; }

  return { unlock, sfx, sizzleStart, sizzleStop, musicStart, musicStop, setMuted, isMuted };
})();
