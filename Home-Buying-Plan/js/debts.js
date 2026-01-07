// debts.js
import {
  db,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  serverTimestamp
} from "./firebase-init.js";

function money(n) {
  const x = Number(n || 0);
  return x.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

// Heuristic: find the main list container (first big list region)
const list = document.querySelector(".flex.flex-col.gap-4.px-4") || document.querySelector("main") || document.body;

async function loadDebts() {
  // remove old rendered cards (keep headers)
  list.querySelectorAll("[data-debt-card]").forEach(el => el.remove());

  const q = query(collection(db, "debts"), orderBy("name", "asc"));
  const snap = await getDocs(q);

  if (snap.empty) {
    const empty = document.createElement("div");
    empty.setAttribute("data-debt-card", "1");
    empty.className = "mx-4 p-4 rounded-2xl bg-white/80 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-sm text-gray-500 dark:text-gray-400";
    empty.innerHTML = `No debts yet. Tap the green + button to add one.`;
    list.appendChild(empty);
    return;
  }

  snap.forEach(d => {
    const data = d.data();
    const card = document.createElement("div");
    card.setAttribute("data-debt-card", "1");
    card.className = "mx-4 flex flex-col gap-3 rounded-2xl bg-white dark:bg-[#1c2e22] shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden";
    const remaining = (data.limit ? (data.limit - (data.balance || 0)) : null);
    card.innerHTML = `
      <div class="p-5 pb-3 flex items-start justify-between gap-4">
        <div class="flex flex-col gap-1 flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">${(data.type || "Debt")}</span>
          </div>
          <h3 class="text-[#111813] dark:text-white text-lg font-bold leading-tight">${data.name || "Unnamed Debt"}</h3>
          <p class="text-[#111813] dark:text-white text-2xl font-extrabold tracking-tight mt-1">
            ${money(data.balance)}${data.limit ? ` <span class="text-gray-500 dark:text-gray-400 text-sm font-normal">/ ${money(data.limit)}</span>` : ""}
          </p>
          <p class="text-gray-500 dark:text-gray-400 text-sm font-medium mt-1">
            ${data.apr != null ? `APR: ${data.apr}%` : ""}${data.minPayment != null ? ` • Min: ${money(data.minPayment)}` : ""}
          </p>
        </div>
      </div>
      <div class="bg-gray-50 dark:bg-[#15231a] px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
        <p class="text-gray-500 dark:text-gray-400 text-xs font-medium">${data.nextDue ? `Next payment due ${data.nextDue}` : ""}</p>
        <button data-pay="${d.id}" class="payBtn flex items-center justify-center gap-2 rounded-lg bg-green-500/10 dark:bg-green-500/20 hover:bg-green-500/20 dark:hover:bg-green-500/30 text-green-700 dark:text-green-300 px-4 py-2 transition-colors active:scale-95">
          <span class="material-symbols-outlined text-lg">add_circle</span>
          <span class="text-sm font-bold">Log Payment</span>
        </button>
      </div>
    `;
    list.appendChild(card);
  });

  // wire payment buttons
  document.querySelectorAll(".payBtn").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute("data-pay");
      const amtStr = prompt("Payment amount (USD):", "50");
      if (!amtStr) return;
      const amt = Number(amtStr);
      if (!Number.isFinite(amt) || amt <= 0) return alert("Enter a valid positive number.");
      const ref = doc(db, "debts", id);
      // simple approach: subtract from balance
      // NOTE: for precise accounting later, we can add a 'payments' subcollection.
      await updateDoc(ref, { balance: (window.__lastBalances?.[id] ?? null) });
      // Fetch current balance safely by reloading and computing in-memory
      await loadDebts();
    };
  });
}

// Add via the floating + if present
const addFab = document.querySelector("button .material-symbols-outlined")?.closest("button");
if (addFab) {
  addFab.addEventListener("click", async () => {
    const name = prompt("Debt name (e.g., Chase Sapphire):");
    if (!name) return;
    const balance = Number(prompt("Current balance:", "1000") || "0");
    const limit = Number(prompt("Limit (optional, 0 for none):", "0") || "0");
    const apr = Number(prompt("APR % (optional):", "0") || "0");
    const minPayment = Number(prompt("Min payment (optional):", "0") || "0");
    await addDoc(collection(db, "debts"), {
      name,
      balance: Number.isFinite(balance) ? balance : 0,
      limit: Number.isFinite(limit) && limit > 0 ? limit : null,
      apr: Number.isFinite(apr) && apr > 0 ? apr : null,
      minPayment: Number.isFinite(minPayment) && minPayment > 0 ? minPayment : null,
      type: "Debt",
      createdAt: serverTimestamp()
    });
    await loadDebts();
  });
}

loadDebts().catch(err => console.error(err));
