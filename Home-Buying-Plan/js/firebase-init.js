// firebase-init.js
// Single source of truth for Firebase + Firestore imports.
// Fill in your Firebase config below.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// TODO: paste your Firebase config here
const firebaseConfig = {
  apiKey: "AIzaSyAyWD_KLFAVDOFW7FyHPHYGG1gge2go2AY",
  authDomain: "morrow-industries.firebaseapp.com",
  databaseURL: "https://morrow-industries-default-rtdb.firebaseio.com",
  projectId: "morrow-industries",
  storageBucket: "morrow-industries.appspot.com",
  messagingSenderId: "75190213345",
  appId: "1:75190213345:web:a521b54a1c8e00b68d75a0"
};
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Re-export Firestore helpers so every page imports ONLY from firebase-init.js
export {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
};
