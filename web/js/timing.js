// Bolt Beat · Audio timing calibration for dance-offs.
//
// Dance-offs judge taps against the music clock, corrected by the latency the browser reports.
// Phones often report it wrong, and Bluetooth headphones add 150-250 ms on top, so the game also
// keeps its own offset: measured by a short tap-along warm-up (level 1's dance-off, and the first
// dance-off on any new audio output), then nudged after every dance-off from where the player's
// hits actually land. In the Android app the offset is kept per output (speaker, wired, Bluetooth,
// USB) via window.BoltBeatAudio; on the website there is one.
"use strict";
const WARM_COUNT = 4, WARM_TAPS = 10;     // a 4-beat count-in, then 10 beats to tap along to
const WARM_SKIP = 2;                       // the first taps are the player finding the beat: not measured
// Sound can only ever arrive LATE, so a measurement that says "early" is the player tapping early,
// not the device: the offset never goes below this (a little slack for a browser that over-reports
// its own latency). Without the floor, rushing the warm-up made early taps count as on time.
const OFFSET_MIN = -0.03, OFFSET_MAX = 0.4;
const WARM_MAX_SPREAD = 0.06;              // taps scattered wider than this (median deviation) aren't a measurement
const timing = {
  sessionLevel1: false,                   // level 1's warm-up already ran this session
  route() { try { return (window.BoltBeatAudio && window.BoltBeatAudio.route()) || "default"; } catch (e) { return "default"; } },
  key() { return "rigrunner.timing." + this.route(); },
  load() {
    try { const v = JSON.parse(localStorage.getItem(this.key())); if (v && typeof v.offset === "number") return v; } catch (e) {}
    return null;
  },
  calibrated() { return !!this.load(); },
  // (clamped on read too, so an offset saved before the floor existed stops rewarding early taps)
  offset() { const v = this.load(); return v ? Math.max(OFFSET_MIN, Math.min(OFFSET_MAX, v.offset)) : 0; },
  save(offset) {
    offset = Math.max(OFFSET_MIN, Math.min(OFFSET_MAX, offset));
    try { localStorage.setItem(this.key(), JSON.stringify({ offset: +offset.toFixed(4), at: Date.now() })); } catch (e) {}
    return offset;
  },
  // Does this dance-off open with the tap-along warm-up?
  wantsWarmup() { return !this.calibrated() || (state.levelIdx === 0 && !state.endless && !this.sessionLevel1); },
  median(a) { const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; },
  // The warm-up's verdict: the delay to add, or why there isn't one.
  measure(taps) {
    const use = taps.slice().sort((a, b) => a.k - b.k).slice(WARM_SKIP).map(t => t.d);
    if (use.length < 5) return { ok: false, why: "few" };
    const med = this.median(use), spread = this.median(use.map(d => Math.abs(d - med)));
    if (spread > WARM_MAX_SPREAD) return { ok: false, why: "spread" };
    return { ok: true, delay: med };
  },
  // After a dance-off: move part of the way toward where the player's good hits landed
  // (only hits inside the scoring window, so wild misses don't drag it around).
  learn(deltas) {
    deltas = deltas.filter(d => Math.abs(d) <= WIN_GOOD);
    if (deltas.length < 6) return;
    const m = this.median(deltas);
    if (Math.abs(m) < 0.012) return;
    this.save(this.offset() + Math.max(-0.05, Math.min(0.05, m * 0.6)));
  },
};
