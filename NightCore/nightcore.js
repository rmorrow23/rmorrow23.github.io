/* ==========================================================
   NIGHTCORE OS — BOOT + LOGIN + INTERFACE LOGIC
   ========================================================== */

/* ---------------------------
   ELEMENT REFERENCES
---------------------------- */
const classifiedScreen = document.getElementById("classifiedScreen");
const bootHUD = document.getElementById("bootHUD");
const osInterface = document.getElementById("osInterface");
const heroSection = document.getElementById("heroSection");
const topbar = document.getElementById("topbar");
const coreButton = document.getElementById("coreButton");
const coreDrawer = document.getElementById("coreDrawer");

/* Boot terminal lines */
const bootLines = [
  "• INITIALIZING KERNEL MODULES...",
  "• LOADING DEVICE CONTROLLERS...",
  "• SYNCING MORROW INDUSTRIES CLOUD...",
  "• ACTIVATING HUD INTERFACE LAYER...",
  "• SYSTEM STATUS: ONLINE"
];

/* ==========================================================
   TYPEWRITER FUNCTION
========================================================== */
function typeWriter(element, text, speed = 45) {
  return new Promise(resolve => {
    let i = 0;
    const interval = setInterval(() => {
      element.textContent += text.charAt(i);
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        resolve();
      }
    }, speed);
  });
}

/* ==========================================================
   CLASSIFIED LOGIN → HUD BOOT → OS LOAD SEQUENCE
========================================================== */
async function startBootSequence() {
  /* Step 1 — Fade In Classified Login */
  classifiedScreen.style.pointerEvents = "auto";
  classifiedScreen.style.opacity = "1";

  await new Promise(r => setTimeout(r, 500));

  const auth1 = document.getElementById("authLine1");
  const auth2 = document.getElementById("authLine2");
  const auth3 = document.getElementById("authLine3");

  await typeWriter(auth1, "Authenticating…", 35);
  await new Promise(r => setTimeout(r, 400));

  auth2.style.opacity = "1";
  await typeWriter(auth2, "Access Level: ADMINISTRATOR", 32);
  await new Promise(r => setTimeout(r, 400));

  auth3.style.opacity = "1";
  await typeWriter(auth3, "Morrow Industries — NightCore OS", 28);

  await new Promise(r => setTimeout(r, 900));

  /* Step 2 — Transition to HUD Boot */
  classifiedScreen.style.opacity = "0";
  classifiedScreen.style.pointerEvents = "none";

  await new Promise(r => setTimeout(r, 600));

  bootHUD.style.pointerEvents = "auto";
  bootHUD.style.opacity = "1";

  /* Step 3 — Boot Terminal Text */
  for (let i = 0; i < bootLines.length; i++) {
    const lineEl = document.getElementById(`boot${i+1}`);
    await typeWriter(lineEl, bootLines[i], 28);
    await new Promise(r => setTimeout(r, 200));
  }

  await new Promise(r => setTimeout(r, 800));

  /* Step 4 — Fade HUD out, OS in */
  bootHUD.style.opacity = "0";
  bootHUD.style.pointerEvents = "none";

  await new Promise(r => setTimeout(r, 900));

  osInterface.style.opacity = "1";
}

/* ==========================================================
   HERO AUTO-HIDE ON SCROLL
========================================================== */
let heroHidden = false;

window.addEventListener("scroll", () => {
  if (window.scrollY > 50 && !heroHidden) {
    heroHidden = true;
    heroSection.classList.add("hero-hidden");
    topbar.classList.remove("hidden");
  }
  
  if (window.scrollY < 20 && heroHidden) {
    heroHidden = false;
    heroSection.classList.remove("hero-hidden");
    topbar.classList.add("hidden");
  }
});

/* ==========================================================
   FLOATING ACTION BUTTON DRAWER
========================================================== */
coreButton.addEventListener("click", () => {
  if (coreDrawer.style.height === "45%") {
    coreDrawer.style.height = "0";
  } else {
    coreDrawer.style.height = "45%";
  }
});

/* ==========================================================
   WIDGET STAGGER ANIMATION
========================================================== */
function staggerWidgets() {
  const widgets = document.querySelectorAll(".widget-animate");
  widgets.forEach((w, i) => {
    w.style.animationDelay = `${i * 0.15}s`;
  });
}

/* ==========================================================
   RUN EVERYTHING
========================================================== */
document.addEventListener("DOMContentLoaded", () => {
  staggerWidgets();
  startBootSequence();
});