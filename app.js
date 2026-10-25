// app.js – hash-routed shell: one persistent left rail (nav, project list, project
// info) and a media stage that swaps views. Plain JS, no dependencies.

// Desktop layout query. Must mirror the @media block at the bottom of site.css.
const DESKTOP = window.matchMedia('(min-width: 1024px) and (min-height: 520px)');
const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const V = (document.currentScript && new URL(document.currentScript.src).search) || ''; // the ?v= on app.js, reused for the files it loads

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const body = document.body;
const links = $$('#list a');
const info = $('#info');

// Plays on Home when nothing is hovered or selected.
const REEL = 'https://cdn.haleyma.com/haley-ma-reel-3mbps-hevc.mp4'; // HEVC, index up front so it starts without downloading the whole file
const REEL_ALT = 'https://cdn.haleyma.com/haley-ma-reel-2Mbps-faststart.mp4'; // H.264 for browsers that cannot play HEVC

// HEVC plays natively on Safari/iOS and most recent Chrome/Edge; elsewhere a data-alt H.264 file is used.
const HEVC = !!document.createElement('video').canPlayType('video/mp4; codecs="hvc1.1.6.L93.B0"');
const reelSrc = () => (HEVC ? REEL : REEL_ALT);
const srcOf = el => (el.dataset.alt && !HEVC ? el.dataset.alt : el.dataset.src);

let current = 'home';
let cursor = -1;
let tag = null; // active tag filter (slug), set by the #/tag/<slug> route

// --- Media helpers ---
// Videos start with data-src so nothing downloads until their view is opened.
function setSrc(video) {
  if (!video.dataset.src) return;
  video.src = srcOf(video);
  video.removeAttribute('data-src');
  video.preload = 'metadata';
}

// --- Rail: list cursor (the row that reads as selected) ---
function setCursor(i) {
  cursor = i;
  links.forEach((a, k) => a.classList.toggle('is-cursor', k === i));
  $('#list').classList.toggle('has-cursor', i >= 0);
}

// --- Tags: the role lists double as filters ---
const slugify = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const tagsOf = a => $$('#view-' + a.dataset.slug + ' .roles li').map(li => li.textContent);
function applyFilter(next) {
  if (next === tag && !next) return;
  tag = next;
  const cards = $$('#feed .card');
  links.forEach((a, i) => {
    const ok = !tag || tagsOf(a).some(t => slugify(t) === tag);
    a.hidden = !ok;
    if (cards[i]) cards[i].hidden = !ok;
  });
  const bar = $('#filter');
  bar.replaceChildren();
  bar.classList.toggle('is-empty', !tag);
  if (tag) {
    const label = links.flatMap(tagsOf).find(t => slugify(t) === tag) || tag;
    const chip = document.createElement('a');
    chip.className = 'chip is-on';
    chip.href = '#/';
    chip.textContent = `${label} ×`;
    chip.setAttribute('aria-label', `Clear filter: ${label}`);
    bar.append(chip);
  }
  $('#feed').dispatchEvent(new Event('feed:refresh')); // re-count the feed dots
}

// --- Rail: project info (title, description, roles). Static per project. ---
function renderInfo(view, { tray = false } = {}) {
  const meta = $('.meta', view);
  info.replaceChildren();
  info.className = 'rail-info' + (tray ? ' is-tray' : '');
  if (!meta) { info.hidden = true; return; }
  info.hidden = false;
  const link = links.find(a => a.dataset.slug === view.id.slice(5));
  const el = (tag, cls, text) => { const n = document.createElement(tag); n.className = cls; if (text) n.textContent = text; return n; };
  const title = link ? link.firstElementChild.textContent : '';
  // On project pages the info is a tray: a title row that stays, with the description and tags in a body that slides away.
  const body = tray ? el('div', 'info-inner') : info;
  if (tray) {
    const head = el('button', 'info-head');
    head.type = 'button';
    head.setAttribute('aria-controls', 'info-body');
    const name = el('span', 'info-title', title);
    if (link) name.append(el('span', 'info-client', link.lastElementChild.textContent)); // truncates first when the pair is too long
    head.append(name);
    head.append(el('span', 'info-tog', 'info'));
    head.disabled = DESKTOP.matches; // a plain title on desktop, a toggle on mobile
    head.addEventListener('click', toggleTray);
    const wrap = el('div', 'info-body');
    wrap.id = 'info-body';
    wrap.append(body);
    info.append(head, wrap);
  } else {
    info.append(el('h2', 'info-title', title));
  }
  body.append(el('p', 'info-desc', $('.desc', meta).textContent));
  const roles = el('ul', 'info-roles'); // each role is a tag chip that filters the project list
  $$('li', meta).forEach(li => {
    const chip = el('a', 'chip', li.textContent);
    chip.href = '#/tag/' + slugify(li.textContent);
    roles.append(el('li', '')); roles.lastChild.append(chip);
  });
  body.append(roles);
  if (tray) startTray();
}

