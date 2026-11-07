import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');

// One card grid per field section; projects go to the grid matching their "field"
const fieldGrids = [...document.querySelectorAll('.project-grid[data-field]')];
const noMatches = document.querySelector('#no-matches');

// The count comes from the data, so it stays right as projects are added
const title = document.querySelector('.projects-title');
title.textContent = `${projects.length} Projects`;

// --- Pie chart and legend: projects per year ---

// The header's theme button also holds an svg, so select the chart by id
const svg = d3.select('#projects-pie-plot');
const legend = d3.select('.legend');

const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
const sliceGenerator = d3.pie().value((d) => d.value);

// Colors are keyed by year, so a year keeps its color when a search removes others.
// These are the theme colors from the home page's roles section.
const colors = d3.scaleOrdinal(['#2c5aa0', '#c08a1e', '#2a7f78', '#b23a48']);

// The two filters: both are kept here so that either one can change without losing the other
let query = '';
let selectedYear = null;

function matchesQuery(project) {
  let values = Object.values(project).join('\n').toLowerCase();
  return values.includes(query.toLowerCase());
}

function renderVisibleProjects() {
  let visible = projects
    .filter(matchesQuery)
    .filter((project) => selectedYear === null || project.year === selectedYear);
  // Current work first within each field
  let order = (p) => (p.status === 'current' ? 0 : 1);

  for (let grid of fieldGrids) {
    let inField = visible
      .filter((p) => p.field === grid.dataset.field)
      .sort((a, b) => order(a) - order(b));

    renderProjects(inField, grid, 'h3', { style: 'card' });

    // Hide a field with nothing in it
    grid.closest('.field').hidden = inField.length === 0;
  }

  noMatches.hidden = visible.length > 0;
}

function highlightSelectedYear() {
  let isSelected = (d) => (d.label === selectedYear ? 'selected' : null);
  svg.selectAll('path').attr('class', (d) => isSelected(d.data));
  legend.selectAll('li').attr('class', (d) => `legend-item ${isSelected(d) ?? ''}`.trim());
}

function toggleYear(year) {
  selectedYear = selectedYear === year ? null : year;
  highlightSelectedYear();
  renderVisibleProjects();
}

function renderPieChart(projectsGiven) {
  let rolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year,
  );
  let data = rolledData.map(([year, count]) => {
    return { value: count, label: year };
  });
  let arcData = sliceGenerator(data);

  svg.selectAll('path').remove();
  legend.selectAll('li').remove();

  arcData.forEach((slice) => {
    let { label, value } = slice.data;
    svg
      .append('path')
      .datum(slice)
      .attr('d', arcGenerator(slice))
      .attr('fill', colors(label))
      .on('click', () => toggleYear(label))
      .append('title')
      .text(`${label}: ${value}`);
  });

  data.forEach((d) => {
    legend
      .append('li')
      .datum(d)
      .attr('class', 'legend-item')
      .attr('style', `--color:${colors(d.label)}`)
      .html(`<button type="button"><span class="swatch"></span> ${d.label} <em>(${d.value})</em></button>`)
      .select('button')
      .on('click', () => toggleYear(d.label));
  });

  highlightSelectedYear();
}

// --- Search: the chart counts what matches, so its slices stay clickable while searching ---

const searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', (event) => {
  query = event.target.value;
  renderPieChart(projects.filter(matchesQuery));
  renderVisibleProjects();
});

renderPieChart(projects);
renderVisibleProjects();
