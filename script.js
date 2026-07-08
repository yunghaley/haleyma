// Combined Toggle UI Elements and Accordion Functionality
document.addEventListener('click', function(event) {
  const toggleElement = event.target.closest('[data-target]');
  const accordionItem = event.target.closest('.accordion-item');
  const sectionElement = event.target.closest('[data-section]');
  
  // If clicking a nav toggle button (NOW/PROJECTS/INFO)
  if (toggleElement) {
    const sectionType = toggleElement.getAttribute('data-target');
    const targetElement = document.querySelector(`[data-section="${sectionType}"]`);

    if (targetElement) {
      const isDesktop = window.matchMedia('(min-width: 768px)').matches;
      const isHidden = getComputedStyle(targetElement).display === 'none';

      // Mobile: exclusive — hide all sections first. Desktop: sections toggle independently.
      if (!isDesktop) {
        document.querySelectorAll('[data-section]').forEach(section => {
          section.style.display = 'none';
        });
      }

      targetElement.style.display = isHidden ? 'block' : 'none';
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
    // Hide all sections (mobile only — desktop keeps the left column)
    if (!window.matchMedia('(min-width: 768px)').matches) {
      document.querySelectorAll('[data-section]').forEach(section => {
        section.style.display = 'none';
      });
    }
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
    // Hide all dropdown sections (mobile only)
    if (!window.matchMedia('(min-width: 768px)').matches) {
      document.querySelectorAll('[data-section]').forEach(section => {
        section.style.display = 'none';
      });
    }
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

    // Reset content column scroll position
    const scrollCol = assetGroup.closest('.scroll-col');
    if (scrollCol) {
      scrollCol.scrollTop = 0;
    }

    // Replay number pop-in on stat digits (transitions.dev)
    assetGroup.querySelectorAll('.t-digit-group').forEach(group => {
      group.classList.remove('is-animating');
      void group.offsetHeight; // force reflow
      group.classList.add('is-animating');
    });

    // Play all videos muted — user opts into sound via the mute control
    assetGroup.querySelectorAll('video').forEach(video => {
      video.muted = true;
      video.play().catch(e => {
        console.log('Autoplay failed:', e);
      });
    });
  }
}

function hideAllProjectAssets() {
  document.querySelectorAll('.project-panel').forEach(group => {
    group.classList.add('hidden');
    
    // Pause and mute any videos/audio in hidden panels
    group.querySelectorAll('video, audio').forEach(media => {
      media.muted = true;
      media.pause();
    });
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
  document.querySelectorAll('.project-panel.hidden video, .project-panel.hidden audio').forEach(media => {
    media.muted = true;
    media.pause();
  });
});

let slideIndex = 0;
const slides = document.querySelectorAll('.slide');

function showSlide(index) {
  slides.forEach((slide) => {
    slide.classList.remove('active');
  });
  slides[index].classList.add('active');
}

function nextSlide() {
  slideIndex = (slideIndex + 1) % slides.length;
  showSlide(slideIndex);
}

showSlide(0);
setInterval(nextSlide, 3000);

// Braille spinner (vanilla port of beUI ascii-braille loader)
const spinnerEl = document.getElementById('braille-spinner');
if (spinnerEl) {
  const frames = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const interval = 125 * (reducedMotion ? 2.5 : 1);
  let frame = 0;
  setInterval(() => {
    frame = (frame + 1) % frames.length;
    spinnerEl.textContent = frames[frame];
  }, interval);
}

// Scroll reveal on case-study blocks (vanilla port of beUI ScrollReveal, once per block)
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.case-study > *').forEach(block => {
  block.classList.add('reveal');
  revealObserver.observe(block);
});

// Custom video controls: centred play/pause + corner mute (replaces native controls)
const VIDEO_ICONS = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8.2 5.6v12.8c0 .9 1 1.4 1.7 1l10.1-6.4c.7-.4.7-1.5 0-1.9L9.9 4.6c-.7-.4-1.7.1-1.7 1z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4.5" width="4.4" height="15" rx="1.5"/><rect x="13.6" y="4.5" width="4.4" height="15" rx="1.5"/></svg>',
  sound: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 9.2v5.6c0 .6.4 1 1 1h2.6l4.6 4c.6.6 1.6.1 1.6-.7V4.9c0-.8-1-1.3-1.6-.7l-4.6 4H5c-.6 0-1 .4-1 1z"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 9.2v5.6c0 .6.4 1 1 1h2.6l4.6 4c.6.6 1.6.1 1.6-.7V4.9c0-.8-1-1.3-1.6-.7l-4.6 4H5c-.6 0-1 .4-1 1z"/><path d="M4.5 4.5l15 15" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>',
};

document.querySelectorAll('video').forEach(video => {
  if (video.id === 'dither-src') return;

  const shell = document.createElement('div');
  shell.className = 'video-shell';
  video.parentNode.insertBefore(shell, video);
  shell.appendChild(video);

  const playBtn = document.createElement('button');
  playBtn.className = 'video-play';
  playBtn.setAttribute('aria-label', 'Play or pause video');

  const muteBtn = document.createElement('button');
  muteBtn.className = 'video-mute';

  shell.append(playBtn, muteBtn);

  const sync = () => {
    playBtn.innerHTML = video.paused ? VIDEO_ICONS.play : VIDEO_ICONS.pause;
    shell.classList.toggle('is-playing', !video.paused);
    muteBtn.innerHTML = video.muted ? VIDEO_ICONS.soundOff : VIDEO_ICONS.sound;
    muteBtn.setAttribute('aria-label', video.muted ? 'Unmute video' : 'Mute video');
  };

  playBtn.addEventListener('click', () => {
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });
  muteBtn.addEventListener('click', () => {
    video.muted = !video.muted;
    sync();
  });
  video.addEventListener('play', sync);
  video.addEventListener('pause', sync);
  video.addEventListener('volumechange', sync);
  sync();
});