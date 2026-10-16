// Roles: logo bubbles that sit in a cluster, light up on hover, and open a
// game-menu style card after a 1.5 second hover (or on click/tap). The other
// bubbles are pushed out of the way of the open card. Each bubble is ringed
// in the colour of its theme, with a key above the cluster.

const THEMES = {
  robotics: { label: "Robotics & Autonomy", color: "#2a7f78" },
  ai: { label: "AI & AI Safety", color: "#2c5aa0" },
  mind: { label: "Mind & Cognition", color: "#7a4fa8" },
  civic: { label: "Civic & Politics", color: "#b23a48" },
  community: { label: "Leadership & Community", color: "#c08a1e" },
};

// `logo` is an image path under images/roles/; when it is null the
// monogram is shown instead. `logoFill` makes a square logo with its own
// background fill the whole bubble. Current roles first, then past, newest first.
const ROLES = [
  {
    org: "Selene Nanorobotics",
    role: "Technical Lead Intern, Sensor Simulation & Navigation",
    previously: "R&D Intern, Computational Mapping & Signal Fusion",
    period: "June 2026 to present",
    current: true,
    theme: "robotics",
    monogram: "S",
    logo: "images/roles/selene.png",
    tags: ["Robotics", "AI", "Simulation", "Medical Technology"],
    blurb: "I built Selene's first software stack to ship on its complete nanorobotic platform, a physics-grounded simulator that models magnetic and acoustic sensing to localize microrobots inside the body. I now lead the next phase, a closed-loop design-optimization system using Bayesian optimization over robot geometry and sensor placement.",
  },
  {
    org: "Triton AI @ UC San Diego",
    role: "Autonomy Engineer, GPS/GNSS Navigation",
    previously: "Perception Engineer",
    period: "Sept 2026 to present",
    current: true,
    theme: "robotics",
    monogram: "TA",
    logo: "images/roles/triton-ai.jpg",
    logoFill: true,
    tags: ["Autonomous Vehicles", "Robotics", "Perception"],
    blurb: "I work on an autonomous Jeep with UCSD's student autonomy team in the Jack Silberman Lab, developing PID path-tracking control and integrating GNSS localization in ROS2. Earlier I stood up the vehicle's first full sensing suite, calibrating front and rear cameras and a 360° LiDAR into one synchronized frame.",
  },
  {
    org: "Lai Lab, UC San Diego Cognitive Science",
    role: "Undergraduate Researcher under Prof. Lucy Lai",
    period: "July 2026 to present",
    current: true,
    theme: "mind",
    monogram: "LL",
    logo: "images/roles/lai-lab.png",
    logoFill: true,
    tags: ["Cognitive Science", "AI", "Reinforcement Learning", "Psychology"],
    blurb: "I'm building a reinforcement-learning model of human procrastination by reformulating the Bellman equation. I fit the agents to human data to test whether temporal discounting alone explains self-control failure.",
  },
  {
    org: "DataWorks @ UC San Diego",
    role: "VP of Project Operations, Research",
    period: "March 2026 to present",
    current: true,
    theme: "ai",
    monogram: "DW",
    logo: "images/roles/dataworks.jpg",
    logoFill: true,
    tags: ["Data Science", "AI", "AI Interpretability", "Leadership"],
    blurb: "I set technical direction for 10+ student teams delivering data science projects to real business clients. I also lead the club's audio-perception lab and an AI interpretability project extending Anthropic's Assistant Axis work on how language models represent personas.",
  },
  {
    org: "AI Alignment @ UCSD",
    role: "Intro Fellow (selected)",
    period: "Fall 2026",
    current: true,
    theme: "ai",
    monogram: "AA",
    logo: "images/roles/ai-alignment.png",
    tags: ["AI Safety", "AI", "Philosophy"],
    blurb: "A selective fellowship studying interpretability, scalable oversight and AI safety.",
  },
  {
    org: "Polaris Research Group",
    role: "Undergraduate Researcher under Prof. Rich Booher",
    period: "March 2025 to June 2025",
    theme: "mind",
    monogram: "P",
    logo: "images/roles/polaris.svg",
    logoFill: true,
    tags: ["Philosophy", "Cognitive Science", "AI"],
    blurb: "I researched philosophical theories of mind and consciousness through a computational lens, with literature reviews spanning philosophy and cognitive science. I prototyped PyTorch models as testbeds for exploring those theories.",
  },
  {
    org: "De Anza Student Government",
    role: "Senator & Flea Market Committee Liaison",
    period: "Sept 2024 to June 2025",
    theme: "civic",
    monogram: "DA",
    logo: "images/roles/de-anza-student-government.png",
    logoFill: true,
    tags: ["Politics", "Leadership", "Community", "Data Science"],
    blurb: "I led a team of 10+ interns running the monthly De Anza Flea Market, working directly with vendors and the public, and used vendor and attendance data to guide marketing and planning. I presented at senate sessions to inform campus budget decisions.",
  },
  {
    org: "FAPAC Internship Program",
    role: "Intern Coordinator",
    period: "Sept 2023 to June 2025",
    theme: "civic",
    monogram: "F",
    logo: "images/roles/fa-pac.jpg",
    logoFill: true,
    tags: ["Politics", "Leadership", "Community"],
    blurb: "I managed and mentored a team of 6 interns and coordinated 100+ volunteers across multiple political campaigns. I ran weekly strategy meetings and served as a liaison between campus organizations and leaders.",
  },
  {
    org: "De Anza Game Developers Club",
    role: "Founder & President",
    period: "Sept 2023 to June 2024",
    theme: "community",
    monogram: "GD",
    logo: "images/roles/game-dev-club.png",
    logoFill: true,
    tags: ["Game Development", "Software", "Leadership", "Education"],
    blurb: "I founded the club and hosted the college's first Game Jam. I ran workshops teaching C# and the Unity game engine.",
  },
  {
    org: "Boy Scouts of America",
    role: "Eagle Scout & Senior Patrol Leader",
    period: "Aug 2022 to July 2023",
    theme: "community",
    monogram: "BSA",
    logo: "images/roles/scouting-america.png",
    tags: ["Leadership", "Community Service"],
    blurb: "As Senior Patrol Leader I planned and led weekly meetings for 70+ scouts and adult leaders and mentored 20+ scouts into leadership roles. I earned the rank of Eagle Scout in July 2023.",
  },
];

