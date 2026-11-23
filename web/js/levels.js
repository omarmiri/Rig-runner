// Rig Runner · Tile helpers, themes, campaign levels and the reusable course sections.
"use strict";
// ================= Levels =================
const T = 48, ROWS = 12;
let COLS = 142;
let grid = [];
const bolts = [], checkpoints = [], hints = [];
let goal = null, rival = null; const spawn = { c: 3, r: 10 };
const set = (c, r, ch) => { if (c >= 0 && c < COLS && r >= 0 && r < ROWS) grid[r][c] = ch; };
const ground = (c0, c1, top) => { for (let c = c0; c <= c1; c++) for (let r = top; r < ROWS; r++) set(c, r, "#"); };
const block = (c0, c1, r0, r1) => { for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) set(c, r, "#"); };
const girder = (c0, c1, r) => { for (let c = c0; c <= c1; c++) set(c, r, "="); };
const spikes = (c0, c1, r) => { for (let c = c0; c <= c1; c++) set(c, r, "^"); };
const bolt = (c, r) => bolts.push({ x: c * T + T / 2, y: r * T + T / 2, got: false });
const checkpoint = (c, r) => checkpoints.push({ c, r, x: c * T + T / 2, y: (r + 1) * T, on: false });

const THEMES = [
  { sky: ["#0b1520", "#17293a", "#24384a"], far: "#132332", glow: [242, 162, 58], laser: ["#5ee7ff", "#ff5ec8"] },
  { sky: ["#170d10", "#2c1719", "#43231d"], far: "#241519", glow: [255, 110, 60], laser: ["#ffb03a", "#ff5ec8"] },
  { sky: ["#0a0a1e", "#191640", "#2a1f58"], far: "#17163a", glow: [94, 231, 255], laser: ["#5ee7ff", "#c6ff5e"] },
  { sky: ["#07130f", "#11281d", "#1c3a2a"], far: "#0f2419", glow: [150, 255, 120], laser: ["#c6ff5e", "#5ee7ff"] },
  { sky: ["#13060e", "#290d20", "#3c132e"], far: "#210a1b", glow: [255, 70, 120], laser: ["#ff5ec8", "#ff3a4a"] },
];


// Reusable course sections. Each starts and ends on ground at row 10; widths are fixed so a level's size is known up front.
// Every rise is at most 3 tiles and every gap at most 3 tiles, so all five robots can clear them.
const SEG = {
  start: [8, x => { ground(x, x + 7, 10); }],
  rest: [6, x => { ground(x, x + 5, 10); checkpoint(x + 3, 9); }],
  step: [14, x => { ground(x, x + 2, 10); ground(x + 4, x + 10, 8); bolt(x + 6, 6); bolt(x + 8, 6); ground(x + 11, x + 13, 10); }],
  spikeRun: [12, x => { ground(x, x + 11, 10); spikes(x + 4, x + 6, 9); girder(x + 3, x + 7, 7); bolt(x + 4, 6); bolt(x + 6, 6); }],
  stones: [19, x => { ground(x, x + 1, 10); block(x + 4, x + 5, 8, 8); bolt(x + 4.5, 6); block(x + 8, x + 9, 7, 7); bolt(x + 8.5, 5); block(x + 12, x + 13, 8, 8); ground(x + 16, x + 18, 10); }],
  stairs: [14, x => { ground(x, x + 13, 10); block(x + 3, x + 3, 9, 9); block(x + 4, x + 5, 8, 9); block(x + 6, x + 9, 7, 9); bolt(x + 7.5, 5); }],
  girderPit: [22, x => { ground(x, x + 1, 10); girder(x + 4, x + 6, 8); bolt(x + 5, 7); girder(x + 9, x + 11, 7); bolt(x + 10, 6); girder(x + 14, x + 16, 8); bolt(x + 15, 7); ground(x + 19, x + 21, 10); }],
  tower: [14, x => { ground(x, x + 3, 10); block(x + 4, x + 5, 7, 11); bolt(x + 4.5, 5); ground(x + 9, x + 13, 10); }],
  spikeHop: [13, x => { ground(x, x + 12, 10); block(x + 3, x + 4, 7, 9); spikes(x + 5, x + 7, 9); bolt(x + 6, 5); block(x + 8, x + 9, 7, 9); }],
  pillars: [22, x => { ground(x, x + 1, 10); [[4, 8], [7, 7], [10, 6], [13, 7], [16, 8]].forEach(([i, r], k) => { block(x + i, x + i, r, r); if (k % 2 === 0) bolt(x + i, r - 2); }); ground(x + 19, x + 21, 10); }],
  spikeField: [16, x => { ground(x, x + 15, 10); spikes(x + 3, x + 4, 9); spikes(x + 8, x + 9, 9); spikes(x + 13, x + 13, 9); bolt(x + 3.5, 7); bolt(x + 8.5, 7); }],
  highRoad: [21, x => { ground(x, x + 1, 10); girder(x + 3, x + 6, 7); girder(x + 8, x + 11, 4); bolt(x + 9.5, 3); girder(x + 13, x + 16, 6); bolt(x + 14.5, 5); ground(x + 18, x + 20, 10); }],
};
function makeLevel(meta, list, dance) {
  const body = 8 + list.reduce((a, n) => a + SEG[n][0], 0), endW = dance ? 32 : 16, cols = body + endW;
  const def = Object.assign({}, meta, { cols, goalCol: body + (dance ? 27 : 10) });
  if (dance) def.rivalCol = body + 20;
  def.build = () => {
    let x = 0;
    for (const n of ["start", ...list]) { SEG[n][1](x); x += SEG[n][0]; }
    ground(x, x + endW - 1, 10); bolt(x + 4, 8); bolt(x + 6, 7); bolt(x + 8, 8);
    block(x + endW - 2, x + endW - 1, 0, 9);
  };
  return def;
}


