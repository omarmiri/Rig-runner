// Bolt Beat · Home screen: title, menu music, and your robot dancing on a stage.
"use strict";
// The first touch or key anywhere starts the music (browsers only allow sound after one),
// and "Press here to start" goes on to the robot picker. Menu exits come back here.
const homeEl = document.getElementById("home");
const home = { pose: null, move: null, lastBar: -1, seq: ["up", "left", "act", "right", "down"], i: 0 };
const MENU_BPM = 104;

function startMenuMusic() {
  audio.unlock();
  if (!audio.ctx || (music.on && music.menu)) return;
  music.menu = true; music.intensity = 1; music.start(MENU_BPM);
}
function stopMenuMusic() { music.menu = false; }
function showHome() {
  state.paused = false; pauseCard.hidden = true; battle = null; document.body.classList.remove("battling");
  state.mode = "home"; state.levelIdx = 0;
  panel.hidden = true; titleCard.hidden = true; winCard.hidden = true;
  homeEl.hidden = false; document.body.classList.add("menu");
  const v = readSave(), best = getBest();
  document.getElementById("homeNote").textContent = v
    ? `Saved game: level ${v.levelIdx + 1} with ${CHARS[v.robot].name}` + (best > STORY_LEN ? ` · best: level ${best}` : "")
    : "Eleven story levels of platforming and dance battles, then endless.";
  home.pose = null; home.lastBar = -1;
  if (audio.ctx && audio.ctx.state === "running") startMenuMusic();
  document.getElementById("homeStart").focus({ preventScroll: true });
}
function leaveHome() {
  startMenuMusic();
  homeEl.hidden = true;
  showTitle();
}
document.getElementById("homeStart").addEventListener("click", e => { e.stopPropagation(); leaveHome(); });
// any first touch on the home screen turns the music on without leaving it
homeEl.addEventListener("pointerdown", () => startMenuMusic());

// ---------- the stage ----------
function homeBeatPos() {
  return music.on && music.menu ? (music.now() - music.lat() - music.t0) / music.beatLen() : state.time * MENU_BPM / 60;
}
function renderHome(dt) {
  const W = innerWidth, H = innerHeight, g = ctx;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const bp = homeBeatPos(), frac = ((bp % 1) + 1) % 1, bounce = Math.pow(1 - frac, 2), beat = Math.floor(bp);
  // night sky
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, "#0a0a1e"); grd.addColorStop(0.7, "#191640"); grd.addColorStop(1, "#2a1f58");
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  // sweeping lasers
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 6; i++) {
    const ox = W * (0.1 + i * 0.16), a = Math.PI / 2 + Math.sin(state.time * (0.7 + i * 0.23) + i) * 0.6;
    g.strokeStyle = ["#5ee7ff", "#ff5ec8", "#c6ff5e"][i % 3]; g.globalAlpha = 0.1 + 0.22 * bounce; g.lineWidth = 3;
    g.beginPath(); g.moveTo(ox, -10); g.lineTo(ox + Math.cos(a) * H * 1.4, Math.sin(a) * H * 1.4); g.stroke();
  }
  g.restore(); g.globalAlpha = 1;
  // the stage fits between the title and the start button
  const topBox = document.querySelector(".home-top").getBoundingClientRect(), botBox = document.querySelector(".home-bottom").getBoundingClientRect();
  const floorY = Math.min(H * 0.8, botBox.top - 14), tile = Math.max(36, W / 18);
  g.fillStyle = "#26333f"; g.fillRect(0, floorY, W, H - floorY);
  g.fillStyle = "#c9d3db"; g.fillRect(0, floorY, W, 4);
  for (let c = 0; c * tile < W; c++) {
    g.globalAlpha = 0.25 + 0.55 * bounce * ((c + beat) % 2);
    g.fillStyle = MOVE_COLOR[MOVES[(c * 3 + beat) % 5]]; g.fillRect(c * tile + 4, floorY + 6, tile - 8, 6);
  }
  g.globalAlpha = 1;
  // spotlight
  const spot = g.createRadialGradient(W / 2, floorY, 10, W / 2, floorY, Math.min(W, H) * 0.45);
  spot.addColorStop(0, `rgba(255,224,138,${0.18 + 0.12 * bounce})`); spot.addColorStop(1, "rgba(255,224,138,0)");
  g.fillStyle = spot; g.fillRect(0, 0, W, H);
  if (!ch.img.head) return;
  // nod along, and bust a move on every other bar
  const bar = Math.floor(bp / 4);
  if (bar !== home.lastBar) {
    home.lastBar = bar;
    if (bar % 2 === 1) home.move = { move: home.seq[home.i++ % home.seq.length], at: music.on && music.menu ? music.now() - music.lat() : state.time };
  }
  const nowT = music.on && music.menu ? music.now() - music.lat() : state.time;
  const saveBpm = music.bpm; music.bpm = MENU_BPM;   // dancePose times moves in beats
  const target = dancePose(ch, home.move, { frac, bounce, beat }, nowT);
  const moving = home.move && nowT - home.move.at >= 0 && nowT - home.move.at < MENU_BPM && (nowT - home.move.at) < 60 / MENU_BPM * 0.9;
  music.bpm = saveBpm;
  if (!moving && ch.kind !== "spider") {
    // between moves: a proper head nod, with the arms pumping on alternate beats
    const side = beat % 2 ? 1 : -1;
    target.hT = -0.12 + 0.34 * bounce; target.L += 0.05 * bounce;
    target.nU += 0.55 * side * bounce; target.fU -= 0.55 * side * bounce;
    target.nE += 0.3 * bounce; target.fE += 0.3 * bounce;
  }
  if (!home.pose) home.pose = Object.assign({}, target);
  blendPose(home.pose, target, 1 - Math.exp(-dt * 26));
  const size = Math.max(60, Math.min(floorY - topBox.bottom - 24, W * 0.5, 340)), sc = size / ch.height * ch.scale;
  g.fillStyle = "rgba(0,0,0,0.35)"; g.beginPath(); g.ellipse(W / 2, floorY, size * 0.32, 8, 0, 0, Math.PI * 2); g.fill();
  drawChar(g, ch, home.pose, W / 2, floorY + 2, 1, sc);
}
