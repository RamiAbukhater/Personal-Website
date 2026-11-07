import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');

// Each field section gets the projects tagged with its "field", current work first
const order = (p) => (p.status === 'current' ? 0 : 1);

for (const grid of document.querySelectorAll('.project-grid[data-field]')) {
  const inField = projects
    .filter((p) => p.field === grid.dataset.field)
    .sort((a, b) => order(a) - order(b));

  renderProjects(inField, grid, 'h3', { style: 'card' });
}

// The count comes from the data, so it stays right as projects are added
const title = document.querySelector('.projects-title');
title.textContent = `${projects.length} Projects`;