// --- Info tray (mobile): a docked row that starts closed on every page and opens only when the visitor taps it ---
function setTray(open) {
  if (DESKTOP.matches) open = true; // desktop has the room: the description stays open
  info.classList.toggle('is-closed', !open);
  const head = $('.info-head', info);
  if (head) head.setAttribute('aria-expanded', String(open));
}
function toggleTray() { setTray(info.classList.contains('is-closed')); }
function startTray() { setTray(DESKTOP.matches); }

// --- Home: the hovered/cursor project's description shows in the rail (desktop) ---
function homeInfo(i) {
  if (!DESKTOP.matches) return;
  if (i < 0) { info.hidden = true; return; }
  renderInfo($('#view-' + links[i].dataset.slug));
}

// --- Home: hover preview (desktop) ---
const hv = $('#hv'), hi = $('#hi'), hr = $('#hr');
let hoverTimer = null;
function preview(i) {
  if (!DESKTOP.matches) { hr.pause(); hv.pause(); return; } // the hover preview is desktop only
  if (current !== 'home' || !DESKTOP.matches || body.classList.contains('is-index')) return;
  const a = links[i];
  if (!a) { // no row selected: the reel, which keeps its place while a project previews
    if (!hr.src) { hr.src = reelSrc() + '#t=0.001'; hr.preload = 'auto'; } // the fragment paints the first frame straight away
    hv.pause();
    if (!REDUCE) hr.play().catch(() => {});
    hr.classList.add('on'); hv.classList.remove('on'); hi.classList.remove('on');
    return;
  }
  hr.pause();
  hr.classList.remove('on');
  if (a.dataset.kind === 'video') {
    const src = srcOf(a);
    if (hv.dataset.cur !== src) { hv.dataset.cur = src; hv.src = src; hv.preload = 'metadata'; }
    hv.currentTime = 0;
    if (!REDUCE) hv.play().catch(() => {});
    hv.classList.add('on'); hi.classList.remove('on');
  } else {
    hi.src = a.dataset.src;
    hv.pause();
    hi.classList.add('on'); hv.classList.remove('on');
  }
}

// --- Home: mobile feed (cards built from the rail list) ---
function buildFeed() {
  const feed = $('#feed');
  links.forEach(a => {
    const card = document.createElement('a');
    card.className = 'card';
    card.href = a.getAttribute('href');
    const media = document.createElement('div');
    media.className = 'card-media';
    let m;
    if (a.dataset.kind === 'video') {
      m = document.createElement('video');
      m.muted = true; m.loop = true; m.playsInline = true; m.preload = 'none';
      m.dataset.src = srcOf(a) + '#t=0.1'; // #t shows a frame without playing
      m.dataset.card = '';
    } else {
      m = document.createElement('img');
      m.loading = 'lazy'; m.alt = '';
      m.src = a.dataset.src;
    }
    media.append(m);
    const row = document.createElement('div');
    row.className = 'card-row';
    row.innerHTML = '<span></span><span></span>';
    row.children[0].textContent = a.children[0].textContent;
    row.children[1].textContent = a.children[1].textContent;
    card.append(media, row);
    feed.append(card);
  });

  // a card's video gets its source only when the card is within a screen of the viewport
  const near = new IntersectionObserver(es => es.forEach(e => {
    const v = e.isIntersecting && $('video[data-src]', e.target);
    if (v && !DESKTOP.matches) setSrc(v);
  }), { root: feed, rootMargin: '100% 0px' });
  $$('.card', feed).forEach(c => near.observe(c));
  const size = () => feed.style.setProperty('--feed-h', feed.clientHeight + 'px');
  new ResizeObserver(size).observe(feed);
  // dot marker, one dot per visible card; shown while scrolling, then fades out
  const pager = $('#feed-pager');
  let pips = [], hide = null;
  const mark = () => {
    const i = Math.round(feed.scrollTop / (feed.clientHeight || 1));
    pips.forEach((p, k) => p.classList.toggle('on', k <= i));
  };
  const rebuild = () => {
    pips = $$('.card', feed).filter(c => !c.hidden).map(() => document.createElement('i'));
    pager.replaceChildren(...pips);
    mark();
  };
  feed.addEventListener('scroll', () => {
    mark();
    pager.classList.add('is-live');
    clearTimeout(hide);
    hide = setTimeout(() => pager.classList.remove('is-live'), 1200);
  }, { passive: true });
  feed.addEventListener('feed:refresh', rebuild);
  rebuild();
  return rebuild;
}

