import { auth } from './firebase.js';

const AI_ENDPOINT = '/api/ask'; // reescrito pelo Firebase Hosting para a Cloud Function "ask"

/**
 * Pede uma pergunta (sem `answer`) ou envia a resposta do aluno (com `answer`).
 * Retorna { feedback, nextQuestion: { text } }.
 * A identidade vai no ID token — o servidor nunca confia em um uid enviado pelo cliente.
 */
export async function askAI({ categoryId = null, answer = null } = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Você precisa estar logado.');

  const token = await user.getIdToken();
  let resp;
  try {
    resp = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ categoryId, answer })
    });
  } catch (_) {
    throw new Error('Sem conexão com o servidor.');
  }

  let data = null;
  try { data = await resp.json(); } catch (_) { /* corpo não-JSON */ }

  if (!resp.ok) {
    const err = new Error(data?.error || `Erro ${resp.status}`);
    err.status = resp.status;
    throw err;
  }
  return data;
}
