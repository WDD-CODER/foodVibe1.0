# Plan 571 — One product name, foodCo, and its own app icon instead of the Angular logo

Status: done
Depends-on: none
Snapshot: 4ba8887cc16eb5c1c3d3ccd4a0bbb9b63cb6c3c9

## Problem Statement
The product shows three names and a framework logo. Dandan chose the name **foodCo** on 2026-11-10 (chat, after the
"The Pass" theme board). This is step 1 of that board: one name everywhere a user can see it, and the real mark on
the phone home screen and the browser tab.

Verified on `origin/main` (4ba8887c, 2026-11-10):
- `src/index.html:5` `<title>FoodVibe</title>`; `:6` `<meta name="apple-mobile-web-app-title" content="FoodVibe">`. No `theme-color` meta and no `apple-touch-icon` link.
- `public/manifest.webmanifest:2-3` `"name": "FoodVibe"`, `"short_name": "FoodVibe"`; no `theme_color`, `background_color`. Its 8 icons are `icons/icon-<N>x<N>.png` for N = 72, 96, 128, 144, 152, 192, 384, 512, each `"purpose": "maskable any"`.
- `public/icons/*.png` (8 files) and `public/favicon.ico` are the default Angular icons. Their md5 today:
  `favicon.ico 05bcfe9a02b93e1c5a5da14bfda8c41f`, `icon-72x72.png 2c80564bda774d59a145f5ce05b0cd4d`,
  `icon-96x96.png ad68075f59b101ac4943c78e1fd9198e`, `icon-128x128.png 51af1881513c675146ffc7e71532404c`,
  `icon-144x144.png 66e8778e74bcd3d576f6e8017f790e37`, `icon-152x152.png 73e796b03c858eacba425c4d23ec68a3`,
  `icon-192x192.png fe38d9e1f1de91d8623bd412d4061850`, `icon-384x384.png 747d0c4f12a19f93026d55a3f040d536`,
  `icon-512x512.png 2cca1ff3051b0d322f30d39a37214e28`.
- The header already says foodCo: `src/app/core/components/header/header.component.html:60-62` (`aria-label="foodCo"`, `<img src="/assets/style/img/fc-mark.svg" …>`, `<span class="brand-mark__name">foodCo</span>`).
- `public/assets/style/img/fc-mark.svg:1-2` carries `aria-label="Food Composer mark"` and `<title>Food Composer mark</title>`.
- `public/assets/data/dictionary.json:1224` `baseline_intro` and `:1241` `opening_details_banner_text` each contain the word `FoodVibe` inside a Hebrew sentence. No other dictionary value and no dictionary key contains a product name.
- The design source already holds the icon art: `.interface-design/source/assets/fc-favicon.svg` (the pot in cream `#f6efdf` on a teal `#115e59` square with `rx="14"`, viewBox `0 0 64 64`).
- No image library is installed (no sharp, no png-to-ico). `@playwright/test` (`package.json:67`) is a dev dependency and can render an SVG to PNG with its Chromium.
- `ngsw-config.json` caches `/favicon.ico` and `/manifest.webmanifest` in the `app` group and every `png`/`svg` in the `assets` group by glob; no file is listed by name, so no change is needed there.
- No spec in `src/**/*.spec.ts`, `e2e/**` or `e2e-qa/**` asserts on `FoodVibe` or `foodCo`.

## Goals & Success Criteria
**Primary:** a user sees the name foodCo and the pot mark in the browser tab, on the phone home screen, in the
installed app's name and in every sentence of the app; nothing a user sees says FoodVibe or Food Composer.

