// Rig Runner · Drawing the world: camera, background, tiles, props, characters.
"use strict";
// ================= Rendering =================
const canvas = document.getElementById("game"), ctx = canvas.getContext("2d");
let dpr = 1, zoom = 1, viewW = 0, viewH = 0, camX = 0, camY = 0;
let padBand = 0;
const coarse = (() => { try { return matchMedia("(pointer: coarse)").matches; } catch (e) { return false; } })();
const reduceMotion = (() => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } })();
function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(innerWidth * dpr); canvas.height = Math.round(innerHeight * dpr);
  // on touch screens, keep a band at the bottom for the pads so they sit over solid ground, not the action
  padBand = coarse ? 44 : 0;
  zoom = Math.min((innerHeight - padBand) / (ROWS * T), innerWidth / 540);
  viewW = innerWidth / zoom; viewH = innerHeight / zoom;
}
addEventListener("resize", resize);
// iOS (especially a Home Screen app at launch or after rotating) can report its size late, so
// listen to every signal, and also compare against the real size every frame (see main.js).
addEventListener("orientationchange", () => { resize(); setTimeout(resize, 300); });
addEventListener("pageshow", resize);
if (window.visualViewport) visualViewport.addEventListener("resize", resize);
function sizeChanged() {
  const d = Math.min(2, window.devicePixelRatio || 1);
  return canvas.width !== Math.round(innerWidth * d) || canvas.height !== Math.round(innerHeight * d);
}

function rand(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const farBlocks = (() => { const r = rand(7), out = []; let x = -200; while (x < 6000) { const w = 60 + r() * 140, h = 80 + r() * 220; out.push({ x, w, h, stack: r() < 0.35 ? 20 + r() * 90 : 0, lit: r() }); x += w + r() * 30; } return out; })();

function drawBackground(bi) {
  const th = theme, g = ctx.createLinearGradient(0, camY, 0, camY + viewH);
  g.addColorStop(0, th.sky[0]); g.addColorStop(0.65, th.sky[1]); g.addColorStop(1, th.sky[2]);
  ctx.fillStyle = g; ctx.fillRect(camX, camY, viewW, viewH);
  const base = ROWS * T - 30, px = camX * 0.25;
  const pulse = state.gameMode === "dance" && music.on ? 0.55 + 0.6 * bi.bounce : 1;
  const [gr, gg, gb] = th.glow;
  ctx.fillStyle = th.far;
  for (const b of farBlocks) {
    const x = camX + b.x - (px % 6000);
    if (x + b.w < camX - 20 || x > camX + viewW + 20) continue;
    ctx.fillRect(x, base - b.h, b.w, b.h + 40);
    if (b.stack) ctx.fillRect(x + b.w * 0.6, base - b.h - b.stack, 14, b.stack);
    if (b.lit > 0.55) { ctx.fillStyle = `rgba(${gr},${gg},${gb},${0.18 * pulse})`; for (let wy = base - b.h + 18; wy < base - 20; wy += 26) ctx.fillRect(x + 10, wy, b.w - 20, 6); ctx.fillStyle = th.far; }
  }
  const mx = camX * 0.55, span = 260;
  ctx.strokeStyle = "rgba(201,211,219,0.07)"; ctx.lineWidth = 6;
  const start = Math.floor(mx / span) - 1;
  for (let i = start; i < start + viewW / span + 3; i++) {
    const x = camX + i * span - mx;
    ctx.beginPath(); ctx.moveTo(x, camY - 50); ctx.lineTo(x, base + 40); ctx.stroke();
  }
  ctx.lineWidth = 3;
  const ty = 3 * T;
  ctx.beginPath(); ctx.moveTo(camX, ty); ctx.lineTo(camX + viewW, ty); ctx.moveTo(camX, ty + 40); ctx.lineTo(camX + viewW, ty + 40);
  for (let i = start; i < start + viewW / 40 + 3; i++) { const x = camX + i * 40 - (mx % 40); ctx.moveTo(x, ty); ctx.lineTo(x + 40, ty + 40); }
  ctx.stroke();
}

// dance floor + lasers around the rival
function drawArena(bi) {
  if (!rival) return;
  const c0 = Math.floor((rival.x - 420) / T), c1 = Math.floor((rival.x + 60) / T);
  const hot = battle && battle.started ? 1 : 0.35;
  for (let c = c0; c <= c1; c++) {
    const x = c * T, y = 10 * T;
    const k = (c * 7 + bi.beat * 3) % 5, col = MOVE_COLOR[MOVES[k]];
    ctx.globalAlpha = hot * (0.25 + 0.5 * bi.bounce * ((c + bi.beat) % 2));
    ctx.fillStyle = col; ctx.fillRect(x + 3, y + 1, T - 6, 6);
  }
  ctx.globalAlpha = 1;
  if (!(battle && battle.started) || rival.defeated) return;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 4; i++) {
    const ox = rival.x - 380 + i * 140, oy = camY + 10;
    const a = Math.PI / 2 + Math.sin(state.time * (0.9 + i * 0.3) + i) * 0.55;
    const len = 900, col = rival.ch.color && i % 2 === 0 ? rival.ch.color : theme.laser[i % 2];
    ctx.strokeStyle = col; ctx.globalAlpha = 0.12 + 0.25 * bi.bounce; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + Math.cos(a) * len, oy + Math.sin(a) * len); ctx.stroke();
  }
  ctx.restore(); ctx.globalAlpha = 1;
}

