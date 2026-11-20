// Rig Runner · Endless mode: seeded random helpers and the level generator.
"use strict";
// ================= Endless mode =================
const STEP = 1 / 60;  // fixed physics step, shared by the game and the level solver
function rng32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hashSeed = (a, b, c) => (Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663) ^ Math.imul(c | 0, 83492791)) >>> 0;
const ri = (R, a, b) => a + Math.floor(R() * (b - a + 1));
const pickW = (R, items) => { let x = R() * items.reduce((a, i) => a + i[1], 0); for (const [v, w] of items) if ((x -= w) < 0) return v; return items[0][0]; };

// ---------- level generator: platforms, ramps, steps, gaps, spikes ----------
// Limits come from the weakest robot: rise <= 3 tiles, gap <= 3 tiles, and less rise the wider the gap.
function genLevel(R, i, dance) {
  const d = Math.min(1, i / 24), ops = [], put = f => ops.push(f);
  let x = 0, h = 10, sinceCp = 0, drops = 0;
  const L = Math.min(210, 70 + i * 6);
  const flat = n => { const x0 = x, hh = h, b = n >= 3 && R() < 0.45, bx = x0 + 1 + Math.floor(R() * Math.max(1, n - 2));
    put(() => { ground(x0, x0 + n - 1, hh); if (b) bolt(bx, hh - 2); }); x += n; sinceCp += n; };
  const allowRise = g => g <= 1 ? 3 : g === 2 ? 2 : 1;
  flat(8);
  while (x < L) {
    const x0 = x;
    if (sinceCp >= 28 + 14 * d) { const hh = h; put(() => { ground(x0, x0 + 3, hh); checkpoint(x0 + 2, hh - 1); }); x += 4; sinceCp = 0; continue; }
    let k = pickW(R, [["flat", 2], ["stepUp", 2], ["stepDown", 1.5], ["rampUp", 2], ["rampDown", 2], ["gap", 2.5 + 2 * d], ["spikes", 1 + 2.5 * d], ["floaters", 1 + 3 * d], ["pillars", 0.6 + 2 * d], ["drop", i >= 1 ? 0.8 + d : 0]]);
    if (i >= 1 && !drops && x > L * 0.45) k = "drop"; // every level from 2 on has at least one
    if (k === "flat") flat(ri(R, 2, 5));
    else if (k === "drop") {
      // Drop shaft: a girder deck runs into a wall that reaches the top of the level, too tall to jump.
      // The only way on is to drop through the girder (down) into the tunnel underneath.
      while (h > 6) { h = Math.max(6, h - 2); flat(2); }
      const g = h, f = h + 4, xd = x;
      put(() => { girder(xd, xd + 5, g); ground(xd, xd + 13, f); block(xd + 6, xd + 7, 0, g); bolt(xd + 6.5, f - 2); bolt(xd + 3, f - 2); hints.push({ x: xd * T + 3 * T, y: g * T, w: 6 * T }); });
      x += 14; sinceCp += 14; h = f; drops++;
      flat(2);
    }
    else if (k === "stepUp") { const n = ri(R, 1, d > 0.5 ? 3 : 2); for (let s = 0; s < n && h > 5; s++) { h = Math.max(5, h - ri(R, 1, d > 0.6 ? 2 : 1)); flat(ri(R, 2, 3)); } }
    else if (k === "stepDown") { const n = ri(R, 1, 2); for (let s = 0; s < n && h < 10; s++) { h = Math.min(10, h + ri(R, 1, 3)); flat(ri(R, 2, 3)); } }
    else if (k === "rampUp") {
      const kk = Math.min(ri(R, 1, 3), h - 5);
      if (kk >= 1) { for (let s = 0; s < kk; s++) { const cx = x + s, rr = h - 1 - s; put(() => { set(cx, rr, "/"); ground(cx, cx, rr + 1); }); } x += kk; h -= kk; sinceCp += kk; flat(ri(R, 2, 4)); }
    } else if (k === "rampDown") {
      const kk = Math.min(ri(R, 1, 3), 10 - h);
      if (kk >= 1) { for (let s = 0; s < kk; s++) { const cx = x + s, rr = h + s; put(() => { set(cx, rr, "\\"); ground(cx, cx, rr + 1); }); } x += kk; h += kk; sinceCp += kk; flat(ri(R, 2, 4)); }
    } else if (k === "gap") {
      const g = ri(R, 1, d < 0.3 ? 2 : 3), up = Math.min(allowRise(g), h - 5), dh = ri(R, -up, Math.min(3, 10 - h));
      const gx = x, hb = h; x += g; sinceCp += g; h += dh;
      const by = Math.min(hb, h) - 3; put(() => bolt(gx + (g - 1) / 2, by));
      flat(ri(R, 2, 4));
    } else if (k === "spikes") {
      const s = ri(R, 1, 2), hh = h, tot = 4 + s; // 3-wide spike runs are out of Tank's reach
      put(() => { ground(x0, x0 + tot - 1, hh); spikes(x0 + 2, x0 + 1 + s, hh - 1); bolt(x0 + 1.5 + s / 2, hh - 3); });
      x += tot; sinceCp += tot;
    } else {
      const pill = k === "pillars", m = ri(R, 2, 2 + Math.round(2 * d));
      let hp = h;
      for (let s = 0; s < m; s++) {
        const gg = ri(R, 1, 2), lim = allowRise(gg);
        let ph = Math.max(5, Math.min(9, hp + ri(R, -2, 2))); if (hp - ph > lim) ph = hp - lim;
        const w = Math.max(1, ri(R, 1, 3 - Math.round(d))), xp = x + gg, gird = !pill && w >= 2 && R() < 0.4, b = R() < 0.5;
        put(() => { if (pill) block(xp, xp + w - 1, ph, ROWS - 1); else if (gird) girder(xp, xp + w - 1, ph); else block(xp, xp + w - 1, ph, ph); if (b) bolt(xp + (w - 1) / 2, ph - 2); });
        x = xp + w; sinceCp += gg + w; hp = ph;
      }
      const gl = ri(R, 1, 2); let hl = Math.min(10, hp + ri(R, 0, 2)); if (hp - hl > allowRise(gl)) hl = hp - allowRise(gl);
      x += gl; h = hl; flat(ri(R, 3, 4));
    }
    if (x === x0) flat(2);
  }
  while (h < 10) { h = Math.min(10, h + ri(R, 1, 3)); flat(2); }
  const body = x, endW = dance ? 32 : 16, cols = body + endW;
  put(() => { ground(body, cols - 1, 10); bolt(body + 4, 8); bolt(body + 6, 7); bolt(body + 8, 8); block(cols - 2, cols - 1, 0, 9); });
  const def = { name: `Sector ${i + 1}`, theme: i % THEMES.length, cols, goalCol: body + (dance ? 27 : 10), build: () => ops.forEach(f => f()), generated: true };
  if (dance) def.rivalCol = body + 20;
  return def;
}
