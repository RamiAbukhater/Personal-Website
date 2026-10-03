// Hero animation: floating nodes gradually link up into a slowly rotating 3D brain.
// Plain JavaScript + <canvas>, no libraries.

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const COLOR = "0, 255, 204";
const BUILD_SECONDS = 10; // time for every edge to start linking up
const TRAVEL_SECONDS = 3; // time for a node to glide into place
const EDGE_FADE = 1.5; // time for an edge to fade in
const PARTICLE_FADE_IN = 2.5; // time for the loose particles to appear when the page opens
const SPIN = 0.3; // radians per second
const TILT = 0.22; // look down on the brain slightly
const CAMERA = 2.8; // camera distance, in brain lengths
const LIGHT = [-0.41, 0.58, 0.7]; // from the upper left, towards the viewer
const SHADES = 16; // brightness levels used when drawing

// --- The brain surface ---
// Model space: x = left/right, y = up, z = front/back. The brain is 1 unit long.

// Distance from the centre to the surface of the cerebrum in direction (dx, dy, dz)
// Half-width, half-height and half-length of the cerebrum, based on a real
// brain's proportions (roughly 167 mm long, 140 mm wide, 93 mm tall)
function cerebrumAxes(dy, dz) {
  const a = 0.42 * (1 - 0.12 * dz); // narrower at the front than the back
  // Domed on top, flatter underneath, and shallowest at the back,
  // where the cerebrum sits on top of the cerebellum
  const b = dy > 0 ? 0.33 : 0.2 + 0.04 * dz;
  return [a, b, 0.5];
}

function cerebrumRadius(dx, dy, dz) {
  const [a, b, c] = cerebrumAxes(dy, dz);
  let r = 1 / Math.hypot(dx / a, dy / b, dz / c);
  // Temporal lobes: a bulge low on each side
  if (dy < 0) {
    r *= 1 + 0.35 * Math.min(1, -dy * 2) * Math.abs(dx) * Math.exp(-(((dz - 0.15) / 0.4) ** 2));
  }
  // Longitudinal fissure: the groove between the two hemispheres
  r *= 1 - 0.14 * Math.exp(-((dx / 0.08) ** 2));
  return r;
}

// Winding fold pattern, mirrored across the two hemispheres.
// Values near zero are sulci (grooves); everything else is gyri (ridges).
function folds(x, y, z) {
  const k = 21;
  x = Math.abs(x);
  return (
    (Math.sin(k * x + 2 * Math.sin(k * 0.6 * y + 1) + 2 * Math.sin(k * 0.5 * z)) +
      Math.sin(k * 0.9 * y + 2 * Math.sin(k * 0.55 * z + 2) + 2 * Math.sin(k * 0.6 * x + 0.5)) +
      Math.sin(k * 0.8 * z + 2 * Math.sin(k * 0.5 * x + 4) + 2 * Math.sin(k * 0.6 * y))) /
    3
  );
}
const SULCUS = 0.11;

function insideCerebrum(x, y, z) {
  const d = Math.hypot(x, y, z);
  return d < cerebrumRadius(x / d, y / d, z / d);
}

const CEREBELLUM = { y: -0.25, z: -0.25, a: 0.28, b: 0.13, c: 0.17 };

function insideCerebellum(x, y, z) {
  const { y: cy, z: cz, a, b, c } = CEREBELLUM;
  return Math.hypot(x / a, (y - cy) / b, (z - cz) / c) < 1;
}

function randomDirection() {
  const y = Math.random() * 2 - 1;
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(1 - y * y);
  return [r * Math.cos(angle), y, r * Math.sin(angle)];
}

// Random point on the cerebrum, or null if it lands in a sulcus
function cerebrumPoint() {
  const [dx, dy, dz] = randomDirection();
  const r = cerebrumRadius(dx, dy, dz);
  const fold = Math.abs(folds(dx * r, dy * r, dz * r));
  if (fold < SULCUS) return null;
  const bulge = r * (1 + 0.03 * Math.min(1, fold * 3)); // gyri stand slightly proud
  const [a, b, c] = cerebrumAxes(dy, dz);
  return {
    x: dx * bulge, y: dy * bulge, z: dz * bulge,
    normal: [dx / a ** 2, dy / b ** 2, dz / c ** 2],
    cerebrum: true,
  };
}

