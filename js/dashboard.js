import { getState, saveState, requireSession, projectProgress, id, todayKey, addDays, getSettings, getProjectTypes, wireLogout, escapeHtml } from './supabaseClient.js?v=3';

const session = requireSession();
if (!session) throw new Error('No session');
wireLogout();
const state = getState();
const today = todayKey();
const typeLabels = { school: '학교', home: '집', work: '업무', study: '공부', development: '개발', research: '연구', content: '콘텐츠', personal: '개인', other: '기타' };
const projectTypes = getProjectTypes(session.id);
const priorityLabels = { low: '낮음', medium: '보통', high: '높음' };
const projectById = projectId => state.projects.find(project => project.id === projectId);
const taskProject = task => projectById(task.project_id);
const topicLabel = key => projectTypes.find(type => type.key === key)?.label || typeLabels[key] || '기타';
const typeSelect = document.querySelector('select[name="project_type"]');
if (typeSelect) typeSelect.innerHTML = projectTypes.map(type => `<option value="${type.key}">${escapeHtml(type.label)}</option>`).join('');

function taskRow(task) {
	const project = taskProject(task);
	return `<div class="schedule-task"><input class="task-check" type="checkbox" data-dashboard-task="${task.id}" ${task.completed ? 'checked' : ''}><span class="calendar-dot topic-${project?.project_type || 'other'}"></span><div class="schedule-task-copy"><strong>${escapeHtml(task.title)}</strong><span>${escapeHtml(project?.name || '')}</span></div><span class="priority ${task.priority}">${priorityLabels[task.priority]}</span></div>`;
}

function renderToday() {
	const todayTasks = state.tasks.filter(task => task.user_id === session.id && task.planned_date === today && !task.completed);
	const overdue = state.tasks.filter(task => task.user_id === session.id && task.planned_date && task.planned_date < today && !task.completed);
	document.querySelector('#today-count').textContent = todayTasks.length;
	document.querySelector('#overdue-count').textContent = overdue.length;
	document.querySelector('#today-label').textContent = new Date(`${today}T12:00:00`).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
	document.querySelector('#today-list').innerHTML = todayTasks.length ? todayTasks.map(taskRow).join('') : `<div class="inline-empty">오늘 예정된 작업이 없습니다.<button class="button button-small button-ghost" id="empty-plan">2주 계획 만들기</button></div>`;
	const emptyPlan = document.querySelector('#empty-plan');
	if (emptyPlan) emptyPlan.addEventListener('click', openPlanner);
}

function renderCalendar() {
	const activeTasks = state.tasks.filter(task => task.user_id === session.id && !task.completed && task.planned_date);
	document.querySelector('#calendar').innerHTML = Array.from({ length: 14 }, (_, index) => {
		const date = addDays(today, index);
		const dayTasks = activeTasks.filter(task => task.planned_date === date);
		const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' });
		return `<article class="calendar-day ${index === 0 ? 'today' : ''}"><header><strong>${dateLabel}</strong>${index === 0 ? '<span>오늘</span>' : ''}</header><div>${dayTasks.length ? dayTasks.map(task => `<a class="calendar-task" href="project.html?id=${task.project_id}"><span class="calendar-dot topic-${taskProject(task)?.project_type || 'other'}"></span><span>${escapeHtml(task.title)}</span></a>`).join('') : '<span class="calendar-empty">-</span>'}</div></article>`;
	}).join('');
}

function renderProjects() {
	const projects = state.projects.filter(project => project.user_id === session.id && project.status === 'active');
	document.querySelector('#active-count').textContent = projects.length;
	document.querySelector('#project-count').textContent = `${projects.length}개 프로젝트`;
	document.querySelector('#project-grid').innerHTML = projects.map(project => { const tasks = state.tasks.filter(task => task.project_id === project.id); const progress = projectProgress(project.id, state); return `<a class="project-card" href="project.html?id=${project.id}"><div><div class="card-top"><span class="status active">진행 중</span><span class="progress-meta">${progress}%</span></div><h3>${escapeHtml(project.name)}</h3><p>${escapeHtml(project.goal)}</p></div><div><div class="progress-track"><div class="progress-bar" style="width:${progress}%"></div></div><div class="card-bottom"><span class="muted">${tasks.filter(task => task.completed).length} / ${tasks.length}개 작업</span><span class="muted">${project.due_date ? `마감 ${project.due_date}` : '마감일 없음'}</span></div></div><span class="project-type">${typeLabels[project.project_type] || '기타'} →</span></a>`; }).join(''); document.querySelector('#empty-state').classList.toggle('hidden', projects.length > 0); document.querySelector('#project-grid').classList.toggle('hidden', projects.length === 0);
}

function render() { renderToday(); renderCalendar(); renderProjects(); document.querySelectorAll('[data-dashboard-task]').forEach(input => input.addEventListener('change', () => { const task = state.tasks.find(item => item.id === input.dataset.dashboardTask); task.completed = input.checked; task.updated_at = new Date().toISOString(); saveState(state); render(); })); }
render();

