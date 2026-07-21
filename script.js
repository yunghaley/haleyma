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
        // PROJECTS isn't a dismissible overlay anymore (always-visible accordion),
        // so it's excluded — INFO shouldn't hide it.
        document.querySelectorAll('[data-section]:not([data-section="projects"])').forEach(sec => sec.style.display = 'none');
        target.style.display = isHidden ? 'block' : 'none';
      }
    } else if (logoElement) {
      // Logo resets home: collapse any open project and dismiss all overlays.
      // project-default (the homepage reel) is never hidden or paused by
      // anything else, so there's nothing else to reset here.
      closeAllAccordions();
      document.querySelectorAll('[data-section]:not([data-section="projects"])').forEach(sec => sec.style.display = 'none');
    }
  });
}

// --- INFO overlay: tap anywhere that isn't a link or a nav toggle to dismiss ---
function initInfoDismiss() {
  document.addEventListener('click', (event) => {
    const info = document.querySelector('[data-section="info"]');
    if (!info || getComputedStyle(info).display === 'none') return; // not open
    // Links keep working; nav toggles ([data-target]) manage the overlay themselves.
    if (event.target.closest('a') || event.target.closest('[data-target]')) return;
    info.style.display = 'none';
  });
}

// --- Accordion handling ---
// Clicking a project expands its full content inline, in place (hover already
// gets a lightweight preview for free from the .t-shimmer-hover CSS — no JS
// needed for that). The project's rich content (video/case-study) lives
// directly inside its .accordion-panel now, so opening it just means playing
// its media and scrolling it into view once the open transition settles.
function revealProjectContent(panel) {
  panel.querySelectorAll('.t-digit-group').forEach(g => {
    g.classList.remove('is-animating');
    void g.offsetHeight;
    g.classList.add('is-animating');
  });
  panel.querySelectorAll('video').forEach(v => {
    v.muted = true;
    v.play().catch(e => console.log('Autoplay failed:', e));
  });
}

// --- Desktop project stage (portal) ---
// On desktop the opened project's content (#project-<slug>) is moved into the
// right-hand #project-stage so it shows beside the nav rail; on mobile it stays
// inline in the accordion panel (unchanged behaviour).
function isDesktopSplit() {
  return window.matchMedia('(min-width: 560px)').matches;
}

// Nearest scrollable ancestor — the left rail on desktop, the content column on
// mobile. Used so we scroll the right container (never the window, which on
// mobile drags the item under the fixed nav).
function scrollParent(el) {
  let p = el.parentElement;
  while (p) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) return p;
    p = p.parentElement;
  }
  return null;
}

// Deferred restore state: closing content must re-enter its (now-collapsed)
// panel only AFTER the close animation, or it flashes in the shrinking panel.
let pendingRestore = null;
function flushPendingRestore() {
  if (!pendingRestore) return;
  clearTimeout(pendingRestore.timer);
  pendingRestore.putBack();
  pendingRestore = null;
}

// Immediate restore (viewport crossover): move staged content back inline now.
function restoreStage() {
  flushPendingRestore();
  const stage = document.getElementById('project-stage');
  if (!stage) return;
  const moved = stage.firstElementChild;
  if (moved && moved._home) {
    moved.querySelectorAll('video, audio').forEach(m => { m.muted = true; m.pause(); });
    const home = moved._home; moved._home = null;
    home.parent.insertBefore(moved, home.next);
    moved.style.display = '';
  }
  const reel = document.getElementById('project-default');
  if (reel) reel.style.display = '';
}

// Close restore: hide staged content immediately (so it neither flashes in the
// collapsing left panel nor lingers over the reel) and show the reel; move the
// content home only after the collapse settles (into the closed, clipped panel).
function deferStageRestore() {
  flushPendingRestore();
  const reel = document.getElementById('project-default');
  if (reel) reel.style.display = '';
  const stage = document.getElementById('project-stage');
  const moved = stage && stage.firstElementChild;
  if (!moved || !moved._home) return;
  moved.querySelectorAll('video, audio').forEach(m => { m.muted = true; m.pause(); });
  moved.style.display = 'none';
  const home = moved._home; moved._home = null;
  const putBack = () => { home.parent.insertBefore(moved, home.next); moved.style.display = ''; };
  pendingRestore = { timer: setTimeout(() => { putBack(); pendingRestore = null; }, 600), putBack };
}

function moveProjectToStage(item) {
  if (!isDesktopSplit()) return null;
  flushPendingRestore();
  const stage = document.getElementById('project-stage');
  const content = document.getElementById('project-' + item.dataset.project);
  if (!stage || !content) return null;
  content.style.display = '';
  content._home = { parent: content.parentNode, next: content.nextSibling };
  stage.appendChild(content);
  const reel = document.getElementById('project-default');
  if (reel) reel.style.display = 'none';
  return content;
}

function initProjectStage() {
  const mq = window.matchMedia('(min-width: 560px)');
  mq.addEventListener('change', () => {
    const open = document.querySelector('.accordion-item[aria-expanded="true"]');
    restoreStage(); // put content back inline + show reel, then re-place for the new width
    if (open && mq.matches) {
      const staged = moveProjectToStage(open);
      if (staged) revealProjectContent(staged);
    }
  });
}

