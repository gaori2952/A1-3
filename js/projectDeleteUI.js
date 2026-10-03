import { getState, saveState } from './supabaseClient.js?v=3';
import { removeOwnedProject } from './projectDeletion.js';

export function wireProjectDeletion(session) {
  const dialog = document.createElement('dialog');
  dialog.className = 'modal project-delete-modal';
  dialog.setAttribute('aria-labelledby', 'project-delete-title');
  dialog.innerHTML = `
    <form>
      <div class="delete-dialog-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6"/></svg></div>
      <h2 id="project-delete-title">프로젝트를 삭제할까요?</h2>
      <p class="project-delete-description">프로젝트에 연결된 기록도 함께 삭제됩니다.</p>
      <div class="delete-project-summary">
        <span class="delete-summary-label">삭제할 프로젝트</span>
        <p class="project-delete-name"></p>
        <div class="delete-summary-counts"><span>작업 <strong data-delete-task-count></strong></span><span>이슈 <strong data-delete-issue-count></strong></span></div>
      </div>
      <p class="delete-permanent-note">삭제한 프로젝트와 기록은 복구할 수 없어요.</p>
      <p class="form-error" role="alert"></p>
      <div class="form-actions"><button type="button" class="button button-ghost" data-cancel-delete>취소</button><button type="submit" class="button button-danger">삭제하기</button></div>
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
    dialog.querySelector('[data-delete-task-count]').textContent = taskCount + '개';
    dialog.querySelector('[data-delete-issue-count]').textContent = issueCount + '개';
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

