/* Dithered reel background — disabled, kept for later use. Not imported
   anywhere currently, so it costs nothing to load. To re-enable, paste
   into index.html before </body>:

   <div class="bg-shader" aria-hidden="true"></div>
   <canvas id="dither-bg" aria-hidden="true"></canvas>
   <video id="dither-src" src="assets/projects/reel/haley-ma-reel-0.19Mbps.mp4" muted loop playsinline preload="metadata" class="hidden" aria-hidden="true" width="640" height="360" decoding="async"></video>
   ...
   <script type="module">
     import { createDitherBg } from './dither.js';
     if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
       createDitherBg({
         canvas: document.getElementById('dither-bg'),
         video: document.getElementById('dither-src'),
         config: { shapeColor: '#272727' },
       });
     }
   </script>

   Also restore the #dither-bg rules in style.css (search "Dithered reel
   background layer" — currently left in place since they're inert without
   the canvas element). */
export function createDitherBg({ canvas, video, config = {} }) {
  if (!canvas || !video) return null;

  const ctx = canvas.getContext('2d');
  const off = document.createElement('canvas');
  const offCtx = off.getContext('2d', { willReadFrequently: true });
  const blurCanvas = document.createElement('canvas');
  const blurCtx = blurCanvas.getContext('2d', { willReadFrequently: true });

  const cfg = {
    cell: 7,
    // Total grid cells (cols*rows) drives per-frame cost — a flat cell size
    // means a 5K/4K monitor gets ~10-25x a phone's cell count for the same
    // per-cell work (getImageData + a fill()+setTransform() per cell), which
    // is what made large displays laggy even after the fps cap below.
    // cellSize() grows the cell size on large screens to keep the total
    // count near this, instead of letting it balloon with screen area.
    cellTarget: 7000, // ≈ a phone in portrait at cell:7 (6776 cells) — known to run fine
    fps: 30, // ambient background — 60fps+ is imperceptible here but doubles CPU/battery cost
    brightness: 0,
    contrast: 1.85,
    gamma: 1.2,
    t1: 0.98,
    t2: 0.71,
    t3: 0.1,
    mouseBlur: 5,
    mouseBlurAmount: 1,
    zoom: 0.7,
    invert: true,
    proximityEnabled: true,
    proximityRadius: 330,
    shapeColor: '#000000',
    ...config,
  };

  const shapes = [
    new Path2D('M40 8H48V16H56V24H64V40H56V48H48V56H40V64H24V56H16V48H8V40H0V24H8V16H16V8H24V0H40V8Z'),
    new Path2D('M36 8H40V24H56V28H64V36H56V40H40V56H36V64H28V56H24V40H8V36H0V28H8V24H24V8H28V0H36V8Z'),
    new Path2D('M34 24H40V30H50V34H40V40H34V50H30V40H24V34H14V30H24V24H30V14H34V24Z'),
  ];

  let raf = null;
  let px = -9999;
  let py = -9999;
  let started = false;

  // Largest viewport size seen since the last real geometry change. Mobile
  // Safari (and other touch browsers) shrink window.innerWidth/innerHeight
  // live as the address bar/toolbar expand back in on scroll-up — CSS lvh
  // alone wasn't reliably immune to this on-device, so track the max in JS
  // instead and only ever grow: a shrink is assumed to be chrome showing,
  // not a real resize, so it's ignored and the canvas just sits underneath,
  // uncovered again once chrome collapses. resetViewportMax() below
  // (orientation change) is the only thing allowed to bring these back down.
  // Desktop (mouse/trackpad) skips this entirely — a shrinking browser
  // window there is a real resize, not chrome, and should track live.
  const isTouch = window.matchMedia('(hover: none)').matches;
  let maxVW = 0;
  let maxVH = 0;
  const viewportSize = () => {
    if (!isTouch) return { w: window.innerWidth, h: window.innerHeight };
    maxVW = Math.max(maxVW, window.innerWidth);
    maxVH = Math.max(maxVH, window.innerHeight);
    return { w: maxVW, h: maxVH };
  };

  const hexToRgb = (hex) => {
    const h = hex.replace('#', '');
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  };

  const shapeRgb = hexToRgb(cfg.shapeColor);
  const shapeCss = `rgb(${shapeRgb[0]},${shapeRgb[1]},${shapeRgb[2]})`;

  // Never finer than cfg.cell (today's phone/small-screen look, unchanged);
  // grows past it as w*h grows so cols*rows stays near cfg.cellTarget.
  const cellSize = (w, h) => Math.max(cfg.cell, Math.round(Math.sqrt((w * h) / cfg.cellTarget)));

  const brightness = (px4) => {
    let v = (0.299 * px4[0] + 0.587 * px4[1] + 0.114 * px4[2]) / 255;
    if (cfg.invert) v = 1 - v;
    v += cfg.brightness;
    v = v - 0.5 + cfg.contrast * 0.5;
    if (cfg.gamma) v = Math.pow(v, 1 / cfg.gamma);
    return Math.max(0, Math.min(1, v));
  };

  const resize = () => {
    const { w, h } = viewportSize();
    // Pin the CSS box to the tracked max in px (inline style beats any
    // stylesheet unit, so this is authoritative regardless of lvh support).
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const cell = cellSize(w, h);
    const cols = Math.ceil(w / cell);
    const rows = Math.ceil(h / cell);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = cols * cell * dpr;
    canvas.height = rows * cell * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    off.width = cols;
    off.height = rows;
    blurCanvas.width = cols;
    blurCanvas.height = rows;
  };

  // Real geometry change (device rotation): the tracked max is for the old
  // orientation and would be wrong (e.g. portrait's tall max height kept as
  // a floor after rotating to landscape) — reset it before re-measuring.
  const resetViewportMax = () => {
    maxVW = 0;
    maxVH = 0;
    resize();
  };

  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    px = e.clientX - r.left;
    py = e.clientY - r.top;
  };

  // Ambient background, not motion content — cap the redraw rate instead of
  // running full tilt at the display's native refresh (60-120fps+ measured
  // ~8ms/frame uncapped on a real machine, but ~33ms/frame — the *entire*
  // page's effective frame rate — under Chrome's 4x mobile CPU throttle).
  // rAF still fires every tick; this just skips the expensive redraw (getImageData
  // + a fill()+setTransform() per grid cell) until enough time has passed.
  let lastDrawTime = 0;
  const frame = (now = 0) => {
    if (!video.videoWidth || !video.videoHeight || video.readyState < 2) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      raf = requestAnimationFrame(frame);
      return;
    }

    const frameInterval = 1000 / cfg.fps;
    const elapsed = now - lastDrawTime;
    if (elapsed < frameInterval) {
      raf = requestAnimationFrame(frame);
      return;
    }
    lastDrawTime = now - (elapsed % frameInterval); // correct drift, don't compound it

    const { w, h } = viewportSize();
    const cell = cellSize(w, h);
    const cols = off.width || Math.ceil(w / cell);
    const rows = off.height || Math.ceil(h / cell);
    const zoom = w <= 640 ? 0.9 : (cfg.zoom || 1);
    // zoom < 1 shrinks the video under cover-fit, opening a gap in whichever
    // dimension was exactly covered — the black bars top/bottom (or
    // left/right) reported against reference.jpeg. Never go below cover.
    const scale = Math.max(cols / video.videoWidth, rows / video.videoHeight) * Math.max(zoom, 1);
    const drawW = video.videoWidth * scale;
    const drawH = video.videoHeight * scale;
    const offX = (cols - drawW) / 2;
    const offY = (rows - drawH) / 2;

    offCtx.drawImage(video, offX, offY, drawW, drawH);

    let blurred = null;
    if (cfg.proximityEnabled && cfg.mouseBlur > 0) {
      blurCtx.filter = `blur(${cfg.mouseBlur}px)`;
      blurCtx.drawImage(video, offX, offY, drawW, drawH);
      blurCtx.filter = 'none';
      blurred = blurCtx.getImageData(0, 0, cols, rows).data;
    }

    const data = offCtx.getImageData(0, 0, cols, rows).data;
    const dpr = window.devicePixelRatio || 1;
    const step = cell / 64;

    // Clear in device-pixel space (canvas.width/height), not CSS w/h: the
    // per-shape draws below set an absolute device-pixel transform and
    // leave it at identity when the loop ends, so a w/h clear under that
    // identity transform only wiped the top-left 1/dpr fraction of the
    // canvas on any dpr>1 screen — the rest never got cleared, which read
    // as "the video only renders in the top-left corner."
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let fill = '';

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = (y * cols + x) * 4;
        let v = brightness([data[idx], data[idx + 1], data[idx + 2], data[idx + 3]]);

        if (cfg.proximityEnabled) {
          const dx = (x + 0.5) * cell - px;
          const dy = (y + 0.5) * cell - py;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const a = Math.pow(Math.max(0, 1 - dist / cfg.proximityRadius), 2);
          if (a > 0 && blurred) {
            const bv = brightness([blurred[idx], blurred[idx + 1], blurred[idx + 2], blurred[idx + 3]]);
            v = v * (1 - a * cfg.mouseBlurAmount) + bv * (a * cfg.mouseBlurAmount);
          }
        }

        let shape = -1;
        if (v >= cfg.t1) shape = 0;
        else if (v >= cfg.t2) shape = 1;
        else if (v >= cfg.t3) shape = 2;
        else continue;

        if (fill !== shapeCss) {
          ctx.fillStyle = shapeCss;
          fill = shapeCss;
        }
        ctx.setTransform(step * dpr, 0, 0, step * dpr, x * cell * dpr, y * cell * dpr);
        ctx.fill(shapes[shape]);
      }
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    raf = requestAnimationFrame(frame);
  };

  const start = () => {
    if (started) return;
    started = true;
    resize();
    window.addEventListener('mousemove', onMove);
    try { video.currentTime = 0; } catch {}
    const p = video.play();
    if (p) p.catch(() => {});
    if (!raf) frame();
  };

  const stop = () => {
    started = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    video.pause();
    window.removeEventListener('mousemove', onMove);
  };

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resetViewportMax);
  // Deliberately NOT listening to visualViewport resize/scroll: those fire
  // as mobile browser chrome (address bar/toolbar) animates in and out, and
  // re-running resize() on every one of those visibly resized/redrew the
  // whole dithered image. viewportSize()'s max-tracking (above) already
  // makes plain resize() a no-op for chrome-driven shrinks on touch devices,
  // so there's nothing for a visualViewport listener to add here.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) start();
  });

  // Video is muted, so browsers allow autoplay with no user gesture — start
  // immediately on load instead of waiting for a first interaction.
  start();

  return { start, stop };
}
