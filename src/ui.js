// src/ui.js
// UI rendering functions – pure DOM manipulation (no framework)

import { auth, register, login, logout, resetPassword, watchAuth } from './auth.js';
import { getCategories, addCategory, updateCategory, deleteCategory, addStudySession, addMessageToSession, getSessionMessages } from './db.js';
import { navigate } from './router.js';
import { startStudySession } from './ai.js';
import { initVoice } from './voice.js';

/** Render the initial placeholder while scripts load */
export function renderInitialScreen() {
  const app = document.getElementById('app');
  app.innerHTML = '<header><h1>Estudos IA</h1></header><main id="main"><p>Carregando...</p></main>';
}

/** Login screen */
export function renderLogin(container) {
  container.innerHTML = `
    <header><h1>Entrar</h1></header>
    <main>
      <form id="login-form">
        <input type="email" id="email" placeholder="E‑mail" required />
        <input type="password" id="password" placeholder="Senha" required />
        <button type="submit">Entrar</button>
        <button type="button" id="register-btn">Cadastrar</button>
        <button type="button" id="reset-btn">Esqueci a senha</button>
      </form>
    </main>`;
  const form = container.querySelector('#login-form');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const email = form.email.value;
    const password = form.password.value;
    login(email, password)
      .then(() => navigate('#/home'))
      .catch(err => alert('Erro ao entrar: ' + err.message));
  });
  container.querySelector('#register-btn').addEventListener('click', () => {
    const email = form.email.value;
    const password = form.password.value;
    register(email, password)
      .then(() => alert('Cadastro realizado. Verifique seu e‑mail.'))
      .catch(err => alert('Erro ao cadastrar: ' + err.message));
  });
  container.querySelector('#reset-btn').addEventListener('click', () => {
    const email = form.email.value;
    resetPassword(email)
      .then(() => alert('E‑mail de recuperação enviado.'))
      .catch(err => alert('Erro ao resetar senha: ' + err.message));
  });
}

/** Home screen – list categories */
export function renderHome(container) {
  container.innerHTML = `
    <header class="flex"><h1>Minhas Categorias</h1><button id="logout-btn">Sair</button></header>
    <main id="categories-list"><p>Carregando...</p></main>
    <footer class="flex">
      <button id="add-cat-btn">+ Nova Categoria</button>
      <button id="study-btn">Iniciar Estudo</button>
    </footer>`;
  const user = auth.currentUser;
  if (!user) { navigate('#/login'); return; }

  // Load categories
  getCategories(user.uid).then(cats => {
    const list = container.querySelector('#categories-list');
    list.innerHTML = '';
    cats.forEach(cat => {
      const div = document.createElement('div');
      div.className = 'card';
      div.innerHTML = `<strong>${cat.name}</strong> <em>${cat.level}</em>
        <div class="flex">
          <button data-id="${cat.id}" class="edit-cat">Editar</button>
          <button data-id="${cat.id}" class="del-cat">Excluir</button>
        </div>`;
      list.appendChild(div);
    });
  });

  container.querySelector('#logout-btn').addEventListener('click', () => logout().then(() => navigate('#/login')));
  container.querySelector('#add-cat-btn').addEventListener('click', () => navigate('#/categories'));
  container.querySelector('#study-btn').addEventListener('click', () => navigate('#/study'));

  // Delegated edit/delete handlers
  container.addEventListener('click', e => {
    if (e.target.matches('.edit-cat')) {
      const id = e.target.dataset.id;
      const name = prompt('Novo nome da categoria');
      if (name) updateCategory(user.uid, id, { name });
      renderHome(container);
    }
    if (e.target.matches('.del-cat')) {
      const id = e.target.dataset.id;
      if (confirm('Excluir categoria?')) {
        deleteCategory(user.uid, id).then(() => renderHome(container));
      }
    }
  });
}