const projectModal = document.querySelector('#project-modal');
document.querySelectorAll('[data-open-project]').forEach(button => button.addEventListener('click', () => projectModal.showModal()));
document.querySelector('#project-form').addEventListener('submit', async event => { event.preventDefault(); await createProject(new FormData(event.currentTarget), true); });
document.querySelector('#empty-project').addEventListener('click', () => { const form = document.querySelector('#project-form'); createProject(new FormData(form), false); });

async function createProject(data, useAi) { const name = data.get('name').trim(); const goal = data.get('goal').trim(); if (!name || !goal) return; const project = { id: id(), user_id: session.id, name, goal, description: data.get('description').trim(), project_type: data.get('project_type'), due_date: data.get('due_date') || null, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }; state.projects.push(project); if (!useAi) { saveState(state); location.href = `project.html?id=${project.id}`; return; } let suggestions; try { const response = await fetch('/api/starter_plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_name: project.name, project_type: project.project_type, goal: project.goal, due_date: project.due_date, description: project.description }) }); if (!response.ok) throw new Error('Starter API unavailable'); suggestions = (await response.json()).tasks; } catch { suggestions = starterSuggestions(project); } document.querySelector('#plan-title').textContent = `${project.name} 시작 플랜`; document.querySelector('#starter-list').innerHTML = suggestions.map((task, index) => `<label class="starter-item"><input type="checkbox" name="starter-task" value="${index}" checked><span><strong>${escapeHtml(task.title)}</strong><small>${priorityLabels[task.priority]} · ${escapeHtml(task.reason)}</small></span></label>`).join(''); projectModal.close(); document.querySelector('#plan-modal').showModal(); document.querySelector('#plan-form').onsubmit = event => { event.preventDefault(); const selected = [...document.querySelectorAll('input[name="starter-task"]:checked')].map(input => suggestions[Number(input.value)]); selected.forEach(task => state.tasks.push({ id: id(), project_id: project.id, user_id: session.id, title: task.title, priority: task.priority, completed: false, planned_date: null, due_date: project.due_date, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })); saveState(state); location.href = `project.html?id=${project.id}`; }; }

function starterSuggestions(project) { const common = { study: [['시험 범위 확인','high','전체 학습 계획을 세우기 위해 먼저 범위를 확인합니다.'],['주차별 핵심 개념 정리','high','학습 범위를 구조화하는 데 필요합니다.'],['핵심 공식 정리','medium','문제 풀이 전에 주요 공식을 정리합니다.'],['연습문제 1차 풀이','medium','이해도를 확인하고 빈틈을 찾습니다.'],['오답노트 정리','medium','반복해서 틀리는 유형을 기록합니다.'],['최종 복습 계획 만들기','low','마감 전 점검 일정을 준비합니다.']], development: [['핵심 기능 범위 정리','high','완성 기준을 먼저 명확히 합니다.'],['기본 데이터 구조 설계','high','후속 구현의 기준이 됩니다.'],['첫 화면 구현','medium','사용자 흐름을 빠르게 검증합니다.'],['핵심 기능 연결','medium','가장 중요한 동작을 먼저 완성합니다.'],['오류와 예외 처리','medium','사용 가능한 상태를 만듭니다.'],['배포 전 점검','low','실제 환경에서 동작을 확인합니다.']] }; const items = common[project.project_type] || common.development; return items.map(([title, priority, reason]) => ({ title, priority, reason })); }

const planModal = document.querySelector('#schedule-modal');
async function openPlanner() { const unplanned = state.tasks.filter(task => task.user_id === session.id && !task.completed && !task.planned_date); const settings = getSettings(session.id); let schedule; try { const response = await fetch('/api/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', tasks: unplanned, settings }) }); if (!response.ok) throw new Error('Schedule API unavailable'); const result = await response.json(); schedule = result.schedule.map(item => ({ task: unplanned.find(task => task.id === item.task_id), date: item.planned_date })); } catch { schedule = unplanned.slice(0, settings.daily_task_limit * 14).map((task, index) => ({ task, date: addDays(today, Math.floor(index / settings.daily_task_limit)) })); } document.querySelector('#schedule-preview').innerHTML = schedule.length ? schedule.map(item => `<div class="schedule-preview-row"><strong>${item.date}</strong><span>${escapeHtml(taskProject(item.task)?.name || '')} · ${escapeHtml(item.task.title)}</span></div>`).join('') : '<div class="inline-empty">배치할 미계획 작업이 없습니다.</div>'; planModal.showModal(); document.querySelector('#schedule-form').onsubmit = event => { event.preventDefault(); schedule.forEach(item => { item.task.planned_date = item.date; item.task.updated_at = new Date().toISOString(); }); saveState(state); planModal.close(); render(); }; }
document.querySelector('#plan-button').addEventListener('click', openPlanner);