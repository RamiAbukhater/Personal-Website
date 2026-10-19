// Draws the project-card illustrations on the Projects page as static SVGs:
// each project is a little floating sandstone island with a landmark on top,
// in the same low-poly, flat-shaded Chants of Sennaar style as the home page
// hero (same palette as hero.js). The site itself has no build step; this is
// only an authoring tool. After changing a scene, regenerate every SVG with
//
//   node projects/art/build-art.mjs
//
// and commit the files it writes to images/projects/islands/.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("../../images/projects/islands/", import.meta.url));

// Warm, chalky palette, copied from hero.js
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

// --- Vector maths ---

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => mul(a, 1 / Math.hypot(...a));
const centroid = (pts) => mul(pts.reduce(add, [0, 0, 0]), 1 / pts.length);

// --- Camera and light ---
// An orthographic view from above and in front (x runs to the lower right,
// y to the lower left, z up), lit from the upper left like the hero's sun.

const VIEW = norm([1, 1, 0.95]); // towards the viewer
const RIGHT = norm(cross(VIEW, [0, 0, 1]));
const UP = norm(cross(RIGHT, VIEW));
const LIGHT = norm([-0.3, 0.9, 1.25]);

const project = (p) => [dot(p, RIGHT), -dot(p, UP)];
const depth = (p) => dot(p, VIEW);

// --- Colour ---

const rgb = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
const css = ([r, g, b]) =>
  "#" + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
const SHADOW = rgb(0x6b4a52); // shaded faces lean towards a warm violet, like the hero's ground light

// Flat Lambert-style shading with a soft wrap, so no face goes fully dark
function shade(hex, normal) {
  const w = Math.min(1, Math.max(0, (dot(normal, LIGHT) + 0.45) / 1.45));
  const f = 0.74 + 0.28 * w;
  const lit = rgb(hex).map((v) => v * f);
  const t = (1 - w) * 0.22;
  return css(lit.map((v, i) => v + (SHADOW[i] - v) * t));
}

// --- Seeded randomness, so every build draws the same islands ---

