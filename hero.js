// Hero: a small floating sandstone town in the style of Chants of Sennaar, seen
// from above. Each current project has its own little landmark on the island,
// with a clickable marker that jumps to its card further down the page.
// Uses three.js (loaded from a CDN through the import map in index.html).

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const canvas = document.querySelector("canvas");
const markerLayer = document.querySelector(".map-markers");
const hero = document.querySelector(".hero");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(pointer: fine)").matches;

// Warm, chalky palette: sandstone, whitewash, terracotta and a little teal
const C = {
  sand: 0xecd9b6,
  paving: 0xe2c9a0,
  stone: 0xd6bd96,
  asphalt: 0x9d9087,
  cliff: 0xd9ad7f,
  cliffDark: 0xb8805c,
  rock: 0xa86f52,
  wall: 0xf6eddd,
  wallShade: 0xeadbc1,
  enamel: 0xfffbf3,
  terracotta: 0xcc7650,
  red: 0xb0493a,
  teal: 0x7fb5aa,
  water: 0x8fcac4,
  leaf: 0x94a866,
  cypress: 0x667f57,
  wood: 0x9a6a48,
  gold: 0xe0aa45,
  dark: 0x4a3530,
  cloud: 0xfffaf0,
};

// --- Projects on the island ---
// Each project gets a landmark, a spot on the island, and the id of its card.
// To change what a project looks like, swap its `build` function.
const PROJECTS = [
  { card: "card-procrastination", title: "Why We Procrastinate", at: [-2.0, 2.9, -2.0], build: clockTower },
  { card: "card-assistant-axis", title: "AI Interpretability Lab", at: [-5.4, 0, 3.2], build: assistantAxis },
  { card: "card-alignment", title: "AI Alignment Fellowship", at: [-3.6, 1.4, 0.4], build: readingTemple },
  { card: "card-social-adjacency", title: "The Social Adjacency of LLMs", at: [0.5, 0, 5.0], build: socialCircle },
  { card: "card-selene", title: "Selene Nanorobotics", at: [4.6, 0, 2.8], build: toothMonument },
  { card: "card-triton", title: "Triton AI", at: [5.6, 0, -0.4], build: testTrack },
  { card: "card-audio", title: "Audio-Perception Lab", at: [3.0, 0.9, -5.2], build: soundTower },
];

// Things that move: each is called every frame with the time in seconds
const tickers = [];

// --- Small building blocks ---

const materials = new Map();
function material(color) {
  if (!materials.has(color)) {
    materials.set(color, new THREE.MeshLambertMaterial({ color, flatShading: true }));
  }
  return materials.get(color);
}

function mesh(geometry, color) {
  return new THREE.Mesh(geometry, Array.isArray(color) ? color.map(material) : material(color));
}

// A mesh that glows softly in its own colour
function glow(geometry, color) {
  return new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.7, flatShading: true }));
}

// A see-through mesh whose opacity gets animated (sweeps, sound rings)
function ghost(geometry, color) {
  return new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
  );
}

function at(object, x, y, z) {
  object.position.set(x, y, z);
  return object;
}

function box(w, h, d, color) {
  return mesh(new THREE.BoxGeometry(w, h, d), color);
}

function cylinder(rTop, rBottom, h, sides, color) {
  return mesh(new THREE.CylinderGeometry(rTop, rBottom, h, sides), color);
}

function sphere(r, color) {
  return mesh(new THREE.SphereGeometry(r, 8, 6), color);
}

function dome(r, color) {
  return mesh(new THREE.SphereGeometry(r, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), color);
}

function group(...children) {
  const g = new THREE.Group();
  g.add(...children);
  return g;
}

// An arched opening (door or window): a dark slab with a round top, built to
// sit on a +z face with its bottom at y = 0. Rotate it to use on other faces.
function arch(w, h, color = C.dark) {
  const top = cylinder(w / 2, w / 2, 0.04, 10, color);
  top.rotation.x = Math.PI / 2;
  return group(at(box(w, h - w / 2, 0.04, color), 0, (h - w / 2) / 2, 0), at(top, 0, h - w / 2, 0));
}

// Same as arch(), turned to sit on the +x face
function sideArch(w, h, color) {
  const a = arch(w, h, color);
  a.rotation.y = Math.PI / 2;
  return a;
}

// A flat picture that always faces the camera, drawn on a little canvas
function sprite(draw, size) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  draw(c.getContext("2d"));
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  s.scale.setScalar(size);
  return s;
}

function letter(text) {
  return sprite((ctx) => {
    ctx.font = "italic bold 84px Georgia, serif";
    ctx.fillStyle = "#4a3530";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 64, 64);
  }, 0.3);
}

