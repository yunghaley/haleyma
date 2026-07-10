// nav.js – handles navigation toggle buttons (NOW, PROJECTS, INFO) and logo click
export function initNav() {
  document.addEventListener('click', function(event) {
    const toggleElement = event.target.closest('[data-target]');
    const sectionElement = event.target.closest('[data-section]');
    if (toggleElement) {
      const sectionType = toggleElement.getAttribute('data-target');
      const targetElement = document.querySelector(`[data-section="${sectionType}"]`);
      if (targetElement) {
        const isDesktop = window.matchMedia('(min-width: 768px)').matches;
        const isHidden = getComputedStyle(targetElement).display === 'none';
        if (!isDesktop) {
          document.querySelectorAll('[data-section]').forEach(section => {
            section.style.display = 'none';
          });
        }
        targetElement.style.display = isHidden ? 'block' : 'none';
      }
    } else if (event.target.closest('[data-project="default"]')) {
      // Logo click – reset to default project
      hideAllProjectAssets();
      const defaultGroup = document.getElementById('project-default');
      if (defaultGroup) {
        defaultGroup.classList.remove('hidden');
        const video = defaultGroup.querySelector('video');
        if (video) {
          video.muted = true;
          video.play().catch(e => console.log('Default video play failed:', e));
        }
      }
      closeAllAccordions();
      if (!window.matchMedia('(min-width: 768px)').matches) {
        document.querySelectorAll('[data-section]').forEach(section => {
          section.style.display = 'none';
        });
      }
    }
  });
}

// Note: hideAllProjectAssets and closeAllAccordions are defined elsewhere.