function random(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Scene: a list of things to draw, painted back to front ---

class Scene {
  constructor() {
    this.items = [];
  }

  // A convex solid from its faces. Normals are pointed away from the solid's
  // centre, so face winding does not matter; faces facing away are skipped.
  solid(faces, color, { top = color, glow = false, key = 0, opacity = 1, sides = color } = {}) {
    const middle = centroid(faces.flat());
    const shapes = [];
    for (const pts of faces) {
      let n = norm(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])));
      if (dot(n, sub(centroid(pts), middle)) < 0) n = mul(n, -1);
      if (dot(n, VIEW) <= 0.001) continue;
      const base = n[2] > 0.7 ? top : sides;
      shapes.push({ pts, fill: glow ? css(rgb(base)) : shade(base, n), opacity, d: depth(centroid(pts)) });
    }
    shapes.sort((a, b) => a.d - b.d);
    this.items.push({ key: depth(middle) + key, shapes });
    return this;
  }

  box(x, y, z, w, d, h, color, opts) {
    const [x0, x1, y0, y1, z0, z1] = [x - w / 2, x + w / 2, y - d / 2, y + d / 2, z, z + h];
    const P = (a, b, c) => [a, b, c];
    return this.solid(
      [
        [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)],
        [P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)],
        [P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)],
        [P(x0, y0, z0), P(x0, y1, z0), P(x0, y1, z1), P(x0, y0, z1)],
        [P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1)],
      ],
      color,
      opts,
    );
  }

  // A faceted cylinder, frustum or (with rTop 0) cone standing at x, y, z
  prism(x, y, z, r, h, color, { sides = 8, rTop = r, rot = 0, sx = 1, sy = 1, ...opts } = {}) {
    const ring = (rad, zz) =>
      Array.from({ length: sides }, (_, i) => {
        const a = rot + (i / sides) * Math.PI * 2;
        return [x + Math.cos(a) * rad * sx, y + Math.sin(a) * rad * sy, zz];
      });
    const lo = ring(r, z);
    const faces = [];
    if (rTop === 0) {
      const apex = [x, y, z + h];
      for (let i = 0; i < sides; i++) faces.push([lo[i], lo[(i + 1) % sides], apex]);
    } else {
      const hi = ring(rTop, z + h);
      for (let i = 0; i < sides; i++) faces.push([lo[i], lo[(i + 1) % sides], hi[(i + 1) % sides], hi[i]]);
      faces.push(hi);
    }
    faces.push(lo);
    return this.solid(faces, color, opts);
  }

  // A low-poly ball centred at x, y, z
  ball(x, y, z, r, color, { seg = 7, rings = 4, sz = 1, ...opts } = {}) {
    const pt = (i, j) => {
      const a = (i / seg) * Math.PI * 2;
      const b = (j / rings) * Math.PI - Math.PI / 2;
      return [x + Math.cos(a) * Math.cos(b) * r, y + Math.sin(a) * Math.cos(b) * r, z + Math.sin(b) * r * sz];
    };
    const faces = [];
    for (let j = 0; j < rings; j++) {
      for (let i = 0; i < seg; i++) {
        const quad = [pt(i, j), pt(i + 1, j), pt(i + 1, j + 1), pt(i, j + 1)];
        faces.push(j === 0 ? [quad[0], quad[2], quad[3]] : j === rings - 1 ? quad.slice(0, 3) : quad);
      }
    }
    return this.solid(faces, color, opts);
  }

  // A square bar from p0 to p1 (arms, poles, table legs)
  beam(p0, p1, w, color, opts) {
    const d = norm(sub(p1, p0));
    const a = norm(Math.abs(d[2]) > 0.95 ? cross(d, [1, 0, 0]) : cross(d, [0, 0, 1]));
    const b = norm(cross(a, d));
    const corner = (p, sa, sb) => add(p, add(mul(a, (sa * w) / 2), mul(b, (sb * w) / 2)));
    const ends = [p0, p1].map((p) => [corner(p, -1, -1), corner(p, 1, -1), corner(p, 1, 1), corner(p, -1, 1)]);
    const faces = [ends[0], ends[1]];
    for (let i = 0; i < 4; i++) faces.push([ends[0][i], ends[0][(i + 1) % 4], ends[1][(i + 1) % 4], ends[1][i]]);
    return this.solid(faces, color, opts);
  }

  // A flat shape lying on (or just above) the ground: paths, water, paint
  decal(pts2, color, { z = 0.002, key = -900, opacity = 1 } = {}) {
    this.items.push({ key, shapes: [{ pts: pts2.map(([x, y]) => [x, y, z]), fill: css(rgb(color)), opacity }] });
    return this;
  }

  // Any flat polygon in space, drawn unshaded (clock faces, signs, windows)
  flat(pts, color, { key = 0.02, opacity = 1 } = {}) {
    this.items.push({ key: depth(centroid(pts)) + key, shapes: [{ pts, fill: css(rgb(color)), opacity }] });
    return this;
  }

  // A line through space (wireframes, sensor rings, paths of motion)
  line(pts, color, { width = 1.6, dash = null, opacity = 1, key = null, close = false } = {}) {
    this.items.push({
      key: key ?? depth(centroid(pts)),
      shapes: [{ pts, stroke: css(rgb(color)), width, dash, opacity, close }],
    });
    return this;
  }

  ring(x, y, z, r, color, opts = {}) {
    return this.line(circle(x, y, r, 28).map(([a, b]) => [a, b, z]), color, { close: true, ...opts });
  }

  // A soft round glow, drawn flat to the screen
  halo(x, y, z, r, color, { key = 0.5 } = {}) {
    this.items.push({ key: depth([x, y, z]) + key, shapes: [{ halo: true, at: [x, y, z], r, color: css(rgb(color)) }] });
    return this;
  }

  // A speech bubble flat to the screen, its tail pointing down-left or down-right
  bubble(x, y, z, { flip = false, color = C.gold, key = 5 } = {}) {
    this.items.push({ key: depth([x, y, z]) + key, shapes: [{ bubble: true, at: [x, y, z], flip, color: css(rgb(color)) }] });
    return this;
  }

  // The floating island everything stands on: a sandy top over faceted cliffs
  // that narrow to a point, like the hero's island
  island({ rx = 3.2, ry = 3, seed = 1, sides = 11 } = {}) {
    const rnd = random(seed);
    const bands = [
      { s: 1, z: 0 },
      { s: 0.97, z: -0.34, color: C.cliff },
      { s: 0.8, z: -0.95, color: C.cliffDark },
      { s: 0.52, z: -1.6, color: C.cliffDark },
      { s: 0.22, z: -2.25, color: C.rock },
    ];
    const rings = bands.map((band, k) => {
      const turn = (k % 2) * (Math.PI / sides);
      return Array.from({ length: sides }, (_, i) => {
        const a = turn + (i / sides) * Math.PI * 2;
        const j = k === 0 ? 0.06 : 0.14;
        const r = band.s * (1 - j / 2 + rnd() * j);
        return [Math.cos(a) * rx * r, Math.sin(a) * ry * r, band.z - (k ? rnd() * 0.12 : 0)];
      });
    });
    const tip = [rnd() * 0.3, rnd() * 0.3, -3.2];
    const shapes = [];
    const face = (pts, color) => {
      let n = norm(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])));
      const c = centroid(pts);
      if (dot(n, [c[0], c[1], 0]) < 0) n = mul(n, -1);
      if (dot(n, VIEW) > 0) shapes.push({ pts, fill: shade(color, n), d: depth(c) });
    };
    for (let k = 0; k < rings.length; k++) {
      const a = rings[k];
      const color = bands[k + 1]?.color ?? C.rock;
      for (let i = 0; i < sides; i++) {
        const i1 = (i + 1) % sides;
        if (k === rings.length - 1) {
          face([a[i], a[i1], tip], color);
        } else {
          const b = rings[k + 1];
          // Bands alternate their half-step turn, so each quad becomes two triangles
          face([a[i], a[i1], b[i]], color);
          face([a[i1], b[i1], b[i]], color);
        }
      }
    }
    shapes.sort((p, q) => p.d - q.d);
    shapes.push({ pts: rings[0], fill: css(rgb(C.sand)) });
    this.items.push({ key: -1000, shapes });
    this.top = rings[0];
    return this;
  }

  // --- A few small landmarks used across scenes ---

  cypress(x, y, h = 1.3) {
    this.prism(x, y, 0, 0.06, 0.2, C.wood, { sides: 5 });
    return this.prism(x, y, 0.15, 0.26, h, C.cypress, { sides: 6, rTop: 0, key: 0.05 });
  }

  bush(x, y, r = 0.3) {
    return this.ball(x, y, r * 0.55, r, C.leaf, { sz: 0.75 });
  }

  rock(x, y, r = 0.25, color = C.stone) {
    return this.prism(x, y, 0, r, r * 0.9, color, { sides: 5, rTop: r * 0.45, rot: x * 3 });
  }

  // A little person: a body and a head
  person(x, y, color, h = 0.7) {
    this.prism(x, y, 0, 0.17, h * 0.62, color, { sides: 6, rTop: 0.12 });
    return this.ball(x, y, h * 0.62 + 0.13, 0.14, C.enamel, { seg: 6, key: 0.1 });
  }

  // An arched opening on a wall face; `face` is "x" (the +x side) or "y" (the +y side)
  arch(x, y, z, w, h, face = "y", color = C.dark) {
    const pts = [];
    const r = w / 2;
    pts.push([-r, 0], [-r, h - r]);
    for (let i = 1; i < 8; i++) {
      const a = Math.PI - (i / 8) * Math.PI;
      pts.push([Math.cos(a) * r, h - r + Math.sin(a) * r]);
    }
    pts.push([r, h - r], [r, 0]);
    const placed = pts.map(([u, v]) => (face === "y" ? [x + u, y, z + v] : [x, y - u, z + v]));
    return this.flat(placed, color);
  }

  // --- Output ---

  svg(label, { width = 400, height = 250, pad = 16 } = {}) {
    const items = [...this.items].sort((a, b) => a.key - b.key);
    const flatShapes = items.flatMap((item) => item.shapes);
    const corners = [];
    for (const s of flatShapes) {
      if (s.halo) corners.push(project(s.at));
      else if (s.bubble) corners.push(project(s.at), project(add(s.at, [0, 0, 0.85])));
      else corners.push(...s.pts.map(project));
    }
    const xs = corners.map((p) => p[0]);
    const ys = corners.map((p) => p[1]);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const scale = Math.min((width - pad * 2) / (maxX - minX), (height - pad * 2) / (maxY - minY));
    const ox = (width - (maxX - minX) * scale) / 2 - minX * scale;
    const oy = (height - (maxY - minY) * scale) / 2 - minY * scale;
    const to = (p) => {
      const [sx, sy] = project(p);
      return [+(sx * scale + ox).toFixed(1), +(sy * scale + oy).toFixed(1)];
    };

    const defs = [];
    const body = [];
    let gradients = 0;
    for (const s of flatShapes) {
      const op = s.opacity != null && s.opacity < 1 ? ` opacity="${s.opacity}"` : "";
      if (s.halo) {
        const id = `g${gradients++}`;
        defs.push(
          `<radialGradient id="${id}"><stop offset="0" stop-color="${s.color}" stop-opacity="0.55"/><stop offset="1" stop-color="${s.color}" stop-opacity="0"/></radialGradient>`,
        );
        const [cx, cy] = to(s.at);
        body.push(`<circle cx="${cx}" cy="${cy}" r="${(s.r * scale).toFixed(1)}" fill="url(#${id})"/>`);
      } else if (s.bubble) {
        const [cx, cy] = to(s.at);
        // The tail's tip sits on the anchor point; flipped bubbles mirror around it
        const [w, h] = [30, 20];
        const [x0, y0] = [cx - 7, cy - h - 6];
        const flip = s.flip ? ` transform="translate(${2 * cx} 0) scale(-1 1)"` : "";
        body.push(
          `<g${flip}><path d="M${x0 + 5} ${y0}H${x0 + w - 5}A5 5 0 0 1 ${x0 + w} ${y0 + 5}V${y0 + h - 5}A5 5 0 0 1 ${x0 + w - 5} ${y0 + h}H${x0 + 13}L${cx} ${cy}L${x0 + 8} ${y0 + h}H${x0 + 5}A5 5 0 0 1 ${x0} ${y0 + h - 5}V${y0 + 5}A5 5 0 0 1 ${x0 + 5} ${y0}Z" fill="#fffbf3" stroke="${s.color}" stroke-width="1.6" stroke-linejoin="round"/>` +
            [-7, 0, 7].map((dx) => `<circle cx="${x0 + w / 2 + dx}" cy="${y0 + h / 2}" r="1.8" fill="${s.color}"/>`).join("") +
            `</g>`,
        );
      } else if (s.stroke) {
        const d = s.pts.map(to).map((p, i) => (i ? "L" : "M") + p.join(" ")).join("") + (s.close ? "Z" : "");
        const dash = s.dash ? ` stroke-dasharray="${s.dash}"` : "";
        body.push(
          `<path d="${d}" fill="none" stroke="${s.stroke}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round"${dash}${op}/>`,
        );
      } else {
        const pts = s.pts.map(to).map((p) => p.join(",")).join(" ");
        // A hairline stroke in the fill colour hides the seams between faces
        const seam = s.opacity != null && s.opacity < 1 ? "" : ` stroke="${s.fill}" stroke-width="0.6" stroke-linejoin="round"`;
        body.push(`<polygon points="${pts}" fill="${s.fill}"${seam}${op}/>`);
      }
    }
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}">\n` +
      (defs.length ? `<defs>${defs.join("")}</defs>\n` : "") +
      body.join("\n") +
      `\n</svg>\n`
    );
  }
}

