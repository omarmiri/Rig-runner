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
document.querySelectorAll("[data-mode]").forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));
document.querySelectorAll("[data-len]").forEach(b => b.addEventListener("click", () => setLen(b.dataset.len === "endless")));
function setLen(endless) {
  state.endless = endless;
  try { localStorage.setItem("rigrunner.endless", endless ? "1" : "0"); } catch (e) {}
  setMode(state.gameMode);
}
function setMode(m) {
  state.gameMode = m;
  try { localStorage.setItem("rigrunner.mode", m); } catch (e) {}
  document.querySelectorAll("[data-mode]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
  document.querySelectorAll("[data-len]").forEach(b => b.setAttribute("aria-pressed", String((b.dataset.len === "endless") === !!state.endless)));
  const dance = m === "dance", best = getBest();
  document.getElementById("modeText").textContent = dance
    ? "Clear eleven levels to electro beats. A rival guards each dock: it dances a routine, then you copy it on the beat to get past. Beat the four robots, then six hybrid bosses built from their parts, then your own dark clone."
    : "Five courses across the plant, from the assembly bay to the core reactor. Reach each charging dock, grab the brass nuts, and stay off the spikes.";
  if (state.endless) document.getElementById("modeText").textContent = (dance
    ? "Endless dance battle. Every level is freshly generated and checked to be beatable before you play it. Each ends with a randomly built boss: mixed parts, colours, accessories and skills. Bosses grow every 5 levels, and every 5th boss is your dark clone."
    : "Endless free run. Every level is freshly generated with ramps, steps, gaps and spikes, and checked to be beatable before you play it. Levels get longer and harder as you go.")
    + (best ? ` Your best: ${best} level${best === 1 ? "" : "s"}.` : "");
  document.getElementById("titleEyebrow").textContent = (dance ? "Dance battle · " : "Free run · ") + (state.endless ? "Endless" : dance ? "11 levels" : "5 courses");
  document.getElementById("titleEyebrow").classList.toggle("neon", dance);
  document.getElementById("controls").innerHTML = `<dt>Run</dt><dd>← → or A D</dd><dt>Jump</dt><dd>Space, W or ↑. Hold for a higher jump</dd>` +
    (dance ? `<dt>Dance</dt><dd class="moves"><span><kbd>↑</kbd>Head spin</span><span><kbd>←</kbd>Windmill</span><span><kbd>↓</kbd>Backspin</span><span><kbd>→</kbd>Air freeze</span><span><kbd>Space</kbd>Flare</span></dd>`
           : `<dt>Drop</dt><dd>↓ or S through orange girders</dd>`);
  document.getElementById("startBtn").textContent = state.endless ? "Start endless run" : dance ? "Start level 1" : "Start course 1";
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
