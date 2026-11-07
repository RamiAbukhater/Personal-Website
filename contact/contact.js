// Contact page: the visitor writes a letter, seals it, and a messenger bird
// carries it out of the window. Letters are delivered by Formspree, since the
// site is static and has no server of its own.

// ┌──────────────────────────────────────────────────────────────────────────┐
// │ TODO(Rami): paste your Formspree form endpoint here, for example         │
// │ "https://formspree.io/f/xyzabcde". Until it is set, Send falls back to   │
// │ opening the visitor's own mail app with the letter filled in.            │
// └──────────────────────────────────────────────────────────────────────────┘
const FORM_ENDPOINT = "https://formspree.io/f/YOUR_FORM_ID";
const EMAIL = "Rami.Abukhaters@gmail.com";

// Once a letter has gone, a bird circles the island on the home page (see addBird() in hero.js)
const BIRD_FLAG = "letterSent";

// For testing without sending anything: ?send=ok or ?send=fail pretends to deliver
const fakeSend = new URLSearchParams(location.search).get("send");

const form = document.querySelector(".letter");
const fields = {
  message: form.elements.message,
  name: form.elements.name,
  email: form.elements.email,
};
const status = form.querySelector(".letter-status");
const sealLabel = form.querySelector(".seal-label");
const sent = document.querySelector(".sent");
const sentNote = sent.querySelector(".sent-note");
const windowScene = document.querySelector(".window");
const bird = windowScene.querySelector(".bird");
const hop = windowScene.querySelector(".bird-hop");
const head = windowScene.querySelector(".bird-head");
const wing = windowScene.querySelector(".bird-wing");
const eye = windowScene.querySelector(".bird-eye");
const birdScroll = windowScene.querySelector(".bird-scroll");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

form.querySelector(".letter-date").textContent = new Date().toLocaleDateString("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

// --- The bird, idling on its perch ---

const idleMoves = {
  blink() {
    eye.animate([{ transform: "scaleY(1)" }, { transform: "scaleY(0.1)" }, { transform: "scaleY(1)" }], { duration: 180 });
  },
  look(angle = [-14, 10, -6, 16][Math.floor(Math.random() * 4)]) {
    head.animate(
      [
        { transform: "rotate(0deg)" },
        { transform: `rotate(${angle}deg)`, offset: 0.2 },
        { transform: `rotate(${angle}deg)`, offset: 0.8 },
        { transform: "rotate(0deg)" },
      ],
      { duration: 1600, easing: "ease-in-out" },
    );
  },
  hop() {
    hop.animate(
      [{ transform: "translateY(0)" }, { transform: "translateY(-12px)", easing: "ease-in" }, { transform: "translateY(0)" }],
      { duration: 360, easing: "ease-out", iterations: Math.random() < 0.4 ? 2 : 1 },
    );
  },
  ruffle() {
    wing.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(14deg)" }, { transform: "rotate(-4deg)" }, { transform: "rotate(0deg)" }], {
      duration: 420,
    });
  },
};

let idleTimer = 0;
function idle() {
  const r = Math.random();
  const move = r < 0.35 ? "blink" : r < 0.7 ? "look" : r < 0.9 ? "hop" : "ruffle";
  idleMoves[move]();
  idleTimer = setTimeout(idle, 1400 + Math.random() * 2600);
}

function startIdle() {
  stopIdle();
  if (!reducedMotion.matches) idleTimer = setTimeout(idle, 1200);
}

function stopIdle() {
  clearTimeout(idleTimer);
}

// The bird glances over when someone starts writing
form.addEventListener("focusin", () => {
  if (!reducedMotion.matches && !busy) idleMoves.look(12);
});

startIdle();

// --- Checking the letter before it goes ---

