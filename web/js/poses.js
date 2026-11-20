// Rig Runner · Poses: idle, run, jump, breakdance and lasso moves, for bipeds and the spider.
"use strict";
// ================= Poses =================
const lerpPose = (a, b, t, out = {}) => { for (const k in b) out[k] = (a[k] ?? b[k]) + (b[k] - (a[k] ?? b[k])) * t; return out; };
const mkPose = o => Object.assign({ L:0,hT:0,nT:0,nK:0,nF:0,fT:0,fK:0,fF:0,nU:0,nE:0,fU:0,fE:0,rot:0,sx:1 }, o);
// blend toward a target pose, taking the short way round on whole-body rotation
function blendPose(cur, target, k) {
  if (target.rot !== undefined && cur.rot !== undefined) cur.rot += Math.PI * 2 * Math.round((target.rot - cur.rot) / (Math.PI * 2));
  return lerpPose(cur, target, k, cur);
}

function bipedIdle(t) {
  const b = Math.sin(t * 2.2);
  return mkPose({ L: 0.04 + 0.012 * b, hT: 0.02 * b, nT: 0.08, nK: 0.14 + 0.03 * b, fT: -0.06, fK: 0.12 + 0.03 * b,
    nU: 0.14 + 0.03 * b, nE: 0.38, fU: -0.12 - 0.02 * b, fE: 0.32 });
}
function legRun(p) {
  const s = Math.sin(p), lift = Math.max(0, Math.cos(p + 0.6));
  return { T: 0.2 + 0.78 * s, K: 0.2 + 1.45 * lift, F: -0.55 * lift + 0.12 * Math.max(0, s) };
}
function bipedRun(p) {
  const n = legRun(p), f = legRun(p + Math.PI), s = Math.sin(p);
  return mkPose({ L: 0.3, hT: -0.18, nT: n.T, nK: n.K, nF: n.F, fT: f.T, fK: f.K, fF: f.F,
    nU: 0.05 - 0.95 * s, nE: 1.35 + 0.2 * s, fU: 0.05 + 0.95 * s, fE: 1.35 - 0.2 * s });
}
const B_RISE = mkPose({ L: 0.16, hT: -0.12, nT: 1.05, nK: 1.55, nF: -0.15, fT: -0.35, fK: 0.65, fF: -0.6, nU: -0.75, nE: 1.25, fU: 2.3, fE: 0.45 });
const B_FALL = mkPose({ L: 0.06, hT: 0.08, nT: 0.55, nK: 0.95, nF: 0.05, fT: -0.05, fK: 0.45, fF: -0.3, nU: 1.7, nE: 0.5, fU: -1.05, fE: 0.6 });
const B_CROUCH = mkPose({ L: 0.38, hT: -0.25, nT: 0.95, nK: 1.7, fT: 0.7, fK: 1.4, nU: 0.45, nE: 0.9, fU: -0.35, fE: 0.9 });
const B_WIN = mkPose({ L: -0.05, hT: 0.15, nT: 0.12, nK: 0.15, fT: -0.1, fK: 0.12, nU: 2.85, nE: 0.25, fU: 2.65, fE: 0.3 });
const B_SLUMP = mkPose({ L: 0.75, hT: -0.6, nT: 1.2, nK: 2.1, fT: 1.0, fK: 2.0, nU: 0.1, nE: 0.0, fU: -0.1, fE: 0.0 });

