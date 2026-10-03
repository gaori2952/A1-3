import { getState, requireSession, wireLogout } from './supabaseClient.js?v=8';
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
  const labels = { GOOD: 'Good', WATCH: 'Watch', 'IN MOTION': 'In motion' };
  const priorities = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };
  const container = document.querySelector('#analysis-result');
  container.replaceChildren();
  const summary = element('article', undefined, 'analysis-card full');
  summary.append(element('span', 'PROJECT STATUS · ' + labels[result.status], 'label'), element('h2', 'Summary'), element('p', result.summary));
  container.append(summary);
  for (const [title, label, items, risk] of [
    ['Next steps', 'NEXT STEPS', result.next_steps, false],
    ['Risks', 'RISKS', result.risks, true]
  ]) {
    const card = element('article', undefined, 'analysis-card');
    card.append(element('span', label, 'label'), element('h2', title));
    const list = element('ul');
    for (const item of items) {
      const row = element('li');
      const heading = element('strong');
      const priority = risk ? item.severity : item.priority;
      heading.append(element('span', priorities[priority], (risk ? 'severity ' : 'priority ') + priority.toLowerCase()), document.createTextNode(' · ' + item.title));
      row.append(heading, element('span', risk ? item.description + '\n\nSuggested action: ' + item.action : item.reason));
      list.append(row);
    }
    if (!items.length) list.append(element('li', risk ? 'No specific risks identified.' : 'No next steps suggested.'));
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
    if (!question) { status.textContent = 'Enter a question.'; return; }
    if (Date.now() < nextAllowedAt) { status.textContent = 'Please wait a few seconds before trying again.'; return; }
    busy = true;
    button.disabled = true;
    button.textContent = 'Analyzing…';
    result.classList.add('hidden');
    status.textContent = 'Analyzing your project…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);
    const delay = setTimeout(() => { status.textContent = 'Still preparing the response…'; }, 10000);
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
      if (!response.ok || !payload?.success) throw new Error('AI request failed. Try again shortly.');
      if (!validAnalysis(payload.analysis) || payload.provider !== 'openai-compatible') throw new Error('The AI response was invalid. Please try again.');
      renderAnalysis(payload.analysis);
      status.textContent = 'Analysis ready. Review the suggestions.';
    } catch (error) {
      status.textContent = error.name === 'AbortError' ? 'The request timed out. Try again shortly.' : (error instanceof TypeError ? 'Check your network and try again.' : error.message);
    } finally {
      clearTimeout(timeout);
      clearTimeout(delay);
      nextAllowedAt = Date.now() + 5000;
      busy = false;
      button.disabled = false;
      button.textContent = 'Analyze again →';
    }
  });
}
