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

// --- Theme button: each click steps through Automatic → Light → Dark ---

// Each value is what the color-scheme property gets set to
const SCHEMES = [
  {
    value: 'light dark',
    name: 'Automatic',
    // Half sun, half shade: follows the OS setting
    icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" /><path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" /></svg>`,
  },
  {
    value: 'light',
    name: 'Light',
    icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" /></svg>`,
  },
  {
    value: 'dark',
    name: 'Dark',
    icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" /></svg>`,
  },
];

let prefersDark = matchMedia('(prefers-color-scheme: dark)');

(header ?? document.body).insertAdjacentHTML(
  header ? 'beforeend' : 'afterbegin',
  `<button class="color-scheme" type="button"></button>`,
);

let button = document.querySelector('.color-scheme');
let current = 0;

function setColorScheme(colorScheme) {
  current = Math.max(SCHEMES.findIndex((s) => s.value === colorScheme), 0);
  let scheme = SCHEMES[current];
  let next = SCHEMES[(current + 1) % SCHEMES.length];
  document.documentElement.style.setProperty('color-scheme', scheme.value);

  // e.g. "Theme: Automatic (Dark). Click for Light"
  let name = scheme.name;
  if (scheme.value === 'light dark') {
    name += ` (${prefersDark.matches ? 'Dark' : 'Light'})`;
  }
  button.innerHTML = scheme.icon;
  button.title = `Theme: ${name}. Click for ${next.name}`;
  button.setAttribute('aria-label', button.title);
}

if ('colorScheme' in localStorage) {
  setColorScheme(localStorage.colorScheme);
} else {
  setColorScheme('light'); // new visitors start in daytime
}

// Keep the "Automatic (Dark/Light)" label right if the OS setting changes
prefersDark.addEventListener('change', () => setColorScheme(SCHEMES[current].value));

button.addEventListener('click', function () {
  let colorScheme = SCHEMES[(current + 1) % SCHEMES.length].value;
  console.log('color scheme changed to', colorScheme);
  document.documentElement.classList.add('theme-changing'); // lets the home page fade
  setColorScheme(colorScheme);
  localStorage.colorScheme = colorScheme;
});

// The contact form is handled by contact/contact.js

// --- Project data: loaded from lib/projects.json and rendered by the pages that list projects ---

export async function fetchJSON(url) {
  try {
    // Fetch the JSON file from the given URL
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

// Paths in the JSON are from the site root, so they work from any page depth
function sitePath(path) {
  return /^(https?:)?\/\//.test(path) ? path : BASE_PATH + path;
}

// The projects page passes { style: 'card' } for its illustrated GitHub cards;
// everywhere else gets the plain article layout
export function renderProjects(projects, containerElement, headingLevel = 'h2', { style = 'plain' } = {}) {
  if (!(containerElement instanceof Element)) {
    console.error('renderProjects needs a container element, got', containerElement);
    return;
  }

  // Anything but h1–h6 falls back to h2
  if (!/^h[1-6]$/i.test(headingLevel)) {
    headingLevel = 'h2';
  }

  // Start from an empty container so re-rendering never duplicates cards
  containerElement.innerHTML = '';

  if (!Array.isArray(projects) || projects.length === 0) {
    containerElement.innerHTML = '<p class="projects-empty">No projects to show yet.</p>';
    return;
  }

  for (let project of projects) {
    if (style === 'card') {
      containerElement.appendChild(projectCard(project, headingLevel));
      continue;
    }

    const article = document.createElement('article');

    // Bullet points when the project has them, otherwise the one-line description
    let details = project.bullets?.length
      ? `<ul>${project.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>`
      : `<p>${project.description ?? ''}</p>`;

    article.innerHTML = `
      <${headingLevel}>${project.title}</${headingLevel}>
      <img src="${sitePath(project.image ?? 'https://dsc106.com/labs/lab02/images/empty.svg')}" alt="${project.alt ?? project.title}" />
      <div>
        <p><time datetime="${project.year}">${project.date ?? project.year}</time></p>
        ${project.stack ? `<p>${project.stack}</p>` : ''}
        ${details}
        ${project.url ? `<p><a href="${sitePath(project.url)}" target="_blank">${project.linkText ?? 'Learn more'}</a></p>` : ''}
      </div>
    `;

    containerElement.appendChild(article);
  }
}

// One illustrated card: island art, status line, title, summary, tags, and links.
// repo: a URL, null while the repo link is still to be added, or false for no GitHub link.
function projectCard(project, headingLevel) {
  const article = document.createElement('article');
  article.className = 'project-card';

  let status =
    project.badge === 'current' ? '<span class="status current">Current</span>'
    : project.badge === 'award' ? `<span class="status award">${project.badgeText ?? 'Award'}</span>`
    : `<span class="status">${project.year}</span>`;

  // TODO repo links point at the GitHub profile until the real repo is added
  let repo =
    project.repo === false ? ''
    : project.repo ? `<a class="repo" href="${project.repo}" target="_blank">GitHub</a>`
    : '<a class="repo" href="https://github.com/RamiAbukhater" target="_blank" data-todo="repo-url">GitHub</a>';

  // A second link only when it goes somewhere other than the repo
  let more = project.url && project.url !== project.repo
    ? `<a class="more" href="${sitePath(project.url)}" target="_blank">${project.moreText ?? project.linkText ?? 'Learn more'}</a>`
    : '';

  article.innerHTML = `
    <div class="art">
      <img src="${sitePath(project.image ?? 'https://dsc106.com/labs/lab02/images/empty.svg')}" width="400" height="250" alt="${project.alt ?? ''}" loading="lazy" />
    </div>
    <div class="body">
      <p class="meta">${status}${project.meta ? ` <span>${project.meta}</span>` : ''}</p>
      <${headingLevel}>${project.shortTitle ?? project.title}</${headingLevel}>
      <p class="summary">${project.summary ?? project.description ?? ''}</p>
      ${project.tags?.length ? `<ul class="tags" aria-label="Tags">${project.tags.map((t) => `<li>${t}</li>`).join('')}</ul>` : ''}
      <div class="actions">${repo}${more}</div>
    </div>
  `;

  return article;
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}
