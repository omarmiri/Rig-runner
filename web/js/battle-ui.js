// Rig Runner · Drawing the dance battle track, countdown and legend.
"use strict";
// ---------- screen-space battle UI ----------
function moveIcon(g, mv, x, y, s, alpha = 1, ring = null) {
  g.save(); g.globalAlpha = alpha; g.translate(x, y);
  g.fillStyle = "rgba(10,14,24,0.85)"; g.strokeStyle = MOVE_COLOR[mv]; g.lineWidth = 2;
  g.beginPath(); g.rect(-s / 2, -s / 2, s, s); g.fill(); g.stroke();
  g.fillStyle = MOVE_COLOR[mv];
  if (mv === "lasso") {
    g.strokeStyle = MOVE_COLOR.lasso; g.lineWidth = 3;
    g.beginPath(); g.ellipse(0, -s * 0.12, s * 0.32, s * 0.12, 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(-s * 0.05, s * 0.36); g.quadraticCurveTo(-s * 0.1, s * 0.05, s * 0.2, -s * 0.05); g.stroke();
  } else if (mv === "act") {
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.17 : s * 0.36; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.fill();
  } else {
    const a = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 }[mv];
    g.rotate(a); const u = s * 0.34;
    g.beginPath(); g.moveTo(u, 0); g.lineTo(0, -u); g.lineTo(0, -u * 0.45); g.lineTo(-u, -u * 0.45); g.lineTo(-u, u * 0.45); g.lineTo(0, u * 0.45); g.lineTo(0, u); g.closePath(); g.fill();
  }
  g.restore();
  if (ring) {
    g.save(); g.translate(x, y); g.strokeStyle = ring; g.lineWidth = 3; g.globalAlpha = alpha;
    g.strokeRect(-s / 2 - 4, -s / 2 - 4, s + 8, s + 8); g.restore();
  }
}
const iconFor = mv => mv === "act" && battle && battle.rival.ch.lasso ? "lasso" : mv;
function drawBattleUI() {
  const W = innerWidth, g = ctx;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cxs = W / 2;
  if (banner && state.time < banner.until) {
    const k = Math.min(1, (banner.until - state.time) / 0.4);
    g.globalAlpha = k; g.textAlign = "center";
    g.fillStyle = banner.color || "#e9eef2"; g.font = `700 ${Math.min(40, W / 14)}px 'Chakra Petch', sans-serif`;
    g.fillText(banner.text, cxs, innerHeight * 0.3);
    if (banner.sub) { g.fillStyle = "#c9d3db"; g.font = "500 16px 'Chakra Petch', sans-serif"; g.fillText(banner.sub, cxs, innerHeight * 0.3 + 28); }
    g.globalAlpha = 1;
  }
  const B = battle;
  if (!B || !B.started || B.b === undefined) return;
  const b = B.b, top = innerWidth < 700 ? 118 : 100;
  // countdown
  // current round
  let ri = B.rounds.findIndex(r => b < r.resp + r.beats + 4);
  if (ri < 0) ri = B.rounds.length - 1;
  const r = B.rounds[ri];
  const laneW = Math.min(620, W - 32), laneX = cxs - laneW / 2, laneH = 66, pad = 34;
  if (r.blackBeat !== undefined && b >= r.call + r.blackBeat && b < r.call + r.blackBeat + 1) {
    g.fillStyle = "rgba(2,4,8,0.95)"; g.fillRect(0, 0, W, innerHeight);
    g.fillStyle = "#ff5e6c"; g.font = "700 20px 'Chakra Petch', sans-serif"; g.textAlign = "center"; g.fillText("BLACKOUT", cxs, innerHeight * 0.55);
  }
  g.fillStyle = "rgba(10,14,24,0.78)"; g.fillRect(laneX, top, laneW, laneH);
  g.strokeStyle = "rgba(201,211,219,0.2)"; g.lineWidth = 1; g.strokeRect(laneX + 0.5, top + 0.5, laneW - 1, laneH - 1);
  // beat grid
  for (let i = 0; i <= r.beats; i++) {
    const x = laneX + pad + (i / r.beats) * (laneW - pad * 2);
    g.fillStyle = i % 4 === 0 ? "rgba(201,211,219,0.35)" : "rgba(201,211,219,0.15)"; g.fillRect(x, top + 8, 1, laneH - 16);
  }
  const inCall = b >= r.call && b < r.count, inCount = b >= r.count && b < r.resp, inResp = b >= r.resp && b < r.resp + r.beats;
  const ghosting = B.skills && B.skills.includes("ghost") && b >= r.count;
  for (const m of r.moves) {
    if (!m.shown) continue;
    if (m.hidden && b < r.count) continue;
    if ((ghosting && !m.res && !m.decoy) || m.decoy) {
      const x = laneX + pad + (m.off / r.beats) * (laneW - pad * 2), y = top + laneH / 2;
      if (m.decoy) {
        moveIcon(g, iconFor(m.move), x, y, 38, m.res ? 0.4 : 0.85, m.res === "dodged" ? "#6fe0a0" : m.res ? "#ff5e6c" : null);
        g.strokeStyle = "#ff5e6c"; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 17, y - 17); g.lineTo(x + 17, y + 17); g.moveTo(x + 17, y - 17); g.lineTo(x - 17, y + 17); g.stroke();
      } else {
        g.fillStyle = "rgba(10,14,24,0.85)"; g.strokeStyle = "#9aa3ff"; g.lineWidth = 2; g.fillRect(x - 19, y - 19, 38, 38); g.strokeRect(x - 19, y - 19, 38, 38);
        g.fillStyle = "#9aa3ff"; g.font = "700 22px 'Chakra Petch', sans-serif"; g.textAlign = "center"; g.fillText("?", x, y + 8);
      }
      continue;
    }
    const x = laneX + pad + (m.off / r.beats) * (laneW - pad * 2);
    const ring = m.res === "perfect" || m.res === "dodged" ? "#6fe0a0" : m.res === "good" ? "#ffe08a" : m.res === "miss" ? "#ff5e6c" : null;
    moveIcon(g, iconFor(m.move), x, top + laneH / 2, 38, m.res === "miss" ? 0.45 : 1, ring);
  }
  if (inCall || inResp) {
    const p = (b - (inCall ? r.call : r.resp)) / r.beats;
    const x = laneX + pad + p * (laneW - pad * 2);
    g.fillStyle = inCall ? "#ff5ec8" : "#5ee7ff"; g.fillRect(x - 1.5, top + 2, 3, laneH - 4);
  }
  // boss skills
  if (B.skills && B.skills.length) {
    g.textAlign = "left"; g.font = "700 11px 'Chakra Petch', sans-serif"; g.fillStyle = "#ff9a4a";
    g.fillText(("Boss skills: " + B.skills.map(k => SKILL_INFO[k][0]).join(" · ")).toUpperCase(), laneX, top - 28);
  }
  // label
  g.textAlign = "left"; g.font = "700 13px 'Chakra Petch', sans-serif";
  let label;
  if (b < r.call) label = ri === 0 ? `Round 1 of ${B.rounds.length} · ${B.rival.ch.name} dances first, watch` : `Round ${ri + 1} of ${B.rounds.length} · get ready`;
  else if (inCall) label = `Round ${ri + 1} · ${B.rival.ch.name} dances, watch`;
  else if (inCount) label = `Round ${ri + 1} · your turn: copy the moves on the beat`;
  else if (inResp) label = `Round ${ri + 1} · your turn, copy it on the beat`;
  else label = B.outcome ? (B.outcome === "win" ? "Dance-off won" : "Dance-off lost") : `Round ${ri + 1} done`;
  g.fillStyle = inCall ? "#ff5ec8" : inResp ? "#5ee7ff" : "#c9d3db";
  g.fillText(label.toUpperCase(), laneX, top - 10);
  // groove meter
  const judged = B.rounds.reduce((a, rr) => a + rr.moves.filter(m => m.res).length, 0);
  const acc = B.score / B.max;
  g.textAlign = "right"; g.fillStyle = "#c9d3db";
  g.fillText(`GROOVE ${Math.round(acc * 100)}% · NEED ${Math.round(PASS * 100)}%`, laneX + laneW, top - 10);
  const my = top + laneH + 8;
  g.fillStyle = "rgba(201,211,219,0.15)"; g.fillRect(laneX, my, laneW, 6);
  g.fillStyle = acc >= PASS ? "#6fe0a0" : "#5ee7ff"; g.fillRect(laneX, my, laneW * Math.min(1, acc), 6);
  g.fillStyle = "#e9eef2"; g.fillRect(laneX + laneW * PASS - 1, my - 3, 2, 12);
  // move legend while waiting
  if (b < 4 || (!inCall && !inResp && !inCount && !B.outcome)) {
    const items = MOVES.map(mv => [iconFor(mv), mv === "act" && B.rival.ch.lasso ? "Lasso twirl" : MOVE_NAME[mv]]);
    const iw = Math.min(118, (laneW) / 5);
    items.forEach(([mv, name], i) => {
      const x = laneX + iw * (i + 0.5);
      moveIcon(g, mv, x, my + 34, 26, 0.9);
      g.textAlign = "center"; g.fillStyle = "#c9d3db"; g.font = "500 11px 'Chakra Petch', sans-serif";
      g.fillText((mv === "act" || mv === "lasso" ? "SPACE " : "") + name.toUpperCase(), x, my + 62);
    });
  }
  // countdown, drawn last so it sits on top of the beat track
  const big = (txt, col, k) => {
    g.fillStyle = "rgba(8,12,20,0.8)"; g.fillRect(laneX, top, laneW, laneH);
    g.textAlign = "center"; g.globalAlpha = 1 - k * 0.5;
    g.shadowColor = col; g.shadowBlur = 16;
    g.fillStyle = col; g.font = `700 ${Math.round(laneH * (0.82 - 0.2 * k))}px 'Chakra Petch', sans-serif`;
    g.fillText(txt, cxs, top + laneH * 0.5 + laneH * 0.28 * (0.82 - 0.2 * k) / 0.82);
    g.shadowBlur = 0; g.globalAlpha = 1;
  };
  if (b >= 0 && b < 4) { const n = Math.floor(b); big(["GET READY", "3", "2", "1"][n], "#ff5ec8", b - n); }
  for (const rr of B.rounds) {
    if (b >= rr.count && b < rr.resp) { const n = Math.floor(b - rr.count); big(["YOUR TURN", "3", "2", "1"][n], "#5ee7ff", b - rr.count - n); }
    else if (b >= rr.resp && b < rr.resp + 1) big("GO!", "#6fe0a0", b - rr.resp);
  }
}
