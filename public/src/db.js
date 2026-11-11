import { db } from './firebase.js';
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const categoriesCol = uid => collection(db, 'users', uid, 'categories');

export async function getCategories(uid) {
  const snap = await getDocs(query(categoriesCol(uid), orderBy('createdAt', 'asc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getCategory(uid, catId) {
  const snap = await getDoc(doc(db, 'users', uid, 'categories', catId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function addCategory(uid, { name, level = 'iniciante' }) {
  const ref = await addDoc(categoriesCol(uid), { name, level, createdAt: serverTimestamp() });
  return ref.id;
}

export function updateCategory(uid, catId, data) {
  return updateDoc(doc(db, 'users', uid, 'categories', catId), { ...data, updatedAt: serverTimestamp() });
}

export function deleteCategory(uid, catId) {
  return deleteDoc(doc(db, 'users', uid, 'categories', catId));
}

// O histórico é gravado pela Cloud Function; o cliente só lê.
// sessionId = id da categoria, ou "general" para o estudo sem categoria.
export async function getAiHistory(uid, sessionId = 'general') {
  const snap = await getDoc(doc(db, 'users', uid, 'ai_sessions', sessionId));
  return snap.exists() ? snap.data().history || [] : [];
}
