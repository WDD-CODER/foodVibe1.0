# Plan 767 — PDF proof on the real Render server: headless browser, memory and start-up measured

Status: draft
Depends-on: 764
Snapshot: d34a01068fe2f1b28efd33b753b8a3f69aa8762b

## Problem Statement

The menu design program (`docs/menu-design/menu-design-map.md`) sends the customer one complete designed menu as a
PDF (D13). Hebrew and mixed Hebrew/English text must render exactly as on screen, which rules out the light
renderers (Satori has no RTL) and points to a headless Chromium printing the shared HTML template
(`renderMenuDocument`, plan 764). The server runs on Render's **free** plan (512 MB RAM, 0.1 shared CPU, sleeps
after 15 minutes) and Dandan will not pay for a bigger tier. Nobody knows yet whether a Chromium fits next to the
Node server there, how long the first PDF takes after a sleep, or whether Google Fonts load in time. This plan
builds the one render service the program uses, measures it on a real Render instance, and records the decision
before plans 766 and 768 build on it.

## Goals & Success Criteria

**Primary:** `server/services/menu-pdf.js` renders `SAMPLE_MENU_DOC` to a PDF on a real Render free instance, and
the plan's Execution Notes carry the measured cold start, render time and peak memory plus the decision line.

- [auto] `pnpm run test:server` passes, including `server/test/menu-pdf.test.js` (browser mocked: one browser, idle
  close, queue of 3 then `PDF_BUSY`, navigation allow-list, `screenshotUrl` refuses `http:`, `localhost`,
  `127.0.0.1`, `10.0.0.1`, `169.254.169.254`, `[::1]` and a host that resolves to a private address).
- [auto] `server/test/menu-pdf-real.test.js` either passes (a real PDF of `SAMPLE_MENU_DOC`: starts with `%PDF-`,
  one page, under 2 MB) or prints `SKIP menu-pdf-real: no chromium` and passes — never fails for a missing browser.
- [auto] `server/test/menu-design-route.test.js`: `GET /api/v1/menu-design/pdf-smoke` answers 401 without a token,
  403 for an owner who is not platform admin, and 200 with the JSON keys `coldStartMs`, `renderMs`, `pdfBytes`,
  `nodeRssMb`, `browserRssMb`, `peakTotalMb`, `fonts` for a platform admin (render mocked).
- [auto] `pnpm --dir server install --frozen-lockfile` exits 0 with the new dependencies, and
  `node -e "require('./server/services/menu-pdf.js')"` exits 0 (no Chromium launched at require time).
- [auto] `npm run build` passes.
- [auto] `node scripts/reuse-lint.mjs --check-registry` exits 0 (the new `menu-pdf` family is registered).
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Dandan deploys the plan branch to a free Render test instance (see Critical Questions Q1), opens
  `/api/v1/menu-design/pdf-smoke` as platform admin after the instance has slept, then again right away, and once
  with `?download=1`: the numbers are written into Execution Notes, and the downloaded PDF shows the sample menu
  with Hebrew right-to-left, English left-to-right, mixed names in the right order and the chosen fonts (not a
  fallback font).
- [human] Dandan reads the decision line in Execution Notes (adopt the measured setup, or the free fallback) and
  replies `approved` or picks the fallback; the Planner then copies it into the map's "Contract extensions".

