// Desktop layout query. Must mirror the @media block at the bottom of site.css.
const DESKTOP = window.matchMedia('(min-width: 1024px) and (min-height: 520px)');
const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const V = (document.currentScript && new URL(document.currentScript.src).search) || '';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const body = document.body;
const links = $$('#list a');
const info = $('#info');

const REEL = 'https://cdn.haleyma.com/haley-ma-reel-3mbps-hevc.mp4';
const REEL_ALT = 'https://cdn.haleyma.com/haley-ma-reel-2Mbps-faststart.mp4';

const HEVC = !!document.createElement('video').canPlayType('video/mp4; codecs="hvc1.1.6.L93.B0"');
const reelSrc = () => (HEVC ? REEL : REEL_ALT);
const srcOf = el => (el.dataset.alt && !HEVC ? el.dataset.alt : el.dataset.src);

let current = 'home';
let cursor = -1;
let tag = null;
let tagLabel = '';

// --- Media helpers ---
const takeSrc = el => { el.src = el.dataset.src; el.removeAttribute('data-src'); };
function livePager(pager) {
  let hide = null;
  return () => { pager.classList.add('is-live'); clearTimeout(hide); hide = setTimeout(() => pager.classList.remove('is-live'), 1200); };
}

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
  $$('#feed .card').forEach((c, k) => c.classList.toggle('is-cursor', k === i));
  $('#feed').classList.toggle('has-cursor', i >= 0);
}

// --- Tags: the role lists double as filters ---
const slugify = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const tagsOf = a => $$('#view-' + a.dataset.slug + ' .roles li').map(li => li.textContent);
function applyFilter(next) {
  if (!next && !tag) return;
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
  tagLabel = tag ? links.flatMap(tagsOf).find(t => slugify(t) === tag) || tag : '';
  if (tag) {
    const chip = document.createElement('a');
    chip.className = 'chip is-on';
    chip.href = '#/';
    chip.textContent = `${tagLabel} ×`;
    chip.setAttribute('aria-label', `Clear filter: ${tagLabel}`);
    bar.append(chip);
  }
  $('#feed').dispatchEvent(new Event('feed:refresh'));
}

// --- Rail: project info (title, description, roles). Static per project. ---
function renderInfo(view, { tray = false } = {}) {
  const meta = $('.meta', view);
  info.replaceChildren();
  info.className = 'rail-info' + (tray ? ' is-tray' : '');
  if (!meta) { info.hidden = true; return; }
  info.hidden = false;
  const link = links.find(a => a.dataset.slug === view.id.slice(5));
  const el = (kind, cls, text) => { const n = document.createElement(kind); n.className = cls; if (text) n.textContent = text; return n; };
  const title = link ? link.firstElementChild.textContent : '';
  const box = tray ? el('div', 'info-inner') : info;
  if (tray) {
    const head = el('button', 'info-head');
    head.type = 'button';
    head.setAttribute('aria-controls', 'info-body');
    const name = el('span', 'info-title', title);
    if (link) name.append(el('span', 'info-client', link.lastElementChild.textContent));
    head.append(name);
    head.append(el('span', 'info-tog', 'info'));
    head.disabled = DESKTOP.matches;
    head.addEventListener('click', toggleTray);
    const wrap = el('div', 'info-body');
    wrap.id = 'info-body';
    wrap.append(box);
    info.append(head, wrap);
  } else {
    info.append(el('h2', 'info-title', title));
  }
  box.append(el('p', 'info-desc', $('.desc', meta).textContent));
  const roles = el('ul', 'info-roles');
  $$('li', meta).forEach(li => {
    const chip = el('a', 'chip', li.textContent);
    chip.href = '#/tag/' + slugify(li.textContent);
    roles.append(el('li', '')); roles.lastChild.append(chip);
  });
  box.append(roles);
  if (tray) startTray();
}

