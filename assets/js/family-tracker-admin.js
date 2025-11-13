// ============================
// Morrow Industries — Family Tracker (Admin)
// Fully Wired + Animated Version
// ============================

import {
  auth, db,
  GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut,
  collection, doc, getDoc, getDocs, onSnapshot, updateDoc, deleteDoc
} from "/assets/js/firebase-init.js";

import { enableLiveStyle } from "/assets/js/family-tracker-livestyle.js";
enableLiveStyle();

/* ───────────── ELEMENTS ───────────── */
const userListEl = document.getElementById("userList");
const loanListEl = document.getElementById("loanList");
const logoutBtn = document.getElementById("logoutBtn");
const selectedUserInfo = document.getElementById("selectedUserInfo");
const loanDetailsModal = document.getElementById("loanDetailsModal");
const loanDetailsCard = document.getElementById("loanDetailsCard");
const closeLoanDetails = document.getElementById("closeLoanDetails");

let selectedUser = null;
let currentLoan = null;

/* ───────────── TOUCH SAFE HANDLER ───────────── */
function addTapListener(el, fn) {
  if (!el) return;
  let locked = false;
  const handler = e => {
    if (locked) return;
    locked = true;
    fn(e);
    setTimeout(() => (locked = false), 250);
  };
  el.addEventListener("click", handler);
  el.addEventListener(
    "touchend",
    e => {
      e.preventDefault();
      handler(e);
    },
    { passive: false }
  );
}

/* ───────────── AUTH ───────────── */
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

/* ───────────── USERS ───────────── */
async function loadUsers() {
  userListEl.innerHTML = `<p class="text-center text-gray-400 italic p-4">Loading users...</p>`;
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    console.log("✅ Users snapshot size:", usersSnap.size);

    if (usersSnap.empty) {
      userListEl.innerHTML = `<p class="text-center text-gray-400 italic p-4">No users found in Firestore.</p>`;
      return;
    }

    userListEl.innerHTML = "";
    usersSnap.forEach(docSnap => {
      const data = docSnap.data();
      console.log("👤 User loaded:", docSnap.id, data);
      const row = document.createElement("div");
      row.className = "p-2 rounded hover:bg-[var(--border)] cursor-pointer";
      row.innerHTML = `
        <div class="flex justify-between items-center">
          <span>${data.name || data.email || docSnap.id}</span>
          <select data-uid="${docSnap.id}" class="bg-transparent border border-[var(--border)] rounded px-1 text-xs">
            <option value="">none</option>
            <option value="admin" ${(data.role_familyTracker || data.role_familytracker) === "admin" ? "selected" : ""}>admin</option>
            <option value="viewer" ${(data.role_familyTracker || data.role_familytracker) === "viewer" ? "selected" : ""}>viewer</option>
          </select>
        </div>`;
      row.querySelector("select").onchange = e => updateUserRole(docSnap.id, e.target.value);
      addTapListener(row, () => selectUser(docSnap.id, data));
      userListEl.appendChild(row);
    });
  } catch (err) {
    console.error("❌ Error loading users:", err);
    userListEl.innerHTML = `<p class="text-center text-red-400 italic p-4">Error loading users: ${err.message}</p>`;
  }
}

async function updateUserRole(uid, role) {
  await updateDoc(doc(db, "users", uid), { role_familyTracker: role || null });
}

/* ───────────── LOANS ───────────── */
function selectUser(uid, data) {
  selectedUser = uid;
  selectedUserInfo.textContent = `Managing loans for: ${data.name || data.email}`;
  watchLoans(uid);
}

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

/* ───────────── MODAL OPEN/CLOSE (Animated) ───────────── */
function openLoanModal(uid, loan) {
  currentLoan = { uid, id: loan.id, data: loan };
  fillLoanDetails(loan);
  loanDetailsModal.classList.remove("hidden");
  loanDetailsModal.style.opacity = "0";
  setTimeout(() => {
    loanDetailsModal.style.transition = "opacity 0.3s";
    loanDetailsModal.style.opacity = "1";
    loanDetailsCard.classList.add("animate-slideUp");
  }, 10);
  setTimeout(initTabs, 200);
}