// A speech bubble with "..." inside
function speechBubble(fill = "#fffaf0") {
  return sprite((ctx) => {
    ctx.fillStyle = fill;
    ctx.strokeStyle = "#4a3530";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(10, 18, 108, 70, 30);
    ctx.moveTo(40, 86);
    ctx.lineTo(34, 116);
    ctx.lineTo(62, 86);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = fill;
    ctx.fillRect(40, 80, 20, 10); // hide the stroke where the tail joins
    ctx.fillStyle = "#4a3530";
    for (const x of [42, 64, 86]) {
      ctx.beginPath();
      ctx.arc(x, 53, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 0.5);
}

// Smooth noise around a circle, so rock edges wobble but still meet at the seam
function edgeNoise(angle, seed) {
  return 0.6 * Math.sin(3 * angle + seed) + 0.4 * Math.sin(5 * angle + seed * 2.3);
}

// Small fixed jitter per vertex position, so shared vertices move together
function hash(x, y, z) {
  const s = Math.sin(Math.round(x * 100) * 12.9898 + Math.round(y * 100) * 78.233 + Math.round(z * 100) * 37.719) * 43758.5453;
  return s - Math.floor(s) - 0.5;
}

// Rough up a round shape: push each vertex in or out with the angle around it
function rockify(geometry, amount, seed, wobble = 0) {
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = 1 + amount * edgeNoise(Math.atan2(v.z, v.x), seed) + wobble * hash(v.x, v.y, v.z);
    pos.setXYZ(i, v.x * k, v.y + wobble * hash(v.z, v.x, v.y), v.z * k);
  }
  geometry.computeVertexNormals();
  return geometry;
}

// A flat-topped rock terrace, from below the ground up to `top`
const terraces = [];
function terrace(x, z, r, top, seed, bottom = -0.6) {
  const geometry = rockify(new THREE.CylinderGeometry(r, r * 0.94, top - bottom, 15, 2), 0.06, seed);
  terraces.push({ x, z, r, seed });
  return at(mesh(geometry, [C.cliff, C.sand, C.cliff]), x, (top + bottom) / 2, z);
}

// Distance from a terrace's centre to its rough edge, in a given direction
function edgeRadius({ r, seed }, angle) {
  return r * (1 + 0.06 * edgeNoise(angle, seed));
}

// A run of solid steps climbing towards local -z
function stairs(steps, rise, run, width, color = C.stone) {
  const g = new THREE.Group();
  for (let i = 0; i < steps; i++) {
    const h = rise * (i + 1);
    g.add(at(box(width, h, run, color), 0, h / 2, -i * run));
  }
  return g;
}

// A flat strip of paving from one point to another
function path(x1, z1, x2, z2, width = 0.55, color = C.paving) {
  const strip = box(width, 0.04, Math.hypot(x2 - x1, z2 - z1) + width, color);
  strip.rotation.y = Math.atan2(x2 - x1, z2 - z1);
  return at(strip, (x1 + x2) / 2, 0.02, (z1 + z2) / 2);
}

function cypress(scale = 1) {
  const tree = mesh(new THREE.OctahedronGeometry(0.28, 0), C.cypress);
  tree.scale.set(1, 3, 1);
  const g = group(at(cylinder(0.05, 0.06, 0.3, 5, C.wood), 0, 0.15, 0), at(tree, 0, 0.95, 0));
  g.scale.setScalar(scale);
  return g;
}

function roundTree(scale = 1) {
  const crown = mesh(new THREE.IcosahedronGeometry(0.42, 0), C.leaf);
  crown.scale.y = 0.85;
  const g = group(at(cylinder(0.06, 0.08, 0.5, 5, C.wood), 0, 0.25, 0), at(crown, 0, 0.75, 0));
  g.scale.setScalar(scale);
  return g;
}

function bush(scale = 1) {
  const b = mesh(new THREE.IcosahedronGeometry(0.22, 0), C.leaf);
  b.scale.set(scale, scale * 0.7, scale);
  b.position.y = 0.1 * scale;
  return b;
}

function banner(color = C.red) {
  const cloth = box(0.02, 0.5, 0.22, color);
  return group(at(cylinder(0.02, 0.02, 1.2, 4, C.wood), 0, 0.6, 0), at(cloth, 0, 0.9, 0.12));
}

// A little robed figure
function person(robe = C.red) {
  return group(at(cylinder(0.06, 0.11, 0.28, 6, robe), 0, 0.14, 0), at(sphere(0.07, C.wall), 0, 0.34, 0));
}

function house(w, h, d, roof = C.wall) {
  return group(
    at(box(w, h, d, C.wall), 0, h / 2, 0),
    at(box(w + 0.08, 0.1, d + 0.08, roof), 0, h + 0.05, 0),
    at(arch(0.22, 0.42), 0, 0, d / 2 + 0.01),
    at(sideArch(0.14, 0.22), w / 2 + 0.01, h * 0.55, 0),
  );
}

// Something that eases in and out over and over: 0 → 1 → 0 across each cycle
function pulse(t) {
  return Math.sin(Math.PI * (((t % 1) + 1) % 1));
}

// --- Project landmarks ---

// Why We Procrastinate: a clock tower crowned with an hourglass, its hands
// turning while time slips away
function clockTower() {
  const g = group(
    at(box(1.4, 1.5, 1.4, C.wall), 0, 0.75, 0),
    at(arch(0.4, 0.8), 0, 0, 0.71),
    at(sideArch(0.4, 0.8), 0.71, 0, 0),
    at(box(1.55, 0.12, 1.55, C.terracotta), 0, 1.56, 0),
    at(cylinder(0.5, 0.58, 1.6, 8, C.wall), 0, 2.42, 0),
    at(cylinder(0.64, 0.64, 0.1, 8, C.red), 0, 3.25, 0),
    at(box(0.95, 0.95, 0.95, C.wallShade), 0, 3.78, 0),
  );
  // Narrow windows around the octagonal drum
  for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const side = group(at(arch(0.12, 0.3), 0, 0, 0.53));
    side.rotation.y = angle;
    g.add(at(side, 0, 2.2, 0));
  }
  const roof = mesh(new THREE.ConeGeometry(0.85, 1.1, 4), C.terracotta);
  roof.rotation.y = Math.PI / 4;
  g.add(at(roof, 0, 4.8, 0));

  // Clock faces on all four sides
  const hands = [];
  for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const face = cylinder(0.32, 0.32, 0.04, 14, C.enamel);
    face.rotation.x = Math.PI / 2;
    const rim = cylinder(0.36, 0.36, 0.03, 14, C.gold);
    rim.rotation.x = Math.PI / 2;
    const clock = group(rim, at(face, 0, 0, 0.01));
    for (const [length, speed] of [[0.26, 0.8], [0.18, 0.07]]) {
      const pivot = at(group(at(box(0.04, length, 0.02, C.dark), 0, length / 2, 0)), 0, 0, 0.04);
      hands.push([pivot, speed]);
      clock.add(pivot);
    }
    const side = group(at(clock, 0, 0, 0.49));
    side.rotation.y = angle;
    g.add(at(side, 0, 3.8, 0));
  }

  // The hourglass on top, turning over every so often
  const glass = new THREE.Group();
  const bulb = (flip) => {
    const cone = mesh(new THREE.ConeGeometry(0.2, 0.28, 8), C.enamel);
    if (flip) cone.rotation.x = Math.PI;
    return cone;
  };
  glass.add(
    at(cylinder(0.24, 0.24, 0.05, 8, C.wood), 0, -0.33, 0),
    at(cylinder(0.24, 0.24, 0.05, 8, C.wood), 0, 0.33, 0),
    at(bulb(false), 0, -0.16, 0),
    at(bulb(true), 0, 0.16, 0),
    at(mesh(new THREE.ConeGeometry(0.13, 0.14, 8), C.gold), 0, -0.23, 0),
  );
  for (const a of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]) {
    glass.add(at(cylinder(0.02, 0.02, 0.62, 4, C.wood), Math.cos(a) * 0.21, 0, Math.sin(a) * 0.21));
  }
  g.add(at(glass, 0, 5.75, 0));

  tickers.push((t) => {
    for (const [pivot, speed] of hands) pivot.rotation.z = -t * speed;
    // Rest for a while, then flip over in one smooth turn
    const cycle = (t / 6) % 1;
    const flip = Math.floor(t / 6) + Math.min(1, Math.max(0, (cycle - 0.85) / 0.15));
    glass.rotation.z = flip * Math.PI;
  });
  return g;
}

