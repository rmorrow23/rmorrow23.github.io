// /assets/js/family-tracker-admin.js
import {
  auth, db,
  GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut,
  collection, doc, getDoc, getDocs, onSnapshot, addDoc, updateDoc, deleteDoc
} from "/assets/js/firebase-init.js";

/* ───────── DOM REFS ───────── */
const userListEl = byId("userList");
const loanListEl = byId("loanList");
const selectedUserInfo = byId("selectedUserInfo");
const logoutBtn = byId("logoutBtn");

/* Add Loan Modal */
const addLoanModal = byId("addLoanModal");
const addLoanBtn = byId("addLoanBtn");
const addLoanForm = byId("addLoanForm");
const cancelAddLoan = byId("cancelAddLoan");
const loanIconInput = byId("loanIconInput");
const loanIconPreview = byId("loanIconPreview");

/* Icon Upload Modal (from details) */
const iconUploadModal = byId("iconUploadModal");
const iconFileInput = byId("iconFileInput");
const iconPreview = byId("iconPreview");
const cancelIconUpload = byId("cancelIconUpload");
const confirmIconUpload = byId("confirmIconUpload");

/* Loan Details Modal */
const loanDetailsModal = byId("loanDetailsModal");
const loanDetailsCard  = byId("loanDetailsCard");
const closeLoanDetails = byId("closeLoanDetails");
const detailsIcon = byId("detailsIcon");
const detailsName = byId("detailsName");

/* Admin action buttons (inside modal) */
const editLoanBtn = byId("editLoanBtn");
const deleteLoanBtn = byId("deleteLoanBtn");
const addPaymentBtn = byId("addPaymentBtn");

/* Edit + Add Payment Sections (inside modal) */
const editSection = byId("editSection");
const addPaymentSection = byId("addPaymentSection");
const cancelEditBtn = byId("cancelEditBtn");
const saveEditBtn = byId("saveEditBtn");
const editLoanName = byId("editLoanName");
const editTotalAmount = byId("editTotalAmount");
const editFrequency = byId("editFrequency");
const addPaymentForm = byId("addPaymentForm");
const paymentAmount = byId("paymentAmount");
const paymentNote = byId("paymentNote");

/* Tables in modal */
const detailsTotal = byId("detailsTotal");
const detailsPaid = byId("detailsPaid");
const detailsRemaining = byId("detailsRemaining");
const detailsNextDue = byId("detailsNextDue");
const detailsHistory = byId("detailsHistory");
const detailsUpcoming = byId("detailsUpcoming");

/* Delete sequence modals */
const passcodeModal = byId("passcodeModal");
const overrideModal = byId("overrideModal");
const nameMatchModal = byId("nameMatchModal");
const adminPassInput = byId("adminPassInput");
const verifyPasscode = byId("verifyPasscode");
const confirmOverride = byId("confirmOverride");
const finalDeleteBtn = byId("finalDeleteBtn");
const confirmLoanNameInput = byId("confirmLoanNameInput");

/* State */
let selectedUser = null;  // uid of the selected person being managed
let currentLoan = null;   // { uid, id, data }
let verifiedPass = false; // for the secure delete flow
let pendingIconDataUrl = null;

/* ───────── AUTH ───────── */
logoutBtn?.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    await signInWithPopup(auth, new GoogleAuthProvider());
    return;
  }
  const uDoc = await getDoc(doc(db, "users", user.uid));
  if (!uDoc.exists() || uDoc.data().role_familyTracker !== "admin") {
    window.location = "unauthorized.html";
    return;
  }
  await loadUsers();
});

/* ───────── USERS ───────── */
async function loadUsers() {
  userListEl.innerHTML = "";
  const q = await getDocs(collection(db, "users"));
  q.forEach((u) => {
    const data = u.data();
    const row = document.createElement("div");
    row.className = "p-2 rounded hover:bg-[var(--border)] cursor-pointer";
    row.innerHTML = `
      <div class="flex justify-between items-center">
        <span>${escapeHtml(data.name || data.email || u.id)}</span>
        <select data-uid="${u.id}" class="bg-transparent border border-[var(--border)] rounded px-1 text-xs">
          <option value="">none</option>
          <option value="admin" ${data.role_familyTracker === "admin" ? "selected" : ""}>admin</option>
          <option value="viewer" ${data.role_familyTracker === "viewer" ? "selected" : ""}>viewer</option>
        </select>
      </div>`;
    row.querySelector("select").addEventListener("change", (e) =>
      updateUserRole(u.id, e.target.value)
    );
    row.addEventListener("click", (evt) => {
      // ignore clicks on the <select>
      if (evt.target.tagName.toLowerCase() === "select") return;
      selectUser(u.id, data);
    });
    userListEl.appendChild(row);
  });
}

