// Toggle UI Elements
// Single-open behavior - only one section visible at a time
document.addEventListener('click', function(event) {
  const toggleElement = event.target.closest('[data-target]');
  
  if (toggleElement) {
    const sectionType = toggleElement.getAttribute('data-target');
    const targetElement = document.querySelector(`[data-section="${sectionType}"]`);
    
    if (targetElement) {
      const isOpening = targetElement.classList.contains('hidden');
      
      // Always hide both sections first
      document.querySelectorAll('[data-section]').forEach(section => {
        section.classList.add('hidden');
      });
      
      // Then show the target only if we're opening it
      if (isOpening) {
        targetElement.classList.remove('hidden');
      }
    }
  }
});

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

    // Show default asset group
    const defaultGroup = document.getElementById('project-default');
    if (defaultGroup) {
      defaultGroup.classList.remove('hidden');
    }
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
