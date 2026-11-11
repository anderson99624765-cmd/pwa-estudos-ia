// Roteador por hash com proteção de rotas. Só renderiza depois que o Firebase Auth
// informa o estado inicial, evitando o "pisca" para a tela de login.
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { auth } from './firebase.js';
import { navigate } from './nav.js';
import {
  renderLogin, renderHome, renderCategoryEditor, renderStudySession, renderHistory
} from './ui.js';

const routes = {
  '/login': renderLogin,
  '/home': renderHome,
  '/categories': renderCategoryEditor,
  '/study': renderStudySession,
  '/history': renderHistory
};

let user = null;
let authReady = false;
let cleanup = null;

function handleRoute() {
  if (!authReady) return;

  const [path, qs = ''] = (location.hash.slice(1) || '/').split('?');
  const render = routes[path];

  if (!user) {
    if (path !== '/login') return navigate('#/login');
  } else if (!render || path === '/login') {
    return navigate('#/home');
  }

  if (typeof cleanup === 'function') cleanup();
  const app = document.getElementById('app');
  app.innerHTML = '';
  cleanup = routes[path](app, new URLSearchParams(qs)) || null;
}

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  onAuthStateChanged(auth, u => {
    user = u;
    authReady = true;
    handleRoute();
  });
}
