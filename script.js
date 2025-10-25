// W3Schools Slideshow
let slideIndex = 0;
showSlides();

function showSlides() {
  let i;
  let slides = document.getElementsByClassName("slide");
  for (i = 0; i < slides.length; i++) {
    slides[i].style.display = "none";
  }
  slideIndex++;
  if (slideIndex > slides.length) {slideIndex = 1}
  slides[slideIndex-1].style.display = "block";
  setTimeout(showSlides, 1000); // Change image every 1 second
}

// Accordion Functionality with Project Assets
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

  // Function to show project assets
  function showProjectAssets(projectId) {
    // Hide all project asset groups
    document.querySelectorAll('.project-panel').forEach(group => {
      group.classList.add('hidden');
    });
    
    // Show the selected project's assets
    const assetGroup = document.getElementById(`project-${projectId}`);
    if (assetGroup) {
      assetGroup.classList.remove('hidden');
    }
  }

  // Function to hide all project assets
  function hideAllProjectAssets() {
    document.querySelectorAll('.project-panel').forEach(group => {
      group.classList.add('hidden');
    });
  }

  triggers.forEach(btn => {
    const panel = document.getElementById(btn.getAttribute("aria-controls"));
    const projectID = btn.getAttribute("data-project");

    // ensure panels are hidden initially
    if (panel) {
      panel.style.maxHeight = null;
      panel.setAttribute("aria-hidden", "true");
    }

    btn.addEventListener("click", () => {
      const isOpen = btn.getAttribute("aria-expanded") === "true";

      if (isOpen) {
        // closing the accordion
        btn.setAttribute("aria-expanded", "false");
        if (panel) {
          panel.style.maxHeight = null;
          panel.setAttribute("aria-hidden", "true");
          panel.classList.remove("is-open");
        }
        // hide project assets
        hideAllProjectAssets();
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
        // show project assets
        showProjectAssets(projectID);
      }
    });
  });
});

// keyboard accessibility: toggle with Enter/Space
btn.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    btn.click();
  }
});
