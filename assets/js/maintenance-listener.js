// /assets/js/maintenance-listener.js
import { db } from "/assets/js/firebase-init.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const maintenanceRef = doc(db, "site", "config");
const maintenancePage = "/maintenance.html"; // path to your maintenance page

onSnapshot(maintenanceRef, (snap) => {
  if (snap.exists() && snap.data().maintenanceMode === true) {
    if (!window.location.pathname.includes("maintenance.html")) {
      window.location.href = maintenancePage;
    }
  }
});