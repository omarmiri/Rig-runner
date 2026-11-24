# Bolt Beat (website version)

A browser platformer starring robots built from rig parts: five playable robots and one continuous game. Eleven story levels end in dance battles against rival robots, hybrid bosses and your own dark clone; after the story the game keeps going with endless levels and bosses that are generated on the fly, proven beatable before you play them, and grow every five levels.

Plain HTML, CSS and JavaScript. No framework and no build step.

## Energy

Bolts are energy. Each level's energy bar holds as many bolts as the level has, so collecting them all gives max energy. You start a level with the energy you finished the last one with (at least 3; a new game starts with 5). Falling off or hitting spikes costs 3 and those bolts go back to their spots; losing a dance-off costs 5. Running out is game over: in the story you retry that level with 5 energy, in endless the run ends. Tune the numbers in `ENERGY` at the top of the energy section in `js/effects.js`.

## Folder layout

```
index.html           page shell: HUD, menu, touch controls; loads the scripts below in order
css/base.css         page reset (safe-area padding, margins)
css/style.css        all game UI styling
js/                  classic scripts sharing one global scope, loaded in this order:
  characters.js        robot definitions (rig joints, physics, abilities) and part loading
  poses.js             idle, run, jump, breakdance and lasso poses
  rig.js               kinematics: pose -> placed part images; drawing a character
  levels.js            tiles, themes, the 11 story levels, reusable course sections
  bosses.js            dark clone and the hand-made hybrid bosses
  generator.js         endless level generator (seeded)
  solver.js            proves a level can be finished, using the game's own physics
  endless.js           accessories, generated bosses, endless level pipeline, best score
  physics.js           level loading and movement shared by the player and the solver
  audio.js             synth sounds and the electro beat sequencer
  input.js             keyboard and touch input
  game.js              game state, level flow, saved progress
  menu.js              title menu (robot picker, phone steps)
  home.js              home screen: title, menu music, the dancing robot
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

Upload `index.html`, `manifest.webmanifest`, `sw.js`, `css/`, `js/`, `assets/` and `icons/` together, keeping the folder structure. All paths are relative, so it works at the site root or in a subfolder such as `miriogames.com/bolt-beat/`. `tests/`, `tools/` and `package.json` are for development and don't need to be uploaded.

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

The suite checks that the page loads cleanly, every story level can be finished by every robot, the story flows into endless levels, generated endless levels are all proven beatable, the solver's predicted jumps and drops match the real game, ramps are walkable, drop shafts really require dropping, saves survive a reload, and a dance battle can be won.

## Single-file version

```
python3 tools/build-single.py            # writes dist/bolt-beat.html
```

## Dance-off timing (calibration)

Dance-offs judge taps against the music clock minus the audio latency the browser reports, plus a
saved per-device offset (`js/timing.js`, stored as `rigrunner.timing.<output>`):

- **Warm-up:** level 1's dance-off (once per session), and the first dance-off on any output that has
  never been calibrated, opens with an 8-beat tap-along over a metronome click. The median tap offset
  becomes the saved offset, applied from round 1.
- **Ongoing:** after every dance-off, the median timing of correct-move hits nudges the offset (60% of
  the way, at most 50 ms per battle).
- Level 1 also shows tutorial captions (watch the routine, then copy it on the beat).