function expandAccordionItem(accordionItem) {
  closeAllAccordions(accordionItem); // also restores any staged content + shows reel
  accordionItem.setAttribute('aria-expanded', 'true');
  const trigger = accordionItem.querySelector('.accordion-trigger');
  if (trigger) trigger.setAttribute('aria-expanded', 'true');
  const panel = document.getElementById(accordionItem.getAttribute('aria-controls'));
  if (!panel) return;
  panel.classList.add('is-open');
  panel.setAttribute('aria-hidden', 'false');
  panel.removeAttribute('inert');

  // Desktop: portal the project's content to the right stage before measuring,
  // so the left panel only animates to its (shorter) nav height.
  const staged = moveProjectToStage(accordionItem);
  if (staged) revealProjectContent(staged);

  panel.style.maxHeight = panel.scrollHeight + 'px';

  const onOpened = (event) => {
    if (event.target !== panel || event.propertyName !== 'max-height') return;
    panel.removeEventListener('transitionend', onOpened);
    // Un-cap height once open: late-loading media (lazyload images, video
    // metadata) would otherwise stay clipped at the height measured pre-load.
    panel.style.maxHeight = 'none';
    if (!staged) revealProjectContent(panel); // mobile: content is still inline
    // Bring the item's top flush to the top of its own scroll container (the
    // left rail on desktop, the content column on mobile) — never via
    // scrollIntoView, which also scrolls the window and drags the item under
    // the fixed nav on mobile.
    const col = scrollParent(accordionItem);
    if (col) {
      const delta = accordionItem.getBoundingClientRect().top - col.getBoundingClientRect().top;
      col.scrollTo({ top: col.scrollTop + delta, behavior: 'smooth' });
    } else {
      accordionItem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  panel.addEventListener('transitionend', onOpened);
}

function initAccordion() {
  document.addEventListener('click', function(event) {
    // Clicks on rich content inside an open panel (video controls, links,
    // scrolling the case study) shouldn't toggle the accordion item closed.
    if (event.target.closest('.accordion-panel')) return;
    const accordionItem = event.target.closest('.accordion-item');
    if (accordionItem) {
      const isOpen = accordionItem.getAttribute('aria-expanded') === 'true';
      if (isOpen) closeAllAccordions();
      else expandAccordionItem(accordionItem);
    }
    // PROJECTS is always-visible now (not a dismissible overlay), so there's
    // no outside-click-to-close behavior to handle here anymore.
  });
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
      if (!video.muted) {
        document.querySelectorAll('video').forEach(other => {
          if (other !== video) other.muted = true;
        });
      }
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
      showControls();
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
function closeAllAccordions(except = null) {
  deferStageRestore(); // hide staged content + show reel now; move it home after collapse
  document.querySelectorAll('.accordion-item').forEach(item => {
    if (item === except) return;
    const wasOpen = item.getAttribute('aria-expanded') === 'true';
    item.setAttribute('aria-expanded', 'false');
    const panel = document.getElementById(item.getAttribute('aria-controls'));
    if (panel) {
      if (wasOpen) {
        // Open panels sit at max-height: none (see expandAccordionItem) so
        // late-loading media isn't clipped — but 'none' can't be transitioned
        // from directly. Give it a concrete starting height, force layout,
        // then collapse it so the close actually animates.
        panel.style.maxHeight = panel.scrollHeight + 'px';
        void panel.offsetHeight;
      }
      panel.style.maxHeight = null;
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      panel.setAttribute('inert', '');
      panel.querySelectorAll('video, audio').forEach(media => {
        media.muted = true;
        media.pause();
      });
    }
  });
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
  document.querySelectorAll('.scroll-fade').forEach(col => {
    const update = () => {
      col.classList.toggle('has-more', col.scrollHeight - col.scrollTop - col.clientHeight > 1);
      col.classList.toggle('has-prev', col.scrollTop > 1);
    };
    col.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(col);
    [...col.children].forEach(child => ro.observe(child)); // accordion/panel toggles change content height
    update();
  });
}

// --- Before/after crossfade: cycle each frame's stacked images on an interval ---
function initCrossfades() {
  const INTERVAL = 3000;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frames = document.querySelectorAll('.cs-crossfade');
  frames.forEach((frame, i) => {
    const imgs = frame.querySelectorAll('img');
    if (!imgs.length) return;
    // Tap to expand full-width (2x2 mobile grid), tap again to restore. Only
    // one frame expanded at a time. Styling is mobile-only (see CSS).
    frame.addEventListener('click', () => {
      const willExpand = !frame.classList.contains('is-expanded');
      const apply = () => {
        frames.forEach(f => f.classList.remove('is-expanded'));
        if (willExpand) frame.classList.add('is-expanded');
      };
      // View Transitions animate the grid reflow (expanding frame morphs, the
      // other 3 fade out) for free; fall back to an instant toggle otherwise.
      // .vt-active names only this frame's group so it stays layered on top
      // (see CSS) instead of being covered by sibling snapshots mid-morph.
      if (!reduce && document.startViewTransition) {
        frame.classList.add('vt-active');
        document.startViewTransition(apply).finished.finally(() => frame.classList.remove('vt-active'));
      } else {
        apply();
      }
    });
    let idx = 0;
    imgs[0].classList.add('is-active');
    if (reduce || imgs.length < 2) return; // static: show the "before"
    const advance = () => {
      imgs[idx].classList.remove('is-active');
      idx = (idx + 1) % imgs.length;
      imgs[idx].classList.add('is-active');
    };
    // Stagger each frame's start so they don't all flip in unison.
    setTimeout(() => setInterval(advance, INTERVAL), i * 800);
  });
}

// --- Shot-on-Lapse wall: tap a tile (mobile) to expand it full-width and
// slideshow the whole folder (window.LAPSE_IMAGES). Tap again to restore. ---
function initLapseWall() {
  const wall = document.querySelector('.lapse-wall');
  if (!wall) return;
  const all = window.LAPSE_IMAGES || [];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const expand = (cell) => {
    const imgs = cell.querySelectorAll('img');
    if (imgs.length < 2 || !all.length) return;
    cell._orig = [...imgs].map(i => i.getAttribute('src'));
    let i = Math.max(0, all.indexOf(cell._orig[0])); // start at this tile's shot
    let front = imgs[0], back = imgs[1];
    front.setAttribute('src', all[i]);
    front.classList.add('lw-show');
    back.classList.remove('lw-show');
    cell.classList.add('is-expanded');
    cell._timer = setInterval(() => {
      i = (i + 1) % all.length;
      back.setAttribute('src', all[i]);
      back.classList.add('lw-show');
      front.classList.remove('lw-show');
      [front, back] = [back, front];
    }, 3000);
  };
  const collapse = (cell) => {
    clearInterval(cell._timer);
    cell._timer = null;
    cell.classList.remove('is-expanded');
    cell.querySelectorAll('img').forEach((img, k) => {
      img.classList.remove('lw-show');
      if (cell._orig) img.setAttribute('src', cell._orig[k]); // restore wall tile
    });
  };

  // FLIP the tile (transform) AND the wall's real height together, so the tile
  // morphs cell<->full-width while the content below eases with the wall's
  // changing height (View Transitions can't reflow surrounding content — they
  // freeze a snapshot, which is what caused the scroll-length glitch).
  const DUR = 460;
  const EASE = 'cubic-bezier(0.34, 1.26, 0.64, 1)';

  wall.querySelectorAll('.lapse-wall-cell').forEach(cell => {
    cell.addEventListener('click', () => {
      if (!window.matchMedia('(max-width: 767px)').matches) return; // mobile only
      const willExpand = !cell.classList.contains('is-expanded');

      // FIRST: geometry before the layout change.
      const firstTile = cell.getBoundingClientRect();
      const firstWallH = wall.getBoundingClientRect().height;

      // Apply the new layout instantly.
      wall.querySelectorAll('.lapse-wall-cell.is-expanded').forEach(c => { if (c !== cell) collapse(c); });
      if (willExpand) expand(cell); else collapse(cell);

      if (reduce) return; // honour reduced-motion: snap, no animation

      // LAST: geometry after.
      const lastTile = cell.getBoundingClientRect();
      const lastWallH = wall.getBoundingClientRect().height;

      // Animate the wall's height (clip overflow so the grid reveals/collapses
      // cleanly and the content below follows).
      wall.style.overflow = 'hidden';
      wall.style.height = firstWallH + 'px';
      void wall.offsetWidth; // reflow
      wall.style.transition = `height ${DUR}ms ${EASE}`;
      wall.style.height = lastWallH + 'px';

      // INVERT + PLAY the tile.
      const dx = firstTile.left - lastTile.left;
      const dy = firstTile.top - lastTile.top;
      const sx = firstTile.width / lastTile.width;
      const sy = firstTile.height / lastTile.height;
      cell.style.transformOrigin = 'top left';
      cell.style.transition = 'none';
      cell.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
      cell.style.zIndex = '5';
      void cell.offsetWidth; // reflow
      cell.style.transition = `transform ${DUR}ms ${EASE}`;
      cell.style.transform = 'none';

      let done = false;
      const cleanup = () => {
        if (done) return;
        done = true;
        wall.style.transition = wall.style.height = wall.style.overflow = '';
        cell.style.transition = cell.style.transform = cell.style.transformOrigin = cell.style.zIndex = '';
        cell.removeEventListener('transitionend', onEnd);
      };
      const onEnd = (e) => { if (e.target === cell && e.propertyName === 'transform') cleanup(); };
      cell.addEventListener('transitionend', onEnd);
      setTimeout(cleanup, DUR + 80); // fallback if transform is a no-op
    });
  });
}

// Initialise all modules on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initInfoDismiss();
  initAccordion();
  initProjectStage();
  initVideoControls();
  initCaseStudyReveal();
  initScrollFade();
  initMarqueeHoverPause();
  initCrossfades();
  initLapseWall();
});