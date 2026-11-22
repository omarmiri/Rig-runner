// Rig Runner · Per-step update: player, rival and dance animation, level finish cards.
"use strict";
// ================= Update =================
function update(dt) {
  state.time += dt;
  if (rival) animateRival(dt);
  updateDebris(dt);
  if (state.mode !== "play") { animate(dt, true); return; }
  if (state.timing) state.runTime += dt;
  const P = ch.P, W = ch.W, H = ch.H;

  if (pl.dead) {
    pl.dead -= dt;
    if (pl.dead <= 0) { if (pl.outOfEnergy) { pl.outOfEnergy = false; gameOver(); return; } resetPlayer(respawnAt); pl.flash = 0.8; }
    return;
  }
  pl.hurtT = Math.max(0, pl.hurtT - dt);
  let dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (battle) { updateBattle(dt); dir = 0; }
  if (!state.timing && (dir || jumpPressedAt > 0)) state.timing = true;

  if (battle) pl.vx = Math.max(-P.max, Math.min(P.max, pl.vx)); /* velocity set by updateBattle */
  else { applyControl(pl, P, dir, dt); if (dir) pl.face = dir; }

  if (!battle) {
    pl.coyote = pl.ground ? P.coyote : pl.coyote - dt;
    if (pl.ground) pl.airJumps = P.airJumps;
    const buffered = jumpPressedAt >= 0 && state.time - jumpPressedAt <= P.buffer;
    if (buffered && pl.coyote > 0) {
      pl.vy = -P.jumpV; pl.ground = false; pl.coyote = 0; jumpPressedAt = -1;
      dust(pl.x + W / 2, pl.y + H, 6); audio.blip(260, 620, 0.14, "square", 0.05);
    } else if (buffered && !pl.ground && pl.airJumps > 0 && state.time - jumpPressedAt < 0.05) {
      pl.airJumps--; pl.vy = -P.airJumpV; jumpPressedAt = -1; pl.phase = 0;
      thrust(pl.x + W / 2, pl.y + H); audio.blip(180, 900, 0.18, "sawtooth", 0.05);
    }
    if (!input.jump && pl.vy < 0 && pl.hurtT <= 0) pl.vy *= Math.pow(P.cut, dt * 20);
    if (input.down && pl.ground && pl.onGirder) { pl.dropT = 0.22; pl.ground = false; }
  }
  pl.dropT = Math.max(0, pl.dropT - dt);

  pl.vy += P.grav * (pl.vy > 0 ? P.fallMul : 1) * dt;
  pl.vy = Math.min(pl.vy, P.maxFall);

  const wasGround = pl.ground, impact = pl.vy;
  moveBody(pl, W, H, dt);
  if (pl.ground && !wasGround && impact > 450) {
    pl.landT = Math.min(0.16, impact / 6000); dust(pl.x + W / 2, pl.y + H, ch.key === "tank" ? 14 : 8);
    audio.blip(ch.key === "tank" ? 90 : 140, 50, 0.1, "triangle", 0.08);
  }

  if (touchesSpikes(pl, W, H)) spikeHit();
  if (pl.y > ROWS * T + 160) die();

  const cx = pl.x + W / 2, cy = pl.y + H / 2;
  for (const b of bolts) if (!b.got && Math.abs(b.x - cx) < W / 2 + 14 && Math.abs(b.y - cy) < H / 2 + 14) {
    b.got = true; state.collected++; gainBolt(b); burst(b.x, b.y, 12, "#f2c46a", 180, 40);
    audio.blip(880, 1320, 0.09, "square", 0.04);
  }
  for (const k of checkpoints) if (!k.on && Math.abs(k.x - cx) < 40 && pl.y + H > k.y - 140) {
    k.on = true; respawnAt = { x: k.x, y: k.y }; burst(k.x, k.y - 110, 16, "#6fe0a0", 160);
    pl.armor = P.armor;
    audio.blip(520, 1040, 0.2, "triangle", 0.06);
  }
  // the rival blocks the dock until beaten
  if (rival && !rival.defeated && !battle && pl.ground && cx > rival.x - 330 - Math.max(0, rival.ch.height - 140) * 0.9) startBattle();
  if (rival && !rival.defeated && cx > rival.x - 60) { pl.x = rival.x - 60 - W / 2; pl.vx = Math.min(0, pl.vx); }
  if ((!rival || rival.defeated) && Math.abs(goal.x - cx) < 46 && pl.ground && pl.y + H >= goal.y - 2) finishLevel();

  animate(dt, false);
}

