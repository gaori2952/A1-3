import { wireProjectDeletion } from './projectDeleteUI.js?v=1';
import { getState, saveState, requireSession, projectProgress, id, todayKey, addDays, getSettings, getProjectTypes, wireLogout, escapeHtml } from './supabaseClient.js?v=4';
import { weekDates, timedEvents } from './plannerView.js';
const session=requireSession();if(!session)throw new Error('No session');
wireLogout();wireProjectDeletion(session);
const state=getState(),today=todayKey();
const typeLabels={school:'학교',home:'집',work:'업무',study:'공부',development:'개발',research:'연구',content:'콘텐츠',personal:'개인',other:'기타'};
const priorityLabels={low:'낮음',medium:'보통',high:'높음'};
const projectTypes=getProjectTypes(session.id);
const projectById=pid=>state.projects.find(p=>p.id===pid&&p.user_id===session.id);
const taskProject=t=>projectById(t.project_id);
const topicLabel=key=>projectTypes.find(t=>t.key===key)?.label||typeLabels[key]||'기타';
const typeSelect=document.querySelector('select[name="project_type"]');
if(typeSelect)typeSelect.innerHTML=projectTypes.map(t=>'<option value="'+t.key+'">'+escapeHtml(t.label)+'</option>').join('');
const view=new URLSearchParams(location.search).get('view')||'today';
document.querySelector('#workspace-view').classList.toggle('hidden',view!=='today');
document.querySelector('#projects-section').classList.toggle('hidden',view==='ai');
document.querySelector('#ai-view').classList.toggle('hidden',view!=='ai');
document.querySelector('#view-title').textContent=view==='projects'?'프로젝트':view==='ai'?'AI 도우미':'오늘과 일정';
document.querySelector('#planner-date').textContent=new Date(today+'T12:00:00').toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric',weekday:'long'});
let weekOffset=0,selectedTaskId=null,focusedTaskId=null,searchQuery='',filterProject='',agendaMode=false;
const filterSelect=document.querySelector('#project-filter');filterSelect.innerHTML='<option value="">모든 프로젝트</option>'+state.projects.filter(p=>p.user_id===session.id&&p.status!=='archived').map(p=>'<option value="'+p.id+'">'+escapeHtml(p.name)+'</option>').join('');
const visibleTasks=()=>ownedTasks().filter(t=>(!filterProject||t.project_id===filterProject)&&(!searchQuery||(t.title+' '+(taskProject(t)?.name||'')).toLocaleLowerCase().includes(searchQuery)));
const ownedTasks=()=>state.tasks.filter(t=>t.user_id===session.id&&taskProject(t));
const timeText=t=>t.start_time?(t.start_time+' · '+(t.duration_minutes||60)+'분'):(t.planned_date?'시간 미정':'날짜 미정');
function taskRow(task){const p=taskProject(task);return '<div class="planner-task '+(focusedTaskId===task.id?'selected':'')+'"><input type="checkbox" class="task-check" data-dashboard-task="'+task.id+'" '+(task.completed?'checked':'')+' aria-label="'+escapeHtml(task.title)+' 완료"><button class="task-select" data-edit-time="'+task.id+'"><strong>'+escapeHtml(task.title)+'</strong><small>'+escapeHtml(p?.name||'')+' · '+timeText(task)+'</small></button><span class="priority '+task.priority+'">'+priorityLabels[task.priority]+'</span></div>';}
function renderToday(){const tasks=visibleTasks().filter(t=>!t.completed);const current=tasks.filter(t=>t.planned_date===today||(!t.planned_date&&t.due_date===today));const late=tasks.filter(t=>(t.planned_date&&t.planned_date<today)||(t.due_date&&t.due_date<today));document.querySelector('#today-count').textContent=current.length;document.querySelector('#overdue-count').textContent=late.length;document.querySelector('#today-label').textContent=new Date(today+'T12:00:00').toLocaleDateString('ko-KR',{month:'numeric',day:'numeric'});document.querySelector('#today-list').innerHTML=current.length?current.map(taskRow).join(''):'<div class="planner-empty">오늘 예정된 작업이 없습니다.</div>';document.querySelector('#overdue-list').innerHTML=late.map(taskRow).join('');document.querySelector('#overdue-section').classList.toggle('hidden',!late.length);}
function pastel(p){const index=state.projects.filter(p=>p.user_id===session.id).findIndex(x=>x.id===p?.id);return 'pastel-'+Math.max(0,index)%6;}
function renderCalendar(){const days=weekDates(today,weekOffset),tasks=visibleTasks().filter(t=>!t.completed);const events=days.map(day=>timedEvents(tasks,day));const all=events.flat();const first=Math.min(8,...all.map(e=>Math.floor(e.start/60)));const last=Math.max(20,...all.map(e=>Math.ceil(e.end/60)));const height=(last-first)*48;document.querySelector('#week-label').textContent=days[0].slice(5).replace('-','.')+' — '+days[6].slice(5).replace('-','.');const noDeadline=tasks.filter(t=>!t.due_date);document.querySelector('#no-deadline-list').innerHTML=noDeadline.length?noDeadline.map(t=>'<button data-edit-time="'+t.id+'" class="loose-task">'+escapeHtml(t.title)+'</button>').join(''):'<span class="muted">작업이 없습니다.</span>';const loose=tasks.filter(t=>t.due_date&&!t.start_time&&(!t.planned_date||days.includes(t.planned_date)));document.querySelector('#unscheduled-list').innerHTML=loose.length?loose.map(t=>'<button data-edit-time="'+t.id+'" class="loose-task '+pastel(taskProject(t))+'">'+escapeHtml(t.title)+'</button>').join(''):'<span class="muted">시간 미정 작업이 없습니다.</span>';document.querySelector('#week-agenda').innerHTML=days.map(day=>{const list=tasks.filter(t=>(t.planned_date||t.due_date)===day).sort((a,b)=>(a.start_time||'99:99').localeCompare(b.start_time||'99:99'));return '<section><h3>'+Number(day.slice(5,7))+'월 '+Number(day.slice(8))+'일</h3>'+(list.length?list.map(taskRow).join(''):'<p class="agenda-empty">일정 없음</p>')+'</section>';}).join('');const head='<div class="time-gutter"></div>'+days.map((day,i)=>'<div class="time-day '+(day===today?'is-today':'')+'"><span>'+['월','화','수','목','금','토','일'][i]+'</span><strong>'+Number(day.slice(8))+'</strong></div>').join('');const hours='<div class="hour-labels" style="height:'+height+'px">'+Array.from({length:last-first},(_,i)=>'<span style="top:'+(i*48)+'px">'+String(first+i).padStart(2,'0')+':00</span>').join('')+'</div>';document.querySelector('#calendar').innerHTML=head+hours+days.map((day,i)=>'<div class="time-day-column" style="height:'+height+'px">'+events[i].map(e=>'<button class="time-event '+pastel(taskProject(e.task))+'" data-edit-time="'+e.task.id+'" style="top:'+((e.start-first*60)*.8)+'px;height:'+Math.max(22,(e.end-e.start)*.8)+'px;left:calc('+e.lane*100/e.lanes+'% + 3px);width:calc('+100/e.lanes+'% - 6px)" title="'+escapeHtml(e.task.title)+'"><strong>'+escapeHtml(e.task.title)+'</strong><small>'+e.task.start_time+'</small></button>').join('')+'</div>').join('');}
function renderProjects(){const projects=state.projects.filter(p=>p.user_id===session.id&&p.status!=='archived').sort((a,b)=>(a.due_date||'9999').localeCompare(b.due_date||'9999'));document.querySelector('#active-count').textContent=projects.length;document.querySelector('#project-grid').innerHTML=projects.map(p=>{const ts=ownedTasks().filter(t=>t.project_id===p.id);return '<article class="project-list-row"><a href="project.html?id='+p.id+'"><span class="project-color '+pastel(p)+'"></span><div><h3>'+escapeHtml(p.name)+'</h3><small>'+(p.due_date?'마감 '+p.due_date:'마감일 없음')+'</small></div><span class="project-task-count">'+ts.filter(t=>t.completed).length+' / '+ts.length+'</span><span class="project-percent">'+projectProgress(p.id,state)+'%</span></a><button class="button button-ghost button-small" data-delete-project="'+p.id+'" aria-label="'+escapeHtml(p.name)+' 프로젝트 삭제">삭제</button></article>';}).join('');document.querySelector('#empty-state').classList.toggle('hidden',projects.length>0);document.querySelector('#project-grid').classList.toggle('hidden',!projects.length);document.querySelector('#ai-project-list').innerHTML=projects.length?projects.map(p=>'<a class="ai-project-row" href="insights.html?id='+p.id+'"><span>'+escapeHtml(p.name)+'</span><small>진행 분석 →</small></a>').join(''):'<p class="planner-empty">먼저 프로젝트를 만들어주세요.</p>';}

