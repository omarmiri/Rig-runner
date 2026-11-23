# Rig Runner

A browser platformer starring robots built from rig parts: eleven story levels of platforming and dance battles (rival robots, hybrid bosses, a dark-clone finale), then endless generated levels and bosses that are proven beatable before you play them.

- **`web/`** is the source of truth: the game split into a page shell, CSS, scripts by system, and PNG assets, plus automated tests. This is the folder to host on a website. See [`web/README.md`](web/README.md).
- **`index.html`** in the repo root is a single-file build of `web/` (made with `web/tools/build-single.py`), used for the temporary GitHub Pages site.

## Controls
- Run: ← → or A / D
- Jump: Space, W or ↑ (hold for higher)
- Drop through orange girders: ↓ or S
- Dance battles: ← ↑ ↓ → and Space
- Pause: Esc or P (R restarts, M mutes). Menus: arrows/Enter, Esc goes back.
- Controller (Xbox, PlayStation, Switch Pro…): D-pad or stick to run, A to jump, down drops, Start pauses. In dance-offs the D-pad does the moves and A is Flare. In menus the D-pad moves, A chooses, B goes back.
- On phones, large on-screen buttons appear during play (they hide while a controller is in use).

Progress is saved in the browser (localStorage).

## Home Screen app
Both the `web/` site and this single-file build install as an app: open the page in Safari on iPhone → Share → **Add to Home Screen**. They launch full screen with the robot-head icon and work offline after the first visit. Change `VERSION` in `sw.js` (and `web/sw.js`) when publishing updates.