// Robot dance moves: one per input
const B_DANCE = {
  up:    mkPose({ L: -0.02, hT: 0.25, nT: 0.05, nK: 0.05, fT: -0.05, fK: 0.05, nU: 3.05, nE: 0.05, fU: 2.95, fE: 0.1 }),
  down:  mkPose({ L: 0.55, hT: -0.45, nT: 1.05, nK: 1.9, fT: 0.85, fK: 1.7, nU: 0.35, nE: 0.05, fU: 0.2, fE: 0.05 }),
  left:  mkPose({ L: -0.22, hT: 0.1, nT: -0.35, nK: 0.25, nF: 0.45, fT: 0.35, fK: 0.7, fF: -0.2, nU: -0.7, nE: 1.7, fU: 0.5, fE: 1.6 }),
  right: mkPose({ L: 0.12, hT: -0.15, nT: 0.35, nK: 0.25, fT: -0.25, fK: 0.45, nU: 2.35, nE: 0.0, fU: -0.25, fE: 0.35 }),
  act:   mkPose({ L: 0, hT: 0.35, nT: 0.1, nK: 0.3, fT: -0.1, fK: 0.3, nU: 1.57, nE: 1.57, fU: 0.0, fE: 1.57 }),
};
// Breakdance moves. ph = beats since the move started. rot = whole-body rotation, sx = spin (horizontal squash through 3D turn).
function bipedBreak(move, ph) {
  const w = ph * Math.PI * 2, c2 = Math.cos(w * 2);
  if (move === "up") return mkPose({ rot: Math.PI, sx: c2, hT: 0.1, nT: 0.9, nK: 0.05, nF: -0.6, fT: -0.9, fK: 0.05, fF: -0.6, nU: 2.3, nE: 0.9, fU: -2.3, fE: -0.9 });
  if (move === "down") return mkPose({ rot: -Math.PI / 2, sx: Math.cos(w * 1.5), L: 0.2, hT: 0.3, nT: 1.7, nK: 2.1, fT: 1.5, fK: 2.0, nU: 1.3, nE: 1.1, fU: 1.1, fE: 1.2 });
  if (move === "left") return mkPose({ rot: Math.PI / 2 + w, nT: 1.0, nK: 0.1, nF: -0.4, fT: -1.0, fK: 0.1, fF: -0.4, nU: 1.7, nE: 0.2, fU: -1.7, fE: -0.2 });
  if (move === "right") return mkPose({ rot: 2.5, L: 0.1, hT: 0.3, nT: 0.9, nK: 1.5, fT: -0.25, fK: 0.35, fF: -0.5, nU: 2.95, nE: 0.05, fU: 1.2, fE: 1.6 });
  return mkPose({ rot: -0.25, sx: c2, L: -0.3, hT: 0.2, nT: 0.5 + 1.2 * c2, nK: 0.05, nF: -0.5, fT: 0.5 - 1.2 * c2, fK: 0.05, fF: -0.5, nU: 0.35, fU: 0.2 });
}
function spiderBreak(ch, move, ph, t) {
  const w = ph * Math.PI * 2, o = spiderGait(ch, 0, 0, t), R0 = ch.pins.rest;
  for (let i = 0; i < 3; i++) {
    const a = w * 2 + i * 2.1;
    if (move === "up") { o.rot = Math.PI; o.sx = Math.cos(w * 2); o["ny" + i] = R0[1] - 150 + 70 * Math.sin(a); o["fy" + i] = R0[1] - 150 + 70 * Math.sin(a + 1); }
    else if (move === "down") { o.rot = Math.PI; o.sx = Math.cos(w * 1.5); o["ny" + i] = o["fy" + i] = R0[1] - 230; o["nx" + i] = o["fx" + i] = R0[0] + (i - 1) * 30; }
    else if (move === "left") { o.rot = w; o["nx" + i] += (i - 1) * 110; o["fx" + i] += (i - 1) * 110; }
    else if (move === "right") { o.rot = -0.6; o.tilt = -0.2; if (i === 2) { o.nx2 += 140; o.ny2 -= 230; o.fx2 += 120; o.fy2 -= 200; } }
    else { o.rot = -0.15; o.sx = Math.cos(w * 2); o["nx" + i] += 90 * Math.cos(a); o["ny" + i] += -60 + 60 * Math.sin(a); o["fx" + i] += 90 * Math.cos(a + 1.5); o["fy" + i] += -60 + 60 * Math.sin(a + 1.5); }
  }
  return o;
}
// Lasso twirl: lasso arm straight up, the other hand on the hip, hips swaying
function bipedLasso(ph) {
  const w = ph * Math.PI * 4, sw = Math.sin(w);
  return mkPose({ L: -0.06 + 0.05 * sw, hT: 0.18, nT: 0.18 + 0.12 * sw, nK: 0.22, fT: -0.12 - 0.08 * sw, fK: 0.28, nU: 2.95, nE: 0.12, fU: -0.55, fE: 1.95 });
}
function bipedGroove(bounce) {
  return mkPose({ L: 0.08 + 0.06 * bounce, hT: -0.1 + 0.18 * bounce, nT: 0.15 + 0.15 * bounce, nK: 0.15 + 0.4 * bounce,
    fT: 0.0 + 0.1 * bounce, fK: 0.12 + 0.35 * bounce, nU: 0.4, nE: 1.3 + 0.25 * bounce, fU: -0.2, fE: 1.2 + 0.25 * bounce });
}

