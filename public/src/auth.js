import { auth } from './firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

export { auth };

export async function register(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  try {
    await sendEmailVerification(cred.user);
  } catch (err) {
    console.warn('Não foi possível enviar o e-mail de verificação', err);
  }
  return cred;
}

export const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);
export const resetPassword = email => sendPasswordResetEmail(auth, email);

const AUTH_ERRORS = {
  'auth/invalid-email': 'E-mail inválido.',
  'auth/missing-password': 'Informe a senha.',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente de novo.',
  'auth/network-request-failed': 'Sem conexão com a internet.'
};

export function authErrorMessage(err) {
  return AUTH_ERRORS[err?.code] || 'Algo deu errado. Tente novamente.';
}