// --- Info tray (mobile): a docked row that starts closed on every page and opens only when the visitor taps it ---
function setTray(open) {
  if (DESKTOP.matches) open = true;
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

// --- Home: reset hover state ---
function resetHome() { setCursor(-1); homeInfo(-1); }

// --- Home: a gallery card flips through its stills while on screen ---
function flipStills(img, { folder, prefix, stills }) {
  const files = stills.split(',').map(n => `${folder}/${prefix}-${n.trim()}.jpg`);
  const next = k => (k + 1) % files.length;
  let k = 0, timer;
  const preload = i => { new Image().src = files[i]; };
  new IntersectionObserver(([e]) => {
    clearInterval(timer);
    if (!e.isIntersecting) return;
    preload(next(k));
    timer = setInterval(() => { k = next(k); img.src = files[k]; preload(next(k)); }, 500);
  }).observe(img);
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
      m.dataset.src = srcOf(a) + '#t=0.1';
      m.dataset.card = '';
    } else {
      m = document.createElement('img');
      m.loading = 'lazy'; m.alt = '';
      m.src = a.dataset.src;
      const gallery = $('#view-' + a.dataset.slug).dataset;
      if (gallery.stills && !REDUCE) flipStills(m, gallery);
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

  const near = new IntersectionObserver(es => es.forEach(e => {
    const v = e.isIntersecting && $('video[data-src]', e.target);
    if (v) setSrc(v);
  }), { root: feed, rootMargin: '100% 0px' });
  $$('.card', feed).forEach(c => near.observe(c));
  const size = () => feed.style.setProperty('--feed-h', feed.clientHeight + 'px');
  new ResizeObserver(size).observe(feed);
  const pager = $('#feed-pager');
  let pips = [];
  const live = livePager(pager);
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
    live();
  }, { passive: true });
  feed.addEventListener('feed:refresh', rebuild);
  rebuild();
}

// --- Router ---
let currentView = null;
function go({ keep = false } = {}) {
  let slug = '';
  try { slug = decodeURIComponent(location.hash.replace(/^#\/?/, '')); } catch (e) {}
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
    if (v.hasAttribute('data-card')) return;
    if (v.id === 'about-reel' && !DESKTOP.matches) return;
    setSrc(v);
  });

  const i = links.findIndex(a => a.dataset.slug === current);
  if (current === 'home') {
    setCursor(-1);
    info.hidden = true;
  } else {
    setCursor(i);
    renderInfo(view, { tray: true });
  }
  const nav = $('#nav-index');
  if (current === 'home') { nav.setAttribute('role', 'button'); nav.setAttribute('aria-pressed', String(body.classList.contains('is-index'))); }
  else { nav.removeAttribute('role'); nav.removeAttribute('aria-pressed'); }
  const link = links[i];
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
  });
  $('.brand').addEventListener('click', e => {
    body.classList.remove('is-index');
    $('#nav-index').setAttribute('aria-pressed', 'false');
    if (location.hash === '' || location.hash === '#/') {
      e.preventDefault();
      go();
      $('#feed').scrollTo({ top: 0 });
    }
  });
}

// --- Keyboard: ↑↓ move through the list, ⏎ opens, esc goes to the index ---
function pageScroll(dir) {
  if (body.dataset.tpl !== 'case' && body.dataset.tpl !== 'stills') return false;
  const sc = $('#view-' + current + ' .cs, #view-' + current + ' .sp');
  if (!sc) return false;
  sc.scrollBy({ top: dir * sc.clientHeight, behavior: REDUCE ? 'auto' : 'smooth' });
  return true;
}

