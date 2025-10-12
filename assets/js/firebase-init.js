import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc, setDoc, updateDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAyWD_KLFAVDOFW7FyHPHYGG1gge2go2AY",
  authDomain: "morrow-industries.firebaseapp.com",
  projectId: "morrow-industries",
  storageBucket: "morrow-industries.appspot.com",
  messagingSenderId: "75190213345",
  appId: "1:75190213345:web:a521b54a1c8e00b68d75a0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

export {
  app,
  db,
  auth,
  provider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
};
