// Bolt Beat · Level loading and movement physics shared by the player and the solver.
"use strict";
function loadLevel(def) {
  COLS = def.cols;
  grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(" "));
  bolts.length = 0; checkpoints.length = 0; hints.length = 0;
  def.build();
  goal = { c: def.goalCol, x: def.goalCol * T + T, y: 10 * T };
  theme = THEMES[def.theme || 0];
  rival = null;
  if (def.rivalCol) {
    const pool = RIVAL_PREF.filter(k => k !== sel);
    const rc = def.rivalChar ? def.rivalChar : def.clone ? cloneOf(CHARS[sel]) : def.boss ? makeHybrid(HYBRIDS.find(h => h.key === def.boss)) : CHARS[pool[state.levelIdx % pool.length]];
    rival = { ch: rc, x: def.rivalCol * T + T / 2, y: 10 * T, pose: rc.kind === "spider" ? spiderGait(rc, 0, 0, 0) : bipedIdle(0), dance: null, defeated: false };
  }
}
const tileAt = (c, r) => (c < 0 || c >= COLS) ? "#" : (r < 0 || r >= ROWS) ? " " : grid[r][c];
// ramps: "/" rises to the right, "\\" falls to the right, at 45 degrees across one tile
function slopeY(t, c, r, x) { const lx = Math.max(0, Math.min(T, x - c * T)); return t === "/" ? (r + 1) * T - lx : r * T + lx; }
// One movement step for any body (the player, or the level solver's test jumper): walls, floors, girders, ramps.
function moveBody(b, W, H, dt) {
  const wasGround = b.ground;
  b.x += b.vx * dt;
  b.x = Math.max(0, Math.min(COLS * T - W, b.x));
  overlapsTiles(b.x, b.y, W, H, (t, c, r) => {
    if (t !== "#") return;
    if (wasGround && b.y + H - r * T <= Math.max(22, W / 2 + 4) && tileAt(c, r - 1) !== "#") return; // step from a ramp top onto the ledge (a 45° ramp is W/2 below it when the body touches)
    if (b.vx > 0) b.x = c * T - W; else if (b.vx < 0) b.x = (c + 1) * T;
    b.vx = 0;
  });
  const prevBottom = b.y + H;
  b.y += b.vy * dt; b.ground = false; b.onGirder = false;
  // is there a ramp under the feet? If so, its surface decides the floor height.
  const fx = b.x + W / 2, fc = Math.floor(fx / T);
  let ys = null;
  for (let r = Math.floor((b.y + H) / T) - 2; r <= Math.floor((b.y + H) / T) + 1; r++) {
    const t = tileAt(fc, r); if (t === "/" || t === "\\") { ys = slopeY(t, fc, r, fx); break; }
  }
  overlapsTiles(b.x, b.y, W, H, (t, c, r) => {
    if (t === "#") {
      if (b.vy > 0) { if (ys !== null && c !== fc && r * T < ys - 1) return; b.y = r * T - H; b.vy = 0; b.ground = true; }
      else if (b.vy < 0) { b.y = (r + 1) * T; b.vy = 0; }
    } else if (t === "=" && b.vy >= 0 && !b.dropT && prevBottom <= r * T + 1) {
      b.y = r * T - H; b.vy = 0; b.ground = true; b.onGirder = true;
    }
  });
  if (ys !== null && b.vy >= 0) {
    const bottom = b.y + H;
    if (bottom >= ys - (wasGround ? 18 : 0) && (prevBottom <= ys + 18 || bottom - ys <= 30)) { b.y = ys - H; b.vy = 0; b.ground = true; }
  }
}
// Run/air control, shared by the player and the level solver so both move identically.
function applyControl(b, P, dir, dt) {
  if (dir) {
    if (Math.sign(b.vx) !== dir && b.ground) b.vx += dir * P.friction * dt;
    b.vx += dir * (b.ground ? P.accel : P.airAccel) * dt;
  } else if (b.ground) { const d = P.friction * dt; b.vx = Math.abs(b.vx) <= d ? 0 : b.vx - Math.sign(b.vx) * d; }
  else b.vx *= Math.pow(0.4, dt);
  b.vx = Math.max(-P.max, Math.min(P.max, b.vx));
}
function touchesSpikes(b, W, H) {
  let hit = false;
  overlapsTiles(b.x + 6, b.y + 10, W - 12, H - 10, (t, c, r) => { if (t === "^" && b.y + H > r * T + 22) hit = true; });
  return hit;
}
let theme = THEMES[0];
let levelDef = DANCE_LEVELS[0];