function drawTiles() {
  if (padBand) { ctx.fillStyle = "#26333f"; ctx.fillRect(camX - T, ROWS * T, viewW + 2 * T, padBand / zoom + T); }
  const c0 = Math.max(0, Math.floor(camX / T) - 1), c1 = Math.min(COLS - 1, Math.ceil((camX + viewW) / T) + 1);
  for (let r = 0; r < ROWS; r++) for (let c = c0; c <= c1; c++) {
    const t = grid[r][c], x = c * T, y = r * T;
    if (t === "/" || t === "\\") {
      const up = t === "/";
      ctx.fillStyle = "#4b5e70"; ctx.beginPath();
      if (up) { ctx.moveTo(x, y + T); ctx.lineTo(x + T, y); ctx.lineTo(x + T, y + T); } else { ctx.moveTo(x, y); ctx.lineTo(x + T, y + T); ctx.lineTo(x, y + T); }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#c9d3db"; ctx.lineWidth = 5; ctx.beginPath();
      if (up) { ctx.moveTo(x, y + T - 2); ctx.lineTo(x + T, y - 2); } else { ctx.moveTo(x, y - 2); ctx.lineTo(x + T, y + T - 2); }
      ctx.stroke();
    } else if (t === "#") {
      const above = tileAt(c, r - 1), top = above !== "#" && above !== "/" && above !== "\\";
      ctx.fillStyle = top ? "#4b5e70" : "#2c3c4c"; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(x + T - 2, y, 2, T); ctx.fillRect(x, y + T - 2, T, 2);
      if (top) {
        ctx.fillStyle = "#c9d3db"; ctx.fillRect(x, y, T, 5);
        ctx.fillStyle = "#7f93a5"; ctx.fillRect(x, y + 5, T, 3);
        ctx.fillStyle = "#22313f"; ctx.fillRect(x + 8, y + 18, 4, 4); ctx.fillRect(x + T - 12, y + 18, 4, 4);
      } else if ((c + r) % 3 === 0) { ctx.fillStyle = "#33465a"; ctx.fillRect(x + 6, y + 6, T - 12, T - 12); }
    } else if (t === "=") {
      ctx.fillStyle = "#f2a23a"; ctx.fillRect(x, y, T, 14);
      ctx.fillStyle = "#b46d1c"; ctx.fillRect(x, y + 10, T, 4);
      ctx.strokeStyle = "#b46d1c"; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(x + 4, y + 14); ctx.lineTo(x + T / 2, y + 26); ctx.lineTo(x + T - 4, y + 14); ctx.stroke();
    } else if (t === "^") {
      ctx.fillStyle = "#8b99a6";
      for (let i = 0; i < 4; i++) { const sx = x + i * 12; ctx.beginPath(); ctx.moveTo(sx, y + T); ctx.lineTo(sx + 6, y + 20); ctx.lineTo(sx + 12, y + T); ctx.fill(); }
      ctx.fillStyle = "#d9e2e8"; for (let i = 0; i < 4; i++) ctx.fillRect(x + i * 12 + 5, y + 20, 2, 8);
    }
  }
}

