// Rig Runner · Game state, level flow and saved progress.
"use strict";
// ================= Game state =================
const state = { mode: "title", gameMode: "dance", levelIdx: 0, time: 0, runTime: 0, timing: false, collected: 0, totalTime: 0, totalBolts: 0, totalAcc: [] };
let sel = "runner";
try { const s = localStorage.getItem("rigrunner.robot"); if (s && CHARS[s]) sel = s; } catch (e) {}
try { const m = localStorage.getItem("rigrunner.mode"); if (m === "dance" || m === "course") state.gameMode = m; } catch (e) {}
try { state.endless = localStorage.getItem("rigrunner.endless") === "1"; } catch (e) {}
let ch = CHARS[sel];
const pl = {};
let pose = {};
const particles = [], pops = [];
let respawnAt = null, battle = null, cardPrimary = null, banner = null;

function resetPlayer(at) {
  Object.assign(pl, { x: at.x - ch.W / 2, y: at.y - ch.H, vx: 0, vy: 0, face: 1, ground: false, coyote: 0, phase: 0, landT: 0, dropT: 0,
    dead: 0, flash: 0, airJumps: ch.P.airJumps, armor: ch.P.armor, hurtT: 0, dance: null });
  pose = ch.kind === "spider" ? spiderGait(ch, 0, 0, 0) : bipedIdle(0);
}
function restartLevel() {
  levelDef = state.endless && state.mode !== "title" ? endlessLevel(state.levelIdx) : levelList()[state.mode === "title" ? 0 : state.levelIdx];
  loadLevel(levelDef);
  respawnAt = { x: spawn.c * T + T / 2, y: spawn.r * T };
  state.runTime = 0; state.timing = false; state.collected = 0; particles.length = 0; pops.length = 0; debris.length = 0; pl.shattered = false;
  battle = null; banner = null; state.finished = false; document.body.classList.remove("battling");
  resetPlayer(respawnAt);
  camX = Math.max(0, pl.x - viewW * 0.3);
  updateHud();
}
const panel = document.getElementById("panel"), titleCard = document.getElementById("titleCard"), winCard = document.getElementById("winCard");
function play() {
  state.mode = "play"; panel.hidden = true; document.body.classList.remove("menu");
  for (const k in input) input[k] = false;
}
// ---------- saved progress: one slot per mode (dance / free run) and length (campaign / endless) ----------
const saveKey = () => `rigrunner.save.${state.gameMode}.${state.endless ? "endless" : "campaign"}`;
function readSave() {
  try {
    const v = JSON.parse(localStorage.getItem(saveKey()) || "null");
    if (!v || typeof v.levelIdx !== "number" || !CHARS[v.robot]) return null;
    if (!state.endless && v.levelIdx >= levelList().length) return null;
    return v;
  } catch (e) { return null; }
}
function writeSave(levelIdx) {
  try {
    localStorage.setItem(saveKey(), JSON.stringify({ levelIdx, robot: sel, runSeed: state.runSeed, cleared: state.endless ? levelIdx : state.cleared || 0,
      totalTime: state.totalTime, totalBolts: state.totalBolts, totalAcc: state.totalAcc, at: Date.now() }));
  } catch (e) {}
}
function clearSave() { try { localStorage.removeItem(saveKey()); } catch (e) {} }
function continueGame() {
  const v = readSave(); if (!v) { startGame(); return; }
  audio.unlock();
  if (v.robot !== sel) pick(v.robot);
  Object.assign(state, { levelIdx: v.levelIdx, runSeed: v.runSeed | 0, cleared: v.cleared || 0, totalTime: v.totalTime || 0, totalBolts: v.totalBolts || 0,
    totalAcc: Array.isArray(v.totalAcc) ? v.totalAcc : [], endCache: null });
  startLevel();
}
function refreshContinue() {
  const v = readSave(), cb = document.getElementById("continueBtn"), sb = document.getElementById("startBtn"), note = document.getElementById("saveNote");
  cb.hidden = !v; note.hidden = !v;
  sb.classList.toggle("ghost", !!v);
  sb.textContent = state.endless ? "Start endless run" : state.gameMode === "dance" ? "Start level 1" : "Start course 1";
  if (v) {
    const unit = state.gameMode === "course" && !state.endless ? "course" : "level";
    cb.textContent = `Continue · ${unit} ${v.levelIdx + 1}${v.robot !== sel ? " as " + CHARS[v.robot].name : ""}`;
    sb.textContent = "New game";
    const when = new Date(v.at || Date.now());
    note.textContent = `Saved progress: ${unit} ${v.levelIdx + 1} with ${CHARS[v.robot].name}${state.endless ? `, ${v.cleared} cleared this run` : ""} · ${when.toLocaleDateString()} ${when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. A new game replaces it.`;
  }
}
document.getElementById("continueBtn").addEventListener("click", continueGame);
const stepMQ = (() => { try { return matchMedia("(max-width: 700px), (max-height: 540px)"); } catch (e) { return { matches: false, addEventListener() {} }; } })();
let titleStep = 1;
function setStep(n) {
  titleStep = n;
  const card = document.getElementById("titleCard");
  card.classList.toggle("stepped", stepMQ.matches);
  card.querySelectorAll(".step").forEach(el => el.classList.toggle("on", +el.dataset.step === n));
  card.querySelectorAll("#stepDots li").forEach(li => { li.classList.toggle("on", +li.dataset.s === n); li.classList.toggle("done", +li.dataset.s < n); });
  document.getElementById("backBtn").hidden = n === 1;
  const next = document.getElementById("nextBtn"); next.hidden = n === 3;
  next.textContent = n === 1 ? "Next: pick robot" : "Next: start";
  document.getElementById("summary").textContent = `${state.gameMode === "dance" ? "Dance battle" : "Free run"} · ${state.endless ? "Endless" : "Campaign"} · ${ch.name}`;
  card.scrollTop = 0;
}
document.getElementById("nextBtn").addEventListener("click", () => setStep(Math.min(3, titleStep + 1)));
document.getElementById("backBtn").addEventListener("click", () => setStep(Math.max(1, titleStep - 1)));
try { stepMQ.addEventListener("change", () => setStep(titleStep)); } catch (e) {}
function startGame() {
  audio.unlock();
  state.levelIdx = 0; state.totalTime = 0; state.totalBolts = 0; state.totalAcc = []; state.cleared = 0;
  state.runSeed = (Math.random() * 2147483647) | 0; state.endCache = null;
  startLevel();
}
function startLevel() {
  state.mode = "loading";
  restartLevel();
  writeSave(state.levelIdx);
  const sub = state.endless && levelDef.bossSpec ? `${levelDef.bpm} BPM · boss size ${levelDef.bossSpec.scale.toFixed(1)}×` : `${levelDef.bpm} BPM`;
  if (state.gameMode === "dance") { music.intensity = 1; music.start(levelDef.bpm); banner = { text: `Level ${state.levelIdx + 1} · ${levelDef.name}`, sub, until: state.time + 2.4 }; }
  else { music.stop(); if (state.endless) banner = { text: `Level ${state.levelIdx + 1} · ${levelDef.name}`, sub: "Endless free run", until: state.time + 2 }; }
  play();
}
function showTitle() {
  state.mode = "title"; titleCard.hidden = false; winCard.hidden = true; panel.hidden = false; document.body.classList.add("menu");
  music.stop(); battle = null; document.body.classList.remove("battling");
  state.levelIdx = 0; restartLevel(); refreshContinue(); setStep(1);
  document.querySelector(`.pick[data-k="${sel}"]`)?.focus({ preventScroll: true });
}
function showCard(html, primary) {
  state.mode = "card"; winCard.innerHTML = html; titleCard.hidden = true; winCard.hidden = false; panel.hidden = false;
  document.body.classList.add("menu"); cardPrimary = primary;
  winCard.querySelector("[data-act=primary]")?.addEventListener("click", primary);
  winCard.querySelector("[data-act=menu]")?.addEventListener("click", showTitle);
  winCard.querySelector("[data-act=end]")?.addEventListener("click", endRun);
  winCard.querySelector("[data-act=primary]")?.focus({ preventScroll: true });
}
document.getElementById("startBtn").addEventListener("click", startGame);
