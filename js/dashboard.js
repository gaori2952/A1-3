import { initializeNotes } from './notes.js?v=1';
import { wireProjectDeletion } from './projectDeleteUI.js?v=2';
import { getState, saveState, requireSession, projectProgress, id, todayKey, getProjectTypes, wireLogout, escapeHtml } from './supabaseClient.js?v=9';
import { initializeSemesterPlanner } from './semesterPlanner.js?v=2';
const session=requireSession();if(!session)throw new Error('No session');
wireLogout();wireProjectDeletion(session);
let state=getState();const today=todayKey();
const priorityLabels={low:'Low',medium:'Medium',high:'High'};
const projectTypes=getProjectTypes(session.id);
const projectById=pid=>state.projects.find(p=>p.id===pid&&p.user_id===session.id);
const taskProject=t=>projectById(t.project_id);
const typeSelect=document.querySelector('select[name="project_type"]');
if(typeSelect)typeSelect.innerHTML=projectTypes.map(t=>'<option value="'+t.key+'">'+escapeHtml(t.label)+'</option>').join('');
const requestedView=new URLSearchParams(location.search).get('view');
const view=['today','projects','notes','ai'].includes(requestedView)?requestedView:'planner';
const calendarView=view==='planner'||view==='today';
document.body.classList.toggle('is-planner',calendarView);
document.body.classList.toggle('is-today-view',view==='today');
document.querySelector('#workspace-view').classList.toggle('hidden',!calendarView);
document.querySelector('#projects-section').classList.toggle('hidden',view!=='projects');
document.querySelector('#ai-view').classList.toggle('hidden',view!=='ai');
document.querySelector('#notes-view').classList.toggle('hidden',view!=='notes');document.querySelector('.planner-header-actions').classList.toggle('hidden',view==='notes');if(view==='notes')initializeNotes(session.id);
document.querySelector('#view-title').textContent=view==='notes'?'Notes':view==='projects'?'Projects':view==='ai'?'AI':view==='today'?'Today':'Planner';
document.title='ProjectFlow | '+document.querySelector('#view-title').textContent;
document.querySelector('#planner-date').textContent=new Date(today+'T12:00:00').toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric',weekday:'long'});
const ownedTasks=()=>state.tasks.filter(t=>t.user_id===session.id&&taskProject(t));
function pastel(p){const index=state.projects.filter(p=>p.user_id===session.id).findIndex(x=>x.id===p?.id);return 'pastel-'+Math.max(0,index)%6;}
function renderProjects(){const projects=state.projects.filter(p=>p.user_id===session.id&&p.status!=='archived').sort((a,b)=>(a.due_date||'9999').localeCompare(b.due_date||'9999'));document.querySelector('#active-count').textContent=projects.length;document.querySelector('#project-grid').innerHTML=projects.map(p=>{const ts=ownedTasks().filter(t=>t.project_id===p.id);return '<article class="project-list-row"><a href="project.html?id='+p.id+'"><span class="project-color '+pastel(p)+'"></span><div><h3>'+escapeHtml(p.name)+'</h3><small>'+(p.due_date?'Due '+p.due_date:'No deadline')+'</small></div><span class="project-task-count">'+ts.filter(t=>t.completed).length+' / '+ts.length+'</span><span class="project-percent">'+projectProgress(p.id,state)+'%</span></a><button class="button button-ghost button-small" data-delete-project="'+p.id+'" aria-label="'+escapeHtml(p.name)+' Delete project">Delete</button></article>';}).join('');document.querySelector('#empty-state').classList.toggle('hidden',projects.length>0);document.querySelector('#project-grid').classList.toggle('hidden',!projects.length);document.querySelector('#ai-project-list').innerHTML=projects.length?projects.map(p=>'<a class="ai-project-row" href="insights.html?id='+p.id+'"><span>'+escapeHtml(p.name)+'</span><small>Insights →</small></a>').join(''):'<p class="planner-empty">Create a project first.</p>';}