// ...and at its foot, someone napping in a hammock beside a pile of unfinished work
function hammock() {
  const cloth = mesh(new THREE.TorusGeometry(0.62, 0.07, 4, 12, Math.PI), C.red);
  cloth.rotation.z = Math.PI;
  cloth.scale.set(1, 0.45, 2.4);
  const sleeper = person(C.teal);
  sleeper.rotation.z = Math.PI / 2;
  const g = group(
    at(roundTree(0.95), -0.78, 0, 0),
    at(roundTree(0.85), 0.78, 0, 0),
    at(cloth, 0, 0.66, 0),
    at(sleeper, 0.18, 0.44, 0),
    // The to-do pile: stacked papers and a crate
    at(box(0.32, 0.26, 0.26, C.wood), 0.55, 0.13, 0.55),
    at(box(0.28, 0.08, 0.22, C.enamel), 0.55, 0.3, 0.55),
    at(box(0.26, 0.08, 0.2, C.wallShade), 0.57, 0.38, 0.53),
    at(box(0.28, 0.08, 0.22, C.enamel), 0.54, 0.46, 0.56),
  );
  const zs = [letter("z"), letter("z"), letter("Z")];
  zs.forEach((z) => g.add(z));
  tickers.push((t) => {
    zs.forEach((z, i) => {
      const p = (t * 0.35 + i / 3) % 1;
      z.position.set(-0.1 + p * 0.35 + Math.sin(p * 6) * 0.06, 0.65 + p * 0.9, 0);
      z.material.opacity = pulse(p);
      z.scale.setScalar(0.18 + p * 0.18);
    });
  });
  return g;
}

// AI Interpretability Lab: an observatory peering down a paved axis lined with
// personas, running from the drifting ones to the Assistant in gold at the far
// end, with a rope across the axis to cap the drift
function assistantAxis() {
  const scope = cylinder(0.08, 0.11, 0.95, 8, C.gold);
  scope.rotation.z = -1.1; // aimed down the axis
  const g = group(
    at(cylinder(0.8, 0.85, 0.9, 12, C.wall), 0, 0.45, 0),
    at(cylinder(0.88, 0.88, 0.08, 12, C.terracotta), 0, 0.94, 0),
    at(dome(0.8, C.teal), 0, 0.98, 0),
    at(scope, 0.55, 1.5, 0),
    at(arch(0.3, 0.6), 0, 0, 0.83),
    at(sideArch(0.3, 0.6), 0.83, 0, 0),
    at(box(3.3, 0.04, 0.5, C.paving), 2.6, 0.02, 0),
  );
  // Tick marks along the axis, like a ruler
  for (let x = 1.1; x < 4.2; x += 0.3) g.add(at(box(0.04, 0.05, 0.5, C.stone), x, 0.03, 0));

  const personas = [C.dark, C.red, C.terracotta, C.teal];
  personas.forEach((robe, i) => {
    const x = 1.3 + i * 0.5;
    g.add(at(cylinder(0.14, 0.16, 0.12, 8, C.stone), x, 0.06, 0), at(person(robe), x, 0.12, 0));
  });
  // The cap: a rope strung between two posts
  g.add(
    at(cylinder(0.04, 0.04, 0.5, 5, C.wood), 3.25, 0.25, 0.32),
    at(cylinder(0.04, 0.04, 0.5, 5, C.wood), 3.25, 0.25, -0.32),
    at(box(0.03, 0.03, 0.64, C.red), 3.25, 0.44, 0),
  );
  // The Assistant: taller, in gold, with a glowing halo
  const halo = glow(new THREE.TorusGeometry(0.12, 0.025, 4, 14), C.gold);
  halo.rotation.x = Math.PI / 2;
  const assistant = person(C.gold);
  assistant.scale.setScalar(1.35);
  g.add(at(cylinder(0.18, 0.2, 0.16, 8, C.enamel), 3.8, 0.08, 0), at(assistant, 3.8, 0.16, 0), at(halo, 3.8, 0.75, 0));
  tickers.push((t) => {
    halo.position.y = 0.75 + Math.sin(t * 2) * 0.04;
  });
  return g;
}

