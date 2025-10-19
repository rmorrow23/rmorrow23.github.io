import {
  auth, provider, signInWithPopup, onAuthStateChanged, signOut
} from "/assets/js/firebase-init.js";
import { db } from "/assets/js/firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const authBtn = document.getElementById("authBtn");
const authBtnMobile = document.getElementById("authBtnMobile");
const adminLink = document.getElementById("adminLink");

onAuthStateChanged(auth, async (user) => {
  let isAdmin = false;

  if (user) {
    //authBtn.textContent = "Sign out";
    authBtnMobile.textContent = "Sign out";
    try {
      const uDoc = await getDoc(doc(db, "users", user.uid));
      isAdmin = uDoc.exists() && uDoc.data().role === "admin";
      if (adminLink) adminLink.style.display = isAdmin ? "inline-block" : "none";
    } catch (e) {
      console.warn("Error fetching user role:", e);
    }
  } else {
    //authBtn.textContent = "Sign in";
    authBtnMobile.textContent = "Sign in";
    if (adminLink) adminLink.style.display = "none";
  }

  // 🛰️ Emit a global event so pages can hook into auth state
  window.dispatchEvent(
    new CustomEvent("mi-auth-state", { detail: { user, isAdmin } })
  );
});

// Handle Sign-In/Out clicks
[authBtn, authBtnMobile].forEach(btn => {
  btn?.addEventListener("click", async () => {
    const user = auth.currentUser;
    try {
      if (user) await signOut(auth);
      else await signInWithPopup(auth, provider);
    } catch (e) {
      alert("Auth error: " + (e?.message || e));
    }
  });
});
