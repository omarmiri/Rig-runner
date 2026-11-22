// Rig Runner · Main loop and startup.
"use strict";
let last = 0, stepAcc = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000 || 0); last = now;
  if (sizeChanged()) resize();
  // pads hidden (menu, card, battle start) while a finger was on one: let go of everything
  if (touchHeld.size && (document.body.classList.contains("menu") || document.body.classList.contains("battling"))) releaseTouch();
  stepAcc += dt; let n = 0;
  if (state.paused) stepAcc = 0;
  while (stepAcc >= STEP && n < 6) { update(STEP); stepAcc -= STEP; n++; }
  if (n === 6) stepAcc = 0;
  render(Math.min(dt, 0.05)); updateHud();
  if (state.mode === "title") drawPreviews(dt);
  requestAnimationFrame(frame);
}

document.body.classList.add("menu");
// offline support and Home Screen install (only on a real site, not inside an embedded preview)
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost") && window.top === window.self)
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
resize();
Promise.all([hatReady, ...ORDER.map(k => loadChar(CHARS[k]))]).then(() => {
  ORDER.forEach(k => calibrate(CHARS[k]));
  refreshMenu();
  pick(sel);
  setStep(1);
  showHome();
  requestAnimationFrame(t => { last = t; frame(t); });
});
window.__game = { dbg: { bipedBreak, spiderBreak, drawChar, bipedRun, bipedIdle, spiderGait, spiderAir, B_RISE, B_FALL, B_DANCE, dancePose, spiderDance }, state, pl, input, music,
  get battle() { return battle; }, get rival() { return rival; }, get pose() { return pose; }, hintsCount: () => hints.length, rivalOff: () => { rival = null; battle = null; }, boltsList: () => bolts, gameOver, ENERGY, update, pressJump, startLevelForTest: () => startLevel(), startGame, continueGame, readSave, pick, refreshMenu, showTitle, showHome, leaveHome, STORY_LEN, battleInput, CHARS, HYBRIDS, makeHybrid, genLevel, solveLevel, loadLevel, endlessLevel, endlessBossSpec, buildEndlessBoss, rng32, hashSeed, get levelDef() { return levelDef; }, DANCE_LEVELS, startLevel, get grid() { return grid; },
  get ch() { return ch; }, get cam() { return [camX, camY, zoom]; } };
