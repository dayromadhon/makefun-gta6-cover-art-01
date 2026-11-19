// Takes the screenshots for gta6-cover-art-01: serves app/ locally, drives each
// scene from shots.json in headless Chromium, and writes screenshots/*.jpg.
// Also proves the export works by clicking Export once and checking the PNG.
// Run from the repo root: node screenshots.js
const { chromium } = require('/home/hatch/workspace/makefun/gta6-shot-tools/node_modules/playwright-core');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const shots = JSON.parse(fs.readFileSync('shots.json', 'utf8'));
const PORT = 8080;
const CHROME = '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome';
const MAX_BYTES = 262144;

async function waitForServer(url) {
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server did not come up at ${url}`);
}

/** Reads a PNG's width and height from its IHDR chunk. */
function pngSize(file) {
  const buf = fs.readFileSync(file);
  if (buf.length < 33 || buf.toString('ascii', 1, 4) !== 'PNG') throw new Error(`${file} is not a PNG`);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), bytes: buf.length };
}

(async () => {
  const server = spawn('node', ['serve.ts', '--port', String(PORT)], { stdio: 'pipe' });
  let browser;
  try {
    await waitForServer(`http://127.0.0.1:${PORT}/`);
    browser = await chromium.launch({
      executablePath: CHROME,
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors'],
    });
    // No proxy: the app is fully offline (local files only), so the browser needs
    // no internet at all. (A proxy through the local forwarder was tried first;
    // with the forwarder down it held the navigation open, so it is not used.)
    const context = await browser.newContext({ acceptDownloads: true });
    for (const shot of shots) {
      const page = await context.newPage();
      await page.setViewportSize({ width: shot.w, height: shot.h });
      await page.goto(`http://127.0.0.1:${PORT}/${shot.query}`, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 30000 });
      const out = path.join('screenshots', shot.name);
      await page.screenshot({ path: out, type: 'jpeg', quality: 75 });
      const bytes = fs.statSync(out).size;
      console.log(`${shot.name}: ${shot.w}x${shot.h}, ${bytes} bytes${bytes > MAX_BYTES ? ' — OVER 256 KiB!' : ''}`);
      await page.close();
    }
    // Prove the export works: open the editor, click Export, check the PNG.
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`http://127.0.0.1:${PORT}/?shot=editor&photo=portrait&caption=Sunset%20Heist&size=square`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 30000 });
    const download = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.click('#export'),
    ]).then(([d]) => d);
    const tmp = '/tmp/cover-export-check.png';
    await download.saveAs(tmp);
    const size = pngSize(tmp);
    console.log(`export: cover-${size.w}x${size.h}.png, ${size.bytes} bytes — OK`);
    await page.close();
    console.log('all screenshots done');
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
  }
})().catch((e) => {
  console.error('screenshots failed:', e.message);
  process.exit(1);
});
