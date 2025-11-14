// ============================
// Morrow Industries — Family Tracker (Admin)
// Full Bottom-Sheet Modal Version
// ============================

import {
  auth, db,
  GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut,
  collection, doc, getDoc,setDoc,serverTimestamp, getDocs, onSnapshot, updateDoc, deleteDoc
} from "/assets/js/firebase-init.js";

import { enableLiveStyle } from "/assets/js/family-tracker-livestyle.js";
/*enableLiveStyle();

/* --------------------------------------------
   ELEMENTS
-------------------------------------------- */
const userListEl = document.getElementById("userList");
const loanListEl = document.getElementById("loanList");
const logoutBtn = document.getElementById("logoutBtn");
const selectedUserInfo = document.getElementById("selectedUserInfo");

const loanDetailsModal = document.getElementById("loanDetailsModal");
const loanDetailsCard = document.getElementById("loanDetailsCard");
const closeLoanDetails = document.getElementById("closeLoanDetails");

let selectedUser = null;
let currentLoan = null;

/* --------------------------------------------
   TOUCH-SAFE TAP HANDLER
-------------------------------------------- */
function addTapListener(el, fn) {
  if (!el) return;
  let locked = false;

  const handler = (e) => {
    if (locked) return;
    locked = true;
    fn(e);
    setTimeout(() => (locked = false), 200);
  };

  el.addEventListener("click", handler);
  el.addEventListener("touchend", (e) => {
    e.preventDefault();
    handler(e);
  }, { passive: false });
}

/* --------------------------------------------
   AUTHENTICATION
-------------------------------------------- */
addTapListener(logoutBtn, () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
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

/* --------------------------------------------
   LOAD USERS
-------------------------------------------- */
async function loadUsers() {
  userListEl.innerHTML = "Loading...";

  const snap = await getDocs(collection(db, "users"));
  userListEl.innerHTML = "";

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const row = document.createElement("div");

    row.className = "p-2 rounded hover:bg-[var(--border)] cursor-pointer";

    row.innerHTML = `
      <div class="flex justify-between items-center">
        <span>${data.name || data.email || docSnap.id}</span>
        <select data-uid="${docSnap.id}" class="bg-transparent border border-[var(--border)] rounded px-1 text-xs">
          <option value="">none</option>
          <option value="admin" ${data.role_familyTracker === "admin" ? "selected" : ""}>admin</option>
          <option value="viewer" ${data.role_familyTracker === "viewer" ? "selected" : ""}>viewer</option>
        </select>
      </div>
    `;

    row.querySelector("select").onchange = (e) => updateUserRole(docSnap.id, e.target.value);
    addTapListener(row, () => selectUser(docSnap.id, data));

    userListEl.appendChild(row);
  });
}

async function updateUserRole(uid, role) {
  await updateDoc(doc(db, "users", uid), { role_familyTracker: role || null });
}

/* --------------------------------------------
   SELECT USER & WATCH LOANS
-------------------------------------------- */
function selectUser(uid, data) {
  selectedUser = uid;
  selectedUserInfo.textContent = `Managing loans for: ${data.name || data.email}`;
  watchLoans(uid);
}

function watchLoans(uid) {
  const ref = collection(db, "loans", uid, "userLoans");

  onSnapshot(ref, (snap) => {
    loanListEl.innerHTML = "";

    if (snap.empty) {
      loanListEl.innerHTML =
        `<p class="text-center text-gray-400 italic p-4">No loans yet</p>`;
      return;
    }

    snap.forEach((d) => {
      const loan = d.data();
      loan.id = d.id;
      renderLoanCard(uid, loan);
    });
  });
}

/* --------------------------------------------
   RENDER LOAN CARD
-------------------------------------------- */
function renderLoanCard(uid, loan) {
  const bal = calcBalance(loan);
  const percent = loan.totalAmount ? (bal.paid / loan.totalAmount) * 100 : 0;

  const card = document.createElement("div");
  card.className = "loan-card";

  card.innerHTML = `
  <div class="flex-col justify-between items-center mb-2">
  <h3 class="loan-name">${loan.loanName}</h3>
    <div class="flex justify-between items-center">
    
      <div class="flex items-center gap-3">
        <img src="${loan.loanIcon || "/assets/icons/default-loan.png"}" class="loan-icon" />
        <div>
          
          <p class="loan-remaining text-sm text-gray-400">Remaining: $${bal.remaining.toFixed(2)}</p>
        </div>
      </div>
      <div class="text-right text-sm">
        <p class="text-gray-400">Next:</p>
        <p>${bal.nextDue || "—"}</p>
      </div>
    </div>
    <div class="h-2 bg-[rgba(255,255,255,0.1)] rounded mt-3">
      <div class="h-2 bg-[#d4af37] rounded" style="width:${percent}%"></div>
    </div>
    </div>
  `;

  addTapListener(card, () => openLoanModal(uid, loan));
  loanListEl.appendChild(card);
}

