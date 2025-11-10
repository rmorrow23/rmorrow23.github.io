import { db, doc, getDoc, updateDoc, onSnapshot } from "/assets/js/firebase-init.js";
import { enableLiveStyle } from "/assets/js/family-tracker-livestyle.js";

/* ───────────── Initialize Live Preview ───────────── */
enableLiveStyle();

/* ---------- Utility: Parse CSS ---------- */
function parseCSS(cssText) {
  const rules = {};
  const regex = /([^{]+)\{([^}]+)\}/g;
  let match;
  while ((match = regex.exec(cssText))) {
    const selector = match[1].trim();
    const properties = match[2]
      .trim()
      .split(";")
      .filter(Boolean)
      .map(p => p.trim().split(":").map(x => x.trim()));
    rules[selector] = Object.fromEntries(properties);
  }
  return rules;
}

/* ---------- Utility: Rebuild CSS ---------- */
function buildCSS(rules) {
  let css = "";
  for (const selector in rules) {
    css += `${selector} {\n`;
    for (const prop in rules[selector]) {
      css += `  ${prop}: ${rules[selector][prop]};\n`;
    }
    css += "}\n\n";
  }
  return css;
}

/* ---------- Element References ---------- */
const cssEditor = document.getElementById("cssEditor");
const saveBtn = document.getElementById("saveCSSBtn");
const reloadBtn = document.getElementById("reloadCSSBtn");

let cssRules = {};
let liveCSS = "";

/* ───────────── Real-Time Firestore Sync ───────────── */
const ref = doc(db, "familyTrackerSettings", "themeCSS");

onSnapshot(ref, (snap) => {
  if (!snap.exists()) {
    cssEditor.innerHTML = `<p class="text-gray-400 italic">No CSS found in Firestore.</p>`;
    return;
  }

  const newCSS = snap.data().css || "";
  if (newCSS !== liveCSS) {
    liveCSS = newCSS;
    cssRules = parseCSS(liveCSS);
    renderEditor();
  }
});

/* ───────────── Load CSS Initially ───────────── */
async function loadCSS() {
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    cssEditor.innerHTML = `<p class="text-gray-400 italic">No CSS found in Firestore.</p>`;
    return;
  }
  liveCSS = snap.data().css || "";
  cssRules = parseCSS(liveCSS);
  renderEditor();
}

/* ───────────── Render the CSS Editor ───────────── */
function renderEditor() {
  cssEditor.innerHTML = "";

  for (const selector in cssRules) {
    const container = document.createElement("div");
    container.className = "glass p-3 rounded-md";

    const header = document.createElement("h3");
    header.className = "text-[#d4af37] font-semibold cursor-pointer mb-2";
    header.textContent = selector;
    container.appendChild(header);

    const propList = document.createElement("div");
    propList.className = "grid grid-cols-2 gap-2";
    propList.style.display = "none";

    for (const prop in cssRules[selector]) {
      const label = document.createElement("label");
      label.className = "flex flex-col text-xs";

      label.innerHTML = `
        <span class="text-gray-400">${prop}</span>
        <input data-selector="${selector}" data-prop="${prop}" 
          class="form-input text-xs bg-black/40 border border-[rgba(255,255,255,0.1)] rounded-md px-2 py-1 text-white focus:border-[#d4af37] transition" 
          value="${cssRules[selector][prop]}">
      `;

      propList.appendChild(label);
    }

    header.onclick = () => {
      propList.style.display = propList.style.display === "none" ? "grid" : "none";
    };

    container.appendChild(propList);
    cssEditor.appendChild(container);
  }
}

/* ───────────── Save Back to Firestore ───────────── */
saveBtn.onclick = async () => {
  // Apply edits to local cssRules
  document.querySelectorAll("input[data-selector]").forEach(input => {
    const selector = input.dataset.selector;
    const prop = input.dataset.prop;
    cssRules[selector][prop] = input.value;
  });

  const newCSS = buildCSS(cssRules);

  try {
    await updateDoc(ref, { css: newCSS });
    alert("✅ CSS updated successfully! All connected pages refreshed live.");
  } catch (err) {
    console.error("Error saving CSS:", err);
    alert("❌ Failed to save CSS. Check console for details.");
  }
};

/* ───────────── Manual Reload ───────────── */
reloadBtn.onclick = loadCSS;

/* ───────────── On Load ───────────── */
loadCSS();