function beatInfo() {
  if (state.gameMode !== "dance" || !music.on) return { frac: (state.time * 1.6) % 1, bounce: 0, beat: 0 };
  const bp = (music.now() - music.lat() - music.t0) / music.beatLen();
  const frac = ((bp % 1) + 1) % 1;
  return { frac, beat: Math.floor(bp), bounce: Math.pow(1 - frac, 2) };
}
// pose for a dancer: groove on the beat, snap into a move when one is played
function dancePose(c, d, bi, nowT) {
  const bl = music.beatLen();
  const live = d && nowT - d.at >= 0 && nowT - d.at < bl * 0.9;
  const ph = d ? (nowT - d.at) / bl : 0;
  if (c.kind === "spider") return live ? spiderBreak(c, d.move, ph, state.time) : spiderGroove(c, bi.bounce, state.time);
  if (live && d.move === "act" && c.lasso) return bipedLasso(ph);
  return live ? bipedBreak(d.move, ph) : bipedGroove(bi.bounce);
}
// metal-on-floor sparks while spinning on the ground
function breakSparks(d, x, footY, nowT, dt) {
  if (!d || !(d.move === "up" || d.move === "down" || d.move === "left")) return;
  const ph = (nowT - d.at) / music.beatLen();
  if (ph < 0.1 || ph > 0.9) return;
  const n = Math.random() < dt * 30 ? 2 : 0;
  for (let i = 0; i < n; i++) particles.push({ x: x + (Math.random() - 0.5) * 36, y: footY - 2, vx: (Math.random() - 0.5) * 440, vy: -Math.random() * 260,
    life: 0.25 + Math.random() * 0.2, t: 0, color: Math.random() < 0.5 ? "#ffd27a" : "#ffffff", r: 1.5 + Math.random() * 1.5, g: 700 });
}

function animateRival(dt) {
  const rc = rival.ch, bi = beatInfo();
  let target;
  if (rival.defeated) target = rc.kind === "spider" ? spiderSlump(rc, state.time) : B_SLUMP;
  else if (battle && battle.outcome === "lose" && battle.b > battle.end + 0.5) target = rc.kind === "spider" ? spiderWin(rc, state.time) : B_WIN;
  else target = dancePose(rc, rival.dance, bi, battle ? battleClock() : music.now());
  const sig = levelDef.signature;
  if (sig && !battle && !rival.defeated && music.on && state.mode === "play") {
    if (!rival.teaser && Math.abs(pl.x - rival.x) < 700) {   // dance the motif once, on the next bar
      const t0 = music.nextBar(music.now(), 0.3), bl = music.beatLen();
      rival.teaser = sig.motif.map(([b, mv]) => ({ t: t0 + b * bl, mv, sched: false, shown: false }));
    }
    for (const n of rival.teaser || []) {
      if (!n.sched && n.t < music.now() + 0.15) { n.sched = true; music.move(n.t, n.mv, 0.4, true); }
      if (!n.shown && music.now() - music.lat() >= n.t) { n.shown = true; rival.dance = { move: n.mv, at: music.now() }; }
    }
  }
  blendPose(rival.pose, target, 1 - Math.exp(-dt * (rival.defeated ? 6 : 30)));
  if (battle && !rival.shattered) breakSparks(rival.dance, rival.x, rival.y, battleClock(), dt);
  if (rival.shattered && debris.length && Math.random() < dt * 3) { const d = debris[Math.floor(Math.random() * debris.length)]; if (d.owner === "rival") burst(d.x, d.y, 3, "#5ee7ff", 90, 30); }
}

