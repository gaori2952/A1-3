import test from 'node:test';
import assert from 'node:assert/strict';
import { weekDates, timedEvents } from '../js/plannerView.js';
import { archiveEntries } from '../js/archiveView.js';
test('weeks run Sunday to Saturday across month and year boundaries',()=>{
  assert.deepEqual(weekDates('2026-10-04'),['2026-10-04','2026-10-05','2026-10-06','2026-10-07','2026-10-08','2026-10-09','2026-10-10']);
  assert.equal(weekDates('2026-10-03')[0],'2026-09-27');
  assert.equal(weekDates('2026-12-31',1)[0],'2027-01-03');
  assert.equal(weekDates('2027-01-01')[0],'2026-12-27');
});
test('timeless, completed and different day tasks are excluded',()=>{const tasks=[{id:'a',planned_date:'2026-10-04',start_time:'10:00',duration_minutes:60},{id:'b',planned_date:'2026-10-04'},{id:'c',planned_date:'2026-10-04',start_time:'11:00',completed:true},{id:'d',planned_date:'2026-10-05',start_time:'11:00'}];assert.deepEqual(timedEvents(tasks,'2026-10-04').map(e=>e.task.id),['a']);});
test('overlapping tasks use separate lanes and touching events do not',()=>{const tasks=[{id:'a',planned_date:'d',start_time:'10:00',duration_minutes:60},{id:'b',planned_date:'d',start_time:'10:30',duration_minutes:60},{id:'c',planned_date:'d',start_time:'12:00',duration_minutes:60}];const result=timedEvents(tasks,'d');assert.equal(result[0].lanes,2);assert.notEqual(result[0].lane,result[1].lane);assert.equal(result[2].lanes,1);});
test('planned project is excluded from archive until completed',()=>{const state={projects:[{id:'p',user_id:'u',status:'planned'}],tasks:[]};assert.equal(archiveEntries(state,'u').projects.length,0);state.projects[0].status='completed';assert.equal(archiveEntries(state,'u').projects.length,1);});

