import { getState, saveState, getSession, setSession, id, seedDemo } from './supabaseClient.js?v=8';

let signUp = false;
const form = document.querySelector('#auth-form');
const title = document.querySelector('#auth-title');
const eyebrow = document.querySelector('#auth-eyebrow');
const description = document.querySelector('#auth-description');
const submit = document.querySelector('#auth-submit');
const switchButton = document.querySelector('#switch-auth');
const error = document.querySelector('#auth-error');

if (getSession()) location.href = 'index.html';
function updateMode() { signUp = !signUp; eyebrow.textContent = signUp ? 'GET STARTED' : 'WELCOME BACK'; title.textContent = signUp ? 'Create your workspace' : 'Sign in'; description.textContent = signUp ? 'A space for your plans and ideas.' : 'Open your workspace.'; submit.textContent = signUp ? 'Create account' : 'Sign in'; switchButton.textContent = signUp ? 'Already registered? Sign in' : 'Create an account'; error.textContent = ''; }
switchButton.addEventListener('click', updateMode);
form.addEventListener('submit', event => { event.preventDefault(); const data = new FormData(form); const email = data.get('email').trim().toLowerCase(); const password = data.get('password'); const state = getState(); if (signUp) { if (state.users.some(user => user.email === email)) { error.textContent = 'This email is already registered.'; return; } state.users.push({ id: id(), email, password }); saveState(state); } else if (!state.users.some(user => user.email === email && user.password === password)) { error.textContent = 'Check your email and password.'; return; } setSession({ id: signUp ? state.users.at(-1).id : state.users.find(user => user.email === email).id, email }); location.href = 'index.html'; });
document.querySelector('#demo-login').addEventListener('click', () => { seedDemo(); setSession({ id: 'demo', email: 'demo@projectflow.local' }); location.href = 'index.html'; });