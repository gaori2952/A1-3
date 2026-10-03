import test from 'node:test';
import assert from 'node:assert/strict';
import { archiveEntries } from '../js/archiveView.js';

test('existing active projects with completed tasks appear without migration', () => {
  const state = {projects: [{id:'p',user_id:'u',status:'active'}], tasks: [{id:'t',project_id:'p',user_id:'u',completed:true}]};
  assert.equal(archiveEntries(state,'u').projects.length,1);
  assert.equal(archiveEntries(state,'u').tasks.length,1);
  state.tasks[0].completed=false;
  assert.deepEqual(archiveEntries(state,'u'),{projects:[],tasks:[]});
});
test('partial completion is visible but empty and overdue projects are not complete', () => {
  const state = {projects: [{id:'p',user_id:'u',status:'active'},{id:'empty',user_id:'u',status:'active'}], tasks: [{id:'done',project_id:'p',user_id:'u',completed:true},{id:'late',project_id:'p',user_id:'u',completed:false,due_date:'2020-01-01'}]};
  assert.deepEqual(archiveEntries(state,'u').projects,[]);
  assert.deepEqual(archiveEntries(state,'u').tasks.map(t=>t.id),['done']);
});
test('other users and orphan tasks are excluded; explicitly archived project remains', () => {
  const state = {projects: [{id:'p',user_id:'u',status:'archived'},{id:'foreign',user_id:'v',status:'archived'}], tasks: [{id:'x',project_id:'foreign',user_id:'v',completed:true},{id:'orphan',project_id:'none',user_id:'u',completed:true}]};
  assert.deepEqual(archiveEntries(state,'u').projects.map(p=>p.id),['p']);
  assert.deepEqual(archiveEntries(state,'u').tasks,[]);
});
