import test from 'node:test';
import assert from 'node:assert/strict';
import { occursOn, dayEntries, parseTimetable, reviewPlan, monthDays, validateEvent } from '../js/semesterStore.js';
const course={id:'c',user_id:'u',title:'Course',kind:'class',repeat:'weekly',weekday:1,first_date:'2026-09-01',last_date:'2026-12-20',start_time:'09:00',end_time:'10:15'};
const state={calendar_events:[course],projects:[{id:'p',user_id:'u'}],tasks:[]};
test('semester bounds, weekdays, exceptions and pause are respected',()=>{
  assert.equal(occursOn(course,'2026-10-05'),true);
  for(const day of ['2026-08-31','2026-10-06','2026-12-21'])assert.equal(occursOn(course,day),false);
  assert.equal(occursOn({...course,excluded_dates:['2026-10-05']},'2026-10-05'),false);
  assert.equal(occursOn({...course,deleted_at:'now'},'2026-10-05'),false);
});
test('recurring completion applies only to its occurrence; owners stay isolated',()=>{
  const s={...state,calendar_events:[{...course,completed_dates:['2026-10-05']},{...course,id:'foreign',user_id:'v'}],tasks:[{id:'x',user_id:'v',project_id:'p',planned_date:'2026-10-05'}]};
  assert.equal(dayEntries(s,'u','2026-10-05').length,1);
  assert.equal(dayEntries(s,'u','2026-10-05')[0].completed,true);
  assert.equal(dayEntries(s,'u','2026-10-12')[0].completed,false);
});
test('review slots avoid both recurring classes and existing timed tasks',()=>{
  const s={...state,tasks:[{id:'t',user_id:'u',project_id:'p',planned_date:'2026-10-05',start_time:'10:15',duration_minutes:45}]};
  const plan=reviewPlan(s,'u',course,'2026-10-04',{offsets:[1],duration:30,from:'09:00',until:'12:00'});
  assert.equal(plan[0].time,'11:00');
});
test('full days and duplicate reviews are not silently scheduled',()=>{
  const opts={offsets:[1],duration:30,from:'09:00',until:'10:00'};
  assert.equal(reviewPlan(state,'u',course,'2026-10-04',opts)[0].reason,'No free time in this window');
  const s={...state,tasks:[{user_id:'u',review_key:'c:2026-10-04:1'}]};
  assert.equal(reviewPlan(s,'u',course,'2026-10-04',opts)[0].reason,'Already added');
});
test('reviews cross year boundaries and can finish at midnight',()=>{
  const rows=reviewPlan({...state,calendar_events:[]},'u',course,'2026-12-31',{offsets:[1,1,3],duration:30,from:'23:30',until:'24:00'});
  assert.deepEqual(rows.map(r=>r.date),['2027-01-01','2027-01-03']);assert.equal(rows[0].time,'23:30');
});
test('import validates all rows, personal blocks and semester lengths',()=>{
  const rows=parseTimetable('Course\tMon\t18:00\t20:45\t101\nPersonal\tTue\t11:00\t14:45\t\tevent','2026-09-01','2026-12-20');
  assert.equal(rows[1].kind,'event');assert.equal(rows[0].end_time,'20:45');
  assert.throws(()=>parseTimetable('X\tWed\t23:00\t01:00','2026-09-01','2026-12-20'),/Line 1/);
  assert.throws(()=>validateEvent({...course,first_date:'2026-02-30'}),/dates/);
  assert.throws(()=>reviewPlan(state,'u',course,'2026-10-04',{offsets:[-1]}),/intervals/);
});
test('month grids start Monday and include month boundaries',()=>{
  const days=monthDays('2026-10-01');assert.equal(days.length,42);assert.equal(days[0],'2026-09-28');assert.equal(days[41],'2026-11-08');
});
