// /assets/js/family-theme-editor.js
import { db, doc, getDoc, updateDoc, onSnapshot } from "/assets/js/firebase-init.js";
import { enableLiveStyle } from "/assets/js/family-tracker-livestyle.js";

/* ───────────── Initialize Live Preview (injects CSS on any change) ───────────── */
enableLiveStyle();

/* ───────────── Robust CSS Parsing & Building ───────────── */
/**
 * Safely parse a CSS string into a map of selectors -> { prop: value }
 * - Handles comments, line breaks, minified CSS, extra whitespace
 * - Ignores empty blocks and malformed lines gracefully
 */
function safeParseCSS(cssText) {
  if (!cssText || typeof cssText !== "string") return {};
  // strip comments
  let css = cssText.replace(/\/\*[\s\S]*?\*\//g, "");
  // collapse whitespace for safety around braces/semicolons (but keep values intact)
  css = css.replace(/\s+/g, " ").replace(/\s*{\s*/g, "{").replace(/\s*}\s*/g, "}").replace(/\s*;\s*/g, ";").trim();

  // split into blocks like "selector{props}"
  const blocks = css.match(/[^{}]+{[^{}]*}/g);
  if (!blocks) return {};

  const rules = {};
  for (const block of blocks) {
    const idx = block.indexOf("{");
    if (idx === -1) continue;
    const selector = block.slice(0, idx).trim();
    const body = block.slice(idx + 1, -1).trim(); // remove trailing "}"

    if (!selector || !body) continue;

    const props = {};
    // split properties by semicolon (filter out empties)
    const pairs = body.split(";").map(s => s.trim()).filter(Boolean);
    for (const pair of pairs) {
      const colonIdx = pair.indexOf(":");
      if (colonIdx === -1) continue;
      const key = pair.slice(0, colonIdx).trim();
      const value = pair.slice(colonIdx + 1).trim();
      if (key) props[key] = value;
    }

    if (Object.keys(props).length) {
      rules[selector] = props;
    }
  }

  return rules;
}

/** Build a CSS string back from a rules map { selector: { prop: value } } */
function buildCSS(rules) {
  let css = "";
  for (const selector of Object.keys(rules)) {
    css += `${selector} {\n`;
    const props = rules[selector];
    for (const prop of Object.keys(props)) {
      css += `  ${prop}: ${props[prop]};\n`;
    }
    css += `}\n\n`;
  }
  return css.trim() + "\n";
}

/* ───────────── DOM Elements ───────────── */
const cssEditor = document.getElementById("cssEditor");
const saveBtn = document.getElementById("saveCSSBtn");
const reloadBtn = document.getElementById("reloadCSSBtn");

/* ───────────── Firestore Ref ───────────── */
const ref = doc(db, "familyTrackerSettings", "themeCSS");

/* ───────────── Local State ───────────── */
let cssRules = {};
let liveCSS = "";

/* ───────────── Render the CSS Editor ───────────── */
function renderEditor() {
  cssEditor.innerHTML = "";

  if (!cssRules || !Object.keys(cssRules).length) {
    cssEditor.innerHTML = `<p class="text-gray-400 italic">⚠️ CSS found but no parsable rules. Check console for the raw CSS.</p>`;
    console.warn("[ThemeEditor] Raw CSS that failed to parse:", liveCSS);
    return;
  }

  for (const selector of Object.keys(cssRules)) {
    const container = document.createElement("div");
    container.className = "glass p-3 rounded-md";

    // Header with selector name (click to toggle)
    const header = document.createElement("div");
    header.className = "flex items-center justify-between cursor-pointer mb-2";
    header.innerHTML = `
      <h3 class="text-[#d4af37] font-semibold break-all">${selector}</h3>
      <span class="text-xs text-gray-400">tap to expand</span>
    `;
    container.appendChild(header);

    // Properties grid (collapsed by default)
    const propList = document.createElement("div");
    propList.className = "grid grid-cols-2 gap-2";
    propList.style.display = "none";

    const props = cssRules[selector];
    for (const prop of Object.keys(props)) {
      const value = props[prop];
      const row = document.createElement("label");
      row.className = "flex flex-col text-xs";
      row.innerHTML = `
        <span class="text-gray-400">${prop}</span>
        <input
          data-selector="${selector}"
          data-prop="${prop}"
          class="form-input text-xs bg-black/40 border border-[rgba(255,255,255,0.1)] rounded-md px-2 py-1 text-white focus:border-[#d4af37] transition"
          value="${value.replace(/"/g, "&quot;")}"
        />
      `;
      propList.appendChild(row);
    }

    header.addEventListener("click", () => {
      propList.style.display = propList.style.display === "none" ? "grid" : "none";
    });

    container.appendChild(propList);
    cssEditor.appendChild(container);
  }
}

/* ───────────── Save Edits Back to Firestore ───────────── */
async function saveEdits() {
  // Read inputs back into cssRules
  const inputs = cssEditor.querySelectorAll("input[data-selector][data-prop]");
  inputs.forEach(input => {
    const selector = input.getAttribute("data-selector");
    const prop = input.getAttribute("data-prop");
    const val = input.value;
    if (!cssRules[selector]) cssRules[selector] = {};
    cssRules[selector][prop] = val;
  });

  const newCSS = buildCSS(cssRules);

  try {
    await updateDoc(ref, { css: newCSS });
    console.info("[ThemeEditor] CSS updated, length:", newCSS.length);
    alert("✅ CSS updated successfully! Live preview refreshed.");
  } catch (err) {
    console.error("[ThemeEditor] Error saving CSS:", err);
    alert("❌ Failed to save CSS. Check console for details.");
  }
}

/* ───────────── Manual Reload ───────────── */
async function reloadFromFirestore() {
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      cssEditor.innerHTML = `<p class="text-gray-400 italic">No CSS found in Firestore.</p>`;
      return;
    }
    const newCSS = (snap.data().css || "").toString();
    console.log("🔄 Reloaded CSS, length:", newCSS.length);
    liveCSS = newCSS;
    cssRules = safeParseCSS(liveCSS);
    renderEditor();
  } catch (e) {
    console.error("[ThemeEditor] Reload error:", e);
    alert("❌ Failed to reload CSS from Firestore.");
  }
}

/* ───────────── Real-Time Listener ───────────── */
onSnapshot(ref, snap => {
  if (!snap.exists()) {
    cssEditor.innerHTML = `<p class="text-gray-400 italic">No CSS found in Firestore.</p>`;
    return;
  }
  const newCSS = (snap.data().css || "").toString();
  // If CSS changed remotely, reparse and rerender the editor
  if (newCSS !== liveCSS) {
    console.log("🔥 Live CSS Loaded:", newCSS.length, "characters");
    liveCSS = newCSS;
    cssRules = safeParseCSS(liveCSS);
    renderEditor();
  }
});

/* ───────────── Wire Up Buttons ───────────── */
if (saveBtn)  saveBtn.addEventListener("click", saveEdits);
if (reloadBtn) reloadBtn.addEventListener("click", reloadFromFirestore);

/* ───────────── Initial Load ───────────── */
reloadFromFirestore();