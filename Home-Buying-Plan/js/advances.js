// advances.js
import {
  db,
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  serverTimestamp
} from "./firebase-init.js";

function money(n) {
  const x = Number(n || 0);
  return x.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

const listSection =
  document.querySelector("section.flex.flex-col.gap-4.pt-4") ||
  document.querySelector("main") ||
  document.body;

async function loadAdvances() {
  listSection.querySelectorAll("[data-advance-card]").forEach(el => el.remove());

  const q = query(collection(db, "cashAdvances"), orderBy("dueDate", "asc"));
  const snap = await getDocs(q);

  if (snap.empty) {
    const empty = document.createElement("div");
    empty.setAttribute("data-advance-card", "1");
    empty.className = "mx-4 p-4 rounded-2xl bg-white/80 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-sm text-gray-500 dark:text-gray-400";
    empty.textContent = "No advances yet. Tap New to add one.";
    listSection.appendChild(empty);
    return;
  }

  snap.forEach(docSnap => {
    const d = docSnap.data();
    const progress = d.total ? Math.round(((d.paid || 0) / d.total) * 100) : 0;

    const card = document.createElement("div");
    card.setAttribute("data-advance-card", "1");
    card.className = "group mx-4 flex flex-col rounded-2xl bg-white dark:bg-[#152a1d] border border-gray-100 dark:border-[#2a4530] p-4 shadow-sm";
    card.innerHTML = `
      <div class="flex items-start justify-between mb-4">
        <div>
          <p class="text-base font-bold text-[#111813] dark:text-white">${d.provider || "Advance"}</p>
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400">Borrowed ${d.borrowedDate || ""}</p>
        </div>
        <div class="text-right">
          <p class="text-lg font-bold text-[#111813] dark:text-white">${money(d.amount)}</p>
          <p class="text-xs font-bold ${d.status === "paidoff" ? "text-green-500" : "text-red-500"}">Due ${d.dueDate || ""}</p>
        </div>
      </div>
      <div class="space-y-2">
        <div class="flex justify-between text-xs font-medium">
          <span class="text-gray-500 dark:text-gray-400">Repayment Progress</span>
          <span class="text-[#111813] dark:text-white">${money(d.paid || 0)} of ${money(d.total || d.amount || 0)} paid</span>
        </div>
        <div class="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
          <div class="h-full rounded-full bg-green-400" style="width:${progress}%;"></div>
        </div>
      </div>
    `;
    listSection.appendChild(card);
  });
}

const newBtn = document.querySelector("header button") || document.querySelector("button");
if (newBtn) {
  newBtn.addEventListener("click", async () => {
    // Try to detect if this is the "New" button in the header; if not, no-op
    const label = (newBtn.textContent || "").toLowerCase();
    if (!label.includes("new") && !label.includes("add")) return;

    const provider = prompt("Provider (e.g., Dave, EarnIn):");
    if (!provider) return;
    const amount = Number(prompt("Amount borrowed:", "100") || "0");
    const borrowedDate = prompt("Borrowed date (e.g., 2024-10-10):", "");
    const dueDate = prompt("Due date (e.g., 2024-10-24):", "");
    const total = Number(prompt("Total to repay (default = amount):", String(amount || 0)) || String(amount || 0));

    await addDoc(collection(db, "cashAdvances"), {
      provider,
      amount: Number.isFinite(amount) ? amount : 0,
      borrowedDate: borrowedDate || "",
      dueDate: dueDate || "",
      paid: 0,
      total: Number.isFinite(total) ? total : (Number.isFinite(amount) ? amount : 0),
      status: "active",
      createdAt: serverTimestamp()
    });

    await loadAdvances();
  });
}

loadAdvances().catch(err => console.error(err));
