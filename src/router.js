// src/router.js
// Simple hash router – maps #/route to a render function
import { renderLogin, renderHome, renderCategoryEditor, renderStudySession } from './ui.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from './main.js';

function initRouter() {
  // Listen auth changes to decide initial route
  onAuthStateChanged(auth, user => {
    if (user) {
      navigate('#/home');
    } else {
      navigate('#/login');
    }
  });

  window.addEventListener('hashchange', () => {
    handleRoute();
  });
  // initial load
  handleRoute();
}

function handleRoute() {
  const route = location.hash.replace('#', '') || '/login';
  const appDiv = document.getElementById('app');
  appDiv.innerHTML = '';
  switch (route) {
    case '/login':
      renderLogin(appDiv);
      break;
    case '/home':
      renderHome(appDiv);
      break;
    case '/categories':
      renderCategoryEditor(appDiv);
      break;
    case '/study':
      renderStudySession(appDiv);
      break;
    default:
      appDiv.innerHTML = '<p>Página não encontrada.</p>';
  }
}

function navigate(hash) {
  location.hash = hash;
}

export { initRouter, navigate };