function animate(dt, frozen) {
  pl.landT = Math.max(0, pl.landT - dt);
  pl.flash = Math.max(0, pl.flash - dt);
  const air = !pl.ground && !frozen && state.mode === "play";
  const dancing = battle && battle.started;
  let target;
  if (dancing) {
    const bi = beatInfo();
    if (battle.outcome === "lose" && battle.b > battle.end + 0.5) target = ch.kind === "spider" ? spiderSlump(ch, state.time) : B_SLUMP;
    else if (battle.outcome === "win" && battle.b > battle.end + 0.5) target = ch.kind === "spider" ? spiderWin(ch, state.time) : B_WIN;
    else target = dancePose(ch, pl.dance, bi, battleClock());
    blendPose(pose, target, 1 - Math.exp(-dt * 30));
    if (!pl.shattered) breakSparks(pl.dance, pl.x + ch.W / 2, pl.y + ch.H, battleClock(), dt);
    return;
  }
  if (ch.kind === "spider") {
    pl.phase += Math.abs(pl.vx) * dt * 0.65 / (ch.pins.stride * ch.scale);
    if (state.finished) target = spiderWin(ch, state.time);
    else if (air) target = lerpPose(spiderAir(ch, true), spiderAir(ch, false), Math.max(0, Math.min(1, (pl.vy + 250) / 650)));
    else {
      target = spiderGait(ch, pl.phase, Math.min(1, Math.abs(pl.vx) / 120), state.time);
      if (pl.landT > 0) { const k = Math.min(1, pl.landT / 0.1); for (let i = 0; i < 3; i++) { target["ny" + i] -= 70 * k; target["fy" + i] -= 70 * k; } }
    }
    blendPose(pose, target, 1 - Math.exp(-dt * (air ? 10 : 30)));
    return;
  }
  pl.phase += Math.abs(pl.vx) * dt * (Math.PI * 2 / (ch.height * 1.2));
  if (state.finished) target = B_WIN;
  else if (air) {
    const k = Math.max(0, Math.min(1, (pl.vy + 250) / 650));
    target = lerpPose(B_RISE, B_FALL, k);
  } else {
    const amt = Math.min(1, Math.abs(pl.vx) / 140);
    target = lerpPose(bipedIdle(state.time), bipedRun(pl.phase), amt);
    if (pl.landT > 0) target = lerpPose(target, B_CROUCH, Math.min(1, pl.landT / 0.1));
  }
  blendPose(pose, target, 1 - Math.exp(-dt * (air ? 12 : 26)));
}

