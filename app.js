'use strict';
(() => {
/* ================= Helfer ================= */
const TAU = Math.PI * 2;
const $ = (s, r = document) => r.querySelector(s);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  }
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    e.append(c.nodeType ? c : document.createTextNode(c));
  }
  return e;
}
function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex) || ['', '000000'];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgbToHex = (r, g, b) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
function hsvToRgb(hh, s, v) {
  const f = n => { const k = (n + hh / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return [f(5) * 255, f(3) * 255, f(1) * 255];
}
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let hh = 0;
  if (d) {
    if (mx === r) hh = ((g - b) / d) % 6; else if (mx === g) hh = (b - r) / d + 2; else hh = (r - g) / d + 4;
    hh *= 60; if (hh < 0) hh += 360;
  }
  return [hh, mx ? d / mx : 0, mx];
}
function makeCanvas(w, hh) { const c = document.createElement('canvas'); c.width = w; c.height = hh; return c; }
function copyCanvas(src) { const c = makeCanvas(src.width, src.height); c.getContext('2d').drawImage(src, 0, 0); return c; }
function cropCanvas(src, x, y, w, hh) { const c = makeCanvas(w, hh); c.getContext('2d').drawImage(src, x, y, w, hh, 0, 0, w, hh); return c; }
function canvasToBlob(c, type, q) { return new Promise(res => c.toBlob(res, type, q)); }

let toastTimer;
function toast(msg, ms = 2200) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

/* ================= Einstellungen ================= */
const settings = { fingerDraws: true, autoPen: true, pressure: true };
try { Object.assign(settings, JSON.parse(localStorage.getItem('km_settings') || '{}')); } catch (e) {}
const saveSettings = () => { try { localStorage.setItem('km_settings', JSON.stringify(settings)); } catch (e) {} };

/* ================= Formate / Werkzeuge ================= */
const FORMATS = {
  a6p: { label: 'A6 hoch', sub: '105 × 148 mm', mm: [105, 148] },
  a6l: { label: 'A6 quer', sub: '148 × 105 mm', mm: [148, 105] },
  a5p: { label: 'A5 hoch', sub: '148 × 210 mm', mm: [148, 210] },
  a5l: { label: 'A5 quer', sub: '210 × 148 mm', mm: [210, 148] },
  sq:  { label: 'Quadrat', sub: '148 × 148 mm', mm: [148, 148] },
  dl:  { label: 'DL hoch', sub: '99 × 210 mm', mm: [99, 210] },
};
const PAPERS = ['#ffffff', '#fbf3e0', '#d8bb8c', '#b3261e', '#1f5a3a', '#1b2a4a', '#222222'];
const PALETTE = ['#000000', '#ffffff', '#b3261e', '#e53935', '#ff8a80', '#ef6c00', '#f9a825', '#fff176', '#1b5e20', '#2e7d32', '#81c784', '#0277bd', '#4fc3f7', '#283593', '#6a1b9a', '#ec407a', '#6d4c41', '#bcaaa4', '#9e9e9e', '#d4af37', '#c0c0c0'];
const EMOJIS = ['🎄', '⭐', '❄️', '🎁', '🔔', '🕯️', '🦌', '🎅', '🤶', '⛄', '🌟', '✨', '🍪', '🧦', '🕊️', '❤️', '🎀', '🍬', '🌲', '🍊'];
const FONTS = [
  ['Sans', 'sans-serif'], ['Serif', 'serif'], ['Schreibschrift', 'cursive'], ['Dick', '"Arial Black", Impact, sans-serif'], ['Schreibmaschine', 'monospace']
];

const TOOLS = [
  { id: 'pen', name: 'Füller', icon: '✒️', brush: true, mm: 0.9, op: 1, smooth: 3, press: true },
  { id: 'pencil', name: 'Bleistift', icon: '✏️', brush: true, mm: 0.7, op: 1, smooth: 1, press: true },
  { id: 'calli', name: 'Kalligrafie', icon: '✍️', brush: true, mm: 3, op: 1, smooth: 4, press: true },
  { id: 'brush', name: 'Pinsel', icon: '🖌️', brush: true, mm: 4, op: 1, smooth: 3, press: true },
  { id: 'water', name: 'Aquarell', icon: '🎨', brush: true, mm: 9, op: 0.45, smooth: 4, press: true },
  { id: 'marker', name: 'Marker', icon: '🖍️', brush: true, mm: 5, op: 0.5, smooth: 3, press: false },
  { id: 'chalk', name: 'Kreide', icon: '🌫️', brush: true, mm: 5, op: 1, smooth: 2, press: true },
  { id: 'spray', name: 'Spray', icon: '💨', brush: true, mm: 10, op: 1, smooth: 0, press: false },
  { id: 'snow', name: 'Schnee', icon: '❄️', brush: true, mm: 14, op: 1, smooth: 0, press: false },
  { id: 'glitter', name: 'Glitzer', icon: '✨', brush: true, mm: 12, op: 1, smooth: 0, press: false },
  { id: 'eraser', name: 'Radierer', icon: '🧽', brush: true, mm: 4, op: 1, smooth: 1, press: true },
  { id: 'fill', name: 'Füllen', icon: '🪣', tol: 40, allLayers: true },
  { id: 'pick', name: 'Pipette', icon: '🧪' },
  { id: 'shape', name: 'Form', icon: '◻️', mm: 0.9, op: 1, kind: 'line', filled: false },
  { id: 'text', name: 'Text', icon: '🔤', font: 0, bold: false, italic: false, mm: 10, txt: '' },
  { id: 'stamp', name: 'Stempel', icon: '🎄', mm: 16, emoji: '🎄', rotate: true },
  { id: 'move', name: 'Schieben', icon: '✥' },
];
const T = id => TOOLS.find(t => t.id === id);

/* ================= Zustand ================= */
let doc = null;           // aktuelle Karte
let buf = null;           // Strich-Puffer
let view = { x: 0, y: 0, s: 1 };
let curTool = T('pen');
let color = '#b3261e';
let recent = [];
let S = null;             // aktiver Strich
let hover = null;
let sawPen = false;
let dirty = true;
const hist = { u: [], r: [] };
const HMAX = 60;
const MAX_LAYERS = 12;

const cv = $('#view');
const ctx = cv.getContext('2d', { alpha: false, desynchronized: true });
let dpr = 1;

const invalidate = () => { dirty = true; };
const mmToPx = mm => mm * doc.dpi / 25.4;
const activeLayer = () => doc && doc.layers[doc.active];

/* ================= Ebenen ================= */
function newLayer(name) {
  const c = makeCanvas(doc.w, doc.h);
  return { id: uid(), name, canvas: c, ctx: c.getContext('2d'), visible: true, opacity: 1, blend: 'source-over', locked: false };
}

function createDoc({ name, fmt, dpi, paper }) {
  const mm = FORMATS[fmt].mm;
  doc = {
    id: uid(), name, fmt, dpi, paper, mm,
    w: Math.round(mm[0] / 25.4 * dpi), h: Math.round(mm[1] / 25.4 * dpi),
    layers: [], active: 1,
  };
  const bg = newLayer('Papier');
  bg.ctx.fillStyle = paper; bg.ctx.fillRect(0, 0, doc.w, doc.h);
  doc.layers.push(bg, newLayer('Ebene 1'));
  buf = makeCanvas(doc.w, doc.h);
  hist.u.length = 0; hist.r.length = 0;
  afterDocChange(true);
  markDirty();
  try { localStorage.setItem('km_last', doc.id); } catch (e) {}
}

function afterDocChange(fit) {
  $('#docName').textContent = doc.name;
  if (fit) fitView();
  refreshLayers(); updateUndoBtns(); invalidate();
}

/* ================= Verlauf (Rückgängig) ================= */
function pushHist(e) {
  hist.u.push(e); if (hist.u.length > HMAX) hist.u.shift();
  hist.r.length = 0; updateUndoBtns(); markDirty();
}
function undo() { const e = hist.u.pop(); if (!e) return; e.undo(); hist.r.push(e); afterHist(); }
function redo() { const e = hist.r.pop(); if (!e) return; e.redo(); hist.u.push(e); afterHist(); }
function afterHist() { updateUndoBtns(); refreshLayers(); invalidate(); markDirty(); }
function updateUndoBtns() { $('#btnUndo').disabled = !hist.u.length; $('#btnRedo').disabled = !hist.r.length; }
function restoreRect(L, x, y, c) {
  L.ctx.clearRect(x, y, c.width, c.height); L.ctx.drawImage(c, x, y);
}
function pixEntry(L, x, y, before, after) {
  return { undo: () => restoreRect(L, x, y, before), redo: () => restoreRect(L, x, y, after) };
}
function clampBox(b) {
  const x0 = clamp(Math.floor(b.x0), 0, doc.w), y0 = clamp(Math.floor(b.y0), 0, doc.h);
  const x1 = clamp(Math.ceil(b.x1), 0, doc.w), y1 = clamp(Math.ceil(b.y1), 0, doc.h);
  return (x1 > x0 && y1 > y0) ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
}
// Vorher-Bild aus Momentaufnahme + Nachher-Bild aus Ebene -> Verlauf
function commitBox(L, snap, box) {
  const r = clampBox(box); if (!r) return;
  pushHist(pixEntry(L, r.x, r.y, cropCanvas(snap, r.x, r.y, r.w, r.h), cropCanvas(L.canvas, r.x, r.y, r.w, r.h)));
}
const newBox = () => ({ x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 });
function grow(b, x, y, r) { b.x0 = Math.min(b.x0, x - r); b.y0 = Math.min(b.y0, y - r); b.x1 = Math.max(b.x1, x + r); b.y1 = Math.max(b.y1, y + r); }

/* ================= Rendern ================= */
function resize() {
  const st = $('#stage'); const r = st.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
  invalidate();
}
function fitView() {
  const r = $('#stage').getBoundingClientRect(); if (!doc || !r.width) return;
  const pad = 28;
  const s = Math.min((r.width - pad * 2) / doc.w, (r.height - pad * 2) / doc.h);
  view.s = s; view.x = (r.width - doc.w * s) / 2; view.y = (r.height - doc.h * s) / 2;
  invalidate();
}
function render() {
  const W = cv.width, H = cv.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#efe6d9'; ctx.fillRect(0, 0, W, H);
  $('#zFit').textContent = doc ? Math.round(view.s * 100) + '%' : '';
  if (!doc) return;
  ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.x, dpr * view.y);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 26 * dpr; ctx.shadowOffsetY = 6 * dpr;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, doc.w, doc.h);
  ctx.restore();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = view.s < 1 ? 'medium' : 'low';
  if (view.s > 2) ctx.imageSmoothingEnabled = false;
  doc.layers.forEach((L, i) => {
    if (!L.visible) return;
    ctx.globalAlpha = L.opacity; ctx.globalCompositeOperation = L.blend;
    ctx.drawImage(L.canvas, 0, 0);
    if (S && S.buf && i === doc.active) {
      ctx.globalAlpha = L.opacity * S.tool.op;
      ctx.drawImage(buf, 0, 0);
    }
  });
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  drawGuides();
  // Pinsel-Ring
  if (hover && curTool.brush && !S) {
    const r = Math.max(2, mmToPx(curTool.mm) / 2 * view.s);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(0,0,0,.7)';
    ctx.beginPath(); ctx.arc(hover.x, hover.y, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(hover.x, hover.y, r + 1, 0, TAU); ctx.stroke();
  }
}
(function loop() { if (dirty) { dirty = false; render(); } requestAnimationFrame(loop); })();

