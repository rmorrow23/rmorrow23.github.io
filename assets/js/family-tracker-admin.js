// ============================
// Morrow Industries — Family Tracker (Admin)
// Touch-Optimized Version
// ============================

import {
  auth, db,
  GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut,
  collection, doc, getDoc, getDocs, onSnapshot, updateDoc, deleteDoc
} from "/assets/js/firebase-init.js";

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

/* ───────────── TOUCH OPTIMIZED CLICK HANDLER ───────────── */
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
      e.preventDefault();   // stop ghost click
      run(e);
    },
    { passive: false }
  );
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
  card.className = "glass p-4 rounded-md cursor-pointer hover:shadow-lg transition";
  card.innerHTML = `
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-3">
        <img src="${loan.loanIcon || "/assets/icons/default-loan.png"}" class="w-12 h-12 rounded-md border border-[rgba(255,255,255,0.1)]"/>
        <div>
          <h3 class="text-[#d4af37] font-semibold">${loan.loanName}</h3>
          <p class="text-sm text-gray-400">Remaining $${bal.remaining.toFixed(2)}</p>
        </div>
      </div>
      <div class="text-right text-sm">
        <p class="text-gray-400">Next</p>
        <p>${bal.nextDue || "—"}</p>
      </div>
    </div>
    <div class="h-2 bg-[rgba(255,255,255,0.1)] rounded mt-3">
      <div class="h-2 bg-[#d4af37] rounded" style="width:${percent}%"></div>
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
  setTimeout(initTabs, 300); // initialize tab system after modal is visible
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
    (pay
      .map(p => {
        run -= p.amount;
        const d = p.date?.toDate?.() || new Date(p.date);
        return `<tr><td>${d.toLocaleDateString()}</td><td>$${p.amount.toFixed(2)}</td><td>${p.note || ""}</td><td>$${run.toFixed(2)}</td></tr>`;
      })
      .join("") || "<tr><td colspan='4' class='text-center py-1 text-xs'>No payments</td></tr>");

  fut.innerHTML =
    "<tr class='text-[#d4af37]'><th>Due</th><th>Amt</th></tr>" +
    (futs
      .map(f => `<tr><td>${new Date(f.dueDate).toLocaleDateString()}</td><td>$${f.amount.toFixed(2)}</td></tr>`)
      .join("") || "<tr><td colspan='2' class='text-center py-1 text-xs'>No future</td></tr>");
}

/* ───────────── SECURE DELETE FLOW ───────────── */
const deleteLoanBtn = document.getElementById("deleteLoanBtn");
addTapListener(deleteLoanBtn, () => showModal(passcodeModal));

addTapListener(verifyPasscode, async () => {
  const adminPass = adminPassInput.value.trim();
  const passRef = await getDoc(doc(db, "adminSettings", "familyTracker"));
  if (!passRef.exists()) {
    alert("Passcode not set");
    return;
  }
  if (adminPass !== passRef.data().passcode) {
    alert("Incorrect passcode");
    return;
  }
  verifiedPass = true;
  hideModal(passcodeModal);
  showModal(overrideModal);
});

addTapListener(confirmOverride, () => {
  hideModal(overrideModal);
  if (!verifiedPass) {
    alert("Unauthorized");
    return;
  }
  showModal(nameMatchModal);
});

addTapListener(finalDeleteBtn, async () => {
  const match = confirmLoanNameInput.value.trim();
  if (match !== currentLoan.data.loanName) {
    alert("Name mismatch");
    return;
  }
  await deleteDoc(doc(db, "loans", currentLoan.uid, "userLoans", currentLoan.id));
  hideModal(nameMatchModal);
  closeModal();
  alert("Loan deleted successfully");
});

/* ───────────── TABS & ANIMATIONS ───────────── */
function initTabs() {
  const tabView = document.getElementById("tabView");
  const tabEdit = document.getElementById("tabEdit");
  const tabPayment = document.getElementById("tabPayment");
  const detailsPanel = document.getElementById("detailsPanel");
  const editPanel = document.getElementById("editPanel");
  const paymentPanel = document.getElementById("paymentPanel");
  const deleteBtn = document.getElementById("deleteLoanBtn");

  if (!tabView || !tabEdit || !tabPayment) return;

  let currentTab = "view";
  const panels = { view: detailsPanel, edit: editPanel, pay: paymentPanel };
  const tabs = { view: tabView, edit: tabEdit, pay: tabPayment };

  function switchTab(target) {
    if (target === currentTab) return;
    Object.values(tabs).forEach(t => t.classList.remove("active"));
    tabs[target].classList.add("active");

    Object.values(panels).forEach(p => p.classList.add("hidden"));
    panels[target].classList.remove("hidden");

    // animations
    if (currentTab === "view" && target === "edit") {
      panels[target].classList.add("animate-slideLeftIn");
    } else if (currentTab === "view" && target === "pay") {
      panels[target].classList.add("animate-slideRightIn");
    } else if (target === "view") {
      panels[target].classList.add("animate-slideDown");
    }

    // delete button animation
    if (target === "edit") {
      deleteBtn.classList.remove("opacity-0", "translate-y-6");
    } else {
      deleteBtn.classList.add("opacity-0", "translate-y-6");
    }

    currentTab = target;
  }

  addTapListener(tabView, () => switchTab("view"));
  addTapListener(tabEdit, () => switchTab("edit"));
  addTapListener(tabPayment, () => switchTab("pay"));
}

/* ───────────── HELPERS ───────────── */
function calcBalance(loan) {
  const pay = Array.isArray(loan.transactions) ? loan.transactions : [];
  const fut = Array.isArray(loan.futurePayments) ? loan.futurePayments : [];
  const paid = pay.reduce((a, b) => a + b.amount, 0);
  const remaining = (loan.totalAmount || 0) - paid;
  const nextDue = fut.length
    ? fut.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0].dueDate
    : null;
  return { paid, remaining, nextDue: nextDue ? new Date(nextDue).toLocaleDateString() : "—" };
}

function showModal(m) { m.classList.remove("hidden"); }
function hideModal(m) { m.classList.add("hidden"); }