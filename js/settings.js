import { getProjectTypes, saveSettings, requireSession, wireLogout, id } from './supabaseClient.js?v=3';

const session = requireSession();
if (!session) throw new Error('No session');
wireLogout();
let types = getProjectTypes(session.id);
let editingKey = null;
const list = document.querySelector('#type-list');
const modal = document.querySelector('#type-modal');
const form = document.querySelector('#type-form');

function render() { list.innerHTML = types.map(type => `<div class="type-row"><span class="topic-dot" style="background:${type.color}"></span><strong>${type.label}</strong><code>${type.key}</code><span class="type-color">${type.color}</span><button class="button button-small button-ghost" data-edit="${type.key}">수정</button><button class="item-delete" data-delete="${type.key}" aria-label="유형 삭제">×</button></div>`).join(''); document.querySelectorAll('[data-edit]').forEach(button => button.addEventListener('click', () => openEditor(button.dataset.edit))); document.querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', () => { types = types.filter(type => type.key !== button.dataset.delete); save(); render(); })); }
function save() { saveSettings(session.id, { project_types: types }); }
function openEditor(key = null) { editingKey = key; const type = types.find(item => item.key === key); document.querySelector('#type-title').textContent = type ? '유형 수정' : '유형 추가'; form.elements.label.value = type?.label || ''; form.elements.color.value = type?.color || '#2457c5'; modal.showModal(); }
document.querySelector('#add-type').addEventListener('click', () => openEditor());
form.addEventListener('submit', event => { event.preventDefault(); const label = form.elements.label.value.trim(); const color = form.elements.color.value; if (!label) return; if (editingKey) { const type = types.find(item => item.key === editingKey); type.label = label; type.color = color; } else { const key = `${label.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '')}-${id().slice(0, 4)}`; types.push({ key, label, color }); } save(); modal.close(); form.reset(); render(); });
render();