addTapListener(closeLoanDetails, closeModal);
function closeModal() {
  loanDetailsCard.classList.add("animate-slideDown");
  loanDetailsModal.style.opacity = "1";
  setTimeout(() => {
    loanDetailsModal.style.opacity = "0";
    setTimeout(() => {
      loanDetailsModal.classList.add("hidden");
      loanDetailsCard.classList.remove("animate-slideDown");
    }, 250);
  }, 50);
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

  document.getElementById("editLoanName").value = loan.loanName || "";
  document.getElementById("editTotalAmount").value = loan.totalAmount || "";
  document.getElementById("editFrequency").value = loan.frequency || "monthly";
}

/* ───────────── SAVE EDIT ───────────── */
addTapListener(document.getElementById("saveEditBtn"), async e => {
  e.preventDefault();
  if (!currentLoan) return;
  const name = document.getElementById("editLoanName").value.trim();
  const total = parseFloat(document.getElementById("editTotalAmount").value);
  const freq = document.getElementById("editFrequency").value;
  if (!name || isNaN(total)) return alert("Enter valid info");
  showLoader("Saving changes...");
  try {
    await updateDoc(doc(db, "loans", currentLoan.uid, "userLoans", currentLoan.id), {
      loanName: name, totalAmount: total, frequency: freq
    });
    hideLoader(); showToast("Changes saved!");
  } catch {
    hideLoader(); alert("Error saving changes");
  }
});

/* ───────────── ADD PAYMENT ───────────── */
document.getElementById("addPaymentForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (!currentLoan) return;
  const amount = parseFloat(document.getElementById("paymentAmount").value);
  const note = document.getElementById("paymentNote").value.trim();
  const dateVal = document.getElementById("paymentDate").value;
  const date = dateVal ? new Date(`${dateVal}T00:00:00`) : new Date();
  if (isNaN(amount) || amount <= 0) return alert("Enter valid amount");
  showLoader("Adding payment...");
  try {
    const newPayment = { amount, note, date: date.toISOString() };
    const ref = doc(db, "loans", currentLoan.uid, "userLoans", currentLoan.id);
    const existing = Array.isArray(currentLoan.data.transactions) ? currentLoan.data.transactions : [];
    await updateDoc(ref, { transactions: [...existing, newPayment] });
    hideLoader(); showToast("Payment added!"); closeModal();
  } catch {
    hideLoader(); alert("Error adding payment");
  }
});

/* ───────────── ADD FUTURE PAYMENT ───────────── */
document.getElementById("addFutureForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (!currentLoan) return;
  const amount = parseFloat(document.getElementById("futureAmount").value);
  const dateVal = document.getElementById("futureDueDate").value;
  if (isNaN(amount) || !dateVal) return alert("Enter valid amount & date");
  showLoader("Scheduling future payment...");
  try {
    const newFuture = { dueDate: dateVal, amount };
    const ref = doc(db, "loans", currentLoan.uid, "userLoans", currentLoan.id);
    const existing = Array.isArray(currentLoan.data.futurePayments) ? currentLoan.data.futurePayments : [];
    await updateDoc(ref, { futurePayments: [...existing, newFuture] });
    hideLoader(); showToast("Future payment added!"); closeModal();
  } catch {
    hideLoader(); alert("Error adding future payment");
  }
});

/* ───────────── ANIMATED TAB SWITCH ───────────── */
function initTabs() {
  const tabView = document.getElementById("tabView");
  const tabEdit = document.getElementById("tabEdit");
  const tabPayment = document.getElementById("tabPayment");
  const detailsPanel = document.getElementById("detailsPanel");
  const editPanel = document.getElementById("editPanel");
  const paymentPanel = document.getElementById("paymentPanel");
  const futurePanel = document.getElementById("futurePanel");
  const deleteBtn = document.getElementById("deleteLoanBtn");

  let activePanel = detailsPanel;
  function switchTab(nextPanel, btn) {
    [tabView, tabEdit, tabPayment].forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // slide animation
    activePanel.classList.add("animate-slideOutLeft");
    setTimeout(() => {
      activePanel.classList.add("hidden");
      activePanel.classList.remove("animate-slideOutLeft");
      nextPanel.classList.remove("hidden");
      nextPanel.classList.add("animate-slideInRight");
      setTimeout(() => nextPanel.classList.remove("animate-slideInRight"), 300);
      activePanel = nextPanel;
    }, 250);

    // Delete visibility animation
    if (btn === tabEdit)
      deleteBtn.classList.remove("opacity-0", "translate-y-6");
    else deleteBtn.classList.add("opacity-0", "translate-y-6");
  }

  addTapListener(tabView, () => switchTab(detailsPanel, tabView));
  addTapListener(tabEdit, () => switchTab(editPanel, tabEdit));
  addTapListener(tabPayment, () => switchTab(paymentPanel, tabPayment));
}

