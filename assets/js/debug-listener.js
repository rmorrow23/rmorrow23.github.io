// =============================
// Morrow Industries Debug Listener
// =============================

import { db } from "/assets/js/firebase-init.js";
import { doc, onSnapshot } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const debugRef = doc(db, "adminSettings", "debugMode");

// === Start listening to Firestore ===
onSnapshot(debugRef, snap => {
  if (snap.exists() && snap.data().enabled) {
    enableDebugToasts();
    console.log("🐞 Debug mode active");
  } else {
    console.log("🕶️ Debug mode off");
  }
});

// === Toast-based Debugging ===
function enableDebugToasts() {
  // Avoid re-initializing multiple times
  if (window.__debugToastsEnabled) return;
  window.__debugToastsEnabled = true;

  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;

  function toText(args) {
    return args.map(a => {
      if (a instanceof Error) return a.message;
      if (typeof a === "object") {
        try { return JSON.stringify(a); } catch { return "[object]"; }
      }
      return String(a);
    }).join(" | ");
  }

  console.log = (...a) => { origLog(...a); showToast("🟢 " + toText(a)); };
  console.warn = (...a) => { origWarn(...a); showToast("🟡 " + toText(a)); };
  console.error = (...a) => { origError(...a); showToast("🔴 " + toText(a)); };

  window.addEventListener("error", e => showToast("❌ " + e.message));
  window.addEventListener("unhandledrejection", e =>
    showToast("⚠️ " + (e.reason?.message || e.reason))
  );
}

// === Fallback Toast Helper ===
function showToast(msg) {
  const t = document.createElement("div");
  t.className =
    "toast fixed right-5 top-5 bg-[rgba(18,20,27,.9)] text-[#e9eef8] border border-[var(--gold)] rounded-xl px-3 py-2 text-sm backdrop-blur-md shadow-lg z-[9999]";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}