/** Category editor – create / edit */
export function renderCategoryEditor(container) {
  container.innerHTML = `
    <header class="flex"><h1>Gerenciar Categorias</h1><button id="back-btn">← Voltar</button></header>
    <main>
      <form id="cat-form">
        <input type="text" id="cat-name" placeholder="Nome da categoria" required />
        <select id="cat-level">
          <option value="iniciante">Iniciante</option>
          <option value="intermediario">Intermediário</option>
          <option value="avancado">Avançado</option>
        </select>
        <button type="submit">Salvar</button>
      </form>
    </main>`;
  container.querySelector('#back-btn').addEventListener('click', () => navigate('#/home'));
  container.querySelector('#cat-form').addEventListener('submit', e => {
    e.preventDefault();
    const name = e.target['cat-name'].value.trim();
    const level = e.target['cat-level'].value;
    const user = auth.currentUser;
    if (!user) return;
    addCategory(user.uid, { name, level }).then(() => {
      alert('Categoria adicionada');
      navigate('#/home');
    }).catch(err => alert('Erro: ' + err.message));
  });
}

/** Study session UI – communicates with AI */
export function renderStudySession(container) {
  container.innerHTML = `
    <header class="flex"><h1>Estudo</h1><button id="back-home">← Home</button></header>
    <main id="study-area">
      <div id="question" class="card"><p>Carregando primeira pergunta...</p></div>
      <textarea id="answer" rows="4" placeholder="Sua resposta..."></textarea>
      <div class="flex">
        <button id="send-btn">Enviar</button>
        <button id="voice-input-btn">🎤 Voz</button>
        <button id="voice-output-btn">🔊 Ouvir</button>
      </div>
      <div id="feedback" class="card hidden"></div>
    </main>`;
  container.querySelector('#back-home').addEventListener('click', () => navigate('#/home'));

  const user = auth.currentUser;
  if (!user) { navigate('#/login'); return; }

  // Inicia sessão com IA (primeira pergunta)
  startStudySession(user.uid).then(renderQuestion);

  const sendBtn = container.querySelector('#send-btn');
  const voiceInputBtn = container.querySelector('#voice-input-btn');
  const voiceOutputBtn = container.querySelector('#voice-output-btn');
  const answerEl = container.querySelector('#answer');
  const feedbackEl = container.querySelector('#feedback');

  // Voice initialization (fallback handled inside module)
  initVoice({
    onResult: text => { answerEl.value = text; },
    onSpeak: () => {}
  });

  sendBtn.addEventListener('click', () => handleUserAnswer(user.uid));
  voiceInputBtn.addEventListener('click', () => window.speechRecognition && window.speechRecognition.start());
  voiceOutputBtn.addEventListener('click', () => {
    const txt = container.querySelector('#question p').innerText;
    if (window.speechSynthesis) {
      const utter = new SpeechSynthesisUtterance(txt);
      utter.lang = 'pt-BR';
      speechSynthesis.speak(utter);
    } else {
      alert('Sintetização de voz não suportada neste navegador.');
    }
  });
}

/** Helper to render a question received from the backend */
function renderQuestion(questionObj) {
  const qDiv = document.getElementById('question');
  qDiv.innerHTML = `<p>${questionObj.text}</p>`;
  document.getElementById('answer').value = '';
  document.getElementById('feedback').classList.add('hidden');
}

/** Send answer to AI, receive feedback & next question */
async function handleUserAnswer(uid) {
  const answer = document.getElementById('answer').value.trim();
  if (!answer) return alert('Digite uma resposta.');

  // Show loading state
  const sendBtn = document.getElementById('send-btn');
  sendBtn.disabled = true;

  const response = await startStudySession(uid, answer);
  // response must contain {feedback, nextQuestion}
  const fbDiv = document.getElementById('feedback');
  fbDiv.innerHTML = `<p>${response.feedback}</p>`;
  fbDiv.classList.remove('hidden');

  renderQuestion(response.nextQuestion);
  sendBtn.disabled = false;
}

