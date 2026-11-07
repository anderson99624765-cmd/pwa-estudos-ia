// functions/index.js
// Firebase Cloud Function that receives study requests and forwards them to Anthropic's Claude API.
// It stores per‑user session history in Firestore to avoid repeated questions and to adapt difficulty.
// Rate‑limit: max 1000 tokens per day per user (configurable).

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();
const db = admin.firestore();

// Load Anthropic API key from env (set via `firebase functions:config:set anthropic.key="..."` or .env file)
const ANTHROPIC_API_KEY = functions.config().anthropic?.key || process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('Anthropic API key not configured');
}

// Helper to get or create a session document for a user
async function getSession(uid) {
  const sessRef = db.collection('users').doc(uid).collection('ai_sessions').doc('current');
  const snap = await sessRef.get();
  if (!snap.exists) {
    await sessRef.set({ history: [], createdAt: admin.firestore.FieldValue.serverTimestamp() });
    return { id: sessRef.id, history: [] };
  }
  return { id: sessRef.id, ...snap.data() };
}

// Append a new entry to the session history (question/answer)
async function appendHistory(uid, entry) {
  const sessRef = db.collection('users').doc(uid).collection('ai_sessions').doc('current');
  await sessRef.update({
    history: admin.firestore.FieldValue.arrayUnion(entry)
  });
}

// Simple token‑usage counter (per calendar day)
async function checkRateLimit(uid) {
  const today = new Date().toISOString().slice(0, 10); // YYYY‑MM‑DD
  const docRef = db.collection('users').doc(uid).collection('usage').doc(today);
  const snap = await docRef.get();
  const used = snap.exists ? snap.data().tokens : 0;
  const MAX_TOKENS = 1000; // can be tuned
  if (used >= MAX_TOKENS) {
    throw new functions.https.HttpsError('resource-exhausted', 'Limite diário de uso da IA excedido');
  }
  return { docRef, used };
}

async function incrementTokens(uid, docRef, tokens) {
  await docRef.set({ tokens: admin.firestore.FieldValue.increment(tokens) }, { merge: true });
}

// Build prompt for Claude based on history and user request
function buildPrompt(history, category = 'Programação', level = 'iniciante', userAnswer = null) {
  const system = `Você é um assistente de estudos. O usuário está estudando ${category} no nível ${level}.`;
  const past = history.map(h => `Pergunta: ${h.question}\nResposta do usuário: ${h.answer}\nFeedback: ${h.feedback}`).join('\n---\n');
  const request = userAnswer ? `A resposta do usuário foi: "${userAnswer}". Avalie e explique.` : 'Faça a primeira pergunta.';
  return `${system}\n${past ? '\nHistórico:\n' + past : ''}\n${request}`;
}

exports.ask = functions.https.onRequest(async (req, res) => {
  // Allow only POST
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { uid, answer } = req.body;
  if (!uid) {
    return res.status(400).json({ error: 'uid missing' });
  }

  try {
    // Verify that the uid corresponds to a valid Firebase Auth token (optional but recommended)
    // Here we trust the client; in production verify ID token using admin.auth().verifyIdToken
    const session = await getSession(uid);
    const { docRef: usageRef } = await checkRateLimit(uid);

    const prompt = buildPrompt(session.history || [] , 'Programação', 'intermediario', answer);

    // Call Anthropic API (Claude). Using v1/completions endpoint.
    const aiResp = await axios.post('https://api.anthropic.com/v1/complete', {
      model: 'claude-3-5-sonnet-20240620',
      prompt: prompt,
      max_tokens_to_sample: 1024,
      temperature: 0.7,
      stop_sequences: ['\n\n']
    }, {
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'content-type': 'application/json'
      }
    });

    const text = aiResp.data.completion.trim();
    // Very naive parsing: assume first line is the question, rest is feedback.
    const parts = text.split('\n');
    const question = parts[0] || 'Qual é a sua resposta?';
    const feedback = parts.slice(1).join('\n') || '';

    // Store in history if we have an answer (i.e., this is a continuation)
    if (answer) {
      await appendHistory(uid, {
        question: session.lastQuestion || '',
        answer: answer,
        feedback: feedback,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Update session with latest question for next round
    await db.collection('users').doc(uid).collection('ai_sessions').doc('current').set({ lastQuestion: question }, { merge: true });

    // Count tokens (approximate: prompt tokens + completion tokens). Here we just add 500 as placeholder.
    await incrementTokens(uid, usageRef, 500);

    return res.json({ question: { text: question }, feedback, nextQuestion: { text: question } });
  } catch (err) {
    console.error('Error in AI function', err);
    const status = err.code === 'resource-exhausted' ? 429 : 500;
    return res.status(status).json({ error: err.message || 'Internal error' });
  }
});
