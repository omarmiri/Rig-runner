// Bolt Beat · Endless mode: proves a generated level can be finished, using the game's own physics.
"use strict";
// ---------- solver: proves the loaded level can be finished by robot c ----------
// It runs the game's own movement code (moveBody, same fixed step) for jumps and walk-offs from every
// surface, builds a graph of where each one lands, and checks the dock is reachable from the start and
// from every checkpoint. Jumper's air jump and Tank's armour are ignored, so the check is conservative.
function solveLevel(c, debug = null, opts = {}) {
  const W = c.W, H = c.H, P = c.P, dt = STEP, nodes = [], byCol = [];
  const isSlope = t => t === "/" || t === "\\";
  for (let col = 0; col < COLS; col++) {
    byCol.push([]);
    for (let r = 1; r < ROWS; r++) {
      const t = grid[r][col], up = grid[r - 1][col];
      let y = null;
      if ((t === "#" || t === "=") && up !== "#" && up !== "^" && !isSlope(up)) y = r * T;
      else if (isSlope(t)) y = slopeY(t, col, r, col * T + T / 2);
      if (y === null) continue;
      let clear = true;
      for (let rr = Math.max(0, Math.floor((y - H) / T)); rr <= Math.floor((y - 1) / T); rr++) if (rr < r && grid[rr][col] === "#") clear = false;
      if (!clear) continue;
      const n = { id: nodes.length, col, y, x: col * T + T / 2, slope: isSlope(t), girder: t === "=", adj: [] };
      nodes.push(n); byCol[col].push(n);
    }
  }
  const find = (x, y) => {
    const col = Math.floor(x / T); let best = null, bd = 1e9;
    for (const cc of [col, col - 1, col + 1]) for (const n of byCol[cc] || []) {
      const dy = Math.abs(n.y - y); if (dy > 34) continue;
      const dd = dy + Math.abs(n.x - x) * 0.2; if (dd < bd) { bd = dd; best = n; }
    }
    return best;
  };
  const same = (a, b) => Math.abs(a.y - b.y) <= 26;
  for (const n of nodes) for (const m of byCol[n.col + 1] || []) if (same(n, m)) { n.adj.push(m.id); m.adj.push(n.id); }
  const sim = (x0, y0, vx0, dir, jump, drop = false, hold = 999) => {
    const b = { x: x0 - W / 2, y: y0 - H, vx: vx0, vy: 0, ground: true, onGirder: drop, dropT: 0 };
    let left = false;
    for (let i = 0; i < 170; i++) {
      applyControl(b, P, dir, dt);
      if (i === 0 && jump) { b.vy = -P.jumpV; b.ground = false; }
      if (i === 0 && drop) { b.dropT = 0.22; b.ground = false; } // same as pressing down on a girder in update()
      if (i >= hold && b.vy < 0) b.vy *= Math.pow(P.cut, dt * 20);   // jump released early: same cut as update()
      b.dropT = Math.max(0, b.dropT - dt);
      b.vy += P.grav * (b.vy > 0 ? P.fallMul : 1) * dt; b.vy = Math.min(b.vy, P.maxFall);
      moveBody(b, W, H, dt);
      if (touchesSpikes(b, W, H) || b.y > ROWS * T + 100) return null;
      if (!b.ground) left = true;
      else if (left) return find(b.x + W / 2, b.y + H);
      else if (i > 40) return null;
    }
    return null;
  };
  const M = P.max;
  for (const n of nodes) {
    const xs = [n.x];
    if (!n.slope) {
      if (!(byCol[n.col + 1] || []).some(m => same(n, m))) xs.push((n.col + 1) * T - 3);
      if (!(byCol[n.col - 1] || []).some(m => same(n, m))) xs.push(n.col * T + 3);
    }
    if (xs.length === 1 && !n.slope && !n.girder && n.col % 2 === 1) continue; // inside a long run: every other column is enough
    for (const x of xs) {
      const tries = [[M, 1, true], [-M, -1, true], [0, 1, true], [0, -1, true], [0, 0, true], [M, 1, true, 8], [-M, -1, true, 8], [0, 1, true, 8], [0, -1, true, 8]];
      if (x !== n.x) { const s = x > n.x ? 1 : -1; tries.push([s * M, s, false], [s * M * 0.4, s, true]); }
      for (const [vx, dr, j, hold = 999] of tries) { const m = sim(x, n.y, vx, dr, j, false, hold); if (m && m.id !== n.id) { n.adj.push(m.id); if (debug) debug.push([x, n.y, vx, dr, j, m.x, m.y, false, hold]); } }
      if (n.girder && !opts.noDrop) for (const [vx, dr] of [[0, 0], [M, 1], [-M, -1]]) {
        const m = sim(x, n.y, vx, dr, false, true);
        if (m && m.id !== n.id) { n.adj.push(m.id); if (debug) debug.push([x, n.y, vx, dr, false, m.x, m.y, true]); }
      }
    }
  }
  const reach = id => { const seen = new Uint8Array(nodes.length), q = [id]; seen[id] = 1; while (q.length) { const k = q.pop(); for (const j of nodes[k].adj) if (!seen[j]) { seen[j] = 1; q.push(j); } } return seen; };
  const start = find(spawn.c * T + T / 2, spawn.r * T);
  const goalNodes = nodes.filter(n => Math.abs(n.x - goal.x) <= T);
  if (!start || !goalNodes.length) return { ok: false, why: "no start or dock" };
  const okFrom = id => { const s = reach(id); return goalNodes.some(g => s[g.id]); };
  if (!okFrom(start.id)) { const s0 = reach(start.id); let far = 0; nodes.forEach(n => { if (s0[n.id]) far = Math.max(far, n.col); }); return { ok: false, why: "dock unreachable", far }; }
  for (const k of checkpoints) { const n = find(k.x, k.y); if (!n || !okFrom(n.id)) return { ok: false, why: "checkpoint stuck" }; }
  return { ok: true, nodes: nodes.length };
}
