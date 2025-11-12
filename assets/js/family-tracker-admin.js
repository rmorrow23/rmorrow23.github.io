// ============================
// Morrow Industries — Family Tracker (Admin)
// Touch-Optimized Version (with Payment & Future Payment Support)
// ============================

import {
  auth, db,
  GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut,
  collection, doc, getDoc, getDocs, onSnapshot, updateDoc, deleteDoc
} from "/assets/js/firebase-init.js";

import { enableLiveStyle } from "/assets/js/family-tracker-livestyle.js";
enableLiveStyle();

/* ───────────── GLOBAL ELEMENTS ───────────── */
const userListEl = document.getElementById("userList");
const loanListEl = document.getElementById("loanList");
const logoutBtn = document.getElementById("logoutBtn");
const selectedUserInfo = document.getElementById("selectedUserInfo");

/* Modals & Buttons */
const loanDetailsModal = document.getElementById("loanDetailsModal");
const loanDetailsCard  = document.getElementById("loanDetailsCard");
const closeLoanDetails = document.getElementById("closeLoanDetails");

/* Delete sequence modals */
const passcodeModal    = document.getElementById("passcodeModal");
const overrideModal    = document.getElementById("overrideModal");
const nameMatchModal   = document.getElementById("nameMatchModal");
const adminPassInput   = document.getElementById("adminPassInput");
const verifyPasscode   = document.getElementById("verifyPasscode");
const confirmOverride  = document.getElementById("confirmOverride");
const finalDeleteBtn   = document.getElementById("finalDeleteBtn");
const confirmLoanNameInput = document.getElementById("confirmLoanNameInput");

let selectedUser = null;
let currentLoan  = null;
let verifiedPass = false;

/* ───────────── TOUCH-OPTIMIZED CLICK HANDLER ───────────── */
function addTapListener(el, fn) {
  if (!el) return;
  let locked = false;
  const run = e => {
    if (locked) return;
    locked = true;
    fn(e);
    setTimeout(() => (locked = false), 250);
  };
  el.addEventListener("click", run);
  el.addEventListener(
    "touchend",
    e => {
      e.preventDefault();
      run(e);
    },
    { passive: false }
  );
}

/* ───────────── SIMPLE LOADER & TOAST ───────────── */
function showLoader(msg = "Saving...") {
  let loader = document.getElementById("loader");
  if (!loader) {
    loader = document.createElement("div");
    loader.id = "loader";
    loader.className =
      "fixed inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-[9999]";
    loader.innerHTML = `
      <div class="animate-spin border-4 border-[#d4af37] border-t-transparent rounded-full w-10 h-10 mb-3"></div>
      <p class="text-[#d4af37] text-sm">${msg}</p>`;
    document.body.appendChild(loader);
  } else {
    loader.querySelector("p").textContent = msg;
    loader.classList.remove("hidden");
  }
}

function hideLoader() {
  const loader = document.getElementById("loader");
  if (loader) loader.classList.add("hidden");
}

function showToast(msg) {
  const toast = document.createElement("div");
  toast.className =
    "fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#d4af37]/90 text-black font-semibold px-4 py-2 rounded-md shadow-md z-[9999] animate-slideUp";
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}

/* ───────────── AUTHENTICATION ───────────── */
addTapListener(logoutBtn, () => signOut(auth));

onAuthStateChanged(auth, async user => {
  if (!user) {
    await signInWithPopup(auth, new GoogleAuthProvider());
    return;
  }
  const u = await getDoc(doc(db, "users", user.uid));
  if (!u.exists() || u.data().role_familyTracker !== "admin") {
    window.location = "unauthorized.html";
    return;
  }
  loadUsers();
});

