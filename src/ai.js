// src/ai.js
// Front‑end wrapper that talks to the secure Cloud Function.
// The function expects a JSON body: { uid, sessionId?, answer?, categoryId, level }
// It returns { question: { text, id }, feedback, nextQuestion }

const AI_ENDPOINT = '/api/ask'; // Firebase rewrites to function

/**
 * Starts a new study session or continues an existing one.
 * If `answer` is omitted, the function returns the first question.
 */
export async function startStudySession(uid, answer = null, sessionId = null) {
  const payload = { uid };
  if (sessionId) payload.sessionId = sessionId;
  if (answer) payload.answer = answer;
  // The client may also send chosen category/level; for simplicity we let the backend pick defaults.
  const resp = await fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error('Erro na IA: ' + err);
  }
  return resp.json();
}