// AI Alignment Fellowship: a round reading temple with eight columns, one for
// each week, where a speaker at a lectern talks to a small circle of fellows
function readingTemple() {
  const g = group(
    at(cylinder(0.98, 1.04, 0.18, 16, C.stone), 0, 0.09, 0),
    at(cylinder(0.86, 0.86, 0.04, 16, C.wallShade), 0, 0.2, 0),
    at(cylinder(0.94, 0.94, 0.14, 16, C.terracotta), 0, 1.29, 0),
    at(dome(0.7, C.teal), 0, 1.36, 0),
    at(sphere(0.07, C.gold), 0, 2.1, 0),
    at(box(0.22, 0.34, 0.14, C.wood), 0, 0.39, -0.25),
    at(person(C.gold), 0, 0.22, -0.48),
    at(banner(C.teal), 0.95, 0, 0.6),
  );
  const book = box(0.2, 0.03, 0.15, C.red);
  book.rotation.x = 0.4;
  g.add(at(book, 0, 0.58, -0.22));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    g.add(at(cylinder(0.065, 0.08, 1.0, 6, C.wall), Math.cos(a) * 0.74, 0.72, Math.sin(a) * 0.74));
  }
  for (const [x, z, robe] of [[-0.3, 0.15, C.red], [0.3, 0.15, C.teal], [0, 0.35, C.wall]]) {
    const fellow = person(robe);
    fellow.scale.setScalar(0.8);
    g.add(at(fellow, x, 0.22, z));
  }
  // Reading lists stacked by the steps
  for (const [x, z] of [[-0.95, 0.55], [-1.05, 0.25]]) {
    [C.red, C.teal, C.gold, C.enamel].forEach((color, i) => {
      const b = box(0.24, 0.06, 0.18, color);
      b.rotation.y = i * 0.3;
      g.add(at(b, x, 0.03 + i * 0.06, z));
    });
  }
  return g;
}

// The Social Adjacency of LLMs: villagers sitting in a circle with a small
// glowing AI among them, speech bubbles passing back and forth
function socialCircle() {
  const g = group(
    at(cylinder(1.25, 1.25, 0.04, 14, C.paving), 0, 0.02, 0),
    at(cylinder(0.25, 0.28, 0.12, 8, C.stone), 0, 0.06, 0),
    at(glow(new THREE.OctahedronGeometry(0.12, 0), C.gold), 0, 0.3, 0),
    at(house(0.9, 0.8, 0.8, C.terracotta), -1.75, 0, -0.6),
    at(house(0.8, 1.2, 0.8), 1.75, 0, -0.7),
    at(house(0.9, 0.7, 0.8, C.wallShade), -1.3, 0, 1.45),
    at(house(0.7, 0.9, 0.7, C.terracotta), 1.35, 0, 1.4),
    at(dome(0.25, C.teal), 1.75, 1.3, -0.7),
  );
  const seats = 6;
  const speakers = [];
  for (let i = 0; i < seats; i++) {
    const a = (i / seats) * Math.PI * 2;
    const x = Math.cos(a) * 0.8;
    const z = Math.sin(a) * 0.8;
    g.add(at(box(0.26, 0.08, 0.2, C.wood), x, 0.04, z).rotateY(-a));
    let figure;
    if (i === 1) {
      // The language model: a whitewashed pillar with a glowing teal head
      figure = group(at(cylinder(0.07, 0.1, 0.3, 6, C.enamel), 0, 0.15, 0), at(glow(new THREE.IcosahedronGeometry(0.09, 0), C.teal), 0, 0.38, 0));
    } else {
      figure = person([C.red, null, C.gold, C.teal, C.wall, C.terracotta][i]);
    }
    g.add(at(figure, x, 0.08, z));
    speakers.push([x, z]);
  }
  // Bubbles take turns: the AI answers every other line
  const bubbles = [0, 1, 3, 1, 4, 1].map((seat, turn) => {
    const bubble = speechBubble(seat === 1 ? "#cfe7e1" : "#fffaf0");
    bubble.userData = { seat, turn };
    g.add(bubble);
    return bubble;
  });
  tickers.push((t) => {
    for (const bubble of bubbles) {
      const { seat, turn } = bubble.userData;
      const p = (t / 1.6 - turn) / bubbles.length; // each line gets 1.6 s
      const local = ((p % 1) + 1) % 1;
      const shown = local < 1 / bubbles.length ? pulse(local * bubbles.length) : 0;
      const [x, z] = speakers[seat];
      bubble.position.set(x, 0.75 + shown * 0.15, z);
      bubble.material.opacity = Math.min(1, shown * 2.5);
    }
  });
  return g;
}

// Selene Nanorobotics: a monument to a molar, with a tiny gold microrobot
// spiralling around inside its root, steered by a big horseshoe magnet and
// watched by sensors at each corner of the plinth
function toothMonument() {
  const g = group(
    at(box(1.7, 0.3, 1.7, C.stone), 0, 0.15, 0),
    at(box(1.5, 0.06, 1.5, C.wallShade), 0, 0.33, 0),
    at(cylinder(0.58, 0.48, 0.7, 10, C.enamel), 0, 1.8, 0),
  );
  for (const x of [-0.24, 0.24]) {
    const root = mesh(new THREE.CylinderGeometry(0.2, 0.08, 1.15, 8), C.enamel);
    root.rotation.z = x * 0.6;
    g.add(at(root, x * 1.1, 0.92, 0));
  }
  for (const [x, z] of [[0.24, 0.24], [-0.24, 0.24], [0.24, -0.24], [-0.24, -0.24]]) {
    const cusp = sphere(0.24, C.enamel);
    cusp.scale.y = 0.7;
    g.add(at(cusp, x, 2.17, z));
  }
  // Sensors on the plinth corners, each with a glowing eye
  for (const [x, z] of [[0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]]) {
    g.add(at(box(0.16, 0.22, 0.16, C.dark), x, 0.47, z), at(glow(new THREE.OctahedronGeometry(0.06, 0), C.teal), x, 0.65, z));
  }
  // The horseshoe magnet, red with white poles, rocking gently
  const magnet = group(
    mesh(new THREE.TorusGeometry(0.32, 0.09, 6, 12, Math.PI), C.red),
    at(box(0.18, 0.2, 0.18, C.enamel), 0.32, -0.1, 0),
    at(box(0.18, 0.2, 0.18, C.enamel), -0.32, -0.1, 0),
  );
  magnet.rotation.z = -Math.PI / 2; // poles pointing at the tooth
  g.add(at(cylinder(0.04, 0.05, 1.1, 5, C.wood), 1.3, 0.55, 0), at(magnet, 1.3, 1.25, 0));

  // The microrobot, climbing a spiral around one root and back down
  const robot = glow(new THREE.SphereGeometry(0.08, 8, 6), C.gold);
  g.add(robot);
  tickers.push((t) => {
    const p = pulse(t * 0.12);
    const a = t * 3;
    robot.position.set(0.26 + Math.cos(a) * 0.3, 0.45 + p * 0.95, Math.sin(a) * 0.3);
    magnet.rotation.x = Math.sin(t * 0.8) * 0.25;
  });
  return g;
}

