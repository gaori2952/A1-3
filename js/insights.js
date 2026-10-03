import { getState, requireSession, wireLogout } from './supabaseClient.js?v=2';
const session = requireSession();
if (session) {
  wireLogout();
  const state = getState();
  const projectId = new URLSearchParams(location.search).get('id');
  const project = state.projects.find(item => item.id === projectId && item.user_id === session.id);
  if (!project) location.replace('index.html');
  else initialize(project, projectId, state);
}
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function renderAnalysis(result) {
  const labels = { GOOD: '좋음', WATCH: '주의 필요', 'IN MOTION': '진행 중' };
  const priorities = { HIGH: '높음', MEDIUM: '보통', LOW: '낮음' };
  const container = document.querySelector('#analysis-result');
  container.replaceChildren();
  const summary = element('article', undefined, 'analysis-card full');
  summary.append(element('span', '프로젝트 상태 · ' + labels[result.status], 'label'), element('h2', '현재 상황을 정리하면'), element('p', result.summary));
  container.append(summary);
  for (const [title, label, items, risk] of [
    ['이것부터 해보세요', '다음 단계', result.next_steps, false],
    ['주의해서 살펴볼 것', '위험 요소', result.risks, true]
  ]) {
    const card = element('article', undefined, 'analysis-card');
    card.append(element('span', label, 'label'), element('h2', title));
    const list = element('ul');
    for (const item of items) {
      const row = element('li');
      const heading = element('strong');
      const priority = risk ? item.severity : item.priority;
      heading.append(element('span', priorities[priority], (risk ? 'severity ' : 'priority ') + priority.toLowerCase()), document.createTextNode(' · ' + item.title));
      row.append(heading, element('span', risk ? item.description + '\n\n추천 행동: ' + item.action : item.reason));
      list.append(row);
    }
    if (!items.length) list.append(element('li', risk ? '제공된 정보에서 특별한 위험을 찾지 못했습니다.' : '현재 제안할 다음 작업이 없습니다.'));
    card.append(list);
    container.append(card);
  }
  container.classList.remove('hidden');
}
function validAnalysis(value) {
  if (!value || typeof value.summary !== 'string' || !['GOOD', 'WATCH', 'IN MOTION'].includes(value.status)) return false;
  return ['next_steps', 'risks'].every(key => Array.isArray(value[key]) && value[key].length <= 3 && value[key].every(item => {
    const fields = key === 'risks' ? ['severity', 'title', 'description', 'action'] : ['priority', 'title', 'reason'];
    return item && fields.every(field => typeof item[field] === 'string') && ['HIGH', 'MEDIUM', 'LOW'].includes(item[key === 'risks' ? 'severity' : 'priority']);
  }));
}
function initialize(project, projectId, state) {
  const tasks = state.tasks.filter(task => task.project_id === projectId);
  const issues = state.issues.filter(issue => issue.project_id === projectId && issue.status === 'open');
  document.querySelector('#insight-project-name').textContent = project.name;
  document.querySelector('#insight-goal').textContent = project.goal;
  document.querySelector('#back-project').href = 'project.html?id=' + encodeURIComponent(projectId);
  const button = document.querySelector('#analyze-button');
  const status = document.querySelector('#analysis-status');
  const result = document.querySelector('#analysis-result');
  let busy = false;
  let nextAllowedAt = 0;
  button.addEventListener('click', async () => {
    if (busy) return;
    const question = document.querySelector('#analysis-question').value.trim();
    if (!question) { status.textContent = '질문을 입력해주세요.'; return; }
    if (Date.now() < nextAllowedAt) { status.textContent = '연속 요청을 줄이기 위해 잠시 기다린 뒤 다시 시도해주세요.'; return; }
    busy = true;
    button.disabled = true;
    button.textContent = '분석 중...';
    result.classList.add('hidden');
    status.textContent = '프로젝트를 분석하고 있습니다...';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);
    const delay = setTimeout(() => { status.textContent = 'AI가 답변을 준비 중입니다. 조금만 기다려주세요.'; }, 10000);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({
          project_name: project.name, goal: project.goal, due_date: project.due_date || '', question,
          completed_tasks: tasks.filter(task => task.completed).map(task => ({title: task.title})),
          remaining_tasks: tasks.filter(task => !task.completed).map(task => ({title: task.title, priority: task.priority, planned_date: task.planned_date || ''})),
          issues: issues.map(issue => ({content: issue.content, severity: issue.severity}))
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.message || 'AI 요청에 실패했습니다. 잠시 후 다시 시도해주세요.');
      if (!validAnalysis(payload.analysis) || payload.provider !== 'openai-compatible') throw new Error('AI 응답 형식이 올바르지 않습니다. 다시 시도해주세요.');
      renderAnalysis(payload.analysis);
      status.textContent = 'AI 분석이 완료됐습니다. 제안 내용을 확인한 뒤 작업에 반영하세요.';
    } catch (error) {
      status.textContent = error.name === 'AbortError' ? '응답 시간이 초과됐습니다. 잠시 후 다시 시도해주세요.' : (error instanceof TypeError ? '네트워크 연결을 확인하고 다시 시도해주세요.' : error.message);
    } finally {
      clearTimeout(timeout);
      clearTimeout(delay);
      nextAllowedAt = Date.now() + 5000;
      busy = false;
      button.disabled = false;
      button.textContent = '다시 분석하기 →';
    }
  });
}
