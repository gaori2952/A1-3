import { getProjectTypes, saveSettings, requireSession, wireLogout, id } from './supabaseClient.js?v=3';

const session = requireSession();
if (!session) throw new Error('No session');
wireLogout();
let types = getProjectTypes(session.id);
let editingKey = null;
const list = document.querySelector('#type-list');
const modal = document.querySelector('#type-modal');
const form = document.querySelector('#type-form');
const canvasButton = document.querySelector('#canvas-sync');
const canvasStatus = document.querySelector('#canvas-status');
const canvasPreview = document.querySelector('#canvas-preview');
document.querySelectorAll('.modal-close').forEach(button => { button.type = 'button'; button.addEventListener('click', () => button.closest('dialog').close()); });

function render() { list.innerHTML = types.map(type => `<div class="type-row"><span class="topic-dot" style="background:${type.color}"></span><strong>${type.label}</strong><code>${type.key}</code><span class="type-color">${type.color}</span><button class="button button-small button-ghost" data-edit="${type.key}">수정</button><button class="item-delete" data-delete="${type.key}" aria-label="유형 삭제">×</button></div>`).join(''); document.querySelectorAll('[data-edit]').forEach(button => button.addEventListener('click', () => openEditor(button.dataset.edit))); document.querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', () => { types = types.filter(type => type.key !== button.dataset.delete); save(); render(); })); }
function save() { saveSettings(session.id, { project_types: types }); }
function openEditor(key = null) { editingKey = key; const type = types.find(item => item.key === key); document.querySelector('#type-title').textContent = type ? '유형 수정' : '유형 추가'; form.elements.label.value = type?.label || ''; form.elements.color.value = type?.color || '#2457c5'; modal.showModal(); }
document.querySelector('#add-type').addEventListener('click', () => openEditor());
form.addEventListener('submit', event => { event.preventDefault(); const label = form.elements.label.value.trim(); const color = form.elements.color.value; if (!label) return; if (editingKey) { const type = types.find(item => item.key === editingKey); type.label = label; type.color = color; } else { const key = `${label.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '')}-${id().slice(0, 4)}`; types.push({ key, label, color }); } save(); modal.close(); form.reset(); render(); });
render();

function formatCanvasDueDate(dueAt) {
  if (!dueAt) return '마감일 없음';
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return '마감일 확인 필요';
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function setCanvasStatus(message, state = '') {
  canvasStatus.textContent = message;
  if (state) canvasStatus.dataset.state = state;
  else delete canvasStatus.dataset.state;
}

function renderCanvasPreview(assignments) {
  canvasPreview.replaceChildren();
  if (!assignments.length) {
    canvasPreview.classList.add('hidden');
    return;
  }

  const header = document.createElement('div');
  header.className = 'canvas-preview-header';
  const summary = document.createElement('strong');
  summary.textContent = `Canvas에서 ${assignments.length}개의 과제를 찾았습니다.`;
  const selectionCount = document.createElement('span');
  selectionCount.className = 'muted';
  header.append(summary, selectionCount);

  const list = document.createElement('fieldset');
  list.className = 'canvas-assignment-list';
  list.setAttribute('aria-label', '가져올 Canvas 과제 선택');

  assignments.forEach((assignment, index) => {
    const row = document.createElement('label');
    row.className = 'canvas-assignment';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.value = String(assignment.assignment_id ?? index);
    const copy = document.createElement('span');
    copy.className = 'canvas-assignment-copy';
    const course = document.createElement('span');
    course.className = 'canvas-assignment-course';
    course.textContent = assignment.course_name || '이름 없는 과목';
    const title = document.createElement('span');
    title.className = 'canvas-assignment-title';
    title.textContent = assignment.title || '제목 없는 과제';
    copy.append(course, title);
    const date = document.createElement('time');
    date.className = 'canvas-assignment-date';
    if (assignment.due_at) date.dateTime = assignment.due_at;
    date.textContent = formatCanvasDueDate(assignment.due_at);
    row.append(checkbox, copy, date);
    list.append(row);
  });

  const actions = document.createElement('div');
  actions.className = 'canvas-preview-actions';
  const importButton = document.createElement('button');
  importButton.type = 'button';
  importButton.className = 'button button-primary';
  importButton.textContent = '선택한 일정 가져오기';
  const updateSelection = () => {
    const selected = list.querySelectorAll('input:checked').length;
    selectionCount.textContent = `${selected}개 선택됨`;
    importButton.disabled = selected === 0;
  };
  list.addEventListener('change', updateSelection);
  importButton.addEventListener('click', () => {
    const selected = list.querySelectorAll('input:checked').length;
    setCanvasStatus(`${selected}개의 과제를 선택했습니다. 일정 저장 기능은 다음 단계에서 제공됩니다.`, 'success');
  });
  actions.append(importButton);
  canvasPreview.append(header, list, actions);
  canvasPreview.classList.remove('hidden');
  updateSelection();
}

canvasButton.addEventListener('click', async () => {
  canvasButton.disabled = true;
  canvasPreview.classList.add('hidden');
  setCanvasStatus('Canvas 일정을 불러오고 있습니다...', 'loading');
  try {
    const response = await fetch('/api/canvas_sync', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.success) {
      throw new Error(payload.message || 'Canvas API 요청에 실패했습니다.');
    }
    const assignments = Array.isArray(payload.assignments) ? payload.assignments : [];
    renderCanvasPreview(assignments);
    setCanvasStatus(payload.message || (assignments.length ? `${assignments.length}개의 과제를 찾았습니다.` : '조회된 과제가 없습니다.'), assignments.length ? 'success' : '');
  } catch (error) {
    renderCanvasPreview([]);
    setCanvasStatus(error.message || '네트워크 오류로 Canvas 일정을 불러오지 못했습니다.', 'error');
  } finally {
    canvasButton.disabled = false;
  }
});