/* ───────────── LOAD USERS ───────────── */
async function loadUsers() {
  userListEl.innerHTML = "";
  const users = await getDocs(collection(db, "users"));
  users.forEach(u => {
    const data = u.data();
    const row = document.createElement("div");
    row.className = "p-2 rounded hover:bg-[var(--border)] cursor-pointer";
    row.innerHTML = `
      <div class="flex justify-between items-center">
        <span>${data.name || data.email}</span>
        <select data-uid="${u.id}" class="bg-transparent border border-[var(--border)] rounded px-1 text-xs">
          <option value="">none</option>
          <option value="admin" ${data.role_familyTracker === "admin" ? "selected" : ""}>admin</option>
          <option value="viewer" ${data.role_familyTracker === "viewer" ? "selected" : ""}>viewer</option>
        </select>
      </div>`;
    row.querySelector("select").onchange = e => updateUserRole(u.id, e.target.value);
    addTapListener(row, () => selectUser(u.id, data));
    userListEl.appendChild(row);
  });
}

async function updateUserRole(uid, role) {
  await updateDoc(doc(db, "users", uid), { role_familyTracker: role || null });
}

/* ───────────── SELECT USER ───────────── */
function selectUser(uid, data) {
  selectedUser = uid;
  selectedUserInfo.textContent = `Managing loans for: ${data.name || data.email}`;
  watchLoans(uid);
}

/* ───────────── WATCH LOANS ───────────── */
function watchLoans(uid) {
  loanListEl.innerHTML = "";
  const ref = collection(db, "loans", uid, "userLoans");
  onSnapshot(ref, snap => {
    loanListEl.innerHTML = "";
    if (snap.empty) {
      loanListEl.innerHTML = `<p class="text-center text-gray-400 italic p-4">No loans yet</p>`;
      return;
    }
    snap.forEach(d => {
      const loan = d.data();
      loan.id = d.id;
      renderLoanCard(uid, loan);
    });
  });
}

/* ───────────── RENDER LOAN CARD ───────────── */
function renderLoanCard(uid, loan) {
  const bal = calcBalance(loan);
  const percent = loan.totalAmount ? (bal.paid / loan.totalAmount) * 100 : 0;
  const card = document.createElement("div");
  card.className = "loan-card";
  card.innerHTML = `
    <div class="loan-header">
      <div class="loan-left">
        <img src="${loan.loanIcon || "/assets/icons/default-loan.png"}" class="loan-icon"/>
        <div class="loan-info">
          <h3 class="loan-name">${loan.loanName}</h3>
          <p class="loan-remaining">Remaining $${bal.remaining.toFixed(2)}</p>
        </div>
      </div>
      <div class="loan-right">
        <p class="loan-next-label">Next</p>
        <p class="loan-next-date">${bal.nextDue || "—"}</p>
      </div>
    </div>
    <div class="loan-progress">
      <div class="loan-progress-bar" style="--progress:${percent}%"></div>
    </div>`;
  addTapListener(card, () => openLoanModal(uid, loan));
  loanListEl.appendChild(card);
}

/* ───────────── LOAN MODAL ───────────── */
function openLoanModal(uid, loan) {
  currentLoan = { uid, id: loan.id, data: loan };
  fillLoanDetails(loan);
  loanDetailsModal.classList.remove("hidden");
  setTimeout(() => loanDetailsCard.classList.remove("translate-y-full"), 10);
  setTimeout(initTabs, 300);
}
addTapListener(closeLoanDetails, () => closeModal());
function closeModal() {
  loanDetailsCard.classList.add("translate-y-full");
  setTimeout(() => loanDetailsModal.classList.add("hidden"), 250);
}

/* ───────────── FILL DETAILS ───────────── */
function fillLoanDetails(loan) {
  document.getElementById("detailsName").textContent = loan.loanName;
  document.getElementById("detailsIcon").src = loan.loanIcon || "/assets/icons/default-loan.png";
  const bal = calcBalance(loan);
  document.getElementById("detailsTotal").textContent = `$${loan.totalAmount?.toFixed(2) || 0}`;
  document.getElementById("detailsPaid").textContent = `$${bal.paid.toFixed(2)}`;
  document.getElementById("detailsRemaining").textContent = `$${bal.remaining.toFixed(2)}`;
  document.getElementById("detailsNextDue").textContent = bal.nextDue || "—";
  renderTables(loan);
}