// --- Router ---
let currentView = null;
function go({ keep = false } = {}) {
  let slug = '';
  try { slug = decodeURIComponent(location.hash.replace(/^#\/?/, '')); } catch (e) { /* malformed hash: fall back to home */ }
  clearTimeout(hoverTimer);
  const tagRoute = slug.match(/^tag\/(.+)$/);
  applyFilter(tagRoute ? tagRoute[1] : null);
  const view = document.getElementById('view-' + (tagRoute ? '' : slug)) || $('#view-home');
  if (!keep && currentView && currentView !== view) currentView.dispatchEvent(new CustomEvent('view:leave'));
  currentView = view;
  current = view.id.slice(5);

  $$('.view').forEach(v => { v.hidden = v !== view; });
  body.dataset.route = current === 'home' ? 'home' : current === 'about' ? 'about' : 'project';
  body.dataset.tpl = view.dataset.tpl;

  $$('video').forEach(v => { if (!view.contains(v)) v.pause(); });
  $$('video[data-src]', view).forEach(v => {
    if (v.hasAttribute('data-card')) return; // feed videos load as their card nears the screen (see buildFeed)
    if (v.id === 'about-reel' && !DESKTOP.matches) return; // the About stage is hidden on mobile
    setSrc(v);
  });

  const i = links.findIndex(a => a.dataset.slug === current);
  if (current === 'home') {
    setCursor(-1);
    preview(-1);
    homeInfo(-1);
  } else {
    setCursor(i);
  }

  if (current === 'home') { if (!DESKTOP.matches) info.hidden = true; }
  else renderInfo(view, { tray: true });
  const nav = $('#nav-index'); // INDEX is a toggle only while on Home
  if (current === 'home') { nav.setAttribute('role', 'button'); nav.setAttribute('aria-pressed', String(body.classList.contains('is-index'))); }
  else { nav.removeAttribute('role'); nav.removeAttribute('aria-pressed'); }
  const link = links[i];
  const tagLabel = tag && $('#filter .chip') ? $('#filter .chip').textContent.replace(/ ×$/, '') : '';
  document.title = link ? `${link.firstElementChild.textContent} — Haley Ma` : current === 'about' ? 'About — Haley Ma' : tagLabel ? `${tagLabel} — Haley Ma` : 'Haley Ma';
  if (!keep) view.dispatchEvent(new CustomEvent('view:enter'));
}

// --- Top nav: INDEX collapses the previews on Home, links Home elsewhere ---
function initIndexToggle() {
  const btn = $('#nav-index');
  btn.addEventListener('click', e => {
    if (current !== 'home') return;
    e.preventDefault();
    const on = body.classList.toggle('is-index');
    btn.setAttribute('aria-pressed', String(on));
    if (on) hv.pause(); else preview(cursor);
  });
  // HALEY MA always goes to the index page, with the full list and previews back on
  $('.brand').addEventListener('click', e => {
    body.classList.remove('is-index');
    $('#nav-index').setAttribute('aria-pressed', 'false');
    if (location.hash === '' || location.hash === '#/') { // already there: no hashchange will fire, so reset by hand
      e.preventDefault();
      go();
      $('#feed').scrollTo({ top: 0 });
    }
  });
}

// --- Keyboard: ↑↓ move through the list, ⏎ opens, esc goes to the index ---
// ↑↓ on the case study and the stills gallery move one page, as a swipe would
function pageScroll(dir) {
  if (body.dataset.tpl !== 'case' && body.dataset.tpl !== 'stills') return false;
  const sc = $('#view-' + current + ' .cs, #view-' + current + ' .sp');
  if (!sc) return false;
  sc.scrollBy({ top: dir * sc.clientHeight, behavior: 'smooth' });
  return true;
}

function initKeys() {
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest('input, textarea, [contenteditable], .rail-info')) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (e.target.closest('button')) return;
      if (pageScroll(e.key === 'ArrowDown' ? 1 : -1)) { e.preventDefault(); return; } // the case study and stills page by page
      if (!DESKTOP.matches) return;
      e.preventDefault();
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      let next = cursor < 0 ? (dir > 0 ? -1 : links.length) : cursor;
      do { next += dir; } while (next >= 0 && next < links.length && links[next].hidden);
      if (next < 0 || next >= links.length) next = cursor < 0 ? links.findIndex(a => !a.hidden) : cursor; // clamp at the ends
      setCursor(next);
      if (current === 'home') { preview(next); homeInfo(next); }
    } else if (e.key === 'Enter') {
      if (e.target.closest('a, button') || cursor < 0) return;
      location.hash = links[cursor].getAttribute('href');
    } else if (e.key === 'Escape') {
      if (current !== 'home') location.hash = '#/';
      else { clearTimeout(hoverTimer); setCursor(-1); preview(-1); homeInfo(-1); }
    }
  });
  $('#rail').addEventListener('mouseleave', () => { // leaving the whole rail (not just the list) returns to the reel, so the info chips stay clickable
    if (current !== 'home' || !DESKTOP.matches) return;
    clearTimeout(hoverTimer);
    setCursor(-1); preview(-1); homeInfo(-1);
  });
  const enter = i => {
    if (current !== 'home' || !DESKTOP.matches) return;
    setCursor(i);
    homeInfo(i);
    clearTimeout(hoverTimer); // swap the preview only once the pointer settles, so a sweep down the list doesn't start a download per row
    hoverTimer = setTimeout(() => preview(i), 150);
  };
  links.forEach((a, i) => { a.addEventListener('mouseenter', () => enter(i)); a.addEventListener('focus', () => enter(i)); });
}

