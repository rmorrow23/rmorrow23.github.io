// /assets/js/maintenance-listener.js
import { db } from "/assets/js/firebase-init.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const messageEl = document.getElementById("status");
const redirectEl = document.getElementById("redirect");
const maintenanceRef = doc(db, "site", "config");

onSnapshot(maintenanceRef, (snap) => {
  if (snap.exists() && snap.data().maintenanceMode === false) {
    // ✅ Site is back online
      let countdown = 5;
      messageEl.textContent = "✅ Morrow Industries is back online!";
      redirectEl.textContent = `Redirecting to homepage in ${countdown} seconds...`;

      const timer = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          redirectEl.textContent = `Redirecting to homepage in ${countdown} seconds...`;
        } else {
          clearInterval(timer);
          document.body.style.transition = "opacity 0.4s ease";
          document.body.style.opacity = "0";
          setTimeout(() => (window.location.href = "/"), 400);
        }
      }, 1000);
  } else if (snap.exists() && snap.data().maintenanceMode === true)   {
    // 🔧 Still under maintenance
      messageEl.textContent = snap.data().message || 
      "We’re enhancing our systems to serve you better.";
      redirectEl.textContent = "Please check back soon — thank you for your patience.";
  }
});