function problemWith(name) {
  const field = fields[name];
  const value = field.value.trim();
  if (name === "message") {
    if (!value) return "Write a few words before sealing the letter.";
    if (value.length < 10) return "A little longer, please: at least 10 characters.";
  }
  if (name === "name" && !value) return "Sign your name so I know who wrote.";
  if (name === "email") {
    if (!value) return "Add your email so I can write back.";
    if (field.validity.typeMismatch || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "That email address doesn't look quite right.";
  }
  return "";
}

function check(name) {
  const problem = problemWith(name);
  const field = fields[name];
  field.setAttribute("aria-invalid", problem ? "true" : "false");
  document.getElementById(field.getAttribute("aria-describedby")).textContent = problem;
  return !problem;
}

let triedToSend = false;
for (const name of Object.keys(fields)) {
  // After the first attempt, clear each message as soon as it is fixed
  fields[name].addEventListener("input", () => triedToSend && check(name));
}

// --- Sending ---

function mailtoURL(data) {
  const subject = `A letter from ${data.get("name")}`;
  const body = `${data.get("message")}\n\n${data.get("name")}\n${data.get("email")}`;
  return `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// Resolves to { ok, mode } on success or { ok: false, reason } on failure
async function deliver(data) {
  if (fakeSend) {
    await wait(900);
    return fakeSend === "fail" ? { ok: false, reason: "the test asked it not to (?send=fail)" } : { ok: true, mode: "post" };
  }
  // Bots fill in the hidden field; let them think it worked
  if (data.get("_gotcha")) return { ok: true, mode: "post" };

  if (FORM_ENDPOINT.includes("YOUR_FORM_ID")) {
    location.href = mailtoURL(data);
    return { ok: true, mode: "mailto" };
  }

  try {
    data.set("_subject", `A letter from ${data.get("name")}`);
    const response = await fetch(FORM_ENDPOINT, { method: "POST", body: data, headers: { Accept: "application/json" } });
    if (response.ok) return { ok: true, mode: "post" };
    const result = await response.json().catch(() => ({}));
    const reason = result.errors?.map((e) => e.message).join(", ") || `the post office said no (error ${response.status})`;
    return { ok: false, reason };
  } catch {
    return { ok: false, reason: "it couldn't reach the post office. Check your connection" };
  }
}

let busy = false;
function setBusy(value) {
  busy = value;
  form.setAttribute("aria-busy", busy);
  sealLabel.textContent = busy ? "Sealing…" : "Seal & send";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy) return;

  triedToSend = true;
  const valid = Object.keys(fields).map(check);
  const firstProblem = Object.keys(fields).find((name, i) => !valid[i]);
  if (firstProblem) {
    fields[firstProblem].focus();
    return;
  }

  status.textContent = "";
  setBusy(true);
  const result = await deliver(new FormData(form));

  if (!result.ok) {
    // The letter stays on the desk and the bird stays put
    setBusy(false);
    status.innerHTML = `The bird couldn't take off: ${escapeHTML(result.reason)}. Your letter is still here, so try again in a moment, or email me at <a href="mailto:${EMAIL}">${EMAIL}</a>.`;
    idleMoves.look(-10);
    return;
  }

  try {
    localStorage.setItem(BIRD_FLAG, "1");
  } catch {
    // Storage can be blocked; the home page just won't get its bird
  }

  sentNote.textContent =
    result.mode === "mailto"
      ? "Your mail app should have opened with the letter written out. Press send there and it is on its way."
      : "The bird knows the way. I usually write back within a few days.";

  stopIdle();
  await (reducedMotion.matches ? fadeAway() : rollAndFly());
  setBusy(false);
  showSent();
});

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// --- The send animation ---

const ROLL_HEIGHT = 28;

// Smooth-scroll an element to the top of the page and wait until it gets there
// (browsers without the scrollend event just wait a moment instead)
function scrollIntoPlace(element) {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      removeEventListener("scrollend", done);
      resolve();
    };
    const timer = setTimeout(done, 1500);
    addEventListener("scrollend", done);
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

