// ==============================================
// Morrow Industries — Family Tracker Theme Editor
// Advanced grouped + searchable + autosave version
// ==============================================
import { db, doc, getDoc, setDoc, updateDoc, onSnapshot } from "/assets/js/firebase-init.js";

const editorContainer = document.getElementById("cssEditor");
const reloadBtn = document.getElementById("reloadCSSBtn");
const saveBtn = document.getElementById("saveCSSBtn");

const themeRef = doc(db, "familyTrackerSettings", "themeCSS");

// --- Default CSS (if none exists) ---
const defaultCSS = `
:root {
  --gold:#d4af37;
  --bg:#0a0b0f;
  --text:#e9eef8;
  --border:rgba(255,255,255,0.08);
}
/* Add your CSS below */
`;

// --- Parse CSS into object ---
function parseCSS(cssText) {
  const rules = {};
  const regex = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = regex.exec(cssText))) {
    const selector = match[1].trim();
    const body = match[2].trim();
    const props = {};
    body.split(";").forEach(line => {
      const [key, value] = line.split(":").map(s => s?.trim());
      if (key && value) props[key] = value;
    });
    rules[selector] = props;
  }
  return rules;
}

// --- Rebuild CSS from object ---
function stringifyCSS(rules) {
  return Object.entries(rules)
    .map(([sel, props]) => {
      const body = Object.entries(props)
        .map(([k, v]) => `  ${k}: ${v};`)
        .join("\n");
      return `${sel} {\n${body}\n}`;
    })
    .join("\n\n");
}

// --- Categorize selectors ---
function categorizeSelector(selector) {
  if (selector.startsWith(":root")) return "Global";
  if (selector.includes("btn")) return "Buttons";
  if (selector.includes("form") || selector.includes("input")) return "Forms";
  if (selector.includes("loan") || selector.includes("details")) return "Loans";
  if (selector.includes("modal")) return "Modals";
  if (selector.includes("tab") || selector.includes("panel")) return "Tabs";
  return "Other";
}

// --- Autosave debounce ---
// --- Smarter Autosave Debounce (3s idle delay) ---
let saveTimeout;
let lastChange = 0;

function scheduleAutosave(rules) {
  lastChange = Date.now();
  clearTimeout(saveTimeout);

  // Wait at least 3 seconds since the last keystroke or change
  saveTimeout = setTimeout(() => {
    const now = Date.now();
    if (now - lastChange >= 3000) {
      console.log("💾 Autosaving after idle delay...");
      saveCSS(rules);
    }
  }, 3000);
}