function circle(cx, cy, r, n = 16, sy = 1) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r * sy];
  });
}

function rect(x0, y0, x1, y1) {
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
}

// ---------------------------------------------------------------------------
// The scenes, one per project
// ---------------------------------------------------------------------------

const scenes = {};

// Why We Procrastinate: a clock tower over a row of steps that stay low,
// then jump just before the deadline flag
scenes["procrastination"] = [
  "A clock tower over a row of low steps that leap up just before a deadline flag",
  () => {
    const s = new Scene().island({ seed: 3 });
    s.decal(rect(-2.4, 0.55, 2.2, 1.35), C.paving);
    s.box(-1.1, -1.0, 0, 1.2, 1.2, 2.6, C.wall, { top: C.wallShade });
    s.prism(-1.1, -1.0, 2.6, 0.92, 0.9, C.terracotta, { sides: 4, rTop: 0, rot: Math.PI / 4 });
    // Clock face on the +y side
    const face = circle(0, 0, 0.36, 16).map(([u, v]) => [-1.1 + u, -0.4, 1.85 + v]);
    s.flat(face, C.gold);
    s.line([[-1.1, -0.39, 1.85], [-1.1, -0.39, 2.1]], C.dark, { width: 2, key: 0.05 });
    s.line([[-1.1, -0.39, 1.85], [-0.92, -0.39, 1.78]], C.dark, { width: 2, key: 0.05 });
    s.arch(-1.1, -0.4, 0, 0.42, 0.8);
    s.arch(-0.5, -1.0, 0.95, 0.24, 0.42, "x");
    // Effort over time: flat, flat, flat... then a rush
    const heights = [0.14, 0.16, 0.15, 0.18, 0.2, 0.26, 0.5, 1.5];
    heights.forEach((h, i) => {
      const x = -2.1 + i * 0.55;
      const t = i / (heights.length - 1);
      s.box(x, 0.95, 0, 0.42, 0.55, h, t > 0.8 ? C.gold : t > 0.6 ? C.terracotta : C.stone);
    });
    // Deadline flag
    s.beam([1.95, -0.2, 0], [1.95, -0.2, 2.0], 0.06, C.wood);
    s.flat([[1.95, -0.2, 1.95], [1.95, 0.45, 1.75], [1.95, -0.2, 1.55]], C.red);
    s.cypress(1.1, -1.9, 1.2).cypress(-2.3, -0.4, 1);
    s.bush(0.9, 2.1, 0.28);
    return s;
  },
];

