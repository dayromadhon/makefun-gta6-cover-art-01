// Wires the page: pick photos per panel, crop them by dragging, write the caption,
// pick a size and a grade, export the cover as a PNG. A `?shot=` query sets up a
// fixed scene for a screenshot instead (./shots.js).
import { drawCover, layoutPanels, SIZES } from './cover.js';
import { runShot } from './shots.js';

const SAMPLES = {
  portrait: 'samples/portrait.jpg',
  cruise: 'samples/cruise.jpg',
  boulevard: 'samples/boulevard.jpg',
  pier: 'samples/pier.jpg',
};
const SAMPLE_NAMES = { portrait: 'Portrait', cruise: 'Cruise', boulevard: 'Boulevard', pier: 'Pier' };
const PANEL_NAMES = ['Hero', 'Panel 1', 'Panel 2', 'Panel 3'];
const DEFAULT_PHOTOS = ['portrait', 'cruise', 'boulevard', 'pier'];

const canvas = document.getElementById('cover');
const overlay = document.getElementById('overlay');
const wrap = document.getElementById('canvas-wrap');
const captionInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');
const zoomInput = document.getElementById('zoom');
const status = document.getElementById('status');
wrap.style.touchAction = 'none';

const state = {
  size: 'square',
  theme: 'sunset',
  pos: 'bottom',
  caption: captionInput.value,
  subtitle: subtitleInput.value,
  panels: DEFAULT_PHOTOS.map(() => ({ photo: null, zoom: 1, ox: 0, oy: 0 })),
};
let selected = 0;

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function redraw() {
  drawCover(canvas, state);
  drawSelection();
}

/** The selection outline lives on the overlay canvas, never in the export. */
function drawSelection() {
  const ctx = overlay.getContext('2d');
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  const rect = layoutPanels(state.size)[selected];
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 6;
  ctx.setLineDash([18, 12]);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffd166';
  ctx.font = '900 28px "Vice Condensed", "Arial Narrow", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(PANEL_NAMES[selected].toUpperCase(), rect.x + 12, rect.y + 10);
}

function selectPanel(i) {
  selected = i;
  zoomInput.value = String(state.panels[i].zoom);
  document.querySelectorAll('.panel-card').forEach((card, j) => card.classList.toggle('is-selected', j === i));
  drawSelection();
}

/** Builds the four panel cards: upload, sample photos, and a select button. */
function buildPanelCards() {
  const host = document.getElementById('panels');
  state.panels.forEach((panel, i) => {
    const card = document.createElement('div');
    card.className = 'panel-card';
    card.dataset.panel = String(i);
    const title = document.createElement('h3');
    const pick = document.createElement('button');
    pick.type = 'button';
    pick.textContent = PANEL_NAMES[i];
    pick.addEventListener('click', () => selectPanel(i));
    title.appendChild(pick);
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.setAttribute('aria-label', `Photo for ${PANEL_NAMES[i]}`);
    file.addEventListener('change', async () => {
      const f = file.files[0];
      if (!f) return;
      selectPanel(i);
      panel.photo = await loadImage(URL.createObjectURL(f));
      panel.zoom = 1;
      panel.ox = 0;
      panel.oy = 0;
      redraw();
    });
    const samples = document.createElement('div');
    samples.className = 'samples';
    Object.keys(SAMPLES).forEach((key) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sample-btn';
      b.textContent = SAMPLE_NAMES[key];
      b.addEventListener('click', async () => {
        selectPanel(i);
        panel.photo = await loadImage(SAMPLES[key]);
        panel.zoom = 1;
        panel.ox = 0;
        panel.oy = 0;
        redraw();
      });
      samples.appendChild(b);
    });
    card.append(title, file, samples);
    host.appendChild(card);
  });
}

