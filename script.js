// script.js – refactored into self‑contained functional modules

// --- Navigation (NOW / PROJECTS / INFO) and logo handling ---
function initNav() {
  document.addEventListener('click', function(event) {
    const toggleElement = event.target.closest('[data-target]');
    const logoElement = event.target.closest('[data-project="default"]');
    if (toggleElement) {
      const sectionType = toggleElement.getAttribute('data-target');
      const target = document.querySelector(`[data-section="${sectionType}"]`);
      if (target) {
        const isHidden = getComputedStyle(target).display === 'none';
        // Overlays are mutually exclusive: opening one dismisses the other.
        document.querySelectorAll('[data-section]').forEach(sec => sec.style.display = 'none');
        target.style.display = isHidden ? 'block' : 'none';
      }
    } else if (logoElement) {
      // Reset to default project
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
      // Logo resets home: dismiss all overlays.
      document.querySelectorAll('[data-section]').forEach(sec => sec.style.display = 'none');
    }
  });
}

// --- Accordion handling ---
// Hover-capable devices: hovering an item expands it and previews the project
// content behind the overlay; clicking commits (closes the overlay).
// Touch devices: tap expands, previews, and closes the overlay in one go.
function expandAccordionItem(accordionItem) {
  closeAllAccordions(accordionItem);
  accordionItem.setAttribute('aria-expanded', 'true');
  const trigger = accordionItem.querySelector('.accordion-trigger');
  if (trigger) trigger.setAttribute('aria-expanded', 'true');
  const panel = document.getElementById(accordionItem.getAttribute('aria-controls'));
  if (panel) {
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    panel.style.maxHeight = panel.scrollHeight + 'px';
  }
  showProjectAssets(accordionItem.getAttribute('data-project'));
}

function closeProjectsOverlay() {
  const projectsSection = document.querySelector('[data-section="projects"]');
  if (projectsSection) projectsSection.style.display = 'none';
}

function initAccordion() {
  const canHover = window.matchMedia('(hover: hover)').matches;
  document.addEventListener('click', function(event) {
    const accordionItem = event.target.closest('.accordion-item');
    if (accordionItem) {
      const isOpen = accordionItem.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        // Desktop: click after hover-expand. Touch: second tap. Either way — commit.
        closeProjectsOverlay();
      } else {
        expandAccordionItem(accordionItem);
        // Desktop click commits immediately; touch first tap keeps the overlay
        // open (two-tap: expand + preview first, commit on the second tap).
        if (canHover) closeProjectsOverlay();
      }
      return;
    }
    // Click/tap outside the open PROJECTS overlay dismisses it and reveals the
    // current preview/selection — except in the nav, whose buttons self-manage.
    const projectsSection = document.querySelector('[data-section="projects"]');
    if (!projectsSection || getComputedStyle(projectsSection).display === 'none') return;
    if (event.target.closest('[data-section="projects"]') || event.target.closest('nav')) return;
    closeProjectsOverlay();
  });
  if (canHover) {
    document.addEventListener('mouseover', function(event) {
      const accordionItem = event.target.closest('.accordion-item');
      if (!accordionItem || accordionItem.getAttribute('aria-expanded') === 'true') return;
      expandAccordionItem(accordionItem);
    });
  }
}

// --- Video controls (play / pause, mute) ---
function initVideoControls() {
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
      if (video.paused) video.play().catch(() => {});
      else video.pause();
    });
    muteBtn.addEventListener('click', () => {
      video.muted = !video.muted;
      sync();
    });
    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);
    video.addEventListener('volumechange', sync);

    // Touch devices: auto‑hide controls after 2 s, reveal on tap
    if (window.matchMedia('(hover: none)').matches) {
      let hideTimer = null;
      const showControls = () => {
        shell.classList.add('controls-visible');
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => shell.classList.remove('controls-visible'), 2000);
      };
      shell.addEventListener('click', showControls);
      video.addEventListener('play', showControls);
    }
    sync();
  });
}

// --- Case‑study reveal (scroll‑reveal) ---
function initCaseStudyReveal() {
  const revealObserver = new IntersectionObserver(entries => {
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
}

// --- Helper utilities (moved from original script) ---
function hideAllProjectAssets() {
  document.querySelectorAll('.project-panel').forEach(group => {
    group.classList.add('hidden');
    group.querySelectorAll('video, audio').forEach(media => {
      media.muted = true;
      media.pause();
    });
  });
  const defaultGroup = document.getElementById('project-default');
  if (defaultGroup) defaultGroup.classList.remove('hidden');
}

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
  hideAllProjectAssets();
  const defaultGroup = document.getElementById('project-default');
  if (defaultGroup) defaultGroup.classList.add('hidden');
  const assetGroup = document.getElementById(`project-${projectId}`);
  if (assetGroup) {
    assetGroup.classList.remove('hidden');
    const scrollCol = assetGroup.closest('.scroll-col');
    if (scrollCol) scrollCol.scrollTop = 0;
    assetGroup.querySelectorAll('.t-digit-group').forEach(g => {
      g.classList.remove('is-animating');
      void g.offsetHeight;
      g.classList.add('is-animating');
    });
    assetGroup.querySelectorAll('video').forEach(v => {
      v.muted = true;
      v.play().catch(e => console.log('Autoplay failed:', e));
    });
  }
}

// --- Slideshow (unchanged) ---
let slideIndex = 0;
const slides = document.querySelectorAll('.slide');
function showSlide(i) { slides.forEach(s => s.classList.remove('active')); slides[i].classList.add('active'); }
function nextSlide() { slideIndex = (slideIndex + 1) % slides.length; showSlide(slideIndex); }
showSlide(0);
setInterval(nextSlide, 3000);

// --- Braille spinner (unchanged) ---
const spinnerEl = document.getElementById('braille-spinner');
if (spinnerEl) {
  const frames = ['⣾','⣽','⣻','⢿','⡿','⣟','⣯','⣷'];
  const interval = 125 * (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 2.5 : 1);
  let frame = 0;
  setInterval(() => { frame = (frame + 1) % frames.length; spinnerEl.textContent = frames[frame]; }, interval);
}

// --- Nav marquee: pause on hover ---
// Uses the Web Animations API instead of a CSS :hover play-state rule: pausing a
// long-running compositor animation via style recalc can snap the track to a stale
// position; animation.pause() freezes it exactly where it is.
function initMarqueeHoverPause() {
  const marquee = document.querySelector('.nav-marquee');
  const track = marquee && marquee.querySelector('.nav-marquee-track');
  if (!track) return;
  marquee.addEventListener('mouseenter', () => track.getAnimations().forEach(a => a.pause()));
  marquee.addEventListener('mouseleave', () => track.getAnimations().forEach(a => a.play()));
}

// --- Scroll fade: hint at overflow content below a scroll column ---
function initScrollFade() {
  document.querySelectorAll('.scroll-col').forEach(col => {
    const update = () => {
      col.classList.toggle('has-more', col.scrollHeight - col.scrollTop - col.clientHeight > 1);
    };
    col.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(col);
    [...col.children].forEach(child => ro.observe(child)); // accordion/panel toggles change content height
    update();
  });
}

// Initialise all modules on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initAccordion();
  initVideoControls();
  initCaseStudyReveal();
  initScrollFade();
  initMarqueeHoverPause();
});