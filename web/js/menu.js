// Rig Runner · Title menu: modes, robot picker, phone steps.
"use strict";
// ---------- menu: mode + robot picker ----------
const picker = document.getElementById("picker"), barsEl = document.getElementById("bars"), abilityEl = document.getElementById("ability");
const previews = [];
ORDER.forEach((k, i) => {
  const c = CHARS[k];
  const b = document.createElement("button");
  b.type = "button"; b.className = "pick"; b.dataset.k = k; b.setAttribute("aria-pressed", "false");
  b.innerHTML = `<canvas width="240" height="240" aria-hidden="true"></canvas><span class="nm">${c.name}</span><span class="key">${i + 1}</span>`;
  b.addEventListener("click", () => pick(k));
  b.addEventListener("dblclick", () => { pick(k); startGame(); });
  picker.appendChild(b);
  previews.push({ k, cv: b.querySelector("canvas"), phase: i * 1.3 });
});
// The title text and controls (there is one game: the story, then endless battles).
function refreshMenu() {
  const best = getBest();
  document.getElementById("modeText").textContent =
    "Eleven story levels to electro beats. A rival guards each dock: it dances a routine, then you copy it on the beat to get past. " +
    "Beat the four robots, six hybrid bosses and your own dark clone, then keep going: endless levels with new bosses that grow every five levels. " +
    "Bolts are your energy: grab them all for max energy. A fall costs 3, a lost dance-off costs 5, and running out is game over." +
    (best > STORY_LEN ? ` Your best: level ${best}.` : "");
  document.getElementById("titleEyebrow").textContent = "Dance battles · 11 story levels, then endless";
  document.getElementById("titleEyebrow").classList.add("neon");
  document.getElementById("controls").innerHTML = `<dt>Run</dt><dd>← → or A D</dd><dt>Jump</dt><dd>Space, W or ↑. Hold for a higher jump</dd><dt>Drop</dt><dd>↓ or S through orange girders</dd>` +
    `<dt>Dance</dt><dd class="moves"><span><kbd>↑</kbd>Head spin</span><span><kbd>←</kbd>Windmill</span><span><kbd>↓</kbd>Backspin</span><span><kbd>→</kbd>Air freeze</span><span><kbd>Space</kbd>Flare</span></dd>`;
  refreshContinue();
  document.getElementById("hudLvlBox").hidden = false;
  if (state.mode === "title") restartLevel();
}
function pick(k) {
  sel = k; ch = CHARS[k];
  try { localStorage.setItem("rigrunner.robot", k); } catch (e) {}
  document.querySelectorAll(".pick").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.k === k)));
  const pct = v => Math.round(v / 5 * 100);
  barsEl.innerHTML = `<span>Speed</span><span class="bar"><i style="width:${pct(ch.stats.speed)}%"></i></span>
    <span>Jump</span><span class="bar"><i style="width:${pct(ch.stats.jump)}%"></i></span>`;
  abilityEl.innerHTML = `<b>${ch.ability[0]}</b>${ch.ability[1]}`;
  document.getElementById("hudBot").textContent = ch.name;
  document.getElementById("hudArmorBox").hidden = !ch.P.armor;
  restartLevel();
  if (state.mode === "title") refreshContinue();
}
function drawPreviews(dt) {
  for (const pv of previews) {
    const c = CHARS[pv.k], g = pv.cv.getContext("2d");
    const active = pv.k === sel;
    pv.phase += dt * (active ? 9 : 0);
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 240, 240);
    if (!c.img.head) continue;
    let P;
    if (c.kind === "spider") P = active ? spiderGait(c, pv.phase / (Math.PI * 2), 1, state.time) : spiderGait(c, 0, 0, state.time);
    else P = active ? bipedRun(pv.phase) : bipedIdle(state.time + pv.phase);
    const sc = 190 / Math.max(c.height, c.kind === "spider" ? 150 : 0) * c.scale;
    g.fillStyle = "rgba(0,0,0,0.3)"; g.beginPath(); g.ellipse(120, 222, c.kind === "spider" ? 80 : 40, 6, 0, 0, Math.PI * 2); g.fill();
    g.imageSmoothingQuality = "high";
    drawChar(g, c, P, 120, 222, 1, sc);
  }
}
