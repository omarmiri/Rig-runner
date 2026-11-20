// Rig Runner · Particles, popups and robots coming apart.
"use strict";
// ---------- particles + popups ----------
function burst(x, y, n, color, spd = 160, up = 0) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = spd * (0.3 + Math.random() * 0.7);
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - up, life: 0.35 + Math.random() * 0.3, t: 0, color, r: 2 + Math.random() * 2.5 });
  }
}
function dust(x, y, n) {
  for (let i = 0; i < n; i++) particles.push({ x: x + (Math.random() - 0.5) * 30, y, vx: (Math.random() - 0.5) * 140, vy: -Math.random() * 90, life: 0.4 + Math.random() * 0.2, t: 0, color: "rgba(201,211,219,0.55)", r: 3 + Math.random() * 3, g: 200 });
}
function thrust(x, y) {
  for (let i = 0; i < 16; i++) particles.push({ x: x + (Math.random() - 0.5) * 24, y, vx: (Math.random() - 0.5) * 80, vy: 160 + Math.random() * 220, life: 0.25 + Math.random() * 0.2, t: 0,
    color: i % 3 ? "#f2a23a" : "#ffe1a3", r: 3 + Math.random() * 3, g: 0 });
}
function pop(x, y, text, color, size = 20) { pops.push({ x, y, text, color, size, t: 0, life: 0.8 }); }

function overlapsTiles(x, y, w, h, fn) {
  const c0 = Math.floor(x / T), c1 = Math.floor((x + w - 0.001) / T), r0 = Math.floor(y / T), r1 = Math.floor((y + h - 0.001) / T);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) fn(tileAt(c, r), c, r);
}

function die() {
  if (pl.dead) return;
  pl.dead = 0.6; audio.blip(320, 60, 0.35, "sawtooth", 0.07);
  burst(pl.x + ch.W / 2, pl.y + ch.H / 2, 24, "#f2a23a", 260);
}
function spikeHit() {
  if (pl.hurtT > 0 || pl.dead) return;
  if (pl.armor > 0) {
    pl.armor--; pl.hurtT = 1.0; pl.flash = 1.0; pl.vy = -720; pl.ground = false;
    burst(pl.x + ch.W / 2, pl.y + ch.H, 18, "#c9d3db", 240, 60);
    audio.blip(200, 90, 0.2, "square", 0.07);
  } else die();
}

// ================= Debris: a robot coming apart =================
const debris = [];
function shatter(c, P, x, footY, face, owner) {
  const sc = c.scale, s = solve(c, P), oy = footY - s.low * sc;
  const cx = x, cy = oy + ((s.top + s.low) / 2) * sc;
  for (const p of s.parts) {
    const im = (p.far ? c.dark : c.img)[p.name];
    if (!im) continue;
    // world position of the image centre
    const k = p.k || 1, lx = k * p.sx * (0.5 - p.px) * im.w, ly = k * (0.5 - p.py) * im.h;
    const [rx, ry] = rot(lx, ly, p.ang);
    const wx = x + face * sc * (p.x + rx), wy = oy + sc * (p.y + ry);
    const dx = wx - cx, dy = wy - cy;
    debris.push({ owner, im, k, sx: p.sx, ang: p.ang, face, sc, x: wx, y: wy,
      vx: dx * 4 + (Math.random() - 0.5) * 260, vy: -260 - Math.random() * 420 + dy * 2,
      av: (Math.random() - 0.5) * 16, r: 0.5 * Math.min(im.w, im.h) * sc * k, rest: false });
  }
  burst(cx, cy, 30, "#5ee7ff", 320, 60); burst(cx, cy, 16, "#ffffff", 220, 40);
  audio.blip(900, 40, 0.5, "sawtooth", 0.09);
  if (music.running()) { music.noiseHit(music.toAudio(music.now()), "lowpass", 900, 0.5, 0.45); music.zap(music.toAudio(music.now() + 0.08), 0.1); }
}
function updateDebris(dt) {
  const floor = 10 * T;
  for (const d of debris) {
    if (d.rest) continue;
    d.vy += 1700 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.ang += d.av * dt;
    const lim = floor - d.r * 0.55;
    if (d.y > lim) {
      d.y = lim;
      if (Math.abs(d.vy) > 120) { d.vy *= -0.38; d.vx *= 0.7; d.av *= 0.6; if (Math.random() < 0.3) burst(d.x, floor, 2, "#ffe1a3", 90, 30); }
      else { d.vy = 0; d.vx *= 0.8; d.av *= 0.7; if (Math.abs(d.vx) < 8 && Math.abs(d.av) < 0.3) d.rest = true; }
    }
    const xmin = 0, xmax = COLS * T;
    if (d.x < xmin || d.x > xmax) { d.vx *= -0.5; d.x = Math.max(xmin, Math.min(xmax, d.x)); }
  }
}
function drawDebris() {
  for (const d of debris) {
    ctx.save(); ctx.translate(d.x, d.y); ctx.scale(d.face * d.sc, d.sc); ctx.rotate(d.ang); if (d.k !== 1) ctx.scale(d.k, d.k); if (d.sx !== 1) ctx.scale(d.sx, 1);
    ctx.drawImage(d.im.im, -d.im.w / 2, -d.im.h / 2, d.im.w, d.im.h);
    ctx.restore();
  }
}