function drawGuides() {
  const g = settings.guides || 0, mm = doc.dpi / 25.4, lw = 1.5 / view.s;
  ctx.save(); ctx.lineWidth = lw; ctx.strokeStyle = 'rgba(217,69,61,.55)'; ctx.setLineDash([8 / view.s, 6 / view.s]);
  if (g >= 1) {
    ctx.beginPath(); ctx.moveTo(doc.w / 2, 0); ctx.lineTo(doc.w / 2, doc.h); ctx.moveTo(0, doc.h / 2); ctx.lineTo(doc.w, doc.h / 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(46,155,87,.7)'; ctx.strokeRect(5 * mm, 5 * mm, doc.w - 10 * mm, doc.h - 10 * mm);
  }
  if (g >= 2) {
    ctx.setLineDash([]); ctx.strokeStyle = 'rgba(80,120,200,.28)'; ctx.lineWidth = 1 / view.s; ctx.beginPath();
    for (let x = 10 * mm; x < doc.w; x += 10 * mm) { ctx.moveTo(x, 0); ctx.lineTo(x, doc.h); }
    for (let y = 10 * mm; y < doc.h; y += 10 * mm) { ctx.moveTo(0, y); ctx.lineTo(doc.w, y); }
    ctx.stroke();
  }
  if (symMode !== 'off') {
    ctx.setLineDash([]); ctx.strokeStyle = 'rgba(155,60,200,.55)'; ctx.lineWidth = 1.5 / view.s; ctx.beginPath();
    const cx = doc.w / 2, cy = doc.h / 2, L = Math.hypot(doc.w, doc.h);
    if (symMode === 'mir') { ctx.moveTo(cx, 0); ctx.lineTo(cx, doc.h); }
    else { const n = { r3: 3, r4: 4, r6: 6, r8: 8, k6: 6 }[symMode]; for (let k = 0; k < n; k++) { const a = k * TAU / n - Math.PI / 2; ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L); } }
    ctx.stroke();
  }
  ctx.restore();
}
function compose(target, scale = 1, bg = '#fff') {
  const c = target || makeCanvas(doc.w * scale, doc.h * scale);
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);
  x.imageSmoothingQuality = 'high';
  for (const L of doc.layers) {
    if (!L.visible) continue;
    x.globalAlpha = L.opacity; x.globalCompositeOperation = L.blend;
    x.drawImage(L.canvas, 0, 0, c.width, c.height);
  }
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  return c;
}

/* ================= Zeichnen ================= */
const sprites = {};
function softSprite(col) {
  if (sprites[col]) return sprites[col];
  const c = makeCanvas(128, 128), x = c.getContext('2d');
  const [r, g, b] = hexToRgb(col);
  const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, `rgba(${r},${g},${b},1)`); gr.addColorStop(.35, `rgba(${r},${g},${b},.85)`);
  gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  sprites[col] = c; return c;
}

function pressureOf(e) {
  if (e.pointerType !== 'pen' || !settings.pressure) return 1;
  const p = e.pressure > 0 ? e.pressure : 0.5;
  return clamp(Math.pow(p, 0.65), 0.04, 1);
}

// Einen Stempel setzen; liefert Radius (für Rahmen)
function stamp(x2, tool, x, y, p, col) {
  const base = mmToPx(tool.mm) / 2;
  const sc = dpiScale();
  let r = base;
  switch (tool.id) {
    case 'pen':
      r = base * (tool.press ? 0.22 + 0.78 * p : 1);
      x2.fillStyle = col; x2.beginPath(); x2.arc(x, y, r, 0, TAU); x2.fill(); break;
    case 'pencil': {
      r = base * (tool.press ? 0.5 + 0.5 * p : 1);
      x2.fillStyle = col;
      const n = Math.ceil(r * 1.6) + 3;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * r;
        x2.globalAlpha = (0.35 + 0.5 * Math.random()) * (tool.press ? 0.35 + 0.65 * p : 1);
        x2.beginPath(); x2.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, (0.5 + Math.random() * 0.7) * sc, 0, TAU); x2.fill();
      }
      x2.globalAlpha = 1; break;
    }
    case 'brush': {
      r = base * (tool.press ? 0.4 + 0.6 * p : 1);
      x2.globalAlpha = 0.25 + 0.5 * (tool.press ? p : 1);
      x2.drawImage(softSprite(col), x - r, y - r, r * 2, r * 2);
      x2.globalAlpha = 1; break;
    }
    case 'marker':
      x2.fillStyle = col; x2.beginPath(); x2.ellipse(x, y, base, base * 0.38, -Math.PI / 4, 0, TAU); x2.fill(); break;
    case 'spray': {
      x2.fillStyle = col;
      const n = Math.max(8, Math.round(base * 0.9));
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * base;
        x2.globalAlpha = 0.5 + Math.random() * 0.5;
        x2.beginPath(); x2.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, (0.5 + Math.random() * 1.1) * sc, 0, TAU); x2.fill();
      }
      x2.globalAlpha = 1; break;
    }
    case 'calli': {
      r = base * (tool.press ? 0.55 + 0.45 * p : 1);
      x2.fillStyle = col; x2.beginPath(); x2.ellipse(x, y, r, r * 0.22, -Math.PI / 4, 0, TAU); x2.fill(); break;
    }
    case 'water': {
      r = base * (tool.press ? 0.6 + 0.4 * p : 1);
      const jr = r * (0.85 + Math.random() * 0.3), jx = (Math.random() - 0.5) * r * 0.3, jy = (Math.random() - 0.5) * r * 0.3;
      x2.globalAlpha = 0.07 + 0.05 * Math.random();
      x2.drawImage(softSprite(col), x + jx - jr, y + jy - jr, jr * 2, jr * 2);
      x2.globalAlpha = 1; break;
    }
    case 'chalk': {
      r = base * (tool.press ? 0.6 + 0.4 * p : 1);
      x2.fillStyle = col;
      const n = Math.ceil(r * r * 0.06) + 8;
      for (let i = 0; i < n; i++) {
        if (Math.random() < 0.3) continue;
        const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * r, sz = (0.8 + Math.random() * 2) * sc;
        x2.globalAlpha = 0.55 + Math.random() * 0.45;
        x2.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, sz, sz * (0.6 + Math.random() * 0.8));
      }
      x2.globalAlpha = 1; break;
    }
    case 'snow': {
      x2.fillStyle = col; x2.strokeStyle = col;
      const n = Math.max(3, Math.round(base * 0.1));
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * base, fr = Math.max(sc * 1.6, base * 0.05) * (0.5 + Math.random() * Math.random() * 2.6);
        const fx = x + Math.cos(a) * d, fy = y + Math.sin(a) * d;
        if (fr > base * 0.07 && fr > 5 * sc && Math.random() < 0.5) {
          x2.globalAlpha = 0.9; x2.lineWidth = Math.max(1, fr * 0.22); x2.lineCap = 'round'; x2.beginPath();
          const rot = Math.random() * Math.PI;
          for (let k = 0; k < 3; k++) { const aa = rot + k * Math.PI / 3; x2.moveTo(fx - Math.cos(aa) * fr * 1.6, fy - Math.sin(aa) * fr * 1.6); x2.lineTo(fx + Math.cos(aa) * fr * 1.6, fy + Math.sin(aa) * fr * 1.6); }
          x2.stroke();
        } else {
          x2.globalAlpha = 0.55 + Math.random() * 0.45; x2.drawImage(softSprite(col), fx - fr, fy - fr, fr * 2, fr * 2);
        }
      }
      x2.globalAlpha = 1; break;
    }
    case 'glitter': {
      const n = Math.max(3, Math.round(base * 0.1)), pal = [col, col, '#ffffff', '#fff2b3'];
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * base, gr = Math.max(sc * 1.5, base * 0.035) * (0.7 + Math.random() * Math.random() * 3);
        const gx = x + Math.cos(a) * d, gy = y + Math.sin(a) * d;
        x2.fillStyle = pal[(Math.random() * pal.length) | 0]; x2.globalAlpha = 0.6 + Math.random() * 0.4;
        x2.beginPath();
        if (Math.random() < 0.55) { x2.arc(gx, gy, gr * 0.6, 0, TAU); }
        else { const k = 0.28; x2.moveTo(gx, gy - gr * 2); x2.quadraticCurveTo(gx + gr * k, gy - gr * k, gx + gr * 2, gy); x2.quadraticCurveTo(gx + gr * k, gy + gr * k, gx, gy + gr * 2); x2.quadraticCurveTo(gx - gr * k, gy + gr * k, gx - gr * 2, gy); x2.quadraticCurveTo(gx - gr * k, gy - gr * k, gx, gy - gr * 2); }
        x2.fill();
      }
      x2.globalAlpha = 1; break;
    }
    case 'eraser':
      r = base * (tool.press ? 0.4 + 0.6 * p : 1);
      x2.fillStyle = '#000'; x2.beginPath(); x2.arc(x, y, r, 0, TAU); x2.fill(); break;
  }
  return r;
}
const dpiScale = () => doc.dpi / 300 * 1.2;