## Execution Mode
- Parallel: yes
- Concurrent plans: 765 (wave 1, run `md-designer`; no shared files)
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/services/menu-pdf.js
server/services/menu-pdf/**
server/routes/menu-design.js
server/app.js
server/package.json
server/pnpm-lock.yaml
server/assets/menu-fonts/**
server/scripts/menu-fonts-fetch.js
server/breadcrumbs.md
server/test/menu-pdf.test.js
server/test/menu-pdf-real.test.js
server/test/menu-design-route.test.js
render.yaml
docs/brain/component-families.md
docs/brain/inventory.md
server/test/helpers/app.js
docs/workflow-kit/manifest.json
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-2: preserves — `server/services/menu-pdf.js` reads and writes no business data; it turns an HTML string into
  bytes. The smoke route renders the fixed `SAMPLE_MENU_DOC` and touches no collection.
- INV-6: preserves — no AI call in this plan (`screenshotUrl` only fetches a page; plan 766 sends the picture to
  Gemini through `server/routes/ai/`).

## Reuse Check

- menu-pdf render service: renderPdf and screenshotUrl in server/services/menu-pdf.js — family: none — rung: 4 — why: nothing in the server renders HTML to PDF or takes a page screenshot today (all print is window.print() in the browser); one wrapper so the adopted browser package is imported in one place only; registered as the new `menu-pdf` family.
- pdf-smoke route in server/routes/menu-design.js — family: server-auth — rung: 1 — why: verifyToken + requirePlatformAdmin from server/middleware/auth.js as is.

## Adopt Check

- Headless browser driver for HTML to PDF and page screenshots — candidate: puppeteer-core — considered: puppeteer, playwright-core — verdict: wrap — license: Apache-2.0 — why: 25.19.0 of 2026-11-25, 33 M weekly downloads, no peers, no advisories, no install script (pnpm 10 blocks install scripts and Render runs pnpm --dir server install); puppeteer downloads Chrome into ~/.cache at install, which Render does not keep; playwright-core 1.65.1 (Apache-2.0) is the fallback driver.
- Small Chromium binary for a 512 MB Linux host — candidate: @sparticuz/chromium — considered: puppeteer — verdict: wrap — license: MIT — why: 158.0.0 of 2026-11-24, 4.5 M weekly downloads, no peers, no advisories; a compressed Chromium for small Linux hosts unpacked to /tmp on first launch, no install script; Linux x64 only, so development machines use the local Chrome (channel chrome or MENU_PDF_CHROME_PATH).

## Defaults

- one-breakpoint-set — exception — why: no screen or style in this plan; the smoke route answers JSON or a PDF.
- anchored-popup — exception — why: no popup; server-only plan.
- row-action-icons — exception — why: no list or row on any screen; server-only plan.
- unit-dropdown-add — exception — why: no dropdown or unit input; server-only plan.
- app-list-container — exception — why: no list screen; server-only plan.
- empty-state-on-list — exception — why: no list shown; server-only plan.
- loading-and-error-states — exception — why: no screen; the smoke route answers JSON or a PDF.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want the menu I send my customer to be one finished PDF that looks exactly like the menu I designed,
  so that I can forward it in seconds.
- As Dandan, I want to know before we build the export that the free server can make that PDF, so that we don't
  build on something that falls over in production.

## Functional Requirements

### Must Have (P0)
- [ ] C-PDF, copied from the map (frozen 2026-11-27):
  - `renderPdf(html): Promise<Buffer>` and `screenshotUrl(url, { width }): Promise<Buffer>` (the second feeds the
    designer's URL reference, plan 766).
  - One browser at a time, launched on first use, closed after 60 s idle; a second request waits (queue of 3, then
    `503 PDF_BUSY`). Page navigation is blocked except `data:`, Google Fonts and `res.cloudinary.com` (the menu HTML
    can't reach the network otherwise). `screenshotUrl` accepts only `https:` public hosts (no localhost, no private ranges).
- [ ] `renderPdf` prints A4 portrait with the template's own `@page` margins (`preferCSSPageSize: true`,
  `printBackground: true`), JavaScript disabled on the page, waits for fonts (`document.fonts.ready` via
  `page.evaluate` is not available with JS off — use `waitUntil: 'networkidle0'` with a 10 s cap), page timeout 20 s.
- [ ] `screenshotUrl`: https only, port 443 only; the host is resolved first and refused when any address is
  loopback, private, link-local, CGNAT or multicast (Node `net.BlockList`); every sub-request of the page is checked
  the same way through request interception (refused, not followed); 15 s cap; viewport `width` (default 1280) ×
  1600; PNG under 5 MB; downloads and pop-ups refused.
- [ ] Launch flags for the small host: `--single-process` off by default, `--no-zygote`, `--disable-dev-shm-usage`,
  `--disable-gpu`, `--no-sandbox` only on Linux when not root-capable (as `@sparticuz/chromium.args` sets them).
- [ ] Fonts: measure both modes of `renderMenuDocument(..., { fonts })` — `link` (Google Fonts CSS) and `embedded`
  (woff2 files of two fonts, Heebo and Frank Ruhl Libre, kept in `server/assets/menu-fonts/` and fetched once by
  `server/scripts/menu-fonts-fetch.js`; both OFL). Default to `link` unless it adds more than 1.5 s or fails on Render.
- [ ] `GET /api/v1/menu-design/pdf-smoke` (platform admin only, mounted in `server/app.js`): renders
  `renderMenuDocument(baseDesign('classic'), SAMPLE_MENU_DOC, { poweredBy: true, fonts })` and answers
  `{ coldStartMs, renderMs, pdfBytes, nodeRssMb, browserRssMb, peakTotalMb, fonts }`; `?fonts=link|embedded`;
  `?download=1` answers the PDF itself. Browser memory is read from `/proc/<pid>/status` (`VmRSS`) of the browser
  process and its children on Linux, `null` elsewhere; peak = highest sample every 100 ms during the render.
- [ ] A Chromium that cannot launch logs `menu_pdf.launch_failed` once (no HTML, no URL in the log) and the call
  rejects with `PDF_UNAVAILABLE`; the server keeps running.

### Should Have (P1)
- [ ] `render.yaml` gets a comment line naming the env var `MENU_PDF_CHROME_PATH` (optional, local only) and
  saying the live service needs no build-command change (no install script).

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- No screen in this plan. Page recipe: none — the smoke route answers JSON or a PDF, no page of its own.
- No dictionary keys.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Add the small Chromium and its driver to the server without any install step — puppeteer-core and @sparticuz/chromium pinned exact — server/package.json, server/pnpm-lock.yaml
- [ ] A2: Build the one render service that turns menu HTML into a PDF and a page into a picture — renderPdf, screenshotUrl, one browser, idle close, queue of 3, navigation allow-list, private-address guard, launch-failure log — server/services/menu-pdf.js (helpers in server/services/menu-pdf/ if it grows past ~250 lines)
- [ ] A3: Prove the guards and the queue with the browser faked — server/test/menu-pdf.test.js
- [ ] A4: Render the sample menu for real when a browser exists, and skip cleanly when not — server/test/menu-pdf-real.test.js
- [ ] A5: Give the platform admin one address that renders the sample menu and reports time and memory — pdf-smoke route, mount — server/routes/menu-design.js, server/app.js, server/test/menu-design-route.test.js
- [ ] A6: Keep two fonts on the server to compare against loading them from Google — fetch script, woff2 files — server/scripts/menu-fonts-fetch.js, server/assets/menu-fonts/**
- [ ] A7: Register the new render service so later plans reuse it — family `menu-pdf` entry, inventory line, server folder map, render.yaml comment — docs/brain/component-families.md, docs/brain/inventory.md, server/breadcrumbs.md, render.yaml
- [ ] A8: Measure on a real free Render instance and write the numbers and the decision — the human step in Done-when; the builder writes the decision line template in Execution Notes — this plan file

## Technical Considerations
- Dependencies: `renderMenuDocument`, `baseDesign`, `SAMPLE_MENU_DOC` from plan 764, at
  `shared/schemas/menu-design/` (map extension E1); the server requires them from
  `server/generated/schemas/menu-design/` after `pnpm build:schemas`.
- New files needed: `server/services/menu-pdf.js`, `server/routes/menu-design.js`, `server/scripts/menu-fonts-fetch.js`,
  `server/assets/menu-fonts/*.woff2`, three test files.
- Model changes: none.
- Backend / API: `GET /api/v1/menu-design/pdf-smoke` (platform admin). Plan 768 adds the export routes to the same router.
- Auth and validation: `verifyToken` + `requirePlatformAdmin`; `fonts` query must be `link` or `embedded`.
- Security surface: a headless browser on the server is a new attack surface. (1) The PDF page runs with JavaScript
  off and may load only `data:`, `fonts.googleapis.com`, `fonts.gstatic.com` and `res.cloudinary.com`; the HTML
  comes only from `renderMenuDocument`, which escapes every text (plan 764). (2) `screenshotUrl` is an SSRF risk
  (it fetches a URL a user typed, plan 766): https and port 443 only, the host and every sub-request refused when
  they resolve to a loopback, private, link-local (cloud metadata `169.254.169.254`), CGNAT or multicast address;
  DNS rebinding between the check and Chromium's own lookup is the remaining gap, narrowed by checking each request
  in interception. (3) No HTML, URL or PDF content in logs. (4) The queue caps memory use: a fourth waiting request
  gets `503 PDF_BUSY`. `pre-commit-secret-scan.mjs` and the CI security workflow are the gates.
- Data / migration: none.
- Project checks: log-query `[auto]` item included; `pnpm run test:server` runs the server tests; no `[ui]` card
  (no page).
- Render: the build command (`pnpm --dir server install --frozen-lockfile`) installs the new packages with no
  install script; `@sparticuz/chromium` unpacks into `/tmp` at first launch (part of the cold start being measured).
  The free fallback if the numbers fail (peak total over ~450 MB, or a crash): see Critical Questions Q2.

## Out of Scope
- The export route, storing the PDF, the powered-by line logic, paging tests of real menus (plan 768).
- The designer's URL reference and its AI call (plan 766).
- Any paid Render tier or paid PDF service.

## Critical Questions
- Q: Where is the measurement run? A: (a) a temporary second free Render web service from the plan branch, same build and start commands and env vars except `MONGO_URI` pointing at a test database, deleted after the measurement (Dandan 2026-11-27). `render.yaml` names `foodvibe1-0-1-frankfurt` as the live service, so the live service is not used.
- Q: Free fallback if Chromium does not fit next to the server on 512 MB? A: (a) the PDF is made in the user's own browser from the same `renderMenuDocument` HTML (hidden frame + print to "Save as PDF") for the in-app stage; the server render is revisited before the WhatsApp stage (Dandan 2026-11-27).
- Q: Where does the server read the shared template from? A: map extension E1 — `shared/schemas/menu-design/`,
  required on the server from `server/generated/schemas/menu-design/` after `pnpm build:schemas`.

## Execution Notes

Decision line to fill after the human measurement (the Planner copies it into the map's "Contract extensions"):
`C-PDF decision 2026-MM-DD: <puppeteer-core + @sparticuz/chromium | fallback (a|b)> — cold start <n> ms, render <n> ms, peak total <n> MB, fonts <link|embedded>.`

- behaviour: the smoke route lives in the program's own router (`server/routes/menu-design.js`), not in `admin.js`,
  so plan 768 extends one file; it is platform-admin only.
- behaviour: the browser is closed after 60 s idle rather than kept warm, trading a slower next PDF for memory on
  the 512 MB host.