// The Social Adjacency of LLMs: friends in a circle around a softly glowing
// stone that talks back
scenes["social-adjacency"] = [
  "A circle of small figures trading speech bubbles with a softly glowing standing stone",
  () => {
    const s = new Scene().island({ seed: 7, rx: 3.1, ry: 3.1 });
    s.decal(circle(0, 0, 1.9, 22), C.paving);
    s.decal(circle(0, 0, 0.75, 14), C.stone, { key: -899 });
    s.halo(0, 0, 1.2, 1.6, C.teal, { key: -0.4 });
    s.prism(0, 0, 0, 0.42, 1.9, C.teal, { sides: 6, rTop: 0.3, glow: false });
    s.prism(0, 0, 1.9, 0.3, 0.35, C.water, { sides: 6, rTop: 0, glow: true });
    const colors = [C.terracotta, C.wall, C.gold, C.red, C.wall, C.terracotta];
    colors.forEach((color, i) => {
      const a = (i / colors.length) * Math.PI * 2 + 0.4;
      s.person(Math.cos(a) * 1.45, Math.sin(a) * 1.45, color, 0.8);
    });
    s.bubble(-1.0, 0.9, 1.4, { flip: true });
    s.bubble(0.45, -0.25, 2.65, { color: C.teal });
    s.bubble(1.2, -1.0, 1.25);
    s.cypress(-2.2, -1.0, 1.1).cypress(2.1, 1.4, 1);
    s.bush(-0.4, 2.4).bush(2.4, -0.7, 0.24);
    return s;
  },
];

// AI Interpretability Lab: personas lined up along one axis, rising towards
// the Assistant at the far end, with a gate marking where drift is capped
scenes["interpretability-lab"] = [
  "A row of pillars along a straight axis, rising towards a glowing gold pillar behind a gate",
  () => {
    const s = new Scene().island({ seed: 11 });
    s.decal(
      [
        [-2.6, -0.35],
        [2.5, -0.35],
        [2.5, 0.35],
        [-2.6, 0.35],
      ],
      C.paving,
    );
    s.line([[-2.5, 0, 0.01], [2.4, 0, 0.01]], C.gold, { width: 1.6, dash: "5 5", key: -880 });
    const n = 7;
    for (let i = 0; i < n; i++) {
      const x = -2.2 + i * 0.62;
      const t = i / (n - 1);
      const h = 0.35 + t * t * 1.9;
      const color = t === 1 ? C.gold : t > 0.6 ? C.terracotta : t > 0.3 ? C.stone : C.teal;
      s.prism(x, 0, 0, 0.2, h, color, { sides: 6, glow: t === 1 });
      s.prism(x, 0, h, 0.24, 0.08, C.wall, { sides: 6 });
    }
    s.halo(1.52, 0, 2.2, 1.0, C.gold);
    // The cap: a gate across the axis
    s.beam([1.21, -0.55, 0], [1.21, -0.55, 1.75], 0.12, C.wall);
    s.beam([1.21, 0.55, 0], [1.21, 0.55, 1.75], 0.12, C.wall, { key: 0.3 });
    s.box(1.21, 0, 1.75, 0.2, 1.36, 0.14, C.red, { key: 0.4 });
    s.cypress(-1.4, -1.7, 1.1).cypress(0.3, 1.9, 1.2);
    s.rock(-2.2, 1.3, 0.28).bush(2.0, -1.6, 0.3);
    return s;
  },
];