// Triton AI: an autonomous car lapping a little test track, its LiDAR spinning
// and sending sweep rings out across the ground
function testTrack() {
  const a = 1.25; // track radius across x
  const b = 1.9; // track radius across z
  const g = new THREE.Group();
  const segments = 36;
  for (let i = 0; i < segments; i++) {
    const t0 = (i / segments) * Math.PI * 2;
    const t1 = ((i + 1) / segments) * Math.PI * 2;
    const [x0, z0, x1, z1] = [a * Math.cos(t0), b * Math.sin(t0), a * Math.cos(t1), b * Math.sin(t1)];
    const length = Math.hypot(x1 - x0, z1 - z0);
    const angle = Math.atan2(x1 - x0, z1 - z0);
    const road = at(box(0.5, 0.05, length + 0.03, C.asphalt), (x0 + x1) / 2, 0.025, (z0 + z1) / 2);
    road.rotation.y = angle;
    g.add(road);
    if (i % 2 === 0) {
      const dash = at(box(0.05, 0.02, length * 0.6, C.enamel), (x0 + x1) / 2, 0.055, (z0 + z1) / 2);
      dash.rotation.y = angle;
      g.add(dash);
    }
  }
  // The team's garage in the infield, with traffic cones out front
  g.add(
    at(box(0.9, 0.55, 0.7, C.wall), 0, 0.28, -0.5),
    at(box(0.98, 0.08, 0.78, C.teal), 0, 0.6, -0.5),
    at(box(0.55, 0.38, 0.04, C.dark), 0, 0.19, -0.14),
    at(banner(C.gold), 0.45, 0, 0.6),
  );
  for (const [x, z] of [[-0.3, 0.35], [0, 0.55], [0.3, 0.35]]) {
    g.add(at(mesh(new THREE.ConeGeometry(0.07, 0.2, 6), C.terracotta), x, 0.1, z));
  }

  // The car: body, cabin, wheels, cameras front and back, and a LiDAR puck
  const lidar = group(at(cylinder(0.07, 0.08, 0.09, 10, C.dark), 0, 0, 0), at(box(0.04, 0.03, 0.02, C.teal), 0, 0, 0.075));
  const car = group(
    at(box(0.34, 0.14, 0.62, C.enamel), 0, 0.14, 0),
    at(box(0.3, 0.14, 0.32, C.teal), 0, 0.28, -0.03),
    at(box(0.12, 0.05, 0.03, C.dark), 0, 0.22, 0.32),
    at(box(0.12, 0.05, 0.03, C.dark), 0, 0.22, -0.32),
    at(lidar, 0, 0.4, -0.03),
  );
  for (const [x, z] of [[0.17, 0.2], [-0.17, 0.2], [0.17, -0.2], [-0.17, -0.2]]) {
    const wheel = cylinder(0.08, 0.08, 0.06, 8, C.dark);
    wheel.rotation.z = Math.PI / 2;
    car.add(at(wheel, x, 0.08, z));
  }
  g.add(car);

  // LiDAR sweeps: rings that spread out from the car and fade
  const sweeps = [0, 0.5].map((offset) => {
    const ring = ghost(new THREE.RingGeometry(0.92, 1, 40), C.teal);
    ring.rotation.x = -Math.PI / 2;
    ring.userData.offset = offset;
    g.add(ring);
    return ring;
  });

  tickers.push((t) => {
    const theta = t * 0.4;
    car.position.set(a * Math.cos(theta), 0.05, b * Math.sin(theta));
    car.rotation.y = Math.atan2(-a * Math.sin(theta), b * Math.cos(theta));
    lidar.rotation.y = t * 8;
    for (const ring of sweeps) {
      const p = (t * 0.7 + ring.userData.offset) % 1;
      ring.position.set(car.position.x, 0.08, car.position.z);
      ring.scale.setScalar(0.2 + p * 1.6);
      ring.material.opacity = 0.55 * (1 - p);
    }
  });
  return g;
}

