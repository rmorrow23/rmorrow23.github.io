// Morrow Industries Editor — Firebase Auth + Firestore + Autosave
// Uses /assets/js/firebase-init.js to provide: { db, auth, provider }
// Firestore collections: editorProjects, currentProject/active

import { db, auth, provider } from "/assets/js/firebase-init.js";
import {
  collection, addDoc, doc, getDoc, getDocs, query, where, orderBy,
  onSnapshot, updateDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// === UI Elements ===
const guard = document.getElementById('guard');
const area = document.getElementById('editorArea');
const authBtn = document.getElementById('authBtn');
const authBtnMobile = document.getElementById('authBtnMobile');
const projectList = document.getElementById('projectList');
const newProjectBtn = document.getElementById('newProjectBtn');
const statusEl = document.getElementById('status');
const uploadInput = document.getElementById('uploadInput');
const saveBtn = document.getElementById('saveBtn');
const downloadHtmlBtn = document.getElementById('downloadHtmlBtn');

// Modal
const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const cancelModal = document.getElementById('cancelModal');
const createModal = document.getElementById('createModal');

// Tabs
const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
const htmlTA = document.getElementById('htmlEditor');
const cssTA = document.getElementById('cssEditor');
const jsTA = document.getElementById('jsEditor');

// === State ===
let HTML, CSS, JS;
let currentProjectId = null;
let saveTimer = null;
const AUTOSAVE_MS = 5000;

// === AUTH ===
onAuthStateChanged(auth, (user) => {
  if (user) {
    authBtn.textContent = "Sign out";
    authBtnMobile.textContent = "Sign out";
    guard.textContent = "Editor access granted.";
    area.classList.remove('hidden');
    loadProjects(user.uid);
  } else {
    authBtn.textContent = "Sign in";
    authBtnMobile.textContent = "Sign in";
    guard.textContent = "Please sign in (top right).";
    area.classList.add('hidden');
  }
});

authBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  try {
    if (user) await signOut(auth);
    else await signInWithPopup(auth, provider);
  } catch (e) {
    alert('Auth error: ' + (e?.message || e));
  }
});

// === Initialize CodeMirror ===
function initEditors() {
  if (window.CodeMirror && !HTML) {
    HTML = CodeMirror.fromTextArea(htmlTA, { mode: 'xml', lineNumbers: true, lineWrapping: true, tabSize: 2 });
    CSS = CodeMirror.fromTextArea(cssTA, { mode: 'css', lineNumbers: true, lineWrapping: true, tabSize: 2 });
    JS = CodeMirror.fromTextArea(jsTA, { mode: 'javascript', lineNumbers: true, lineWrapping: true, tabSize: 2 });

    [HTML, CSS, JS].forEach(ed => ed.on('change', onEditorChange));
    updatePreview();
  } else if (!window.CodeMirror) {
    // Try again if fallback loading
    setTimeout(initEditors, 400);
  }
}
initEditors();

// === Tabs Behavior ===
tabButtons.forEach(b => {
  b.addEventListener('click', () => {
    tabButtons.forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    const t = b.dataset.tab;
    htmlTA.classList.toggle('hidden', t !== 'html');
    cssTA.classList.toggle('hidden', t !== 'css');
    jsTA.classList.toggle('hidden', t !== 'js');
    if (window.CodeMirror) {
      HTML?.refresh();
      CSS?.refresh();
      JS?.refresh();
    }
  });
});