// --- Rail clock ---
function initClock() {
  const el = $('#clock');
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const tick = () => { el.textContent = 'Toronto ' + fmt.format(new Date()); };
  tick();
  setInterval(tick, 1000);
}

// --- Video controls (play / pause, mute) ---
function initVideoControls() {
  const ICONS = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8.2 5.6v12.8c0 .9 1 1.4 1.7 1l10.1-6.4c.7-.4.7-1.5 0-1.9L9.9 4.6c-.7-.4-1.7.1-1.7 1z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4.5" width="4.4" height="15" rx="1.5"/><rect x="13.6" y="4.5" width="4.4" height="15" rx="1.5"/></svg>',
    sound: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 9.2v5.6c0 .6.4 1 1 1h2.6l4.6 4c.6.6 1.6.1 1.6-.7V4.9c0-.8-1-1.3-1.6-.7l-4.6 4H5c-.6 0-1 .4-1 1z"/></svg>',
    soundOff: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 9.2v5.6c0 .6.4 1 1 1h2.6l4.6 4c.6.6 1.6.1 1.6-.7V4.9c0-.8-1-1.3-1.6-.7l-4.6 4H5c-.6 0-1 .4-1 1z"/><path d="M4.5 4.5l15 15" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>',
  };
  $$('.stage video:not(.hp-box video):not([data-card])').forEach(video => {
    const shell = document.createElement('div');
    shell.className = 'video-shell';
    video.parentNode.insertBefore(shell, video);
    shell.appendChild(video);
    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'video-play';
    playBtn.setAttribute('aria-label', 'Play or pause video');
    const muteBtn = document.createElement('button');
    muteBtn.type = 'button';
    muteBtn.className = 'video-mute';
    shell.append(playBtn, muteBtn);

    const sync = () => {
      playBtn.innerHTML = video.paused ? ICONS.play : ICONS.pause;
      shell.classList.toggle('is-playing', !video.paused);
      muteBtn.innerHTML = video.muted ? ICONS.soundOff : ICONS.sound;
      muteBtn.setAttribute('aria-label', video.muted ? 'Unmute video' : 'Mute video');
    };
    playBtn.addEventListener('click', () => { if (video.paused) video.play().catch(() => {}); else video.pause(); });
    muteBtn.addEventListener('click', () => {
      video.muted = !video.muted;
      if (!video.muted) $$('video').forEach(o => { if (o !== video) o.muted = true; });
      sync();
    });
    ['play', 'pause', 'volumechange'].forEach(ev => video.addEventListener(ev, sync));

    if (window.matchMedia('(hover: none)').matches) { // touch: controls auto-hide, tap to reveal
      let t = null;
      const show = () => { shell.classList.add('controls-visible'); clearTimeout(t); t = setTimeout(() => shell.classList.remove('controls-visible'), 2000); };
      shell.addEventListener('click', show);
      video.addEventListener('play', show);
    }
    sync();
  });
}