/* --------------------------------------------
   OPEN BOTTOM-SHEET MODAL
-------------------------------------------- */
function openLoanModal(uid, loan) {

  currentLoan = { uid, id: loan.id, data: loan };
  fillLoanDetails(loan);

  loanDetailsModal.classList.remove("hidden");
  loanDetailsModal.classList.add("active");

  // ensure proper animation
  requestAnimationFrame(() => {
    loanDetailsCard.classList.add("active");
    loanDetailsCard.classList.remove("animate-slideDown");
    loanDetailsCard.classList.add("animate-slideUpIn");
  });
  setTimeout(() => {
    initTabs();
  }, 150);
}
function closeLoanModal() {
  loanDetailsCard.classList.remove("animate-slideUpIn");
  loanDetailsCard.classList.add("animate-slideDown");
  setTimeout(() => {
    loanDetailsModal.classList.remove("active");
    loanDetailsModal.classList.add("hidden");
  }, 300);
}

async function loadNotificationUsers() {
  const usersRef = collection(db, "users");
  const snap = await getDocs(usersRef);

  const sel = document.getElementById("notifTarget");
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const opt = document.createElement("option");
    opt.value = docSnap.id;
    opt.textContent = data.displayName || data.name || docSnap.id;
    sel.appendChild(opt);
  });
}
loadNotificationUsers();

/* ===========================
   Send Notification
=========================== */
document.getElementById("sendNotifBtn").onclick = async () => {
  const title = notifTitle.value.trim();
  const msg = notifMsg.value.trim();
  const target = notifTarget.value;

  if (!title || !msg) return showToast("Missing title or message.");

  showLoader("Sending...");

  if (target === "ALL") {
    // broadcast to all
    const usersRef = collection(db, "users");
    const snap = await getDocs(usersRef);

    for (const user of snap.docs) {
      await pushNotification(user.id, title, msg);
    }
  } else {
    await pushNotification(target, title, msg);
  }

  hideLoader();
  showSuccess("Notification Sent!");
  notifTitle.value = "";
  notifMsg.value = "";
};

async function pushNotification(uid, title, message) {
  const notifRef = doc(collection(db, "users", uid, "notifications"));
  await setDoc(notifRef, {
    title,
    message,
    createdAt: serverTimestamp(),
    read: false
  });
}
/* --------------------------------------------
   FILL DETAILS
-------------------------------------------- */
function fillLoanDetails(loan) {
  const bal = calcBalance(loan);

  document.getElementById("detailsName").textContent = loan.loanName;
  document.getElementById("detailsIcon").src = loan.loanIcon || "/assets/icons/default-loan.png";

  document.getElementById("detailsTotal").textContent =
    `$${loan.totalAmount?.toFixed(2)}`;

  document.getElementById("detailsPaid").textContent =
    `$${bal.paid.toFixed(2)}`;

  document.getElementById("detailsRemaining").textContent =
    `$${bal.remaining.toFixed(2)}`;

  document.getElementById("detailsNextDue").textContent =
    bal.nextDue || "—";

  renderTables(loan);
}

/* --------------------------------------------
   RENDER TABLES
-------------------------------------------- */


