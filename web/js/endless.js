// Rig Runner · Endless mode: accessories, generated bosses, level pipeline, best score.
"use strict";
// ---------- accessories, drawn in code and worn on the head ----------
const ACC = {
  crown: { anchor: "top", sw: 0.8, py: 0.88, name: "crown" },
  antenna: { anchor: "top", sw: 0.45, py: 0.96, name: "antenna" },
  horns: { anchor: "top", sw: 1.1, py: 0.72, name: "horns" },
  headphones: { anchor: "mid", sw: 1.3, py: 0.5, name: "headphones" },
  mohawk: { anchor: "top", sw: 0.7, py: 0.86, name: "mohawk" },
  halo: { anchor: "top", sw: 1.0, py: 1.45, name: "halo" },
  hat: { anchor: "top", sw: 1.65, px: 0.47, py: 0.68, drop: 0.14, name: "cowboy hat" },
};
function accCanvas(kind, col) {
  const c = document.createElement("canvas"); c.width = 200; c.height = 200;
  const g = c.getContext("2d"); g.lineCap = "round"; g.lineJoin = "round";
  if (kind === "crown") {
    g.fillStyle = "#ffd24a"; g.strokeStyle = "#6a4c0c"; g.lineWidth = 6;
    g.beginPath(); g.moveTo(20, 180); g.lineTo(20, 80); g.lineTo(60, 130); g.lineTo(100, 60); g.lineTo(140, 130); g.lineTo(180, 80); g.lineTo(180, 180); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = col; for (const x of [55, 100, 145]) { g.beginPath(); g.arc(x, 158, 12, 0, Math.PI * 2); g.fill(); }
  } else if (kind === "antenna") {
    g.strokeStyle = "#16161e"; g.lineWidth = 22; g.beginPath(); g.moveTo(100, 196); g.lineTo(100, 70); g.stroke(); g.strokeStyle = "#c9d3db"; g.lineWidth = 12; g.stroke();
    g.shadowColor = col; g.shadowBlur = 24; g.fillStyle = col; g.beginPath(); g.arc(100, 52, 30, 0, Math.PI * 2); g.fill();
  } else if (kind === "horns") {
    g.fillStyle = col; g.strokeStyle = "#16161e"; g.lineWidth = 6;
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(100 + s * 22, 196); g.bezierCurveTo(100 + s * 80, 192, 100 + s * 98, 110, 100 + s * 72, 22); g.bezierCurveTo(100 + s * 72, 92, 100 + s * 60, 160, 100 + s * 56, 196); g.closePath(); g.fill(); g.stroke(); }
  } else if (kind === "headphones") {
    g.strokeStyle = "#20242c"; g.lineWidth = 16; g.beginPath(); g.arc(100, 112, 80, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    g.fillStyle = col; g.lineWidth = 6;
    for (const x of [22, 178]) { g.beginPath(); g.ellipse(x, 120, 22, 34, 0, 0, Math.PI * 2); g.fill(); g.stroke(); }
  } else if (kind === "mohawk") {
    g.fillStyle = col; g.strokeStyle = "#16161e"; g.lineWidth = 5;
    for (let i = 0; i < 5; i++) { const x = 30 + i * 35; g.beginPath(); g.moveTo(x - 18, 196); g.lineTo(x + 6, 40 + Math.abs(i - 2) * 30); g.lineTo(x + 18, 196); g.closePath(); g.fill(); g.stroke(); }
  } else if (kind === "hat") {
    return hatCanvas || c;
  } else if (kind === "halo") {
    g.shadowColor = col; g.shadowBlur = 20; g.strokeStyle = col; g.lineWidth = 14;
    g.beginPath(); g.ellipse(100, 100, 82, 26, 0, 0, Math.PI * 2); g.stroke();
  }
  return c;
}
function addAcc(ch, parts, head) {
  const hi = ch.img.head, def = ACC[ch.accKind];
  if (!ch.img.acc || !hi || !def) return;
  const bx = hi.box || { top: 0, cx: 0.5 }, mid = bx.top + (1 - bx.top) * 0.35;
  const k = head.k || 1, lx = (bx.cx - head.px) * hi.w * k, ly = ((def.anchor === "mid" ? mid : bx.top + (def.drop ?? 0.02)) - head.py) * hi.h * k;
  const [rx, ry] = rot(lx, ly, head.ang);
  parts.push({ name: "acc", x: head.x + rx, y: head.y + ry, ang: head.ang, px: def.px ?? 0.5, py: def.py, far: false, sx: 1 });
}

