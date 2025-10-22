const slides = document.querySelector('.slides');
let currentIndex = 0;

function updateSlides() {
  slides.style.transition = 'none'; // Disable transition
  slides.style.transform = `translateX(-${currentIndex * 100}%)`;
}

// Auto-advance every 1 seconds
setInterval(() => {
  currentIndex = (currentIndex + 1) % slides.children.length;
  updateSlides();
}, 1000);

// Accordion Functionality
document.addEventListener("DOMContentLoaded", function () {
  const triggers = document.querySelectorAll(".accordion-trigger");

  function closeAll(except = null) {
    triggers.forEach(btn => {
      if (btn === except) return;
      btn.setAttribute("aria-expanded", "false");
      const panel = document.getElementById(btn.getAttribute("aria-controls"));
      if (panel) {
        panel.style.maxHeight = null;
        panel.classList.remove("is-open");
      }
    });
  }

  triggers.forEach(btn => {
    const panel = document.getElementById(btn.getAttribute("aria-controls"));
    // ensure panels are hidden initially
    if (panel) {
      panel.style.maxHeight = null;
      panel.setAttribute("aria-hidden", "true");
    }

    btn.addEventListener("click", () => {
      const isOpen = btn.getAttribute("aria-expanded") === "true";
      if (isOpen) {
        btn.setAttribute("aria-expanded", "false");
        if (panel) {
          panel.style.maxHeight = null;
          panel.setAttribute("aria-hidden", "true");
          panel.classList.remove("is-open");
        }
      } else {
        // single-open behaviour: close others
        closeAll(btn);
        btn.setAttribute("aria-expanded", "true");
        if (panel) {
          panel.classList.add("is-open");
          panel.setAttribute("aria-hidden", "false");
          // set maxHeight to enable transition
          panel.style.maxHeight = panel.scrollHeight + "px";
        }
      }
    });

    // keyboard accessibility: toggle with Enter/Space
    btn.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        btn.click();
      }
    });
  });
});