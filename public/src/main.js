import './firebase.js';
import { initRouter } from './router.js';
import { renderInitialScreen } from './ui.js';

renderInitialScreen();
initRouter();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(err =>
      console.error('Falha ao registrar o Service Worker:', err)
    );
  });
}
