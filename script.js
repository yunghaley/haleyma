// Combined Toggle UI Elements and Accordion Functionality
document.addEventListener('click', function(event) {
  const toggleElement = event.target.closest('[data-target]');
  const accordionItem = event.target.closest('.accordion-item');
  const sectionElement = event.target.closest('[data-section]');
  
  // If clicking a nav toggle button (PROJECTS/INFO)
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

  // If clicking the logo (data-project="default")
  else if (event.target.closest('[data-project="default"]')) {
    hideAllProjectAssets();
    // Ensure default project is visible
    const defaultGroup = document.getElementById('project-default');
    if (defaultGroup) {
      defaultGroup.classList.remove('hidden');
      // Play the default video
      const video = defaultGroup.querySelector('video');
      if (video) {
        video.muted = true;
        video.play().catch(e => console.log('Default video play failed:', e));
      }
    }
    // Close all accordions
    closeAllAccordions();
    // Hide all sections (INFO/PROJECTS)
    document.querySelectorAll('[data-section]').forEach(section => {
      section.classList.add('hidden');
    });
  }

  // If clicking an accordion item
  else if (accordionItem) {
    const panel = document.getElementById(accordionItem.getAttribute('aria-controls'));
    const projectID = accordionItem.getAttribute('data-project');
    const triggerButton = accordionItem.querySelector('.accordion-trigger');
    const isOpen = accordionItem.getAttribute('aria-expanded') === 'true';
    const isTriggerOpen = triggerButton.getAttribute('aria-expanded') === 'true';

    if (isTriggerOpen) {
      triggerButton.setAttribute('aria-expanded', 'false');
    } else {
      triggerButton.setAttribute('aria-expanded', 'true');
    }

    if (isOpen) {
      // Closing the accordion
      accordionItem.setAttribute('aria-expanded', 'false');
      if (panel) {
        panel.style.maxHeight = null;
        panel.setAttribute('aria-hidden', 'true');
        panel.classList.remove('is-open');
      }
      // Hide project assets and show default
      hideAllProjectAssets();
    } else {
      // Opening the accordion - close others first
      closeAllAccordions(accordionItem);
      accordionItem.setAttribute('aria-expanded', 'true');
      
      if (panel) {
        panel.classList.add('is-open');
        panel.setAttribute('aria-hidden', 'false');
        panel.style.maxHeight = panel.scrollHeight + 'px';
      }
      // Show project assets
      showProjectAssets(projectID);
    }
  }
  // If clicking anywhere else (outside dropdowns and accordion items)
  else if (!sectionElement) {
    // Hide all dropdown sections
    document.querySelectorAll('[data-section]').forEach(section => {
      section.classList.add('hidden');
    });
  }
});

// Helper functions
function closeAllAccordions(except = null) {
  document.querySelectorAll('.accordion-item').forEach(item => {
    if (item === except) return;
    item.setAttribute('aria-expanded', 'false');
    const panel = document.getElementById(item.getAttribute('aria-controls'));
    if (panel) {
      panel.style.maxHeight = null;
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
    }
  });
}

function showProjectAssets(projectId) {
  // First hide all project panels and pause their videos
  hideAllProjectAssets();
  // Hide default project
  const defaultGroup = document.getElementById('project-default');
  if (defaultGroup) {
    defaultGroup.classList.add('hidden');
  }
  
  // Show the target project panel
  const assetGroup = document.getElementById(`project-${projectId}`);
  if (assetGroup) {
    assetGroup.classList.remove('hidden');
    
    // Find and play any video in this project panel
    const video = assetGroup.querySelector('video');
    if (video) {
      // Unmute and attempt to play
      video.muted = false;
      video.play().catch(error => {
        console.log('Autoplay failed, falling back to muted:', error);
        // If unmuted autoplay fails, try muted autoplay
        video.muted = true;
        video.play().catch(e => {
          console.log('Muted autoplay also failed:', e);
        });
      });
    }
  }
}

function hideAllProjectAssets() {
  document.querySelectorAll('.project-panel').forEach(group => {
    group.classList.add('hidden');
    
    // Pause and mute any videos in hidden panels
    const video = group.querySelector('video');
    if (video) {
      video.muted = true;
      video.pause();
      // Optional: reset to beginning
      // video.currentTime = 0;
    }
  });

  const defaultGroup = document.getElementById('project-default');
  if (defaultGroup) {
    defaultGroup.classList.remove('hidden');
  }
}

// Initialize panels on load
document.addEventListener("DOMContentLoaded", function () {
  // Ensure all accordion panels start hidden
  document.querySelectorAll('.accordion-item').forEach(item => {
    const panel = document.getElementById(item.getAttribute('aria-controls'));
    if (panel) {
      panel.style.maxHeight = null;
      panel.setAttribute('aria-hidden', 'true');
    }
  });
  
  // Ensure all videos in hidden project panels are muted and paused
  document.querySelectorAll('.project-panel.hidden video').forEach(video => {
    video.muted = true;
    video.pause();
  });
});