function stepFor(tool, p) {
  const r = mmToPx(tool.mm) / 2;
  switch (tool.id) {
    case 'spray': case 'snow': case 'glitter': return Math.max(2, r * 0.3);
    case 'chalk': return Math.max(1, r * 0.3);
    case 'water': return Math.max(1, r * 0.18);
    case 'pencil': return Math.max(1, r * 0.35);
    case 'brush': return Math.max(1, r * 0.12);
    default: return Math.max(0.7, r * 0.18);
  }
}

const SYMS = [['off', 'Aus'], ['mir', 'Spiegel'], ['r3', '3×'], ['r4', '4×'], ['r6', '6×'], ['r8', '8×'], ['k6', 'Kaleido']];
let symMode = 'off';
function symPoints(x, y) {
  if (symMode === 'off' || !doc) return [[x, y]];
  const cx = doc.w / 2, cy = doc.h / 2;
  if (symMode === 'mir') return [[x, y], [doc.w - x, y]];
  const n = { r3: 3, r4: 4, r6: 6, r8: 8, k6: 6 }[symMode], dx = x - cx, dy = y - cy, out = [];
  for (let k = 0; k < n; k++) {
    const a = k * TAU / n, c = Math.cos(a), sn = Math.sin(a), rx = dx * c - dy * sn, ry = dx * sn + dy * c;
    out.push([cx + rx, cy + ry]);
    if (symMode === 'k6') out.push([cx - rx, cy + ry]);
  }
  return out;
}
function stampSym(x2, tool, x, y, p, col, box) {
  let r = 0;
  for (const [sx, sy] of symPoints(x, y)) { r = stamp(x2, tool, sx, sy, p, col); grow(box, sx, sy, r + 4); }
  return r;
}

function beginStroke(e) {
  const L = activeLayer();
  if (!L || !L.visible) { toast('Diese Ebene ist ausgeblendet'); return; }
  if (L.locked) { toast('Diese Ebene ist gesperrt 🔒'); return; }
  let tool = curTool;
  if (e.pointerType === 'pen' && (e.buttons & 32)) tool = T('eraser');
  const pt = docPt(e);
  S = {
    tool, L, pid: e.pointerId, type: e.pointerType, snap: copyCanvas(L.canvas), box: newBox(),
    buf: tool.id !== 'eraser', color,
    sp: { x: pt.x, y: pt.y, p: pressureOf(e) }, last: null, carry: 0, start: pt,
  };
  if (tool.id === 'eraser') { L.ctx.save(); L.ctx.globalCompositeOperation = 'destination-out'; }
  else buf.getContext('2d').clearRect(0, 0, doc.w, doc.h);
  S.last = { x: pt.x, y: pt.y, p: S.sp.p };
  const x2 = S.buf ? buf.getContext('2d') : L.ctx;
  stampSym(x2, tool, pt.x, pt.y, S.sp.p, color, S.box);
  invalidate();
}

function strokeTo(e) {
  const pt = docPt(e), pr = pressureOf(e);
  const k = 1 - clamp(S.tool.smooth * 0.085, 0, 0.8);
  S.sp.x += (pt.x - S.sp.x) * k; S.sp.y += (pt.y - S.sp.y) * k; S.sp.p += (pr - S.sp.p) * 0.5;
  segment({ x: S.sp.x, y: S.sp.y, p: S.sp.p });
}
function segment(b) {
  const a = S.last, dx = b.x - a.x, dy = b.y - a.y, total = Math.hypot(dx, dy);
  if (total < 0.01) return;
  const x2 = S.buf ? buf.getContext('2d') : S.L.ctx;
  const step = stepFor(S.tool, b.p);
  let pos = step - S.carry, stamped = false;
  while (pos <= total) {
    const t = pos / total;
    const x = a.x + dx * t, y = a.y + dy * t, p = a.p + (b.p - a.p) * t;
    stampSym(x2, S.tool, x, y, p, S.color, S.box);
    pos += step; stamped = true;
  }
  S.carry = stamped ? total - (pos - step) : S.carry + total;
  S.last = b; invalidate();
}
function endStroke(e, cancel) {
  if (!S) return;
  const s = S; S = null;
  if (cancel) { cancelDraw(s); return; }
  if (s.kind) { endSpecial(s); return; }
  // Rest der Glättung nachziehen
  if (e) {
    S = s;
    const pt = docPt(e); segment({ x: pt.x, y: pt.y, p: s.last.p });
    S = null;
  }
  if (s.tool.id === 'eraser') s.L.ctx.restore();
  else {
    const r = clampBox(s.box);
    if (r) {
      s.L.ctx.save(); s.L.ctx.globalAlpha = s.tool.op;
      s.L.ctx.drawImage(buf, r.x, r.y, r.w, r.h, r.x, r.y, r.w, r.h);
      s.L.ctx.restore();
    }
    buf.getContext('2d').clearRect(0, 0, doc.w, doc.h);
  }
  commitBox(s.L, s.snap, s.box);
  refreshLayers(); invalidate();
}
function cancelDraw(s) {
  if (s.tool && s.tool.id === 'eraser') s.L.ctx.restore();
  if (s.snap && !s.kind) { s.L.ctx.clearRect(0, 0, doc.w, doc.h); s.L.ctx.drawImage(s.snap, 0, 0); }
  if (s.kind === 'move') { s.L.ctx.clearRect(0, 0, doc.w, doc.h); s.L.ctx.drawImage(s.snap, 0, 0); }
  buf.getContext('2d').clearRect(0, 0, doc.w, doc.h);
  invalidate();
}
function cancelStroke() { if (S) { const s = S; S = null; cancelDraw(s); } }

/* ---- Formen ---- */
function beginShape(e) {
  const L = activeLayer();
  if (!L || !L.visible) { toast('Diese Ebene ist ausgeblendet'); return; }
  if (L.locked) { toast('Diese Ebene ist gesperrt 🔒'); return; }
  const pt = docPt(e);
  S = { kind: 'shape', tool: curTool, L, pid: e.pointerId, snap: copyCanvas(L.canvas), start: pt, cur: pt, buf: true, color };
  buf.getContext('2d').clearRect(0, 0, doc.w, doc.h);
}
function drawShape(s) {
  const x = buf.getContext('2d'); x.clearRect(0, 0, doc.w, doc.h);
  const a = s.start, b = s.cur, t = s.tool;
  x.lineWidth = Math.max(1, mmToPx(t.mm)); x.lineJoin = 'round'; x.lineCap = 'round';
  x.strokeStyle = s.color; x.fillStyle = s.color;
  x.beginPath();
  if (t.kind === 'line') { x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke(); }
  else if (t.kind === 'rect') {
    x.rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    t.filled ? x.fill() : x.stroke();
  } else {
    x.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, TAU);
    t.filled ? x.fill() : x.stroke();
  }
  invalidate();
}

/* ---- Schieben ---- */
function beginMove(e) {
  const L = activeLayer();
  if (!L || L.locked) { toast('Diese Ebene ist gesperrt 🔒'); return; }
  S = { kind: 'move', tool: curTool, L, pid: e.pointerId, snap: copyCanvas(L.canvas), start: docPt(e), dx: 0, dy: 0 };
}
function endSpecial(s) {
  if (s.kind === 'shape') {
    const w = mmToPx(s.tool.mm) + 4;
    const box = newBox(); grow(box, s.start.x, s.start.y, w); grow(box, s.cur.x, s.cur.y, w);
    const r = clampBox(box);
    if (r) {
      s.L.ctx.save(); s.L.ctx.globalAlpha = s.tool.op;
      s.L.ctx.drawImage(buf, r.x, r.y, r.w, r.h, r.x, r.y, r.w, r.h); s.L.ctx.restore();
      commitBox(s.L, s.snap, box);
    }
    buf.getContext('2d').clearRect(0, 0, doc.w, doc.h);
  } else if (s.kind === 'move') {
    if (Math.abs(s.dx) + Math.abs(s.dy) > 0.5) {
      const before = s.snap, after = copyCanvas(s.L.canvas), L = s.L;
      pushHist({ undo: () => restoreRect(L, 0, 0, before), redo: () => restoreRect(L, 0, 0, after) });
    }
  }
  refreshLayers(); invalidate();
}

