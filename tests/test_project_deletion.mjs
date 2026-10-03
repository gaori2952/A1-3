import test from 'node:test';
import assert from 'node:assert/strict';
import { removeOwnedProject } from '../js/projectDeletion.js';
const state = {
 users: [{id:'owner'},{id:'other'}], settings: {owner:{daily_task_limit:3}},
 projects: [{id:'p1',user_id:'owner'},{id:'p2',user_id:'other'}],
 tasks: [{id:'t1',project_id:'p1'},{id:'t2',project_id:'p2'}],
 issues: [{id:'i1',project_id:'p1'},{id:'i2',project_id:'p2'}]
};
test('project deletion removes related tasks and issues while preserving other data', () => {
 const next = removeOwnedProject(state,'p1','owner');
 assert.deepEqual(next.projects,[state.projects[1]]);
 assert.deepEqual(next.tasks,[state.tasks[1]]);
 assert.deepEqual(next.issues,[state.issues[1]]);
 assert.deepEqual(next.users,state.users);
 assert.deepEqual(next.settings,state.settings);
 assert.equal(state.projects.length,2);
});
test('another user cannot delete a project', () => {
 assert.equal(removeOwnedProject(state,'p2','owner'),null);
});
test('missing projects cannot trigger deletion', () => {
 assert.equal(removeOwnedProject(state,'missing','owner'),null);
});

