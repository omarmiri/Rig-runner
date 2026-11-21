# Rig Runner (website version)

A browser platformer starring robots built from rig parts: five playable robots, a dance battle campaign (11 levels, hybrid bosses, a dark-clone finale), five free-run courses, and endless modes whose levels and bosses are generated on the fly and proven beatable before you play them.

Plain HTML, CSS and JavaScript. No framework and no build step.

## Folder layout

```
index.html           page shell: HUD, menu, touch controls; loads the scripts below in order
css/base.css         page reset (safe-area padding, margins)
css/style.css        all game UI styling
js/                  classic scripts sharing one global scope, loaded in this order:
  characters.js        robot definitions (rig joints, physics, abilities) and part loading
  poses.js             idle, run, jump, breakdance and lasso poses
  rig.js               kinematics: pose -> placed part images; drawing a character
  levels.js            tiles, themes, campaign levels, reusable course sections
  bosses.js            dark clone and the hand-made hybrid bosses
  generator.js         endless level generator (seeded)
  solver.js            proves a level can be finished, using the game's own physics
  endless.js           accessories, generated bosses, endless level pipeline, best score
  physics.js           level loading and movement shared by the player and the solver
  audio.js             synth sounds and the electro beat sequencer
  input.js             keyboard and touch input
  game.js              game state, level flow, saved progress
  menu.js              title menu (modes, robot picker, phone steps)
  effects.js           particles, popups, robots falling apart
  battle.js            dance battle rules, timing, scoring, boss skills
  update.js            per-step update and level-finish cards
  render.js            camera, background, tiles, props, characters
  battle-ui.js         dance battle track, countdown, legend
  render-frame.js      frame render and HUD
  main.js              main loop and startup
assets/robots/<robot>/<part>.png   rig parts for runner, jumper, slim, tank, spider
assets/accessories/cowboy-hat.png
icons/               app and site icons (robot head)
manifest.webmanifest Home Screen app description
sw.js                service worker: offline play, app install
tests/run.js         automated checks (see below)
tools/build-single.py  packs everything into one self-contained HTML file
```

## Run it locally

The game reads image pixels (to fit accessories on heads), which browsers block for pages opened straight from disk. Serve the folder instead:

```
cd web
python3 -m http.server 8000      # then open http://localhost:8000
```

## Put it on miriogames.com

Upload `index.html`, `manifest.webmanifest`, `sw.js`, `css/`, `js/`, `assets/` and `icons/` together, keeping the folder structure. All paths are relative, so it works at the site root or in a subfolder such as `miriogames.com/rig-runner/`. `tests/`, `tools/` and `package.json` are for development and don't need to be uploaded.

Any static host works (shared hosting, Netlify, Cloudflare Pages, S3). It needs no server code and no special configuration. Saved progress is kept in each player's browser (localStorage) and is separate for each site address.

## Home Screen app (PWA)

The game installs as an app. On iPhone: open the site in Safari → Share → **Add to Home Screen**. It then launches full screen with the robot-head icon and works offline after the first visit.

- `manifest.webmanifest` and `icons/` describe the app (name, icons, full-screen display).
- `sw.js` is the service worker that caches the game for offline play. **When you publish an update, change `VERSION` at the top of `sw.js`** so installed copies fetch the new files (they update on the next launch).
- The site must be served over **https** for the app features to work (localhost is fine for testing).
- If you change the list of scripts or assets, update the `SHELL` list in `sw.js` too.

## Tests

```
cd web
npm install
npx playwright install chromium
npm test              # quick run, about a minute
npm test -- --full    # 2,000 generated levels, ~18,000 replayed moves, a real-time dance battle
```

The suite checks that the page loads cleanly, every campaign level can be finished by every robot, generated endless levels are all proven beatable, the solver's predicted jumps and drops match the real game, ramps are walkable, drop shafts really require dropping, saves survive a reload, and a dance battle can be won.

## Single-file version

```
python3 tools/build-single.py            # writes dist/rig-runner.html
```
