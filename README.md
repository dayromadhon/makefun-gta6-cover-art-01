# Sunset Cover Studio — make.fun bounty `gta6-cover-art-01`

A web app that turns your photo and a caption into GTA 6-style cover art and
exports it as a PNG. Built for the [make.fun](https://make.fun/bounty/gta6-cover-art-01)
bounty **Make GTA 6 Cover Art** (`gta6-cover-art-01`).

## What it does

- **Four-panel poster**: a hero panel plus three panels, with gutters and a
  Vice City sunset or neon colour grade over every panel.
- **Any photo**: upload your own photos from your machine, or try the four
  built-in samples. Click a panel to select it, drag inside it to move the
  photo, use the zoom slider to crop. "Use this photo in all panels" fills
  every panel with one photo.
- **Caption**: write and edit the title and subtitle; pick whether the title
  sits at the top or the bottom, and one of three grades (Sunset, Neon,
  Vice Nights). The lettering is set in Noto Sans Condensed Black (SIL Open
  Font License, shipped under `app/fonts/`).
- **Post sizes**: 1080 × 1080, 1080 × 1350 and 1920 × 1080 — one click exports
  the cover as a PNG at the chosen size.
- **Offline**: static files under `app/`, no build step, no network requests.
  Photos are read on your machine and never uploaded.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

## Screenshots

`screenshots/` holds four JPEGs taken with `node screenshots.js` (Playwright,
headless Chromium): the cover first, then the editor with a photo loaded, then
covers in the portrait and wide sizes.

## Hand-in

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to `/output` and writes `/output/dossier.json`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Credits

- Sample photos `portrait` and `cruise` are original illustrations made with
  an image model for this app; `boulevard` and `pier` came with the kit and
  were made for make.fun with an image model. All are free to use.
- Lettering font: Noto Sans Condensed Black, © 2015 Google LLC, licensed
  under the SIL Open Font License 1.1 (see `app/fonts/NOTICE.txt`).
- No Rockstar Games logo, wordmark, artwork, character or font is used.
