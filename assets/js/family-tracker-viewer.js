import {
  auth, db,
  GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut,
  collection, doc, getDoc, onSnapshot
} from "/assets/js/firebase-init.js";

import { enableLiveStyle } from "/assets/js/family-tracker-livestyle.js";
enableLiveStyle();

/* ───────── GLOBALS ───────── */
let userRole = null;
let currentLoan = null;

/* ───────── UI References ───────── */
const logoutBtn       = document.getElementById("logoutBtn");
const loanContainer   = document.getElementById("loanContainer");
const loadingEl       = document.getElementById("loading");
const totalBalanceEl  = document.getElementById("totalBalance");
const nextDueDateEl   = document.getElementById("nextDueDate");
const nextAmountDueEl = document.getElementById("nextAmountDue");
const activeLoansEl   = document.getElementById("activeLoans");
const loanDetailsModal = document.getElementById("loanDetailsModal");
const loanDetailsCard  = document.getElementById("loanDetailsCard");
const closeLoanDetails = document.getElementById("closeLoanDetails");

/* ───────── Auth Flow ───────── */
logoutBtn.onclick = () => signOut(auth);

onAuthStateChanged(auth, async user => {
  if (!user) {
    await signInWithPopup(auth, new GoogleAuthProvider());
    return;
  }

  const userDocRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userDocRef);

  if (!userDoc.exists()) {
    window.location = "unauthorized.html";
    return;
  }

  userRole = userDoc.data().role_familyTracker || "";
  if (userRole !== "viewer" && userRole !== "admin") {
    window.location = "unauthorized.html";
    return;
  }

  watchLoans(user.uid);
});

/* ───────── Watch User Loans ───────── */
function watchLoans(uid) {
  const ref = collection(db, "loans", uid, "userLoans");
  onSnapshot(ref, snap => {
    loanContainer.innerHTML = "";
    if (snap.empty) {
      loanContainer.innerHTML = `
        <div class="glass p-6 text-center">
          <h2 class="text-lg font-semibold text-[#d4af37] mb-2">No Loans Found</h2>
          <p class="text-sm text-gray-300">It looks like you don't have any active loans yet.</p>
        </div>`;
      updateSummary(0, [], 0);
      return;
    }

    let total = 0, future = [];
    snap.forEach(docSnap => {
      const loan = docSnap.data(); loan.id = docSnap.id;
      total += calcBalance(loan).remaining;
      if (loan.futurePayments) future.push(...loan.futurePayments);
      renderLoanCard(loan);
    });
    updateSummary(total, future, snap.size);
  });
}

/* ───────── Summary Update ───────── */
function updateSummary(total, futures, count) {
  totalBalanceEl.textContent = `$${total.toFixed(2)}`;
  activeLoansEl.textContent = count;

  if (futures.length) {
    futures.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    const n = futures[0];
    nextDueDateEl.textContent = new Date(n.dueDate).toLocaleDateString();
    nextAmountDueEl.textContent = `$${n.amount.toFixed(2)}`;
  } else {
    nextDueDateEl.textContent = "—";
    nextAmountDueEl.textContent = "$0.00";
  }
}

/* ───────── Render Cards ───────── */
function renderLoanCard(loan) {
  const bal = calcBalance(loan);
  const percent = (loan.totalAmount ? (bal.paid / loan.totalAmount) * 100 : 0);
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

  card.onclick = () => openLoanModal(loan);
  loanContainer.appendChild(card);
}

/* ───────── Loan Details Modal ───────── */
function openLoanModal(loan) {
  currentLoan = loan;
  fillLoanDetails(loan);
  loanDetailsModal.classList.remove("hidden");
  setTimeout(() => loanDetailsCard.classList.remove("translate-y-full"), 10);
}
closeLoanDetails.onclick = () => closeModal();
function closeModal() {
  loanDetailsCard.classList.add("translate-y-full");
  setTimeout(() => loanDetailsModal.classList.add("hidden"), 250);
}

/* ───────── Fill Modal ───────── */
function fillLoanDetails(loan) {
  document.getElementById("detailsIcon").src = loan.loanIcon || "/assets/icons/default-loan.png";
  document.getElementById("detailsName").textContent = loan.loanName;
  const bal = calcBalance(loan);
  document.getElementById("detailsTotal").textContent = `$${loan.totalAmount?.toFixed(2) || 0}`;
  document.getElementById("detailsPaid").textContent = `$${bal.paid.toFixed(2)}`;
  document.getElementById("detailsRemaining").textContent = `$${bal.remaining.toFixed(2)}`;
  document.getElementById("detailsNextDue").textContent = bal.nextDue || "—";
  renderTables(loan);
}

/* ───────── Tables ───────── */
function renderTables(loan) {
  const hist = document.getElementById("detailsHistory");
  const fut = document.getElementById("detailsUpcoming");
  const pay = loan.transactions || [];
  const futs = loan.futurePayments || [];
  let run = loan.totalAmount || 0;

  hist.innerHTML = "<tr class='text-[#d4af37]'><th>Date</th><th>Amt</th><th>Note</th><th>Remain</th></tr>" +
    (pay.map(p => {
      run -= p.amount;
      const d = p.date?.toDate?.() || new Date(p.date);
      return `<tr><td>${d.toLocaleDateString()}</td><td>$${p.amount.toFixed(2)}</td><td>${p.note || ""}</td><td>$${run.toFixed(2)}</td></tr>`;
    }).join("") || "<tr><td colspan='4' class='text-center py-1 text-xs'>No payments</td></tr>");

  fut.innerHTML = "<tr class='text-[#d4af37]'><th>Due</th><th>Amt</th></tr>" +
    (futs.map(f => `<tr><td>${new Date(f.dueDate).toLocaleDateString()}</td><td>$${f.amount.toFixed(2)}</td></tr>`).join("") ||
      "<tr><td colspan='2' class='text-center py-1 text-xs'>No future</td></tr>");
}

/* ───────── Helpers ───────── */
function calcBalance(loan) {
  const pay = loan.transactions || [], fut = loan.futurePayments || [];
  const paid = pay.reduce((a, b) => a + b.amount, 0);
  const remaining = (loan.totalAmount || 0) - paid;
  const nextDue = fut.length ? fut.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0].dueDate : null;
  return { paid, remaining, nextDue: nextDue ? new Date(nextDue).toLocaleDateString() : "—" };
}