function drawProps() {
  for (const h of hints) {
    if (h.x < camX - 200 || h.x > camX + viewW + 200) continue;
    const near = Math.abs(pl.x + ch.W / 2 - h.x) < h.w, a = 0.55 + 0.45 * Math.sin(state.time * 6);
    ctx.save(); ctx.textAlign = "center"; ctx.globalAlpha = near ? a : 0.5;
    ctx.fillStyle = "#f2a23a"; ctx.shadowColor = "#f2a23a"; ctx.shadowBlur = 12;
    const ay = h.y - 150 + Math.sin(state.time * 5) * 5;
    ctx.beginPath(); ctx.moveTo(h.x - 16, ay); ctx.lineTo(h.x + 16, ay); ctx.lineTo(h.x, ay + 20); ctx.closePath(); ctx.fill();
    ctx.font = "700 14px 'Chakra Petch', sans-serif"; ctx.fillText(coarse ? "TAP ▼ TO DROP" : "PRESS ↓ TO DROP", h.x, ay - 10);
    ctx.restore();
  }
  for (const b of bolts) {
    if (b.got || b.x < camX - 40 || b.x > camX + viewW + 40) continue;
    const sx = Math.cos(state.time * 3 + b.x * 0.01), bob = Math.sin(state.time * 2.5 + b.x) * 3;
    ctx.save(); ctx.translate(b.x, b.y + bob); ctx.scale(Math.max(0.15, Math.abs(sx)), 1);
    ctx.fillStyle = sx > 0 ? "#f2c46a" : "#c98f2c"; ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; ctx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#17293a"; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  for (const k of checkpoints) {
    ctx.fillStyle = "#56697b"; ctx.fillRect(k.x - 3, k.y - 120, 6, 120); ctx.fillRect(k.x - 12, k.y - 6, 24, 6);
    const col = k.on ? "#6fe0a0" : "#c4504a";
    ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = k.on ? 22 : 8;
    ctx.fillStyle = col; ctx.fillRect(k.x - 9, k.y - 136, 18, 18); ctx.restore();
  }
  const gx = goal.x, gy = goal.y, locked = rival && !rival.defeated;
  ctx.fillStyle = "#56697b"; ctx.fillRect(gx - 56, gy - 190, 10, 190); ctx.fillRect(gx + 46, gy - 190, 10, 190); ctx.fillRect(gx - 56, gy - 200, 112, 14);
  ctx.fillStyle = "#33465a"; ctx.fillRect(gx - 50, gy - 10, 100, 10);
  const pulse = 0.35 + 0.25 * Math.sin(state.time * 4);
  const lg = ctx.createLinearGradient(0, gy - 186, 0, gy - 10);
  const gc = locked ? "196,80,74" : "111,224,160";
  lg.addColorStop(0, `rgba(${gc},${pulse * 0.2})`); lg.addColorStop(1, `rgba(${gc},${pulse})`);
  ctx.fillStyle = lg; ctx.fillRect(gx - 46, gy - 186, 92, 176);
  ctx.fillStyle = "#0f1a24"; ctx.font = "700 12px 'Chakra Petch', sans-serif"; ctx.textAlign = "center"; ctx.fillText(locked ? "LOCKED" : "CHARGE", gx, gy - 189);
}