// ---------- generated bosses ----------
const PALETTE = ["#ff5a64", "#6aa8ff", "#b8ff6a", "#ffd24a", "#b583ff", "#ff9a4a", "#4ae0d0", "#ff6ad5", "#9aa3ff", "#e8ecf0"];
const NAME_A = ["Chrome", "Neon", "Turbo", "Rusty", "Volt", "Hyper", "Static", "Laser", "Mega", "Glitch", "Iron", "Disco", "Plasma", "Rocket", "Quantum"];
const NAME_B = ["Stomper", "Twister", "Spinner", "Breaker", "Popper", "Krusher", "Shuffler", "Funkbot", "Grinder", "Boogie", "Glider", "Slammer", "Locker", "Flipper", "Wobbler"];
const TAUNTS = ["Step up or step aside.", "My circuits were built for this.", "You call that a groove?", "Watch and weep.", "Spin to win.", "I never miss a beat.", "Bring the bass.", "Your moves are outdated.", "Prepare to be out-flared.", "Reboot your rhythm."];
const SKILL_INFO = { ghost: ["Ghost", "moves turn into ? on your turn"], fake: ["Fake-out", "red moves are decoys: don't copy them"], blackout: ["Blackout", "the lights cut out for a beat"], encore: ["Encore", "one extra round"], double: ["Double time", "the last round is twice as busy"] };
const BIPEDS = ["runner", "jumper", "slim", "tank"];
// i is the overall level index; e counts endless levels after the story (0 = the first one)
const endlessOf = i => Math.max(0, i - STORY_LEN);
const bossScaleFor = i => Math.min(1.8, 1 + 0.1 * Math.floor(endlessOf(i) / 5));
function endlessBossSpec(i) {
  const e = endlessOf(i), R = rng32(hashSeed(state.runSeed, i, 7)), set = Math.floor(e / 5), milestone = e % 5 === 4;
  const pick = a => a[Math.floor(R() * a.length)];
  const nSk = milestone ? Math.min(3, 1 + set) : set === 0 ? 0 : set < 3 ? 1 : 2;
  const pool = Object.keys(SKILL_INFO), skills = [];
  while (skills.length < nSk) { const s = pick(pool); if (!skills.includes(s)) skills.push(s); }
  const scale = bossScaleFor(i);
  const blurb = `Size ${scale.toFixed(1)}×` + (skills.length ? " · " + skills.map(s => SKILL_INFO[s][0]).join(", ") : "");
  if (milestone) return { milestone: true, name: "Dark " + CHARS[sel].name, scale, skills, blurb, taunt: "Only one of us docks." };
  const color = pick(PALETTE); let accColor = pick(PALETTE); if (accColor === color) accColor = "#ffffff";
  let acc = R() < 0.3 + 0.12 * set ? pick(Object.keys(ACC)) : null;
  let name = pick(NAME_A) + " " + pick(NAME_B);
  // Wrangler: cowboy hat + laser lasso. Always the 3rd boss of a run, then now and then.
  const wrangler = e === 0 || (e > 4 && R() < 0.12);   // the first endless boss is always a Wrangler
  if (wrangler) { acc = "hat"; name = pick(["Laser", "Neon", "Plasma", "Volt"]) + " " + pick(["Wrangler", "Rustler", "Outlaw", "Ranger"]); }
  let spec;
  if (!wrangler && R() < 0.2) {
    const head = pick(["spider", ...BIPEDS]);
    spec = { kind: "spider", parts: { head }, height: 112,
      headPin: head === "spider" ? CHARS.spider.pins.head : CHARS[head].pins.head, headAt: head === "spider" ? CHARS.spider.pins.headAt : [70, -70] };
  } else {
    const arms = pick(BIPEDS), legs = pick(BIPEDS), torso = pick(BIPEDS), pelvis = pick(BIPEDS), head = R() < 0.15 ? "spider" : pick(BIPEDS);
    spec = { torso, pelvis, height: 140, headPin: head === "spider" ? [0.24, 0.8] : null,
      parts: { head, torso, pelvis, upper_arm: arms, forearm: arms, fist: R() < 0.3 ? pick(BIPEDS) : arms, thigh: legs, shin: legs, foot: R() < 0.3 ? pick(BIPEDS) : legs } };
  }
  return Object.assign(spec, { key: "endless-" + i, name, color, accColor, acc, skills, scale, lasso: wrangler, lassoColor: pick(["#ff3a4a", "#5ee7ff", "#c6ff5e", "#ff6ad5"]),
    taunt: wrangler ? pick(["This dance floor ain't big enough for two.", "Yee-haw. Dance-off.", "Fastest lasso in the plant."]) : pick(TAUNTS),
    blurb: wrangler ? blurb + " · Laser lasso" : blurb });
}
function buildEndlessBoss(spec) {
  if (spec.milestone) {
    const base = cloneOf(CHARS[sel]);
    const c = Object.assign({}, base, { height: CHARS[sel].height * spec.scale * 1.15, skills: spec.skills, key: base.key + "-m", name: spec.name, blurb: spec.blurb, taunt: spec.taunt });
    calibrate(c); return c;
  }
  const c = makeHybrid(Object.assign({}, spec, { height: spec.height * spec.scale }), true);
  c.skills = spec.skills; return c;
}
function endlessRounds(i) {
  return [{ beats: 4, n: Math.min(5, 3 + Math.floor(i / 6)), eighths: i >= 12 }, { beats: 8, n: Math.min(8, 5 + Math.floor(i / 5)), eighths: i >= 5 }, { beats: 8, n: Math.min(9, 5 + Math.floor(i / 4)), eighths: i >= 3 }];
}
// generate, solve, and keep only a level the selected robot can finish
function endlessLevel(i) {
  if (state.endCache && state.endCache.i === i) return state.endCache.def;
  const dance = true, t0 = performance.now();
  let def = null, tries = 0;
  for (; tries < 30 && !def; tries++) {
    const cand = genLevel(rng32(hashSeed(state.runSeed, i, tries + 1)), i, dance);
    loadLevel(cand);
    if (solveLevel(ch).ok) def = cand;
  }
  if (!def) def = makeLevel({ name: `Sector ${endlessOf(i) + 1}`, theme: i % THEMES.length }, ["rest", "rest", "rest"], dance);
  def.tries = tries; def.genMs = performance.now() - t0;
  if (dance) { const spec = endlessBossSpec(i); def.bossSpec = spec; def.rivalChar = buildEndlessBoss(spec); def.bpm = Math.min(118, Math.round(88 + 1.5 * i)); def.rounds = endlessRounds(i); def.signature = endlessSignature(i, def.rounds); }
  state.endCache = { i, def };
  return def;
}
// An endless level's hook: one of the story motifs that fits round 1, repeated in every round,
// with a new answer phrase after it in rounds 2 and up.
function endlessSignature(i, rounds) {
  const R = rng32(hashSeed(state.runSeed, i, 11)), r1 = rounds[0];
  const pool = RIFF_LIBRARY.filter(r => r.motif.length === r1.n && (r1.eighths || r.motif.every(([b]) => b % 1 === 0)));
  if (!pool.length) return null;
  const riff = pool[Math.floor(R() * pool.length)];
  const out = [riff.motif];
  for (let k = 1; k < rounds.length; k++) {
    const need = Math.max(0, rounds[k].n - riff.motif.length);
    const ans = need >= 2 ? phrase(need, rounds[k].eighths) : need === 1 ? [{ off: 2, move: "act" }] : [];
    out.push([...riff.motif, ...ans.map(x => [x.off + 4, x.move])]);
  }
  return { name: riff.name, motif: riff.motif, rounds: out };
}
function bestKey() { return "rigrunner.best.story"; }
function getBest() { try { return +localStorage.getItem(bestKey()) || 0; } catch (e) { return 0; } }
function saveBest(n) { try { if (n > getBest()) localStorage.setItem(bestKey(), String(n)); } catch (e) {} }
