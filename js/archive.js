import { getState, requireSession, wireLogout, escapeHtml } from './supabaseClient.js?v=3';
import { archiveEntries } from './archiveView.js';
const session = requireSession();
if (!session) throw new Error('No session');
wireLogout();
const state = getState();
const {projects, tasks} = archiveEntries(state, session.id);
const dateLabel = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('ko-KR');
};
const projectRows = projects.map(project => {
  const projectTasks = state.tasks.filter(task => task.project_id === project.id && task.user_id === session.id);
  const complete = projectTasks.length > 0 && projectTasks.every(task => task.completed);
  return `<a class="archive-item" href="project.html?id=${encodeURIComponent(project.id)}"><div><h3>${escapeHtml(project.name)}</h3><p>${escapeHtml(project.goal || '')}</p></div><span class="archive-date">${dateLabel(project.updated_at)} · ${complete ? '모든 작업 완료' : '보관됨'} →</span></a>`;
}).join('');
const taskRows = tasks.map(task => {
  const project = state.projects.find(project => project.id === task.project_id);
  return `<a class="archive-item" href="project.html?id=${encodeURIComponent(task.project_id)}"><div><h3>✓ ${escapeHtml(task.title)}</h3><p>${escapeHtml(project.name)}</p></div><span class="archive-date">${dateLabel(task.updated_at)} · 완료 →</span></a>`;
}).join('');
document.querySelector('#archive-list').innerHTML = `
  <section class="archive-group"><div class="section-heading"><h2>완료·보관한 프로젝트</h2><span class="archive-count">${projects.length}개</span></div>${projectRows || '<p class="archive-empty">모든 작업을 완료한 프로젝트가 여기에 표시됩니다.</p>'}</section>
  <section class="archive-group"><div class="section-heading"><h2>완료한 작업</h2><span class="archive-count">${tasks.length}개</span></div>${taskRows || '<p class="archive-empty">작업의 완료 체크박스를 선택하면 여기에 표시됩니다.</p>'}</section>`;
