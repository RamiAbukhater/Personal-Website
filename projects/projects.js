import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');

const current = projects.filter((p) => p.status === 'current');
const past = projects.filter((p) => p.status !== 'current');

renderProjects(current, document.querySelector('#current-projects'), 'h3');
renderProjects(past, document.querySelector('#past-projects'), 'h3');

// The count comes from the data, so it stays right as projects are added
const title = document.querySelector('.projects-title');
title.textContent = `${projects.length} Projects`;
