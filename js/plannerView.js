export function weekDates(today, offset = 0) {
  const date = new Date(today + 'T12:00:00');
  date.setDate(date.getDate() - date.getDay() + offset * 7);
  return Array.from({length:7},(_,i)=>{ const d=new Date(date);d.setDate(d.getDate()+i);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); });
}
export function timedEvents(tasks, day) {
  const events=tasks.filter(t=>!t.completed && t.planned_date===day && /^([01]\d|2[0-3]):[0-5]\d$/.test(t.start_time||'')).map(task=>{
    const [h,m]=task.start_time.split(':').map(Number);
    return {task,start:h*60+m,end:Math.min(1440,h*60+m+(Number.isInteger(task.duration_minutes)?task.duration_minutes:60))};
  }).sort((a,b)=>a.start-b.start || a.end-b.end);
  let group=[],groupEnd=0;
  const finish=()=>{const lanes=[];for(const event of group){let lane=lanes.findIndex(end=>end<=event.start);if(lane<0)lane=lanes.length;lanes[lane]=event.end;event.lane=lane;}for(const event of group)event.lanes=lanes.length;group=[];};
  for(const event of events){if(group.length && event.start>=groupEnd)finish();group.push(event);groupEnd=Math.max(group.length===1?0:groupEnd,event.end);}
  finish();return events;
}
