/* =========================================================
   THEME TOGGLE
   Uses the same localStorage key as the dashboard so the
   choice carries over between the landing page and the app.
========================================================= */
const themeToggle = document.getElementById("themeToggle");

function applyTheme(theme) {
    const icon = themeToggle.querySelector("i");
    if (theme === "dark") {
        document.body.classList.add("dark");
        icon.classList.remove("fa-moon");
        icon.classList.add("fa-sun");
    } else {
        document.body.classList.remove("dark");
        icon.classList.remove("fa-sun");
        icon.classList.add("fa-moon");
    }
}

const savedTheme = localStorage.getItem("storemex-theme") || "light";
applyTheme(savedTheme);

themeToggle.addEventListener("click", function () {
    const isDark = document.body.classList.contains("dark");
    const nextTheme = isDark ? "light" : "dark";
    localStorage.setItem("storemex-theme", nextTheme);
    applyTheme(nextTheme);
});

/* =========================================================
   MOBILE NAV
========================================================= */
const navBurger = document.getElementById("navBurger");
const navLinks = document.getElementById("navLinks");

navBurger.addEventListener("click", function () {
    const isOpen = navLinks.classList.toggle("open");
    navBurger.querySelector("i").className = isOpen ? "fa-solid fa-xmark" : "fa-solid fa-bars";
});

navLinks.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", function () {
        navLinks.classList.remove("open");
        navBurger.querySelector("i").className = "fa-solid fa-bars";
    });
});

/* =========================================================
   SCROLL REVEALS
========================================================= */
const revealEls = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    revealEls.forEach(el => observer.observe(el));
} else {
    // Fallback: no IntersectionObserver support, just show everything
    revealEls.forEach(el => el.classList.add("visible"));
}

/* =========================================================
   CONTACT FORM
   No backend endpoint exists yet for this - this just gives
   the user visible confirmation. Wire this up to a real
   endpoint (e.g. POST /contact) when one exists.
========================================================= */
const contactForm = document.getElementById("contactForm");
const formNote = document.getElementById("formNote");

contactForm.addEventListener("submit", function (e) {
    e.preventDefault();
    formNote.textContent = "Thanks! We'll get back to you soon.";
    contactForm.reset();
    setTimeout(() => { formNote.textContent = ""; }, 5000);
});

/* =========================================================
   FOOTER YEAR
========================================================= */
document.getElementById("year").textContent = new Date().getFullYear();
