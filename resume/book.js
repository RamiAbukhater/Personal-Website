import { RESUME } from './resume-data.js';

// --- Building the pages from the data ---

// Children may be nested arrays; null and false are skipped
function flatten(children) {
  return children.flat(Infinity).filter((c) => c != null && c !== false);
}

// h('p', { class: 'x' }, 'text', child) → <p class="x">text…</p>
function h(tag, attrs = {}, ...children) {
  let el = document.createElement(tag);
  for (let [name, value] of Object.entries(attrs)) {
    if (value != null) el.setAttribute(name, value);
  }
  el.append(...flatten(children));
  return el;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

// "2026-09" → <time datetime="2026-09">September 2026</time>
function time(date) {
  if (date === 'present') return 'Present';
  let [year, month] = date.split('-');
  return h('time', { datetime: date }, month ? `${MONTHS[month - 1]} ${year}` : year);
}

// { start, end, prefix } → "September 2026 – Present", "Expected June 2027", …
function when({ start, end, prefix }) {
  let parts = [];
  if (prefix) parts.push(prefix + ' ');
  if (start) parts.push(time(start), ' – ');
  if (end) parts.push(time(end));
  return parts;
}

function link({ label, href }) {
  let external = href.startsWith('http');
  return h('a', { href, target: external ? '_blank' : null, rel: external ? 'noopener' : null }, label);
}

function entry(e) {
  return h('article', { class: 'entry' },
    h('h3', {}, e.title),
    h('p', { class: 'when' }, when(e.when)),
    h('p', { class: 'org' }, e.org),
    e.note && h('p', { class: 'note' }, e.note),
    e.text && h('p', {}, e.text),
    e.bullets && h('ul', {}, e.bullets.map((b) => h('li', {}, b))),
    e.link && h('p', { class: 'entry-link' }, link(e.link)),
  );
}

const RENDER = {
  prose: (s) => h('p', {}, s.text),
  entries: (s) => s.entries.map(entry),
  list: (s) => [
    s.intro && h('p', {}, s.intro.text, link(s.intro.link), s.intro.after),
    h('ul', { class: 'plain-list' }, s.items.map((item) =>
      h('li', {}, item.text, h('span', { class: 'when' }, when(item.when))))),
  ],
  skills: (s) => h('dl', {}, s.groups.map((g) => [h('dt', {}, g.label), h('dd', {}, g.items)])),
};

function section(s) {
  return h('section', { id: s.id }, h('h2', {}, s.title), RENDER[s.type](s));
}

function masthead(p) {
  return h('header', { class: 'masthead' },
    h('h1', {}, p.name),
    h('p', { class: 'headline' }, p.headline),
    h('p', { class: 'contact' }, p.location, p.links.map((l) => [' · ', link(l)])),
  );
}

function runningHead(left, right) {
  return h('p', { class: 'running-head', 'aria-hidden': 'true' }, h('span', {}, left), h('span', {}, right));
}

function render(resume) {
  let byId = Object.fromEntries(resume.sections.map((s) => [s.id, s]));
  let pages = [
    ['.page-left', resume.spread.left, 'i'],
    ['.page-right', resume.spread.right, 'ii'],
  ];

  for (let [selector, ids, folio] of pages) {
    let page = document.querySelector(selector);
    page.append(...flatten([
      runningHead(resume.cover.title, resume.cover.subtitle),
      folio === 'i' ? masthead(resume.person) : null,
      ids.map((id) => section(byId[id])),
      h('p', { class: 'folio', 'aria-hidden': 'true' }, folio),
    ]));
  }

  document.querySelector('.cover-title').textContent = resume.cover.title;
  document.querySelector('.cover-subtitle').textContent = resume.cover.subtitle;
  document.querySelector('.cover-volume').textContent = resume.cover.volume;
}

render(RESUME);

// --- Opening the book: closed → open (the cover swings) → settled ---

let book = document.querySelector('.book');
let cover = book.querySelector('.cover');
let skipButton = document.querySelector('.book-skip');
let replayButton = document.querySelector('.book-replay');
let timer;

function showButtons(state) {
  let hadFocus = document.activeElement;
  skipButton.hidden = state === 'settled';
  replayButton.hidden = state !== 'settled';
  if (hadFocus === skipButton && skipButton.hidden) replayButton.focus();
  if (hadFocus === replayButton && replayButton.hidden) skipButton.focus();
}

function settle() {
  clearTimeout(timer);
  book.dataset.state = 'settled';
  showButtons('settled');
}

function open() {
  if (book.dataset.state !== 'closed') return;
  clearTimeout(timer);
  book.dataset.state = 'open';
  // The cover's last move is its fade; the timer covers a missed transitionend
  let openTime = parseFloat(getComputedStyle(book).getPropertyValue('--open-time')) || 1.5;
  timer = setTimeout(settle, openTime * 1000 + 1500);
}

let coverBack = cover.querySelector('.cover-back');

cover.addEventListener('transitionend', (event) => {
  if (event.target === coverBack && event.propertyName === 'opacity' && book.dataset.state === 'open') {
    settle();
  }
});

// Jump to a state with no transitions, then let them back on
function jumpTo(state) {
  clearTimeout(timer);
  book.classList.add('instant');
  book.dataset.state = state;
  book.offsetWidth; // apply the jump before transitions return
  book.classList.remove('instant');
}

skipButton.addEventListener('click', () => {
  jumpTo('settled');
  showButtons('settled');
});

replayButton.addEventListener('click', () => {
  jumpTo('closed');
  showButtons('closed');
  book.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  timer = setTimeout(open, 700);
});

// Clicking the closed cover opens it straight away
cover.addEventListener('click', open);

document.querySelector('.book-print').addEventListener('click', () => print());

if (book.dataset.state === 'settled') {
  // prefers-reduced-motion: an inline script already opened it; replay fades instead of swinging
  showButtons('settled');
} else {
  timer = setTimeout(open, 600);
}