// --- Viewport autoplay: the most-visible video (min 50% of itself) plays, the rest pause ---
function initAutoplay() {
  if (REDUCE) return;
  const videos = $$('video:not(.hp-box video)'); // the Home preview videos are driven by preview()
  const area = new Map();
  let playing = null;
  videos.forEach(v => v.addEventListener('play', () => videos.forEach(o => { if (o !== v && !o.paused) o.pause(); })));
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const r = e.intersectionRect;
      const hidden = e.target === hv && body.classList.contains('is-index'); // collapsed previews never play
      area.set(e.target, !hidden && e.intersectionRatio >= 0.5 ? r.width * r.height : 0);
    });
    let best = null, bestArea = 0;
    area.forEach((a, v) => { if (a > bestArea) { best = v; bestArea = a; } });
    if (best === playing) return;
    if (playing) playing.pause();
    playing = best;
    if (best && best.src) best.play().catch(() => {});
  }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
  videos.forEach(v => io.observe(v));
}

// --- Stills galleries (any .view[data-tpl="stills"]): one image per page, vertical snap scroll, dot marker ---
function initStills(view) {
  const sp = $('.sp', view), pager = $('.pager', view);
  const { folder, prefix } = view.dataset;
  const stills = view.dataset.stills.split(',').map(s => s.trim()); // file numbers, in display order
  const link = links.find(a => a.dataset.slug === view.id.slice(5));
  const title = link ? link.firstElementChild.textContent : 'Photo gallery';
  // one still per page: vertical snap scroll, with the same dot marker as the Lapse case study
  const pages = stills.map(n => {
    const page = document.createElement('div');
    page.className = 'sp-page';
    const img = document.createElement('img');
    img.alt = `${title}, photo ${stills.indexOf(n) + 1} of ${stills.length}`;
    img.dataset.lo = `${folder}/lazyload/${prefix}-LowRes-${n}.jpg`;
    img.dataset.full = `${folder}/${prefix}-${n}.jpg`;
    page.append(img);
    sp.append(page);
    return page;
  });
  const pips = pages.map(() => document.createElement('i'));
  pager.replaceChildren(...pips);

  const load = page => {
    const img = page.firstElementChild;
    if (img.src) return;
    img.src = img.dataset.lo; // low-res first, blurred, then swapped for the full image
    const full = new Image();
    full.onload = () => { img.src = full.src; page.classList.add('is-sharp'); };
    full.src = img.dataset.full;
  };
  // pages load a screen ahead of the one you are on
  const loader = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) load(e.target); }), { root: sp, rootMargin: '100% 0px' });
  const current = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const i = pages.indexOf(e.target);
    pips.forEach((p, k) => p.classList.toggle('on', k <= i));
  }), { root: sp, threshold: 0.6 });
  pages.forEach(p => { loader.observe(p); current.observe(p); });

  // marker: visible while scrolling, then fades out
  let hide = null;
  const live = () => { pager.classList.add('is-live'); clearTimeout(hide); hide = setTimeout(() => pager.classList.remove('is-live'), 1200); };
  sp.addEventListener('scroll', live, { passive: true });
  view.addEventListener('view:enter', () => { sp.scrollTop = 0; pips.forEach((p, k) => p.classList.toggle('on', k === 0)); live(); });
}

