// navigation.js
// Handles bottom-nav link routing + active state across pages.
const page = document.body?.dataset?.page || "";

document.querySelectorAll("[data-nav]").forEach(a => {
  const key = a.getAttribute("data-nav");
  a.classList.remove("text-primary");
  if (key === page) {
    a.classList.add("text-primary");
    a.classList.remove("text-gray-400", "dark:text-gray-500");
  }
});

// Optional: preserve dark mode toggle if the page uses the 'dark' class on <html>
// (No opinionated behavior here; just a hook point if you want later.)