function drawRival() {
  if (!rival) return;
  const rc = rival.ch;
  if (rival.shattered) return;
  ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.beginPath(); ctx.ellipse(rival.x, rival.y, rc.kind === "spider" ? 52 : 30, 5, 0, 0, Math.PI * 2); ctx.fill();
  const s = drawChar(ctx, rc, rival.pose, rival.x, rival.y + 2, -1, rc.scale);
  if (rc.lasso && Math.abs(rival.pose.rot || 0) < 0.3 && s.world.hands[1]) {
    const d = rival.dance, bl = music.beatLen(), now = battle ? battleClock() : 0;
    const twirl = !!(battle && d && d.move === "act" && now - d.at >= 0 && now - d.at < bl * 0.9);
    drawLasso(s.world.hands[1][0], s.world.hands[1][1], rc.height * 0.55, state.time, twirl, rc.lassoColor, -1);
  }
  if (!battle && !rival.defeated) {
    const near = Math.abs(pl.x - rival.x) < 700;
    if (near) bubble(rival.x, s.world.top - 6, rc.name, `"${rc.clone ? "Only one of us docks." : rc.taunt || "Dance-off for the dock!"}"`, rc.color || (rc.clone ? "#ff3a4a" : "#ff5ec8"));
  }
}
function drawLasso(hx, hy, size, t, twirl, col, face) {
  ctx.save(); ctx.lineCap = "round"; ctx.shadowColor = col; ctx.shadowBlur = 14; ctx.strokeStyle = col;
  if (twirl) {
    const cx = hx, cy = hy - size * 0.62, rx = size * 0.85, ry = size * 0.2, th = t * 14;
    ctx.lineWidth = 3.5; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    const ax = cx + rx * Math.cos(th), ay = cy + ry * Math.sin(th);
    ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(hx, cy + ry, ax, ay); ctx.stroke();
    ctx.shadowBlur = 20; ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(ax, ay, 3.5, 0, Math.PI * 2); ctx.fill();
    if (Math.random() < 0.3) particles.push({ x: ax, y: ay, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 60, life: 0.3, t: 0, color: col, r: 2, g: 200 });
  } else {
    ctx.lineWidth = 2.2;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(hx + face * 3, hy + size * 0.2 + k * 2, size * 0.14, size * 0.2, 0.2 * face, 0, Math.PI * 2); ctx.stroke(); }
  }
  ctx.restore();
}
// Speech bubble: speaker's name on top, the line underneath. Sized so the text is at least
// 15px on screen however far the camera is zoomed out (phones zoom out a lot).
function bubble(x, y, name, line, accent = "#ff5ec8") {
  const fs = Math.max(19, 15 / zoom), pad = fs * 0.6, gap = fs * 0.35;
  ctx.textAlign = "center";
  ctx.font = `700 ${fs * 0.8}px 'Chakra Petch', sans-serif`; const wName = ctx.measureText(name).width;
  ctx.font = `700 ${fs}px 'Chakra Petch', sans-serif`; const wLine = ctx.measureText(line).width;
  const w = Math.max(wName, wLine) + pad * 2, h = fs * 0.8 + gap + fs + pad * 1.6;
  // keep the bubble on screen; the pointer still marks the speaker
  const bx = Math.max(camX + 8 + w / 2, Math.min(camX + viewW - 8 - w / 2, x)), top = y - h - 8;
  ctx.fillStyle = "rgba(12,21,30,0.92)"; ctx.strokeStyle = accent; ctx.lineWidth = Math.max(2, 2 / zoom);
  ctx.beginPath(); ctx.rect(bx - w / 2, top, w, h); ctx.fill(); ctx.stroke();
  const px = Math.max(bx - w / 2 + 12, Math.min(bx + w / 2 - 12, x));
  ctx.beginPath(); ctx.moveTo(px - 9, top + h - 1); ctx.lineTo(px, top + h + 9); ctx.lineTo(px + 9, top + h - 1); ctx.fill();
  ctx.fillStyle = accent; ctx.font = `700 ${fs * 0.8}px 'Chakra Petch', sans-serif`; ctx.fillText(name.toUpperCase(), bx, top + pad * 0.8 + fs * 0.7);
  ctx.fillStyle = "#e9eef2"; ctx.font = `700 ${fs}px 'Chakra Petch', sans-serif`; ctx.fillText(line, bx, top + pad * 0.8 + fs * 0.8 + gap + fs * 0.85);
}

function drawPlayer() {
  if (pl.dead || pl.shattered || !ch.img.head) return;
  if (pl.flash > 0 && Math.floor(pl.flash * 16) % 2) return;
  const ox = pl.x + ch.W / 2;
  if (pl.ground) { ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.beginPath(); ctx.ellipse(ox, pl.y + ch.H, ch.kind === "spider" ? 52 : 30, 5, 0, 0, Math.PI * 2); ctx.fill(); }
  drawChar(ctx, ch, pose, ox, pl.y + ch.H + 2, pl.face);
}

function drawParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.t += dt;
    if (p.t >= p.life) { particles.splice(i, 1); continue; }
    p.vy += (p.g ?? 500) * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    ctx.globalAlpha = 1 - p.t / p.life; ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "center";
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i]; p.t += dt;
    if (p.t >= p.life) { pops.splice(i, 1); continue; }
    const k = p.t / p.life;
    ctx.globalAlpha = 1 - k * k; ctx.fillStyle = p.color; ctx.font = `700 ${p.size}px 'Chakra Petch', sans-serif`;
    ctx.fillText(p.text, p.x, p.y - 30 * k);
  }
  ctx.globalAlpha = 1;
}