const HOLD_MS = 1500;
const GAP = 14; // breathing room between bubbles, and around the card

const field = document.querySelector(".roles-field");
if (field) initRoles(field);

function initRoles(field) {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const card = field.querySelector(".role-card");
  let W = field.clientWidth;
  let H = field.clientHeight;

  const bubbles = ROLES.map((data, i) => makeBubble(data, i));
  let placed = false; // the spread waits for the field's first real size
  buildLegend(document.querySelector(".roles-legend"));

  // Colour key; pointing at a theme highlights its bubbles
  function buildLegend(list) {
    if (!list) return;
    for (const [key, theme] of Object.entries(THEMES)) {
      const count = ROLES.filter((r) => r.theme === key).length;
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.style.setProperty("--tint", theme.color);
      btn.innerHTML = `<span class="roles-legend-dot" aria-hidden="true"></span>${theme.label}<span class="roles-legend-count">${count}</span>`;
      const on = () => highlight(key);
      const off = () => highlight(null);
      btn.addEventListener("pointerenter", on);
      btn.addEventListener("pointerleave", off);
      btn.addEventListener("focus", on);
      btn.addEventListener("blur", off);
      li.append(btn);
      list.append(li);
    }
    const current = document.createElement("li");
    current.className = "roles-legend-current";
    current.innerHTML = `<span class="role-current" aria-hidden="true"></span>Current role`;
    list.append(current);
  }

  function highlight(key) {
    field.classList.toggle("filtering", key !== null);
    for (const b of bubbles) b.el.classList.toggle("highlight", b.data.theme === key);
  }

  // --- Hover, hold, and open state ---

  let holdTimer = null;
  let closeTimer = null;
  let typeTimer = null;
  let openBubble = null;
  let cardRect = null; // the open card, in field coordinates

  for (const b of bubbles) {
    b.el.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "touch") return; // taps go through click
      b.pinned = true;
      b.el.classList.add("lit");
      cancelClose();
      if (openBubble === b) return;
      b.el.classList.add("charging");
      holdTimer = setTimeout(() => open(b), HOLD_MS);
    });
    b.el.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "touch") return;
      clearTimeout(holdTimer);
      b.el.classList.remove("charging");
      if (openBubble === b) scheduleClose();
      else release(b);
    });
    b.el.addEventListener("click", () => (openBubble === b ? close() : open(b)));
  }

  card.addEventListener("pointerenter", cancelClose);
  card.addEventListener("pointerleave", scheduleClose);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && openBubble) {
      const b = openBubble;
      close();
      b.el.focus();
    }
  });
  document.addEventListener("pointerdown", (e) => {
    if (openBubble && !openBubble.el.contains(e.target) && !card.contains(e.target)) close();
  });

  function open(b) {
    clearTimeout(holdTimer);
    if (openBubble && openBubble !== b) close();
    openBubble = b;
    b.pinned = true;
    b.vx = b.vy = 0;
    b.el.classList.remove("charging");
    b.el.classList.add("lit", "open");
    b.el.setAttribute("aria-expanded", "true");

    const d = b.data;
    const theme = THEMES[d.theme];
    card.style.setProperty("--tint", theme.color);
    card.querySelector(".role-card-tag").textContent =
      `Role ${String(b.index + 1).padStart(2, "0")} / ${String(bubbles.length).padStart(2, "0")}` +
      (d.current ? " · Current" : "");
    card.querySelector(".role-card-theme").textContent = theme.label;
    card.querySelector(".role-card-org").textContent = d.org;
    card.querySelector(".role-card-role").textContent = d.role;
    const prev = card.querySelector(".role-card-previously");
    prev.textContent = d.previously ? `Previously ${d.previously}` : "";
    prev.hidden = !d.previously;
    card.querySelector(".role-card-period").textContent = d.period;
    card.querySelector(".role-card-tags").textContent = d.tags.join(" · ");
    card.querySelector(".role-card-full").textContent = d.blurb;
    typeOut(card.querySelector(".role-card-typed"), d.blurb);

    card.hidden = false;
    card.classList.remove("pop");
    void card.offsetWidth; // restart the pop-in animation
    card.classList.add("pop");
    positionCard(b);
  }

  function close() {
    if (!openBubble) return;
    const b = openBubble;
    openBubble = null;
    cardRect = null;
    clearInterval(typeTimer);
    card.hidden = true;
    b.el.classList.remove("open");
    b.el.setAttribute("aria-expanded", "false");
    if (!b.el.matches(":hover")) release(b);
  }

  function release(b) {
    b.pinned = false;
    b.el.classList.remove("lit");
  }

  function scheduleClose() {
    cancelClose();
    closeTimer = setTimeout(close, 300);
  }

  function cancelClose() {
    clearTimeout(closeTimer);
  }

  function typeOut(el, text) {
    clearInterval(typeTimer);
    if (reduceMotion) {
      el.textContent = text;
      return;
    }
    let n = 0;
    el.textContent = "";
    typeTimer = setInterval(() => {
      n += 2;
      el.textContent = text.slice(0, n);
      if (n >= text.length) clearInterval(typeTimer);
    }, 16);
  }

  // Beside, below, or above the bubble: whichever fits and covers the fewest
  // other bubbles. On narrow screens the card is a sheet at the bottom of
  // the screen instead, so nothing needs to move.
  function positionCard(b) {
    const sheet = W < 560;
    card.classList.toggle("sheet", sheet);
    if (sheet) {
      card.style.left = card.style.top = "";
      cardRect = null;
      return;
    }
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    const m = 8;
    const sideTop = clamp(b.y - ch / 2, m, H - ch - m);
    const midLeft = clamp(b.x - cw / 2, m, W - cw - m);
    const outward = b.x >= W / 2 ? 0 : 1; // prefer the side facing away from the middle
    const options = [
      { left: b.x + b.r + GAP, top: sideTop, pref: outward },
      { left: b.x - b.r - GAP - cw, top: sideTop, pref: 1 - outward },
      { left: midLeft, top: b.y + b.r + GAP, pref: 2 },
      { left: midLeft, top: b.y - b.r - GAP - ch, pref: 2 },
    ].filter((o) => o.left >= m && o.left + cw <= W - m && o.top >= m && o.top + ch <= H - m);

    const covered = (o) => bubbles.filter((other) => {
      if (other === b) return false;
      const pad = other.r + GAP;
      return other.hx > o.left - pad && other.hx < o.left + cw + pad &&
        other.hy > o.top - pad && other.hy < o.top + ch + pad;
    }).length;
    const best = options
      .map((o) => ({ ...o, score: covered(o) * 10 + o.pref }))
      .sort((a, c) => a.score - c.score)[0] ?? { left: midLeft, top: clamp(b.y + b.r + GAP, m, H - ch - m) };

    card.style.left = `${best.left}px`;
    card.style.top = `${best.top}px`;
    cardRect = { left: best.left, top: best.top, right: best.left + cw, bottom: best.top + ch };
  }

  // --- Physics: gentle wander, soft collisions, and the card as an obstacle ---

  function makeBubble(data, index) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "role-bubble";
    el.dataset.theme = data.theme;
    el.style.setProperty("--tint", THEMES[data.theme].color);
    el.setAttribute("aria-label",
      `${data.role}, ${data.org}${data.current ? ", current" : ""}, ${THEMES[data.theme].label}`);
    el.setAttribute("aria-expanded", "false");
    el.setAttribute("aria-controls", "role-card");
    el.innerHTML = `
      <svg class="role-ring" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="48" pathLength="1" />
      </svg>
      <span class="role-face" aria-hidden="true"></span>`;
    const face = el.querySelector(".role-face");
    if (data.logo) {
      const img = document.createElement("img");
      img.src = data.logo;
      img.alt = "";
      if (data.logoFill) img.className = "fill";
      face.append(img);
    } else {
      face.textContent = data.monogram;
      if (data.monogram.length > 2) face.classList.add("long");
    }
    if (data.current) {
      const dot = document.createElement("span");
      dot.className = "role-current";
      dot.setAttribute("aria-hidden", "true");
      el.append(dot);
    }
    field.append(el);
    return {
      el, data, index,
      x: 0, y: 0, vx: 0, vy: 0,
      r: el.offsetWidth / 2,
      hx: 0, hy: 0, // home spot the bubble rests at
      jx: Math.random() - 0.5, jy: Math.random() - 0.5, // fixed jitter so the cluster looks loose
      pinned: false,
    };
  }

  // Home spots: a tight honeycomb cluster centred in the section. Rows
  // alternate between `cols` and `cols - 1` bubbles, each row centred, so
  // they nest into each other; a little jitter keeps it from looking gridded
  function setHomes() {
    const n = bubbles.length;
    const r = bubbles[0].r;
    const dx = 2 * r + GAP + 6; // centre-to-centre spacing
    const dy = dx * 0.87;
    const fit = Math.max(2, Math.floor((W - 2 * r) / dx) + 1);
    const cols = clamp(Math.round(Math.sqrt(n * 1.4)), 2, fit);
    const rowSizes = [];
    for (let left = n; left > 0; ) {
      const size = Math.min(left, rowSizes.length % 2 ? cols - 1 : cols);
      rowSizes.push(size);
      left -= size;
    }
    let i = 0;
    rowSizes.forEach((size, row) => {
      for (let col = 0; col < size; col++, i++) {
        const b = bubbles[i];
        const x = W / 2 + (col - (size - 1) / 2) * dx;
        const y = H / 2 + (row - (rowSizes.length - 1) / 2) * dy;
        b.hx = clamp(x + b.jx * 8, b.r, W - b.r);
        b.hy = clamp(y + b.jy * 8, b.r, H - b.r);
      }
    });
  }

  function placeInitially() {
    setHomes();
    for (const b of bubbles) {
      b.x = b.hx;
      b.y = b.hy;
      draw(b);
    }
    if (openBubble) positionCard(openBubble); // opened before the first layout
  }

  function step(f) {
    // Spring toward home, or toward the nearest spot beside the open card
    // when home is underneath it; at rest every bubble sits still
    const maxSpeed = 6;
    const damping = Math.pow(0.86, f);
    for (const b of bubbles) {
      if (b.pinned) continue;
      const [ex, ey] = escapeCard(b, b.hx, b.hy);
      b.vx = (b.vx + (b.hx + ex - b.x) * 0.015 * f) * damping;
      b.vy = (b.vy + (b.hy + ey - b.y) * 0.015 * f) * damping;
      const speed = Math.hypot(b.vx, b.vy);
      if (speed > maxSpeed) {
        b.vx *= maxSpeed / speed;
        b.vy *= maxSpeed / speed;
      }
      b.x += b.vx * f;
      b.y += b.vy * f;
    }

    // Then move bubbles directly apart from each other and out of the card,
    // a few passes so a crowd sorts itself out. The card goes last so it
    // always wins; pinned bubbles stay put
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < bubbles.length; i++) {
        for (let j = i + 1; j < bubbles.length; j++) {
          const a = bubbles[i], c = bubbles[j];
          const dx = c.x - a.x, dy = c.y - a.y;
          const dist = Math.hypot(dx, dy) || 0.01;
          const overlap = a.r + c.r + GAP - dist;
          if (overlap <= 0 || (a.pinned && c.pinned)) continue;
          const nx = dx / dist, ny = dy / dist;
          const wa = a.pinned ? 0 : c.pinned ? 1 : 0.5;
          const wc = c.pinned ? 0 : a.pinned ? 1 : 0.5;
          a.x -= nx * overlap * wa; a.y -= ny * overlap * wa;
          c.x += nx * overlap * wc; c.y += ny * overlap * wc;
        }
      }
      for (const b of bubbles) {
        if (b.pinned) continue;
        const [dx, dy] = escapeCard(b, b.x, b.y);
        const len = Math.hypot(dx, dy);
        if (len) {
          const move = Math.min(len, 8 * f); // a quick slide, not a jump
          b.x += (dx / len) * move;
          b.y += (dy / len) * move;
        }
      }
      for (const b of bubbles) {
        b.x = clamp(b.x, b.r, W - b.r);
        b.y = clamp(b.y, b.r, H - b.r);
      }
    }

    for (const b of bubbles) if (!b.pinned) draw(b);
  }

  // Shortest move that takes point (x, y) clear of the open card, or [0, 0]
  function escapeCard(b, x, y) {
    if (!cardRect) return [0, 0];
    const pad = b.r + GAP;
    const l = cardRect.left - pad, r = cardRect.right + pad;
    const t = cardRect.top - pad, btm = cardRect.bottom + pad;
    if (x <= l || x >= r || y <= t || y >= btm) return [0, 0];
    const moves = [[l - x, 0], [r - x, 0], [0, t - y], [0, btm - y]];
    // Only exits that stay in the section and don't run into the open bubble
    const o = openBubble;
    const inside = moves.filter(([dx, dy]) => {
      const nx = x + dx, ny = y + dy;
      const clearOfOpen = !o || Math.hypot(nx - o.x, ny - o.y) >= o.r + b.r + GAP;
      return nx >= b.r && nx <= W - b.r && ny >= b.r && ny <= H - b.r && clearOfOpen;
    });
    return (inside.length ? inside : moves)
      .reduce((a, c) => (Math.hypot(...c) < Math.hypot(...a) ? c : a));
  }

  function draw(b) {
    b.el.style.transform = `translate(${b.x - b.r}px, ${b.y - b.r}px)`;
  }

  // Only animate while the field is on screen
  let running = false;
  let last = 0;
  function frame(now) {
    if (!running) return;
    const f = Math.min((now - last) / (1000 / 60), 3);
    last = now;
    if (placed) step(f);
    requestAnimationFrame(frame);
  }
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    } else if (!entry.isIntersecting) {
      running = false;
    }
  }).observe(field);

  new ResizeObserver(() => {
    W = field.clientWidth;
    H = field.clientHeight;
    if (!W || !H) return;
    if (!placed) {
      placed = true;
      for (const b of bubbles) b.r = b.el.offsetWidth / 2;
      placeInitially();
      return;
    }
    for (const b of bubbles) b.r = b.el.offsetWidth / 2;
    setHomes();
    for (const b of bubbles) {
      b.x = clamp(b.x, b.r, W - b.r);
      b.y = clamp(b.y, b.r, H - b.r);
      draw(b);
    }
    if (openBubble) positionCard(openBubble);
  }).observe(field);
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
