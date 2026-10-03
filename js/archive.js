import { wireProjectDeletion } from './projectDeleteUI.js?v=2';
import { getState, requireSession, wireLogout, escapeHtml } from './supabaseClient.js?v=8';
import { archiveEntries } from './archiveView.js';
const session = requireSession();
if (!session) throw new Error('No session');
wireLogout();
wireProjectDeletion(session);
const state = getState();
const {projects, tasks} = archiveEntries(state, session.id);
const dateLabel = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US');
};
const projectRows = projects.map(project => {
  const projectTasks = state.tasks.filter(task => task.project_id === project.id && task.user_id === session.id);
  const complete = projectTasks.length > 0 && projectTasks.every(task => task.completed);
  return `<div class="archive-project-entry"><a class="archive-item" href="project.html?id=${encodeURIComponent(project.id)}"><div><h3>${escapeHtml(project.name)}</h3><p>${escapeHtml(project.goal || '')}</p></div><span class="archive-date">${dateLabel(project.updated_at)} · ${complete ? 'Completed' : 'Archived'} →</span></a><button type="button" class="button button-ghost button-small" data-delete-project="${project.id}" aria-label="${escapeHtml(project.name)} Delete project">Delete</button></div>`;
}).join('');
const taskRows = tasks.map(task => {
  const project = state.projects.find(project => project.id === task.project_id);
  return `<a class="archive-item" href="project.html?id=${encodeURIComponent(task.project_id)}"><div><h3>✓ ${escapeHtml(task.title)}</h3><p>${escapeHtml(project.name)}</p></div><span class="archive-date">${dateLabel(task.updated_at)} · Completed →</span></a>`;
}).join('');
document.querySelector('#archive-list').innerHTML = `
  <section class="archive-group"><div class="section-heading"><h2>Projects</h2><span class="archive-count">${projects.length}</span></div>${projectRows || '<p class="archive-empty">No completed projects yet.</p>'}</section>
  <section class="archive-group"><div class="section-heading"><h2>Completed tasks</h2><span class="archive-count">${tasks.length}</span></div>${taskRows || '<p class="archive-empty">No completed tasks yet.</p>'}</section>`;

