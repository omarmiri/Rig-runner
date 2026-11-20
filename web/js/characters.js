// Rig Runner · Robot definitions (rig pins, physics, abilities) and part loading.
"use strict";
// ================= Characters =================
const ART = {"runner":{"head":{"src":"assets/robots/runner/head.png","w":149,"h":234},"torso":{"src":"assets/robots/runner/torso.png","w":268,"h":355},"pelvis":{"src":"assets/robots/runner/pelvis.png","w":130,"h":220},"upper_arm":{"src":"assets/robots/runner/upper_arm.png","w":118,"h":302},"forearm":{"src":"assets/robots/runner/forearm.png","w":152,"h":286},"fist":{"src":"assets/robots/runner/fist.png","w":106,"h":179},"thigh":{"src":"assets/robots/runner/thigh.png","w":122,"h":337},"shin":{"src":"assets/robots/runner/shin.png","w":103,"h":312},"foot":{"src":"assets/robots/runner/foot.png","w":191,"h":99}},"jumper":{"head":{"src":"assets/robots/jumper/head.png","w":272,"h":279},"torso":{"src":"assets/robots/jumper/torso.png","w":206,"h":355},"pelvis":{"src":"assets/robots/jumper/pelvis.png","w":171,"h":383},"upper_arm":{"src":"assets/robots/jumper/upper_arm.png","w":88,"h":262},"forearm":{"src":"assets/robots/jumper/forearm.png","w":119,"h":302},"fist":{"src":"assets/robots/jumper/fist.png","w":147,"h":186},"thigh":{"src":"assets/robots/jumper/thigh.png","w":174,"h":388},"shin":{"src":"assets/robots/jumper/shin.png","w":142,"h":350},"foot":{"src":"assets/robots/jumper/foot.png","w":449,"h":337}},"slim":{"head":{"src":"assets/robots/slim/head.png","w":189,"h":178},"torso":{"src":"assets/robots/slim/torso.png","w":125,"h":355},"pelvis":{"src":"assets/robots/slim/pelvis.png","w":124,"h":316},"upper_arm":{"src":"assets/robots/slim/upper_arm.png","w":60,"h":261},"forearm":{"src":"assets/robots/slim/forearm.png","w":86,"h":293},"fist":{"src":"assets/robots/slim/fist.png","w":83,"h":98},"thigh":{"src":"assets/robots/slim/thigh.png","w":108,"h":316},"shin":{"src":"assets/robots/slim/shin.png","w":102,"h":312},"foot":{"src":"assets/robots/slim/foot.png","w":181,"h":88}},"tank":{"head":{"src":"assets/robots/tank/head.png","w":309,"h":307},"torso":{"src":"assets/robots/tank/torso.png","w":341,"h":355},"pelvis":{"src":"assets/robots/tank/pelvis.png","w":279,"h":298},"upper_arm":{"src":"assets/robots/tank/upper_arm.png","w":183,"h":323},"forearm":{"src":"assets/robots/tank/forearm.png","w":179,"h":333},"fist":{"src":"assets/robots/tank/fist.png","w":256,"h":282},"thigh":{"src":"assets/robots/tank/thigh.png","w":227,"h":417},"shin":{"src":"assets/robots/tank/shin.png","w":215,"h":402},"foot":{"src":"assets/robots/tank/foot.png","w":415,"h":207}},"spider":{"head":{"src":"assets/robots/spider/head.png","w":259,"h":230},"body":{"src":"assets/robots/spider/body.png","w":350,"h":213},"abdomen":{"src":"assets/robots/spider/abdomen.png","w":305,"h":185},"upper_leg":{"src":"assets/robots/spider/upper_leg.png","w":327,"h":201},"lower_leg":{"src":"assets/robots/spider/lower_leg.png","w":202,"h":284},"foot":{"src":"assets/robots/spider/foot.png","w":254,"h":185}}};
const HAT_ART = {"src": "assets/accessories/cowboy-hat.png", "w": 320, "h": 234}; // cowboy hat accessory
let hatCanvas = null;
const hatReady = new Promise(res => { const im = new Image(); im.onload = () => { const c = document.createElement("canvas"); c.width = im.width; c.height = im.height; c.getContext("2d").drawImage(im, 0, 0); hatCanvas = c; res(); }; im.onerror = res; im.src = HAT_ART.src; });