async function updateUserRole(uid, role) {
  await updateDoc(doc(db, "users", uid), { role_familyTracker: role || null });
}

function selectUser(uid, data) {
  selectedUser = uid;
  selectedUserInfo.textContent = `Managing loans for: ${data.name || data.email || uid}`;
  watchLoans(uid);
}

/* ───────── LOANS ───────── */
function watchLoans(uid) {
  loanListEl.innerHTML = "";
  const ref = collection(db, "loans", uid, "userLoans");
  onSnapshot(ref, (snap) => {
    loanListEl.innerHTML = "";
    if (snap.empty) {
      loanListEl.innerHTML = `<p class="text-center text-gray-400 italic p-4">No loans yet</p>`;
      return;
    }
    snap.forEach((docSnap) => {
      const loan = docSnap.data();
      loan.id = docSnap.id;
      renderLoanCard(uid, loan);
    });
  });
}

function renderLoanCard(uid, loan) {
  const bal = calcBalance(loan);
  const percent = loan.totalAmount ? Math.min(100, Math.max(0, (bal.paid / Number(loan.totalAmount)) * 100)) : 0;

  const card = document.createElement("div");
  card.className = "glass p-4 rounded-md cursor-pointer hover:shadow-lg transition";
  card.innerHTML = `
    <div class="flex justify-between items-start flex-wrap sm:flex-nowrap">
      <!-- Left section -->
      <div class="flex items-start gap-4 flex-1 min-w-[200px]">
        <img src="${escapeAttr(loan.loanIcon || "/assets/icons/default-loan.png")}"
             class="w-16 h-16 sm:w-12 sm:h-12 rounded-md object-cover border border-[rgba(255,255,255,0.1)] flex-shrink-0" />

        <div class="flex flex-col flex-1">
          <h3 class="text-[#d4af37] font-semibold text-base sm:text-sm">${escapeHtml(loan.loanName || "Loan")}</h3>
          <p class="text-sm sm:text-xs text-gray-400 mb-1">
            Remaining $${toMoney(bal.remaining)}
          </p>
          <div class="h-2 sm:h-1.5 bg-[rgba(255,255,255,0.1)] rounded-md overflow-hidden">
            <div class="h-full bg-[#d4af37] rounded-md transition-all duration-500" style="width:${percent}%;"></div>
          </div>
        </div>
      </div>

      <!-- Right section -->
      <div class="text-right text-sm sm:text-xs mt-3 sm:mt-0 pl-2">
        <p class="text-gray-400">Next</p>
        <p>${escapeHtml(bal.nextDue || "—")}</p>
      </div>
    </div>
  `;
  card.addEventListener("click", () => openLoanModal(uid, loan));
  loanListEl.appendChild(card);
}

/* ───────── MODAL (OPEN/CLOSE) ───────── */
function openLoanModal(uid, loan) {
  currentLoan = { uid, id: loan.id, data: loan };
  fillLoanDetails(loan);
  loanDetailsModal.classList.remove("hidden");
  // snap-open animation
  setTimeout(() => loanDetailsCard.classList.remove("translate-y-full"), 10);
}

closeLoanDetails?.addEventListener("click", closeModal);

function closeModal() {
  loanDetailsCard.classList.add("translate-y-full");
  setTimeout(() => loanDetailsModal.classList.add("hidden"), 250);
  // reset edit/payment sections
  editSection.classList.add("hidden");
  addPaymentSection.classList.add("hidden");
}