// Ending an endless run keeps the story finished: the save moves to the start of a fresh endless run.
function newEndlessRun() {
  state.levelIdx = STORY_LEN; state.runSeed = (Math.random() * 2147483647) | 0; state.endCache = null;
}
// Out of energy. Story: retry this level with fresh energy. Endless: the run is over.
function gameOver() {
  music.stop(); battle = null; document.body.classList.remove("battling"); state.finished = true;
  if (state.endless) { endRun(true); return; }
  state.carry = ENERGY.start; writeSave(state.levelIdx);
  showCard(`<span class="eyebrow neon">Out of energy · level ${state.levelIdx + 1} · ${levelDef.name}</span><h1>Game over</h1>
    <p>You ran out of bolts. Try level ${state.levelIdx + 1} again from the start with ${ENERGY.start} energy. Collect bolts to fill the bar; falls cost ${ENERGY.fall} and a lost dance-off costs ${ENERGY.battle}.</p>
    <div class="actions"><button class="btn" data-act="primary" type="button">Try again</button><button class="btn ghost" data-act="menu" type="button">Menu</button></div>`,
    () => { state.finished = false; state.carry = ENERGY.start; startLevel(); });
}
function endRun(outOfEnergy = false) {
  const n = state.cleared || 0;
  saveBest(n); music.stop(); battle = null; document.body.classList.remove("battling");
  const reached = state.levelIdx + 1;
  newEndlessRun(); state.carry = ENERGY.start; writeSave(STORY_LEN);
  showCard(`<span class="eyebrow neon">${outOfEnergy ? "Out of energy · " : ""}Endless run over · ${ch.name}</span><h1>${outOfEnergy ? "Game over" : "Run ended"} at level ${reached}</h1>
    <dl><dt>Total time</dt><dd>${state.totalTime.toFixed(2)} s</dd><dt>Bolts collected</dt><dd>${state.totalBolts}</dd><dt>Best</dt><dd>level ${getBest()}</dd></dl>
    <p>The story stays cleared. Your next run starts again at level ${STORY_LEN + 1} with new levels and bosses.</p>
    <div class="actions"><button class="btn" data-act="primary" type="button">New endless run</button><button class="btn ghost" data-act="menu" type="button">Menu</button></div>`,
    () => { state.finished = false; newEndlessRun(); startLevel(); });
}
function finishLevel() {
  state.finished = true; state.timing = false; pl.vx = 0;
  burst(goal.x, goal.y - 80, 40, "#6fe0a0", 300, 80);
  audio.blip(440, 880, 0.15, "square", 0.05); setTimeout(() => audio.blip(660, 1320, 0.25, "square", 0.05), 140);
  state.mode = "docking"; document.body.classList.add("menu");
  const all = state.collected === bolts.length;
  setTimeout(() => {
    state.finished = true;
    state.totalTime += state.runTime; state.totalBolts += state.collected;
    state.carry = state.energy;   // energy carries into the next level
    writeSave(state.levelIdx + 1);   // the game always continues: story, then endless
    if (state.endless) {
      const i = state.levelIdx, dance = true;
      state.cleared = i + 1; saveBest(state.cleared);
      let extra = "";
      if (dance) {
        const sp = levelDef.bossSpec, acc = state.totalAcc[state.totalAcc.length - 1] || 0;
        extra += `<dt>Dance</dt><dd>${Math.round(acc * 100)}% against ${rival ? rival.ch.name : "the boss"}</dd>`;
        const nx = endlessBossSpec(i + 1);
        var note = (sp && sp.milestone ? `<p>Set ${Math.floor(endlessOf(i) / 5) + 1} cleared. The next bosses grow to ${bossScaleFor(i + 1).toFixed(1)}×.</p>` : "") +
          `<p>Next boss: ${nx.name} · ${nx.blurb}.</p>`;
      }
      showCard(`<span class="eyebrow ${dance ? "neon" : ""}">Endless · level ${i + 1} cleared</span><h1>Docked</h1>
        <dl><dt>Time</dt><dd>${state.runTime.toFixed(2)} s</dd><dt>Energy</dt><dd>${state.energy} / ${bolts.length}${state.energy >= bolts.length ? " · max" : ""}</dd>${extra}<dt>Best</dt><dd>level ${getBest()}</dd></dl>${note || ""}
        <div class="actions"><button class="btn" data-act="primary" type="button">Next level</button><button class="btn ghost" data-act="end" type="button">End run</button></div>`,
        () => { state.finished = false; state.levelIdx++; startLevel(); });
      return;
    }
    const acc = state.totalAcc[state.totalAcc.length - 1] || 0;
    const last = state.levelIdx >= DANCE_LEVELS.length - 1;
    if (!last) {
      const nxt = DANCE_LEVELS[state.levelIdx + 1];
      showCard(`<span class="eyebrow neon">Level ${state.levelIdx + 1} cleared · ${levelDef.name}</span><h1>Docked</h1>
        <dl><dt>Time</dt><dd>${state.runTime.toFixed(2)} s</dd><dt>Energy</dt><dd>${state.energy} / ${bolts.length}${state.energy >= bolts.length ? " · max" : ""}</dd><dt>Dance</dt><dd>${Math.round(acc * 100)}% against ${rival ? rival.ch.name : "the rival"}</dd></dl>
        <p>Next: ${nxt.name}, ${nxt.bpm} BPM. ${nxt.clone ? "The final rival is waiting: your own dark clone." : nxt.boss ? "A hybrid boss guards the next dock." : "The routines get longer and faster."}</p>
        <div class="actions"><button class="btn" data-act="primary" type="button">Next level</button><button class="btn ghost" data-act="menu" type="button">Menu</button></div>`,
        () => { state.finished = false; state.levelIdx++; startLevel(); });
    } else {
      const avg = state.totalAcc.reduce((a, b) => a + b, 0) / Math.max(1, state.totalAcc.length);
      music.intensity = 2;
      showCard(`<span class="eyebrow neon">Story cleared · ${ch.name}</span><h1>Dance floor champion</h1>
        <dl><dt>Total time</dt><dd>${state.totalTime.toFixed(2)} s</dd><dt>Bolts collected</dt><dd>${state.totalBolts}</dd><dt>Dance</dt><dd>${Math.round(avg * 100)}% average accuracy</dd></dl>
        <p>Every rival out-danced, even your own dark clone. The story is done, but the dance floor isn't: endless levels with new bosses start at level ${STORY_LEN + 1}, and the bosses grow every five levels.</p>
        <div class="actions"><button class="btn" data-act="primary" type="button">Keep going</button><button class="btn ghost" data-act="menu" type="button">Menu</button></div>`,
        () => { state.finished = false; state.levelIdx = STORY_LEN; state.runSeed = state.runSeed || (Math.random() * 2147483647) | 0; state.endCache = null; startLevel(); });
    }
  }, 900);
}