// The letter rolls up from the bottom into a scroll, the scroll flies to the
// bird's feet, and the bird turns and flies out of the window
async function rollAndFly() {
  // Bring the window and the top of the letter into view, so both ends of the hand-over show
  const scene = document.querySelector(".scene");
  const top = scene.getBoundingClientRect().top;
  if (top < 0 || top > innerHeight * 0.3) await scrollIntoPlace(scene);

  // The roll starts at the foot of the letter and rolls the paper up into itself.
  // It is placed in page coordinates, so it stays with the letter if the page scrolls.
  const box = form.getBoundingClientRect();
  const r = { left: box.left + scrollX, top: box.top + scrollY, width: box.width, height: box.height };
  const roll = document.createElement("div");
  roll.className = "roll";
  Object.assign(roll.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px` });
  document.body.append(roll);

  const rolling = { duration: 1100, easing: "cubic-bezier(.45,0,.55,1)", fill: "forwards" };
  form.animate([{ clipPath: "inset(0 0 0 0)" }, { clipPath: "inset(0 0 100% 0)" }], rolling);
  await roll.animate(
    [{ transform: `translateY(${r.height - ROLL_HEIGHT / 2}px) scaleY(0.5)` }, { transform: `translateY(${-ROLL_HEIGHT / 2}px) scaleY(1)` }],
    rolling,
  ).finished;
  form.style.visibility = "hidden";

  // Tie it with a ribbon and send it over to the bird, in a little arc
  roll.style.setProperty("--ribbon", 1);
  const t = birdScroll.getBoundingClientRect();
  const [sx, sy] = [t.width / r.width, t.height / ROLL_HEIGHT];
  const [dx, dy] = [t.left + scrollX - r.left, t.top + scrollY - r.top];
  const lift = Math.min(0, dy) - 70;
  await roll.animate(
    [
      { transform: `translate(0px, ${-ROLL_HEIGHT / 2}px) scale(1, 1)` },
      { transform: `translate(${dx * 0.55}px, ${lift}px) scale(${sx + (1 - sx) * 0.3}, ${sy + (1 - sy) * 0.3})`, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
    ],
    { duration: 1000, easing: "ease-in-out", fill: "forwards" },
  ).finished;
  roll.remove();
  windowScene.classList.add("has-scroll");

  // A happy little hop, a look out of the window, and away
  await hop.animate([{ transform: "translateY(0)" }, { transform: "translateY(-10px)" }, { transform: "translateY(0)" }], { duration: 340 }).finished;
  await head.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(-16deg)" }, { transform: "rotate(0deg)" }], { duration: 700, easing: "ease-in-out" }).finished;

  // Positions are in the bird's own units: the far island is about (-46, -90) from the perch
  const flap = wing.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(55deg)" }, { transform: "rotate(-20deg)" }, { transform: "rotate(0deg)" }], {
    duration: 240,
    iterations: Infinity,
  });
  await bird.animate(
    [
      { transform: "translate(0px, 0px) scale(1, 1)", opacity: 1 },
      { transform: "translate(5px, -19px) scale(1, 1)", offset: 0.12 },
      { transform: "translate(2px, -31px) scale(-0.92, 0.92)", offset: 0.24 },
      { transform: "translate(-23px, -64px) scale(-0.6, 0.6)", offset: 0.55 },
      { transform: "translate(-39px, -81px) scale(-0.3, 0.3)", offset: 0.8, opacity: 1 },
      { transform: "translate(-46px, -89px) scale(-0.06, 0.06)", opacity: 0 },
    ],
    { duration: 3200, easing: "ease-in-out", fill: "forwards" },
  ).finished;
  flap.cancel();
}

// With reduced motion: the letter and the bird simply fade away
async function fadeAway() {
  const fade = { duration: 500, fill: "forwards" };
  bird.animate([{ opacity: 1 }, { opacity: 0 }], fade);
  await form.animate([{ opacity: 1 }, { opacity: 0 }], fade).finished;
  form.style.visibility = "hidden";
}

function showSent() {
  sent.hidden = false;
  sent.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: reducedMotion.matches ? 300 : 700, easing: "ease-out" });
  sent.focus({ preventScroll: true });
  const s = sent.getBoundingClientRect();
  if (s.top < 0 || s.bottom > innerHeight) sent.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "center" });
}

// --- Writing another letter: a fresh sheet, and a new bird lands on the perch ---

sent.querySelector("button").addEventListener("click", () => {
  for (const element of [form, bird, hop, head, wing]) element.getAnimations().forEach((a) => a.cancel());
  form.reset();
  triedToSend = false;
  for (const name of Object.keys(fields)) {
    fields[name].removeAttribute("aria-invalid");
    document.getElementById(fields[name].getAttribute("aria-describedby")).textContent = "";
  }
  windowScene.classList.remove("has-scroll");
  sent.hidden = true;
  form.style.visibility = "";

  const arrive = reducedMotion.matches
    ? [{ opacity: 0 }, { opacity: 1 }]
    : [{ opacity: 0, transform: "translate(-30px, -60px) scale(0.6)" }, { opacity: 1, transform: "none" }];
  bird.animate(arrive, { duration: 700, easing: "ease-out" });
  form.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400 });
  fields.message.focus();
  startIdle();
});
