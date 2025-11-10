import { db, doc, onSnapshot } from "/assets/js/firebase-init.js";

/**
 * Injects live Firestore CSS updates into any page that imports this module.
 */
export function enableLiveStyle() {
  const ref = doc(db, "familyTrackerSettings", "themeCSS");

  onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    const css = snap.data().css || "";
    injectStyle(css);
  });
}

/**
 * Creates or updates the injected <style> element.
 */
function injectStyle(cssText) {
  let styleEl = document.getElementById("liveInjectedCSS");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "liveInjectedCSS";
    document.head.appendChild(styleEl);
  }
  styleEl.innerHTML = cssText;
}