/* --------------------------------------------
   TAB SYSTEM
-------------------------------------------- */
/* ───────────── ANIMATED TAB SWITCH WITH DEBUGGING ───────────── */
function initTabs() {

  const tabView = document.getElementById("tabView");
  const tabEdit = document.getElementById("tabEdit");
  const tabPayment = document.getElementById("tabPayment");

  const detailsPanel = document.getElementById("detailsPanel");
  const editPanel = document.getElementById("editPanel");
  const paymentPanel = document.getElementById("paymentPanel");

  const deleteBtn = document.getElementById("deleteLoanBtn");
  const closeLoanDetails = document.getElementById("closeLoanDetails");

  

  if (!tabView || !tabEdit || !tabPayment) {
    console.warn("❌ One or more Tab Buttons NOT FOUND!");
    return;
  }

  let activePanel = detailsPanel;

  function switchTab(nextPanel, btn) {

    

    // Switch active state on buttons
    [tabView, tabEdit, tabPayment].forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // Animate old panel out
    activePanel.classList.add("animate-slideOutLeft");

    setTimeout(() => {
      activePanel.classList.add("hidden");
      activePanel.classList.remove("animate-slideOutLeft");

      nextPanel.classList.remove("hidden");
      nextPanel.classList.add("animate-slideInRight");

      setTimeout(() => nextPanel.classList.remove("animate-slideInRight"), 400);

      activePanel = nextPanel;


    }, 250);

    // Delete button visibility animation
    if (btn === tabEdit) {
      deleteBtn.classList.remove("opacity-0", "translate-y-6");
    } else {
      deleteBtn.classList.add("opacity-0", "translate-y-6");
    }
  }

  /* DEBUGGING CLICK HANDLERS */
  addTapListener(tabView, e => {
    switchTab(detailsPanel, tabView);
  });
 closeLoanDetails.addEventListener("click", async () => {
  closeLoanModal();
 });
  addTapListener(tabEdit, e => {
    switchTab(editPanel, tabEdit);
  });

  addTapListener(tabPayment, e => {
    switchTab(paymentPanel, tabPayment);
  });
/* ============================================================
   SAVE EDIT — Update Loan Name / Total Amount / Frequency
============================================================ */
document.getElementById("saveEditBtn").addEventListener("click", async () => {
  if (!currentLoan) return alert("No loan selected");

  const name = document.getElementById("editLoanName").value.trim();
  const totalAmount = parseFloat(document.getElementById("editTotalAmount").value);
  const frequency = document.getElementById("editFrequency").value;

  if (!name) return alert("Loan name required");
  if (isNaN(totalAmount) || totalAmount <= 0) return alert("Invalid total amount");

  showLoader("Saving loan changes...");

  try {
    await updateDoc(
      doc(db, "loans", currentLoan.uid, "userLoans", currentLoan.id),
      {
        loanName: name,
        totalAmount,
        frequency
      }
    );

    hideLoader();
    showToast("Loan updated!");
  } catch (err) {
    hideLoader();
    alert("Error saving loan: " + err.message);
  }
});


/* ============================================================
   ADD PAYMENT — Append to loan.transactions
============================================================ */
document.getElementById("addPaymentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentLoan) return alert("No loan selected");

  const amount = parseFloat(document.getElementById("paymentAmount").value);
  const note = document.getElementById("paymentNote").value.trim();
  const dateRaw = document.getElementById("paymentDate").value;

  const date = dateRaw 
    ? new Date(dateRaw + "T00:00:00") 
    : new Date(); // fallback to today

  if (isNaN(amount) || amount <= 0) return alert("Payment amount required");

  const newPayment = {
    amount,
    note,
    date: date.toISOString()
  };

  const loanRef = doc(db, "loans", currentLoan.uid, "userLoans", currentLoan.id);
  const existing = Array.isArray(currentLoan.data.transactions)
    ? currentLoan.data.transactions
    : [];

  showLoader("Adding payment...");

  try {
    await updateDoc(loanRef, {
      transactions: [...existing, newPayment]
    });

    hideLoader();
    showToast("Payment added!");
    closeModal();

  } catch (err) {
    hideLoader();
    alert("Error adding payment: " + err.message);
  }
});


/* ============================================================
   ADD FUTURE PAYMENT — Append to loan.futurePayments
============================================================ */
document.getElementById("addFutureForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentLoan) return alert("No loan selected");

  const amount = parseFloat(document.getElementById("futureAmount").value);
  const dueDate = document.getElementById("futureDueDate").value;

  if (!dueDate) return alert("Due date required");
  if (isNaN(amount) || amount <= 0) return alert("Amount required");

  const newFuture = {
    amount,
    dueDate
  };

  const loanRef = doc(db, "loans", currentLoan.uid, "userLoans", currentLoan.id);
  const existing = Array.isArray(currentLoan.data.futurePayments)
    ? currentLoan.data.futurePayments
    : [];

  showLoader("Scheduling payment...");

  try {
    await updateDoc(loanRef, {
      futurePayments: [...existing, newFuture]
    });

    hideLoader();
    showToast("Future payment added!");
    closeModal();

  } catch (err) {
    hideLoader();
    alert("Error adding future payment: " + err.message);
  }
});

}


/* --------------------------------------------
   CALCULATE BALANCE
-------------------------------------------- */
function calcBalance(loan) {
  const pay = loan.transactions || [];
  const fut = loan.futurePayments || [];

  const paid = pay.reduce((a, b) => a + b.amount, 0);
  const remaining = (loan.totalAmount || 0) - paid;

  const nextDue = fut.length
    ? fut.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0].dueDate
    : null;

  return {
    paid,
    remaining,
    nextDue: nextDue ? new Date(nextDue).toLocaleDateString() : null
  };
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
