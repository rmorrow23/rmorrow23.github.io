// =======================
// Morrow Industries Debug Toggle
// =======================

import { db } from "/assets/js/firebase-init.js";
import { doc, setDoc, onSnapshot } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const debugRef = doc(db, "adminSettings", "debugMode");

export function initDebugToggle() {
  const switchEl = document.getElementById("debugSwitch");
  if (!switchEl) return console.warn("⚠️ Debug switch not found on this page.");

  // === Listen for Firestore changes ===
  onSnapshot(debugRef, snap => {
    if (snap.exists()) {
      const enabled = !!snap.data().enabled;
      switchEl.checked = enabled;
      if (enabled) enableDebugToasts();
    }
  });

  // === Update Firestore when toggled ===
  switchEl.addEventListener("change", async () => {
    const enabled = switchEl.checked;
    await setDoc(debugRef, { enabled }, { merge: true });
    showToast(enabled ? "🐞 Debug Mode Enabled" : "🕶️ Debug Mode Disabled");
    if (enabled) enableDebugToasts();
    else location.reload();
  });
}

// === Toast-based Debugging Handler ===
function enableDebugToasts() {
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