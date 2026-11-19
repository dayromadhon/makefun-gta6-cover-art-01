// Draws the GTA-style multi-panel cover: four photo panels with a sunset or neon
// colour grade, gutters between them, and the caption in bold condensed lettering
// over a scrim at the top or the bottom. Everything is drawn from `state`, so the
// live preview and the exported PNG are the same picture.

export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 × 1350' },
  wide: { w: 1920, h: 1080, label: '1920 × 1080' },
};

// One hero panel plus three small ones. Square and portrait stack the small ones
// in a row under the hero; wide stacks them in a column beside it.
const LAYOUTS = {
  square: {
    hero: { x: 28, y: 28, w: 1024, h: 596 },
    cells: [
      { x: 28, y: 638, w: 332, h: 414 },
      { x: 374, y: 638, w: 332, h: 414 },
      { x: 720, y: 638, w: 332, h: 414 },
    ],
  },
  portrait: {
    hero: { x: 28, y: 28, w: 1024, h: 716 },
    cells: [
      { x: 28, y: 758, w: 332, h: 564 },
      { x: 374, y: 758, w: 332, h: 564 },
      { x: 720, y: 758, w: 332, h: 564 },
    ],
  },
  wide: {
    hero: { x: 28, y: 28, w: 1150, h: 1024 },
    cells: [
      { x: 1192, y: 28, w: 700, h: 332 },
      { x: 1192, y: 374, w: 700, h: 332 },
      { x: 1192, y: 720, w: 700, h: 332 },
    ],
  },
};

export const THEMES = {
  sunset: { top: '255, 154, 60', bottom: '255, 46, 136', accent: '#ffd166' },
  neon: { top: '34, 211, 238', bottom: '255, 46, 136', accent: '#5ef2e2' },
  vice: { top: '124, 58, 237', bottom: '255, 122, 24', accent: '#ff9ecf' },
};

/** The four panel rectangles for a size, hero first, in canvas pixels. */
export function layoutPanels(size) {
  const layout = LAYOUTS[size] ?? LAYOUTS.square;
  return [layout.hero, ...layout.cells];
}

/** Keeps a panel's pan offset inside the photo so the panel is always covered. */
export function clampPan(panel, rect) {
  const photo = panel.photo;
  if (!photo || !photo.naturalWidth) return;
  const scale = Math.max(rect.w / photo.naturalWidth, rect.h / photo.naturalHeight) * panel.zoom;
  const maxX = Math.max(0, (photo.naturalWidth * scale - rect.w) / 2);
  const maxY = Math.max(0, (photo.naturalHeight * scale - rect.h) / 2);
  panel.ox = Math.max(-maxX, Math.min(maxX, panel.ox || 0));
  panel.oy = Math.max(-maxY, Math.min(maxY, panel.oy || 0));
}

/** Draws one photo into its panel: cover-fit, zoomed, panned, then graded. */
export function drawPanelPhoto(ctx, photo, rect, panel, theme) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (!photo) {
    const empty = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    empty.addColorStop(0, '#3a1c4d');
    empty.addColorStop(1, '#160a18');
    ctx.fillStyle = empty;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  } else {
    const scale = Math.max(rect.w / photo.naturalWidth, rect.h / photo.naturalHeight) * panel.zoom;
    const pw = photo.naturalWidth * scale;
    const ph = photo.naturalHeight * scale;
    ctx.drawImage(photo, rect.x + (rect.w - pw) / 2 + (panel.ox || 0), rect.y + (rect.h - ph) / 2 + (panel.oy || 0), pw, ph);
  }
  applyGrade(ctx, rect, theme);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
}

/** Warm sunset or neon wash plus a vignette, so every panel shares one grade. */
export function applyGrade(ctx, rect, theme) {
  const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  wash.addColorStop(0, `rgba(${theme.top}, 0.10)`);
  wash.addColorStop(1, `rgba(${theme.bottom}, 0.30)`);
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const vig = ctx.createRadialGradient(
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.min(rect.w, rect.h) * 0.35,
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.max(rect.w, rect.h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(12, 5, 18, 0)');
  vig.addColorStop(1, 'rgba(12, 5, 18, 0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

/** Largest title size that still fits the cover width, in canvas pixels. */
export function fitTitle(ctx, text, width) {
  let size = Math.round(width * 0.105);
  ctx.font = `900 ${size}px "Vice Condensed", "Arial Narrow", sans-serif`;
  while (ctx.measureText(text).width > width * 0.9 && size > 24) {
    size -= 4;
    ctx.font = `900 ${size}px "Vice Condensed", "Arial Narrow", sans-serif`;
  }
  return size;
}

/** The caption: accent bar, big title, subtitle, over a scrim top or bottom. */
export function drawCaption(ctx, state, width, height) {
  const theme = THEMES[state.theme] ?? THEMES.sunset;
  const title = (state.caption || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  const margin = 28;
  const band = Math.round(height * 0.26);
  const scrim = state.pos === 'top'
    ? ctx.createLinearGradient(0, 0, 0, band)
    : ctx.createLinearGradient(0, height - band, 0, height);
  if (state.pos === 'top') {
    scrim.addColorStop(0, 'rgba(12, 5, 18, 0.92)');
    scrim.addColorStop(1, 'rgba(12, 5, 18, 0)');
  } else {
    scrim.addColorStop(0, 'rgba(12, 5, 18, 0)');
    scrim.addColorStop(1, 'rgba(12, 5, 18, 0.92)');
  }
  ctx.fillStyle = scrim;
  ctx.fillRect(0, state.pos === 'top' ? 0 : height - band, width, band);

  if (!title && !subtitle) return;
  const titleSize = title ? fitTitle(ctx, title, width) : 0;
  const subSize = Math.max(20, Math.round(titleSize * 0.24));
  const cx = width / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  let barY;
  let titleBase;
  let subBase;
  if (state.pos === 'top') {
    barY = margin + 6;
    titleBase = barY + 10 + titleSize;
    subBase = titleBase + subSize + 18;
  } else {
    subBase = height - margin;
    titleBase = subBase - subSize - 16;
    barY = titleBase - Math.round(titleSize * 0.78) - 16;
  }
  if (title) {
    ctx.fillStyle = theme.accent;
    ctx.fillRect(cx - titleSize * 0.45, barY, titleSize * 0.9, 8);
    ctx.font = `900 ${titleSize}px "Vice Condensed", "Arial Narrow", sans-serif`;
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(6, titleSize * 0.14);
    ctx.strokeStyle = '#160a18';
    ctx.strokeText(title, cx, titleBase);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = titleSize * 0.12;
    ctx.shadowOffsetY = titleSize * 0.03;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, cx, titleBase);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  if (subtitle) {
    ctx.font = `900 ${subSize}px "Vice Condensed", "Arial Narrow", sans-serif`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(subSize * 0.28)}px`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(22, 10, 24, 0.85)';
    ctx.strokeText(subtitle, cx, subBase);
    ctx.fillStyle = theme.accent;
    ctx.fillText(subtitle, cx, subBase);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
}

/** Draws the whole cover from `state` onto the canvas, at the canvas's own size. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const theme = THEMES[state.theme] ?? THEMES.sunset;
  ctx.fillStyle = '#14081a';
  ctx.fillRect(0, 0, w, h);
  const rects = layoutPanels(state.size);
  state.panels.forEach((panel, i) => {
    clampPan(panel, rects[i]);
    drawPanelPhoto(ctx, panel.photo, rects[i], panel, theme);
  });
  drawCaption(ctx, state, w, h);
}