// Audio-Perception Lab: a bell tower ringing out sound waves, beside a little
// spectrogram whose bars dance to the sound
function soundTower() {
  const g = group(
    at(box(0.8, 1.6, 0.8, C.wall), 0, 0.8, 0),
    at(arch(0.26, 0.5), 0, 0, 0.41),
    at(sideArch(0.16, 0.3), 0.41, 1.0, 0),
    at(box(0.9, 0.1, 0.9, C.terracotta), 0, 1.65, 0),
    at(box(0.9, 0.1, 0.9, C.terracotta), 0, 2.35, 0),
  );
  for (const [x, z] of [[0.36, 0.36], [-0.36, 0.36], [0.36, -0.36], [-0.36, -0.36]]) {
    g.add(at(box(0.12, 0.6, 0.12, C.wall), x, 2.0, z));
  }
  const bell = group(at(cylinder(0.12, 0.2, 0.28, 8, C.gold), 0, -0.2, 0), at(sphere(0.05, C.dark), 0, -0.36, 0));
  g.add(at(bell, 0, 2.28, 0));
  const roof = mesh(new THREE.ConeGeometry(0.66, 0.8, 4), C.terracotta);
  roof.rotation.y = Math.PI / 4;
  g.add(at(roof, 0, 2.8, 0));

  // Sound waves rolling out from the belfry
  const waves = [0, 1 / 3, 2 / 3].map((offset) => {
    const ring = ghost(new THREE.TorusGeometry(1, 0.025, 4, 40), C.gold);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 2.05;
    ring.userData.offset = offset;
    g.add(ring);
    return ring;
  });

  // The spectrogram: a stand of bars, teal fading to gold
  const bars = [];
  g.add(at(box(1.35, 0.1, 0.36, C.stone), 0.1, 0.05, 0.95));
  for (let i = 0; i < 8; i++) {
    const bar = box(0.12, 1, 0.12, new THREE.Color(C.teal).lerp(new THREE.Color(C.gold), i / 7).getHex());
    bars.push(bar);
    g.add(at(bar, -0.45 + i * 0.16, 0, 0.95));
  }

  tickers.push((t) => {
    bell.rotation.z = Math.sin(t * 2.4) * 0.3;
    for (const ring of waves) {
      const p = (t * 0.45 + ring.userData.offset) % 1;
      ring.scale.setScalar(0.4 + p * 2.4);
      ring.material.opacity = 0.7 * (1 - p);
    }
    bars.forEach((bar, i) => {
      const h = 0.12 + 0.5 * Math.abs(Math.sin(t * 2.2 + i * 0.9) * Math.cos(t * 1.3 + i * 0.4));
      bar.scale.y = h;
      bar.position.y = 0.1 + h / 2;
    });
  });
  return g;
}

// --- Assemble the island ---

const island = new THREE.Group();

island.add(terrace(0, 0, 8, 0, 1, -1.2));
island.add(terrace(-1.4, -1.4, 4.2, 1.4, 2));
island.add(terrace(-2.0, -2.0, 1.9, 2.9, 3));
island.add(terrace(3.0, -5.2, 1.8, 0.9, 4));

// The rocky underside, hanging below the base like a floating island
const underside = mesh(rockify(new THREE.ConeGeometry(7.6, 5.6, 15, 3), 0.08, 1, 0.3), C.rock);
underside.rotation.x = Math.PI;
island.add(at(underside, 0, -1.1 - 2.8, 0));
for (const [x, z, r] of [[-4.3, 3.0, 1.4], [3.0, -4.0, 1.2]]) {
  const rock = mesh(rockify(new THREE.ConeGeometry(r, r * 2.4, 7, 2), 0.1, x, 0.15), C.cliffDark);
  rock.rotation.x = Math.PI;
  island.add(at(rock, x, -2.2 - r * 1.2, z));
}

// Stairs: base up to the middle terrace, middle up to the clock tower, and up to the bell tower
const lowerStairs = stairs(7, 0.2, 0.32, 0.9);
lowerStairs.rotation.y = Math.PI / 2;
island.add(at(lowerStairs, 3.6, 0, -0.6));
island.add(at(stairs(7, 1.5 / 7, 0.28, 0.8), -2.0, 1.4, 1.4));
island.add(at(stairs(4, 0.225, 0.3, 0.7), 3.0, 0, -2.6));

// Paths across the base
for (const [x1, z1, x2, z2] of [[3.9, -0.6, 2.4, 1.6], [2.4, 1.6, 3.7, 2.5], [2.4, 1.6, 1.1, 3.6], [3.0, -2.5, 3.5, -1.1], [-1.4, 3.2, -0.6, 4.1]]) {
  island.add(path(x1, z1, x2, z2));
}

// A spring by the village, spilling over the island's edge as a waterfall
const SPRING = [3.0, 5.6];
{
  const [px, pz] = SPRING;
  island.add(at(cylinder(0.8, 0.85, 0.2, 11, C.stone), px, 0.1, pz), at(cylinder(0.66, 0.66, 0.02, 11, C.water), px, 0.2, pz));
  const angle = Math.atan2(pz, px);
  const start = Math.hypot(px, pz) + 0.7;
  const edge = edgeRadius(terraces[0], angle);
  const length = edge - start + 0.1;
  const canal = group(at(box(0.6, 0.1, length, C.stone), 0, 0.05, 0), at(box(0.4, 0.04, length + 0.02, C.water), 0, 0.1, 0));
  canal.rotation.y = Math.PI / 2 - angle;
  island.add(at(canal, Math.cos(angle) * (start + length / 2), 0, Math.sin(angle) * (start + length / 2)));
  const fallMaterial = new THREE.MeshLambertMaterial({ color: C.water, transparent: true, opacity: 0.85 });
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 3.8), fallMaterial);
  fall.rotation.y = Math.PI / 2 - angle;
  island.add(at(fall, Math.cos(angle) * (edge + 0.08), -1.8, Math.sin(angle) * (edge + 0.08)));
}

// The napping spot belongs to the procrastination project, down by the tower's stairs
island.add(at(hammock(), -0.6, 1.4, 1.4));

