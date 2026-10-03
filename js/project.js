import { wireProjectDeletion } from './projectDeleteUI.js?v=2';
import { getState, saveState, requireSession, projectProgress, id, wireLogout, escapeHtml } from './supabaseClient.js?v=8';

const session = requireSession();
if (!session) throw new Error('No session');
wireLogout();
wireProjectDeletion(session);
const state = getState();
const projectId = new URLSearchParams(location.search).get('id');
const project = state.projects.find(item => item.id === projectId && item.user_id === session.id);
if (!project) { location.href = 'index.html'; throw new Error('Project not found'); }
const header = document.querySelector('#project-header');
const taskList = document.querySelector('#task-list');
const issueList = document.querySelector('#issue-list');
const labels = { low: 'Low', medium: 'Medium', high: 'High' };

function render() {
  const tasks = state.tasks.filter(task => task.project_id === projectId);
  const issues = state.issues.filter(issue => issue.project_id === projectId);
  const progress = projectProgress(projectId, state);
  header.innerHTML = `<div><p class="eyebrow">${(project.project_type || 'project').toUpperCase()}</p><h1>${escapeHtml(project.name)}</h1><p class="project-goal">${escapeHtml(project.goal)}</p>${project.due_date ? `<p class="project-due">Deadline ${project.due_date}</p>` : ''}</div><div class="project-progress"><strong>${progress}%</strong><span>${tasks.filter(task => task.completed).length} / ${tasks.length} tasks completed</span><div class="progress-track"><div class="progress-bar" style="width:${progress}%"></div></div><button type="button" class="button button-ghost button-small project-delete-trigger" data-delete-project="${project.id}">Delete project</button></div>`;
  const next = tasks.filter(task => !task.completed).sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority])).slice(0, 3);
  document.querySelector('#next-actions').innerHTML = `<div class="section-heading"><div><p class="eyebrow">NEXT ACTIONS</p><h2>Up next</h2></div></div>${next.length ? next.map(task => `<div class="next-action-row"><span class="calendar-dot ${task.priority}"></span><strong>${escapeHtml(task.title)}</strong><span>${task.planned_date || 'No date'}</span></div>`).join('') : '<p class="muted">All tasks completed.</p>'}`;
  taskList.innerHTML = tasks.length ? tasks.map(task => `<div class="task-item"><input class="task-check" type="checkbox" data-task="${task.id}" ${task.completed ? 'checked' : ''}><div class="task-copy"><span class="task-title ${task.completed ? 'done' : ''}">${escapeHtml(task.title)}</span><small>${task.planned_date ? `Scheduled ${task.planned_date}${task.start_time ? ' · '+task.start_time+' · '+(task.duration_minutes||60)+' min' : ''}` : 'Unscheduled'}</small></div><span class="priority ${task.priority}">${labels[task.priority]}</span><button class="item-delete" data-delete-task="${task.id}" aria-label="Delete task">×</button></div>`).join('') : '<p class="muted">No tasks yet.</p>';
  issueList.innerHTML = issues.length ? issues.map(issue => `<div class="issue-item"><div class="issue-item-top"><span class="severity ${issue.severity}">${labels[issue.severity]}</span><button class="item-delete" data-delete-issue="${issue.id}" aria-label="Delete issue">×</button></div><p>${escapeHtml(issue.content)}</p><button class="button button-ghost button-small" data-resolve="${issue.id}">${issue.status === 'resolved' ? 'Resolved' : 'Resolve'}</button></div>`).join('') : '<div class="issue-compact">Issues 0 <button class="button button-ghost button-small" id="compact-add-issue">＋ Issues</button></div>';
  document.querySelector('#analyze-link').href = `insights.html?id=${projectId}`;
  bindItems();
}

function bindItems() { document.querySelectorAll('[data-task]').forEach(input => input.addEventListener('change', () => { const task = state.tasks.find(item => item.id === input.dataset.task); task.completed = input.checked; task.updated_at = new Date().toISOString(); saveState(state); render(); })); document.querySelectorAll('[data-delete-task]').forEach(button => button.addEventListener('click', () => { state.tasks = state.tasks.filter(task => task.id !== button.dataset.deleteTask); saveState(state); render(); })); document.querySelectorAll('[data-delete-issue]').forEach(button => button.addEventListener('click', () => { state.issues = state.issues.filter(issue => issue.id !== button.dataset.deleteIssue); saveState(state); render(); })); document.querySelectorAll('[data-resolve]').forEach(button => button.addEventListener('click', () => { const issue = state.issues.find(item => item.id === button.dataset.resolve); issue.status = issue.status === 'resolved' ? 'open' : 'resolved'; saveState(state); render(); })); const compactAdd = document.querySelector('#compact-add-issue'); if (compactAdd) compactAdd.addEventListener('click', () => document.querySelector('#item-modal').showModal()); }

document.querySelector('#quick-add-form').addEventListener('submit', event => { event.preventDefault(); const data = new FormData(event.currentTarget); const title = data.get('title').trim(); if (!title) return; const day=data.get('date'),time=data.get('time'),duration=Number(data.get('duration'));const [h,m]=(time||'00:00').split(':').map(Number);const error=document.querySelector('#add-task-error');error.textContent='';if(time&&!day){error.textContent='Choose a date before setting a time.';return;}if(!Number.isInteger(duration)||duration<15||duration>480||(time&&h*60+m+duration>1440)){error.textContent='Use 15–480 minutes and finish within the same day.';return;} state.tasks.push({ id: id(), project_id: projectId, user_id: session.id, title, priority: 'medium', completed: false, planned_date: day || null, start_time: time || null, duration_minutes: duration, due_date: data.get('deadline') || null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }); saveState(state); event.currentTarget.reset(); render(); });
document.querySelectorAll('.modal-close').forEach(button => { button.type = 'button'; button.addEventListener('click', () => button.closest('dialog').close()); });
document.querySelector('#add-task').addEventListener('click', () => document.querySelector('#quick-add-form input').focus());
document.querySelector('#add-issue').addEventListener('click', () => document.querySelector('#item-modal').showModal());
document.querySelector('#item-form').addEventListener('submit', event => { event.preventDefault(); const data = new FormData(event.currentTarget); const content = data.get('content').trim(); if (content) state.issues.push({ id: id(), project_id: projectId, user_id: session.id, content, severity: data.get('severity'), status: 'open', created_at: new Date().toISOString() }); saveState(state); event.currentTarget.reset(); document.querySelector('#item-modal').close(); render(); });
render();