function initKeys() {
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest('input, textarea, [contenteditable], .rail-info')) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (e.target.closest('button')) return;
      if (pageScroll(e.key === 'ArrowDown' ? 1 : -1)) { e.preventDefault(); return; }
      if (!DESKTOP.matches) return;
      e.preventDefault();
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      let next = cursor < 0 ? (dir > 0 ? -1 : links.length) : cursor;
      do { next += dir; } while (next >= 0 && next < links.length && links[next].hidden);
      if (next < 0 || next >= links.length) next = cursor < 0 ? links.findIndex(a => !a.hidden) : cursor;
      setCursor(next);
      if (current === 'home') homeInfo(next);
    } else if (e.key === 'Enter') {
      if (e.target.closest('a, button') || cursor < 0) return;
      location.hash = links[cursor].getAttribute('href');
    } else if (e.key === 'Escape') {
      if (current !== 'home') location.hash = '#/';
      else resetHome();
    }
  });
  $('#rail').addEventListener('mouseleave', () => {
    if (current !== 'home' || !DESKTOP.matches) return;
    resetHome();
  });
  const enter = i => {
    if (current !== 'home' || !DESKTOP.matches) return;
    setCursor(i);
    homeInfo(i);
  };
  links.forEach((a, i) => { a.addEventListener('mouseenter', () => enter(i)); a.addEventListener('focus', () => enter(i)); });
  $$('#feed .card').forEach((c, i) => c.addEventListener('mouseenter', () => enter(i)));
  $('#feed').addEventListener('mouseover', e => { if (current === 'home' && DESKTOP.matches && !e.target.closest('.card')) resetHome(); });
  $('#feed').addEventListener('mouseleave', () => { if (current === 'home' && DESKTOP.matches) resetHome(); });
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
  $$('.stage video:not([data-card])').forEach(video => {
    const shell = document.createElement('div');
    shell.className = 'video-shell';
    video.parentNode.insertBefore(shell, video);
    shell.appendChild(video);
    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'video-play';
    const muteBtn = document.createElement('button');
    muteBtn.type = 'button';
    muteBtn.className = 'video-mute';
    shell.append(playBtn, muteBtn);

    const sync = () => {
      playBtn.innerHTML = video.paused ? ICONS.play : ICONS.pause;
      playBtn.setAttribute('aria-label', video.paused ? 'Play video' : 'Pause video');
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

    if (window.matchMedia('(hover: none)').matches) {
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
  const videos = $$('video');
  const grid = v => DESKTOP.matches && v.hasAttribute('data-card');
  const area = new Map();
  let playing = null;
  videos.forEach(v => v.addEventListener('play', () => videos.forEach(o => { if (o !== v && !o.paused && !grid(o) && !grid(v)) o.pause(); })));
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (grid(e.target)) { e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause(); return; }
      const r = e.intersectionRect;
      area.set(e.target, e.intersectionRatio >= 0.5 ? r.width * r.height : 0);
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
  const stills = view.dataset.stills.split(',').map(s => s.trim());
  const link = links.find(a => a.dataset.slug === view.id.slice(5));
  const title = link ? link.firstElementChild.textContent : 'Photo gallery';
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
    img.src = img.dataset.lo;
    const full = new Image();
    full.onload = () => { img.src = full.src; page.classList.add('is-sharp'); };
    full.src = img.dataset.full;
  };
  const loader = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) load(e.target); }), { root: sp, rootMargin: '100% 0px' });
  const current = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const i = pages.indexOf(e.target);
    pips.forEach((p, k) => p.classList.toggle('on', k <= i));
  }), { root: sp, threshold: 0.6 });
  pages.forEach(p => { loader.observe(p); current.observe(p); });

  const live = livePager(pager);
  sp.addEventListener('scroll', live, { passive: true });
  view.addEventListener('view:enter', () => { sp.scrollTop = 0; pips.forEach((p, k) => p.classList.toggle('on', k === 0)); live(); });
}

