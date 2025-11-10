// ================================
// Morrow Industries — Theme Editor
// ================================
import { db, doc, getDoc, setDoc, updateDoc, onSnapshot } from "/assets/js/firebase-init.js";

const editorContainer = document.getElementById("cssEditor");
const saveBtn = document.getElementById("saveCSSBtn");
const reloadBtn = document.getElementById("reloadCSSBtn");

// Firestore document where the theme CSS is stored
const themeRef = doc(db, "familyTrackerSettings", "themeCSS");

// Default fallback CSS (in case Firestore is empty)
const defaultCSS = `
:root {
  --gold:#d4af37;
  --bg:#0a0b0f;
  --text:#e9eef8;
  --border:rgba(255,255,255,0.08);
  --surface:rgba(18,20,27,.75);
}
/* Add your CSS below */
`;

// --- Utility: Parse CSS string into structured object ---
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

// --- Utility: Convert structured object back into CSS text ---
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

// --- Render the editable CSS UI ---
function renderEditor(rules) {
  editorContainer.innerHTML = "";

  for (const [selector, props] of Object.entries(rules)) {
    const block = document.createElement("div");
    block.className = "glass p-3 rounded-md space-y-2";

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
    removeSelector.onclick = () => block.remove();

    editorContainer.appendChild(block);
  }

  // Add button to create a new selector
  const addSelectorBtn = document.createElement("button");
  addSelectorBtn.textContent = "+ Add New Selector";
  addSelectorBtn.className = "btn-primary w-full mt-4";
  addSelectorBtn.onclick = () => {
    const newBlock = document.createElement("div");
    newBlock.className = "glass p-3 rounded-md space-y-2";
    newBlock.innerHTML = `
      <div class="flex justify-between items-center">
        <input class="form-input flex-1 selectorInput" placeholder="New selector (e.g., .myClass)" />
        <button class="bg-red-600 text-white px-2 py-1 rounded ml-2 deleteSelector">✕</button>
      </div>
      <div class="space-y-1 propsList"></div>
      <button class="btn-secondary w-full mt-2 addProp">+ Add Property</button>
    `;
    newBlock.querySelector(".deleteSelector").onclick = () => newBlock.remove();
    newBlock.querySelector(".addProp").onclick = () => {
      const propsList = newBlock.querySelector(".propsList");
      const row = document.createElement("div");
      row.className = "flex gap-2";
      row.innerHTML = `
        <input class="form-input flex-1 propKey" placeholder="property" />
        <input class="form-input flex-1 propVal" placeholder="value" />
        <button class="bg-red-500 text-white rounded px-2 removeProp">–</button>
      `;
      propsList.appendChild(row);
    };
    editorContainer.insertBefore(newBlock, addSelectorBtn);
  };
  editorContainer.appendChild(addSelectorBtn);
}

// --- Collect updated CSS from UI ---
function collectCSSFromUI() {
  const blocks = editorContainer.querySelectorAll(".glass");
  const rules = {};
  blocks.forEach(block => {
    const selector = block.querySelector(".selectorInput")?.value?.trim();
    if (!selector) return;
    const props = {};
    const propRows = block.querySelectorAll(".propKey");
    propRows.forEach((keyEl, i) => {
      const key = keyEl.value.trim();
      const val = block.querySelectorAll(".propVal")[i]?.value.trim();
      if (key && val) props[key] = val;
    });
    rules[selector] = props;
  });
  return rules;
}

// --- Load or create theme CSS document ---
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

// --- Save CSS to Firestore ---
async function saveCSS() {
  const newRules = collectCSSFromUI();
  const cssText = stringifyCSS(newRules);
  await updateDoc(themeRef, { css: cssText });
  alert("✅ CSS updated successfully!");
}

// --- Live reload listener ---
onSnapshot(themeRef, docSnap => {
  const data = docSnap.data();
  if (!data) return;
  const rules = parseCSS(data.css);
  renderEditor(rules);
});

// --- Button handlers ---
saveBtn.onclick = saveCSS;
reloadBtn.onclick = loadCSS;

// --- Initialize ---
loadCSS();