/* ---- Füllen ---- */
function floodFill(px, py) {
  const L = activeLayer();
  if (!L || !L.visible) { toast('Diese Ebene ist ausgeblendet'); return; }
  if (L.locked) { toast('Diese Ebene ist gesperrt 🔒'); return; }
  const w = doc.w, hh = doc.h, t = curTool;
  const x0 = Math.floor(px), y0 = Math.floor(py);
  if (x0 < 0 || y0 < 0 || x0 >= w || y0 >= hh) return;
  const srcCanvas = t.allLayers ? compose(null, 1, '#ffffff') : L.canvas;
  const sd = srcCanvas.getContext('2d').getImageData(0, 0, w, hh).data;
  const i0 = (y0 * w + x0) * 4, tr = sd[i0], tg = sd[i0 + 1], tb = sd[i0 + 2], ta = sd[i0 + 3];
  const tol = t.tol;
  const match = i => Math.abs(sd[i] - tr) + Math.abs(sd[i + 1] - tg) + Math.abs(sd[i + 2] - tb) + Math.abs(sd[i + 3] - ta) <= tol * 2;
  let mask = new Uint8Array(w * hh);
  const stack = [x0, y0];
  while (stack.length) {
    const cy = stack.pop(), cx = stack.pop();
    let x = cx; const row = cy * w;
    if (mask[row + x] || !match((row + x) * 4)) continue;
    while (x > 0 && !mask[row + x - 1] && match((row + x - 1) * 4)) x--;
    let up = false, down = false;
    while (x < w && !mask[row + x] && match((row + x) * 4)) {
      mask[row + x] = 1;
      if (cy > 0) { const j = row - w + x, ok = !mask[j] && match(j * 4); if (ok && !up) { stack.push(x, cy - 1); up = true; } else if (!ok) up = false; }
      if (cy < hh - 1) { const j = row + w + x, ok = !mask[j] && match(j * 4); if (ok && !down) { stack.push(x, cy + 1); down = true; } else if (!ok) down = false; }
      x++;
    }
  }
  // 1 px verbreitern (gegen helle Ränder an Linien)
  const m2 = mask.slice();
  for (let y = 0; y < hh; y++) {
    const r = y * w;
    for (let x = 0; x < w; x++) {
      const i = r + x; if (mask[i]) continue;
      if ((x > 0 && mask[i - 1]) || (x < w - 1 && mask[i + 1]) || (y > 0 && mask[i - w]) || (y < hh - 1 && mask[i + w])) m2[i] = 1;
    }
  }
  mask = m2;
  const box = newBox();
  for (let y = 0; y < hh; y++) { const r = y * w; for (let x = 0; x < w; x++) if (mask[r + x]) { if (x < box.x0) box.x0 = x; if (x > box.x1) box.x1 = x; if (y < box.y0) box.y0 = y; if (y > box.y1) box.y1 = y; } }
  box.x1 += 1; box.y1 += 1;
  const rect = clampBox(box); if (!rect) return;
  const before = cropCanvas(L.canvas, rect.x, rect.y, rect.w, rect.h);
  const id = L.ctx.getImageData(rect.x, rect.y, rect.w, rect.h), d = id.data, [cr, cg, cb] = hexToRgb(color);
  for (let y = 0; y < rect.h; y++) for (let x = 0; x < rect.w; x++) {
    if (mask[(y + rect.y) * w + x + rect.x]) { const k = (y * rect.w + x) * 4; d[k] = cr; d[k + 1] = cg; d[k + 2] = cb; d[k + 3] = 255; }
  }
  L.ctx.putImageData(id, rect.x, rect.y);
  pushHist(pixEntry(L, rect.x, rect.y, before, cropCanvas(L.canvas, rect.x, rect.y, rect.w, rect.h)));
  addRecent(color); refreshLayers(); invalidate();
}

/* ---- Pipette ---- */
function pickColor(e) {
  const r = cv.getBoundingClientRect();
  render();
  const x = Math.round((e.clientX - r.left) * dpr), y = Math.round((e.clientY - r.top) * dpr);
  if (x < 0 || y < 0 || x >= cv.width || y >= cv.height) return;
  const d = ctx.getImageData(x, y, 1, 1).data;
  setColor(rgbToHex(d[0], d[1], d[2]), false);
}

/* ---- Stempel ---- */
function placeStamp(pt) {
  const L = activeLayer();
  if (!L || !L.visible) { toast('Diese Ebene ist ausgeblendet'); return; }
  if (L.locked) { toast('Diese Ebene ist gesperrt 🔒'); return; }
  const t = curTool, size = mmToPx(t.mm), snap = copyCanvas(L.canvas);
  L.ctx.save(); L.ctx.translate(pt.x, pt.y);
  if (t.rotate) L.ctx.rotate((Math.random() - 0.5) * 0.7);
  L.ctx.font = `${size}px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif`;
  L.ctx.textAlign = 'center'; L.ctx.textBaseline = 'middle';
  L.ctx.fillText(t.emoji, 0, 0);
  L.ctx.restore();
  const b = newBox(); grow(b, pt.x, pt.y, size * 1.2);
  commitBox(L, snap, b); refreshLayers(); invalidate();
}

/* ---- Text ---- */
function textDialog(pt) {
  const L = activeLayer();
  if (!L || !L.visible) { toast('Diese Ebene ist ausgeblendet'); return; }
  if (L.locked) { toast('Diese Ebene ist gesperrt 🔒'); return; }
  const t = curTool;
  const ta = h('textarea', { placeholder: 'Frohe Weihnachten!' }); ta.value = t.txt || '';
  const fontSel = h('select', {}, FONTS.map((f, i) => h('option', { value: i, text: f[0] })));
  fontSel.value = t.font;
  const bold = h('button', { class: 'chip' + (t.bold ? ' on' : ''), text: 'Fett', onclick: ev => { t.bold = !t.bold; ev.target.classList.toggle('on', t.bold); } });
  const ital = h('button', { class: 'chip' + (t.italic ? ' on' : ''), text: 'Kursiv', onclick: ev => { t.italic = !t.italic; ev.target.classList.toggle('on', t.italic); } });
  const sz = h('input', { type: 'range', min: 3, max: 60, value: t.mm });
  const szl = h('b', { text: t.mm + ' mm' }); sz.oninput = () => { szl.textContent = sz.value + ' mm'; };
  const body = h('div', {},
    h('label', { class: 'fld' }, h('span', { text: 'Text' }), ta),
    h('label', { class: 'fld' }, h('span', { text: 'Schrift' }), fontSel),
    h('div', { class: 'fld' }, h('span', { text: 'Stil & Größe (Schrifthöhe)' }), h('div', { style: 'display:flex;gap:8px;align-items:center' }, bold, ital, sz, szl)));
  openModal('Text einfügen', body, [
    { label: 'Abbrechen' },
    { label: 'Einfügen', cls: 'pri', fn: () => {
      const text = ta.value.trim(); if (!text) return false;
      t.txt = ta.value; t.font = +fontSel.value; t.mm = +sz.value;
      drawText(L, pt, text, t);
    } },
  ]);
  setTimeout(() => ta.focus(), 100);
}
function drawText(L, pt, text, t) {
  const size = mmToPx(t.mm), snap = copyCanvas(L.canvas), x = L.ctx;
  x.save();
  x.font = `${t.italic ? 'italic ' : ''}${t.bold ? 'bold ' : ''}${size}px ${FONTS[t.font][1]}`;
  x.fillStyle = color; x.textAlign = 'center'; x.textBaseline = 'middle';
  const lines = text.split('\n'), lh = size * 1.25;
  let maxW = 0;
  lines.forEach((ln, i) => {
    const yy = pt.y - (lines.length * lh) / 2 + lh / 2 + i * lh;
    x.fillText(ln, pt.x, yy); maxW = Math.max(maxW, x.measureText(ln).width);
  });
  x.restore();
  const b = newBox(); grow(b, pt.x - maxW / 2, pt.y - lines.length * lh / 2, 0); grow(b, pt.x + maxW / 2, pt.y + lines.length * lh / 2, 0);
  b.x0 -= size * .4; b.x1 += size * .4; b.y0 -= size * .4; b.y1 += size * .4;
  commitBox(L, snap, b); addRecent(color); refreshLayers(); invalidate();
}

/* ================= Eingabe ================= */
const touches = new Map();
let gesture = null;
const docPt = e => {
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left - view.x) / view.s, y: (e.clientY - r.top - view.y) / view.s };
};
function startGesture() {
  const [a, b] = [...touches.values()];
  gesture = {
    cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) || 1, v: { ...view },
    t0: performance.now(), tap: true, three: false,
  };
}
function updateGesture() {
  const [a, b] = [...touches.values()];
  const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
  if (Math.abs(d / gesture.d - 1) > 0.08 || Math.hypot(cx - gesture.cx, cy - gesture.cy) > 14) gesture.tap = false;
  const s = clamp(gesture.v.s * d / gesture.d, 0.05, 10);
  const px = (gesture.cx - gesture.v.x) / gesture.v.s, py = (gesture.cy - gesture.v.y) / gesture.v.s;
  view.s = s; view.x = cx - px * s; view.y = cy - py * s; invalidate();
}

cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (!doc) return;
  if (e.pointerType === 'pen' && !sawPen) {
    sawPen = true;
    if (settings.autoPen && settings.fingerDraws) { settings.fingerDraws = false; saveSettings(); toast('Stift erkannt: Finger = Zoomen/Verschieben (2 Finger)', 3200); }
  }
  const rect = cv.getBoundingClientRect();
  if (e.pointerType === 'touch') {
    touches.set(e.pointerId, { x: e.clientX - rect.left, y: e.clientY - rect.top });
    if (touches.size >= 2) { cancelStroke(); if (touches.size === 2) startGesture(); else if (gesture) gesture.three = true; return; }
    if (!settings.fingerDraws) return;
  }
  if (S) return;
  try { cv.setPointerCapture(e.pointerId); } catch (err) {}
  const id = (e.pointerType === 'pen' && (e.buttons & 32)) ? 'eraser' : curTool.id;
  if (id === 'fill') { floodFill(...Object.values(docPt(e))); return; }
  if (id === 'pick') { S = { kind: 'pick', pid: e.pointerId }; pickColor(e); return; }
  if (id === 'stamp') { placeStamp(docPt(e)); return; }
  if (id === 'text') { textDialog(docPt(e)); return; }
  if (id === 'shape') { beginShape(e); return; }
  if (id === 'move') { beginMove(e); return; }
  beginStroke(e);
});
cv.addEventListener('pointermove', e => {
  const rect = cv.getBoundingClientRect();
  hover = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  if (e.pointerType === 'touch') {
    if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: hover.x, y: hover.y });
    if (gesture && touches.size >= 2) { updateGesture(); return; }
  }
  if (!S || S.pid !== e.pointerId) { if (e.pointerType !== 'touch') invalidate(); return; }
  e.preventDefault();
  if (S.kind === 'pick') { pickColor(e); return; }
  const pt = docPt(e);
  if (S.kind === 'shape') { S.cur = pt; drawShape(S); return; }
  if (S.kind === 'move') {
    S.dx = pt.x - S.start.x; S.dy = pt.y - S.start.y;
    S.L.ctx.clearRect(0, 0, doc.w, doc.h); S.L.ctx.drawImage(S.snap, Math.round(S.dx), Math.round(S.dy)); invalidate(); return;
  }
  const evs = (e.getCoalescedEvents && e.getCoalescedEvents()) || [];
  if (evs.length) evs.forEach(ce => strokeTo(ce)); else strokeTo(e);
});
function up(e) {
  if (e.pointerType === 'touch') {
    if (gesture && gesture.tap && e.type === 'pointerup' && performance.now() - gesture.t0 < 380) {
      gesture.tap = false;
      if (gesture.three) { redo(); toast('Wiederholen ↷', 900); } else { undo(); toast('Rückgängig ↶', 900); }
    }
    touches.delete(e.pointerId);
    if (touches.size < 2) gesture = null;
  }
  if (S && S.pid === e.pointerId) {
    if (S.kind === 'pick') { S = null; addRecent(color); return; }
    endStroke(e.type === 'pointercancel' && e.pointerType === 'touch' ? null : e, e.type === 'pointercancel' && e.pointerType === 'touch');
  }
}
cv.addEventListener('pointerup', up);
cv.addEventListener('pointercancel', up);
cv.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') { hover = null; invalidate(); } });
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('wheel', e => {
  e.preventDefault();
  const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
  zoomAt(mx, my, e.deltaY < 0 ? 1.15 : 1 / 1.15);
}, { passive: false });
function zoomAt(mx, my, f) {
  const s = clamp(view.s * f, 0.05, 10), px = (mx - view.x) / view.s, py = (my - view.y) / view.s;
  view.s = s; view.x = mx - px * s; view.y = my - py * s; invalidate();
}
$('#zIn').onclick = () => { const r = cv.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 1.3); };
$('#zOut').onclick = () => { const r = cv.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 1 / 1.3); };
$('#zFit').onclick = fitView;
const GUIDE_NAMES = ['Hilfslinien aus', 'Mitte & Rand', 'Mitte, Rand & Raster'];
$('#zGrid').onclick = () => { settings.guides = ((settings.guides || 0) + 1) % 3; saveSettings(); $('#zGrid').classList.toggle('on', !!settings.guides); toast(GUIDE_NAMES[settings.guides], 1400); invalidate(); };
window.addEventListener('resize', () => { resize(); fitView(); });
window.addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input,textarea,select')) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
});

/* ================= Werkzeugleiste & Optionen ================= */
const sizeToSlider = mm => Math.round(100 * Math.pow(clamp((mm - 0.2) / 29.8, 0, 1), 1 / 2.2));
const sliderToSize = v => Math.round((0.2 + 29.8 * Math.pow(v / 100, 2.2)) * 10) / 10;
const fmtMm = mm => (mm < 10 ? mm.toFixed(1) : Math.round(mm)) + ' mm';

function buildTools() {
  const nav = $('#tools'); nav.innerHTML = '';
  TOOLS.forEach(t => nav.append(h('button', {
    class: t.id === curTool.id ? 'on' : '', title: t.name,
    onclick: () => selectTool(t.id),
  }, h('span', { text: t.id === 'stamp' ? t.emoji : t.icon }), h('small', { text: t.name }))));
}
function selectTool(id) {
  curTool = T(id); S = null; buildTools(); buildOpts(); invalidate();
}
function slider(label, min, max, val, fmt, on) {
  const inp = h('input', { type: 'range', min, max, value: val }), out = h('b', { text: fmt(val) });
  inp.oninput = () => { out.textContent = fmt(+inp.value); on(+inp.value); invalidate(); };
  return h('div', { class: 'opt' }, label, inp, out);
}
function buildOpts() {
  const bar = $('#optbar'); bar.innerHTML = ''; const t = curTool;
  const sizeSl = (lab = 'Größe') => slider(lab, 0, 100, sizeToSlider(t.mm), v => fmtMm(sliderToSize(v)), v => { t.mm = sliderToSize(v); });
  if (t.brush) {
    bar.append(sizeSl());
    if (t.id !== 'eraser') bar.append(slider('Deckkraft', 5, 100, Math.round(t.op * 100), v => v + '%', v => { t.op = v / 100; }));
    if (!['spray', 'snow', 'glitter'].includes(t.id)) bar.append(slider('Glättung', 0, 10, t.smooth, v => v, v => { t.smooth = v; }));
    if (['pen', 'pencil', 'calli', 'brush', 'water', 'chalk', 'eraser'].includes(t.id))
      bar.append(h('button', { class: 'chip' + (settings.pressure ? ' on' : ''), text: 'Druck', onclick: ev => { settings.pressure = !settings.pressure; saveSettings(); ev.currentTarget.classList.toggle('on', settings.pressure); } }));
    bar.append(h('button', { class: 'chip' + (symMode !== 'off' ? ' on' : ''), text: 'Symmetrie: ' + SYMS.find(x => x[0] === symMode)[1], onclick: () => { const i = SYMS.findIndex(x => x[0] === symMode); symMode = SYMS[(i + 1) % SYMS.length][0]; buildOpts(); invalidate(); } }));
    if (t.id === 'snow') bar.append(h('span', { class: 'hint', text: 'Tipp: Farbe Weiß auf farbigem Papier' }));
  } else if (t.id === 'fill') {
    bar.append(slider('Toleranz', 0, 120, t.tol, v => v, v => { t.tol = v; }));
    bar.append(h('button', { class: 'chip' + (t.allLayers ? ' on' : ''), text: 'Alle Ebenen beachten', onclick: ev => { t.allLayers = !t.allLayers; ev.currentTarget.classList.toggle('on', t.allLayers); } }));
    bar.append(h('span', { class: 'hint', text: 'Tippen = Fläche füllen (auf der gewählten Ebene)' }));
  } else if (t.id === 'pick') {
    bar.append(h('span', { class: 'hint', text: 'Tippen und halten: Farbe aus dem Bild aufnehmen' }));
  } else if (t.id === 'shape') {
    [['line', 'Linie'], ['rect', 'Rechteck'], ['ellipse', 'Kreis/Ellipse']].forEach(([k, n]) =>
      bar.append(h('button', { class: 'chip' + (t.kind === k ? ' on' : ''), text: n, onclick: () => { t.kind = k; buildOpts(); } })));
    bar.append(h('button', { class: 'chip' + (t.filled ? ' on' : ''), text: 'Gefüllt', onclick: ev => { t.filled = !t.filled; ev.currentTarget.classList.toggle('on', t.filled); } }));
    bar.append(sizeSl('Linie'));
    bar.append(slider('Deckkraft', 5, 100, Math.round(t.op * 100), v => v + '%', v => { t.op = v / 100; }));
  } else if (t.id === 'text') {
    bar.append(h('span', { class: 'hint', text: 'Auf die Karte tippen, dann Text eingeben. Farbe = aktuelle Farbe.' }));
  } else if (t.id === 'stamp') {
    EMOJIS.forEach(em => bar.append(h('button', { class: 'chip em' + (t.emoji === em ? ' on' : ''), text: em, onclick: () => { t.emoji = em; buildTools(); buildOpts(); } })));
    bar.append(sizeSl('Größe'));
    bar.append(h('button', { class: 'chip' + (t.rotate ? ' on' : ''), text: 'Leicht drehen', onclick: ev => { t.rotate = !t.rotate; ev.currentTarget.classList.toggle('on', t.rotate); } }));
  } else if (t.id === 'move') {
    bar.append(h('span', { class: 'hint', text: 'Inhalt der gewählten Ebene verschieben (Ziehen)' }));
  }
}

