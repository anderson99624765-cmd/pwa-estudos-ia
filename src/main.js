// src/main.js
import { firebaseConfig } from './firebase-config.js';
// Initialize Firebase (compat version for simplicity)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

import { initRouter } from './router.js';
import { renderInitialScreen } from './ui.js';

window.addEventListener('DOMContentLoaded', () => {
  // Render skeleton UI
  renderInitialScreen();
  // Initialize router (hash based)
  initRouter();
});

// Expose helpers for other modules
export { auth, db };
