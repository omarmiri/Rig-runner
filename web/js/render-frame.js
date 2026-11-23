// Bolt Beat · Frame render and HUD.
"use strict";
const dancePadGrid = document.querySelector("#touchDance .dpad");
function render(dt) {
  if (state.mode === "home") { renderHome(dt); return; }
  const bi = beatInfo();
  let target;
  if (battle && rival) target = (pl.x + ch.W / 2 + rival.x) / 2 - viewW / 2;
  else target = pl.x + ch.W / 2 - viewW * 0.4 + pl.face * 60;
  camX += (target - camX) * (1 - Math.exp(-dt * (battle ? 4 : 6)));
  camX = Math.max(0, Math.min(COLS * T - viewW, camX));
  // portrait dance-offs: the plus pad is tall, so slide the stage up above it (the screen has room to spare)
  let wantBand = padBandBase;
  if (coarse && innerHeight > innerWidth && document.body.classList.contains("battling")) {
    const r = dancePadGrid.getBoundingClientRect();
    if (r.height) wantBand = Math.max(wantBand, Math.round(innerHeight - r.top + 12));
  }
  padBand += (wantBand - padBand) * (1 - Math.exp(-dt * 6));
  if (Math.abs(wantBand - padBand) < 0.5) padBand = wantBand;
  camY = ROWS * T - (innerHeight - padBand) / zoom;
  const z = zoom * dpr, cx = Math.round(camX * z) / z;
  let sy = 0;
  if (battle && battle.started && rival && !rival.shattered && rival.ch.height > 175 && !reduceMotion) sy = (Math.random() - 0.5) * (rival.ch.height - 175) / 80 * 8 * bi.bounce;
  ctx.setTransform(z, 0, 0, z, -cx * z, (-camY + sy) * z);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  const saved = camX; camX = cx;
  drawBackground(bi); drawTiles(); drawArena(bi); drawProps(); drawRival(); drawPlayer(); drawDebris(); drawParticles(dt);
  camX = saved;
  if (state.mode !== "title") drawBattleUI();
}

const hudBolts = document.getElementById("hudBolts"), hudTime = document.getElementById("hudTime"), hudArmor = document.getElementById("hudArmor"), hudLvl = document.getElementById("hudLvl");
function updateHud() {
  const cap = Math.max(1, bolts.length), e = state.energy ?? 0;
  document.getElementById("hudEnergy").textContent = `${e} / ${bolts.length}`;
  document.getElementById("hudEbar").style.width = `${Math.min(100, (e / cap) * 100)}%`;
  hudBolts.classList.toggle("max", e >= bolts.length && bolts.length > 0);
  hudBolts.classList.toggle("low", e > 0 && e <= ENERGY.fall);
  hudTime.textContent = state.runTime.toFixed(2); hudArmor.textContent = pl.armor ?? 0;
  hudLvl.textContent = state.endless ? String(state.levelIdx + 1) : `${state.levelIdx + 1} / ${STORY_LEN}`;
}
