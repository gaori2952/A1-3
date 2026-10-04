import { initializeNotes } from './notes.js?v=1';
import { wireProjectDeletion } from './projectDeleteUI.js?v=2';
import { getState, saveState, requireSession, projectProgress, id, todayKey, addDays, getSettings, getProjectTypes, wireLogout, escapeHtml } from './supabaseClient.js?v=8';
import { weekDates, timedEvents } from './plannerView.js';
const session=requireSession();if(!session)throw new Error('No session');
wireLogout();wireProjectDeletion(session);
let state=getState();const today=todayKey();
let toastTimer;function showToast(message){const toast=document.querySelector('#workspace-toast');toast.textContent=message;toast.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),2200);}
const typeLabels={school:'School',home:'Home',work:'Work',study:'Study',development:'Development',research:'Research',content:'Content',personal:'Personal',other:'Other'};
const priorityLabels={low:'Low',medium:'Medium',high:'High'};
const projectTypes=getProjectTypes(session.id);
const projectById=pid=>state.projects.find(p=>p.id===pid&&p.user_id===session.id);
const taskProject=t=>projectById(t.project_id);
const topicLabel=key=>projectTypes.find(t=>t.key===key)?.label||typeLabels[key]||'Other';
const typeSelect=document.querySelector('select[name="project_type"]');
if(typeSelect)typeSelect.innerHTML=projectTypes.map(t=>'<option value="'+t.key+'">'+escapeHtml(t.label)+'</option>').join('');
const view=new URLSearchParams(location.search).get('view')||'today';
document.querySelector('#workspace-view').classList.toggle('hidden',view!=='today');
document.querySelector('#projects-section').classList.toggle('hidden',view==='ai'||view==='notes');
document.querySelector('#ai-view').classList.toggle('hidden',view!=='ai');
document.querySelector('#notes-view').classList.toggle('hidden',view!=='notes');document.querySelector('.planner-header-actions').classList.toggle('hidden',view==='notes');if(view==='notes')initializeNotes(session.id);
document.querySelector('#view-title').textContent=view==='notes'?'Notes':view==='projects'?'Projects':view==='ai'?'AI':'Today';
document.title='ProjectFlow | '+document.querySelector('#view-title').textContent;
document.querySelector('#planner-date').textContent=new Date(today+'T12:00:00').toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric',weekday:'long'});
let weekOffset=0,selectedTaskId=null,focusedTaskId=null,searchQuery='',filterProject='',agendaMode=false;
const filterSelect=document.querySelector('#project-filter');filterSelect.innerHTML='<option value="">All projects</option>'+state.projects.filter(p=>p.user_id===session.id&&p.status!=='archived').map(p=>'<option value="'+p.id+'">'+escapeHtml(p.name)+'</option>').join('');
const visibleTasks=()=>ownedTasks().filter(t=>(!filterProject||t.project_id===filterProject)&&(!searchQuery||(t.title+' '+(taskProject(t)?.name||'')).toLocaleLowerCase().includes(searchQuery)));
const ownedTasks=()=>state.tasks.filter(t=>t.user_id===session.id&&taskProject(t));
const timeText=t=>t.start_time?(t.start_time+' · '+(t.duration_minutes||60)+' min'):(t.planned_date?'Unscheduled':'No date');
function taskRow(task){const p=taskProject(task);return '<div class="planner-task '+(focusedTaskId===task.id?'selected':'')+'"><input type="checkbox" class="task-check" data-dashboard-task="'+task.id+'" '+(task.completed?'checked':'')+' aria-label="'+escapeHtml(task.title)+' complete"><button class="task-select" data-edit-time="'+task.id+'"><strong>'+escapeHtml(task.title)+'</strong><small>'+escapeHtml(p?.name||'')+' · '+timeText(task)+'</small></button><span class="priority '+task.priority+'">'+priorityLabels[task.priority]+'</span></div>';}
function renderToday(){const tasks=visibleTasks().filter(t=>!t.completed);const current=tasks.filter(t=>t.planned_date===today||(!t.planned_date&&t.due_date===today));const late=tasks.filter(t=>(t.planned_date&&t.planned_date<today)||(t.due_date&&t.due_date<today));document.querySelector('#today-count').textContent=current.length;document.querySelector('#overdue-count').textContent=late.length;document.querySelector('#today-label').textContent=new Date(today+'T12:00:00').toLocaleDateString('en-US',{month:'numeric',day:'numeric'});document.querySelector('#today-list').innerHTML=current.length?current.map(taskRow).join(''):'<div class="planner-empty">Nothing scheduled for today.</div>';document.querySelector('#overdue-list').innerHTML=late.map(taskRow).join('');document.querySelector('#overdue-section').classList.toggle('hidden',!late.length);}
function pastel(p){const index=state.projects.filter(p=>p.user_id===session.id).findIndex(x=>x.id===p?.id);return 'pastel-'+Math.max(0,index)%6;}
function renderCalendar(){const days=weekDates(today,weekOffset),tasks=visibleTasks().filter(t=>!t.completed);const events=days.map(day=>timedEvents(tasks,day));const first=0,last=24;const height=(last-first)*48;document.querySelector('#week-label').textContent=days[0].slice(5).replace('-','.')+' — '+days[6].slice(5).replace('-','.');const noDeadline=tasks.filter(t=>!t.due_date);document.querySelector('#no-deadline-list').innerHTML=noDeadline.length?noDeadline.map(t=>'<button data-edit-time="'+t.id+'" class="loose-task">'+escapeHtml(t.title)+'</button>').join(''):'<span class="muted">No tasks.</span>';const loose=tasks.filter(t=>t.due_date&&!t.start_time&&(!t.planned_date||days.includes(t.planned_date)));document.querySelector('#unscheduled-list').innerHTML=loose.length?loose.map(t=>'<button data-edit-time="'+t.id+'" class="loose-task '+pastel(taskProject(t))+'">'+escapeHtml(t.title)+'</button>').join(''):'<span class="muted">No unscheduled tasks.</span>';document.querySelector('#week-agenda').innerHTML=days.map(day=>{const list=tasks.filter(t=>(t.planned_date||t.due_date)===day).sort((a,b)=>(a.start_time||'99:99').localeCompare(b.start_time||'99:99'));return '<section><h3>'+new Date(day+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})+'</h3>'+(list.length?list.map(taskRow).join(''):'<p class="agenda-empty">No events</p>')+'</section>';}).join('');const head='<div class="time-gutter"></div>'+days.map((day,i)=>'<div class="time-day '+(day===today?'is-today':'')+'"><span>'+['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]+'</span><strong>'+Number(day.slice(8))+'</strong></div>').join('');const hours='<div class="hour-labels" style="height:'+height+'px">'+Array.from({length:last-first+1},(_,i)=>'<span style="top:'+(i*48)+'px;'+(i===24?'transform:translateY(-100%);':'')+'">'+String(first+i).padStart(2,'0')+':00</span>').join('')+'</div>';document.querySelector('#calendar').innerHTML=head+hours+days.map((day,i)=>'<div class="time-day-column" style="height:'+height+'px">'+events[i].map(e=>'<button class="time-event '+pastel(taskProject(e.task))+'" data-edit-time="'+e.task.id+'" style="top:'+((e.start-first*60)*.8)+'px;height:'+Math.max(22,(e.end-e.start)*.8)+'px;left:calc('+e.lane*100/e.lanes+'% + 3px);width:calc('+100/e.lanes+'% - 6px)" title="'+escapeHtml(e.task.title)+'"><strong>'+escapeHtml(e.task.title)+'</strong><small>'+e.task.start_time+'</small></button>').join('')+'</div>').join('');}
function renderProjects(){const projects=state.projects.filter(p=>p.user_id===session.id&&p.status!=='archived').sort((a,b)=>(a.due_date||'9999').localeCompare(b.due_date||'9999'));document.querySelector('#active-count').textContent=projects.length;document.querySelector('#project-grid').innerHTML=projects.map(p=>{const ts=ownedTasks().filter(t=>t.project_id===p.id);return '<article class="project-list-row"><a href="project.html?id='+p.id+'"><span class="project-color '+pastel(p)+'"></span><div><h3>'+escapeHtml(p.name)+'</h3><small>'+(p.due_date?'Due '+p.due_date:'No deadline')+'</small></div><span class="project-task-count">'+ts.filter(t=>t.completed).length+' / '+ts.length+'</span><span class="project-percent">'+projectProgress(p.id,state)+'%</span></a><button class="button button-ghost button-small" data-delete-project="'+p.id+'" aria-label="'+escapeHtml(p.name)+' Delete project">Delete</button></article>';}).join('');document.querySelector('#empty-state').classList.toggle('hidden',projects.length>0);document.querySelector('#project-grid').classList.toggle('hidden',!projects.length);document.querySelector('#ai-project-list').innerHTML=projects.length?projects.map(p=>'<a class="ai-project-row" href="insights.html?id='+p.id+'"><span>'+escapeHtml(p.name)+'</span><small>Insights →</small></a>').join(''):'<p class="planner-empty">Create a project first.</p>';}

function render(){renderToday();renderCalendar();renderProjects();}
document.addEventListener('change',event=>{const input=event.target;if(input.dataset.dashboardTask){const t=ownedTasks().find(t=>t.id===input.dataset.dashboardTask);if(t){t.completed=input.checked;t.updated_at=new Date().toISOString();saveState(state);render();}}if(input.dataset.projectStatus){const p=projectById(input.dataset.projectStatus);if(p&&['planned','active','completed'].includes(input.value)){p.status=input.value;p.updated_at=new Date().toISOString();saveState(state);render();}}});
const timeModal=document.querySelector('#task-time-modal'),timeForm=document.querySelector('#task-time-form');
document.addEventListener('click',event=>{const button=event.target.closest('[data-edit-time]');if(!button)return;const task=ownedTasks().find(t=>t.id===button.dataset.editTime);if(!task)return;selectedTaskId=task.id;focusedTaskId=task.id;renderToday();document.querySelector('#time-task-title').textContent=task.title;timeForm.elements.date.value=task.planned_date||'';timeForm.elements.time.value=task.start_time||'';timeForm.elements.duration.value=task.duration_minutes||60;timeForm.elements.deadline.value=task.due_date||'';document.querySelector('#time-error').textContent='';timeModal.showModal();});
document.querySelectorAll('[data-close-time]').forEach(b=>b.addEventListener('click',()=>timeModal.close()));
timeForm.addEventListener('submit',event=>{event.preventDefault();const task=ownedTasks().find(t=>t.id===selectedTaskId);if(!task)return;const day=timeForm.elements.date.value,time=timeForm.elements.time.value,duration=Number(timeForm.elements.duration.value);if(time&&!day){document.querySelector('#time-error').textContent='Choose a date before setting a time.';return;}const [h,m]=(time||'00:00').split(':').map(Number);if(!Number.isInteger(duration)||duration<15||duration>480||(time&&h*60+m+duration>1440)){document.querySelector('#time-error').textContent='Use 15–480 minutes and finish within the same day.';return;}task.due_date=timeForm.elements.deadline.value||null;task.planned_date=day||null;task.start_time=time||null;task.duration_minutes=duration;task.updated_at=new Date().toISOString();saveState(state);timeModal.close();render();showToast('Schedule saved');});
document.querySelector('#task-search').addEventListener('input',event=>{searchQuery=event.target.value.trim().toLocaleLowerCase();renderToday();renderCalendar();});
filterSelect.addEventListener('change',event=>{filterProject=event.target.value;renderToday();renderCalendar();});
document.querySelector('#week-jump').addEventListener('change',event=>{if(!event.target.value)return;const base=weekDates(today,0)[0],target=weekDates(event.target.value,0)[0];weekOffset=Math.round((Date.parse(target+'T12:00:00Z')-Date.parse(base+'T12:00:00Z'))/604800000);renderCalendar();});
document.querySelector('#calendar-mode').onclick=event=>{agendaMode=!agendaMode;document.querySelector('.week-scroll').classList.toggle('hidden',agendaMode);document.querySelector('#week-agenda').classList.toggle('hidden',!agendaMode);event.currentTarget.textContent=agendaMode?'Timetable':'Agenda';event.currentTarget.setAttribute('aria-pressed',String(agendaMode));if(!agendaMode)requestAnimationFrame(scrollToCurrentHour);};
document.querySelector('#week-prev').onclick=()=>{weekOffset--;renderCalendar();};document.querySelector('#week-next').onclick=()=>{weekOffset++;renderCalendar();};document.querySelector('#week-today').onclick=()=>{weekOffset=0;renderCalendar();scrollToCurrentHour();};
function scrollToCurrentHour(){const now=new Date();document.querySelector('.week-scroll').scrollTop=Math.max(0,(now.getHours()+now.getMinutes()/60-2)*48);}
render();requestAnimationFrame(scrollToCurrentHour);
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
  if (!useAi) { state.projects.push(project); saveState(state); location.href = `project.html?id=${project.id}`; return; }
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
      state.projects.push(project);
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

const planModal = document.querySelector('#schedule-modal');
async function openPlanner() { const unplanned = state.tasks.filter(task => task.user_id === session.id && !task.completed && !task.planned_date); const settings = getSettings(session.id); let schedule; try { const response = await fetch('/api/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', tasks: unplanned, settings }) }); if (!response.ok) throw new Error('Schedule API unavailable'); const result = await response.json(); schedule = result.schedule.map(item => ({ task: unplanned.find(task => task.id === item.task_id), date: item.planned_date })); } catch { schedule = unplanned.slice(0, settings.daily_task_limit * 14).map((task, index) => ({ task, date: addDays(today, Math.floor(index / settings.daily_task_limit)) })); } document.querySelector('#schedule-preview').innerHTML = schedule.length ? schedule.map(item => `<div class="schedule-preview-row"><strong>${item.date}</strong><span>${escapeHtml(taskProject(item.task)?.name || '')} · ${escapeHtml(item.task.title)}</span></div>`).join('') : '<div class="inline-empty">No tasks need scheduling.</div>'; planModal.showModal(); document.querySelector('#schedule-form').onsubmit = event => { event.preventDefault(); schedule.forEach(item => { item.task.planned_date = item.date; item.task.updated_at = new Date().toISOString(); }); saveState(state); planModal.close(); render(); }; }
document.querySelector('#plan-button').addEventListener('click', openPlanner);
document.querySelectorAll('[data-scroll-target]').forEach(element => { const scroll = () => document.querySelector(`#${element.dataset.scrollTarget}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); element.addEventListener('click', scroll); element.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); scroll(); } }); });



const quickModal=document.querySelector('#quick-task-modal'),quickForm=document.querySelector('#quick-task-form');
document.querySelector('#quick-task-open').addEventListener('click',()=>{
  quickForm.reset();document.querySelector('#quick-task-error').textContent='';
  document.querySelector('#quick-task-project').innerHTML='<option value="">Personal</option>'+state.projects.filter(p=>p.user_id===session.id&&p.status!=='archived').map(p=>'<option value="'+p.id+'">'+escapeHtml(p.name)+'</option>').join('');
  quickForm.elements.date.value=today;quickModal.showModal();quickForm.elements.title.focus();
});
quickForm.addEventListener('submit',event=>{
  event.preventDefault();const form=new FormData(quickForm);const title=form.get('title').trim(),day=form.get('date'),time=form.get('time'),duration=Number(form.get('duration'));const error=document.querySelector('#quick-task-error');
  if(!title){error.textContent='Enter a task name.';return;}
  if(time&&!day){error.textContent='Choose a date before setting a time.';return;}
  const [h,m]=(time||'00:00').split(':').map(Number);
  if(!Number.isInteger(duration)||duration<15||duration>480||(time&&h*60+m+duration>1440)){error.textContent='Use 15–480 minutes and finish within the same day.';return;}
  const next=getState();let project=next.projects.find(p=>p.id===form.get('project_id')&&p.user_id===session.id);
  if(!project){project=next.projects.find(p=>p.user_id===session.id&&p.is_personal_inbox);if(!project){project={id:id(),user_id:session.id,name:'Personal',goal:'',project_type:'personal',is_personal_inbox:true,status:'active',created_at:new Date().toISOString(),updated_at:new Date().toISOString()};next.projects.push(project);}}
  next.tasks.push({id:id(),user_id:session.id,project_id:project.id,title,priority:'medium',completed:false,planned_date:day||null,start_time:time||null,duration_minutes:duration,due_date:form.get('deadline')||null,created_at:new Date().toISOString(),updated_at:new Date().toISOString()});
  try{saveState(next);}catch{error.textContent='Could not save. Please try again.';return;}
  state=next;quickModal.close();filterSelect.innerHTML='<option value="">All projects</option>'+state.projects.filter(p=>p.user_id===session.id&&p.status!=='archived').map(p=>'<option value="'+p.id+'">'+escapeHtml(p.name)+'</option>').join('');filterSelect.value=filterProject;render();showToast('Task added');
});

document.querySelectorAll('[data-planner-pane]').forEach(button=>button.addEventListener('click',()=>{const calendar=button.dataset.plannerPane==='calendar';document.querySelector('#workspace-view').classList.toggle('mobile-show-week',calendar);document.querySelectorAll('[data-planner-pane]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));if(calendar)requestAnimationFrame(scrollToCurrentHour);}));