// VIA: a robot arm reaching for a gold block, watched by a camera
scenes["via"] = [
  "A low-poly robot arm reaching over a table to pick up a gold block, watched by a camera on a post",
  () => {
    const s = new Scene().island({ seed: 5 });
    s.decal(rect(-1.0, -1.2, 2.0, 1.7), C.paving);
    // Table with blocks, a plate and a bowl
    s.box(1.0, -0.2, 0, 1.4, 1.3, 0.5, C.wood, { top: C.stone });
    s.box(1.05, -0.15, 0.5, 0.36, 0.36, 0.36, C.gold);
    s.box(0.6, -0.65, 0.5, 0.28, 0.28, 0.28, C.teal);
    s.prism(1.45, -0.6, 0.5, 0.14, 0.16, C.enamel, { sides: 8, rTop: 0.22 });
    s.prism(1.4, 0.3, 0.5, 0.22, 0.04, C.terracotta, { sides: 10 });
    // The arm, standing in front of the table and reaching over it
    s.prism(-0.5, 1.0, 0, 0.5, 0.3, C.stone, { sides: 8 });
    s.prism(-0.5, 1.0, 0.3, 0.34, 0.3, C.wall, { sides: 8, top: C.wallShade });
    const shoulder = [-0.5, 1.0, 0.75];
    const elbow = [-0.35, 0.55, 2.35];
    const wrist = [1.05, -0.15, 1.85];
    const hand = [1.05, -0.15, 1.45];
    s.beam(shoulder, elbow, 0.3, C.wall, { key: 0.2 });
    s.ball(...elbow, 0.22, C.gold, { key: 0.4 });
    s.beam(elbow, wrist, 0.24, C.wall, { key: 0.6 });
    s.ball(...wrist, 0.17, C.gold, { key: 0.8 });
    s.beam(wrist, hand, 0.14, C.dark, { key: 0.9 });
    s.box(1.05, -0.15, 1.38, 0.5, 0.12, 0.08, C.dark, { key: 1 });
    s.beam([0.84, -0.15, 1.4], [0.84, -0.15, 1.05], 0.07, C.dark, { key: 1.1 });
    s.beam([1.26, -0.15, 1.4], [1.26, -0.15, 1.05], 0.07, C.dark, { key: 1.1 });
    s.ball(...shoulder, 0.24, C.gold, { key: 0.1 });
    // The camera that watches the scene
    s.beam([-1.0, -1.6, 0], [-1.0, -1.6, 1.5], 0.08, C.wood);
    s.box(-1.0, -1.6, 1.5, 0.36, 0.3, 0.26, C.dark);
    s.flat([[-0.82, -1.45, 1.6], [0.75, -0.55, 0.86], [1.3, 0.25, 0.86]], C.gold, { opacity: 0.2, key: 2 });
    s.cypress(-2.1, -0.6, 1.1).cypress(0.6, -2.2, 0.9);
    s.bush(1.4, 1.8, 0.3).rock(-1.8, 1.6, 0.22);
    return s;
  },
];

// PiCar: a little car following its lane and steering around rocks
scenes["picar"] = [
  "A small car following a lane, with a dashed path curving around rocks in the road ahead",
  () => {
    const s = new Scene().island({ seed: 9, rx: 3.3 });
    s.decal(rect(-3.0, -0.75, 3.0, 0.75), C.asphalt);
    for (let x = -2.7; x < 2.8; x += 0.7) s.decal(rect(x, -0.04, x + 0.38, 0.04), C.enamel, { key: -890 });
    s.decal(rect(-3.0, -0.8, 3.0, -0.72), C.wall, { key: -890 });
    s.decal(rect(-3.0, 0.72, 3.0, 0.8), C.wall, { key: -890 });
    // Path around the rocks
    const path = [];
    for (let i = 0; i <= 16; i++) {
      const x = -1.2 + (i / 16) * 3.6;
      const bump = Math.exp(-(((x - 0.9) / 0.65) ** 2));
      path.push([x, 0.38 - bump * 0.78, 0.02]);
    }
    s.line(path, C.gold, { width: 2, dash: "4 4", key: -880 });
    // The car
    const cx = -1.6;
    const cy = 0.38;
    for (const [dx, dy] of [[-0.35, -0.3], [0.35, -0.3], [-0.35, 0.3], [0.35, 0.3]]) {
      s.box(cx + dx, cy + dy, 0, 0.26, 0.1, 0.24, C.dark);
    }
    s.box(cx, cy, 0.1, 1.05, 0.56, 0.3, C.terracotta);
    s.box(cx - 0.1, cy, 0.4, 0.5, 0.46, 0.22, C.wall);
    s.box(cx + 0.38, cy, 0.4, 0.12, 0.16, 0.14, C.dark);
    s.flat([[cx + 0.46, cy, 0.48], [cx + 1.6, cy - 0.5, 0.05], [cx + 1.6, cy + 0.5, 0.05]], C.gold, { opacity: 0.2, key: 1 });
    // Obstacles
    s.rock(0.95, 0.35, 0.26, C.rock).rock(1.3, 0.55, 0.18, C.cliffDark);
    s.prism(2.4, -0.45, 0, 0.17, 0.42, C.terracotta, { sides: 6, rTop: 0 });
    s.cypress(-0.6, -1.9, 1.1).cypress(1.6, 1.8, 1);
    s.bush(-2.0, -1.5).bush(0.2, 2.0, 0.25);
    return s;
  },
];