// Trees and greenery: [x, z, scale, ground height]
for (const [x, z, s, y] of [[6.6, 2.2, 1, 0], [-6.5, 0.5, 1.1, 0], [-6.0, -2.5, 1, 0], [-3.0, -6.4, 1.1, 0], [0.2, -6.8, 1, 0], [2.0, 2.4, 0.8, 0], [-4.4, -2.2, 0.9, 1.4], [0.4, -3.6, 1, 1.4], [6.9, -2.6, 0.9, 0]]) {
  island.add(at(cypress(s), x, y, z));
}
for (const [x, z, s, y] of [[2.4, 6.6, 1, 0], [-3.4, 5.6, 1, 0], [-4.8, -4.6, 1.1, 0], [6.2, -3.6, 0.8, 0], [0.6, -1.8, 0.9, 1.4], [-1.0, -3.9, 0.8, 1.4], [-6.6, -0.9, 0.8, 0], [4.8, 5.0, 0.8, 0]]) {
  island.add(at(roundTree(s), x, y, z));
}
for (const [x, z, s] of [[4.0, 4.4, 1], [1.8, 1.0, 0.8], [-2.4, 4.6, 1], [7.0, 0.8, 0.9], [-5.2, -3.4, 1], [1.6, -5.6, 0.8], [-4.8, 4.8, 0.9], [-6.9, 2.6, 0.8], [5.4, 4.4, 0.7]]) {
  island.add(at(bush(s), x, 0, z));
}
island.add(at(banner(C.teal), 3.9, 0, 0.0), at(banner(), 3.9, 0, -1.2));
island.add(at(person(C.teal), 2.6, 0.04, 1.2), at(person(C.wall), -1.2, 1.44, 2.2));

// The projects themselves, each remembering where its marker floats
const v = new THREE.Vector3();
for (const project of PROJECTS) {
  const landmark = project.build();
  landmark.position.set(...project.at);
  island.add(landmark);
  landmark.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(landmark);
  project.anchor = new THREE.Vector3(project.at[0], bounds.max.y + 0.45, project.at[2]);
}

island.traverse((object) => {
  if (object.isMesh && !object.material.transparent) {
    object.castShadow = true;
    object.receiveShadow = true;
  }
});

// Clouds drifting around and below the island
const clouds = [];
for (const [x, y, z, s] of [[-10, -3.5, 4.5, 1.4], [8.5, -4, -6, 1.2], [3.5, -6, 10.5, 1.3], [-7.8, 5, -7.8, 1], [9.5, 3.5, 5.5, 0.9]]) {
  const cloud = new THREE.Group();
  for (const [cx, cy, cr] of [[0, 0, 0.9], [0.9, -0.1, 0.65], [-0.85, -0.15, 0.6], [0.3, 0.35, 0.55]]) {
    const puff = mesh(new THREE.IcosahedronGeometry(cr, 0), C.cloud);
    puff.scale.y = 0.7;
    cloud.add(at(puff, cx, cy, 0));
  }
  cloud.scale.setScalar(s);
  cloud.userData = { radius: Math.hypot(x, z), angle: Math.atan2(z, x), y };
  clouds.push(cloud);
}

// --- Scene, lights and camera ---

const scene = new THREE.Scene();
scene.add(island, ...clouds);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const TARGET = new THREE.Vector3(0, 1.5, 0);
const camera = new THREE.OrthographicCamera();
camera.position.copy(TARGET).add(new THREE.Vector3().setFromSphericalCoords(50, 0.95, Math.PI / 4));

const controls = new OrbitControls(camera, canvas);
controls.target.copy(TARGET);
Object.assign(controls, {
  enabled: finePointer, // on touch screens, let drags scroll the page instead
  enableZoom: false,
  enablePan: false,
  enableDamping: true,
  autoRotate: !reducedMotion,
  autoRotateSpeed: 0.3,
  minPolarAngle: 0.6,
  maxPolarAngle: 1.15,
});
if (!finePointer) canvas.style.touchAction = "auto";
controls.update();

// --- Sky: a sun by day, a moon by night ---
// Light mode is day and dark mode is night. When the theme changes, the sun
// climbs up out of view while the moon rises from behind the island, and the
// light cools and dims. Each is a directional light that casts shadows from
// where its disc sits on screen, so the shadows follow it.

const ambient = new THREE.HemisphereLight(0xfff4e2, 0xc99f7c, 1.9);
const DAY = { sky: new THREE.Color(0xfff4e2), ground: new THREE.Color(0xc99f7c), intensity: 1.9 };
const NIGHT = { sky: new THREE.Color(0x7385bd), ground: new THREE.Color(0x3a3352), intensity: 0.8 };

function shadowLight(color) {
  const light = new THREE.DirectionalLight(color, 0);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  Object.assign(light.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 60 });
  light.shadow.bias = -0.0005;
  light.shadow.normalBias = 0.02;
  light.target.position.copy(TARGET);
  scene.add(light, light.target);
  return light;
}

const sunLight = shadowLight(0xfff0d8);
const moonLight = shadowLight(0xc4d2ff);

