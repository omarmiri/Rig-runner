// Bolt Beat · Audio timing calibration for dance-offs.
//
// Dance-offs judge taps against the music clock, corrected by the latency the browser reports.
// Phones often report it wrong, and Bluetooth headphones add 150-250 ms on top, so the game also
// keeps its own offset: measured by a short tap-along warm-up (level 1's dance-off, and the first
// dance-off on any new audio output), then nudged after every dance-off from where the player's
// hits actually land. In the Android app the offset is kept per output (speaker, wired, Bluetooth,
// USB) via window.BoltBeatAudio; on the website there is one.
"use strict";
const WARM_COUNT = 4, WARM_TAPS = 8;      // a 4-beat count-in, then 8 beats to tap along to
const timing = {
  sessionLevel1: false,                   // level 1's warm-up already ran this session
  route() { try { return (window.BoltBeatAudio && window.BoltBeatAudio.route()) || "default"; } catch (e) { return "default"; } },
  key() { return "rigrunner.timing." + this.route(); },
  load() {
    try { const v = JSON.parse(localStorage.getItem(this.key())); if (v && typeof v.offset === "number") return v; } catch (e) {}
    return null;
  },
  calibrated() { return !!this.load(); },
  offset() { const v = this.load(); return v ? v.offset : 0; },
  save(offset) {
    offset = Math.max(-0.15, Math.min(0.5, offset));
    try { localStorage.setItem(this.key(), JSON.stringify({ offset: +offset.toFixed(4), at: Date.now() })); } catch (e) {}
    return offset;
  },
  // Does this dance-off open with the tap-along warm-up?
  wantsWarmup() { return !this.calibrated() || (state.levelIdx === 0 && !state.endless && !this.sessionLevel1); },
  median(a) { const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; },
  // After a dance-off: move part of the way toward where the player's on-target hits landed.
  learn(deltas) {
    if (deltas.length < 6) return;
    const m = this.median(deltas);
    if (Math.abs(m) < 0.012) return;
    this.save(this.offset() + Math.max(-0.05, Math.min(0.05, m * 0.6)));
  },
};