function render(){renderToday();renderCalendar();renderProjects();}
document.addEventListener('change',event=>{const input=event.target;if(input.dataset.dashboardTask){const t=ownedTasks().find(t=>t.id===input.dataset.dashboardTask);if(t){t.completed=input.checked;t.updated_at=new Date().toISOString();saveState(state);render();}}if(input.dataset.projectStatus){const p=projectById(input.dataset.projectStatus);if(p&&['planned','active','completed'].includes(input.value)){p.status=input.value;p.updated_at=new Date().toISOString();saveState(state);render();}}});
const timeModal=document.querySelector('#task-time-modal'),timeForm=document.querySelector('#task-time-form');
document.addEventListener('click',event=>{const button=event.target.closest('[data-edit-time]');if(!button)return;const task=ownedTasks().find(t=>t.id===button.dataset.editTime);if(!task)return;selectedTaskId=task.id;focusedTaskId=task.id;renderToday();document.querySelector('#time-task-title').textContent=task.title;timeForm.elements.date.value=task.planned_date||'';timeForm.elements.time.value=task.start_time||'';timeForm.elements.duration.value=task.duration_minutes||60;document.querySelector('#time-error').textContent='';timeModal.showModal();});
document.querySelectorAll('[data-close-time]').forEach(b=>b.addEventListener('click',()=>timeModal.close()));
timeForm.addEventListener('submit',event=>{event.preventDefault();const task=ownedTasks().find(t=>t.id===selectedTaskId);if(!task)return;const day=timeForm.elements.date.value,time=timeForm.elements.time.value,duration=Number(timeForm.elements.duration.value);if(time&&!day){document.querySelector('#time-error').textContent='시간을 지정하려면 날짜도 선택해주세요.';return;}const [h,m]=(time||'00:00').split(':').map(Number);if(!Number.isInteger(duration)||duration<15||duration>480||(time&&h*60+m+duration>1440)){document.querySelector('#time-error').textContent='소요 시간은 15~480분이며 같은 날짜 안에 끝나야 합니다.';return;}task.planned_date=day||null;task.start_time=time||null;task.duration_minutes=duration;task.updated_at=new Date().toISOString();saveState(state);timeModal.close();render();});
document.querySelector('#task-search').addEventListener('input',event=>{searchQuery=event.target.value.trim().toLocaleLowerCase();renderToday();renderCalendar();});
filterSelect.addEventListener('change',event=>{filterProject=event.target.value;renderToday();renderCalendar();});
document.querySelector('#week-jump').addEventListener('change',event=>{if(!event.target.value)return;const base=weekDates(today,0)[0],target=weekDates(event.target.value,0)[0];weekOffset=Math.round((Date.parse(target+'T12:00:00Z')-Date.parse(base+'T12:00:00Z'))/604800000);renderCalendar();});
document.querySelector('#calendar-mode').onclick=event=>{agendaMode=!agendaMode;document.querySelector('.week-scroll').classList.toggle('hidden',agendaMode);document.querySelector('#week-agenda').classList.toggle('hidden',!agendaMode);event.currentTarget.textContent=agendaMode?'시간표':'목록';event.currentTarget.setAttribute('aria-pressed',String(agendaMode));};
document.querySelector('#week-prev').onclick=()=>{weekOffset--;renderCalendar();};document.querySelector('#week-next').onclick=()=>{weekOffset++;renderCalendar();};document.querySelector('#week-today').onclick=()=>{weekOffset=0;renderCalendar();};
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
  if (!name || !goal) { status.textContent = '프로젝트 이름과 목표를 입력해주세요.'; return; }
  const project = { id: id(), user_id: session.id, name, goal, description: data.get('description').trim(), project_type: data.get('project_type'), due_date: data.get('due_date') || null, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  if (!useAi) { state.projects.push(project); saveState(state); location.href = `project.html?id=${project.id}`; return; }
  const button = document.querySelector('#ai-project');
  if (button.disabled) return;
  button.disabled = true;
  document.querySelector('#empty-project').disabled = true;
  button.textContent = '일정 만드는 중...';
  status.textContent = '목표와 마감일에 맞는 실행 일정을 준비하고 있습니다.';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55000);
  try {
    const response = await fetch('/api/starter_plan', { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_name: project.name, project_type: project.project_type, goal: project.goal, due_date: project.due_date, start_date: today, description: project.description }) });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) throw new Error(payload?.message || '시작 플랜을 만들지 못했습니다. 다시 시도해주세요.');
    const suggestions = payload.tasks;
    if (payload.provider !== 'openai-compatible' || !Array.isArray(suggestions) || !suggestions.length || suggestions.some(task => typeof task.title !== 'string' || typeof task.reason !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(task.planned_date) || !Number.isInteger(task.duration_minutes) || !['high','medium','low'].includes(task.priority))) throw new Error('AI 응답 형식이 올바르지 않습니다. 다시 시도해주세요.');
    document.querySelector('#plan-title').textContent = `${project.name} 추천 일정`;
    document.querySelector('#starter-list').innerHTML = suggestions.map((task, index) => `<label class="starter-item"><input type="checkbox" name="starter-task" value="${index}" checked><span class="starter-copy"><strong>${escapeHtml(task.planned_date)} · ${task.duration_minutes}분</strong><span>${escapeHtml(task.title)}</span><span class="priority ${task.priority}">우선순위 ${priorityLabels[task.priority]}</span><small>${escapeHtml(task.reason)}</small></span></label>`).join('');
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
    status.textContent = error.name === 'AbortError' ? 'AI 응답 시간이 초과됐습니다. 다시 시도하거나 직접 작업을 추가해주세요.' : (error instanceof TypeError ? '네트워크 연결을 확인해주세요.' : error.message);
  } finally {
    clearTimeout(timer);
    button.disabled = false;
    document.querySelector('#empty-project').disabled = false;
    button.textContent = 'AI 일정 추천';
  }
}

