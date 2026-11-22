// Rig Runner · Kinematics: turns a pose into placed part images, and draws a character.
"use strict";
// ================= Kinematics =================
const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

function solveBiped(ch, P) {
  const r = ch.rig, pins = ch.pins, parts = [];
  const L = P.L, PL = L * 0.25;
  const size = n => ch.img[n] || { w: 100, h: 100 };
  const add = (name, x, y, ang, px, py, far, sx = 1) => parts.push({ name, x, y, ang, px, py, far, sx });
  const bone = (name, x, y, a, far) => {
    const p = pins[name], s = size(name);
    const dx = (p[2] - p[0]) * s.w, dy = (p[3] - p[1]) * s.h;
    const phi = Math.atan2(dx, dy), len = Math.hypot(dx, dy);
    add(name, x, y, phi - a, p[0], p[1], far);
    return [x + len * Math.sin(a), y + len * Math.cos(a)];
  };
  const leg = (side, T, K, F, far) => {
    const [hx, hy] = rot(side * 8, r.hipY, PL);
    const [kx, ky] = bone("thigh", hx, hy, T, far);
    const S = T - K;
    const [ax, ay] = bone("shin", kx, ky, S, far);
    const fp = pins.foot, fs = size("foot"), fr = -F;
    const sole = (fp[2] - fp[1]) * fs.h;
    const c1 = rot(-fp[0] * fs.w, sole, fr), c2 = rot((1 - fp[0]) * fs.w, sole, fr);
    add("foot", ax, ay, fr, fp[0], fp[1], far);
    return { low: Math.max(ay + c1[1], ay + c2[1]) };
  };
  const arm = (side, U, E, far) => {
    const [sx, sy] = rot(side * 10, r.shoulderY, L);
    const [ex, ey] = bone("upper_arm", sx, sy, U, far);
    const Fa = U + E;
    const [wx, wy] = bone("forearm", ex, ey, Fa, far);
    add("fist", wx, wy, -Fa, pins.fist[0], pins.fist[1], far);
    return [wx, wy];
  };
  const farHand = arm(-1, P.fU, P.fE, true);
  const farLeg = leg(-1, P.fT, P.fK, P.fF, true);
  const [px0, py0] = rot(0, r.pelvisY, PL);
  add("pelvis", px0, py0, PL, pins.pelvis[0], pins.pelvis[1], false, r.squash);
  const [tx, ty] = rot(0, r.neckY, L);
  add("torso", tx, ty, L, pins.torso[0], pins.torso[1], false, r.squash);
  const [nx, ny] = rot(r.headX, r.headY, L);
  add("head", nx, ny, L * 0.4 + P.hT, pins.head[0], pins.head[1], false); parts[parts.length - 1].k = ch.headScale || 1;
  if (ch.accKind) addAcc(ch, parts, parts[parts.length - 1]);
  const nearLeg = leg(1, P.nT, P.nK, P.nF, false);
  const nearHand = arm(1, P.nU, P.nE, false);
  const s = size("head");
  return { parts, low: Math.max(farLeg.low, nearLeg.low), top: r.headY - pins.head[1] * s.h * (ch.headScale || 1), hands: [farHand, nearHand] };
}