- [auto] `node tools/brand-icons/check-icons.mjs` exits 0 and prints `BRAND_ICONS: ok (10 files)`.
- [auto] `node tools/brand-icons/check-names.mjs` exits 0 and prints `BRAND_NAMES: ok`.
- [auto] `pnpm run build` passes.
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run test:ci` passes.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] On a phone, "Add to Home Screen" shows the teal pot icon with the name foodCo, and the icon is not cut at the corners.
- [human] The browser tab shows the pot icon and the title foodCo.

## Execution Mode
- Parallel: yes — static files, two dictionary values and two new tool scripts.
- Concurrent plans: any that do not edit `src/index.html`, `public/manifest.webmanifest` or `public/assets/data/dictionary.json` lines 1224 and 1241. Plan 572 also edits `src/index.html` (the fonts line): run 571 before 572.
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/index.html
public/manifest.webmanifest
public/favicon.ico
public/icons/**
public/assets/style/img/fc-mark.svg
public/assets/data/dictionary.json
tools/brand-icons/**
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — static assets, page metadata and two translated sentences; no data, permission, schema or server change.

## Reuse Check

- none — no new component, util, pipe, service or `.c-*` class; two build-time tool scripts under `tools/`.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want the app on my phone to carry its own icon and name so that I find it at once and it looks like a finished product.
- As the owner showing the product to a customer, I want one name on every screen so that nobody asks which product this is.

## Functional Requirements

### Must Have (P0)
- [ ] `src/index.html`: line 5 becomes `<title>foodCo</title>`; line 6 `content="foodCo"`. Add after line 9: `<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">` and `<meta name="theme-color" content="#115e59">`. Nothing else changes (the fonts line stays as it is).
- [ ] `public/manifest.webmanifest`: `"name": "foodCo"`, `"short_name": "foodCo"`; add `"theme_color": "#115e59"` and `"background_color": "#f0f4f8"` after `"start_url"`. The `icons` array is unchanged (same 8 paths, sizes, type and purpose).
- [ ] `public/assets/style/img/fc-mark.svg`: `aria-label="foodCo mark"` and `<title>foodCo mark</title>`. The drawing is unchanged.
- [ ] `public/assets/data/dictionary.json`: in the values of `baseline_intro` (line 1224) and `opening_details_banner_text` (line 1241) replace the word `FoodVibe` with `foodCo`. Keys and every other character stay. This rewrite of two existing hotspot values is approved: Human 2026-11-10 (the name decision).
- [ ] New `tools/brand-icons/make-icons.mjs` (Node ESM, no new dependency): `import { chromium } from '@playwright/test'`; launches Chromium once; for each output below sets a page of exactly that size with `deviceScaleFactor: 1`, loads an inline HTML page (`<body style="margin:0">` + the SVG at `width`/`height` 100%) with `page.setContent`, and writes `page.screenshot({ type: 'png', omitBackground: true })`.
  - Art A (full square, for the 8 manifest icons and the apple icon): the content of `.interface-design/source/assets/fc-favicon.svg` with the background rect's `rx="14"` changed to `rx="0"` and its masked `<g>` wrapped in `<g transform="translate(32 32) scale(0.78) translate(-32 -32)">`, so the pot stays inside the maskable safe zone (the middle 80%).
  - Art B (rounded, for the favicon): `fc-favicon.svg` as it is.
  - Outputs: `public/icons/icon-<N>x<N>.png` for N = 72, 96, 128, 144, 152, 192, 384, 512 (Art A); `public/icons/apple-touch-icon.png` 180×180 (Art A); `public/favicon.ico` holding two PNG images, 32×32 and 48×48 (Art B), written by the script itself as an ICO container (6-byte header `00 00 01 00 02 00`, one 16-byte directory entry per image with width, height, 0, 0, planes 1, bit count 32, byte size and offset, then the PNG bytes).
  - The script reads the SVG from the path above with `readFileSync`, never from the network, and prints `BRAND_ICONS: wrote 10 files`.
- [ ] New `tools/brand-icons/check-icons.mjs` (Node built-ins only): for each of the 9 PNG files reads the IHDR chunk (bytes 16–23: width and height, big-endian) and fails when it is not the size in the file name (180 for the apple icon); for `public/favicon.ico` checks bytes 0–5 equal `00 00 01 00 02 00`; computes md5 of all 10 files and fails when any equals its old Angular value listed in the Problem Statement (the 9 values there; the apple icon has no old value). Prints `BRAND_ICONS: ok (10 files)` and exits 0, or one line per failure and exits 1.
- [ ] New `tools/brand-icons/check-names.mjs` (Node built-ins only): fails (exit 1, one line per hit with file and line) when the regular expression `FoodVibe|Food Composer|foodVibe1\.0` matches in `src/index.html`, `public/manifest.webmanifest`, `public/assets/style/img/fc-mark.svg`, any value in `public/assets/data/dictionary.json`, or any `src/app/**/*.html` file; also fails when `src/index.html` has no `<title>foodCo</title>` or the manifest's `name` is not `foodCo`. Prints `BRAND_NAMES: ok` and exits 0 otherwise.
- [ ] Run `node tools/brand-icons/make-icons.mjs` once and commit its 10 output files.

