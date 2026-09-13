import { getState, saveState, getSession, setSession, id, seedDemo } from './supabaseClient.js';

let signUp = false;
const form = document.querySelector('#auth-form');
const title = document.querySelector('#auth-title');
const eyebrow = document.querySelector('#auth-eyebrow');
const description = document.querySelector('#auth-description');
const submit = document.querySelector('#auth-submit');
const switchButton = document.querySelector('#switch-auth');
const error = document.querySelector('#auth-error');

if (getSession()) location.href = 'index.html';
function updateMode() { signUp = !signUp; eyebrow.textContent = signUp ? '새로 시작하기' : '다시 오신 것을 환영합니다'; title.textContent = signUp ? '워크스페이스 만들기' : '워크스페이스에 로그인'; description.textContent = signUp ? '시작한 일을 더 차분하게 끝내보세요.' : '프로젝트가 기다리고 있습니다.'; submit.textContent = signUp ? '계정 만들기' : '로그인'; switchButton.textContent = signUp ? '이미 계정이 있나요? 로그인' : '처음이신가요? 계정 만들기'; error.textContent = ''; }
switchButton.addEventListener('click', updateMode);
form.addEventListener('submit', event => { event.preventDefault(); const data = new FormData(form); const email = data.get('email').trim().toLowerCase(); const password = data.get('password'); const state = getState(); if (signUp) { if (state.users.some(user => user.email === email)) { error.textContent = '이미 가입된 이메일입니다.'; return; } state.users.push({ id: id(), email, password }); saveState(state); } else if (!state.users.some(user => user.email === email && user.password === password)) { error.textContent = '이메일 또는 비밀번호를 확인해주세요.'; return; } setSession({ id: signUp ? state.users.at(-1).id : state.users.find(user => user.email === email).id, email }); location.href = 'index.html'; });
document.querySelector('#demo-login').addEventListener('click', () => { seedDemo(); setSession({ id: 'demo', email: 'demo@projectflow.local' }); location.href = 'index.html'; });