function renderTables(loan) {
  const hist = document.getElementById("detailsHistory");
  const fut = document.getElementById("detailsUpcoming");
  const pay = Array.isArray(loan.transactions) ? loan.transactions : [];
  const futs = Array.isArray(loan.futurePayments) ? loan.futurePayments : [];
  let run = loan.totalAmount || 0;
  hist.innerHTML =
    "<tr class='text-[#d4af37]'><th>Date</th><th>Amt</th><th>Note</th><th>Remain</th></tr>" +
    (pay.map(p => {
      run -= p.amount;
      const d = p.date?.toDate?.() || new Date(p.date);
      return `<tr><td>${d.toLocaleDateString()}</td><td>$${p.amount.toFixed(2)}</td><td>${p.note || ""}</td><td>$${run.toFixed(2)}</td></tr>`;
    }).join("") || "<tr><td colspan='4' class='text-center py-1 text-xs'>No payments</td></tr>");
  fut.innerHTML =
    "<tr class='text-[#d4af37]'><th>Due</th><th>Amt</th></tr>" +
    (futs.map(f => `<tr><td>${new Date(f.dueDate).toLocaleDateString()}</td><td>$${f.amount.toFixed(2)}</td></tr>`).join("") ||
     "<tr><td colspan='2' class='text-center py-1 text-xs'>No future</td></tr>");
}

/* ───────────── PAYMENT LOGIC ───────────── */
const addPaymentForm = document.getElementById("addPaymentForm");
const paymentDateInput = document.getElementById("paymentDate");
const chipButtons = document.querySelectorAll(".chip-btn");

function setDateOffset(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  paymentDateInput.value = `${yyyy}-${mm}-${dd}`;
}
chipButtons.forEach(btn => {
  addTapListener(btn, () => {
    chipButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const offset = btn.dataset.offset;
    if (offset === "custom") { paymentDateInput.focus(); return; }
    setDateOffset(parseInt(offset, 10));
  });
});
setDateOffset(0);

if (addPaymentForm) {
  addPaymentForm.addEventListener("submit", async e => {
    e.preventDefault();
    if (!currentLoan || !currentLoan.uid) return alert("No loan selected.");
    const amount = parseFloat(document.getElementById("paymentAmount").value);
    const note = document.getElementById("paymentNote").value.trim();
    if (isNaN(amount) || amount <= 0) return alert("Enter valid amount.");
    let dateValue = paymentDateInput.value;
    const when = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
    showLoader("Adding payment...");
    try {
      const newPayment = { amount, note, date: when.toISOString() };
      const ref = doc(db, "loans", currentLoan.uid, "userLoans", currentLoan.id);
      const existing = Array.isArray(currentLoan.data.transactions) ? currentLoan.data.transactions : [];
      await updateDoc(ref, { transactions: [...existing, newPayment] });
      hideLoader(); showToast("Payment added!"); closeModal();
    } catch (err) {
      hideLoader(); console.error(err); alert("Error adding payment.");
    }
  });
}

/* ───────────── FUTURE PAYMENT LOGIC ───────────── */
const addFutureForm = document.getElementById("addFutureForm");
const futureDueDateInput = document.getElementById("futureDueDate");
const futureChipButtons = document.querySelectorAll(".future-chip-btn");

function setFutureOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  futureDueDateInput.value = `${yyyy}-${mm}-${dd}`;
}
futureChipButtons.forEach(btn => {
  addTapListener(btn, () => {
    futureChipButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const offset = btn.dataset.days;
    if (offset === "custom") { futureDueDateInput.focus(); return; }
    setFutureOffset(parseInt(offset, 10));
  });
});
setFutureOffset(30);

