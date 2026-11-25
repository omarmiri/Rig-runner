// Bolt Beat · Drawing the dance battle track, countdown and legend.
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
  const warming = B.warm && b < WARM_COUNT + WARM_TAPS + 0.6;
  if (warming) {
    // warm-up lane: one marker per beat, lit when tapped, and a playhead across them
    const span = WARM_TAPS, x0 = laneX + pad, xw = laneW - pad * 2, y = top + laneH / 2;
    for (let i = 0; i < span; i++) {
      const k = WARM_COUNT + i, x = x0 + ((i + 0.5) / span) * xw, hit = B.warmTaps.some(t => t.k === k);
      g.beginPath(); g.arc(x, y, Math.min(13, xw / span * 0.38), 0, Math.PI * 2);
      g.fillStyle = hit ? "#6fe0a0" : "rgba(201,211,219,0.12)"; g.fill();
      g.lineWidth = 2; g.strokeStyle = hit ? "#6fe0a0" : (k % 4 === 0 ? "#e9eef2" : "rgba(201,211,219,0.5)"); g.stroke();
    }
    if (b >= WARM_COUNT - 0.5) {
      const x = x0 + Math.max(0, Math.min(1, (b - WARM_COUNT + 0.5) / span)) * xw;
      g.fillStyle = "#5ee7ff"; g.fillRect(x - 1.5, top + 2, 3, laneH - 4);
    }
  }
  // beat grid
  if (!warming) for (let i = 0; i <= r.beats; i++) {
    const x = laneX + pad + (i / r.beats) * (laneW - pad * 2);
    g.fillStyle = i % 4 === 0 ? "rgba(201,211,219,0.35)" : "rgba(201,211,219,0.15)"; g.fillRect(x, top + 8, 1, laneH - 16);
  }
  const inCall = b >= r.call && b < r.count, inCount = b >= r.count && b < r.resp, inResp = b >= r.resp && b < r.resp + r.beats;
  const ghosting = B.skills && B.skills.includes("ghost") && b >= r.count;
  for (const m of r.moves) {
    if (!m.shown || warming) continue;
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
  if ((inCall || inResp) && !warming) {
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
  const need = WARM_TAPS - WARM_SKIP, counted = Math.max(0, (B.warmTaps ? B.warmTaps.length : 0) - WARM_SKIP);
  if (warming) label = b < WARM_COUNT ? "Calibrating groove · get ready to tap along"
    : counted === 0 ? "Calibrating groove · find the beat" : `Calibrating groove · ${Math.min(counted, need)} of ${need}`;
  else if (B.warm && b < r.call) label = (B.warmOk ? "Groove calibrated" : "Groove not set") + " · round 1 next: watch first";
  g.fillStyle = warming && b >= WARM_COUNT ? "#5ee7ff" : inCall ? "#ff5ec8" : inResp ? "#5ee7ff" : "#c9d3db";
  g.fillText(label.toUpperCase(), laneX, top - 10);
  // level 1 is the tutorial: say what to do in plain words under the track
  // (small screens: a short version replaces the label line, since below the track is the stage)
  const small = innerHeight < 500 || innerWidth < 600;
  let tip = null;
  if (warming) tip = small ? "Tap any move with each click · calibrating your groove"
    : "Listen for the click and tap any move with it. Your robot is calibrating its groove to your speakers or headphones.";
  else if (state.levelIdx === 0 && !state.endless && ri < 2 && !B.outcome) {
    if (inCall) tip = small ? "Watch the routine · each arrow is a move" : `Watch: ${B.rival.ch.name} dances a routine. Each arrow is a move. Remember the order.`;
    else if (inCount || inResp) tip = small ? "Your turn · tap each arrow as the line hits it"
      : coarse ? "Your turn: tap the matching coloured button as the line reaches each arrow."
      : "Your turn: press the matching arrow key as the line reaches each arrow.";
  }
  if (tip && small) {
    g.fillStyle = "rgba(10,14,24,0.92)"; g.fillRect(laneX, top - 30, laneW, 26);
    const txt = tip.toUpperCase();
    g.textAlign = "left"; g.font = "700 13px 'Chakra Petch', sans-serif";
    const fs = Math.max(9, Math.min(13, 13 * (laneW - 8) / g.measureText(txt).width));
    g.font = `700 ${fs.toFixed(1)}px 'Chakra Petch', sans-serif`; g.fillStyle = "#5ee7ff";
    g.fillText(txt, laneX + 4, top - 12);
  } else if (tip) {
    g.textAlign = "left"; g.font = "500 14px 'Chakra Petch', sans-serif"; g.fillStyle = "#e9eef2";
    const words = tip.split(" "), maxW = laneW - 160; let line = "", ly = top + laneH + 34;
    for (const w of words) {
      if (g.measureText(line + w).width > maxW && line) { g.fillText(line.trim(), laneX, ly); line = ""; ly += 18; }
      line += w + " ";
    }
    g.fillText(line.trim(), laneX, ly);
  }
  // groove meter
  const judged = B.rounds.reduce((a, rr) => a + rr.moves.filter(m => m.res).length, 0);
  const acc = B.score / B.max;
  g.textAlign = "right"; g.fillStyle = "#c9d3db";
  if (!(tip && small)) g.fillText(`GROOVE ${Math.round(acc * 100)}% · NEED ${Math.round(B.pass * 100)}%`, laneX + laneW, top - 10);
  const my = top + laneH + 8;
  g.fillStyle = "rgba(201,211,219,0.15)"; g.fillRect(laneX, my, laneW, 6);
  g.fillStyle = acc >= B.pass ? "#6fe0a0" : "#5ee7ff"; g.fillRect(laneX, my, laneW * Math.min(1, acc), 6);
  g.fillStyle = "#e9eef2"; g.fillRect(laneX + laneW * B.pass - 1, my - 3, 2, 12);
  // move legend while waiting
  // (on touch screens the colour-coded dance pad is the legend, and the drawn one would sit under thumbs or robots)
  if ((b < 4 || (!inCall && !inResp && !inCount && !B.outcome)) && !coarse && !(tip && !small)) {
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
    let fs = Math.round(laneH * (0.82 - 0.2 * k));
    g.font = `700 ${fs}px 'Chakra Petch', sans-serif`;
    const tw = g.measureText(txt).width;
    if (tw > laneW - 24) { fs = Math.floor(fs * (laneW - 24) / tw); g.font = `700 ${fs}px 'Chakra Petch', sans-serif`; }
    g.fillStyle = col;
    g.fillText(txt, cxs, top + laneH * 0.5 + fs * 0.35);
    g.shadowBlur = 0; g.globalAlpha = 1;
  };
  // above the player's robot while calibrating: a tag with a progress bar that fills with each counted tap
  if (B.warm && b >= 0 && b < WARM_COUNT + WARM_TAPS + 1) {
    const done = b >= WARM_COUNT + WARM_TAPS + 0.6;
    const sx = (pl.x + ch.W / 2 - camX) * zoom, sy = (pl.y - camY) * zoom - 18;
    const w = 160, h = 30, minY = top + laneH + 12;
    let x = sx - w / 2, y = sy - h;
    // no room above the head (short landscape screens): sit beside the robot instead of on it
    if (y < minY) { x = sx - (ch.W / 2) * zoom - 14 - w; y = sy + ch.H * zoom * 0.25; }
    x = Math.max(8, Math.min(W - w - 8, x)); y = Math.max(minY, y);
    const col = done ? (B.warmOk ? "#6fe0a0" : "#ffe08a") : "#5ee7ff";
    g.fillStyle = "rgba(8,12,20,0.88)"; g.fillRect(x, y, w, h);
    g.strokeStyle = col; g.lineWidth = 1.5; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    g.textAlign = "center"; g.font = "700 10px 'Chakra Petch', sans-serif"; g.fillStyle = col;
    g.fillText(done ? (B.warmOk ? "GROOVE CALIBRATED" : "GROOVE NOT SET") : b < WARM_COUNT ? "CALIBRATING GROOVE"
      : counted === 0 ? "CALIBRATING · FIND THE BEAT" : `CALIBRATING GROOVE · ${Math.min(counted, need)}/${need}`, x + w / 2, y + 13);
    g.fillStyle = "rgba(201,211,219,0.18)"; g.fillRect(x + 8, y + 19, w - 16, 5);
    g.fillStyle = col; g.fillRect(x + 8, y + 19, (w - 16) * (done ? 1 : Math.min(1, counted / need)), 5);
  }
  // the player's count-in sits in a badge under the track, so the moves to copy (and the playhead) stay in view
  const badge = (txt, col, k) => {
    const h = 44, y = top + laneH + 18, fs = Math.round(30 - 6 * k);
    g.font = `700 ${fs}px 'Chakra Petch', sans-serif`;
    const w = Math.max(h * 1.6, g.measureText(txt).width + 36), bx = laneX + laneW - w / 2; // right end: clear of the robots and the pads
    g.globalAlpha = 1 - k * 0.35;
    g.fillStyle = "rgba(8,12,20,0.88)"; g.fillRect(bx - w / 2, y, w, h);
    g.strokeStyle = col; g.lineWidth = 2; g.strokeRect(bx - w / 2 + 1, y + 1, w - 2, h - 2);
    g.textAlign = "center"; g.shadowColor = col; g.shadowBlur = 12; g.fillStyle = col;
    g.fillText(txt, bx, y + h / 2 + fs * 0.36);
    g.shadowBlur = 0; g.globalAlpha = 1;
  };
  if (B.warm) {
    if (b >= 0 && b < WARM_COUNT) { const n = Math.floor(b); big(["TAP ALONG", "3", "2", "1"][n], "#5ee7ff", b - n); }
    const g0 = WARM_COUNT + WARM_TAPS;
    if (b >= g0 && b < g0 + 4) {
      const n = Math.floor(b - g0);
      if (n === 0) big(B.warmOk ? "GROOVE CALIBRATED ✓" : B.warmWhy === "few" ? "MORE TAPS NEXT TIME" : "TAPS TOO UNEVEN · NEXT TIME", B.warmOk ? "#6fe0a0" : "#ffe08a", 0);
      else big(["", "3", "2", "1"][n], "#ff5ec8", b - g0 - n);
    }
  } else if (b >= 0 && b < 4) { const n = Math.floor(b); big(["GET READY", "3", "2", "1"][n], "#ff5ec8", b - n); }
  for (const rr of B.rounds) {
    if (b >= rr.count && b < rr.resp) { const n = Math.floor(b - rr.count); badge(["YOUR TURN", "3", "2", "1"][n], "#5ee7ff", b - rr.count - n); }
    else if (b >= rr.resp && b < rr.resp + 1) badge("GO!", "#6fe0a0", b - rr.resp);
  }
}