/* ───────── MODAL (FILL DETAILS) ───────── */
function fillLoanDetails(loan) {
  detailsIcon.src = loan.loanIcon || "/assets/icons/default-loan.png";
  detailsName.textContent = loan.loanName || "Loan";

  const bal = calcBalance(loan);
  detailsTotal.textContent = `$${toMoney(loan.totalAmount)}`;
  detailsPaid.textContent = `$${toMoney(bal.paid)}`;
  detailsRemaining.textContent = `$${toMoney(bal.remaining)}`;
  detailsNextDue.textContent = bal.nextDue || "—";

  renderTables(loan);
}

function renderTables(loan) {
  const pay = Array.isArray(loan.transactions) ? loan.transactions : [];
  const futs = Array.isArray(loan.futurePayments) ? loan.futurePayments : [];

  // History table
  let run = num(loan.totalAmount);
  const histRows = pay.map(p => {
    run -= num(p.amount);
    const d = p.date?.toDate?.() || new Date(p.date);
    const dateStr = isNaN(d) ? "—" : d.toLocaleDateString();
    return `<tr>
      <td>${escapeHtml(dateStr)}</td>
      <td>$${toMoney(p.amount)}</td>
      <td>${escapeHtml(p.note || "")}</td>
      <td>$${toMoney(run)}</td>
    </tr>`;
  }).join("");

  detailsHistory.innerHTML =
    `<tr class="text-[#d4af37]"><th>Date</th><th>Amt</th><th>Note</th><th>Remain</th></tr>` +
    (histRows || `<tr><td colspan="4" class="text-center py-1 text-xs">No payments</td></tr>`);

  // Upcoming table
  const futRows = futs.map(f => {
    const d = f.dueDate?.toDate?.() || new Date(f.dueDate);
    const dateStr = isNaN(d) ? "—" : d.toLocaleDateString();
    return `<tr>
      <td>${escapeHtml(dateStr)}</td>
      <td>$${toMoney(f.amount)}</td>
    </tr>`;
  }).join("");

  detailsUpcoming.innerHTML =
    `<tr class="text-[#d4af37]"><th>Due</th><th>Amt</th></tr>` +
    (futRows || `<tr><td colspan="2" class="text-center py-1 text-xs">No future</td></tr>`);
}

/* ───────── EDIT MODE ───────── */
editLoanBtn?.addEventListener("click", () => {
  if (!currentLoan) return;
  // Toggle
  const opening = editSection.classList.contains("hidden");
  editSection.classList.toggle("hidden");
  addPaymentSection.classList.toggle("hidden", !opening);

  // Pre-fill
  editLoanName.value = currentLoan.data.loanName || "";
  editTotalAmount.value = num(currentLoan.data.totalAmount) || "";
  editFrequency.value = currentLoan.data.paymentFrequency || "monthly";
});

cancelEditBtn?.addEventListener("click", () => {
  editSection.classList.add("hidden");
  addPaymentSection.classList.add("hidden");
});

saveEditBtn?.addEventListener("click", async () => {
  if (!currentLoan) return;
  const ref = doc(db, "loans", currentLoan.uid, "userLoans", currentLoan.id);
  await updateDoc(ref, {
    loanName: editLoanName.value.trim() || currentLoan.data.loanName || "Loan",
    totalAmount: num(editTotalAmount.value),
    paymentFrequency: editFrequency.value || "monthly"
  });
  // refresh from memory (UI will also auto-refresh via snapshot)
  currentLoan.data.loanName = editLoanName.value.trim() || currentLoan.data.loanName;
  currentLoan.data.totalAmount = num(editTotalAmount.value);
  currentLoan.data.paymentFrequency = editFrequency.value || "monthly";
  fillLoanDetails(currentLoan.data);
  editSection.classList.add("hidden");
  addPaymentSection.classList.add("hidden");
  toast("Loan updated.");
});

/* ───────── ADD PAYMENT ───────── */
addPaymentBtn?.addEventListener("click", () => {
  // ensure visible (if you want Add Payment independent of Edit toggle)
  addPaymentSection.classList.toggle("hidden");
});

addPaymentForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentLoan) return;
  const amt = num(paymentAmount.value);
  if (!amt) return;
  const note = paymentNote.value.trim();

  const ref = doc(db, "loans", currentLoan.uid, "userLoans", currentLoan.id);
  const snap = await getDoc(ref);
  const existing = Array.isArray(snap.data().transactions) ? snap.data().transactions : [];
  existing.push({ amount: amt, note, date: new Date() });

  await updateDoc(ref, { transactions: existing });
  paymentAmount.value = "";
  paymentNote.value = "";
  toast("Payment added.");
});

/* ───────── DELETE (secure 3-step) ───────── */
deleteLoanBtn?.addEventListener("click", () => show(passcodeModal));

verifyPasscode?.addEventListener("click", async () => {
  const pass = adminPassInput.value.trim();
  const passRef = await getDoc(doc(db, "adminSettings", "familyTracker"));
  if (!passRef.exists()) { alert("Admin passcode not set."); return; }
  if (pass !== String(passRef.data().passcode || "")) { alert("Incorrect passcode."); return; }
  verifiedPass = true;
  hide(passcodeModal);
  show(overrideModal);
});

confirmOverride?.addEventListener("click", () => {
  hide(overrideModal);
  if (!verifiedPass) { alert("Unauthorized."); return; }
  confirmLoanNameInput.value = "";
  show(nameMatchModal);
});

finalDeleteBtn?.addEventListener("click", async () => {
  if (!currentLoan) return;
  const typed = confirmLoanNameInput.value.trim();
  const exact = currentLoan.data.loanName || "";
  if (typed !== exact) { alert("Loan name does not match."); return; }
  await deleteDoc(doc(db, "loans", currentLoan.uid, "userLoans", currentLoan.id));
  hide(nameMatchModal);
  closeModal();
  toast("Loan deleted.");
});

/* ───────── ADD LOAN (modal) ───────── */
addLoanBtn?.addEventListener("click", () => {
  if (!selectedUser) { alert("Select a user first."); return; }
  open(addLoanModal);
});

cancelAddLoan?.addEventListener("click", () => close(addLoanModal));

loanIconInput?.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  loanIconPreview.src = await fileToDataUrl(file);
});

addLoanForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!selectedUser) { alert("Select a user first."); return; }

  const form = new FormData(addLoanForm);
  const loanName = String(form.get("loanName") || "").trim() || "Loan";
  const totalAmount = num(form.get("totalAmount"));
  const startDate = form.get("startDate") ? new Date(form.get("startDate")) : null;
  const firstPaymentDate = form.get("firstPaymentDate") ? new Date(form.get("firstPaymentDate")) : null;
  const paymentFrequency = String(form.get("paymentFrequency") || "monthly");

  const iconSrc = loanIconPreview?.src || "/assets/icons/default-loan.png";

  await addDoc(collection(db, "loans", selectedUser, "userLoans"), {
    loanName,
    totalAmount,
    startDate: startDate || null,
    firstPaymentDate: firstPaymentDate || null,
    paymentFrequency,
    loanIcon: iconSrc,
    createdAt: new Date(),
    transactions: [],
    futurePayments: []
  });

  addLoanForm.reset();
  loanIconPreview.src = "/assets/icons/default-loan.png";
  close(addLoanModal);
  toast("Loan created.");
});

/* ───────── ICON CHANGE from DETAILS ───────── */
detailsIcon?.addEventListener("click", () => {
  pendingIconDataUrl = null;
  iconPreview.src = detailsIcon.src || "/assets/icons/default-loan.png";
  iconFileInput.value = "";
  open(iconUploadModal);
});

iconFileInput?.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  pendingIconDataUrl = await fileToDataUrl(file);
  iconPreview.src = pendingIconDataUrl;
});

cancelIconUpload?.addEventListener("click", () => close(iconUploadModal));

confirmIconUpload?.addEventListener("click", async () => {
  if (!currentLoan) return;
  const dataUrl = pendingIconDataUrl || iconPreview.src;
  await updateDoc(doc(db, "loans", currentLoan.uid, "userLoans", currentLoan.id), {
    loanIcon: dataUrl
  });
  detailsIcon.src = dataUrl;
  close(iconUploadModal);
  toast("Icon updated.");
});

