// Rig Runner · Keyboard and touch input.
"use strict";
// ================= Input =================
const input = { left: false, right: false, jump: false, down: false };
let jumpPressedAt = -1;
const keymap = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "jump", KeyW: "jump", Space: "jump", KeyZ: "jump", ArrowDown: "down", KeyS: "down" };
const dancemap = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", Space: "act", KeyX: "act", KeyJ: "act", Enter: "act" };
addEventListener("keydown", e => {
  if (e.code === "KeyM") { audio.setMuted(!audio.muted); return; }
  if (state.mode === "title") {
    if (e.code === "ArrowLeft" || e.code === "KeyA") { e.preventDefault(); pick(ORDER[(ORDER.indexOf(sel) + ORDER.length - 1) % ORDER.length]); return; }
    if (e.code === "ArrowRight" || e.code === "KeyD") { e.preventDefault(); pick(ORDER[(ORDER.indexOf(sel) + 1) % ORDER.length]); return; }
    const n = parseInt(e.key, 10); if (n >= 1 && n <= ORDER.length) { pick(ORDER[n - 1]); return; }
    if (e.code === "Enter" || e.code === "Space") { if (e.target.closest && e.target.closest("button")) return; e.preventDefault(); readSave() ? continueGame() : startGame(); }
    return;
  }
  if (state.mode === "card") {
    if (e.code === "Escape") { e.preventDefault(); showTitle(); }
    else if (e.code === "Enter" || e.code === "Space") { if (e.target.closest && e.target.closest("button")) return; e.preventDefault(); cardPrimary && cardPrimary(); }
    return;
  }
  if (state.paused) {
    if (e.code === "Escape" || e.code === "KeyP") { e.preventDefault(); resumeGame(); }
    return;
  }
  if (e.code === "Escape" || e.code === "KeyP") { e.preventDefault(); pauseGame(); return; }
  if (battle && battle.started) {
    const m = dancemap[e.code];
    if (m) { e.preventDefault(); if (!e.repeat) battleInput(m); }
    return;
  }
  const k = keymap[e.code];
  if (k) { e.preventDefault(); if (k === "jump" && !input.jump) pressJump(); input[k] = true; }
  if (e.code === "KeyR" && !battle) restartLevel();
});
addEventListener("keyup", e => { const k = keymap[e.code]; if (k) input[k] = false; });
addEventListener("blur", () => { for (const k in input) input[k] = false; pauseGame(); });
function pressJump() { jumpPressedAt = state.time; audio.unlock(); }
document.querySelectorAll("#touchRun button").forEach(btn => {
  const k = btn.dataset.k;
  const on = e => { e.preventDefault(); if (state.mode !== "play") return; if (k === "jump" && !input.jump) pressJump(); input[k] = true; btn.classList.add("on"); };
  const off = e => { e.preventDefault(); input[k] = false; btn.classList.remove("on"); };
  btn.addEventListener("pointerdown", on); btn.addEventListener("pointerup", off);
  btn.addEventListener("pointercancel", off); btn.addEventListener("pointerleave", off);
});
document.querySelectorAll("#touchDance button").forEach(btn => {
  btn.addEventListener("pointerdown", e => { e.preventDefault(); btn.classList.add("on"); if (battle && battle.started) battleInput(btn.dataset.m); });
  const off = e => { e.preventDefault(); btn.classList.remove("on"); };
  btn.addEventListener("pointerup", off); btn.addEventListener("pointercancel", off); btn.addEventListener("pointerleave", off);
});
