# Rig Runner

A browser platformer starring robots built from rig parts: five playable robots, a dance battle campaign with hybrid bosses and a dark-clone finale, five free-run courses, and endless modes with generated levels and bosses that are proven beatable before you play them.

- **`web/`** is the source of truth: the game split into a page shell, CSS, scripts by system, and PNG assets, plus automated tests. This is the folder to host on a website. See [`web/README.md`](web/README.md).
- **`index.html`** in the repo root is a single-file build of `web/` (made with `web/tools/build-single.py`), used for the temporary GitHub Pages site.

## Controls
- Run: ← → or A / D
- Jump: Space, W or ↑ (hold for higher)
- Drop through orange girders: ↓ or S
- Dance battles: ← ↑ ↓ → and Space
- On phones, on-screen buttons appear during play.

Progress is saved in the browser (localStorage).