// --- Case study: snap sections, pager, per-section behaviour. Runs per case view; a part (statement, before/after, wall) is optional. ---
function initCase(view) {
  const cs = $('.cs', view);
  const secs = $$('.cs-sec, .pg, .fx-step', view).filter(el => !el.classList.contains('s4') && !el.classList.contains('fx-tour'));
  const pips = secs.map(() => document.createElement('i'));
  $('.pager', view).replaceChildren(...pips);
  const caps = $$('.cap', view);
  let active = -1;

  const showPager = livePager($('.pager', view));
  cs.addEventListener('scroll', showPager, { passive: true });

  const statement = $('.cap-role', view);
  if (statement) {
    statement.setAttribute('aria-label', statement.textContent);
    statement.replaceChildren(...statement.textContent.split(' ').flatMap((w, k) => {
      const s = document.createElement('span');
      s.className = 'w';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = w;
      return k ? [document.createTextNode(' '), s] : [s];
    }));
  }
  function layoutLines() {
    const words = $$('.w', statement), tops = words.map(w => w.offsetTop);
    let line = -1, top = null;
    words.forEach((w, k) => {
      if (top === null || Math.abs(tops[k] - top) > 4) { line++; top = tops[k]; }
      w.style.setProperty('--l', line);
    });
  }
  let relayout = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(relayout);
    relayout = requestAnimationFrame(() => { if (statement && !view.hidden) layoutLines(); });
  });

  const ba = $('.s4', view), stage = $('#ba-stage', view), tabs = $('#ba-tabs', view);
  const baAt = ba ? secs.indexOf($('.pg', ba)) : -1;
  const frames = stage ? $$('.ba-frame', stage) : [];
  let frame = -1, cycle = null;
  frames.forEach((f, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', f.dataset.name);
    const t = document.createElement('img');
    t.alt = '';
    t.dataset.src = f.dataset.thumb || $('img.after', f).dataset.src;
    b.append(t);
    b.addEventListener('click', () => selectFrame(i));
    tabs.append(b);
  });
  const loadTabThumbs = () => $$('img[data-src]', tabs).forEach(takeSrc);
  function selectFrame(i) {
    clearInterval(cycle);
    frame = i;
    frames.forEach((f, k) => f.classList.toggle('on', k === i));
    $$('button', tabs).forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    const f = frames[i];
    const imgs = $$('img', f);
    imgs.forEach(img => { if (img.dataset.src) takeSrc(img); });
    const afters = imgs.filter(img => img.classList.contains('after'));
    imgs.forEach(img => img.classList.remove('is-on'));
    let k = 0;
    afters[0].classList.add('is-on');
    if (afters.length > 1 && !REDUCE) {
      cycle = setInterval(() => { afters[k].classList.remove('is-on'); k = (k + 1) % afters.length; afters[k].classList.add('is-on'); }, 3000);
    }
  }
  const hold = on => { stage.classList.toggle('is-orig', on); ba.classList.toggle('is-orig', on); };
  if (stage) {
    stage.tabIndex = 0;
    stage.setAttribute('role', 'button');
    stage.addEventListener('pointerdown', () => hold(true));
    ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach(ev => stage.addEventListener(ev, () => hold(false)));
    stage.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); hold(true); } });
    stage.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') hold(false); });
  }

  let assets = null;
  const loadAssets = () => assets || (assets = Promise.all(['lapse-images.js', 'lapse-wall-thumbs.js'].map(src => new Promise(done => {
    const s = document.createElement('script');
    s.src = src + V;
    s.onload = s.onerror = done;
    document.head.append(s);
  }))));
  const wallBg = $('#wall-bg', view), wall = $('#wall', view);
  const wallLoadAt = secs.findIndex(x => x.dataset.wall === 'load');
  const built = new Set();
  async function buildWall(wall, { delay = 0, both = true } = {}) {
    if (built.has(wall)) return;
    built.add(wall);
    await loadAssets();
    const all = window.LAPSE_IMAGES || [];
    if (!all.length) return;
    const thumb = window.LAPSE_THUMBS || [];
    const cells = DESKTOP.matches ? 48 : 24;
    const imgs = [];
    for (let k = 0; k < cells; k++) {
      const cell = document.createElement('div');
      cell.className = 'wall-cell';
      cell.style.setProperty('--d', k);
      const t = thumb[k];
      if (t) cell.style.setProperty('--thumb', `url(${t})`);
      const want = both ? [k, k + 48] : [k];
      let ready = 0;
      want.forEach(j => {
        const img = document.createElement('img');
        img.alt = '';
        img.decoding = 'async';
        img.addEventListener('load', () => {
          img.classList.add('is-loaded');
          if (++ready === want.length) cell.classList.add('is-ready');
        }, { once: true });
        img.dataset.src = all[j % all.length];
        cell.append(img);
        imgs.push(img);
      });
      wall.append(cell);
    }
    imgs.forEach((img, n) => setTimeout(() => { img.src = img.dataset.src; }, REDUCE ? 0 : delay + Math.floor(n / (both ? 2 : 1)) * 30));
  }

  const tour = $('.fx-tour', view), steps = tour ? $$('.fx-step', tour) : [];
  const shots = tour ? $$('.fx-shot', tour) : [], fxCaps = tour ? $$('.fx-cap', tour) : [];
  let theme = matchMedia('(prefers-color-scheme: light)').matches ? 'l' : 'd';
  const loadShot = k => shots[k] && $$('img', shots[k]).forEach(im => { const s = im.dataset.src || im.dataset[theme]; if (s) im.src = s; });
  const showStep = k => {
    const n = Math.min(k, shots.length - 1);
    tour.classList.toggle('is-end', k >= shots.length);
    shots.forEach((s, j) => s.classList.toggle('on', j === n));
    fxCaps.forEach((c, j) => c.classList.toggle('on', j === k));
    loadShot(n); loadShot(n + 1);
  };
  const setTheme = t => { theme = t; tour.dataset.theme = t; $('.fx-phone', tour).setAttribute('aria-pressed', String(t === 'l')); $$('img', tour).forEach(im => im.getAttribute('src') && im.dataset[t] && (im.src = im.dataset[t])); };
  if (tour) {
    setTheme(theme);
    const phone = $('.fx-phone', tour), flip = () => setTheme(theme === 'd' ? 'l' : 'd');
    phone.addEventListener('click', flip);
    phone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
  }

  function setSection(i) {
    if (i === active) return;
    active = i;
    pips.forEach((p, k) => p.classList.toggle('on', k <= i));
    secs.forEach((x, k) => x.classList.toggle('is-active', k === i));
    caps.forEach(c => c.classList.toggle('is-on', +c.dataset.pg === i));
    const wallMode = secs[i].dataset.wall;
    if (wallBg) wallBg.classList.toggle('is-off', wallMode !== 'bg');
    if (wall) {
      wall.classList.toggle('is-dim', wallMode === 'dim');
      wall.classList.toggle('is-full', wallMode === 'full');
    }
    if (ba) ba.classList.toggle('is-capped', i === baAt);
    if (wallBg && i === 0) setTimeout(() => buildWall(wallBg, { both: false }), 800);
    if (ba && (i === baAt || i === baAt + 1)) {
      loadTabThumbs();
      if (i === baAt || frame < 0 || !cycle) selectFrame(Math.max(frame, 0));
    } else { clearInterval(cycle); cycle = null; }
    if (tour && steps.includes(secs[i])) showStep(steps.indexOf(secs[i]));
    if (statement && i === +statement.dataset.pg) layoutLines();
    if (wall && i >= wallLoadAt) buildWall(wall);
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
  $('#about-reel').dataset.src = reelSrc();
  buildFeed();
  initVideoControls();
  initAutoplay();
  $$('.view[data-tpl="stills"]').forEach(initStills);
  $$('.view[data-tpl="case"]').forEach(initCase);
  initViewportHeight();
  initIndexToggle();
  initKeys();
  initClock();
  window.addEventListener('hashchange', go);
  DESKTOP.addEventListener('change', () => go({ keep: true }));
  go();
});
