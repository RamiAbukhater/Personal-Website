console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// --- Navigation menu, built from one list of pages ---

let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'resume/', title: 'Resume' },
  { url: 'contact/', title: 'Contact' },
  { url: 'https://github.com/RamiAbukhater', title: 'GitHub' },
];

// Locally the site is served from the root; on GitHub Pages it lives under the repo name
const BASE_PATH =
  location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? '/'
    : '/Personal-Website/';

let nav = document.createElement('nav');

// The nav sits in the sticky header beside the name, or at the top of the page if there is none
let header = document.querySelector('.site-header');
if (header) {
  header.append(nav);
} else {
  document.body.prepend(nav);
}

for (let p of pages) {
  let url = p.url;
  let title = p.title;

  url = !url.startsWith('http') ? BASE_PATH + url : url;

  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;

  let isCurrent = a.host === location.host && a.pathname === location.pathname;
  a.classList.toggle('current', isCurrent);
  if (isCurrent) {
    a.setAttribute('aria-current', 'page');
  }

  // External links open in a new tab
  if (a.host !== location.host) {
    a.target = '_blank';
  }

  nav.append(a);
}

// --- Theme switcher: Automatic, Light, or Dark ---

let prefersDark = matchMedia('(prefers-color-scheme: dark)');

(header ?? document.body).insertAdjacentHTML(
  header ? 'beforeend' : 'afterbegin',
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>`,
);

let select = document.querySelector('.color-scheme select');

// Show which way "Automatic" currently resolves, e.g. "Automatic (Dark)"
function updateAutomaticLabel() {
  select.options[0].textContent = `Automatic (${prefersDark.matches ? 'Dark' : 'Light'})`;
}

function setColorScheme(colorScheme) {
  document.documentElement.style.setProperty('color-scheme', colorScheme);
  select.value = colorScheme;
}

updateAutomaticLabel();
prefersDark.addEventListener('change', updateAutomaticLabel);

if ('colorScheme' in localStorage) {
  setColorScheme(localStorage.colorScheme);
}

select.addEventListener('input', function (event) {
  console.log('color scheme changed to', event.target.value);
  setColorScheme(event.target.value);
  localStorage.colorScheme = event.target.value;
});

// --- Contact form: build the mailto: URL ourselves so spaces are encoded as %20, not + ---

let form = document.querySelector('form');

form?.addEventListener('submit', function (event) {
  event.preventDefault();

  let data = new FormData(form);
  let params = [];

  for (let [name, value] of data) {
    params.push(`${name}=${encodeURIComponent(value)}`);
  }

  let url = form.action + '?' + params.join('&');
  location.href = url;
});