function render(){state=getState();renderProjects();}
initializeSemesterPlanner(session.id,render,{view});
render();
const projectModal = document.querySelector('#project-modal');
document.querySelectorAll('[data-open-project]').forEach(button => button.addEventListener('click', () => projectModal.showModal()));
document.querySelectorAll('.modal-close').forEach(button => { button.type = 'button'; button.addEventListener('click', () => button.closest('dialog').close()); });
document.querySelector('#project-form').addEventListener('submit', async event => { event.preventDefault(); await createProject(new FormData(event.currentTarget), true); });
document.querySelector('#empty-project').addEventListener('click', () => { const form = document.querySelector('#project-form'); createProject(new FormData(form), false); });

async function createProject(data, useAi) {
  const name = data.get('name').trim();
  const goal = data.get('goal').trim();
  const status = document.querySelector('#project-status');
  if (!name || !goal) { status.textContent = 'Enter a project name and goal.'; return; }
  const project = { id: id(), user_id: session.id, name, goal, description: data.get('description').trim(), project_type: data.get('project_type'), due_date: data.get('due_date') || null, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  if (!useAi) { state=getState();state.projects.push(project); saveState(state); location.href = `project.html?id=${project.id}`; return; }
  const button = document.querySelector('#ai-project');
  if (button.disabled) return;
  button.disabled = true;
  document.querySelector('#empty-project').disabled = true;
  button.textContent = 'Planning…';
  status.textContent = 'Preparing a schedule for your goal and deadline.';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55000);
  try {
    const response = await fetch('/api/starter_plan', { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_name: project.name, project_type: project.project_type, goal: project.goal, due_date: project.due_date, start_date: today, description: project.description }) });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) throw new Error('Could not create a schedule. Please try again.');
    const suggestions = payload.tasks;
    if (payload.provider !== 'openai-compatible' || !Array.isArray(suggestions) || !suggestions.length || suggestions.some(task => typeof task.title !== 'string' || typeof task.reason !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(task.planned_date) || !Number.isInteger(task.duration_minutes) || !['high','medium','low'].includes(task.priority))) throw new Error('The AI response was invalid. Please try again.');
    document.querySelector('#plan-title').textContent = `${project.name} schedule`;
    document.querySelector('#starter-list').innerHTML = suggestions.map((task, index) => `<label class="starter-item"><input type="checkbox" name="starter-task" value="${index}" checked><span class="starter-copy"><strong>${escapeHtml(task.planned_date)} · ${task.duration_minutes} min</strong><span>${escapeHtml(task.title)}</span><span class="priority ${task.priority}">Priority ${priorityLabels[task.priority]}</span><small>${escapeHtml(task.reason)}</small></span></label>`).join('');
    projectModal.close();
    document.querySelector('#plan-modal').showModal();
    document.querySelector('#plan-form').onsubmit = event => {
      event.preventDefault();
      if (event.submitter?.value === 'cancel') { document.querySelector('#plan-modal').close(); return; }
      const selected = [...document.querySelectorAll('input[name="starter-task"]:checked')].map(input => suggestions[Number(input.value)]);
      state=getState();state.projects.push(project);
      selected.forEach(task => state.tasks.push({ id: id(), project_id: project.id, user_id: session.id, title: task.title, priority: task.priority, completed: false, planned_date: task.planned_date, duration_minutes: task.duration_minutes, due_date: project.due_date, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
      saveState(state);
      location.href = `project.html?id=${project.id}`;
    };
  } catch (error) {
    status.textContent = error.name === 'AbortError' ? 'The AI request timed out. Try again or add tasks yourself.' : (error instanceof TypeError ? 'Check your network connection.' : error.message);
  } finally {
    clearTimeout(timer);
    button.disabled = false;
    document.querySelector('#empty-project').disabled = false;
    button.textContent = 'Plan with AI';
  }
}