// Dance battle campaign: tempo rises each level; rounds = { beats, moves, eighths }. The last rival is your dark clone.
const DANCE_LEVELS = [
  {
    name: "Assembly bay", bpm: 88, theme: 0, cols: 92, rivalCol: 80, goalCol: 87,
    rounds: [{ beats: 4, n: 3 }, { beats: 4, n: 4 }, { beats: 8, n: 5 }],
    build() {
      ground(0, 18, 10); bolt(8, 8); bolt(10, 7); bolt(12, 8);
      ground(19, 26, 8); bolt(22, 6); bolt(24, 6);
      ground(30, 40, 9); spikes(34, 35, 8); girder(36, 40, 6); bolt(37, 5); bolt(39, 5);
      ground(41, 48, 10); checkpoint(44, 9);
      block(50, 51, 8, 8); bolt(50.5, 6);
      ground(53, 91, 10); block(56, 56, 9, 9); block(57, 58, 8, 9); block(59, 62, 7, 9); bolt(60.5, 5);
      bolt(66, 8); bolt(68, 7); bolt(70, 8);
      block(90, 91, 0, 9);
    },
  },
  {
    name: "Foundry", bpm: 92, theme: 1, cols: 121, rivalCol: 109, goalCol: 116,
    rounds: [{ beats: 4, n: 4 }, { beats: 8, n: 5 }, { beats: 8, n: 6 }],
    build() {
      ground(0, 12, 10); bolt(6, 8); bolt(9, 8);
      block(14, 15, 8, 8); bolt(14.5, 6); block(18, 19, 6, 6); bolt(18.5, 4);
      ground(22, 30, 9); spikes(25, 26, 8); girder(27, 30, 6); bolt(28.5, 5);
      ground(31, 40, 10); checkpoint(35, 9);
      girder(43, 45, 8); bolt(44, 7); girder(48, 50, 7); bolt(49, 6); girder(53, 55, 8); bolt(54, 7);
      ground(58, 70, 10); spikes(62, 63, 9); bolt(62.5, 6); block(67, 68, 7, 9); bolt(67.5, 5);
      ground(69, 80, 10); checkpoint(74, 9);
      block(82, 83, 8, 8); bolt(82.5, 6); block(86, 87, 7, 7); bolt(86.5, 5);
      ground(90, 120, 10); bolt(94, 8); bolt(96, 7); bolt(98, 8);
      block(119, 120, 0, 9);
    },
  },
  {
    name: "Signal tower", bpm: 96, theme: 2, cols: 111, rivalCol: 99, goalCol: 106,
    rounds: [{ beats: 4, n: 4 }, { beats: 8, n: 6 }, { beats: 8, n: 7, eighths: true }],
    build() {
      ground(0, 10, 10); bolt(5, 8);
      girder(12, 14, 8); bolt(13, 7); girder(17, 19, 6); bolt(18, 5);
      block(22, 24, 5, 11); bolt(23, 3);
      ground(25, 34, 10); spikes(29, 30, 9); bolt(29.5, 7); checkpoint(33, 9);
      block(37, 37, 8, 8); block(40, 40, 7, 7); bolt(40, 5); block(43, 43, 6, 6); bolt(43, 4); block(46, 46, 7, 7); block(49, 49, 8, 8); bolt(49, 6);
      ground(52, 64, 10); spikes(55, 56, 9); spikes(60, 61, 9); bolt(55.5, 7); bolt(60.5, 7); checkpoint(63, 9);
      ground(66, 110, 10); block(69, 70, 7, 9); spikes(71, 73, 9); block(74, 75, 7, 9); bolt(72, 5);
      bolt(80, 8); bolt(82, 7); bolt(84, 8);
      block(109, 110, 0, 9);
    },
  },
  makeLevel({ name: "Cooling towers", bpm: 100, theme: 3, rounds: [{ beats: 4, n: 4 }, { beats: 8, n: 6 }, { beats: 8, n: 7, eighths: true }] },
    ["stones", "spikeRun", "rest", "girderPit", "spikeHop", "rest", "pillars"], true),
  // hybrid boss levels
  makeLevel({ name: "Scrap yard", theme: 1, boss: "bruiser" }, ["step", "spikeHop", "rest", "stones", "spikeRun", "rest", "tower"], true),
  makeLevel({ name: "Launch pad", theme: 2, boss: "rocketbrute" }, ["highRoad", "rest", "girderPit", "stairs", "rest", "spikeField"], true),
  makeLevel({ name: "Catwalks", theme: 3, boss: "stilts" }, ["girderPit", "highRoad", "rest", "pillars", "rest", "spikeHop", "stones"], true),
  makeLevel({ name: "The vault", theme: 0, boss: "goldrunner" }, ["stairs", "spikeField", "rest", "tower", "pillars", "rest", "spikeRun", "highRoad"], true),
  makeLevel({ name: "The hive", theme: 4, boss: "bughead" }, ["pillars", "stones", "rest", "spikeHop", "girderPit", "rest", "spikeField", "tower"], true),
  makeLevel({ name: "Tank pit", theme: 1, boss: "spidertank" }, ["spikeRun", "highRoad", "rest", "girderPit", "pillars", "rest", "spikeHop", "stones", "spikeField"], true),
  // final: your dark clone
  makeLevel({ name: "Core reactor", theme: 4, clone: true }, ["highRoad", "spikeHop", "rest", "pillars", "spikeField", "rest", "girderPit", "tower"], true),
];
// tempo and routine size per dance level: a gentle ramp from 88 to 106 BPM
(() => {
  const e = true, r = (b, n, eighths = false) => ({ beats: b, n, eighths });
  const plan = [
    [88, [r(4, 3), r(4, 4), r(8, 5)]],
    [90, [r(4, 4), r(8, 5), r(8, 6)]],
    [92, [r(4, 4), r(8, 6), r(8, 7, e)]],
    [94, [r(4, 4), r(8, 6), r(8, 7, e)]],
    [96, [r(4, 4), r(8, 6), r(8, 7, e)]],
    [98, [r(4, 4), r(8, 6, e), r(8, 7, e)]],
    [100, [r(4, 5, e), r(8, 6, e), r(8, 7, e)]],
    [100, [r(4, 5, e), r(8, 7, e), r(8, 8, e)]],
    [102, [r(4, 5, e), r(8, 7, e), r(8, 8, e)]],
    [104, [r(4, 5, e), r(8, 7, e), r(8, 8, e)]],
    [106, [r(4, 5, e), r(8, 8, e), r(8, 9, e)]],
  ];
  DANCE_LEVELS.forEach((d, i) => { d.bpm = plan[i][0]; d.rounds = plan[i][1]; });
  // Signature hooks: fixed riffs you can learn. The level's platforming music plays the
  // motif, the boss teases it when you arrive, and every round of the battle builds on it.
  // Each entry is [beat, move] inside the round (the lead-in beat is added later).
  DANCE_LEVELS[0].signature = {
    name: "Stomp, stomp, stomp, jump",            // funk: three stomps on the root, then up
    motif: [[0, "down"], [1, "down"], [2, "down"], [3, "up"]],
    rounds: [
      [[0, "down"], [1, "down"], [2, "down"]],
      [[0, "down"], [1, "down"], [2, "down"], [3, "up"]],
      [[0, "down"], [1, "down"], [2, "down"], [3, "up"], [6, "act"]],
    ],
  };
  DANCE_LEVELS[1].signature = {
    name: "Low, mid, high, mid",                   // trance: the bouncing arpeggio A-E-A-E
    motif: [[0, "down"], [1, "right"], [2, "up"], [3, "right"]],
    rounds: [
      [[0, "down"], [1, "right"], [2, "up"], [3, "right"]],
      [[0, "down"], [1, "right"], [2, "up"], [3, "right"], [6, "act"]],
      [[0, "down"], [1, "right"], [2, "up"], [3, "right"], [4, "down"], [6, "act"]],
    ],
  };
  // Levels 3-11: each a different genre trick. A hook is a 4-beat motif; rounds 2 and 3 repeat it and
  // add an answer phrase in the second bar. Counts match each level's difficulty plan above.
  const sig = (name, motif, answer2, answer3) => ({
    name, motif, rounds: [motif, [...motif, ...answer2.map(([b, m]) => [b + 4, m])], [...motif, ...answer3.map(([b, m]) => [b + 4, m])]],
  });
  const sigs = [
    // 3 · disco: the octave bounce, low-high-low-high
    sig("Octave bounce", [[0, "down"], [1, "up"], [2, "down"], [3, "up"]],
      [[0, "right"], [2, "act"]], [[0, "right"], [0.5, "right"], [2, "act"]]),
    // 4 · electro: a zig-zag between left and right that pops up at the end
    sig("Zig-zag", [[0, "left"], [1, "right"], [2, "left"], [3, "up"]],
      [[0, "left"], [2, "down"]], [[0, "left"], [1, "right"], [1.5, "act"]]),
    // 5 · funk (Bruiser): punch, hey, punch, hey
    sig("Punch, hey", [[0, "down"], [1, "act"], [2, "down"], [3, "act"]],
      [[0, "down"], [2, "up"]], [[0, "down"], [0.5, "down"], [2, "act"]]),
    // 6 · trance (Rocket Brute): a rising ladder, then a double-time lift-off
    sig("Lift-off ladder", [[0, "down"], [1, "left"], [2, "right"], [3, "up"]],
      [[0, "up"], [0.5, "up"]], [[0, "up"], [0.5, "up"], [1, "act"]]),
    // 7 · disco (Stilts): octave bounce with a long-legged skip
    sig("Long legs", [[0, "down"], [1, "up"], [1.5, "up"], [2, "down"], [3, "up"]],
      [[2, "act"]], [[0, "down"], [2, "act"]]),
    // 8 · electro (Gold Runner): a stutter that strikes gold
    sig("Gold rush", [[0, "right"], [0.5, "right"], [1, "up"], [2, "right"], [3, "down"]],
      [[0, "right"], [2, "act"]], [[0, "right"], [0.5, "right"], [2, "up"]]),
    // 9 · funk (Bughead): a buzzing triple, then a sting
    sig("Bug buzz", [[0, "left"], [0.5, "left"], [1, "left"], [2, "right"], [3, "act"]],
      [[0, "left"], [2, "down"]], [[0, "left"], [0.5, "left"], [2, "up"]]),
    // 10 · trance (Spider Tank): a six-legged gallop
    sig("Scuttle", [[0, "down"], [0.5, "right"], [1, "down"], [1.5, "right"], [3, "up"]],
      [[0, "down"], [2, "act"]], [[0, "down"], [0.5, "right"], [2, "act"]]),
    // 11 · disco (dark clone): level 1's stomp, mirrored upside down
    sig("Mirror stomp", [[0, "up"], [1, "up"], [2, "up"], [3, "down"], [3.5, "act"]],
      [[0, "up"], [1, "up"], [2, "act"]], [[0, "up"], [1, "up"], [2, "down"], [2.5, "act"]]),
  ];
  sigs.forEach((s, k) => { DANCE_LEVELS[k + 2].signature = s; });
})();
// every hook, for endless levels to draw from
const RIFF_LIBRARY = DANCE_LEVELS.filter(d => d.signature).map(d => ({ name: d.signature.name, motif: d.signature.motif }));
// The story is the 11 hand-made levels; after them the game continues with generated endless levels.
const STORY_LEN = DANCE_LEVELS.length;
const levelList = () => DANCE_LEVELS;
