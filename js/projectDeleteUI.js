import { getState, saveState } from './supabaseClient.js?v=8';
import { removeOwnedProject } from './projectDeletion.js';

export function wireProjectDeletion(session) {
  const dialog = document.createElement('dialog');
  dialog.className = 'modal project-delete-modal';
  dialog.setAttribute('aria-labelledby', 'project-delete-title');
  dialog.innerHTML = `
    <form>
      <div class="delete-dialog-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6"/></svg></div>
      <h2 id="project-delete-title">Delete this project?</h2>
      <p class="project-delete-description">Its tasks and issues will also be deleted.</p>
      <div class="delete-project-summary">
        <span class="delete-summary-label">PROJECT</span>
        <p class="project-delete-name"></p>
        <div class="delete-summary-counts"><span>Tasks <strong data-delete-task-count></strong></span><span>Issues <strong data-delete-issue-count></strong></span></div>
      </div>
      <p class="delete-permanent-note">This action cannot be undone.</p>
      <p class="form-error" role="alert"></p>
      <div class="form-actions"><button type="button" class="button button-ghost" data-cancel-delete>Cancel</button><button type="submit" class="button button-danger">Delete</button></div>
    </form>`;
  document.body.append(dialog);
  let selectedId;
  dialog.querySelector('[data-cancel-delete]').addEventListener('click', () => dialog.close());
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-delete-project]');
    if (!button) return;
    const state = getState();
    const project = state.projects.find(item => item.id === button.dataset.deleteProject && item.user_id === session.id);
    if (!project) return;
    selectedId = project.id;
    dialog.querySelector('.project-delete-name').textContent = project.name;
    const taskCount = state.tasks.filter(item => item.project_id === project.id).length;
    const issueCount = state.issues.filter(item => item.project_id === project.id).length;
    dialog.querySelector('[data-delete-task-count]').textContent = taskCount + '';
    dialog.querySelector('[data-delete-issue-count]').textContent = issueCount + '';
    dialog.querySelector('.form-error').textContent = '';
    dialog.showModal();
    dialog.querySelector('[data-cancel-delete]').focus();
  });
  dialog.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    const next = removeOwnedProject(getState(), selectedId, session.id);
    if (!next) { dialog.querySelector('.form-error').textContent = 'Project not found. Refresh this page.'; return; }
    try {
      saveState(next);
      if (document.body.dataset.page === 'project') location.href = 'index.html';
      else location.reload();
    } catch {
      dialog.querySelector('.form-error').textContent = 'Could not save this change. Try again.';
    }
  });
}