// Random point on the cerebellum, striped with fine horizontal folds
function cerebellumPoint() {
  const { y: cy, z: cz, a, b, c } = CEREBELLUM;
  const [dx, dy, dz] = randomDirection();
  const groove = 1 - 0.1 * Math.exp(-((dx / 0.12) ** 2));
  const x = dx * a * groove;
  const y = cy + dy * b * groove;
  const z = cz + dz * c * groove;
  if (Math.sin(y * 95) < -0.3 || insideCerebrum(x, y, z)) return null;
  return { x, y, z, normal: [dx / a, dy / b, dz / c] };
}

// Random point on the brainstem: a short, thick tube running down and back,
// swelling at the pons and tapering towards the spinal cord
function brainstemPoint() {
  const t = Math.random();
  const angle = Math.random() * Math.PI * 2;
  const radius = 0.08 - 0.03 * t + 0.02 * Math.exp(-(((t - 0.3) / 0.2) ** 2));
  const x = Math.cos(angle) * radius;
  const y = -0.14 - 0.3 * t;
  const z = -0.08 - 0.07 * t + Math.sin(angle) * radius;
  if (insideCerebrum(x, y, z) || insideCerebellum(x, y, z)) return null;
  return { x, y, z, normal: [Math.cos(angle), 0, Math.sin(angle)] };
}

// --- Build the brain graph: where each node ends up, and which nodes connect ---

const shape = []; // final position and surface normal of each node

// Scatter nodes over a surface, kept a minimum distance apart
function scatter(samplePoint, spacing, tries) {
  const start = shape.length;
  for (let t = 0; t < tries; t++) {
    const p = samplePoint();
    if (!p) continue;
    let crowded = false;
    for (let i = start; i < shape.length && !crowded; i++) {
      crowded = Math.hypot(shape[i].x - p.x, shape[i].y - p.y, shape[i].z - p.z) < spacing;
    }
    if (crowded) continue;
    const length = Math.hypot(...p.normal);
    p.normal = p.normal.map((n) => n / length);
    shape.push(p);
  }
}

scatter(cerebrumPoint, 0.055, 16000);
scatter(cerebellumPoint, 0.042, 5000);
scatter(brainstemPoint, 0.048, 1500);

const edges = []; // [a, b] index pairs
const edgeKeys = new Set();

function addEdge(a, b) {
  const key = a < b ? `${a}-${b}` : `${b}-${a}`;
  if (edgeKeys.has(key)) return;
  edgeKeys.add(key);
  edges.push([a, b]);
}