// --- Lapse case study: snap sections, pager, per-section behaviour ---
function initCase() {
  const view = $('#view-lapse');
  const cs = $('.cs', view);
  const secs = $$('.cs-sec, .pg', view).filter(el => !el.classList.contains('s4')); // the before/after section holds two snap pages (.pg)
  // page marker: one segment per page, so the bar always spans the full height and adapts to the page count
  const pips = secs.map(() => document.createElement('i'));
  $('.pager', view).replaceChildren(...pips);
  const caps = $$('.cap', view);
  let active = -1;

  // page marker: visible while scrolling (and briefly on arrival), then fades out
  const pager = $('.pager', view);
  let hideTimer = null;
  const showPager = () => {
    pager.classList.add('is-live');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => pager.classList.remove('is-live'), 1200);
  };
  cs.addEventListener('scroll', showPager, { passive: true });

  // Role statement: each line fades up in turn. Words are wrapped so lines can be measured.
  const statement = $('.cap-3', view);
  statement.setAttribute('aria-label', statement.textContent);
  statement.replaceChildren(...statement.textContent.split(' ').flatMap((w, k) => {
    const s = document.createElement('span');
    s.className = 'w';
    s.setAttribute('aria-hidden', 'true');
    s.textContent = w;
    return k ? [document.createTextNode(' '), s] : [s];
  }));
  function layoutLines() {
    let line = -1, top = null;
    $$('.w', statement).forEach(w => {
      if (top === null || Math.abs(w.offsetTop - top) > 4) { line++; top = w.offsetTop; }
      w.style.setProperty('--l', line);
    });
  }
  window.addEventListener('resize', () => { if (!view.hidden) layoutLines(); });

  // before / after
  const stage = $('#ba-stage'), tabs = $('#ba-tabs');
  const frames = $$('.ba-frame', stage);
  let frame = -1, cycle = null;
  frames.forEach((f, i) => {
    const b = document.createElement('button'); // a small photo of the frame, not a word
    b.type = 'button';
    b.setAttribute('aria-label', f.dataset.name);
    const t = document.createElement('img');
    t.alt = '';
    t.dataset.src = f.dataset.thumb || $('img.after', f).dataset.src; // the small crop if there is one, else the photo; loads when the page arrives
    b.append(t);
    b.addEventListener('click', () => selectFrame(i));
    tabs.append(b);
  });
  const loadTabThumbs = () => $$('img[data-src]', tabs).forEach(t => { t.src = t.dataset.src; t.removeAttribute('data-src'); });
  function selectFrame(i) {
    clearInterval(cycle);
    frame = i;
    frames.forEach((f, k) => f.classList.toggle('on', k === i));
    $$('button', tabs).forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    const f = frames[i];
    const imgs = $$('img', f);
    imgs.forEach(img => { if (img.dataset.src) { img.src = img.dataset.src; img.removeAttribute('data-src'); } });
    const afters = imgs.filter(img => img.classList.contains('after'));
    imgs.forEach(img => img.classList.remove('is-on'));
    let k = 0;
    afters[0].classList.add('is-on');
    if (afters.length > 1 && !REDUCE) {
      cycle = setInterval(() => { afters[k].classList.remove('is-on'); k = (k + 1) % afters.length; afters[k].classList.add('is-on'); }, 3000);
    }
  }
  // hold to see the original
  const hold = on => { stage.classList.toggle('is-orig', on); $('.s4', view).classList.toggle('is-orig', on); };
  stage.tabIndex = 0;
  stage.setAttribute('role', 'button');
  stage.addEventListener('pointerdown', () => hold(true));
  ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach(ev => stage.addEventListener(ev, () => hold(false)));
  stage.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); hold(true); } });
  stage.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') hold(false); });

  // Shot-on-Lapse wall. It appears twice: dimmed behind the phone on page 1, and full on
  // page 5. Each tile shows a blurred 18x24 thumbnail (lapse-wall-thumbs.js) straight away, then
  // its two real images load in tile by tile and sharpen in over it.
  let assets = null;
  const loadAssets = () => assets || (assets = Promise.all(['lapse-images.js', 'lapse-wall-thumbs.js'].map(src => new Promise(done => {
    const s = document.createElement('script');
    s.src = src + V;
    s.onload = s.onerror = done;
    document.head.append(s);
  }))));
  const built = new Set();
  async function buildWall(wall, { delay = 0, both = true } = {}) {
    if (built.has(wall)) return;
    built.add(wall);
    await loadAssets();
    const all = window.LAPSE_IMAGES || [];
    if (!all.length) return;
    const thumb = window.LAPSE_THUMBS || [];
    const cells = DESKTOP.matches ? 48 : 24; // mobile shows 24 tiles, so don't fetch for 48
    const imgs = [];
    for (let k = 0; k < cells; k++) {
      const cell = document.createElement('div');
      cell.className = 'wall-cell';
      cell.style.setProperty('--d', k);
      const t = thumb[k % all.length];
      if (t) cell.style.setProperty('--thumb', `url(${t})`);
      const want = both ? [k, k + 48] : [k]; // the dimmed page-1 layer is static: one image per tile
      let ready = 0;
      want.forEach(j => {
        const img = document.createElement('img');
        img.alt = '';
        img.decoding = 'async';
        img.addEventListener('load', () => {
          img.classList.add('is-loaded');
          if (++ready === want.length) cell.classList.add('is-ready'); // all in: drop the thumbnail so it never shows through a crossfade
        }, { once: true });
        img.dataset.src = all[j % all.length];
        cell.append(img);
        imgs.push(img);
      });
      wall.append(cell);
    }
    // stagger the real loads so the grid fills in progressively
    imgs.forEach((img, n) => setTimeout(() => { img.src = img.dataset.src; }, REDUCE ? 0 : delay + Math.floor(n / (both ? 2 : 1)) * 30));
  }

  function setSection(i) {
    if (i === active) return;
    active = i;
    pips.forEach((p, k) => p.classList.toggle('on', k <= i));
    secs.forEach((x, k) => x.classList.toggle('is-active', k === i)); // drives the fade of the phone page
    caps.forEach(c => c.classList.toggle('is-on', +c.dataset.pg === i)); // pinned text: it stays put and fades while the page scrolls under it
    $('#wall-bg').classList.toggle('is-off', i > 1); // the dimmed wall sits behind pages 1 and 2 only
    $('#wall').classList.toggle('is-dim', i === 6); // the full wall: dimmed behind its caption, then clear
    $('#wall').classList.toggle('is-full', i === 7);
    $('.s4', view).classList.toggle('is-capped', i === 4); // before/after: caption over the dimmed comparison, then clear
    const s = secs[i];
    if (i === 0) setTimeout(() => buildWall($('#wall-bg'), { both: false }), 800); // after the phone video has a head start
    if (i === 4 || i === 5) { // caption page and comparison page share the frames; also works when a visitor jumps straight to page 6
      loadTabThumbs();
      if (i === 4 || frame < 0 || !cycle) selectFrame(Math.max(frame, 0));
    } else { clearInterval(cycle); cycle = null; }
    if (i === 2) layoutLines();
    if (i >= 3) buildWall($('#wall')); // same images as the page-1 layer, so mostly cached by now
  }

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) setSection(secs.indexOf(e.target)); });
  }, { root: cs, threshold: 0.6 });
  secs.forEach(s => io.observe(s));
  view.addEventListener('view:enter', () => { active = -1; cs.scrollTop = 0; setSection(0); showPager(); });
  view.addEventListener('view:leave', () => { clearInterval(cycle); cycle = null; });
}

