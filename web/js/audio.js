// Rig Runner · Sound: synth blips and the electro beat sequencer.
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
const BASS = [0, null, 0, 12, null, 0, null, 12, 0, null, 0, 12, null, 7, null, 12];
const MOVE_NOTE = { up: 81, right: 79, left: 76, down: 72, act: 0 };
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
    this.bus = ctx.createGain(); this.bus.gain.value = 0.55; this.bus.connect(audio.out);
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
  play(step, t) {
    const i = step % 16, bar = Math.floor(step / 16), ch = PROG[bar % 4], I = this.intensity, lvl = state.levelIdx;
    if (i % 4 === 0) this.kick(t);
    if (i === 4 || i === 12) this.clap(t, I >= 2 ? 0.5 : 0.3);
    if (i % 2 === 1) this.hat(t, i % 4 === 2 ? 0.1 : 0.16, 0.05);
    else if (I >= 2) this.hat(t, 0.06, 0.03);
    if (BASS[i] !== null) this.bass(t, ch.r + BASS[i] - 12, I >= 2 ? 0.22 : 0.17);
    if (I >= 2 || i % 2 === 0) {
      const k = (i + bar * 3) % 6, note = ch.r + 24 + ch.tri[k % 3] + (k >= 3 ? 12 : 0);
      this.arp(t, note, I >= 2 ? 0.05 : 0.03);
    }
    if (lvl >= 1 && I >= 2 && (i === 6 || i === 14)) this.stab(t, ch);
    if (lvl >= 2 && i === 15 && bar % 2 === 1) this.zap(t, 0.08);
  },
  env(node, t, v, dur) { node.gain.setValueAtTime(v, t); node.gain.exponentialRampToValueAtTime(0.0001, t + dur); },
  kick(t) {
    const ctx = audio.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    this.env(g, t, 0.9, 0.32); o.connect(g).connect(this.bus); o.start(t); o.stop(t + 0.34);
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
  stab(t, ch) {
    for (const k of ch.tri) {
      const ctx = audio.ctx, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sawtooth"; o.frequency.value = mtof(ch.r + 12 + k);
      this.env(g, t, 0.05, 0.18); o.connect(g); g.connect(this.bus); g.connect(this.delay); o.start(t); o.stop(t + 0.2);
    }
  },
  zap(t, v) {
    const ctx = audio.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sawtooth"; o.frequency.setValueAtTime(1800, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.18);
    this.env(g, t, v, 0.2); o.connect(g).connect(this.bus); o.start(t); o.stop(t + 0.22);
  },
  move(tg, mv, v = 0.12) {
    if (!this.running()) return;
    const t = this.toAudio(tg);
    if (mv === "act") { this.zap(t, v); this.noiseHit(t, "bandpass", 3000, v * 0.8, 0.08); return; }
    const ctx = audio.ctx, o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o.type = "square"; o2.type = "sawtooth"; o.frequency.value = mtof(MOVE_NOTE[mv]); o2.frequency.value = mtof(MOVE_NOTE[mv] - 12) * 1.005;
    this.env(g, t, v, 0.22); o.connect(g); o2.connect(g); g.connect(this.bus); g.connect(this.delay);
    o.start(t); o2.start(t); o.stop(t + 0.24); o2.stop(t + 0.24);
  },
};