function ik(hx, hy, tx, ty, l1, l2) {
  let dx = tx - hx, dy = ty - hy, d = Math.hypot(dx, dy);
  const dm = Math.min(l1 + l2 - 1, Math.max(Math.abs(l1 - l2) + 1, d));
  if (d < 1e-3) { dx = 0; dy = 1; d = 1; }
  const base = Math.atan2(dy, dx), a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + dm * dm - l2 * l2) / (2 * l1 * dm))));
  const ka = base - a;
  const kx = hx + l1 * Math.cos(ka), ky = hy + l1 * Math.sin(ka);
  const ea = Math.atan2(ty - ky, tx - kx);
  return [kx, ky, kx + l2 * Math.cos(ea), ky + l2 * Math.sin(ea)];
}
function solveSpider(ch, P) {
  const pn = ch.pins, parts = [];
  const size = n => ch.img[n] || { w: 100, h: 100 };
  const add = (name, x, y, ang, px, py, far, sx = 1) => parts.push({ name, x, y, ang, px, py, far, sx });
  const pinLen = n => { const p = pn[n], s = size(n); const dx = (p[2] - p[0]) * s.w, dy = (p[3] - p[1]) * s.h; return [Math.hypot(dx, dy), Math.atan2(dy, dx)]; };
  const [l1, a1] = pinLen("upper_leg"), [l2, a2] = pinLen("lower_leg");
  const fs = size("foot"), fp = pn.foot, sole = (fp[2] - fp[1]) * fs.h;
  const tilt = P.tilt || 0;
  let low = -Infinity;
  const hands = [];
  const legs = (pre, far) => {
    for (let i = 0; i < 3; i++) {
      const [hx, hy] = rot(pn.hips[i] + (far ? 18 : 0), pn.hipY - (far ? 14 : 0), tilt);
      const tx = hx + P[pre + "x" + i], ty = hy + P[pre + "y" + i];
      const [kx, ky, ax, ay] = ik(hx, hy, tx, ty, l1, l2);
      parts.push({ name: "upper_leg", x: hx, y: hy, ang: Math.atan2(ky - hy, kx - hx) - a1, px: pn.upper_leg[0], py: pn.upper_leg[1], far, sx: 1 });
      parts.push({ name: "lower_leg", x: kx, y: ky, ang: Math.atan2(ay - ky, ax - kx) - a2, px: pn.lower_leg[0], py: pn.lower_leg[1], far, sx: 1 });
      parts.push({ name: "foot", x: ax, y: ay, ang: 0, px: fp[0], py: fp[1], far, sx: 1 });
      low = Math.max(low, ay + sole);
      hands.push([ax, ay]);
    }
  };
  legs("f", true);
  const [abx, aby] = rot(pn.abdomenAt[0], pn.abdomenAt[1], tilt);
  add("abdomen", abx, aby, tilt + 0.08, pn.abdomen[0], pn.abdomen[1], false, -1);
  add("body", 0, 0, tilt, pn.body[0], pn.body[1], false);
  const [hx, hy] = rot(pn.headAt[0], pn.headAt[1], tilt);
  add("head", hx, hy, tilt * 0.5, pn.head[0], pn.head[1], false); parts[parts.length - 1].k = ch.headScale || 1;
  if (ch.accKind) addAcc(ch, parts, parts[parts.length - 1]);
  legs("n", false);
  return { parts, low, top: -size("body").h * 0.55, hands: hands.slice(-2) };
}
const solve = (ch, P) => ch.kind === "spider" ? solveSpider(ch, P) : solveBiped(ch, P);

function calibrate(ch) {
  const P = ch.kind === "spider" ? spiderGait(ch, 0, 0, 0) : bipedIdle(0);
  const s = solve(ch, P);
  ch.scale = ch.height / (s.low - s.top);
  const box = ch.box || { w: 38, h: Math.min(116, Math.round(ch.height - 6)) };
  ch.W = box.w; ch.H = box.h;
  ch.P = Object.assign({}, BASE_PHYS, ch.phys);
}

// Draws a character with its lowest foot on footY. Returns the solve plus world-space hand points.
// ---------- spins that read as solid ----------
// Only side-view art exists, so a spin is faked by turning the body around a vertical axis.
// Rounded parts (arms, legs, fists) keep their full width and just swing around the body.
// Flat parts (head, torso, pelvis, feet, spider body, accessories) narrow to at most 75% and
// fade into a solid shaded silhouette of themselves as they pass edge-on. The silhouette is made
// from the part's own pixels, so bosses get it in their paint colour and the dark clone in black.
const ROUND_PARTS = new Set(["thigh", "shin", "upper_arm", "forearm", "fist", "upper_leg", "lower_leg"]);
const SLAB_MIN = 0.75;
const silhouettes = new WeakMap();
function silhouetteOf(src) {
  let c = silhouettes.get(src);
  if (c) return c;
  const w = src.width, h = src.height;
  c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.drawImage(src, 0, 0);
  // average colour of the visible pixels: the part's plastic colour (tinted for bosses)
  const d = g.getImageData(0, 0, w, h).data; let r = 0, gg = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 16) if (d[i + 3] > 128) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; }
  const avg = n ? `rgb(${r / n | 0},${gg / n | 0},${b / n | 0})` : "#cfd6dc";
  g.globalCompositeOperation = "source-atop";
  g.globalAlpha = 0.82; g.fillStyle = avg; g.fillRect(0, 0, w, h);   // flatten the detail into one colour
  g.globalAlpha = 1;
  const sh = g.createLinearGradient(0, 0, w, 0);                       // light edge, body, then a dark rim for thickness
  sh.addColorStop(0, "rgba(255,255,255,0.38)"); sh.addColorStop(0.3, "rgba(255,255,255,0.08)");
  sh.addColorStop(0.72, "rgba(0,0,0,0.12)"); sh.addColorStop(0.86, "rgba(0,0,0,0.42)"); sh.addColorStop(1, "rgba(0,0,0,0.6)");
  g.fillStyle = sh; g.fillRect(0, 0, w, h);
  silhouettes.set(src, c);
  return c;
}

