// Renderização das telas (DOM puro). Todo texto vindo do usuário ou da IA é escapado
// ou inserido com textContent para evitar XSS. Cada render retorna (opcional) uma função de limpeza.
import { auth, register, login, logout, resetPassword, authErrorMessage } from './auth.js';
import {
  getCategories, getCategory, addCategory, updateCategory, deleteCategory, getAiHistory
} from './db.js';
import { navigate } from './nav.js';
import { askAI } from './ai.js';
import { createVoice } from './voice.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const LEVEL_LABEL = { iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' };

function showMsg(el, text, ok = false) {
  el.textContent = text || '';
  el.classList.toggle('ok', ok);
}

export function renderInitialScreen() {
  document.getElementById('app').innerHTML =
    '<header><h1>Estudos IA</h1></header><main><p>Carregando...</p></main>';
}

/* ------------------------------ Login ------------------------------ */
export function renderLogin(container) {
  container.innerHTML = `
    <header><h1>Entrar</h1></header>
    <main>
      <form id="login-form" novalidate>
        <input type="email" id="email" placeholder="E-mail" autocomplete="email" required />
        <input type="password" id="password" placeholder="Senha" autocomplete="current-password" required />
        <p id="msg" class="msg" role="alert"></p>
        <div class="flex">
          <button type="submit">Entrar</button>
          <button type="button" id="register-btn" class="secondary">Cadastrar</button>
          <button type="button" id="reset-btn" class="secondary">Esqueci a senha</button>
        </div>
      </form>
    </main>`;

  const form = container.querySelector('#login-form');
  const msg = container.querySelector('#msg');
  const buttons = form.querySelectorAll('button');
  const values = () => ({
    email: form.querySelector('#email').value.trim(),
    password: form.querySelector('#password').value
  });

  async function run(action, okText) {
    buttons.forEach(b => (b.disabled = true));
    showMsg(msg, '');
    try {
      await action();
      if (okText) showMsg(msg, okText, true);
    } catch (err) {
      showMsg(msg, authErrorMessage(err));
    } finally {
      buttons.forEach(b => (b.disabled = false));
    }
  }

  // Após login/cadastro o router redireciona sozinho (onAuthStateChanged).
  form.addEventListener('submit', e => {
    e.preventDefault();
    const { email, password } = values();
    run(() => login(email, password));
  });
  container.querySelector('#register-btn').addEventListener('click', () => {
    const { email, password } = values();
    run(() => register(email, password));
  });
  container.querySelector('#reset-btn').addEventListener('click', () => {
    const { email } = values();
    if (!email) return showMsg(msg, 'Informe seu e-mail para recuperar a senha.');
    run(() => resetPassword(email), 'E-mail de recuperação enviado.');
  });
}

