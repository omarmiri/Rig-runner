// Bolt Beat · Sound: synth blips and the electro beat sequencer.
"use strict";
// ================= Audio: synth + electro sequencer =================
const audio = {
  ctx: null, muted: false, out: null,
  unlock() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.out = this.ctx.createGain(); this.out.connect(this.ctx.destination);
      } catch (e) {}
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  },
  setMuted(m) { this.muted = m; if (this.out) this.out.gain.value = m ? 0 : 1; },
  blip(f0, f1, dur, type = "square", vol = 0.06, when = 0) {
    if (!this.ctx) return;
    const t = when || this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.out); o.start(t); o.stop(t + dur + 0.02);
  },
};

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const PROG = [{ r: 45, tri: [0, 3, 7] }, { r: 41, tri: [0, 4, 7] }, { r: 48, tri: [0, 4, 7] }, { r: 43, tri: [0, 4, 7] }];
// Every dance move is a note of A minor pentatonic, so any routine is a melody:
// down = A4, left = C5, right = E5, up = A5 (high), act = a "hey!" chord hit.
const MOVE_NOTE = { down: 69, left: 72, right: 76, up: 81, act: 0 };
// Song styles (all original). Each level uses one. bass: 16 steps of semitones above the chord root
// (null = rest). hook: [step of 32, semitones above A4] played while platforming. gate: chord-stab steps.
const STYLES = [
  { name: "Funk", bass: [0, null, null, 0, null, null, 12, null, 0, null, 10, null, 12, null, 7, null],
    hook: [[0, 0], [3, 3], [6, 0], [8, 5], [10, 3], [12, 0], [14, -2], [16, 0], [19, 3], [22, 0], [24, 7], [26, 5], [28, 3]], openHat: false },
  { name: "Trance", bass: [null, null, 0, 0, null, null, 0, 0, null, null, 0, 0, null, null, 0, 0],
    gate: [0, 3, 6, 10, 13], hook: [[0, 12], [6, 10], [12, 7], [16, 12], [22, 15], [28, 14]], openHat: true },
  { name: "Disco", bass: [0, null, 12, null, 0, null, 12, null, 0, null, 12, null, 0, null, 12, 10],
    hook: [[0, 12], [2, 7], [4, 12], [6, 10], [8, 7], [12, 3], [14, 5], [16, 12], [18, 7], [20, 12], [22, 15], [24, 14], [28, 10]], openHat: true },
  { name: "Electro", bass: [0, null, null, 0, null, null, 0, null, 0, null, 0, null, null, 7, null, null],
    hook: [[0, 0], [3, 0], [6, 7], [8, 5], [11, 3], [14, 0], [16, 0], [19, 0], [22, 10], [24, 7], [27, 5], [30, 3]], openHat: false },
];
const styleFor = idx => STYLES[((idx | 0) % STYLES.length + STYLES.length) % STYLES.length];
const music = {
  on: false, bpm: 112, t0: 0, step: 0, timer: null, intensity: 1, bus: null, delay: null, noise: null, perf0: 0,
  off: null,
  now() { return performance.now() / 1000; },
  running() { return !!(audio.ctx && audio.ctx.state === "running" && this.bus); },
  sync() { if (this.running()) { const o = this.now() - audio.ctx.currentTime; if (this.off === null || Math.abs(o - this.off) > 0.03) this.off = o; } },
  toAudio(t) { this.sync(); const a = t - (this.off ?? 0); return audio.ctx ? Math.max(a, audio.ctx.currentTime) : a; },
  lat() { return audio.ctx ? (audio.ctx.outputLatency || audio.ctx.baseLatency || 0) : 0; },
  beatLen() { return 60 / this.bpm; },
  init() {
    const ctx = audio.ctx; if (!ctx || this.bus) return;
    // bus -> gentle compressor -> output, so loud dance notes never clip
    this.bus = ctx.createGain(); this.bus.gain.value = 0.48;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.15;
    this.bus.connect(comp).connect(audio.out);
    this.delay = ctx.createDelay(1); const fb = ctx.createGain(), wet = ctx.createGain();
    fb.gain.value = 0.32; wet.gain.value = 0.28;
    this.delay.connect(fb).connect(this.delay); this.delay.connect(wet).connect(this.bus);
    const len = ctx.sampleRate * 0.5, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
  },
  start(bpm) {
    audio.unlock(); this.init();
    this.bpm = bpm; this.on = true; this.step = 0;
    if (this.delay) this.delay.delayTime.value = this.beatLen() * 0.75;
    this.t0 = this.now() + 0.15;
    if (!this.timer) this.timer = setInterval(() => this.tick(), 25);
  },
  stop() { this.on = false; },
  beatPos(t = this.now()) { return (t - this.t0) / this.beatLen(); },
  nextBar(t, minLead = 0.6) {
    const bar = 4 * this.beatLen();
    let b = this.t0 + Math.ceil((t + minLead - this.t0) / bar) * bar;
    return b;
  },
  tick() {
    if (!this.on) return;
    this.sync();
    const s16 = this.beatLen() / 4, now = this.now();
    while (this.t0 + this.step * s16 < now + 0.12) {
      const t = this.t0 + this.step * s16;
      if (this.running() && t > now - 0.02) this.play(this.step, t - this.off);
      this.step++;
    }
  },
  // One 16th-note step. Platforming (intensity 1) plays the full song with its hook.
  // Battles (intensity 2) strip back to drums and bass, so the dance notes are the melody.
  play(step, t) {
    const i = step % 16, bar = Math.floor(step / 16), ch = PROG[bar % 4], I = this.intensity, st = this.menu ? STYLES[2] : styleFor(state.levelIdx);
    if (i % 4 === 0) this.kick(t, I >= 2 ? 0.7 : 0.9);
    // in battles the drums sit back so the dance melody is the loudest thing above the bass
    if (i === 4 || i === 12) this.clap(t, I >= 2 ? 0.18 : 0.3);
    if (st.openHat && i % 4 === 2) this.hat(t, I >= 2 ? 0.05 : 0.14, 0.1);
    else if (i % 2 === 1) this.hat(t, I >= 2 ? 0.03 : 0.08, 0.04);
    if (st.bass[i] !== null) this.bass(t, ch.r + st.bass[i] - 12, I >= 2 ? 0.15 : 0.18);
    if (I >= 2) { if (i === 14 && bar % 2 === 1) this.hat(t, 0.1, 0.03); return; }   // a little fill before each new bar pair
    const s32 = step % 32;
    const sig = !this.menu && typeof levelDef !== "undefined" && levelDef && levelDef.signature && state.gameMode === "dance";
    if (sig) {   // signature level: the hook is the boss's motif, in the dance-move notes, every other bar
      for (const [b, mv] of levelDef.signature.motif) if (s32 === b * 4) this.moveNote(t, mv, 0.11);
      return;
    }
    for (const [s, n] of st.hook) if (s === s32) this.lead(t, 69 + n, 0.07);
    if (st.gate && st.gate.includes(i)) this.stab(t, ch, 0.03);
  },
  env(node, t, v, dur) { node.gain.setValueAtTime(v, t); node.gain.exponentialRampToValueAtTime(0.0001, t + dur); },
  kick(t, v = 0.9) {
    const ctx = audio.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    this.env(g, t, v, 0.32); o.connect(g).connect(this.bus); o.start(t); o.stop(t + 0.34);
  },
  noiseHit(t, type, freq, vol, dur) {
    const ctx = audio.ctx, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this.noise; f.type = type; f.frequency.value = freq;
    this.env(g, t, vol, dur); s.connect(f).connect(g).connect(this.bus); s.start(t); s.stop(t + dur + 0.02);
  },
  clap(t, v) { this.noiseHit(t, "bandpass", 1600, v, 0.16); this.noiseHit(t + 0.012, "bandpass", 1200, v * 0.6, 0.12); },
  hat(t, v, dur) { this.noiseHit(t, "highpass", 7500, v, dur); },
  bass(t, m, v) {
    const ctx = audio.ctx, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), d = this.beatLen() / 4 * 0.9;
    o.type = "sawtooth"; o.frequency.value = mtof(m);
    f.type = "lowpass"; f.Q.value = 8; f.frequency.setValueAtTime(1500, t); f.frequency.exponentialRampToValueAtTime(180, t + d);
    this.env(g, t, v, d); o.connect(f).connect(g).connect(this.bus); o.start(t); o.stop(t + d + 0.02);
  },
  arp(t, m, v) {
    const ctx = audio.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "square"; o.frequency.value = mtof(m);
    this.env(g, t, v, 0.09); o.connect(g); g.connect(this.bus); g.connect(this.delay); o.start(t); o.stop(t + 0.11);
  },
  stab(t, ch, v = 0.05) {
    for (const k of ch.tri) {
      const ctx = audio.ctx, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sawtooth"; o.frequency.value = mtof(ch.r + 24 + k);
      this.env(g, t, v, 0.16); o.connect(g); g.connect(this.bus); g.connect(this.delay); o.start(t); o.stop(t + 0.18);
    }
  },
  // a plucky lead note: square plus a detuned saw an octave below
  lead(t, m, v, dur = 0.2, bright = false) {
    const ctx = audio.ctx, o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = bright ? "sawtooth" : "square"; o2.type = "sawtooth"; o.frequency.value = mtof(m); o2.frequency.value = mtof(m - 12) * 1.004;
    f.type = "lowpass"; f.frequency.setValueAtTime(bright ? 5200 : 3600, t); f.frequency.exponentialRampToValueAtTime(900, t + dur);
    this.env(g, t, v, dur); o.connect(f); o2.connect(f); f.connect(g); g.connect(this.bus); g.connect(this.delay);
    o.start(t); o2.start(t); o.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
  },
  zap(t, v) {
    const ctx = audio.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sawtooth"; o.frequency.setValueAtTime(1800, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.18);
    this.env(g, t, v, 0.2); o.connect(g).connect(this.bus); o.start(t); o.stop(t + 0.22);
  },
  // A dance move's sound. The boss's call is a brighter saw lead; your echo is a square lead,
  // so a good copy sounds like the hook answered back.
  move(tg, mv, v = 0.12, call = false) {
    if (!this.running()) return;
    this.moveNote(this.toAudio(tg), mv, v, call);
  },
  // the note for a dance move, at an audio-clock time
  moveNote(t, mv, v, call = false) {
    const dur = Math.min(0.32, this.beatLen() * 0.45);
    if (mv === "act") {   // "hey!": an A minor chord hit with a clap
      for (const n of [69, 72, 76]) this.lead(t, n, v * 0.55, dur * 0.8, call);
      this.noiseHit(t, "bandpass", 1800, v * 2.2, 0.12);
      return;
    }
    this.lead(t, MOVE_NOTE[mv], v, dur, call);
  },
};
