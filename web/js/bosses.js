// Rig Runner · Dark clone and the hand-made hybrid bosses.
"use strict";
// ---------- dark clone: the player's own rig, blacked out with a red glow ----------
const clones = {};
function cloneOf(src) {
  if (clones[src.key]) return clones[src.key];
  const tint = (im, fills) => {
    const c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
    const g = c.getContext("2d"); g.drawImage(im, 0, 0); g.globalCompositeOperation = "source-atop";
    for (const f of fills) { g.fillStyle = f; g.fillRect(0, 0, c.width, c.height); }
    return c;
  };
  const img = {}, dark = {};
  for (const n in src.img) {
    const { im, w, h } = src.img[n];
    img[n] = { im: tint(im, ["rgba(14,8,22,0.8)", "rgba(255,40,80,0.1)"]), w, h, box: src.img[n].box };
    dark[n] = { im: tint(im, ["rgba(8,4,14,0.88)", "rgba(255,40,80,0.06)"]), w, h };
  }
  return (clones[src.key] = Object.assign({}, src, { key: src.key + "-dark", name: "Dark " + src.name, img, dark, aura: "rgba(255,42,74,0.85)", clone: true }));
}

// ---------- boss hybrids: parts from several rigs, recoloured ----------
// parts: which robot each part comes from. torso/pelvis: whose body proportions to use.
const HYBRIDS = [
  { key: "bruiser", name: "Bruiser", color: "#ff5a64", height: 142, torso: "tank", pelvis: "slim",
    parts: { head: "tank", torso: "tank", pelvis: "slim", upper_arm: "tank", forearm: "tank", fist: "tank", thigh: "slim", shin: "slim", foot: "slim" },
    blurb: "Tank's armour and fists balanced on Slim's skinny legs", taunt: "These fists can dance too." },
  { key: "rocketbrute", name: "Rocket Brute", color: "#6aa8ff", height: 146, torso: "tank", pelvis: "tank",
    parts: { head: "tank", torso: "tank", pelvis: "tank", upper_arm: "tank", forearm: "tank", fist: "tank", thigh: "jumper", shin: "jumper", foot: "jumper" },
    blurb: "Full Tank upper body riding Jumper's thruster boots", taunt: "Boosters on. Try to keep up." },
  { key: "stilts", name: "Stilts", color: "#b8ff6a", height: 156, torso: "jumper", pelvis: "jumper",
    parts: { head: "runner", torso: "jumper", pelvis: "jumper", upper_arm: "slim", forearm: "slim", fist: "slim", thigh: "slim", shin: "slim", foot: "jumper" },
    blurb: "Runner's head on a lanky Slim frame with Jumper's boots", taunt: "I'll dance circles around you." },
  { key: "goldrunner", name: "Gold Runner", color: "#ffd24a", height: 138, torso: "runner", pelvis: "runner",
    parts: { head: "runner", torso: "runner", pelvis: "runner", upper_arm: "runner", forearm: "runner", fist: "tank", thigh: "runner", shin: "runner", foot: "jumper" },
    blurb: "The original rig in gold, with Tank's fists and Jumper's boots", taunt: "Gold beats chrome." },
  { key: "bughead", name: "Bughead", color: "#b583ff", height: 140, torso: "slim", pelvis: "slim", headPin: [0.24, 0.8],
    parts: { head: "spider", torso: "slim", pelvis: "slim", upper_arm: "jumper", forearm: "jumper", fist: "jumper", thigh: "tank", shin: "tank", foot: "tank" },
    blurb: "Spider's head on Slim's body, Jumper's arms and Tank's legs", taunt: "Bzzt. Dance-off. Bzzt." },
  { key: "spidertank", name: "Spider Tank", color: "#ff9a4a", height: 112, kind: "spider",
    parts: { head: "tank" }, headPin: [0.3, 0.95], headAt: [70, -70],
    blurb: "Spider's six legs carrying Tank's helmeted head", taunt: "Six legs. Zero mercy." },
];
function tintImg(im, color, shade = 0) {
  const c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
  const g = c.getContext("2d");
  g.drawImage(im, 0, 0);
  g.globalCompositeOperation = "multiply"; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = "destination-in"; g.drawImage(im, 0, 0);
  if (shade) { g.globalCompositeOperation = "source-atop"; g.fillStyle = `rgba(20,34,52,${shade})`; g.fillRect(0, 0, c.width, c.height); }
  return c;
}
const bosses = {};
function makeHybrid(h, noCache = false) {
  if (!noCache && bosses[h.key]) return bosses[h.key];
  const img = {}, dark = {}, pins = {};
  const take = (part, owner) => {
    const src = CHARS[owner].img[part];
    img[part] = { im: tintImg(src.im, h.color), w: src.w, h: src.h, box: src.box };
    dark[part] = { im: tintImg(src.im, h.color, 0.42), w: src.w, h: src.h };
  };
  let c;
  if (h.kind === "spider") {
    const base = CHARS.spider;
    for (const part in base.img) take(part, h.parts[part] || "spider");
    Object.assign(pins, base.pins, { head: h.headPin, headAt: h.headAt });
    c = Object.assign({}, base, { pins, headScale: CHARS[h.parts.head].headScale });
  } else {
    const To = CHARS[h.torso], Pv = CHARS[h.pelvis];
    for (const part in h.parts) { take(part, h.parts[part]); pins[part] = CHARS[h.parts[part]].pins[part]; }
    if (h.headPin) pins.head = h.headPin;
    const rig = { neckY: To.rig.neckY, headY: To.rig.headY, headX: To.rig.headX, shoulderY: To.rig.shoulderY, squash: To.rig.squash, pelvisY: Pv.rig.pelvisY, hipY: Pv.rig.hipY };
    c = { kind: "biped", rig, pins, headScale: CHARS[h.parts.head].headScale || 1.4, phys: {} };
  }
  Object.assign(c, { key: "boss-" + h.key, name: h.name, height: h.height, img, dark, boss: true, color: h.color, blurb: h.blurb, taunt: h.taunt, lasso: !!h.lasso, lassoColor: h.lassoColor || "#ff3a4a" });
  if (h.acc && ACC[h.acc]) {
    const w = img.head.w * (c.headScale || 1) * ACC[h.acc].sw, im = accCanvas(h.acc, h.accColor || "#5ee7ff");
    img.acc = dark.acc = { im, w, h: w * im.height / im.width }; c.accKind = h.acc;
  }
  calibrate(c);
  return noCache ? c : (bosses[h.key] = c);
}
