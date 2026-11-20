// Rig Runner · Dance battle rules: routines, timing, scoring, boss skills.
"use strict";
// ================= Dance battle =================
const MOVES = ["up", "down", "left", "right", "act"];
const MOVE_NAME = { up: "Head spin", down: "Backspin", left: "Windmill", right: "Air freeze", act: "Flare" };
const MOVE_COLOR = { up: "#5ee7ff", down: "#ff5ec8", left: "#c6ff5e", right: "#ffb03a", act: "#ffffff", lasso: "#ff3a4a" };
const WIN_GOOD = 0.17, WIN_PERFECT = 0.085, WIN_SEARCH = 0.26, PASS = 0.6;

function makeRound(spec, opts = {}) {
  const grid = [];
  for (let b = 0; b < spec.beats; b += spec.eighths ? 0.5 : 1) grid.push(b);
  const rest = grid.slice(1).sort(() => Math.random() - 0.5).slice(0, spec.n - 1);
  const offs = [0, ...rest].sort((a, b) => a - b);
  const moves = [];
  for (const off of offs) {
    let m;
    do { m = MOVES[Math.floor(Math.random() * MOVES.length)]; }
    while (moves.length >= 2 && moves[moves.length - 1].move === m && moves[moves.length - 2].move === m);
    // +1: an empty lead-in beat, so the first move lands one beat after GO! instead of on it
    moves.push({ off: off + 1, move: m, shown: false, sched: false, res: null });
  }
  const r = { beats: spec.beats + 1, moves };
  if (opts.fake) {
    // a decoy in a free slot: the boss dances it in red, and copying it costs you
    const used = new Set(moves.map(m => m.off)), free = grid.map(o => o + 1).filter(o => !used.has(o));
    if (free.length) { const off = free[Math.floor(Math.random() * free.length)]; moves.push({ off, move: MOVES[Math.floor(Math.random() * MOVES.length)], decoy: true, shown: false, sched: false, res: null }); moves.sort((a, b) => a.off - b.off); }
  }
  if (opts.blackout) {
    const real = moves.filter(m => !m.decoy), m0 = real[Math.floor(Math.random() * real.length)];
    r.blackBeat = Math.floor(m0.off);
    for (const m of moves) if (Math.floor(m.off) === r.blackBeat) m.hidden = true;
  }
  return r;
}
function startBattle() {
  const lead = 1.2;
  const B = { rival, started: false, start: music.nextBar(music.now(), lead), lat: music.lat(), rounds: [], score: 0, max: 0, outcome: null, done: false, countSched: false };
  let cur = 4;
  const skills = (rival.ch.skills || []).slice();
  let specs = levelDef.rounds.slice();
  if (skills.includes("encore")) specs.push(specs[specs.length - 1]);
  if (skills.includes("double")) { const l = specs[specs.length - 1]; specs[specs.length - 1] = { beats: l.beats, n: Math.min(l.beats * 2 - 2, l.n + 3), eighths: true }; }
  B.skills = skills;
  for (const [ri, spec] of specs.entries()) {
    const r = makeRound(spec, { fake: skills.includes("fake") && ri > 0, blackout: skills.includes("blackout") });
    r.call = cur; r.count = cur + r.beats; r.resp = r.count + 4; cur = r.resp + r.beats + 4;
    B.max += r.moves.length * 2;
    B.rounds.push(r);
  }
  B.end = cur - 4;
  battle = B;
  music.intensity = 2;
  document.body.classList.add("battling");
  for (const k in input) input[k] = false;
  const rcb = rival.ch;
  banner = rcb.clone && state.endless ? { text: `Milestone boss: ${rcb.name}`, sub: rcb.blurb, until: state.time + 2.2, color: "#ff3a4a" }
    : rcb.clone ? { text: "Final dance-off", sub: "Your dark clone blocks the last dock", until: state.time + 1.8, color: "#ff3a4a" }
    : rcb.boss ? { text: `Boss: ${rcb.name}`, sub: rcb.blurb, until: state.time + 2.2, color: rcb.color }
    : { text: "Dance-off!", sub: `${rcb.name} blocks the dock`, until: state.time + 1.8, color: "#ff5ec8" };
}
function battleClock() { return music.now() - battle.lat; }
function battleInput(move) {
  const B = battle; if (!B || B.outcome) return;
  const now = battleClock(), bl = music.beatLen();
  pl.dance = { move, at: now };
  const hx = pl.x + ch.W / 2, hy = pl.y - 20;
  if (move === "act") burst(hx + 20, pl.y + ch.H * 0.35, 10, "#ffffff", 200, 20);
  let best = null, bd = 1e9;
  for (const r of B.rounds) for (const m of r.moves) {
    if (m.res) continue;
    const d = now - (B.start + (r.resp + m.off) * bl);
    if (Math.abs(d) < WIN_SEARCH && Math.abs(d) < Math.abs(bd)) { best = m; bd = d; }
  }
  if (!best) { music.move(music.now(), move, 0.05); return; }
  const ad = Math.abs(bd);
  if (best.decoy) { best.res = "miss"; pop(hx, hy, "FAKED OUT", "#ff5e6c"); audio.blip(140, 70, 0.15, "sawtooth", 0.08); return; }
  if (best.move !== move) { best.res = "miss"; pop(hx, hy, "WRONG", "#ff5e6c"); audio.blip(140, 70, 0.15, "sawtooth", 0.08); }
  else if (ad <= WIN_PERFECT) { best.res = "perfect"; B.score += 2; pop(hx, hy, "PERFECT", "#6fe0a0", 22); music.move(music.now(), move, 0.12); burst(hx, hy + 10, 10, MOVE_COLOR[move], 180, 40); }
  else if (ad <= WIN_GOOD) { best.res = "good"; B.score += 1; pop(hx, hy, bd < 0 ? "GOOD · EARLY" : "GOOD · LATE", "#ffe08a"); music.move(music.now(), move, 0.09); }
  else { best.res = "miss"; pop(hx, hy, bd < 0 ? "TOO EARLY" : "TOO LATE", "#ff5e6c"); audio.blip(140, 70, 0.15, "sawtooth", 0.06); }
}
function updateBattle(dt) {
  const B = battle, bl = music.beatLen(), now = battleClock(), anow = music.now();
  if (!B.started) {
    // walk into position facing the rival
    const spot = rival.x - (rival.ch.kind === "spider" ? 270 : 230) - (ch.kind === "spider" ? 40 : 0) - Math.max(0, rival.ch.height - 140) * 0.9;
    const cx = pl.x + ch.W / 2;
    pl.vx = Math.abs(spot - cx) > 6 ? Math.sign(spot - cx) * 200 : 0;
    pl.face = 1;
    if (now >= B.start) { B.started = true; pl.vx = 0; }
  }
  const b = (now - B.start) / bl; B.b = b;
  // countdown ticks
  if (!B.ticks) {
    // intro count + a 3-2-1 before each response, with a high "go" blip on the response downbeat
    B.ticks = [1, 2, 3].map(k => ({ beat: k, f: 880 }));
    for (const r of B.rounds) B.ticks.push({ beat: r.count + 1, f: 880 }, { beat: r.count + 2, f: 880 }, { beat: r.count + 3, f: 880 }, { beat: r.resp, f: 1320 });
  }
  for (const tk of B.ticks) {
    const t = B.start + tk.beat * bl;
    if (!tk.sched && t < anow + 0.15) { tk.sched = true; if (t > anow - 0.03 && music.running()) audio.blip(tk.f, tk.f, 0.09, "square", 0.07, music.toAudio(t)); }
  }
  for (const r of B.rounds) for (const m of r.moves) {
    const tc = B.start + (r.call + m.off) * bl;
    if (!m.sched && tc < anow + 0.15) { m.sched = true; if (tc > anow - 0.03) { if (m.decoy) { if (music.running()) audio.blip(240, 120, 0.2, "sawtooth", 0.08, music.toAudio(tc)); } else music.move(tc, m.move, 0.11); } }
    if (!m.shown && now >= tc) {
      m.shown = true; rival.dance = { move: m.move, at: tc };
      if (m.decoy) pop(rival.x, rival.y - rival.ch.height - 20, "FAKE", "#ff5e6c", 18);
      if (m.move === "act") burst(rival.x - 20, rival.y - rival.ch.height * 0.6, 10, "#ffffff", 200, 20);
    }
    const tr = B.start + (r.resp + m.off) * bl;
    if (!m.res && now > tr + WIN_SEARCH) {
      if (m.decoy) { m.res = "dodged"; B.score += 2; pop(pl.x + ch.W / 2, pl.y - 20, "DODGED", "#6fe0a0", 16); }
      else { m.res = "miss"; pop(pl.x + ch.W / 2, pl.y - 20, "MISS", "#ff5e6c"); }
    }
  }
  if (!B.outcome && b >= B.end + 0.5) {
    B.acc = B.score / B.max;
    B.outcome = B.acc >= PASS ? "win" : "lose";
    if (B.outcome === "win") {
      banner = { text: "You out-danced " + rival.ch.name, sub: `Accuracy ${Math.round(B.acc * 100)}% · the dock is open`, until: state.time + 2.6, color: "#6fe0a0" };
      shatter(rival.ch, rival.pose, rival.x, rival.y + 2, -1, "rival"); rival.shattered = true;
    } else {
      banner = { text: rival.ch.name + " wins the dance-off", sub: `Accuracy ${Math.round(B.acc * 100)}% · ${Math.round(PASS * 100)}% needed`, until: state.time + 2.6, color: "#ff5e6c" };
      shatter(ch, pose, pl.x + ch.W / 2, pl.y + ch.H + 2, pl.face, "player"); pl.shattered = true;
    }
  }
  if (B.outcome && b >= B.end + 4.5 && !B.done) {
    B.done = true;
    if (B.outcome === "win") {
      rival.defeated = true; state.totalAcc.push(B.acc); battle = null; music.intensity = 1;
      document.body.classList.remove("battling");
    } else {
      const acc = Math.round(B.acc * 100);
      showCard(`<span class="eyebrow neon">Level ${state.levelIdx + 1} · ${levelDef.name}</span><h1>Out-danced</h1>
        <p>${rival.ch.name} kept the dock and shook you to pieces. You hit ${acc}% of the moves; you need ${Math.round(PASS * 100)}% to win. Watch the routine, then copy each move on its beat.</p>
        <div class="actions"><button class="btn" data-act="primary" type="button">Battle again</button>${state.endless ? `<button class="btn ghost" data-act="end" type="button">End run</button>` : `<button class="btn ghost" data-act="menu" type="button">Menu</button>`}</div>`,
        () => { play(); battle = null; rival.dance = null; for (let i = debris.length - 1; i >= 0; i--) if (debris[i].owner === "player") debris.splice(i, 1); pl.shattered = false; pl.flash = 0.6; startBattle(); });
    }
  }
}