/* ───────────── HELPERS ───────────── */
function calcBalance(loan) {
  const pay = Array.isArray(loan.transactions) ? loan.transactions : [];
  const fut = Array.isArray(loan.futurePayments) ? loan.futurePayments : [];
  const paid = pay.reduce((a, b) => a + (b.amount || 0), 0);
  const remaining = (loan.totalAmount || 0) - paid;
  const nextDue = fut.length > 0 ? fut[0].dueDate : null;
  return { paid, remaining, nextDue };
}

function renderTables(loan) {
  const hist = document.getElementById("detailsHistory");
  const fut = document.getElementById("detailsUpcoming");
  const pay = Array.isArray(loan.transactions) ? loan.transactions : [];
  const future = Array.isArray(loan.futurePayments) ? loan.futurePayments : [];
  let run = loan.totalAmount || 0;
  hist.innerHTML =
    "<tr class='text-[#d4af37]'><th>Date</th><th>Amt</th><th>Note</th><th>Remain</th></tr>" +
    (pay.map(p => {
      run -= p.amount;
      const d = p.date?.toDate?.() || new Date(p.date);
      return `<tr><td>${d.toLocaleDateString()}</td><td>$${p.amount.toFixed(2)}</td><td>${p.note || ""}</td><td>$${run.toFixed(2)}</td></tr>`;
    }).join("") || "<tr><td colspan='4' class='text-center text-gray-400 text-xs py-1'>No payments</td></tr>");
  fut.innerHTML =
    "<tr class='text-[#d4af37]'><th>Due</th><th>Amt</th></tr>" +
    (future.map(f => `<tr><td>${new Date(f.dueDate).toLocaleDateString()}</td><td>$${f.amount.toFixed(2)}</td></tr>`).join("") ||
     "<tr><td colspan='2' class='text-center text-gray-400 text-xs py-1'>No future</td></tr>");
}

/* ───────────── ANIMATION CLASSES (inject if missing) ───────────── */
const animStyle = document.createElement("style");
animStyle.textContent = `
@keyframes slideInRight { from {opacity:0;transform:translateX(20px)} to {opacity:1;transform:translateX(0)} }
@keyframes slideOutLeft { from {opacity:1;transform:translateX(0)} to {opacity:0;transform:translateX(-20px)} }
@keyframes slideUp { from {opacity:0;transform:translateY(20px)} to {opacity:1;transform:translateY(0)} }
@keyframes slideDown { from {opacity:1;transform:translateY(0)} to {opacity:0;transform:translateY(20px)} }
.animate-slideInRight{animation:slideInRight .3s ease-out}
.animate-slideOutLeft{animation:slideOutLeft .3s ease-in}
.animate-slideUp{animation:slideUp .3s ease-out}
.animate-slideDown{animation:slideDown .3s ease-in}
`;
document.head.appendChild(animStyle);

/* Loader / Toast utilities */
function showLoader(msg="Loading..."){let l=document.getElementById("loader");if(!l){l=document.createElement("div");l.id="loader";l.className="fixed inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-[9999]";l.innerHTML=`<div class='animate-spin border-4 border-[#d4af37] border-t-transparent rounded-full w-10 h-10 mb-3'></div><p class='text-[#d4af37] text-sm'>${msg}</p>`;document.body.appendChild(l);}else{l.querySelector("p").textContent=msg;l.classList.remove("hidden");}}
function hideLoader(){const l=document.getElementById("loader");if(l)l.classList.add("hidden");}
function showToast(msg){const t=document.createElement("div");t.className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#d4af37]/90 text-black font-semibold px-4 py-2 rounded-md shadow-md z-[9999] animate-slideUp";t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2000);}