if (addFutureForm) {
  addFutureForm.addEventListener("submit", async e => {
    e.preventDefault();
    if (!currentLoan || !currentLoan.uid) return alert("No loan selected.");
    const amount = parseFloat(document.getElementById("futureAmount").value);
    const date = futureDueDateInput.value;
    if (isNaN(amount) || amount <= 0) return alert("Enter valid amount.");
    if (!date) return alert("Select a valid due date.");
    showLoader("Scheduling payment...");
    try {
      const newFuture = { dueDate: date, amount };
      const ref = doc(db, "loans", currentLoan.uid, "userLoans", currentLoan.id);
      const existing = Array.isArray(currentLoan.data.futurePayments) ? currentLoan.data.futurePayments : [];
      await updateDoc(ref, { futurePayments: [...existing, newFuture] });
      hideLoader(); showToast("Future payment added!"); closeModal();
    } catch (err) {
      hideLoader(); console.error(err); alert("Error adding future payment.");
    }
  });
}

/* ───────────── SECURE DELETE FLOW ───────────── */
const deleteLoanBtn = document.getElementById("deleteLoanBtn");
addTapListener(deleteLoanBtn, () => showModal(passcodeModal));
addTapListener(verifyPasscode, async () => {
  const adminPass = adminPassInput.value.trim();
  const passRef = await getDoc(doc(db, "adminSettings", "familyTracker"));
  if (!passRef.exists()) return alert("Passcode not set");
  if (adminPass !== passRef.data().passcode) return alert("Incorrect passcode");
  verifiedPass = true; hideModal(passcodeModal); showModal(overrideModal);
});
addTapListener(confirmOverride, () => {
  hideModal(overrideModal);
  if (!verifiedPass) return alert("Unauthorized");
  showModal(nameMatchModal);
});
addTapListener(finalDeleteBtn, async () => {
  const match = confirmLoanNameInput.value.trim();
  if (match !== currentLoan.data.loanName) return alert("Name mismatch");
  await deleteDoc(doc(db, "loans", currentLoan.uid, "userLoans", currentLoan.id));
  hideModal(nameMatchModal); closeModal(); alert("Loan deleted successfully");
});

/* ───────────── TABS ───────────── */
function initTabs() {
  const tabView = document.getElementById("tabView");
  const tabEdit = document.getElementById("tabEdit");
  const tabPayment = document.getElementById("tabPayment");
  const tabFuture = document.getElementById("tabFuture");
  const detailsPanel = document.getElementById("detailsPanel");
  const editPanel = document.getElementById("editPanel");
  const paymentPanel = document.getElementById("paymentPanel");
  const futurePanel = document.getElementById("futurePanel");
  const deleteBtn = document.getElementById("deleteLoanBtn");
  if (!tabView || !tabEdit || !tabPayment) return;
  let currentTab = "view";
  const panels = { view: detailsPanel, edit: editPanel, pay: paymentPanel, future: futurePanel };
  const tabs = { view: tabView, edit: tabEdit, pay: tabPayment, future: tabFuture };
  function switchTab(target) {
    if (target === currentTab) return;
    Object.values(tabs).forEach(t => t?.classList.remove("active"));
    tabs[target]?.classList.add("active");
    Object.values(panels).forEach(p => p?.classList.add("hidden"));
    panels[target]?.classList.remove("hidden");
    if (target === "edit") deleteBtn.classList.remove("opacity-0", "translate-y-6");
    else deleteBtn.classList.add("opacity-0", "translate-y-6");
    currentTab = target;
  }
  addTapListener(tabView, () => switchTab("view"));
  addTapListener(tabEdit, () => switchTab("edit"));
  addTapListener(tabPayment, () => switchTab("pay"));
  if (tabFuture) addTapListener(tabFuture, () => switchTab("future"));
}

/* ───────────── HELPERS ───────────── */
function calcBalance(loan) {
  const pay = Array.isArray(loan.transactions) ? loan.transactions : [];
  const fut = Array.isArray(loan.future