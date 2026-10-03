import test from 'node:test';
import assert from 'node:assert/strict';
import { listNotes, writeNote } from '../js/notesStore.js';

test('notes preserve unrelated state and cannot overwrite another owner', () => {
  const base = {projects:[{id:'p'}],tasks:[{id:'t'}]};
  const saved = writeNote(base, 'one', 'n', {title:'일반역학',body:'시험 준비'}, '2026-10-04T00:00:00Z');
  assert.deepEqual(saved.tasks, base.tasks); assert.equal(base.notes, undefined);
  assert.throws(() => writeNote(saved,'two','n',{body:'overwrite'}));
  assert.equal(listNotes(saved,'two').length,0);
  assert.equal(listNotes(saved,'one',{query:'시험'})[0].title,'일반역학');
});
test('pin sorting, soft deletion and restore preserve note content', () => {
  let state=writeNote({},'one','a',{body:'Keep me',pinned:true},'2026-10-03T00:00:00Z');
  state=writeNote(state,'one','b',{title:'Recent'},'2026-10-04T00:00:00Z');
  assert.equal(listNotes(state,'one')[0].id,'a');
  state=writeNote(state,'one','a',{deleted_at:'2026-10-04T01:00:00Z'});
  assert.equal(listNotes(state,'one').length,1);
  assert.equal(listNotes(state,'one',{trash:true})[0].body,'Keep me');
  state=writeNote(state,'one','a',{deleted_at:null,user_id:'two'});
  assert.equal(listNotes(state,'one')[0].body,'Keep me');
});