/* ───────── HELPERS ───────── */
function calcBalance(loan) {
  const pay = Array.isArray(loan.transactions) ? loan.transactions : [];
  const fut = Array.isArray(loan.futurePayments) ? loan.futurePayments : [];
  const paid = pay.reduce((a, b) => a + num(b.amount), 0);
  const remaining = num(loan.totalAmount) - paid;
  let nextDue = null;
  if (fut.length) {
    const sorted = [...fut].sort((a, b) => (dateVal(a.dueDate) - dateVal(b.dueDate)));
    const nd = sorted[0]?.dueDate;
    nextDue = nd ? toDateString(nd) : null;
  }
  return { paid, remaining, nextDue: nextDue || "—" };
}

function renderErrorSafe(fn) {
  try { fn(); } catch (e) { console.error(e); }
}

function show(el) { el?.classList?.remove("hidden"); }
function hide(el) { el?.classList?.add("hidden"); }
function open(el) { show(el); }
function close(el) { hide(el); }

function byId(id) { return document.getElementById(id); }
function num(v) { const n = Number(v); return isNaN(n) ? 0 : n; }
function toMoney(v) { return num(v).toFixed(2); }

function dateVal(v) {
  const d = v?.toDate?.() || new Date(v);
  return d instanceof Date && !isNaN(d) ? +d : Number.MAX_SAFE_INTEGER;
}
function toDateString(v) {
  const d = v?.toDate?.() || new Date(v);
  return isNaN(d) ? "—" : d.toLocaleDateString();
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(s) { return escapeHtml(s).replaceAll("`", "&#096;"); }

function toast(msg) {
  // lightweight toast
  const t = document.createElement("div");
  t.textContent = msg;
  t.className = "fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#12141b] border border-[rgba(255,255,255,0.08)] text-[#e9eef8] px-4 py-2 rounded-md shadow-lg z-[60]";
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1800);
}

/* ───────── SAFETY: close modals on ESC ───────── */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    [addLoanModal, iconUploadModal, passcodeModal, overrideModal, nameMatchModal].forEach(close);
    // don't close loan details on ESC unless desired — uncomment to enable:
    // closeModal();
  }
});

/* ───────── CLICK-BEHIND to close (details only) ───────── */
loanDetailsModal?.addEventListener("click", (e) => {
  if (e.target === loanDetailsModal) closeModal();
});
/* ───────── TAB + PANEL ANIMATIONS ───────── */
const tabs = {
  view: document.getElementById("tabView"),
  edit: document.getElementById("tabEdit"),
  pay: document.getElementById("tabPayment")
};
const panels = {
  view: document.getElementById("detailsPanel"),
  edit: document.getElementById("editPanel"),
  pay: document.getElementById("paymentPanel")
};
const deleteBtn = document.getElementById("deleteLoanBtn");

let currentTab = "view";

function switchTab(target) {
  if (target === currentTab) return;
  Object.values(tabs).forEach(t => t.classList.remove("active"));
  tabs[target].classList.add("active");

  // animate transitions
  const prev = panels[currentTab];
  const next = panels[target];
  prev.classList.remove("active");
  next.classList.add("active");

  // Assign directional animations
  if (currentTab === "view" && target === "edit") {
    prev.classList.add("animate-slideUp");
    next.classList.add("animate-slideLeftIn");
  } else if (currentTab === "view" && target === "pay") {
    prev.classList.add("animate-slideUp");
    next.classList.add("animate-slideRightIn");
  } else if (target === "view") {
    // slide details back down
    prev.classList.add("animate-slideDown");
    next.classList.add("animate-slideDown");
  }

  // delete button visibility logic
  if (target === "edit") {
    deleteBtn.classList.remove("opacity-0", "translate-y-6");
  } else {
    deleteBtn.classList.add("opacity-0", "translate-y-6");
  }

  // cleanup previous animations
  setTimeout(() => {
    prev.className = prev.className.replace(/animate-\S+/g, "");
    next.className = next.className.replace(/animate-\S+/g, "");
  }, 400);

  currentTab = target;
}

// Tab event bindings
tabs.view.addEventListener("click", () => switchTab("view"));
tabs.edit.addEventListener("click", () => switchTab("edit"));
tabs.pay.addEventListener("click", () => switchTab("pay"));
/* End */