/* ------------------------------ Home ------------------------------ */
export function renderHome(container) {
  const user = auth.currentUser;
  container.innerHTML = `
    <header class="flex"><h1>Minhas Categorias</h1><button id="logout-btn">Sair</button></header>
    <main>
      <p id="msg" class="msg" role="alert"></p>
      <div id="categories-list"><p>Carregando...</p></div>
    </main>
    <footer class="flex">
      <button id="add-cat-btn">+ Nova Categoria</button>
      <button id="study-btn" class="secondary">Estudo livre</button>
      <button id="history-btn" class="secondary">Histórico</button>
    </footer>`;

  const list = container.querySelector('#categories-list');
  const msg = container.querySelector('#msg');

  async function load() {
    try {
      const cats = await getCategories(user.uid);
      list.innerHTML = '';
      if (!cats.length) {
        list.innerHTML = '<p>Nenhuma categoria ainda. Crie a primeira em "+ Nova Categoria".</p>';
        return;
      }
      cats.forEach(cat => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
          <strong>${esc(cat.name)}</strong> <span class="meta">${esc(LEVEL_LABEL[cat.level] || cat.level)}</span>
          <div class="flex">
            <button data-id="${esc(cat.id)}" class="study-cat">Estudar</button>
            <button data-id="${esc(cat.id)}" data-name="${esc(cat.name)}" class="edit-cat secondary">Editar</button>
            <button data-id="${esc(cat.id)}" class="del-cat danger">Excluir</button>
          </div>`;
        list.appendChild(div);
      });
    } catch (err) {
      list.innerHTML = '';
      showMsg(msg, 'Não foi possível carregar as categorias.');
      console.error(err);
    }
  }

  // Um único listener, preso ao elemento desta tela (descartado junto com ela).
  list.addEventListener('click', async e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.id;
    try {
      if (btn.classList.contains('study-cat')) {
        navigate(`#/study?cat=${encodeURIComponent(id)}`);
      } else if (btn.classList.contains('edit-cat')) {
        const name = prompt('Novo nome da categoria', btn.dataset.name)?.trim();
        if (!name) return;
        if (name.length > 60) return showMsg(msg, 'O nome pode ter no máximo 60 caracteres.');
        await updateCategory(user.uid, id, { name });
        showMsg(msg, '');
        await load();
      } else if (btn.classList.contains('del-cat')) {
        if (!confirm('Excluir categoria?')) return;
        await deleteCategory(user.uid, id);
        showMsg(msg, '');
        await load();
      }
    } catch (err) {
      console.error(err);
      showMsg(msg, 'Não foi possível concluir a ação. Tente novamente.');
    }
  });

  container.querySelector('#logout-btn').addEventListener('click', () => logout());
  container.querySelector('#add-cat-btn').addEventListener('click', () => navigate('#/categories'));
  container.querySelector('#study-btn').addEventListener('click', () => navigate('#/study'));
  container.querySelector('#history-btn').addEventListener('click', () => navigate('#/history'));

  load();
}

/* ------------------------- Editor de categorias ------------------------- */
export function renderCategoryEditor(container) {
  container.innerHTML = `
    <header class="flex"><h1>Nova Categoria</h1><button id="back-btn">← Voltar</button></header>
    <main>
      <form id="cat-form">
        <input type="text" id="cat-name" placeholder="Nome da categoria (ex.: JavaScript)" maxlength="60" required />
        <select id="cat-level" aria-label="Nível">
          <option value="iniciante">Iniciante</option>
          <option value="intermediario">Intermediário</option>
          <option value="avancado">Avançado</option>
        </select>
        <p id="msg" class="msg" role="alert"></p>
        <button type="submit">Salvar</button>
      </form>
    </main>`;

  const msg = container.querySelector('#msg');
  container.querySelector('#back-btn').addEventListener('click', () => navigate('#/home'));
  container.querySelector('#cat-form').addEventListener('submit', async e => {
    e.preventDefault();
    const name = container.querySelector('#cat-name').value.trim();
    const level = container.querySelector('#cat-level').value;
    const user = auth.currentUser;
    if (!user || !name) return;
    const submit = e.target.querySelector('button[type=submit]');
    submit.disabled = true;
    try {
      await addCategory(user.uid, { name, level });
      navigate('#/home');
    } catch (err) {
      console.error(err);
      showMsg(msg, 'Não foi possível salvar a categoria.');
      submit.disabled = false;
    }
  });
}

