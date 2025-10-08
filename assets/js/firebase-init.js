// Firebase initialization shared by all pages
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
    import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
    import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
    import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

    export const firebaseConfig = {
  apiKey: "AIzaSyAyWD_KLFAVDOFW7FyHPHYGG1gge2go2AY",
  authDomain: "morrow-industries.firebaseapp.com",
  databaseURL: "https://morrow-industries-default-rtdb.firebaseio.com",
  projectId: "morrow-industries",
  storageBucket: "morrow-industries.appspot.com",
  messagingSenderId: "75190213345",
  appId: "1:75190213345:web:a521b54a1c8e00b68d75a0"
};

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
    const storage = getStorage(app);
    const provider = new GoogleAuthProvider();

    // Export to importers
    export { app, db, auth, storage, provider, signInWithPopup, onAuthStateChanged, signOut };