// --- Render grouped editor ---
function renderEditor(rules, search = "") {
  editorContainer.innerHTML = "";

  // Group selectors by category
  const grouped = {};
  for (const [sel, props] of Object.entries(rules)) {
    if (search && !sel.toLowerCase().includes(search.toLowerCase())) continue;
    const category = categorizeSelector(sel);
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push([sel, props]);
  }

  // Build search bar
  const searchBar = document.createElement("input");
  searchBar.placeholder = "Search selector...";
  searchBar.className =
    "form-input w-full mb-4 text-sm border border-[rgba(255,255,255,0.1)]";
  searchBar.value = search;
  searchBar.oninput = e => renderEditor(rules, e.target.value);
  editorContainer.appendChild(searchBar);

  // Build categories
  for (const [category, selectors] of Object.entries(grouped)) {
    const catSection = document.createElement("div");
    catSection.className = "mb-6";
    const title = document.createElement("h3");
    title.className = "text-[#d4af37] text-lg font-semibold mb-2";
    title.textContent = category;
    catSection.appendChild(title);

    selectors.forEach(([selector, props]) => {
      const block = document.createElement("div");
      block.className = "glass p-3 rounded-md space-y-2 mb-2";

      const header = document.createElement("div");
      header.className = "flex justify-between items-center";
      header.innerHTML = `
        <input class="form-input flex-1 selectorInput" value="${selector}" />
        <button class="bg-red-600 text-white px-2 py-1 rounded ml-2 deleteSelector">✕</button>
      `;
      block.appendChild(header);

      const propsList = document.createElement("div");
      propsList.className = "space-y-1";
      for (const [key, val] of Object.entries(props)) {
        const row = document.createElement("div");
        row.className = "flex gap-2";
        row.innerHTML = `
          <input class="form-input flex-1 propKey" placeholder="property" value="${key}" />
          <input class="form-input flex-1 propVal" placeholder="value" value="${val}" />
          <button class="bg-red-500 text-white rounded px-2 removeProp">–</button>
        `;
        propsList.appendChild(row);
      }

      const addPropBtn = document.createElement("button");
      addPropBtn.textContent = "+ Add Property";
      addPropBtn.className = "btn-secondary w-full mt-2";
      addPropBtn.onclick = () => {
        const row = document.createElement("div");
        row.className = "flex gap-2";
        row.innerHTML = `
          <input class="form-input flex-1 propKey" placeholder="property" />
          <input class="form-input flex-1 propVal" placeholder="value" />
          <button class="bg-red-500 text-white rounded px-2 removeProp">–</button>
        `;
        propsList.appendChild(row);
      };

      block.appendChild(propsList);
      block.appendChild(addPropBtn);

      const removeSelector = header.querySelector(".deleteSelector");
      removeSelector.onclick = () => {
        delete rules[selector];
        renderEditor(rules, search);
        scheduleAutosave(rules);
      };

      // Watch for inline edits (autosave)
      block.addEventListener("input", () => scheduleAutosave(collectCSSFromUI()));

      catSection.appendChild(block);
    });

    // Add new selector button under each category
    const addSelectorBtn = document.createElement("button");
    addSelectorBtn.textContent = `+ Add Selector to ${category}`;
    addSelectorBtn.className = "btn-primary w-full mt-3";
    addSelectorBtn.onclick = () => {
      const newSel = `.new-${category.toLowerCase()}-${Date.now()}`;
      rules[newSel] = { "color": "white" };
      renderEditor(rules, search);
      scheduleAutosave(rules);
    };

    catSection.appendChild(addSelectorBtn);
    editorContainer.appendChild(catSection);
  }
}

// --- Collect data from editor ---
function collectCSSFromUI() {
  const blocks = editorContainer.querySelectorAll(".glass");
  const rules = {};
  blocks.forEach(block => {
    const selector = block.querySelector(".selectorInput")?.value?.trim();
    if (!selector) return;
    const props = {};
    const rows = block.querySelectorAll(".propKey");
    rows.forEach((keyEl, i) => {
      const key = keyEl.value.trim();
      const val = block.querySelectorAll(".propVal")[i]?.value.trim();
      if (key && val) props[key] = val;
    });
    rules[selector] = props;
  });
  return rules;
}

// --- Load CSS ---
async function loadCSS() {
  const snap = await getDoc(themeRef);
  if (!snap.exists()) {
    await setDoc(themeRef, { css: defaultCSS });
    renderEditor(parseCSS(defaultCSS));
  } else {
    const data = snap.data();
    const rules = parseCSS(data.css);
    renderEditor(rules);
  }
}

// --- Save CSS (called by autosave) ---
async function saveCSS(rules) {
  const cssText = stringifyCSS(rules);
  await updateDoc(themeRef, { css: cssText });
  console.log("✅ Autosaved CSS update");
}

// --- Realtime listener (sync between admins) ---
onSnapshot(themeRef, snap => {
  const data = snap.data();
  if (!data) return;
  const rules = parseCSS(data.css);
  renderEditor(rules);
});

// --- Manual reload/save (fallback buttons) ---
reloadBtn.onclick = loadCSS;
saveBtn.onclick = () => {
  const rules = collectCSSFromUI();
  saveCSS(rules);
};

// --- Start ---
loadCSS();