// --- Phone viewport: size the app to the area the visitor can actually see ---
// iOS browsers can draw their toolbars over the bottom of a 100svh layout (the tray's chevron ended up under Chrome's bar).
// visualViewport.height is the visible area, so the app is sized to it on phones. Skipped on desktop and while pinch-zoomed.
function initViewportHeight() {
  const vv = window.visualViewport;
  if (!vv) return;
  const set = () => {
    if (DESKTOP.matches || vv.scale > 1.01) document.documentElement.style.removeProperty('--app-h');
    else document.documentElement.style.setProperty('--app-h', Math.round(vv.height) + 'px');
  };
  vv.addEventListener('resize', set);
  window.addEventListener('orientationchange', () => setTimeout(set, 250));
  DESKTOP.addEventListener('change', set);
  set();
}

// --- Boot ---
document.addEventListener('DOMContentLoaded', () => {
  $('#about-reel').dataset.src = reelSrc(); // About shows the reel for now
  const syncFeed = buildFeed();
  initVideoControls();
  initAutoplay();
  $$('.view[data-tpl="stills"]').forEach(initStills);
  initCase();
  initViewportHeight();
  initIndexToggle();
  initKeys();
  initClock();
  window.addEventListener('hashchange', go);
  DESKTOP.addEventListener('change', () => go({ keep: true })); // re-sync media only; keep slide/scroll state
  go();
  syncFeed();
});