### Should Have (P1)
- none

### Nice to Have (P2)
- none

## UI/UX Notes
- No layout change. Hebrew sentences keep the Latin name inline, as today (`… לפני foodCo …`).
- No new dictionary keys; two values change (above). No new icons.

## Atomic Sub-tasks

- [x] A1: Show the name foodCo in the browser tab and in the installed app — title, apple title, theme colour, apple icon link; manifest name, short name and two colours — src/index.html, public/manifest.webmanifest
- [x] A2: Say foodCo in the two sentences and the logo label that still use an old name — two dictionary values, the mark's label and title — public/assets/data/dictionary.json, public/assets/style/img/fc-mark.svg
- [x] A3: Add a script that draws every app icon from the design's own pot mark — Playwright Chromium renders Art A and Art B, the script writes the ICO container — tools/brand-icons/make-icons.mjs
- [x] A4: Replace the ten Angular icon files with the pot mark — run the script once and commit its output — public/icons/**, public/favicon.ico
- [x] A5: Add two checks that fail if an old name or an Angular icon comes back — sizes, ICO header, old md5 values; the name search — tools/brand-icons/check-icons.mjs, tools/brand-icons/check-names.mjs
- [x] A6: Run the two checks, build, lint, the unit tests and the log query, and paste the output lines under Execution Notes

## Technical Considerations
- Dependencies: `@playwright/test` (already a dev dependency) and its Chromium. When Chromium is not at Playwright's default place, the script honours `PLAYWRIGHT_BROWSERS_PATH`, which Playwright reads by itself.
- New files needed: `tools/brand-icons/make-icons.mjs`, `tools/brand-icons/check-icons.mjs`, `tools/brand-icons/check-names.mjs`, `public/icons/apple-touch-icon.png`.
- Model changes: none
- Backend / API: none
- Auth and validation: none
- Security surface: none
- Data / migration: none
- Project checks: log-query item present; no new dictionary keys; no Lucide icons; hotspot `dictionary.json` — two approved value rewrites, nothing removed.

## Out of Scope
- Internal identifiers that carry the old name. They stay exactly as they are: storage keys `fv_token`, `FV_GEMINI_USAGE`, `fv_setup_card_hidden_*`; the cookie `fv_refresh`; `title = 'foodVibe1.0'` in `src/app/appRoot/app.component.ts:82`; `cloudinaryUploadPreset: 'foodvibe'`; `service: 'foodvibe-api'`; `@staff.foodvibe.invalid`; database names; `outputPath` in `angular.json`; the Render URL; the repository name; `kit.config.json`; every doc and plan.
- A new logo drawing. The existing pot mark is used as it is.
- The welcome screen (plan 574) and the colour tokens (plan 572).

## Critical Questions
- Q: Which spelling does a user see? A: `foodCo` — lower-case f, capital C, as the header already shows it (Human 2026-11-10 chose the name; the header's spelling is kept).

## Execution Notes
- Planner 2026-11-10: the Human approved the name in chat ("Foodco") and the theme board; this plan was written and reviewed in a cloud session on branch `ccr-cf91e66d-y8sqjx`, not from the main folder.
- Evidence: `node tools/brand-icons/make-icons.mjs` → exit 0, `BRAND_ICONS: wrote 10 files` (run with `BRAND_ICONS_CHROMIUM` pointing at the installed Chromium; the script honours that optional env var because the sandbox's Playwright browser build differed).
- `node tools/brand-icons/check-icons.mjs` → exit 0, `BRAND_ICONS: ok (10 files)`; `check-names.mjs` → exit 0, `BRAND_NAMES: ok`.
- `pnpm run build` → 0; `pnpm run lint` → 0; `pnpm run test:ci` → 0; log-query → `SKIP: no database configured`.