// Biped limb parts use two pins (fractions of the image): a = joint at the parent, b = joint at the child.
const CHARS = {
  runner: {
    name: "Runner", headScale: 2.0, kind: "biped", height: 122,
    ability: ["All-rounder", "The original rig. Even speed and jump, no tricks."],
    stats: { speed: 3, jump: 3 },
    phys: { max: 330, accel: 2600, jumpV: 870, fallMul: 1.3 },
    rig: { neckY: -330, headY: -296, headX: -6, shoulderY: -300, pelvisY: -10, hipY: 130, squash: 0.84 },
    pins: {
      head: [0.5, 1.0], torso: [0.5, 0.0], pelvis: [0.5, 0.0],
      thigh: [0.5, 0.0, 0.5, 0.926], shin: [0.5, 0.0, 0.5, 0.955],
      upper_arm: [0.5, 0.0, 0.5, 0.944], forearm: [0.5, 0.0, 0.5, 0.892],
      fist: [0.5, 0.38], foot: [0.28, 0.0, 0.92],
    },
  },
  jumper: {
    name: "Jumper", headScale: 1.45, kind: "biped", height: 126,
    ability: ["Thruster boots", "Jump a second time in mid-air. Slightly slower on the ground."],
    stats: { speed: 2.6, jump: 5 },
    phys: { max: 310, accel: 2400, jumpV: 880, fallMul: 1.3, airJumps: 1, airJumpV: 780 },
    rig: { neckY: -310, headY: -300, headX: -4, shoulderY: -278, pelvisY: -18, hipY: 118, squash: 0.9 },
    pins: {
      head: [0.35, 0.95], torso: [0.45, 0.03], pelvis: [0.6, 0.03],
      thigh: [0.5, 0.1, 0.5, 0.93], shin: [0.4, 0.04, 0.5, 0.96],
      upper_arm: [0.5, 0.12, 0.5, 0.88], forearm: [0.55, 0.07, 0.45, 0.92],
      fist: [0.5, 0.06], foot: [0.33, 0.1, 0.96],
    },
  },
  slim: {
    name: "Slim", headScale: 1.6, kind: "biped", height: 126,
    ability: ["Sprinter", "Fastest robot on the course, with quick acceleration."],
    stats: { speed: 5, jump: 2.8 },
    phys: { max: 400, accel: 3100, jumpV: 855, fallMul: 1.3 },
    rig: { neckY: -305, headY: -298, headX: -4, shoulderY: -262, pelvisY: -12, hipY: 100, squash: 1 },
    pins: {
      head: [0.3, 0.97], torso: [0.45, 0.02], pelvis: [0.5, 0.02],
      thigh: [0.5, 0.05, 0.42, 0.88], shin: [0.5, 0.04, 0.35, 0.9],
      upper_arm: [0.5, 0.1, 0.5, 0.9], forearm: [0.5, 0.07, 0.45, 0.75],
      fist: [0.5, 0.05], foot: [0.3, 0.12, 0.95],
    },
  },
  tank: {
    name: "Tank", headScale: 1.45, kind: "biped", height: 124,
    ability: ["Armor plate", "Shrugs off one spike hit. The plate is restored at each checkpoint. Slow and heavy."],
    stats: { speed: 1.8, jump: 2.9 },
    phys: { max: 265, accel: 1900, jumpV: 860, fallMul: 1.45, armor: 1 },
    rig: { neckY: -330, headY: -318, headX: -8, shoulderY: -292, pelvisY: -16, hipY: 205, squash: 0.85 },
    pins: {
      head: [0.3, 0.95], torso: [0.47, 0.03], pelvis: [0.42, 0.03],
      thigh: [0.5, 0.1, 0.45, 0.92], shin: [0.4, 0.05, 0.37, 0.93],
      upper_arm: [0.5, 0.06, 0.5, 0.92], forearm: [0.5, 0.1, 0.5, 0.92],
      fist: [0.45, 0.04], foot: [0.25, 0.1, 0.97],
    },
  },
  spider: {
    name: "Spider", headScale: 1.3, kind: "spider", height: 90,
    ability: ["Glider", "Six legs and a light frame: falls slowly, so long jumps are easy to steer."],
    stats: { speed: 3.4, jump: 3.6 },
    phys: { max: 340, accel: 3300, jumpV: 860, fallMul: 0.62, maxFall: 520 },
    box: { w: 60, h: 70 },
    pins: {
      body: [0.5, 0.5], head: [0.16, 0.6], abdomen: [0.08, 0.45],
      upper_leg: [0.1, 0.2, 0.88, 0.78], lower_leg: [0.72, 0.12, 0.1, 0.92], foot: [0.3, 0.15, 0.92],
      headAt: [150, 20], abdomenAt: [-150, -6],
      hips: [-150, -35, 80], hipY: 50, rest: [70, 350], stride: 210, lift: 95,
    },
  },
};
const ORDER = ["runner", "jumper", "slim", "tank", "spider"];
const RIVAL_PREF = ["slim", "spider", "tank", "jumper", "runner"];
const BASE_PHYS = { accel: 2600, airAccel: 1700, friction: 3200, max: 330, grav: 2300, fallMul: 1.3, jumpV: 870, cut: 0.45, maxFall: 1150, coyote: 0.1, buffer: 0.13, airJumps: 0, airJumpV: 0, armor: 0 };

// where the visible pixels of an image start (top) and their centre line (cx), as fractions
function opaqueBox(cv) {
  const g = cv.getContext("2d"), { width: w, height: h } = cv, d = g.getImageData(0, 0, w, h).data;
  let top = h, x0 = w, x1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) { if (y < top) top = y; if (y < top + h * 0.3) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); } }
  return top >= h ? { top: 0, cx: 0.5 } : { top: top / h, cx: (x0 + x1) / 2 / w };
}
function loadChar(ch) {
  if (ch.ready) return ch.ready;
  ch.img = {}; ch.dark = {};
  const art = ART[ch.key];
  ch.ready = Promise.all(Object.keys(art).map(n => new Promise(res => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
      const g = c.getContext("2d"); g.drawImage(im, 0, 0);
      g.globalCompositeOperation = "source-atop"; g.fillStyle = "rgba(20, 34, 52, 0.42)"; g.fillRect(0, 0, c.width, c.height);
      ch.img[n] = { im, w: art[n].w, h: art[n].h, box: n === "head" ? opaqueBox(c) : null }; ch.dark[n] = { im: c, w: art[n].w, h: art[n].h };
      res();
    };
    im.onerror = res; im.src = art[n].src;
  })));
  return ch.ready;
}
for (const k of ORDER) CHARS[k].key = k;