const sunDisc = sprite((ctx) => {
  const halo = ctx.createRadialGradient(64, 64, 20, 64, 64, 64);
  halo.addColorStop(0, "rgb(255 214 130 / 75%)");
  halo.addColorStop(1, "rgb(255 214 130 / 0%)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = "#ffd27a";
  ctx.beginPath();
  ctx.arc(64, 64, 26, 0, Math.PI * 2);
  ctx.fill();
}, 4.5);

const moonDisc = sprite((ctx) => {
  const halo = ctx.createRadialGradient(64, 64, 20, 64, 64, 64);
  halo.addColorStop(0, "rgb(214 224 255 / 45%)");
  halo.addColorStop(1, "rgb(214 224 255 / 0%)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = "#f1ecdf";
  ctx.beginPath();
  ctx.arc(64, 64, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d9d2c1"; // craters
  for (const [x, y, r] of [[56, 56, 6], [72, 68, 4], [60, 76, 3], [74, 52, 3]]) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}, 4);

scene.add(ambient, sunDisc, moonDisc);

// Where each body sits, in island-sized units from the island's centre on
// screen (right, up), at day (0) and night (1)
const SUN_UP = [7.5, 17]; // shining over the island, then up past the top edge
const MOON_UP = [-15, 7]; // hidden behind the island, then risen over it
const SKY_RIGHT = 5.5;
const TRANSITION_SECONDS = 3;

const darkScheme = matchMedia("(prefers-color-scheme: dark)");
function isNight() {
  const scheme = document.documentElement.style.getPropertyValue("color-scheme");
  return scheme === "dark" || (scheme !== "light" && darkScheme.matches);
}

let night = isNight() ? 1 : 0;
let nightTarget = night;

const smooth = (x) => {
  x = Math.min(Math.max(x, 0), 1);
  return x * x * (3 - 2 * x);
};
const lerp = (a, b, t) => a + (b - a) * t;

const right = new THREE.Vector3();
const up = new THREE.Vector3();
const back = new THREE.Vector3();
function placeBody(disc, light, height, intensity) {
  // The disc sits far behind the island so the island can hide it
  disc.position.copy(TARGET).addScaledVector(right, SKY_RIGHT).addScaledVector(up, height).addScaledVector(back, -30);
  // The light shines from the same spot on screen, but from in front of the
  // island and never from below it, so the visible faces stay lit
  light.position
    .set(0, 0, 0)
    .addScaledVector(right, SKY_RIGHT)
    .addScaledVector(up, Math.max(height, 3))
    .addScaledVector(back, 8)
    .setLength(25)
    .add(TARGET);
  light.intensity = intensity;
}

function placeSky() {
  camera.updateMatrixWorld();
  camera.matrixWorld.extractBasis(right, up, back);
  const sunT = smooth(night / 0.6); // the sun leaves first...
  const moonT = smooth((night - 0.4) / 0.6); // ...and the moon follows
  placeBody(sunDisc, sunLight, lerp(SUN_UP[0], SUN_UP[1], sunT), 2.4 * (1 - sunT));
  placeBody(moonDisc, moonLight, lerp(MOON_UP[0], MOON_UP[1], moonT), 1.1 * moonT);
  const t = smooth(night);
  ambient.color.lerpColors(DAY.sky, NIGHT.sky, t);
  ambient.groundColor.lerpColors(DAY.ground, NIGHT.ground, t);
  ambient.intensity = lerp(DAY.intensity, NIGHT.intensity, t);
}

function stepSky(dt) {
  if (night === nightTarget) return;
  const step = dt / TRANSITION_SECONDS;
  night = nightTarget > night ? Math.min(night + step, nightTarget) : Math.max(night - step, nightTarget);
}

// Follow the theme switcher (it sets color-scheme on <html>) and the OS setting
function onThemeChange() {
  nightTarget = isNight() ? 1 : 0;
  if (!running) {
    night = nightTarget; // nothing is animating, so jump straight there
    render();
  }
}
new MutationObserver(onThemeChange).observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
darkScheme.addEventListener("change", onThemeChange);

// Frame the island: the right half on wide windows (clear of the text),
// centred under the text on narrow ones
let width = 0;
let height = 0;
function resize() {
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  const wide = width >= 720;
  // How many pixels the island gets across its widest (about 17.5 units, rough edges included)
  const islandPixels = wide ? Math.min(width * 0.53, height * 1.0) : Math.min(width * 0.95, height * 0.46);
  const viewHeight = (height / islandPixels) * 17.5;
  const viewWidth = viewHeight * (width / height);
  const [fx, fy] = wide ? [0.73, 0.55] : [0.5, 0.77]; // where the island's centre sits on screen
  Object.assign(camera, {
    left: -fx * viewWidth,
    right: (1 - fx) * viewWidth,
    top: fy * viewHeight,
    bottom: -(1 - fy) * viewHeight,
    near: 0.1,
    far: 200,
  });
  camera.updateProjectionMatrix();
  render();
}

// --- Markers: an HTML link per project, kept over its spot on the island ---

const markers = PROJECTS.map((project) => {
  const link = document.createElement("a");
  link.className = "marker";
  link.href = `#${project.card}`;
  link.innerHTML = `<span class="label">${project.title}</span>`;
  link.addEventListener("pointerenter", () => (controls.autoRotate = false));
  link.addEventListener("pointerleave", () => (controls.autoRotate = !reducedMotion));
  markerLayer.append(link);
  return { project, link };
});

function placeMarkers() {
  for (const { project, link } of markers) {
    v.copy(project.anchor).applyMatrix4(island.matrixWorld).project(camera);
    const x = ((v.x + 1) / 2) * width;
    const y = ((1 - v.y) / 2) * height;
    link.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }
}

function render() {
  if (!width) return;
  island.updateMatrixWorld();
  placeSky();
  renderer.render(scene, camera);
  placeMarkers();
}

// --- Animation ---

const clock = new THREE.Clock();
function animate(t) {
  island.position.y = Math.sin(t * 0.6) * 0.12;
  for (const tick of tickers) tick(t);
  for (const cloud of clouds) {
    const { radius, angle, y } = cloud.userData;
    const a = angle + t * 0.02;
    cloud.position.set(Math.cos(a) * radius, y + Math.sin(t * 0.4 + angle) * 0.2, Math.sin(a) * radius);
  }
}

let running = false;
let lastTime = 0;
function frame() {
  if (!running) return;
  const t = clock.getElapsedTime();
  stepSky(Math.min(t - lastTime, 0.1));
  lastTime = t;
  animate(t);
  controls.update();
  render();
  requestAnimationFrame(frame);
}

// Only animate while the hero is on screen
new IntersectionObserver(([entry]) => {
  if (reducedMotion) return;
  const wasRunning = running;
  running = entry.isIntersecting;
  if (running && !wasRunning) requestAnimationFrame(frame);
}).observe(hero);

if (reducedMotion) {
  animate(2);
  controls.addEventListener("change", render);
}

new ResizeObserver(resize).observe(canvas);
