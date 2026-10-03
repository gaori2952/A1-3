export function listNotes(state, userId, { query = '', trash = false } = {}) {
  const needle = query.trim().toLocaleLowerCase();
  return (state.notes || []).filter(note => note.user_id === userId && Boolean(note.deleted_at) === trash && (!needle || `${note.title}\n${note.body}`.toLocaleLowerCase().includes(needle)))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at));
}

export function writeNote(state, userId, noteId, patch, now = new Date().toISOString()) {
  const notes = state.notes || [];
  const existing = notes.find(note => note.id === noteId);
  if (existing && existing.user_id !== userId) throw new Error('Note not found.');
  const allowed = Object.fromEntries(Object.entries(patch).filter(([key]) => ['title', 'body', 'pinned', 'project_id', 'deleted_at'].includes(key)));
  const next = { title: '', body: '', pinned: false, project_id: null, deleted_at: null, created_at: now, ...existing, ...allowed, id: noteId, user_id: userId, updated_at: now };
  return { ...state, notes: existing ? notes.map(note => note.id === noteId ? next : note) : [...notes, next] };
}
