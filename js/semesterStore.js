export const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function dateKey(date) { return [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-'); }
export function shiftDate(day, amount) { const date = new Date(day+'T12:00:00'); date.setDate(date.getDate()+amount); return dateKey(date); }
export function validDate(day) { return /^\d{4}-\d{2}-\d{2}$/.test(day||'') && dateKey(new Date(day+'T12:00:00')) === day; }
export function minutes(time) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(time||'') ? Number(time.slice(0,2))*60+Number(time.slice(3)) : time==='24:00' ? 1440 : NaN; }
export function clock(value) { return String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0'); }
export function validateEvent(event) {
  if (!event.title?.trim()) throw new Error('Enter a name.');
  if (!validDate(event.first_date) || !validDate(event.last_date) || event.last_date < event.first_date) throw new Error('Check the start and end dates.');
  if (!['none','weekly','daily'].includes(event.repeat)) throw new Error('Choose a repeat option.');
  if (!['class','study','event'].includes(event.kind)) throw new Error('Choose an event type.');
  if (!Number.isInteger(event.weekday) || event.weekday<0 || event.weekday>6) throw new Error('Choose a weekday.');
  const start=minutes(event.start_time), end=minutes(event.end_time);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start>=end || start>=1440) throw new Error('End time must be after start time, within the same day.');
  if ((Date.parse(event.last_date)-Date.parse(event.first_date))/86400000>370) throw new Error('Keep a repeating schedule within one year.');
  return event;
}
export function occursOn(event, day) {
  if (event.deleted_at || day<event.first_date || day>event.last_date || event.excluded_dates?.includes(day)) return false;
  return event.repeat==='daily' || (event.repeat==='weekly' ? new Date(day+'T12:00:00').getDay()===event.weekday : day===event.first_date);
}
export function dayEntries(state, userId, day) {
  const events=(state.calendar_events||[]).filter(e=>e.user_id===userId && occursOn(e,day)).map(e=>({...e,date:day,source:'event',completed:(e.completed_dates||[]).includes(day)}));
  const projects=(state.projects||[]).filter(p=>p.user_id===userId);
  const tasks=(state.tasks||[]).filter(t=>t.user_id===userId && projects.some(p=>p.id===t.project_id) && (t.planned_date||t.due_date)===day).map(t=>({...t,date:day,source:'task',kind:t.review_key?'review':'task',color:t.color??4,location:projects.find(p=>p.id===t.project_id)?.name||'',end_time:t.start_time?clock(Math.min(1440,minutes(t.start_time)+(t.duration_minutes||60))):''}));
  return [...events,...tasks].sort((a,b)=>(a.start_time||'99:99').localeCompare(b.start_time||'99:99'));
}
export function monthDays(day) { const first=day.slice(0,7)+'-01'; const offset=(new Date(first+'T12:00:00').getDay()+6)%7; return Array.from({length:42},(_,i)=>shiftDate(first,i-offset)); }
export function parseTimetable(text, firstDate, lastDate) {
  if (!text.trim()) throw new Error('Paste one event per line.');
  return text.trim().split('\n').filter(line=>line.trim()).map((line,index)=>{
    const [title,day,start,end,location='',kind='class']=line.split('\t').map(s=>s.trim());
    const weekday=weekdays.findIndex(w=>w.toLowerCase()===(day||'').toLowerCase());
    try { return validateEvent({title,weekday,start_time:start,end_time:end,location,kind,repeat:'weekly',first_date:firstDate,last_date:lastDate,color:index%6}); }
    catch(error) { throw new Error('Line '+(index+1)+': '+error.message); }
  });
}
export function reviewPlan(state,userId,source,day,{offsets=[1,3,7],duration=30,from='09:00',until='22:00'}={}) {
  const start=minutes(from),end=minutes(until);
  if (!validDate(day) || !Number.isInteger(duration) || duration<15 || duration>180 || !Number.isFinite(start) || !Number.isFinite(end) || end-start<duration) throw new Error('Check the review duration and available hours.');
  if (!offsets.length || offsets.length>10 || offsets.some(n=>!Number.isInteger(n)||n<1||n>90)) throw new Error('Use 1–10 intervals between 1 and 90 days.');
  const dates=[...new Set(offsets)].sort((a,b)=>a-b);
  return dates.map(offset=>{
    const date=shiftDate(day,offset),key=source.id+':'+day+':'+offset;
    if ((state.tasks||[]).some(t=>t.user_id===userId&&t.review_key===key)) return {date,offset,key,reason:'Already added'};
    const busy=dayEntries(state,userId,date).filter(e=>e.start_time&&!e.completed).map(e=>[minutes(e.start_time),minutes(e.end_time)]);
    for(let at=start;at+duration<=end;at+=15) if(!busy.some(([a,b])=>at<b&&at+duration>a)) return {date,offset,key,time:clock(at),duration};
    return {date,offset,key,reason:'No free time in this window'};
  });
}