// Each node links to its three nearest neighbours, but never across a sulcus,
// so the grooves show up as dark winding gaps in the mesh
shape.forEach((p, i) => {
  const nearest = [];
  shape.forEach((q, j) => {
    if (i === j) return;
    const d = Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
    if (d > 0.12) return;
    if (p.cerebrum && q.cerebrum) {
      const fold = folds((p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2);
      if (Math.abs(fold) < SULCUS * 0.8) return;
    }
    nearest.push([d, j]);
  });
  nearest
    .sort((a, b) => a[0] - b[0])
    .slice(0, 3)
    .forEach(([, j]) => addEdge(i, j));
});

// --- Animation state ---

// Until it links, a node drifts across the whole window on its own wandering
// path. Free nodes live in screen space (u, v from 0 to 1, plus a depth), so
// they don't turn with the brain.
const nodes = shape.map(() => ({
  u: Math.random(),
  v: Math.random(),
  depth: Math.random(), // 0 = far away and dim, 1 = close and bright
  heading: Math.random() * Math.PI * 2,
  turn: (Math.random() - 0.5) * 0.8, // radians per second the heading drifts
  speed: 0.006 + Math.random() * 0.014, // window widths per second
  x: 0, // position in model space, once linked
  y: 0,
  z: 0,
  phase: Math.random() * Math.PI * 2,
  linked: false,
  linkedAt: 0,
  from: null, // where the node was when it linked
  progress: 0, // 0–1, how far along its trip into the brain it is
}));

// Edges join in a soft wave from the front of the brain to the back,
// rather than popping up at random all over it
const order = [...edges.keys()]
  .map((e) => {
    const [a, b] = edges[e];
    return [-(shape[a].z + shape[b].z) / 2 + Math.random() * 0.15, e];
  })
  .sort((p, q) => p[0] - q[0])
  .map(([, e]) => e);
let nextEdge = 0;
const drawn = []; // { a, b, born }

function linkNode(i, now) {
  const node = nodes[i];
  if (node.linked) return;
  node.linked = true;
  node.linkedAt = now;
  // Remember where the node is relative to the camera (not the spinning brain),
  // so its flight into the brain doesn't get swung around by the spin
  const { size, centerX, centerY } = layout();
  const z = (node.depth - 0.5) * 1.2;
  const scale = (CAMERA / (CAMERA - z)) * size;
  node.from = { x: (node.u * width - centerX) / scale, y: (centerY - node.v * height) / scale, z };
}

function addNextEdge(now) {
  const [a, b] = edges[order[nextEdge++]];
  drawn.push({ a, b, born: now });
  linkNode(a, now);
  linkNode(b, now);
}

// Slow start, slow finish
function easeInOut(t) {
  t = Math.min(1, Math.max(0, t));
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
}

// --- Drawing ---

let width = 0;
let height = 0;
let yaw = -0.9; // three-quarter view, front of the brain towards the left

const screenX = new Float32Array(nodes.length);
const screenY = new Float32Array(nodes.length);
const shade = new Float32Array(nodes.length); // brightness 0–1

function resize() {
  const ratio = devicePixelRatio || 1;
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  if (reducedMotion) draw(Infinity);
}

// Spin a model-space vector around the vertical axis, then tilt it towards the camera
function rotate(x, y, z, cosYaw, sinYaw) {
  const rx = x * cosYaw + z * sinYaw;
  const rz = z * cosYaw - x * sinYaw;
  return [rx, y * Math.cos(TILT) - rz * Math.sin(TILT), rz * Math.cos(TILT) + y * Math.sin(TILT)];
}

// Where the brain sits on screen, and how big it is
function layout() {
  // Wide windows: the brain keeps to the right half, clear of the text on the left.
  // Narrow windows: it sits centred in the lower part, under the text.
  const wide = width >= 720;
  return {
    size: (wide ? Math.min(width * 0.5, height) : Math.min(width, height * 0.5)) * 0.92,
    centerX: wide ? width * 0.72 : width / 2,
    centerY: wide ? height * 0.6 : height * 0.72,
  };
}

function project(now) {
  const { size, centerX, centerY } = layout();
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  nodes.forEach((node, i) => {
    if (!node.linked) {
      screenX[i] = node.u * width;
      screenY[i] = node.v * height;
      // Dim, like distant stars, and faded in gently when the page opens
      shade[i] = (0.06 + 0.22 * node.depth) * easeInOut(now / PARTICLE_FADE_IN);
      return;
    }
    // Fly in a straight line from where the node was to its spot in the
    // turning brain, so it only takes on the spin as it arrives
    const [gx, gy, gz] = rotate(node.x, node.y + 0.05, node.z, cosYaw, sinYaw);
    let [x, y, z] = [gx, gy, gz];
    if (node.progress < 1) {
      const t = node.progress;
      x = node.from.x + (gx - node.from.x) * t;
      y = node.from.y + (gy - node.from.y) * t;
      z = node.from.z + (gz - node.from.z) * t;
    }
    const scale = (CAMERA / (CAMERA - z)) * size;
    screenX[i] = centerX + x * scale;
    screenY[i] = centerY - y * scale;
    // Lit from the upper left; the far side of the brain fades out.
    // Nodes blend from a flat glow into this lighting as they settle in.
    shade[i] = 0.3;
    if (node.progress > 0) {
      const [nx, ny, nz] = rotate(...shape[i].normal, cosYaw, sinYaw);
      const facing = Math.min(1, Math.max(0, (nz + 0.1) / 0.4));
      const lit = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
      shade[i] += (0.06 + 0.94 * facing * (0.3 + 0.7 * lit) - 0.3) * node.progress;
    }
  });
}

function draw(now) {
  ctx.clearRect(0, 0, width, height);
  project(now);

  // Group edges and nodes by brightness so each level is drawn in one go.
  // Anything that rounds down to level 0 is invisible and skipped.
  const edgePaths = Array.from({ length: SHADES + 1 }, () => new Path2D());
  for (const { a, b, born } of drawn) {
    // Edges fade in as their two nodes close in on each other, so long
    // lines never streak across the screen while nodes are still in flight
    const settled = (nodes[a].progress * nodes[b].progress) ** 3;
    const alpha = easeInOut((now - born) / EDGE_FADE) * settled * (shade[a] + shade[b]) * 0.5;
    const level = Math.round(Math.min(1, alpha) * SHADES);
    if (level === 0) continue;
    edgePaths[level].moveTo(screenX[a], screenY[a]);
    edgePaths[level].lineTo(screenX[b], screenY[b]);
  }
  ctx.lineWidth = 1;
  edgePaths.forEach((path, level) => {
    ctx.strokeStyle = `rgba(${COLOR}, ${(level / SHADES) * 0.5})`;
    ctx.stroke(path);
  });

  const nodePaths = Array.from({ length: SHADES + 1 }, () => new Path2D());
  nodes.forEach((node, i) => {
    const level = Math.round(Math.min(1, shade[i]) * SHADES);
    if (level === 0) return;
    nodePaths[level].moveTo(screenX[i], screenY[i]);
    nodePaths[level].arc(screenX[i], screenY[i], node.linked ? 1.6 : 0.8 + node.depth, 0, Math.PI * 2);
  });
  nodePaths.forEach((path, level) => {
    ctx.fillStyle = `rgba(${COLOR}, ${level / SHADES})`;
    ctx.fill(path);
  });
}

let last = 0;
let owed = 0; // edges due to be added

function frame(ms) {
  const now = ms / 1000;
  const dt = Math.min(0.05, now - last);
  last = now;
  yaw += SPIN * dt;

  owed += (dt * edges.length) / BUILD_SECONDS;
  while (nextEdge < edges.length && owed >= 1) {
    owed -= 1;
    addNextEdge(now);
  }

  nodes.forEach((node, i) => {
    if (node.linked) {
      // Head for its place in the brain over a fixed time (see project()), then bob gently
      const goal = shape[i];
      const bob = Math.sin(now * 0.8 + node.phase) * 0.004;
      node.progress = easeInOut((now - node.linkedAt) / TRAVEL_SECONDS);
      node.x = goal.x + goal.normal[0] * bob;
      node.y = goal.y + goal.normal[1] * bob;
      node.z = goal.z + goal.normal[2] * bob;
    } else {
      // Wander along a slowly curving path, wrapping around the window's edges
      node.heading += node.turn * Math.sin(now * 0.3 + node.phase) * dt;
      node.u += Math.cos(node.heading) * node.speed * dt;
      node.v += Math.sin(node.heading) * node.speed * dt * (height > 0 ? width / height : 1);
      node.u = ((node.u + 0.05) % 1.1 + 1.1) % 1.1 - 0.05;
      node.v = ((node.v + 0.05) % 1.1 + 1.1) % 1.1 - 0.05;
    }
  });

  draw(now);
  requestAnimationFrame(frame);
}

if (reducedMotion) {
  // No motion: show the finished brain straight away
  while (nextEdge < edges.length) addNextEdge(-Infinity);
  nodes.forEach((node, i) => Object.assign(node, { x: shape[i].x, y: shape[i].y, z: shape[i].z, progress: 1 }));
}

new ResizeObserver(resize).observe(canvas);
resize();

if (!reducedMotion) requestAnimationFrame(frame);
