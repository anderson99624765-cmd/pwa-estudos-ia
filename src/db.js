// src/db.js
// Wrapper around Firestore for categories, subtopics and study sessions
import { db } from './main.js';
import { collection, doc, setDoc, getDoc, getDocs, query, where, deleteDoc, addDoc, updateDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const USERS_COL = 'users';

export async function getUserDoc(uid) {
  return doc(db, USERS_COL, uid);
}

// ---------- Categories ----------
export async function getCategories(uid) {
  const userDoc = await getUserDoc(uid);
  const catCol = collection(userDoc, 'categories');
  const snapshot = await getDocs(catCol);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addCategory(uid, { name, level = 'iniciante' }) {
  const userDoc = await getUserDoc(uid);
  const catCol = collection(userDoc, 'categories');
  const ref = await addDoc(catCol, { name, level, createdAt: Timestamp.now() });
  return ref.id;
}

export async function updateCategory(uid, catId, data) {
  const userDoc = await getUserDoc(uid);
  const catRef = doc(userDoc, 'categories', catId);
  await updateDoc(catRef, { ...data, updatedAt: Timestamp.now() });
}

export async function deleteCategory(uid, catId) {
  const userDoc = await getUserDoc(uid);
  const catRef = doc(userDoc, 'categories', catId);
  await deleteDoc(catRef);
}

// ---------- Study Sessions ----------
export async function addStudySession(uid, session) {
  const userDoc = await getUserDoc(uid);
  const sessCol = collection(userDoc, 'sessions');
  const ref = await addDoc(sessCol, { ...session, createdAt: Timestamp.now() });
  return ref.id;
}

export async function getStudySessions(uid) {
  const userDoc = await getUserDoc(uid);
  const sessCol = collection(userDoc, 'sessions');
  const snapshot = await getDocs(sessCol);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addMessageToSession(uid, sessionId, message) {
  const userDoc = await getUserDoc(uid);
  const msgsCol = collection(userDoc, 'sessions', sessionId, 'messages');
  await addDoc(msgsCol, { ...message, timestamp: Timestamp.now() });
}

export async function getSessionMessages(uid, sessionId) {
  const userDoc = await getUserDoc(uid);
  const msgsCol = collection(userDoc, 'sessions', sessionId, 'messages');
  const q = query(msgsCol, where('timestamp', '>=', Timestamp.now())); // placeholder for ordering later
  const snapshot = await getDocs(msgsCol);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}