const planModal = document.querySelector('#schedule-modal');
async function openPlanner() { const unplanned = state.tasks.filter(task => task.user_id === session.id && !task.completed && !task.planned_date); const settings = getSettings(session.id); let schedule; try { const response = await fetch('/api/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', tasks: unplanned, settings }) }); if (!response.ok) throw new Error('Schedule API unavailable'); const result = await response.json(); schedule = result.schedule.map(item => ({ task: unplanned.find(task => task.id === item.task_id), date: item.planned_date })); } catch { schedule = unplanned.slice(0, settings.daily_task_limit * 14).map((task, index) => ({ task, date: addDays(today, Math.floor(index / settings.daily_task_limit)) })); } document.querySelector('#schedule-preview').innerHTML = schedule.length ? schedule.map(item => `<div class="schedule-preview-row"><strong>${item.date}</strong><span>${escapeHtml(taskProject(item.task)?.name || '')} · ${escapeHtml(item.task.title)}</span></div>`).join('') : '<div class="inline-empty">배치할 미계획 작업이 없습니다.</div>'; planModal.showModal(); document.querySelector('#schedule-form').onsubmit = event => { event.preventDefault(); schedule.forEach(item => { item.task.planned_date = item.date; item.task.updated_at = new Date().toISOString(); }); saveState(state); planModal.close(); render(); }; }
document.querySelector('#plan-button').addEventListener('click', openPlanner);
document.querySelectorAll('[data-scroll-target]').forEach(element => { const scroll = () => document.querySelector(`#${element.dataset.scrollTarget}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); element.addEventListener('click', scroll); element.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); scroll(); } }); });