/* ================= Farben ================= */
function addRecent(c) { c = c.toLowerCase(); recent = [c, ...recent.filter(x => x !== c)].slice(0, 8); buildColors(); }
function setColor(c, rec = true) { color = c; if (rec) addRecent(c); else buildColors(); }
function buildColors() {
  const f = $('#colors'); f.innerHTML = '';
  f.append(h('div', { class: 'cur', style: 'background:' + color, onclick: openPicker }));
  f.append(h('button', { class: 'plus', text: '＋', title: 'Eigene Farbe', onclick: openPicker }));
  if (recent.length) { f.append(h('span', { class: 'vsep' })); recent.forEach(c => f.append(h('button', { class: 'sw' + (c === color ? ' on' : ''), style: 'background:' + c, onclick: () => setColor(c, false) }))); }
  f.append(h('span', { class: 'vsep' }));
  PALETTE.forEach(c => f.append(h('button', { class: 'sw' + (c === color ? ' on' : ''), style: 'background:' + c, onclick: () => setColor(c) })));
}
function openPicker() {
  let [hh, ss, vv] = rgbToHsv(...hexToRgb(color));
  const sv = h('canvas', { id: 'svBox', width: 260, height: 190 });
  const hue = h('input', { type: 'range', min: 0, max: 360, value: hh, style: 'width:260px' });
  const hex = h('input', { type: 'text', value: color, style: 'width:260px;text-align:center' });
  const prev = h('div', { style: 'width:260px;height:30px;border-radius:8px;background:' + color });
  const x = sv.getContext('2d');
  const paint = () => {
    x.fillStyle = `hsl(${hh},100%,50%)`; x.fillRect(0, 0, 260, 190);
    let g = x.createLinearGradient(0, 0, 260, 0); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 260, 190);
    g = x.createLinearGradient(0, 0, 0, 190); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, '#000'); x.fillStyle = g; x.fillRect(0, 0, 260, 190);
    x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.arc(ss * 260, (1 - vv) * 190, 9, 0, TAU); x.stroke();
    x.strokeStyle = '#000'; x.lineWidth = 1; x.beginPath(); x.arc(ss * 260, (1 - vv) * 190, 11, 0, TAU); x.stroke();
    const c = rgbToHex(...hsvToRgb(hh, ss, vv)); hex.value = c; prev.style.background = c;
  };
  const pickAt = ev => { const r = sv.getBoundingClientRect(); ss = clamp((ev.clientX - r.left) / r.width, 0, 1); vv = 1 - clamp((ev.clientY - r.top) / r.height, 0, 1); paint(); };
  sv.onpointerdown = ev => { sv.setPointerCapture(ev.pointerId); pickAt(ev); sv.onpointermove = pickAt; };
  sv.onpointerup = () => { sv.onpointermove = null; };
  hue.oninput = () => { hh = +hue.value; paint(); };
  hex.onchange = () => { if (/^#?[0-9a-f]{6}$/i.test(hex.value)) { const c = hex.value.startsWith('#') ? hex.value : '#' + hex.value; [hh, ss, vv] = rgbToHsv(...hexToRgb(c)); hue.value = hh; paint(); } };
  paint();
  openModal('Farbe wählen', h('div', { class: 'pick' }, sv, hue, prev, hex), [
    { label: 'Abbrechen' }, { label: 'Übernehmen', cls: 'pri', fn: () => setColor(rgbToHex(...hsvToRgb(hh, ss, vv))) },
  ]);
}

/* ================= Ebenen-Panel ================= */
let panelOpen = false;
$('#btnLayers').onclick = () => { panelOpen = !panelOpen; $('#layersPanel').classList.toggle('hidden', !panelOpen); $('#btnLayers').classList.toggle('on', panelOpen); setTimeout(() => { resize(); fitView(); }, 30); refreshLayers(); };

function refreshLayers() {
  if (!panelOpen || !doc) return;
  const P = $('#layersPanel'); P.innerHTML = '';
  P.append(h('div', { class: 'lhead' }, h('span', { text: 'Ebenen (' + doc.layers.length + ')' }), h('button', { class: 'chip', text: '✕', onclick: () => $('#btnLayers').click() })));
  const list = h('div', { class: 'llist' });
  for (let i = doc.layers.length - 1; i >= 0; i--) {
    const L = doc.layers[i], th = makeCanvas(50, 50), tx = th.getContext('2d');
    const sc = Math.min(50 / doc.w, 50 / doc.h); tx.drawImage(L.canvas, (50 - doc.w * sc) / 2, (50 - doc.h * sc) / 2, doc.w * sc, doc.h * sc);
    list.append(h('div', { class: 'lrow' + (i === doc.active ? ' sel' : ''), onclick: () => { doc.active = i; refreshLayers(); } },
      th,
      h('div', { class: 'ln', onclick: ev => { if (i === doc.active) { ev.stopPropagation(); renameLayer(L); } } }, L.name, h('small', { text: Math.round(L.opacity * 100) + '%' + (L.blend !== 'source-over' ? ' · ' + blendName(L.blend) : '') })),
      h('button', { class: L.visible ? '' : 'off', text: L.visible ? '👁' : '🚫', onclick: ev => { ev.stopPropagation(); L.visible = !L.visible; refreshLayers(); invalidate(); markDirty(); } }),
      h('button', { class: L.locked ? '' : 'off', text: L.locked ? '🔒' : '🔓', onclick: ev => { ev.stopPropagation(); L.locked = !L.locked; refreshLayers(); markDirty(); } })));
  }
  P.append(list);
  const L = activeLayer();
  const op = h('input', { type: 'range', min: 0, max: 100, value: Math.round(L.opacity * 100) });
  const opl = h('b', { text: Math.round(L.opacity * 100) + '%', style: 'width:42px;text-align:right' });
  op.oninput = () => { L.opacity = op.value / 100; opl.textContent = op.value + '%'; invalidate(); };
  op.onchange = () => { refreshLayers(); markDirty(); };
  const bl = h('select', {}, [['source-over', 'Normal'], ['multiply', 'Multiplizieren'], ['screen', 'Aufhellen (Screen)'], ['overlay', 'Überlagern']].map(([v, n]) => h('option', { value: v, text: n })));
  bl.value = L.blend; bl.onchange = () => { L.blend = bl.value; invalidate(); refreshLayers(); markDirty(); };
  P.append(h('div', { class: 'lprops' }, h('label', {}, 'Deckkraft', op, opl), h('label', {}, 'Mischmodus', bl)));
  P.append(h('div', { class: 'lbtns' },
    h('button', { title: 'Neue Ebene', text: '＋', onclick: addLayer }),
    h('button', { title: 'Duplizieren', text: '⧉', onclick: dupLayer }),
    h('button', { title: 'Nach oben', text: '↑', onclick: () => moveLayer(1) }),
    h('button', { title: 'Nach unten', text: '↓', onclick: () => moveLayer(-1) }),
    h('button', { title: 'Nach unten zusammenführen', text: '⤓', onclick: mergeDown }),
    h('button', { title: 'Löschen', text: '🗑', onclick: delLayer })));
}
const blendName = b => ({ multiply: 'Multiplizieren', screen: 'Screen', overlay: 'Überlagern' }[b] || b);
function renameLayer(L) {
  const inp = h('input', { type: 'text', value: L.name });
  openModal('Ebene umbenennen', h('div', { class: 'fld' }, inp), [{ label: 'Abbrechen' }, { label: 'OK', cls: 'pri', fn: () => { L.name = inp.value.trim() || L.name; refreshLayers(); markDirty(); } }]);
  setTimeout(() => { inp.focus(); inp.select(); }, 80);
}
function addLayer() {
  if (doc.layers.length >= MAX_LAYERS) { toast('Maximal ' + MAX_LAYERS + ' Ebenen'); return; }
  const L = newLayer('Ebene ' + (doc.layers.length)), i = doc.active + 1, prev = doc.active;
  doc.layers.splice(i, 0, L); doc.active = i;
  pushHist({ undo: () => { doc.layers.splice(doc.layers.indexOf(L), 1); doc.active = Math.min(prev, doc.layers.length - 1); }, redo: () => { doc.layers.splice(i, 0, L); doc.active = i; } });
  refreshLayers(); invalidate();
}
function dupLayer() {
  if (doc.layers.length >= MAX_LAYERS) { toast('Maximal ' + MAX_LAYERS + ' Ebenen'); return; }
  const src = activeLayer(), L = newLayer(src.name + ' Kopie');
  L.ctx.drawImage(src.canvas, 0, 0); L.opacity = src.opacity; L.blend = src.blend;
  const i = doc.active + 1, prev = doc.active;
  doc.layers.splice(i, 0, L); doc.active = i;
  pushHist({ undo: () => { doc.layers.splice(doc.layers.indexOf(L), 1); doc.active = Math.min(prev, doc.layers.length - 1); }, redo: () => { doc.layers.splice(i, 0, L); doc.active = i; } });
  refreshLayers(); invalidate();
}
function moveLayer(dir) {
  const i = doc.active, j = i + dir;
  if (j < 0 || j >= doc.layers.length) return;
  const sw = (a, b) => { [doc.layers[a], doc.layers[b]] = [doc.layers[b], doc.layers[a]]; };
  sw(i, j); doc.active = j;
  pushHist({ undo: () => { sw(j, i); doc.active = i; }, redo: () => { sw(i, j); doc.active = j; } });
  refreshLayers(); invalidate();
}
function delLayer() {
  if (doc.layers.length <= 1) { toast('Die letzte Ebene kann nicht gelöscht werden'); return; }
  const i = doc.active, L = doc.layers[i];
  doc.layers.splice(i, 1); doc.active = Math.max(0, i - 1);
  pushHist({ undo: () => { doc.layers.splice(i, 0, L); doc.active = i; }, redo: () => { doc.layers.splice(doc.layers.indexOf(L), 1); doc.active = Math.max(0, i - 1); } });
  refreshLayers(); invalidate();
}
function mergeDown() {
  const i = doc.active; if (i === 0) { toast('Darunter ist keine Ebene'); return; }
  const up = doc.layers[i], lo = doc.layers[i - 1], before = copyCanvas(lo.canvas);
  const doMerge = () => { lo.ctx.save(); lo.ctx.globalAlpha = up.opacity; lo.ctx.globalCompositeOperation = up.blend; lo.ctx.drawImage(up.canvas, 0, 0); lo.ctx.restore(); doc.layers.splice(doc.layers.indexOf(up), 1); doc.active = doc.layers.indexOf(lo); };
  doMerge();
  const after = copyCanvas(lo.canvas);
  pushHist({ undo: () => { restoreRect(lo, 0, 0, before); doc.layers.splice(i, 0, up); doc.active = i; }, redo: () => { restoreRect(lo, 0, 0, after); doc.layers.splice(doc.layers.indexOf(up), 1); doc.active = doc.layers.indexOf(lo); } });
  refreshLayers(); invalidate();
}

/* ================= Dialoge ================= */
let closeModalFn = null;
function openModal(title, content, buttons = []) {
  const m = $('#modal'); m.innerHTML = '';
  const close = () => { m.classList.remove('open'); m.innerHTML = ''; closeModalFn = null; };
  const box = h('div', { class: 'box' }, h('h2', { text: title }), content,
    buttons.length ? h('div', { class: 'btns' }, buttons.map(b => h('button', { class: 'btn ' + (b.cls || ''), text: b.label, onclick: async () => { if (b.fn && (await b.fn()) === false) return; close(); } }))) : null);
  m.append(box); m.classList.add('open'); closeModalFn = close;
  m.onpointerdown = ev => { if (ev.target === m) close(); };
  return close;
}

function newDocDialog(first) {
  const st = { fmt: 'a6p', paper: '#ffffff', dpi: 300 };
  const name = h('input', { type: 'text', value: 'Weihnachtskarte' });
  const fmts = h('div', { class: 'grid' });
  const paps = h('div', { class: 'grid', style: 'grid-template-columns:repeat(7,1fr)' });
  const dpi = h('select', {}, [[300, 'Druckqualität (300 dpi)'], [200, 'Leicht (200 dpi) – schneller bei A5']].map(([v, n]) => h('option', { value: v, text: n })));
  const draw = () => {
    fmts.innerHTML = ''; paps.innerHTML = '';
    Object.entries(FORMATS).forEach(([k, f]) => fmts.append(h('button', { class: 'opt-btn' + (st.fmt === k ? ' on' : ''), onclick: () => { st.fmt = k; draw(); } }, h('b', { text: f.label }), h('br'), h('small', { text: f.sub, style: 'color:var(--mut)' }))));
    PAPERS.forEach(p => paps.append(h('button', { class: 'pap' + (st.paper === p ? ' on' : ''), style: 'background:' + p, onclick: () => { st.paper = p; draw(); } })));
  };
  draw();
  const body = h('div', {}, h('label', { class: 'fld' }, h('span', { text: 'Name' }), name), h('div', { class: 'fld' }, h('span', { text: 'Format' }), fmts),
    h('div', { class: 'fld' }, h('span', { text: 'Papierfarbe' }), paps), h('label', { class: 'fld' }, h('span', { text: 'Auflösung' }), dpi));
  openModal(first ? 'Willkommen! Neue Karte' : 'Neue Karte', body, [
    first ? null : { label: 'Abbrechen' },
    { label: 'Karte anlegen', cls: 'pri', fn: async () => { if (doc) await saveDoc(); createDoc({ name: name.value.trim() || 'Karte', fmt: st.fmt, dpi: +dpi.value, paper: st.paper }); } },
  ].filter(Boolean));
}

function menuDialog() {
  const item = (label, sub, fn) => h('button', { onclick: () => { closeModalFn && closeModalFn(); setTimeout(fn, 30); } }, label, sub ? h('small', { text: sub }) : null);
  const body = h('div', { class: 'menu' },
    item('📄 Neue Karte', '', () => newDocDialog(false)),
    item('🗂 Meine Karten', 'gespeicherte Karten öffnen', galleryDialog),
    item('🖼 Foto / Bild einfügen', 'auf neue Ebene', () => $('#fileIn').click()),
    item('🧹 Ebene leeren', '', clearLayer),
    item('⚙️ Einstellungen', '', settingsDialog),
    deferredInstall ? item('📲 Als App installieren', '', async () => { deferredInstall.prompt(); deferredInstall = null; }) : null,
    item('❓ Hilfe', '', helpDialog));
  openModal('Menü', body, [{ label: 'Schließen' }]);
}
function clearLayer() {
  const L = activeLayer(); if (L.locked) { toast('Ebene gesperrt'); return; }
  const before = copyCanvas(L.canvas); L.ctx.clearRect(0, 0, doc.w, doc.h);
  pushHist({ undo: () => restoreRect(L, 0, 0, before), redo: () => L.ctx.clearRect(0, 0, doc.w, doc.h) });
  refreshLayers(); invalidate();
}
function settingsDialog() {
  const tg = (label, sub, key) => {
    const sw = h('div', { class: 'sw2' + (settings[key] ? ' on' : '') });
    return h('div', { class: 'row', onclick: () => { settings[key] = !settings[key]; sw.classList.toggle('on', settings[key]); saveSettings(); buildOpts(); } },
      h('div', {}, h('div', { text: label }), h('small', { text: sub, style: 'color:var(--mut)' })), sw);
  };
  openModal('Einstellungen', h('div', {},
    tg('Mit dem Finger zeichnen', 'Aus = nur der Stift zeichnet, Finger zoomen/verschieben mit 2 Fingern (Handballen stört nicht)', 'fingerDraws'),
    tg('Automatisch Stiftmodus', 'Sobald der Stift benutzt wird, zeichnet der Finger nicht mehr', 'autoPen'),
    tg('Druckempfindlichkeit', 'S-Pen-Druck verändert Strichstärke', 'pressure')), [{ label: 'Fertig', cls: 'pri' }]);
}
function helpDialog() {
  openModal('Kurzhilfe', h('div', { style: 'line-height:1.6' },
    h('p', { html: '' }),
    h('div', {}, '✍️ Mit dem S Pen zeichnen. Mit 2 Fingern zoomen und verschieben.'),
    h('div', {}, '↶ ↷ Rückgängig / Wiederholen (jeder Strich einzeln).'),
    h('div', {}, '▦ Ebenen: unten Papier, darüber beliebig viele Ebenen. Tippe auf den Namen einer markierten Ebene zum Umbenennen.'),
    h('div', {}, '🪣 Füllen: Mit „Alle Ebenen beachten“ kann man Flächen einer Linien-Ebene auf einer Farb-Ebene darunter ausmalen.'),
    h('div', {}, '⬆ Export: PDF, Bild, Teilen (z. B. WhatsApp) und Drucken.'),
    h('div', {}, '💾 Deine Karte wird automatisch gespeichert („Meine Karten“).'),
    h('div', {}, 'S-Pen-Taste gedrückt halten = Radierer.')), [{ label: 'OK', cls: 'pri' }]);
}

/* ================= Bild einfügen ================= */
$('#fileIn').onchange = async ev => {
  const f = ev.target.files[0]; ev.target.value = ''; if (!f || !doc) return;
  if (doc.layers.length >= MAX_LAYERS) { toast('Maximal ' + MAX_LAYERS + ' Ebenen'); return; }
  try {
    const bmp = await createImageBitmap(f);
    const L = newLayer('Bild'), sc = Math.min(doc.w / bmp.width, doc.h / bmp.height, 1) * 0.9;
    const w = bmp.width * sc, hh = bmp.height * sc;
    L.ctx.drawImage(bmp, (doc.w - w) / 2, (doc.h - hh) / 2, w, hh);
    const i = doc.active + 1, prev = doc.active; doc.layers.splice(i, 0, L); doc.active = i;
    pushHist({ undo: () => { doc.layers.splice(doc.layers.indexOf(L), 1); doc.active = Math.min(prev, doc.layers.length - 1); }, redo: () => { doc.layers.splice(i, 0, L); doc.active = i; } });
    refreshLayers(); invalidate(); toast('Bild eingefügt – mit „Schieben“ positionieren');
  } catch (e) { toast('Bild konnte nicht geladen werden'); }
};

/* ================= Speichern (IndexedDB) ================= */
const DB = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      const r = indexedDB.open('drawit', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('docs', { keyPath: 'id' });
      r.onsuccess = () => { this.db = r.result; res(this.db); };
      r.onerror = () => rej(r.error);
    });
  },
  async tx(mode, fn) {
    const db = await this.open();
    return new Promise((res, rej) => { const t = db.transaction('docs', mode), s = t.objectStore('docs'); const rq = fn(s); t.oncomplete = () => res(rq && rq.result); t.onerror = () => rej(t.error); });
  },
  put(rec) { return this.tx('readwrite', s => s.put(rec)); },
  get(id) { return this.tx('readonly', s => s.get(id)); },
  all() { return this.tx('readonly', s => s.getAll()); },
  del(id) { return this.tx('readwrite', s => s.delete(id)); },
};
let saveTimer = null, saving = false, pending = false, saveWarned = false;
function markDirty() { clearTimeout(saveTimer); saveTimer = setTimeout(saveDoc, 2500); }
async function saveDoc() {
  if (!doc) return;
  if (saving) { pending = true; return; }
  saving = true; clearTimeout(saveTimer);
  try {
    const d = doc;
    const layers = [];
    for (const L of d.layers) layers.push({ id: L.id, name: L.name, visible: L.visible, opacity: L.opacity, blend: L.blend, locked: L.locked, blob: await canvasToBlob(L.canvas, 'image/png') });
    const th = makeCanvas(240, Math.round(240 * d.h / d.w)); const tx = th.getContext('2d'); tx.fillStyle = '#fff'; tx.fillRect(0, 0, th.width, th.height);
    tx.drawImage(compose(null, 1), 0, 0, th.width, th.height);
    const thumb = await canvasToBlob(th, 'image/jpeg', 0.8);
    await DB.put({ id: d.id, name: d.name, fmt: d.fmt, dpi: d.dpi, paper: d.paper, w: d.w, h: d.h, mm: d.mm, active: d.active, updated: Date.now(), thumb, layers });
    try { localStorage.setItem('km_last', d.id); } catch (e) {}
  } catch (e) { console.warn('Speichern fehlgeschlagen', e); if (!saveWarned) { saveWarned = true; toast('Automatisches Speichern ist hier nicht möglich – bitte als PDF/Bild exportieren', 5000); } }
  saving = false;
  if (pending) { pending = false; markDirty(); }
}
async function loadDoc(id) {
  const rec = await DB.get(id); if (!rec) return false;
  doc = { id: rec.id, name: rec.name, fmt: rec.fmt, dpi: rec.dpi, paper: rec.paper, mm: rec.mm, w: rec.w, h: rec.h, layers: [], active: rec.active || 0 };
  for (const l of rec.layers) {
    const L = newLayer(l.name); L.id = l.id; L.visible = l.visible; L.opacity = l.opacity; L.blend = l.blend; L.locked = l.locked;
    const bmp = await createImageBitmap(l.blob); L.ctx.drawImage(bmp, 0, 0); doc.layers.push(L);
  }
  doc.active = Math.min(doc.active, doc.layers.length - 1);
  buf = makeCanvas(doc.w, doc.h); hist.u.length = 0; hist.r.length = 0;
  afterDocChange(true);
  try { localStorage.setItem('km_last', doc.id); } catch (e) {}
  return true;
}
async function galleryDialog() {
  if (doc) await saveDoc();
  const recs = (await DB.all()).sort((a, b) => b.updated - a.updated);
  const grid = h('div', { class: 'gal' });
  if (!recs.length) grid.append(h('div', { class: 'hint', text: 'Noch keine Karten gespeichert.' }));
  for (const r of recs) {
    const url = URL.createObjectURL(r.thumb);
    grid.append(h('div', { class: 'card' }, h('img', { src: url }), h('div', { class: 'cn', text: r.name }),
      h('div', { class: 'cs', text: (FORMATS[r.fmt] ? FORMATS[r.fmt].label : '') + ' · ' + new Date(r.updated).toLocaleDateString('de-DE') }),
      h('div', { class: 'cb' },
        h('button', { text: 'Öffnen', onclick: async () => { closeModalFn && closeModalFn(); await loadDoc(r.id); } }),
        h('button', { text: 'Kopie', onclick: async () => { const full = await DB.get(r.id); full.id = uid(); full.name += ' Kopie'; full.updated = Date.now(); await DB.put(full); galleryDialog(); } }),
        h('button', { text: '🗑', onclick: async () => { if (doc && doc.id === r.id) { toast('Die geöffnete Karte kann hier nicht gelöscht werden'); return; } await DB.del(r.id); galleryDialog(); } }))));
  }
  openModal('Meine Karten', grid, [{ label: 'Schließen' }]);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) saveDoc(); });
