// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos
// loaded; ?shot=cover shows the cover alone. `photo` picks the hero sample and
// `photo2..4` the other panels (samples/<name>.jpg); `caption`, `subtitle`, `size`,
// `theme` and `pos` set the rest. window.__shotReady is set once painted.
const VALID_SIZES = ['square', 'portrait', 'wide'];
const VALID_THEMES = ['sunset', 'neon', 'vice'];
const VALID_POS = ['top', 'bottom'];
const VALID_PHOTOS = ['portrait', 'cruise', 'boulevard', 'pier'];

function pick(query, key, fallback, valid) {
  const value = query.get(key) ?? fallback;
  return valid.includes(value) ? value : fallback;
}

export async function runShot(shot, query, applyScene) {
  const scene = {
    size: pick(query, 'size', 'square', VALID_SIZES),
    theme: pick(query, 'theme', 'sunset', VALID_THEMES),
    pos: pick(query, 'pos', 'bottom', VALID_POS),
    caption: query.get('caption') ?? 'Sunset Heist',
    subtitle: query.get('subtitle') ?? 'Leonida • Vice City',
    photos: [
      pick(query, 'photo', 'portrait', VALID_PHOTOS),
      pick(query, 'photo2', 'cruise', VALID_PHOTOS),
      pick(query, 'photo3', 'boulevard', VALID_PHOTOS),
      pick(query, 'photo4', 'pier', VALID_PHOTOS),
    ],
  };
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await applyScene(scene);
  await document.fonts.ready;
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