// RoboNurse: a friendly robot rolling up to a bed, a medical cross on its chest
scenes["robonurse"] = [
  "A friendly wheeled robot with a red cross on its chest, beside a bed, its antenna glowing",
  () => {
    const s = new Scene().island({ seed: 13 });
    s.decal(rect(-1.8, -1.6, 2.0, 1.3), C.paving);
    // Bed
    s.box(-0.7, -0.7, 0, 1.0, 2.0, 0.42, C.wood);
    s.box(-0.7, -0.7, 0.42, 0.92, 1.92, 0.16, C.enamel);
    s.box(-0.7, -1.45, 0.58, 0.7, 0.35, 0.12, C.wallShade);
    s.box(-0.7, -1.66, 0, 1.0, 0.1, 0.9, C.wood);
    // Robot
    const x = 0.9;
    const y = 0.3;
    s.box(x - 0.3, y, 0, 0.16, 0.6, 0.2, C.dark).box(x + 0.3, y, 0, 0.16, 0.6, 0.2, C.dark);
    s.box(x, y, 0.15, 0.8, 0.7, 0.85, C.wall);
    s.flat([[x - 0.06, y + 0.36, 0.42], [x + 0.06, y + 0.36, 0.42], [x + 0.06, y + 0.36, 0.78], [x - 0.06, y + 0.36, 0.78]], C.red);
    s.flat([[x - 0.18, y + 0.36, 0.54], [x + 0.18, y + 0.36, 0.54], [x + 0.18, y + 0.36, 0.66], [x - 0.18, y + 0.36, 0.66]], C.red);
    s.box(x, y, 1.0, 0.1, 0.1, 0.1, C.stone);
    s.box(x, y, 1.08, 0.7, 0.6, 0.5, C.wall, { top: C.wallShade });
    s.flat([[x - 0.25, y + 0.31, 1.18], [x + 0.25, y + 0.31, 1.18], [x + 0.25, y + 0.31, 1.45], [x - 0.25, y + 0.31, 1.45]], C.water);
    s.flat(circle(0, 0, 0.05, 8).map(([u, v]) => [x - 0.1 + u, y + 0.32, 1.32 + v]), C.dark, { key: 0.04 });
    s.flat(circle(0, 0, 0.05, 8).map(([u, v]) => [x + 0.1 + u, y + 0.32, 1.32 + v]), C.dark, { key: 0.04 });
    s.beam([x, y, 1.58], [x, y, 1.95], 0.04, C.dark);
    s.ball(x, y, 1.98, 0.08, C.gold, { glow: true });
    s.halo(x, y, 1.98, 0.45, C.gold);
    // Arduino board on a crate
    s.box(1.9, -0.9, 0, 0.7, 0.7, 0.5, C.wood, { top: C.stone });
    s.box(1.9, -0.9, 0.5, 0.55, 0.42, 0.05, C.teal);
    s.box(1.8, -0.95, 0.55, 0.14, 0.14, 0.06, C.dark).box(2.02, -0.8, 0.55, 0.1, 0.18, 0.05, C.wall);
    s.cypress(-2.2, 0.8, 1.1).cypress(2.0, 1.6, 0.9);
    s.bush(-0.5, 2.1, 0.28);
    return s;
  },
];

// Room mesh to MuJoCo: half a room still solid sandstone, the other half
// turned into a triangle mesh
scenes["room-mesh"] = [
  "A small room whose left half is solid stone and whose right half dissolves into a triangle mesh",
  () => {
    const s = new Scene().island({ seed: 17 });
    const [x0, x1, y0, y1] = [-2.0, 2.0, -1.8, 1.6];
    const H = 1.5;
    // Solid floor and back wall on the left half
    s.box(-0.9, -0.1, 0, 2.2, 3.4, 0.08, C.paving);
    s.box(x0 - 0.1, -0.1, 0, 0.2, 3.4, H, C.wall, { top: C.wallShade, key: -3 });
    s.box(-0.9, y0 - 0.1, 0, 2.2, 0.2, H, C.wall, { top: C.wallShade, key: -3 });
    s.arch(x0, -0.6, 0.35, 0.5, 0.85, "x", C.water);
    s.arch(x0, 0.6, 0.35, 0.5, 0.85, "x", C.water);
    s.box(-1.4, 0.6, 0.08, 0.6, 0.9, 0.45, C.terracotta);
    // Mesh half: floor triangles and the back wall as wireframe
    const mesh = [];
    const xs = [0.2, 0.65, 1.1, 1.55, 2.0];
    const ys = [-1.8, -1.0, -0.2, 0.6, 1.4];
    for (const x of xs) mesh.push([[x, y0, 0.06], [x, ys.at(-1), 0.06]]);
    for (const y of ys) mesh.push([[xs[0], y, 0.06], [x1, y, 0.06]]);
    for (let i = 0; i < xs.length - 1; i++)
      for (let j = 0; j < ys.length - 1; j++) mesh.push([[xs[i], ys[j], 0.06], [xs[i + 1], ys[j + 1], 0.06]]);
    for (const x of xs) mesh.push([[x, y0, 0], [x, y0, H]]);
    mesh.push([[xs[0], y0, H], [x1, y0, H]], [[xs[0], y0, H / 2], [x1, y0, H / 2]]);
    for (let i = 0; i < xs.length - 1; i++) mesh.push([[xs[i], y0, 0], [xs[i + 1], y0, H / 2]], [[xs[i], y0, H / 2], [xs[i + 1], y0, H]]);
    for (const seg of mesh) s.line(seg, C.teal, { width: 1.3, key: -500 });
    for (const x of xs) for (const y of ys) s.halo(x, y, 0.06, 0.09, C.teal, { key: -400 });
    // The crate on the mesh side, also as wireframe
    const [bx, by, bw] = [1.15, 0.6, 0.6];
    const b = (dx, dy, z) => [bx + dx * bw / 2, by + dy * bw / 2, z];
    const top = [b(-1, -1, 0.5), b(1, -1, 0.5), b(1, 1, 0.5), b(-1, 1, 0.5)];
    s.line(top, C.gold, { width: 1.6, close: true, key: 0 });
    for (const [dx, dy] of [[1, -1], [1, 1], [-1, 1]]) s.line([b(dx, dy, 0.06), b(dx, dy, 0.5)], C.gold, { width: 1.6 });
    s.line([b(1, -1, 0.06), b(1, 1, 0.06), b(-1, 1, 0.06)], C.gold, { width: 1.6 });
    s.cypress(-2.4, 2.0, 1).cypress(2.5, -1.5, 1.1);
    return s;
  },
];