/* ------------------------------ Estudo ------------------------------ */
export function renderStudySession(container, params) {
  const user = auth.currentUser;
  const categoryId = params.get('cat') || null;

  container.innerHTML = `
    <header class="flex"><h1 id="title">Estudo</h1><button id="back-home">← Home</button></header>
    <main>
      <div id="question" class="card"><p class="pre">Carregando pergunta...</p></div>
      <textarea id="answer" rows="4" maxlength="2000" placeholder="Sua resposta..." aria-label="Sua resposta"></textarea>
      <p id="msg" class="msg" role="alert"></p>
      <div class="flex">
        <button id="send-btn" disabled>Enviar</button>
        <button id="skip-btn" class="secondary" disabled>Nova pergunta</button>
        <button id="voice-input-btn" class="secondary">🎤 Voz</button>
        <button id="voice-output-btn" class="secondary">🔊 Ouvir</button>
      </div>
      <div id="feedback" class="card feedback hidden"><strong>Feedback</strong><p class="pre"></p></div>
    </main>`;

  const $ = sel => container.querySelector(sel);
  const questionP = $('#question p');
  const answerEl = $('#answer');
  const msg = $('#msg');
  const sendBtn = $('#send-btn');
  const skipBtn = $('#skip-btn');
  const feedbackCard = $('#feedback');
  let hasQuestion = false;

  const voice = createVoice({
    onResult: text => { answerEl.value = text; },
    onError: text => showMsg(msg, text),
    onListeningChange: on => { $('#voice-input-btn').textContent = on ? '⏹ Parar' : '🎤 Voz'; }
  });

  $('#back-home').addEventListener('click', () => navigate('#/home'));
  $('#voice-input-btn').addEventListener('click', () => voice.toggleListening());
  $('#voice-output-btn').addEventListener('click', () => voice.speak(questionP.textContent));

  function setBusy(busy) {
    sendBtn.disabled = busy || !hasQuestion;
    skipBtn.disabled = busy;
  }

  async function request(answer) {
    setBusy(true);
    showMsg(msg, '');
    try {
      const data = await askAI({ categoryId, answer });
      questionP.textContent = data.nextQuestion.text;
      hasQuestion = true;
      answerEl.value = '';
      if (answer && data.feedback) {
        feedbackCard.querySelector('p').textContent = data.feedback;
        feedbackCard.classList.remove('hidden');
      } else {
        feedbackCard.classList.add('hidden');
      }
    } catch (err) {
      showMsg(msg, err.message);
    } finally {
      setBusy(false);
    }
  }

  sendBtn.addEventListener('click', () => {
    const answer = answerEl.value.trim();
    if (!answer) return showMsg(msg, 'Digite uma resposta.');
    request(answer);
  });
  skipBtn.addEventListener('click', () => request(null));

  // Carrega o nome da categoria no título e pede a primeira pergunta.
  (async () => {
    if (categoryId) {
      try {
        const cat = await getCategory(user.uid, categoryId);
        if (!cat) return showMsg(msg, 'Categoria não encontrada.');
        $('#title').textContent = `Estudo: ${cat.name}`;
      } catch (err) {
        console.error(err);
      }
    }
    await request(null);
  })();

  return () => voice.stop();
}

/* ----------------------------- Histórico ----------------------------- */
export function renderHistory(container) {
  const user = auth.currentUser;
  container.innerHTML = `
    <header class="flex"><h1>Histórico</h1><button id="back-btn">← Voltar</button></header>
    <main>
      <select id="session-select" aria-label="Categoria"><option value="general">Estudo livre</option></select>
      <p id="msg" class="msg" role="alert"></p>
      <div id="history-list"></div>
    </main>`;

  const select = container.querySelector('#session-select');
  const list = container.querySelector('#history-list');
  const msg = container.querySelector('#msg');
  container.querySelector('#back-btn').addEventListener('click', () => navigate('#/home'));

  async function loadHistory() {
    list.innerHTML = '<p>Carregando...</p>';
    showMsg(msg, '');
    try {
      const items = (await getAiHistory(user.uid, select.value)).slice().reverse();
      if (!items.length) {
        list.innerHTML = '<p>Nada por aqui ainda. Responda algumas perguntas primeiro.</p>';
        return;
      }
      list.innerHTML = items.map(h => `
        <div class="card">
          <p class="meta">${esc(new Date(h.at).toLocaleString('pt-BR'))}</p>
          <p class="pre"><strong>Pergunta:</strong> ${esc(h.question)}</p>
          <p class="pre"><strong>Sua resposta:</strong> ${esc(h.answer)}</p>
          <p class="pre"><strong>Feedback:</strong> ${esc(h.feedback)}</p>
        </div>`).join('');
    } catch (err) {
      console.error(err);
      list.innerHTML = '';
      showMsg(msg, 'Não foi possível carregar o histórico.');
    }
  }

  select.addEventListener('change', loadHistory);

  (async () => {
    try {
      const cats = await getCategories(user.uid);
      cats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
      });
    } catch (err) {
      console.error(err);
    }
    loadHistory();
  })();
}
