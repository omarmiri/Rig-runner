// Bolt Beat · Game state, level flow and saved progress.
"use strict";
// ================= Game state =================
const state = { mode: "title", gameMode: "dance", levelIdx: 0, time: 0, runTime: 0, timing: false, collected: 0, totalTime: 0, totalBolts: 0, totalAcc: [] };
let sel = "runner";
try { const s = localStorage.getItem("rigrunner.robot"); if (s && CHARS[s]) sel = s; } catch (e) {}

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
  // levels 1-11 are the story; from level 12 on, levels and bosses are generated (endless)
  state.endless = state.mode !== "title" && state.levelIdx >= STORY_LEN;
  levelDef = state.endless ? endlessLevel(state.levelIdx) : DANCE_LEVELS[state.mode === "title" ? 0 : state.levelIdx];
  loadLevel(levelDef);
  levelEnergyStart();
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
// one save slot: the story and the endless levels after it are one game
const saveKey = () => "rigrunner.save.story";
function readSave() {
  try {
    // keep progress from the old separate Dance campaign slot
    if (!localStorage.getItem(saveKey()) && localStorage.getItem("rigrunner.save.dance.campaign"))
      localStorage.setItem(saveKey(), localStorage.getItem("rigrunner.save.dance.campaign"));
    const v = JSON.parse(localStorage.getItem(saveKey()) || "null");
    if (!v || typeof v.levelIdx !== "number" || v.levelIdx < 0 || !CHARS[v.robot]) return null;
    return v;
  } catch (e) { return null; }
}
function writeSave(levelIdx) {
  try {
    localStorage.setItem(saveKey(), JSON.stringify({ levelIdx, robot: sel, runSeed: state.runSeed, cleared: levelIdx,
      totalTime: state.totalTime, totalBolts: state.totalBolts, totalAcc: state.totalAcc, energy: state.carry ?? ENERGY.start, at: Date.now() }));
  } catch (e) {}
}
function clearSave() { try { localStorage.removeItem(saveKey()); } catch (e) {} }
function continueGame() {
  const v = readSave(); if (!v) { startGame(); return; }
  audio.unlock();
  if (v.robot !== sel) pick(v.robot);
  Object.assign(state, { levelIdx: v.levelIdx, runSeed: v.runSeed | 0, cleared: v.cleared || 0, totalTime: v.totalTime || 0, totalBolts: v.totalBolts || 0,
    totalAcc: Array.isArray(v.totalAcc) ? v.totalAcc : [], endCache: null, carry: typeof v.energy === "number" ? v.energy : ENERGY.start });
  startLevel();
}
function refreshContinue() {
  const v = readSave(), cb = document.getElementById("continueBtn"), sb = document.getElementById("startBtn"), note = document.getElementById("saveNote");
  cb.hidden = !v; note.hidden = !v;
  sb.classList.toggle("ghost", !!v);
  sb.textContent = "Start";
  if (v) {
    cb.textContent = `Continue · level ${v.levelIdx + 1}${v.robot !== sel ? " as " + CHARS[v.robot].name : ""}`;
    sb.textContent = "New game";
    const when = new Date(v.at || Date.now()), where = v.levelIdx >= STORY_LEN ? "endless battles" : "the story";
    note.textContent = `Saved: level ${v.levelIdx + 1} (${where}) with ${CHARS[v.robot].name} · ${when.toLocaleDateString()} ${when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. A new game starts again from level 1.`;
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
  document.getElementById("backBtn").hidden = false;
  document.getElementById("backBtn").textContent = n === 1 ? "Home" : "Back";
  const next = document.getElementById("nextBtn"); next.hidden = n === 2;
  next.textContent = "Next: start";
  document.getElementById("summary").textContent = `Playing as ${ch.name}`;
  card.scrollTop = 0;
}
document.getElementById("nextBtn").addEventListener("click", () => setStep(Math.min(2, titleStep + 1)));
document.getElementById("backBtn").addEventListener("click", () => titleStep === 1 ? showHome() : setStep(titleStep - 1));
try { stepMQ.addEventListener("change", () => setStep(titleStep)); } catch (e) {}
function startGame() {
  audio.unlock();
  state.levelIdx = 0; state.totalTime = 0; state.totalBolts = 0; state.totalAcc = []; state.cleared = 0; state.carry = ENERGY.start;
  state.runSeed = (Math.random() * 2147483647) | 0; state.endCache = null;
  startLevel();
}
function startLevel() {
  stopMenuMusic(); homeEl.hidden = true;
  state.mode = "loading";
  restartLevel();
  writeSave(state.levelIdx);
  const sub = state.endless && levelDef.bossSpec ? `${levelDef.bpm} BPM · boss size ${levelDef.bossSpec.scale.toFixed(1)}×` : `${levelDef.bpm} BPM`;
  music.intensity = 1; music.start(levelDef.bpm);
  banner = { text: `Level ${state.levelIdx + 1} · ${levelDef.name}`, sub: state.levelIdx === STORY_LEN ? `Endless battles begin · ${sub}` : sub, until: state.time + 2.4 };
  play();
}
// ---------- pause ----------
const pauseCard = document.getElementById("pauseCard");
function pauseGame() {
  if (state.mode !== "play" || state.paused || state.finished) return;
  state.paused = true; music.stop();
  for (const k in input) input[k] = false;
  document.getElementById("pauseWhere").textContent = `${state.endless ? "Endless · " : ""}Level ${state.levelIdx + 1} · ${levelDef.name}`;
  document.getElementById("pauseNote").textContent = battle && battle.started && !battle.outcome
    ? "The dance-off restarts from its countdown when you resume." : "Everything is frozen until you resume.";
  titleCard.hidden = true; winCard.hidden = true; pauseCard.hidden = false; panel.hidden = false;
  document.body.classList.add("menu");
  document.getElementById("resumeBtn").focus({ preventScroll: true });
}
function closePause() { state.paused = false; pauseCard.hidden = true; panel.hidden = true; document.body.classList.remove("menu"); }
function resumeGame() {
  if (!state.paused) return;
  closePause();
  {
    music.intensity = battle ? 2 : 1; music.start(levelDef.bpm);
    // the battle runs on the music clock, so a paused battle restarts from its countdown
    if (battle && !battle.outcome) { battle = null; rival.dance = null; startBattle(); }
  }
}
document.getElementById("pauseBtn").addEventListener("click", () => pauseGame());
document.getElementById("resumeBtn").addEventListener("click", () => resumeGame());
document.getElementById("restartBtn").addEventListener("click", () => { closePause(); startLevel(); });
document.getElementById("quitBtn").addEventListener("click", () => { closePause(); showHome(); });
document.addEventListener("visibilitychange", () => { if (document.hidden) pauseGame(); });
function showTitle() {
  state.paused = false; pauseCard.hidden = true;
  state.mode = "title"; titleCard.hidden = false; winCard.hidden = true; panel.hidden = false; document.body.classList.add("menu");
  battle = null; document.body.classList.remove("battling"); homeEl.hidden = true;
  state.levelIdx = 0; restartLevel(); refreshContinue(); setStep(1);
  if (audio.ctx && audio.ctx.state === "running") startMenuMusic(); else music.stop();
  document.querySelector(`.pick[data-k="${sel}"]`)?.focus({ preventScroll: true });
}
function showCard(html, primary) {
  state.mode = "card"; winCard.innerHTML = html; titleCard.hidden = true; winCard.hidden = false; panel.hidden = false;
  document.body.classList.add("menu"); cardPrimary = primary;
  winCard.querySelector("[data-act=primary]")?.addEventListener("click", primary);
  winCard.querySelector("[data-act=menu]")?.addEventListener("click", showHome);
  winCard.querySelector("[data-act=end]")?.addEventListener("click", endRun);
  winCard.querySelector("[data-act=primary]")?.focus({ preventScroll: true });
}
document.getElementById("startBtn").addEventListener("click", startGame);