window.addEventListener('pagehide', () => saveDoc());

/* ================= Export ================= */
function safeName() { return (doc.name || 'Karte').replace(/[^\wäöüÄÖÜß\- ]+/g, '').trim().replace(/\s+/g, '_') || 'Karte'; }
async function makeJpegBlob() { return canvasToBlob(compose(null, 1, '#ffffff'), 'image/jpeg', 0.95); }
async function makePngBlob() { return canvasToBlob(compose(null, 1, '#ffffff'), 'image/png'); }
async function makePdfBlob() {
  const jpg = new Uint8Array(await (await makeJpegBlob()).arrayBuffer());
  const wpt = doc.mm[0] / 25.4 * 72, hpt = doc.mm[1] / 25.4 * 72, f = n => n.toFixed(3);
  const enc = new TextEncoder(), parts = [], offs = []; let pos = 0;
  const add = d => { const u = typeof d === 'string' ? enc.encode(d) : d; parts.push(u); pos += u.length; };
  add('%PDF-1.4\n');
  const obj = (n, body) => { offs[n] = pos; add(`${n} 0 obj\n${body}\nendobj\n`); };
  obj(1, '<</Type/Catalog/Pages 2 0 R>>');
  obj(2, '<</Type/Pages/Kids[3 0 R]/Count 1>>');
  obj(3, `<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${f(wpt)} ${f(hpt)}]/Resources<</XObject<</Im0 4 0 R>>>>/Contents 5 0 R>>`);
  offs[4] = pos;
  add(`4 0 obj\n<</Type/XObject/Subtype/Image/Width ${doc.w}/Height ${doc.h}/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ${jpg.length}>>\nstream\n`);
  add(jpg); add('\nendstream\nendobj\n');
  const content = `q ${f(wpt)} 0 0 ${f(hpt)} 0 0 cm /Im0 Do Q`;
  obj(5, `<</Length ${content.length}>>\nstream\n${content}\nendstream`);
  const xr = pos;
  let x = 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) x += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
  x += `trailer\n<</Size 6/Root 1 0 R/Info<</Title(${safeName()})/Producer(DrawIt)>>>>\nstartxref\n${xr}\n%%EOF`;
  add(x);
  return new Blob(parts, { type: 'application/pdf' });
}
function download(blob, name) {
  const a = h('a', { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}
async function outFile(kind, share) {
  await saveDoc();
  toast('Wird erstellt …', 6000);
  let blob, name, type;
  try {
    if (kind === 'pdf') { blob = await makePdfBlob(); name = safeName() + '.pdf'; type = 'application/pdf'; }
    else { blob = await makePngBlob(); name = safeName() + '.png'; type = 'image/png'; }
  } catch (e) { toast('Export fehlgeschlagen'); return; }
  $('#toast').classList.remove('show');
  if (share && navigator.canShare) {
    const file = new File([blob], name, { type });
    if (navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: doc.name }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
  }
  download(blob, name); toast('Gespeichert: ' + name + ' (Downloads)');
}
async function printCard() {
  await saveDoc();
  const blob = await makeJpegBlob(), url = URL.createObjectURL(blob);
  let st = $('#pageStyle'); if (!st) { st = h('style', { id: 'pageStyle' }); document.head.append(st); }
  st.textContent = `@page{size:${doc.mm[0]}mm ${doc.mm[1]}mm;margin:0}`;
  const pa = $('#printArea'); pa.innerHTML = ''; const img = h('img', { src: url }); pa.append(img);
  await img.decode().catch(() => {});
  setTimeout(() => window.print(), 100);
}
function exportDialog() {
  const b = (label, sub, fn, cls) => h('button', { class: 'btn ' + (cls || ''), style: 'height:56px;text-align:left;width:100%', onclick: () => { closeModalFn && closeModalFn(); fn(); } }, label, h('small', { text: ' ' + sub, style: 'opacity:.75' }));
  openModal('Karte exportieren', h('div', { class: 'menu' },
    b('📤 Teilen …', 'WhatsApp, E-Mail & Co. (als Bild)', () => outFile('png', true), 'sec'),
    b('📄 PDF speichern', 'Originalgröße ' + FORMATS[doc.fmt].label + ' – zum Drucken', () => outFile('pdf', false), 'pri'),
    b('📄 PDF teilen …', 'per Nachricht oder E-Mail senden', () => outFile('pdf', true)),
    b('🖼 Bild (PNG) speichern', 'volle Auflösung', () => outFile('png', false)),
    b('🖨 Drucken', 'direkt an einen Drucker', printCard)), [{ label: 'Schließen' }]);
}

/* ================= Start ================= */
$('#btnMenu').onclick = menuDialog;
$('#btnExport').onclick = () => doc && exportDialog();
$('#btnUndo').onclick = undo;
$('#btnRedo').onclick = redo;
$('#docName').onclick = () => {
  const inp = h('input', { type: 'text', value: doc.name });
  openModal('Karte umbenennen', h('div', { class: 'fld' }, inp), [{ label: 'Abbrechen' }, { label: 'OK', cls: 'pri', fn: () => { doc.name = inp.value.trim() || doc.name; $('#docName').textContent = doc.name; markDirty(); } }]);
  setTimeout(() => { inp.focus(); inp.select(); }, 80);
};
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });

(async function init() {
  buildTools(); buildOpts(); buildColors(); updateUndoBtns(); resize(); $('#zGrid').classList.toggle('on', !!settings.guides);
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
  let ok = false;
  try { const last = localStorage.getItem('km_last'); if (last) ok = await loadDoc(last); } catch (e) {}
  if (!ok) newDocDialog(true); else toast('Zuletzt geöffnete Karte geladen');
  setTimeout(() => { resize(); fitView(); }, 50);
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
})();

window.__km = { get doc() { return doc; }, undo, redo, selectTool, setColor, get hist() { return hist; } };
})();