function drawChar(g, ch, P, x, footY, face, scale = ch.scale, alpha = 1) {
  const s = solve(ch, P);
  const rotA = P.rot || 0, sxv = P.sx ?? 1, sgn = sxv < 0 ? -1 : 1;
  const spin = sgn * Math.max(0.3, Math.abs(sxv));           // how far the body has turned: positions squeeze with this (never fully flat)
  let low = s.low;
  if (Math.abs(rotA) > 0.001) {
    // lowest point of the rotated body, from slightly inset corners of every part
    let lc = -Infinity; const cs = Math.cos(rotA), sn = Math.sin(rotA);
    for (const p of s.parts) {
      const im = ch.img[p.name]; if (!im) continue; const k = p.k || 1;
      for (const [u, v] of [[0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85]]) {
        const [rx, ry] = rot((u - p.px) * im.w * k * p.sx, (v - p.py) * im.h * k, p.ang);
        lc = Math.max(lc, (p.x + rx) * sn + (p.y + ry) * cs);
      }
    }
    const wgt = Math.min(1, Math.abs(rotA) / 0.6);
    low = s.low * (1 - wgt) + lc * wgt;
  }
  const oy = footY - low * scale;
  const turned = Math.abs(spin) < 0.999;
  const silA = Math.max(0, Math.min(1, (0.72 - Math.abs(spin)) / 0.42));   // silhouette strength: 0 when facing, 1 edge-on
  const sx0 = face * scale * spin, cR = Math.cos(rotA), sR = Math.sin(rotA);
  g.save();
  if (ch.aura) { g.shadowColor = ch.aura; g.shadowBlur = 14; }
  for (const p of s.parts) {
    const im = (p.far ? ch.dark : ch.img)[p.name];
    if (!im) continue;
    const k = p.k || 1;
    // pivot on screen: body transform = translate(x, oy) . scale(face*scale*spin, scale) . rotate(rotA)
    const ex = x + sx0 * (p.x * cR - p.y * sR), ey = oy + scale * (p.x * sR + p.y * cR);
    // the part's long (image-down) axis, squeezed with the body turn: this foreshortens limbs correctly
    const th = rotA + p.ang, vyx = sx0 * (-Math.sin(th)) * k, vyy = scale * Math.cos(th) * k;
    const vl = Math.hypot(vyx, vyy) || 1e-6;
    // its width axis: perpendicular, at full width for round parts, at least SLAB_MIN for flat ones
    const round = ROUND_PARTS.has(p.name);
    const wx = !turned ? 1 : round ? 1 : Math.max(Math.abs(spin), SLAB_MIN);
    const mirror = Math.sign(face * sgn * p.sx) || 1;
    const wlen = scale * k * Math.abs(p.sx) * wx * mirror;
    const vxx = wlen * (vyy / vl), vxy = wlen * (-vyx / vl);
    g.save();
    g.transform(vxx, vxy, vyx, vyy, ex, ey);
    const ax = -p.px * im.w, ay = -p.py * im.h;
    const a0 = alpha;
    if (!round && turned && silA > 0) {
      g.globalAlpha = a0 * (1 - silA); if (silA < 1) g.drawImage(im.im, ax, ay, im.w, im.h);
      g.globalAlpha = a0 * silA; g.drawImage(silhouetteOf(im.im), ax, ay, im.w, im.h);
    } else {
      if (a0 < 1) g.globalAlpha = a0;
      g.drawImage(im.im, ax, ay, im.w, im.h);
    }
    g.restore();
  }
  g.restore();
  s.world = { top: oy + s.top * scale, hands: (s.hands || []).map(([hx, hy]) => [x + hx * scale * face, oy + hy * scale]) };
  return s;
}
