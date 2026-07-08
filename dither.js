export function createDitherBg({ canvas, video, config = {} }) {
  if (!canvas || !video) return null;

  const ctx = canvas.getContext('2d');
  const off = document.createElement('canvas');
  const offCtx = off.getContext('2d', { willReadFrequently: true });
  const blurCanvas = document.createElement('canvas');
  const blurCtx = blurCanvas.getContext('2d', { willReadFrequently: true });

  const cfg = {
    cell: 7,
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
    new Path2D('M37 0C37 6.08722 37.6501 10.9695 39.1162 14.8174C42.8741 13.1333 46.787 10.1417 51.0918 5.83691L58.1631 12.9082C53.8588 17.2125 50.8658 21.1244 49.1816 24.8818C53.0297 26.3483 57.912 27 64 27V37C57.9123 37 53.0296 37.6499 49.1816 39.1162C50.8657 42.8742 53.8582 46.7869 58.1631 51.0918L51.0918 58.1631C46.7867 53.858 42.8743 50.8647 39.1162 49.1807C37.6497 53.0288 37 57.9119 37 64H27C27 57.9122 26.3492 53.0297 24.8828 49.1816C21.1251 50.8658 17.2128 53.8585 12.9082 58.1631L5.83691 51.0918C10.1417 46.787 13.1333 42.8741 14.8174 39.1162C10.9695 37.6501 6.08722 37 0 37V27C6.08756 27 10.9694 26.3481 14.8174 24.8818C13.1332 21.1244 10.1411 17.2124 5.83691 12.9082L12.9082 5.83691C17.2124 10.1411 21.1244 13.1332 24.8818 14.8174C26.3481 10.9694 27 6.08756 27 0H37Z'),
    new Path2D('M27 0H37C37 20 44 27 64 27V37C44 37 37 44 37 64H27C27 44 20 37 0 37V27C20 27 27 20 27 0Z'),
    new Path2D('M0 37V27H64V37H0Z'),
  ];

  let raf = null;
  let px = -9999;
  let py = -9999;
  let started = false;

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

  const brightness = (px4) => {
    let v = (0.299 * px4[0] + 0.587 * px4[1] + 0.114 * px4[2]) / 255;
    if (cfg.invert) v = 1 - v;
    v += cfg.brightness;
    v = v - 0.5 + cfg.contrast * 0.5;
    if (cfg.gamma) v = Math.pow(v, 1 / cfg.gamma);
    return Math.max(0, Math.min(1, v));
  };

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cell = cfg.cell;
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

  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    px = e.clientX - r.left;
    py = e.clientY - r.top;
  };

  const frame = () => {
    if (!video.videoWidth || !video.videoHeight || video.readyState < 2) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      raf = requestAnimationFrame(frame);
      return;
    }

    const w = window.innerWidth;
    const h = window.innerHeight;
    const cell = cfg.cell;
    const cols = off.width || Math.ceil(w / cell);
    const rows = off.height || Math.ceil(h / cell);
    const zoom = window.innerWidth <= 640 ? 0.9 : (cfg.zoom || 1);
    const scale = Math.max(cols / video.videoWidth, rows / video.videoHeight) * zoom;
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

    ctx.clearRect(0, 0, w, h);
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
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) start();
  });
  ['touchstart', 'click', 'keydown', 'wheel'].forEach((evt) => {
    document.addEventListener(evt, start, { once: true, passive: true });
  });

  return { start, stop };
}