// Spider pose: body tilt + foot target (relative to its hip) for 3 near and 3 far legs.
const SP_NEAR_OFF = [0, 0.5, 0], SP_FAR_OFF = [0.5, 0, 0.5];
function spiderGait(ch, phase, amt, t) {
  const P = ch.pins, o = { tilt: 0.04 * amt, bob: 0, rot: 0, sx: 1 };
  const leg = (u, i) => {
    u = ((u % 1) + 1) % 1;
    let x, y = P.rest[1];
    if (u < 0.65) x = P.stride * (0.5 - u / 0.65);
    else { const s = (u - 0.65) / 0.35; x = P.stride * (-0.5 + s); y -= P.lift * Math.sin(Math.PI * s); }
    const spread = (i - 1) * 25;
    return [P.rest[0] + spread + x * amt, P.rest[1] + (y - P.rest[1]) * amt];
  };
  for (let i = 0; i < 3; i++) {
    [o["nx" + i], o["ny" + i]] = leg(phase + SP_NEAR_OFF[i], i);
    [o["fx" + i], o["fy" + i]] = leg(phase + SP_FAR_OFF[i], i);
  }
  if (amt < 1) o.ny1 += Math.sin(t * 2.4) * 6 * (1 - amt);
  return o;
}
function spiderAir(ch, rising) {
  const P = ch.pins, o = { tilt: rising ? -0.12 : 0.1, rot: 0, sx: 1 };
  for (let i = 0; i < 3; i++) {
    const spread = (i - 1) * (rising ? 70 : 110);
    const x = P.rest[0] + spread + (rising ? -20 : 30), y = P.rest[1] + (rising ? -110 : 10);
    o["nx" + i] = x; o["ny" + i] = y; o["fx" + i] = x + 15; o["fy" + i] = y - 15;
  }
  return o;
}
function spiderWin(ch, t) {
  const o = spiderGait(ch, 0, 0, t);
  o.nx2 += 60; o.ny2 -= 200 + Math.sin(t * 8) * 30; o.tilt = -0.15;
  return o;
}
function spiderGroove(ch, bounce, t) {
  const o = spiderGait(ch, 0, 0, t);
  for (let i = 0; i < 3; i++) { o["ny" + i] -= 45 * bounce; o["fy" + i] -= 45 * bounce; }
  o.tilt = -0.04 * bounce;
  return o;
}
function spiderDance(ch, move, bounce, t, half) {
  const o = spiderGroove(ch, bounce * 0.4, t);
  if (move === "up") { o.nx2 += 40; o.ny2 -= 260; o.fx2 += 40; o.fy2 -= 230; o.tilt = -0.25; }
  else if (move === "down") { for (let i = 0; i < 3; i++) { o["nx" + i] += (i - 1) * 90; o["fx" + i] += (i - 1) * 90; o["ny" + i] -= 130; o["fy" + i] -= 130; } o.tilt = 0; }
  else if (move === "left") { o.nx0 -= 120; o.ny0 -= 200; o.fx0 -= 100; o.fy0 -= 180; o.tilt = 0.2; }
  else if (move === "right") { o.nx2 += 160; o.ny2 -= 120; o.tilt = -0.08; }
  else if (move === "act") { const s = half ? 1 : -1; for (let i = 0; i < 3; i++) { o["ny" + i] -= (s > 0 ? 140 : 0); o["fy" + i] -= (s > 0 ? 0 : 140); } o.tilt = 0.1 * s; }
  return o;
}
function spiderSlump(ch, t) {
  const o = spiderGait(ch, 0, 0, t);
  for (let i = 0; i < 3; i++) { o["nx" + i] += (i - 1) * 120; o["fx" + i] += (i - 1) * 120; o["ny" + i] -= 170; o["fy" + i] -= 170; }
  o.tilt = 0.18;
  return o;
}