// Triton AI: a car on a test track, ringed by LiDAR sweeps, cameras looking
// fore and aft
scenes["triton-ai"] = [
  "A car on a small test track, ringed by LiDAR sweeps, with camera views cast to the front and rear",
  () => {
    const s = new Scene().island({ seed: 21, rx: 3.3, ry: 3.1 });
    s.decal(circle(0, 0, 2.5, 30, 0.82), C.asphalt);
    s.decal(circle(0, 0, 1.75, 26, 0.72), C.leaf, { key: -899 });
    s.decal(circle(0, 0, 1.6, 26, 0.7), C.sand, { key: -898 });
    const cx = 0.3;
    const cy = 2.08;
    for (const r of [0.75, 1.15, 1.55]) s.ring(cx, cy, 0.05, r, C.teal, { width: 1.4, dash: "3 4", key: -850 });
    for (const [dx, dy] of [[-0.4, -0.3], [0.4, -0.3], [-0.4, 0.3], [0.4, 0.3]]) s.box(cx + dx, cy + dy, 0, 0.28, 0.1, 0.25, C.dark);
    s.box(cx, cy, 0.1, 1.2, 0.62, 0.32, C.wall);
    s.box(cx - 0.1, cy, 0.42, 0.6, 0.52, 0.22, C.terracotta);
    s.prism(cx - 0.1, cy, 0.64, 0.14, 0.12, C.dark, { sides: 8 });
    s.halo(cx - 0.1, cy, 0.76, 0.4, C.teal);
    s.flat([[cx + 0.6, cy, 0.3], [cx + 2.0, cy - 0.7, 0.04], [cx + 2.0, cy + 0.7, 0.04]], C.gold, { opacity: 0.22, key: 2 });
    s.flat([[cx - 0.6, cy, 0.3], [cx - 1.9, cy - 0.6, 0.04], [cx - 1.9, cy + 0.6, 0.04]], C.gold, { opacity: 0.22, key: 2 });
    for (const a of [0.2, 1.4, 2.4, 3.6, 4.6]) {
      s.prism(Math.cos(a) * 2.65, Math.sin(a) * 2.2, 0, 0.12, 0.32, C.terracotta, { sides: 6, rTop: 0 });
    }
    // Pit tower in the infield
    s.box(-0.5, -0.3, 0, 0.8, 0.8, 1.3, C.wall, { top: C.wallShade });
    s.box(-0.5, -0.3, 1.3, 0.95, 0.95, 0.12, C.terracotta);
    s.arch(-0.5, 0.1, 0, 0.3, 0.55);
    s.cypress(0.8, -0.6, 1).bush(-1.0, 0.6, 0.26);
    return s;
  },
];

// Audio-Perception Lab: sound rings off a tower, a field of spectrogram bars,
// and the stacked transformer they feed
scenes["audio-lab"] = [
  "A round tower sending out rings of sound over a field of spectrogram bars beside a stacked block",
  () => {
    const s = new Scene().island({ seed: 25 });
    s.decal(rect(-0.6, -0.4, 2.4, 1.6), C.paving);
    s.prism(-1.5, -1.0, 0, 0.6, 2.2, C.wall, { sides: 10, top: C.wallShade });
    s.prism(-1.5, -1.0, 2.2, 0.66, 0.5, C.teal, { sides: 10, rTop: 0 });
    s.arch(-1.5, -0.42, 0, 0.36, 0.7);
    for (const [r, z] of [[0.95, 1.5], [1.35, 1.35], [1.75, 1.2]]) s.ring(-1.5, -1.0, z, r, C.teal, { width: 1.5, dash: "4 4", opacity: 1 - r / 3 });
    // Spectrogram: a grid of bars
    const cols = 6;
    const rows = 3;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const t = (Math.sin(i * 1.3 + j * 2.1) + 1) / 2;
        const h = 0.12 + t * 0.7 * (1 - j * 0.22);
        const mix = t > 0.66 ? C.gold : t > 0.33 ? C.terracotta : C.teal;
        s.box(-0.35 + i * 0.32, -0.15 + j * 0.42, 0, 0.24, 0.3, h, mix);
      }
    }
    // Transformer: stacked slabs
    for (let k = 0; k < 4; k++) s.box(1.75, -1.25, k * 0.34, 0.9 - k * 0.08, 0.8 - k * 0.08, 0.26, k % 2 ? C.stone : C.wall);
    s.ball(1.75, -1.25, 1.5, 0.14, C.gold, { glow: true });
    s.halo(1.75, -1.25, 1.5, 0.5, C.gold);
    s.cypress(1.4, 1.9, 1.1).cypress(-2.3, 1.0, 0.9);
    s.bush(0.2, 2.3, 0.26);
    return s;
  },
];

// Macro Optimizer: three meal bowls lined up against three macro targets,
// with a stack of coins for the budget
scenes["macro-optimizer"] = [
  "Three meal bowls on a table beside three bars of different heights and a small stack of gold coins",
  () => {
    const s = new Scene().island({ seed: 29 });
    s.decal(rect(-2.0, -1.0, 1.4, 1.2), C.paving);
    s.box(-0.4, 0.1, 0, 2.6, 1.1, 0.55, C.wood, { top: C.stone });
    const bowls = [
      [-1.3, C.enamel],
      [-0.4, C.leaf],
      [0.5, C.terracotta],
    ];
    for (const [x, fill] of bowls) {
      s.prism(x, 0.1, 0.55, 0.2, 0.2, C.wall, { sides: 10, rTop: 0.36 });
      s.ball(x, 0.1, 0.76, 0.28, fill, { sz: 0.45, seg: 8 });
    }
    // Macro targets
    const bars = [
      [1.2, -1.6, 1.4, C.teal],
      [1.75, -1.6, 0.9, C.gold],
      [2.3, -1.6, 1.8, C.terracotta],
    ];
    for (const [x, y, h, color] of bars) {
      s.box(x, y, 0, 0.4, 0.4, h, color);
      s.box(x, y, h, 0.5, 0.5, 0.06, C.wall);
    }
    // Budget coins
    for (let k = 0; k < 4; k++) s.prism(-1.6, 1.7, k * 0.11, 0.24, 0.09, C.gold, { sides: 10 });
    s.prism(-1.05, 1.95, 0, 0.24, 0.09, C.gold, { sides: 10 });
    s.cypress(-1.9, -1.9, 1.1).bush(2.2, 1.4, 0.3).rock(0.6, 2.2, 0.2);
    return s;
  },
];

