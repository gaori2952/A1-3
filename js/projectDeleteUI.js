import { getState, saveState } from './supabaseClient.js?v=3';
import { removeOwnedProject } from './projectDeletion.js';

export function wireProjectDeletion(session) {
  const dialog = document.createElement('dialog');
  dialog.className = 'modal project-delete-modal';
  dialog.setAttribute('aria-labelledby', 'project-delete-title');
  dialog.innerHTML = '<form><h2 id="project-delete-title">프로젝트 삭제</h2><p class="project-delete-name"></p><p class="project-delete-description"></p><p class="form-error" role="alert"></p><div class="form-actions"><button type="button" class="button button-ghost" data-cancel-delete>취소</button><button type="submit" class="button button-danger">프로젝트 삭제</button></div></form>';
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
    dialog.querySelector('.project-delete-description').textContent = '이 프로젝트와 작업 ' + taskCount + '개, 이슈 ' + issueCount + '개가 함께 삭제됩니다. 삭제 후 복구할 수 없습니다.';
    dialog.querySelector('.form-error').textContent = '';
    dialog.showModal();
    dialog.querySelector('[data-cancel-delete]').focus();
  });
  dialog.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    const next = removeOwnedProject(getState(), selectedId, session.id);
    if (!next) { dialog.querySelector('.form-error').textContent = '프로젝트를 찾을 수 없습니다. 화면을 새로고침해주세요.'; return; }
    try {
      saveState(next);
      if (document.body.dataset.page === 'project') location.href = 'index.html';
      else location.reload();
    } catch {
      dialog.querySelector('.form-error').textContent = '삭제 내용을 저장하지 못했습니다. 다시 시도해주세요.';
    }
  });
}

