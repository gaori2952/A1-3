import { getState, saveState, requireSession, projectProgress, id, wireLogout, escapeHtml } from './supabaseClient.js?v=3';

const session = requireSession();
if (!session) throw new Error('No session');
wireLogout();
const state = getState();
const projectId = new URLSearchParams(location.search).get('id');
const project = state.projects.find(item => item.id === projectId && item.user_id === session.id);
if (!project) location.href = 'index.html';
const header = document.querySelector('#project-header');
const taskList = document.querySelector('#task-list');
const issueList = document.querySelector('#issue-list');
const labels = { low: '낮음', medium: '보통', high: '높음' };

function render() {
  const tasks = state.tasks.filter(task => task.project_id === projectId);
  const issues = state.issues.filter(issue => issue.project_id === projectId);
  const progress = projectProgress(projectId, state);
  header.innerHTML = `<div><p class="eyebrow">${(project.project_type || 'project').toUpperCase()}</p><h1>${escapeHtml(project.name)}</h1><p class="project-goal">${escapeHtml(project.goal)}</p>${project.due_date ? `<p class="project-due">마감일 ${project.due_date}</p>` : ''}</div><div class="project-progress"><strong>${progress}%</strong><span>${tasks.filter(task => task.completed).length} / ${tasks.length}개 작업 완료</span><div class="progress-track"><div class="progress-bar" style="width:${progress}%"></div></div></div>`;
  const next = tasks.filter(task => !task.completed).sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority])).slice(0, 3);
  document.querySelector('#next-actions').innerHTML = `<div class="section-heading"><div><p class="eyebrow">NEXT ACTIONS</p><h2>다음에 할 일</h2></div></div>${next.length ? next.map(task => `<div class="next-action-row"><span class="calendar-dot ${task.priority}"></span><strong>${escapeHtml(task.title)}</strong><span>${task.planned_date || '날짜 미정'}</span></div>`).join('') : '<p class="muted">모든 작업을 완료했습니다.</p>'}`;
  taskList.innerHTML = tasks.length ? tasks.map(task => `<div class="task-item"><input class="task-check" type="checkbox" data-task="${task.id}" ${task.completed ? 'checked' : ''}><div class="task-copy"><span class="task-title ${task.completed ? 'done' : ''}">${escapeHtml(task.title)}</span><small>${task.planned_date ? `예정 ${task.planned_date}` : '일정 미정'}</small></div><span class="priority ${task.priority}">${labels[task.priority]}</span><button class="item-delete" data-delete-task="${task.id}" aria-label="작업 삭제">×</button></div>`).join('') : '<p class="muted">아직 작업이 없습니다. Quick Add로 첫 단계를 추가하세요.</p>';
  issueList.innerHTML = issues.length ? issues.map(issue => `<div class="issue-item"><div class="issue-item-top"><span class="severity ${issue.severity}">${labels[issue.severity]}</span><button class="item-delete" data-delete-issue="${issue.id}" aria-label="이슈 삭제">×</button></div><p>${escapeHtml(issue.content)}</p><button class="button button-ghost button-small" data-resolve="${issue.id}">${issue.status === 'resolved' ? '해결됨' : '해결 처리'}</button></div>`).join('') : '<div class="issue-compact">이슈 0 <button class="button button-ghost button-small" id="compact-add-issue">＋ 이슈</button></div>';
  document.querySelector('#analyze-link').href = `insights.html?id=${projectId}`;
  bindItems();
}

function bindItems() { document.querySelectorAll('[data-task]').forEach(input => input.addEventListener('change', () => { const task = state.tasks.find(item => item.id === input.dataset.task); task.completed = input.checked; task.updated_at = new Date().toISOString(); saveState(state); render(); })); document.querySelectorAll('[data-delete-task]').forEach(button => button.addEventListener('click', () => { state.tasks = state.tasks.filter(task => task.id !== button.dataset.deleteTask); saveState(state); render(); })); document.querySelectorAll('[data-delete-issue]').forEach(button => button.addEventListener('click', () => { state.issues = state.issues.filter(issue => issue.id !== button.dataset.deleteIssue); saveState(state); render(); })); document.querySelectorAll('[data-resolve]').forEach(button => button.addEventListener('click', () => { const issue = state.issues.find(item => item.id === button.dataset.resolve); issue.status = issue.status === 'resolved' ? 'open' : 'resolved'; saveState(state); render(); })); const compactAdd = document.querySelector('#compact-add-issue'); if (compactAdd) compactAdd.addEventListener('click', () => document.querySelector('#item-modal').showModal()); }

document.querySelector('#quick-add-form').addEventListener('submit', event => { event.preventDefault(); const data = new FormData(event.currentTarget); const title = data.get('title').trim(); if (!title) return; state.tasks.push({ id: id(), project_id: projectId, user_id: session.id, title, priority: 'medium', completed: false, planned_date: null, due_date: project.due_date || null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }); saveState(state); event.currentTarget.reset(); render(); });
document.querySelectorAll('.modal-close').forEach(button => { button.type = 'button'; button.addEventListener('click', () => button.closest('dialog').close()); });
document.querySelector('#add-task').addEventListener('click', () => document.querySelector('#quick-add-form input').focus());
document.querySelector('#add-issue').addEventListener('click', () => document.querySelector('#item-modal').showModal());
document.querySelector('#item-form').addEventListener('submit', event => { event.preventDefault(); const data = new FormData(event.currentTarget); const content = data.get('content').trim(); if (content) state.issues.push({ id: id(), project_id: projectId, user_id: session.id, content, severity: data.get('severity'), status: 'open', created_at: new Date().toISOString() }); saveState(state); event.currentTarget.reset(); document.querySelector('#item-modal').close(); render(); });
render();