// Menu Generator: a long family table set for dinner, a menu board, and the
// little home server it all runs on
scenes["menu-generator"] = [
  "A long dinner table set with plates, a menu board beside it and a small server box with glowing lights",
  () => {
    const s = new Scene().island({ seed: 33 });
    s.decal(rect(-1.9, -1.2, 1.6, 1.6), C.paving);
    s.box(-0.2, 0.2, 0, 2.6, 1.0, 0.5, C.wood, { top: C.terracotta });
    s.box(-0.2, 0.2, 0.5, 2.6, 0.35, 0.02, C.wall);
    for (const x of [-1.2, -0.55, 0.15, 0.85]) {
      for (const y of [-0.15, 0.55]) s.prism(x, y, 0.5, 0.16, 0.04, C.enamel, { sides: 10 });
    }
    s.ball(-0.2, 0.2, 0.62, 0.15, C.gold, { sz: 0.7 });
    for (const x of [-1.2, -0.2, 0.85]) {
      s.box(x, -0.65, 0, 0.36, 0.34, 0.3, C.wood, { top: C.stone });
      s.box(x, 1.05, 0, 0.36, 0.34, 0.3, C.wood, { top: C.stone });
    }
    // Menu board
    s.beam([-1.85, -1.4, 0], [-1.85, -1.4, 1.5], 0.08, C.wood);
    s.box(-1.85, -1.0, 0.7, 0.12, 0.9, 1.1, C.dark, { top: C.wood });
    for (const z of [1.6, 1.4, 1.2, 1.0]) s.line([[-1.78, -1.35, z], [-1.78, -0.7, z]], C.wall, { width: 1.5, key: 0.1 });
    // NAS
    s.box(1.9, -1.2, 0, 0.6, 0.7, 1.0, C.dark, { top: C.asphalt });
    for (const z of [0.25, 0.45, 0.65]) {
      s.flat(circle(0, 0, 0.04, 6).map(([u, v]) => [2.2, -1.42 + u, z + v]), C.water);
      s.line([[2.21, -1.3, z], [2.21, -0.95, z]], C.asphalt, { width: 1.4 });
    }
    s.halo(2.2, -1.4, 0.45, 0.5, C.teal);
    s.cypress(1.5, 2.0, 1).bush(-2.2, 1.6, 0.3);
    return s;
  },
];

// BinTek: three sorting bins under a watching camera, one picked out in a
// detection box, with the database the counts go to
scenes["bintek"] = [
  "Three colored waste bins under a camera on a pole, one outlined in a detection box, beside a stack of database disks",
  () => {
    const s = new Scene().island({ seed: 37 });
    s.decal(rect(-1.9, -0.6, 1.2, 0.8), C.paving);
    const bins = [
      [-1.35, C.red],
      [-0.4, C.gold],
      [0.55, C.leaf],
    ];
    for (const [x, color] of bins) {
      s.prism(x, 0.1, 0, 0.38, 0.95, color, { sides: 4, rTop: 0.44, rot: Math.PI / 4 });
      s.prism(x, 0.1, 0.95, 0.47, 0.1, C.wall, { sides: 4, rot: Math.PI / 4 });
    }
    // Detection box around the middle bin
    const [bx, by, r, h] = [-0.4, 0.1, 0.45, 1.3];
    const c = (dx, dy, z) => [bx + dx * r, by + dy * r, z];
    s.line([c(-1, 1, 0), c(1, 1, 0), c(1, 1, h), c(-1, 1, h), c(-1, 1, 0)], C.teal, { width: 1.8, dash: "5 3", key: 3 });
    s.line([c(1, 1, 0), c(1, -1, 0), c(1, -1, h), c(1, 1, h)], C.teal, { width: 1.8, dash: "5 3", key: 3 });
    // Camera on a pole
    s.beam([-0.6, -1.6, 0], [-0.6, -1.6, 2.4], 0.08, C.dark);
    s.beam([-0.6, -1.6, 2.4], [-0.6, -1.1, 2.4], 0.08, C.dark);
    s.box(-0.6, -1.0, 2.25, 0.3, 0.4, 0.26, C.dark);
    s.flat([[-0.6, -0.8, 2.25], [-1.8, 0.8, 1.0], [0.9, 0.8, 1.0]], C.teal, { opacity: 0.16, key: 4 });
    // Database
    for (let k = 0; k < 3; k++) s.prism(1.9, -0.9, k * 0.34, 0.42, 0.26, C.teal, { sides: 10, top: C.water });
    s.cypress(-2.2, -1.2, 1.1).bush(1.4, 1.8, 0.3).rock(-1.6, 1.8, 0.22);
    return s;
  },
];

for (const [name, [label, build]] of Object.entries(scenes)) {
  writeFileSync(OUT + name + ".svg", build().svg(label));
  console.log("wrote images/projects/islands/" + name + ".svg");
}