function syncSizeButtons() {
  document.querySelectorAll('.size-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.size === state.size));
}

function setSize(name) {
  state.size = SIZES[name] ? name : 'square';
  canvas.width = SIZES[state.size].w;
  canvas.height = SIZES[state.size].h;
  overlay.width = SIZES[state.size].w;
  overlay.height = SIZES[state.size].h;
  syncSizeButtons();
  redraw();
}

document.querySelectorAll('.size-btn').forEach((b) => {
  b.addEventListener('click', () => setSize(b.dataset.size));
});
captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
document.querySelectorAll('input[name="pos"]').forEach((r) => {
  r.addEventListener('change', () => { state.pos = r.value; redraw(); });
});
document.querySelectorAll('input[name="theme"]').forEach((r) => {
  r.addEventListener('change', () => { state.theme = r.value; redraw(); });
});
zoomInput.addEventListener('input', () => {
  state.panels[selected].zoom = Number(zoomInput.value);
  redraw();
});
document.getElementById('fill-all').addEventListener('click', () => {
  const src = state.panels[selected];
  state.panels.forEach((p) => {
    p.photo = src.photo;
    p.zoom = src.zoom;
    p.ox = src.ox;
    p.oy = src.oy;
  });
  redraw();
  status.textContent = `${PANEL_NAMES[selected]} photo now fills all four panels.`;
});
document.getElementById('reset-crop').addEventListener('click', () => {
  const p = state.panels[selected];
  p.zoom = 1;
  p.ox = 0;
  p.oy = 0;
  zoomInput.value = '1';
  redraw();
});
document.getElementById('export').addEventListener('click', () => {
  canvas.toBlob((blob) => {
    if (!blob) { status.textContent = 'Export failed — try again.'; return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cover-${canvas.width}x${canvas.height}.png`;
    a.click();
    status.textContent = `Saved cover-${canvas.width}x${canvas.height}.png`;
  }, 'image/png');
});

// Drag a panel's photo to move it; click a panel to select it.
let drag = null;
wrap.addEventListener('pointerdown', (e) => {
  const r = canvas.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * canvas.width;
  const y = ((e.clientY - r.top) / r.height) * canvas.height;
  const hit = layoutPanels(state.size).findIndex((p) => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h);
  if (hit === -1) return;
  selectPanel(hit);
  drag = { x, y };
  wrap.setPointerCapture(e.pointerId);
});
wrap.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const r = canvas.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * canvas.width;
  const y = ((e.clientY - r.top) / r.height) * canvas.height;
  const panel = state.panels[selected];
  panel.ox += x - drag.x;
  panel.oy += y - drag.y;
  drag = { x, y };
  redraw();
});
wrap.addEventListener('pointerup', () => { drag = null; });
wrap.addEventListener('pointercancel', () => { drag = null; });

buildPanelCards();
selectPanel(0);

/** Applies a fixed scene (from ?shot=): loads the sample photos, sets the words. */
async function applyScene(scene) {
  setSize(scene.size);
  state.theme = scene.theme;
  state.pos = scene.pos;
  state.caption = scene.caption;
  state.subtitle = scene.subtitle;
  captionInput.value = scene.caption;
  subtitleInput.value = scene.subtitle;
  document.querySelector(`input[name="theme"][value="${scene.theme}"]`).checked = true;
  document.querySelector(`input[name="pos"][value="${scene.pos}"]`).checked = true;
  const photos = await Promise.all(scene.photos.map((key) => loadImage(SAMPLES[key] ?? SAMPLES.portrait)));
  photos.forEach((photo, i) => {
    state.panels[i].photo = photo;
    state.panels[i].zoom = 1;
    state.panels[i].ox = 0;
    state.panels[i].oy = 0;
  });
  selectPanel(0);
  redraw();
}

const shot = new URLSearchParams(location.search).get('shot');
try {
  await document.fonts.load('900 100px "Vice Condensed"');
} catch { /* the fallback font still draws */ }
if (shot) {
  runShot(shot, new URLSearchParams(location.search), applyScene);
} else {
  const photos = await Promise.all(DEFAULT_PHOTOS.map((key) => loadImage(SAMPLES[key])));
  photos.forEach((photo, i) => { state.panels[i].photo = photo; });
  redraw();
}
