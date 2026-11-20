// Rig Runner test suite. Serves the game folder locally and drives it in headless Chromium.
//   npm test              quick run (about a minute)
//   npm test -- --full    bigger samples plus a real-time dance battle (a few minutes)
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium, devices } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const FULL = process.argv.includes("--full");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json" };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]).replace(/\/$/, "/index.html"));
      if (!p.startsWith(ROOT) || !fs.existsSync(p)) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { "Content-Type": TYPES[path.extname(p)] || "application/octet-stream" });
      fs.createReadStream(p).pipe(rsp);
    }).listen(0, "127.0.0.1", () => res(srv));
  });
}

const results = [];
function check(name, ok, detail) { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`); }

(async () => {
  const srv = await serve(), url = `http://127.0.0.1:${srv.address().port}/`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => m.type() === "error" && errors.push(m.text()));
  page.on("requestfailed", r => errors.push("failed to load " + r.url()));
  await page.goto(url); await page.waitForFunction(() => window.__game && __game.CHARS.runner.img && __game.CHARS.runner.img.head, null, { timeout: 15000 });
  await page.waitForTimeout(300);
  check("page loads with every robot's parts", errors.length === 0, errors.join("; "));

  // 1. Campaign layouts: no gap or climb beyond what every robot can do
  const camp = await page.evaluate(() => {
    const G = __game, bad = [];
    for (const mode of ["course", "dance"]) {
      G.setMode(mode);
      const list = mode === "dance" ? G.DANCE_LEVELS : G.FREE_LEVELS;
      list.forEach((def, i) => { G.loadLevel(def); for (const k of ["runner", "jumper", "slim", "tank", "spider"]) if (!G.solveLevel(G.CHARS[k]).ok) bad.push(`${mode} ${i + 1} ${def.name} (${k})`); });
    }
    return bad;
  });
  check("all 16 campaign levels solvable by every robot", camp.length === 0, camp.join(", "));

  // 2. Endless pipeline: every generated level is proven beatable for the chosen robot
  const N = FULL ? 25 : 4;
  const endless = await page.evaluate(N => {
    const G = __game; let total = 0, fallback = 0, recheck = 0, maxMs = 0;
    G.setLen(true);
    for (const mode of ["course", "dance"]) {
      G.setMode(mode);
      for (const k of ["runner", "jumper", "slim", "tank", "spider"]) {
        G.pick(k);
        for (let run = 0; run < N; run++) {
          G.state.runSeed = 9000 + run * 31 + k.length;
          for (const lvl of [0, 3, 8, 15, 25, 40, 60, 90]) {
            G.state.endCache = null; G.state.mode = "loading"; G.state.levelIdx = lvl;
            const def = G.endlessLevel(lvl); total++; maxMs = Math.max(maxMs, def.genMs);
            if (!def.generated) fallback++;
            G.loadLevel(def); if (!G.solveLevel(G.ch).ok) recheck++;
          }
        }
      }
    }
    G.state.mode = "title"; G.setLen(false);
    return { total, fallback, recheck, maxMs: Math.round(maxMs) };
  }, N);
  check(`endless levels proven beatable (${endless.total} generated)`, endless.fallback === 0 && endless.recheck === 0, `fallbacks ${endless.fallback}, re-check failures ${endless.recheck}, slowest ${endless.maxMs} ms`);

  // 3. Solver predictions replayed through the real game loop (jumps, walk-offs and girder drops)
  const replay = await page.evaluate(SEEDS => {
    const G = __game, out = { tested: 0, matched: 0 };
    G.setMode("course");
    for (const k of ["runner", "jumper", "slim", "tank", "spider"]) {
      G.state.mode = "title"; G.state.levelIdx = 0; G.pick(k);
      for (let s = 0; s < SEEDS; s++) {
        const def = G.genLevel(G.rng32(G.hashSeed(777 + s, 2 + s * 3, 1)), 2 + s * 3, false);
        G.loadLevel(def);
        const edges = []; G.solveLevel(G.ch, edges);
        const W = G.ch.W, H = G.ch.H, pl = G.pl;
        for (let e = 0; e < edges.length; e += 4) {
          const [x, y, vx, dir, jump, lx, ly, drop, hold = 999] = edges[e];
          G.state.mode = "play"; G.rivalOff();
          Object.assign(pl, { x: x - W / 2, y: y - H, vx, vy: 0, ground: true, onGirder: !!drop, dead: 0, hurtT: 0, dropT: 0, armor: 0, airJumps: 0, coyote: 0.1 });
          G.input.left = dir < 0; G.input.right = dir > 0; G.input.jump = jump; G.input.down = !!drop;
          if (jump) G.pressJump();
          let left = false, land = null;
          for (let i = 0; i < 200; i++) { G.update(1 / 60); G.input.down = false; if (i + 1 >= hold) G.input.jump = false; if (pl.dead) break; if (!pl.ground) left = true; else if (left) { land = [pl.x + W / 2, pl.y + H]; break; } }
          G.input.left = G.input.right = G.input.jump = false;
          out.tested++; if (land && Math.abs(land[1] - ly) < 34 && Math.abs(land[0] - lx) < 60) out.matched++;
        }
      }
    }
    G.state.mode = "title";
    return out;
  }, FULL ? 12 : 3);
  check(`solver moves match the real game (${replay.tested} replayed)`, replay.tested > 0 && replay.matched === replay.tested, `${replay.matched}/${replay.tested}`);

  // 4. Drop shafts really need the down button
  const drops = await page.evaluate(() => {
    const G = __game; let shafts = 0, needed = 0;
    G.state.mode = "title"; G.state.levelIdx = 0; G.pick("runner");
    for (let s = 0; s < 20; s++) {
      G.loadLevel(G.genLevel(G.rng32(G.hashSeed(4321 + s, 1 + s, 1)), 1 + s, false));
      if (G.hintsCount()) { shafts++; if (!G.solveLevel(G.ch, null, { noDrop: true }).ok) needed++; }
    }
    return { shafts, needed };
  });
  check("drop shafts can't be passed without dropping", drops.shafts > 0 && drops.needed === drops.shafts, `${drops.needed}/${drops.shafts}`);

  // 5. Walking up and down ramps
  const ramps = await page.evaluate(() => {
    const G = __game, out = { tested: 0, ok: 0 };
    G.setMode("course");
    for (const k of ["runner", "jumper", "slim", "tank", "spider"]) {
      G.state.mode = "title"; G.state.levelIdx = 0; G.pick(k);
      for (let s = 0; s < 15 && out.tested < 200; s++) {
        G.loadLevel(G.genLevel(G.rng32(G.hashSeed(55 + s, 6 + s, 1)), 6 + s, false));
        const g = G.grid, cols = g[0].length;
        for (let c = 2; c < cols - 6; c++) for (let r = 0; r < 12; r++) {
          const t = g[r][c]; if (t !== "/" && t !== "\\") continue;
          const up = t === "/", prev = g[r + (up ? 1 : -1)]; if (prev && prev[c - 1] === t) continue;
          let len = 0; while (g[r + (up ? -len : len)] && g[r + (up ? -len : len)][c + len] === t) len++;
          const startY = up ? (r + 1) * 48 : r * 48, endY = up ? (r + 1 - len) * 48 : (r + len) * 48, endX = (c + len) * 48 + 30;
          const W = G.ch.W, H = G.ch.H, pl = G.pl;
          G.state.mode = "play"; G.rivalOff();
          Object.assign(pl, { x: c * 48 - 40 - W / 2, y: startY - H, vx: 0, vy: 0, ground: true, dead: 0, hurtT: 0, airJumps: 0 });
          G.input.right = true; let reached = false;
          for (let i = 0; i < 240; i++) { G.update(1 / 60); if (pl.dead) break; if (pl.x + W / 2 >= endX) { reached = true; break; } }
          G.input.right = false; out.tested++;
          if (reached && Math.abs(pl.y + H - endY) < 4 && pl.ground) out.ok++;
        }
      }
    }
    G.state.mode = "title";
    return out;
  });
  check(`ramps walkable by every robot (${ramps.tested} ramps)`, ramps.tested > 0 && ramps.ok === ramps.tested, `${ramps.ok}/${ramps.tested}`);

  // 6. Saved progress survives a reload and Continue resumes it
  await page.evaluate(() => { localStorage.clear(); const G = __game; G.showTitle(); G.setLen(false); G.setMode("course"); G.pick("jumper"); });
  await page.click("#startBtn"); await page.waitForTimeout(300);
  await page.evaluate(() => { const G = __game, gx = G.levelDef.goalCol * 48 + 48; G.pl.x = gx - 140; G.pl.y = 10 * 48 - G.ch.H; G.input.right = true; });
  await page.waitForTimeout(2200); await page.evaluate(() => { __game.input.right = false; });
  await page.reload(); await page.waitForFunction(() => window.__game && __game.CHARS.runner.img && __game.CHARS.runner.img.head); await page.waitForTimeout(300);
  await page.evaluate(() => { __game.setLen(false); __game.setMode("course"); });
  const label = await page.evaluate(() => document.getElementById("continueBtn").hidden ? "" : document.getElementById("continueBtn").textContent);
  await page.click("#continueBtn"); await page.waitForTimeout(300);
  const resumed = await page.evaluate(() => ({ lvl: __game.state.levelIdx, robot: __game.ch.name }));
  check("save and continue across a reload", resumed.lvl === 1 && resumed.robot === "Jumper", `${label} -> level ${resumed.lvl + 1} as ${resumed.robot}`);
  await page.evaluate(() => { localStorage.clear(); __game.showTitle(); });

  // 7. (full) A real-time dance battle with on-beat input is won and the rival falls apart
  if (FULL) {
    await page.evaluate(() => { const G = __game; G.showTitle(); G.setLen(false); G.setMode("dance"); G.pick("runner"); G.startGame(); });
    await page.waitForTimeout(300);
    await page.evaluate(() => { const g = __game; g.pl.x = g.rival.x - 600; g.pl.y = 10 * 48 - g.ch.H; g.input.right = true; });
    await page.waitForTimeout(1200); await page.evaluate(() => { __game.input.right = false; });
    await page.evaluate(() => { const B = __game.battle, m = __game.music, bl = m.beatLen();
      for (const r of B.rounds) r.moves.forEach(mv => { if (!mv.decoy) setTimeout(() => __game.battleInput(mv.move), (B.start + (r.resp + mv.off) * bl + B.lat - m.now()) * 1000); }); });
    const ms = await page.evaluate(() => { const B = __game.battle; return (B.start + (B.end + 5) * __game.music.beatLen() - __game.music.now()) * 1000; });
    await page.waitForTimeout(ms + 800);
    const won = await page.evaluate(() => ({ battle: !!__game.battle, shattered: !!__game.rival.shattered, acc: __game.state.totalAcc }));
    check("dance battle won with on-beat input", !won.battle && won.shattered && won.acc[0] === 1, JSON.stringify(won));
  }

  check("no errors during the whole run", errors.length === 0, errors.slice(0, 3).join("; "));
  await browser.close(); srv.close();
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