// === Live Preview (inline) ===
function updatePreview() {
  const iframe = document.getElementById('preview');
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  const html = HTML ? HTML.getValue() : htmlTA.value;
  const css = CSS ? CSS.getValue() : cssTA.value;
  const js = JS ? JS.getValue() : jsTA.value;
  const tpl = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>${css}</style></head>
    <body>${html}<script>${js}<\/script></body>
    </html>`;
  doc.open(); doc.write(tpl); doc.close();
}

// === Debounced Autosave ===
function onEditorChange() {
  statusEl.textContent = "Editing…";
  updatePreview();
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveCurrent, AUTOSAVE_MS);
}

// === Load Projects ===
function loadProjects(uid) {
  projectList.innerHTML = '<div class="text-sm text-[var(--muted)]">Loading…</div>';
  const qy = query(
    collection(db, 'editorProjects'),
    where('owner', '==', uid),
    orderBy('updatedAt', 'desc')
  );

  onSnapshot(qy, snap => {
    projectList.innerHTML = '';
    if (snap.empty) {
      projectList.innerHTML = '<div class="text-sm text-[var(--muted)]">No projects yet.</div>';
    }
    snap.forEach(d => {
      const p = d.data();
      const when = p.updatedAt?.toDate ? p.updatedAt.toDate().toLocaleString() : '—';
      const el = document.createElement('button');
      el.className = "w-full text-left rounded border border-[var(--border)] p-3 hover:bg-white/5 transition";
      el.innerHTML = `
        <div class="font-semibold">${p.title || 'Untitled'}</div>
        <div class="mt-1 text-xs text-[var(--muted)]">${when}</div>`;
      el.addEventListener('click', () => openProject(d.id));
      projectList.appendChild(el);
    });
  });
}

// === New Project Modal ===
newProjectBtn.addEventListener('click', () => {
  modalOverlay.classList.remove('hidden');
  modalTitle.value = "";
  modalTitle.focus();
});
cancelModal.addEventListener('click', () => modalOverlay.classList.add('hidden'));

createModal.addEventListener('click', async () => {
  const title = (modalTitle.value || '').trim() || 'Untitled';
  const user = auth.currentUser;
  if (!user) return alert('Please sign in.');

  try {
    const ref = await addDoc(collection(db, 'editorProjects'), {
      title,
      owner: user.uid,
      html: '',
      css: '',
      js: '',
      updatedAt: serverTimestamp()
    });

    modalOverlay.classList.add('hidden');
    await openProject(ref.id); // will also update currentProject/active
  } catch (e) {
    alert('Create error: ' + (e?.message || e));
  }
});

// === Open Project + Sync to currentProject ===
async function openProject(id) {
  currentProjectId = id;
  statusEl.textContent = "Opening…";

  try {
    const d = await getDoc(doc(db, 'editorProjects', id));
    if (!d.exists()) {
      statusEl.textContent = "Not found";
      return;
    }

    const p = d.data();
    if (HTML) HTML.setValue(p.html || '');
    else htmlTA.value = p.html || '';

    if (CSS) CSS.setValue(p.css || '');
    else cssTA.value = p.css || '';

    if (JS) JS.setValue(p.js || '');
    else jsTA.value = p.js || '';

    updatePreview();

    // 🔁 Update Firestore pointer to tell the preview what to render
    await setDoc(doc(db, "currentProject", "active"), {
      projectId: id,
      updatedAt: serverTimestamp()
    });

    statusEl.textContent = "Loaded";
  } catch (e) {
    statusEl.textContent = "Open error";
    alert('Open error: ' + (e?.message || e));
  }
}

// === Save Project (manual or autosave) ===
saveBtn.addEventListener('click', saveCurrent);

async function saveCurrent() {
  if (!currentProjectId) {
    statusEl.textContent = "No project selected";
    return;
  }

  const data = {
    html: HTML ? HTML.getValue() : htmlTA.value,
    css: CSS ? CSS.getValue() : cssTA.value,
    js: JS ? JS.getValue() : jsTA.value,
    updatedAt: serverTimestamp()
  };

  try {
    await updateDoc(doc(db, 'editorProjects', currentProjectId), data);
    statusEl.textContent = "Saved ✓ " + new Date().toLocaleTimeString();
  } catch (e) {
    statusEl.textContent = "Save error";
    alert('Save error: ' + (e?.message || e));
  }
}

// === Upload File ===
uploadInput.addEventListener('change', async (ev) => {
  const file = ev.target.files?.[0];
  if (!file) return;
  if (!currentProjectId) return alert('Open or create a project first.');

  const txt = await file.text();
  const name = file.name.toLowerCase();

  if (name.endsWith('.html')) HTML ? HTML.setValue(txt) : htmlTA.value = txt;
  else if (name.endsWith('.css')) CSS ? CSS.setValue(txt) : cssTA.value = txt;
  else if (name.endsWith('.js')) JS ? JS.setValue(txt) : jsTA.value = txt;
  else return alert('Please upload an .html, .css, or .js file.');

  updatePreview();
  saveCurrent();
  ev.target.value = '';
});

// === Download Combined HTML ===
downloadHtmlBtn.addEventListener('click', () => {
  const html = HTML ? HTML.getValue() : htmlTA.value;
  const css = CSS ? CSS.getValue() : cssTA.value;
  const js = JS ? JS.getValue() : jsTA.value;
  const final = `
    <!DOCTYPE html><html lang="en">
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <style>${css}</style></head><body>${html}<script>${js}<\/script></body></html>`;

  const blob = new Blob([final], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'project.html';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
});
