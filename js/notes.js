import { getState, saveState, id, escapeHtml } from './supabaseClient.js?v=8';
import { listNotes, writeNote } from './notesStore.js';

export function initializeNotes(userId) {
  const root = document.querySelector('#notes-view');
  const list = root.querySelector('#note-list');
  const editor = root.querySelector('#note-editor');
  const title = root.querySelector('#note-title');
  const body = root.querySelector('#note-body');
  const status = root.querySelector('#note-status');
  const project = root.querySelector('#note-project');
  const pin = root.querySelector('#note-pin');
  const trashButton = root.querySelector('#note-trash');
  let selected = null, query = '', trash = false, dirty = false, timer;
  const owned = () => (getState().notes || []).find(note => note.id === selected && note.user_id === userId);
  project.innerHTML = '<option value="">No project</option>' + getState().projects.filter(p => p.user_id === userId).map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  function renderList() {
    const notes = listNotes(getState(), userId, { query, trash });
    list.innerHTML = notes.map(note => `<button class="note-row ${note.id === selected ? 'selected' : ''}" data-note="${note.id}" aria-pressed="${note.id === selected}"><strong>${note.pinned ? '<span class="note-pin-mark" aria-label="Pinned">•</span> ' : ''}${escapeHtml(note.title || 'Untitled note')}</strong><span>${escapeHtml(note.body.slice(0, 100) || 'Empty note')}</span><small>${new Date(note.updated_at).toLocaleDateString('en-US', {month:'short', day:'numeric'})}</small></button>`).join('') || '<p class="notes-empty">' + (query ? 'No matching notes.' : trash ? 'Trash is empty.' : 'Your notes will appear here.') + '</p>';
    root.querySelector('#note-count').textContent = notes.length;
  }
  function persist(patch) {
    try { saveState(writeNote(getState(), userId, selected, patch)); status.textContent = 'Saved on this browser'; renderList(); return true; }
    catch { status.textContent = 'Could not save. Keep this page open and try Save again.'; return false; }
  }
  function flush() {
    clearTimeout(timer);
    if (!dirty || !selected) return true;
    if (!persist({title:title.value, body:body.value, project_id:project.value || null})) return false;
    dirty = false; return true;
  }
  function select(noteId) {
    if (!flush()) return;
    selected = noteId;
    const note = owned();
    editor.classList.toggle('hidden', !note);
    root.querySelector('#note-placeholder').classList.toggle('hidden', Boolean(note));
    root.classList.toggle('editing-note', Boolean(note));
    if (note) {
      title.value = note.title; body.value = note.body; project.value = note.project_id || '';
      title.readOnly = body.readOnly = Boolean(note.deleted_at); project.disabled = Boolean(note.deleted_at);
      pin.disabled = Boolean(note.deleted_at); pin.setAttribute('aria-pressed', String(note.pinned)); pin.textContent = note.pinned ? 'Unpin' : 'Pin';
      trashButton.textContent = note.deleted_at ? 'Restore' : 'Move to trash';
      root.querySelector('#note-save').disabled = Boolean(note.deleted_at);
      status.textContent = note.deleted_at ? 'In trash' : 'Saved on this browser';
    }
    renderList();
  }
  root.querySelector('#new-note').addEventListener('click', () => {
    if (!flush()) return;
    const newId = id();
    try { saveState(writeNote(getState(), userId, newId, {})); }
    catch { status.textContent = 'Could not create a note. Browser storage is full.'; return; }
    trash = false; root.querySelector('#notes-trash-toggle').setAttribute('aria-pressed','false');
    query = ''; root.querySelector('#note-search').value = '';
    select(newId); title.focus();
  });
  list.addEventListener('click', event => { const button = event.target.closest('[data-note]'); if (button) select(button.dataset.note); });
  [title,body].forEach(input => input.addEventListener('input', () => { dirty = true; status.textContent = 'Saving…'; clearTimeout(timer); timer = setTimeout(flush, 500); }));
  project.addEventListener('change', () => { dirty = true; flush(); });
  root.querySelector('#note-save').addEventListener('click', flush);
  pin.addEventListener('click', () => { if (flush() && persist({pinned:!owned().pinned})) select(selected); });
  trashButton.addEventListener('click', () => { if (!flush()) return; if (persist({deleted_at:owned().deleted_at ? null : new Date().toISOString()})) select(null); });
  root.querySelector('#note-search').addEventListener('input', event => { query = event.target.value; renderList(); });
  root.querySelector('#notes-trash-toggle').addEventListener('click', event => { if (!flush()) return; trash = !trash; event.currentTarget.setAttribute('aria-pressed', String(trash)); select(null); });
  root.querySelector('#notes-back').addEventListener('click', () => { if (flush()) root.classList.remove('editing-note'); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', event => { if (!flush()) { event.preventDefault(); event.returnValue = ''; } });
  root.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key === 's') { event.preventDefault(); flush(); } });
  renderList();
}
