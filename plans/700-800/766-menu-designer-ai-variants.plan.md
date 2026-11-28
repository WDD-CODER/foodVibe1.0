# Plan 766 — AI in the designer: three variants from a picture, link or description, then refine in words

Status: done
Depends-on: 764, 765
Track: code
Snapshot: d34a01068fe2f1b28efd33b753b8a3f69aa8762b

## Problem Statement
Plan 765 lets the chef build a menu design by hand. Most chefs know the look they want from something they have seen:
a menu photo, a restaurant's website or a few words ("elegant, dark, gold"). Brief decision D7: the chef gives a
reference (a picture, a link or a description) and gets **three variants** to choose from, then refines the chosen
one in plain words ("darker", "more elegant", "bigger dish names"). D8: the AI never writes HTML or CSS. It only fills
the fixed design schema (`menuDesignDraftSchema`) and picks fonts from the curated Hebrew list. An invalid answer
falls back to a base template, never to a broken render (guideline 4). A reference gives style (palette, font
character, mood, layout type), not a copy of the reference, and the screen says so.

Verified on `origin/main` d34a0106 (plans 764, 765 and 767 are taken as their contracts):
- AI sub-routers: `server/routes/ai.js:113-117` mounts `./ai/voice`, `./ai/logistics`, `./ai/invoices`, `./ai/diag`,
  `./ai/stock`; a sub-router reads `respondFromGeminiFailure`, `usageOf`, `requestedModel` with `require('../ai')`
  inside the handler (`server/routes/ai.js:1887-1894`, comment at `:111`). `trackAiOutcome` runs on every AI route (`:107`).
- An image goes to the model as `{ inlineData: { mimeType, data } }` with `needsMedia: 'image'` and
  `usage: { ...ai.usageOf(req), feature }` (`server/routes/ai/invoices.js:51-68`); `callGemini` records every call in
  the usage ledger and refuses over the business's monthly cap (`server/services/gemini-client.js:427`).
  `extractJsonPayload` (`server/services/ai-recipe-helpers.js`) reads the JSON out of the answer.
- Per-route limiter pattern with an env override for tests: `server/routes/ai/invoices.js:28-33`.
- Module gate on an AI route: `requireModule('event_logistics')` (`server/routes/ai/logistics.js:57`).
- URL safety: `isSafeUrl(rawUrl)` (`server/routes/ai.js:59`, not exported yet) refuses non-http(s) and private
  addresses after a DNS lookup; `safeFetch` checks every redirect hop (`:76`).
- Request schemas live in `shared/schemas/ai-*.schema.ts` (e.g. `shared/schemas/ai-receipt-photo.schema.ts`:
  `RECEIPT_IMAGE_MAX_BASE64 = 1_800_000`, three image MIME types). The server body limit is 2 MB (`server/app.js:205`).
- Browser: `downscaleImage` (`src/app/core/utils/downscale-image.util.ts`) and the encode pattern in
  `GeminiService.encodeImage_` (`src/app/core/services/gemini.service.ts:452-468`); `aiCapErrorKey(err)`
  (`src/app/core/utils/ai-error.util.ts`) maps the monthly-cap refusal.
- Tests fake the model by stubbing global `fetch` and read the ledger (`server/test/ai-invoice-read.test.js:1-50`).

### Contracts used (verbatim from `docs/menu-design/menu-design-map.md`, frozen 2026-11-27, with extension E1)

**C-DESIGN** (the part the AI fills)
```ts
menuDesignDraftSchema = menuDesignSchema without baseDocShape and name   // what the AI must return (D8)
// fonts: { title, section, dish } each z.enum(MENU_FONT_IDS); colors: six hex /^#[0-9a-f]{6}$/i;
// background: { kind: 'color'|'texture'|'image', textureId?, imageUrl?, imageFit, veil }; frame; divider; logo; layout;
// fixedTexts; origin: 'manual' | 'ai'
```

**C-TEMPLATE** — `shared/schemas/menu-design/` (browser `@schemas/menu-design/*`, server
`server/generated/schemas/menu-design/*` — map extension E1): `MENU_FONTS` (`{ id, family, googleName, kind, weights }`),
`MENU_FONT_IDS`, `MENU_TEXTURES` / `MENU_TEXTURE_IDS`, `MENU_BASE_TEMPLATES`, `baseDesign(id): MenuDesignDraft`,
`SAMPLE_MENU_DOC`, `renderMenuDocument(design, doc, opts)`.

**C-PDF — the render service** (`server/services/menu-pdf.js`, decided by plan 767)
- `renderPdf(html): Promise<Buffer>` and `screenshotUrl(url, { width }): Promise<Buffer>` (the second feeds the
  designer's URL reference, plan 766).
- One browser at a time, launched on first use, closed after 60 s idle; a second request waits (queue of 3, then
  `503 PDF_BUSY`). Page navigation is blocked except `data:`, Google Fonts and `res.cloudinary.com` (the menu HTML
  can't reach the network otherwise). `screenshotUrl` accepts only `https:` public hosts (no localhost, no private ranges).

**C-AI — feature keys and routes**
- New keys in `server/constants/ai-features.js` (added in 764): `menu_design_variants`, `menu_design_refine`, `menu_from_text`.
- Routes live under `server/routes/ai/` (INV-6): `menu-design.js` (variants, refine — plan 766),
  `menu-from-text.js` (plan 770). Prompts are written in English. AI output is parsed with `menuDesignDraftSchema`;
  an invalid answer falls back to the base template, never a broken render (guideline 4).

## Goals & Success Criteria
**Primary:** in the designer, the chef gives a picture, a link or a few words, gets three different sample menus
within about 30 seconds, picks one, types «יותר כהה ושמות מנות גדולים יותר» and sees the sample change; every result
is a valid design that the hand controls can still change, and every call shows in the AI usage report.

- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0.
- [auto] `pnpm run test:server` exits 0, including `server/test/ai-menu-design.test.js` and `server/test/menu-design-ai-clean.test.js`.
- [auto] `server/test/ai-menu-design.test.js` (model faked by stubbing `fetch`, screenshot faked through
  `setMenuPdfForTests` from plan 767 or a module mock):
  - `POST /api/v1/ai/menu-design/variants` with `{ reference: { kind: 'text', text: 'elegant dark wedding' } }` and a
    model answer of three valid drafts → 200 with three `variants`, each passing `menuDesignDraftSchema`, `origin: 'ai'`,
    `fallback: false`; one `aiUsage` row with feature `menu_design_variants`.
  - an answer with one draft carrying font `"Comic Sans"` and one non-JSON answer → that variant is a base design with
    `fallback: true`; the other variants are kept; a fully broken answer → three base designs, all `fallback: true`, status 200.
  - an image reference sends one `inlineData` part with `image/jpeg`; a 2 000 001-character image → 400 `IMAGE_TOO_LARGE`, no model call.
  - a link reference `http://127.0.0.1/x` → 400 `URL_NOT_ALLOWED`, no screenshot and no model call; `https://example.com`
    → one screenshot call, then one model call with an `image/png` part.
  - an answer that sets `background.imageUrl` or `logo.url` → both are removed (the AI never picks pictures); `fixedTexts`
    are never taken from the answer.
  - `POST /api/v1/ai/menu-design/refine` with `{ design, request: 'darker' }` → 200 `{ design, fallback: false }`, one
    `aiUsage` row `menu_design_refine`; the current design's `imageUrl`, `logo.url` and `fixedTexts` are kept; an invalid
    answer → the sent design unchanged with `fallback: true`.
  - a business without `menu_design` → 403 `MODULE_OFF`; a request over the business's monthly cap → the cap refusal, no model call.
- [auto] `pnpm run test:ci` exits 0, including `src/app/core/services/menu-design-ai.service.spec.ts` and
  `src/app/shared/menu-designer/ai-panel/menu-design-ai-panel.component.spec.ts`.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/766-menu-designer-ai-variants.plan.md` → `ARCH: ok`;
  `node scripts/scope-check.mjs --reuse --plan=plans/766-menu-designer-ai-variants.plan.md` exits 0.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [ui] `e2e/ui/766-1.spec.ts`: with `menu_design` on and `**/api/v1/ai/menu-design/variants` answered by `page.route`
  with three fixed drafts, the designer's «עיצוב בעזרת AI» → «תיאור» → typing «כהה ואלגנטי» → «הצעת עיצובים» shows three
  sample menus; «בחירה» on the second closes the popup and the editor's preview frame shows that draft's title color.
  Screenshot `screens/766-1.png`.
- [ui] `e2e/ui/766-2.spec.ts`: with `**/api/v1/ai/menu-design/refine` answered by `page.route`, typing «שמות מנות גדולים
  יותר» in «שינוי במילים» and «החלה» updates the preview; «ביטול השינוי» brings the previous design back. Screenshot `screens/766-2.png`.
- [human] With the real model, a photo of a printed menu, a restaurant website link and the words «כפרי, חם, עץ» each give
  three variants that differ from each other and fit the reference's mood; Hebrew sample dishes read well in all of them.
- [human] Refining in words («יותר כהה», «יותר אלגנטי», «שמות מנות גדולים יותר») changes what was asked and little else;
  the hand controls still change the result afterwards.
- [human] The panel says, before anything is sent, that the reference gives a style and not a copy
  («העיצוב לוקח השראה מהדוגמה — צבעים, אופי הגופנים ואווירה — ולא מעתיק אותה»).
- [human] the screen's page with the data request failing · open the page · a readable error with a retry appears, not a blank page — here: with the server stopped, «הצעת עיצובים» shows «לא הצלחנו ליצור עיצובים» with «נסו שוב» and the current design stays.
- [human] a dialog with an explained control · hover the control · its explanation shows as a tooltip and no explanation text sits on the modal — here: the three reference choices (תמונה, קישור, תיאור).

## Execution Mode
- Parallel: yes — with 768 (wave 2, run `md-export`); no shared files (768 uses `renderPdf`, this plan `screenshotUrl`; neither edits `server/services/menu-pdf.js`).
- Concurrent plans: 768.
- Isolated DB: no — writes nothing but `aiUsage` rows through `callGemini`.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/ai/menu-design.js
server/routes/ai.js
server/utils/menu-design-ai.js
shared/schemas/ai-menu-design.schema.ts
shared/schemas/index.ts
server/test/ai-menu-design.test.js
server/test/menu-design-ai-clean.test.js
src/app/core/services/menu-design-ai.service.ts
src/app/core/services/menu-design-ai.service.spec.ts
src/app/shared/menu-designer/**
src/app/core/services/http-storage.adapter.ts
src/app/app.config.ts
e2e/ui/766-1.spec.ts
e2e/ui/766-2.spec.ts
server/breadcrumbs.md
src/app/shared/breadcrumbs.md
src/app/core/services/breadcrumbs.md
docs/brain/component-families.md
docs/brain/inventory.md
docs/menu-design/menu-design-map.md
server/test/ai-known-metadata.test.js
server/test/modules-registry.test.js
server/test/price-list-prompt.test.js
src/app/core/services/async-storage.service.spec.ts
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
- INV-6: preserves — both calls go through `callGemini` from `server/routes/ai/menu-design.js`, mounted under
  `server/routes/ai.js`; the browser sends the reference to the server and never holds a key. Every call is metered
  (`menu_design_variants`, `menu_design_refine`) and counts against the business's monthly cap.
- INV-4: preserves — the request shape is one shared schema (`shared/schemas/ai-menu-design.schema.ts`); the AI's answer
  is checked with the shared `menuDesignDraftSchema` before it leaves the server; the AI writes nothing to the database
  (the chef saves through plan 765's generic write, which the server validates).
- INV-1: preserves — the route stores nothing and reads no other document; the business comes from the signed token
  (`usageOf(req)`), gated by `requireModule('menu_design')`.

## Reuse Check
- `server/routes/ai/menu-design.js` (variants, refine) — family: ai-cap — rung: 2 — why: a sub-router on the existing AI mount; `callGemini` with `usage.feature` meters and caps it like the invoice and stock routes
- image reference to the model — family: model-media — rung: 1 — why: `needsMedia: 'image'` with one `inlineData` part, as `server/routes/ai/invoices.js`
- link reference — family: helpers — rung: 2 — why: `isSafeUrl` from `server/routes/ai.js` (exported here, one line) then `screenshotUrl` from plan 767's C-PDF service
- `menuDesignPrompt`, `cleanDesignVariant`, `cleanRefinedDesign` (`server/utils/menu-design-ai.js`) — family: helpers — rung: 3 — why: pure prompt text and answer cleaning, beside the other `server/utils/*` AI cleaners, tested alone
- `menuDesignVariantsRequestSchema`, `menuDesignRefineRequestSchema` (`shared/schemas/ai-menu-design.schema.ts`) — family: entity-schemas — rung: 3 — why: one request schema file per AI route, as `ai-receipt-photo.schema.ts`
- `MenuDesignAiService` (`src/app/core/services/menu-design-ai.service.ts`) — family: http — rung: 3 — why: two POSTs through `API.ai('menu-design/…')` with the image encode pattern of `GeminiService`; kept out of the 469-line `GeminiService`
- `MenuDesignAiPanelComponent` (`src/app/shared/menu-designer/ai-panel/`) — family: none — rung: 4 — why: no piece takes a style reference and offers designs; it is part of the self-contained designer (plan 765), so every host of the designer gets it
- `MenuDesignAiRefineComponent` and `menuDesignAiErrorKey` (`src/app/shared/menu-designer/ai-panel/`) — family: menu-design-ai — rung: 3 — why: the change-in-words box sits under the preview, away from the suggest panel, and shares its styles and failure keys
- AI panel components `menu-design-ai-panel`, `menu-design-ai-refine` and their layout classes `.ai-panel`, `.ai-panel__title`, `.ai-panel__kinds`, `.ai-panel__row`, `.ai-panel__note`, `.ai-panel__error`, `.ai-variants`, `.ai-variants__card`, `.ai-variants__pick` (added by the builder) — family: menu-designer — rung: 2 — why: the designer's own AI groups, on `.c-glass-panel`, `.c-chip-group` and the button engines; registered as the family menu-design-ai
- designer layout classes `.menu-designer__ai`, `.menu-designer__side` (added by the builder) — family: menu-designer — rung: 2 — why: room under the AI panel, and the column that holds the preview with the change box below it
- reference kind choice — family: chip — rung: 2 — why: `.c-chip-group` with `role="radiogroup"`
- variants popup — family: modal-shell — rung: 2 — why: `app-modal-shell` with three `app-menu-preview` cards (plan 765)
- description and refine boxes — family: form-field — rung: 1 — why: `app-form-field` + `textarea` (auto-grow)

## Adopt Check
- style reference → design (model call) — verdict: skip — why: domain logic on the existing Gemini client; no package.

## Defaults

- loading-and-error-states — applies — how: «הצעת עיצובים» and «החלה» show an inline `app-loader` and are disabled while the call runs; a failure is a toast «לא הצלחנו ליצור עיצובים» / «לא הצלחנו להחיל את השינוי» with «נסו שוב», and the current design stays.
- hints-in-tooltips — applies — how: each reference choice (תמונה, קישור, תיאור) carries its explanation as `[attr.title]` + `aria-describedby`; the variants popup holds no hint text.
- confirm-destructive-action — exception — why: picking a variant or applying words replaces the unsaved draft, which «ביטול השינוי» restores at once; nothing stored is deleted.
- unsaved-changes-on-leave — exception — why: the panel lives inside plan 765's edit page, whose guard already covers the draft the AI changes.
- anchored-popup — exception — why: the variants choice is a centred `app-modal-shell`, not a small floating box.
- app-list-container — exception — why: no list page; the three variants are cards inside a popup, not a list of records.
- one-breakpoint-set — applies — how: the variants popup goes from three cards in a row to one column only at the shared breakpoint names (`src/app/core/styles/_breakpoints.scss`); no new `@media` width.
- empty-state-on-list — exception — why: no list; the popup always holds three cards (fallback designs fill any missing one).
- leave-and-return — exception — why: the panel sends the user to no other page.
- row-action-icons — exception — why: no list rows; each variant card has one «בחירה» button and nothing to edit or delete.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want to show the designer a menu or a website I like and get a few designs in that spirit, so that I
  don't have to pick every color and font myself.
- As a chef, I want to say in my own words what to change, so that I can fine-tune a design without learning the controls.

## Functional Requirements

### Must Have (P0)
- [ ] **Request schemas** (`shared/schemas/ai-menu-design.schema.ts`, exported from `shared/schemas/index.ts`):
  `MENU_DESIGN_IMAGE_MAX_BASE64 = 1_800_000`; `MENU_DESIGN_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']`;
  `menuDesignVariantsRequestSchema = z.object({ reference: z.discriminatedUnion('kind', [
  { kind: 'image', imageBase64, mimeType, note?: max 300 }, { kind: 'url', url: max 500 }, { kind: 'text', text: 1..500 } ]),
  model?: string })`; `menuDesignRefineRequestSchema = z.object({ design: menuDesignDraftSchema, request: z.string().trim().min(1).max(300), model?: string })`.
- [ ] **Routes** (`server/routes/ai/menu-design.js`, mounted `router.use('/menu-design', require('./ai/menu-design'))` in
  `server/routes/ai.js` beside the other mounts): both `verifyToken, requireModule('menu_design')`, an own limiter
  (`MENU_DESIGN_AI_LIMIT_MAX`, default 30 per 15 minutes, `userOrIpKey`), 503 without `GEMINI_API_KEY`.
  - `POST /variants`: size and MIME checks before parsing (`IMAGE_TOO_LARGE`, `UNSUPPORTED_FILE_TYPE`), then the schema
    (`INVALID_REQUEST`). `url` → `isSafeUrl` and `https:` only (`URL_NOT_ALLOWED`), then `screenshotUrl(url, { width: 1280 })`
    (a failure → 502 `URL_CAPTURE_FAILED`); the PNG becomes the image part. One `callGemini` call (`needsMedia: 'image'`
    when there is an image, `temperature: 0.8`, feature `menu_design_variants`) asking for
    `{ "variants": [draft, draft, draft] }`. Answer: `{ variants: { design: MenuDesignDraft, fallback: boolean }[3] }`.
  - `POST /refine`: one `callGemini` call (`temperature: 0.3`, feature `menu_design_refine`) with the current design as
    JSON and the request; answer `{ design: MenuDesignDraft, fallback: boolean }`.
  - Gemini failures go through `ai.respondFromGeminiFailure(res, call)` (cap, busy, timeout). Logs carry lengths and
    kinds only, never the reference text, the URL or the image.
- [ ] **Prompt and cleaning** (`server/utils/menu-design-ai.js`): `menuDesignPrompt(kind)` — English system text that
  lists every field of the draft with its allowed values (the font ids with their kind, the texture ids, the enums), says
  the result styles a Hebrew restaurant menu, asks for three clearly different variants that take the palette, font
  character, mood and layout type from the reference without copying it, and forbids any other key. `cleanDesignVariant(raw, i)`
  → parse with `menuDesignDraftSchema`; drop `background.imageUrl` (kind `image` becomes `texture` `paper`) and `logo.url`;
  set `fixedTexts` to `{}` and `origin: 'ai'`; invalid → `baseDesign(MENU_BASE_TEMPLATES[i])` with `fallback: true`.
  `cleanRefinedDesign(raw, current)` → parsed draft with the current `background.imageUrl` (when the answer keeps kind
  `image`), `logo`, `fixedTexts` restored; invalid → `current` with `fallback: true`.
- [ ] **Browser service** `MenuDesignAiService`: `variants(reference)` (an image file is downscaled to 1600 px, quality
  0.8, a second try at 1200 px / 0.6 when still over the limit) and `refine(design, request)`, both through `API.ai(...)`.
- [ ] **Panel** `app-menu-design-ai-panel`, placed at the top of `app-menu-designer` (so every host gets it), shown only
  when `modules.has('menu_design')`:
  - «עיצוב בעזרת AI» — reference chips «תמונה» (file picker, `accept="image/*"`, optional note), «קישור» (URL field),
    «תיאור» (textarea, 500); the style-not-copy line above the send button; «הצעת עיצובים».
  - The answer opens a popup with three `app-menu-preview` cards of `SAMPLE_MENU_DOC`, each with «בחירה»; a fallback card
    is marked «עיצוב בסיס (ה-AI לא הצליח)». A pick sets the designer's draft to the variant, keeping the draft's
    `fixedTexts`, `logo` and (if the variant has no image) nothing else of the old look; `origin` becomes `'ai'`.
  - «שינוי במילים» — a text box (300) and «החלה» under the preview; the answer replaces the draft; «ביטול השינוי» restores
    the draft from before the last AI change (one step).
  - A cap refusal shows the `aiCapErrorKey` message.

### Should Have (P1)
- [ ] When plan 767 recorded in C-PDF that `screenshotUrl` is not available on the server, `POST /variants` with a link
  answers 501 `URL_REFERENCE_UNAVAILABLE` and the panel hides «קישור»; the decision is written in Execution Notes.

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Page recipe: none — no new page; the panel is part of plan 765's designer (`recipe-form` page `/menu-design/:id`).
- RTL: the panel is Hebrew; the URL field is `dir="ltr"`.
- Dictionary keys (append): `menu_design_ai_title`, `menu_design_ai_ref_image`, `menu_design_ai_ref_url`,
  `menu_design_ai_ref_text`, `menu_design_ai_ref_image_hint`, `menu_design_ai_ref_url_hint`, `menu_design_ai_ref_text_hint`,
  `menu_design_ai_note_placeholder`, `menu_design_ai_style_not_copy`, `menu_design_ai_suggest`, `menu_design_ai_variants_title`,
  `menu_design_ai_pick`, `menu_design_ai_fallback`, `menu_design_ai_refine_label`, `menu_design_ai_refine_apply`,
  `menu_design_ai_undo`, `menu_design_ai_failed`, `menu_design_ai_refine_failed`, `menu_design_ai_url_not_allowed`,
  `menu_design_ai_url_failed`, `menu_design_ai_image_too_large`.
- Icons (register in `src/app/app.config.ts` if missing): `sparkles`, `link`, `image`, `undo-2`.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Describe what the browser may send for a style reference or a refine request — the two request schemas and the image limits, exported from the schemas index; build:schemas — shared/schemas/ai-menu-design.schema.ts, shared/schemas/index.ts
- [x] A2: Write the instructions for the AI and the cleaning that keeps only valid designs — menuDesignPrompt, cleanDesignVariant, cleanRefinedDesign (no pictures from the AI, fixed texts kept, base fallback) with their own tests — server/utils/menu-design-ai.js, server/test/menu-design-ai-clean.test.js
- [x] A3: Add the two AI routes that turn a picture, link or description into designs and refine one in words — sub-router with module gate, limiter, size checks, isSafeUrl (export it from ai.js) and screenshotUrl, metered callGemini, mount line — server/routes/ai/menu-design.js, server/routes/ai.js, server/test/ai-menu-design.test.js
- [x] A4: Let the browser call the two routes with a shrunk image — MenuDesignAiService with the two-step downscale — src/app/core/services/menu-design-ai.service.ts (+ spec), src/app/core/services/http-storage.adapter.ts (only if API.ai needs nothing new, leave it)
- [x] A5: Put the AI panel into the designer with the three-variant choice, refine in words and one-step undo — panel component, popup of three previews, style-not-copy line, cap message, dictionary keys, icons — src/app/shared/menu-designer/**, public/assets/data/dictionary.json, src/app/app.config.ts
- [x] A6: Prove the panel in the running app with the model answers faked — e2e/ui/766-1.spec.ts, e2e/ui/766-2.spec.ts with page.route answers and module restore
- [x] A7: Record the new route, helpers and panel in the folder maps and the family registry — server/breadcrumbs.md, src/app/shared/breadcrumbs.md, src/app/core/services/breadcrumbs.md, docs/brain/component-families.md, docs/brain/inventory.md

## Technical Considerations
- Dependencies: plan 764 (`menuDesignDraftSchema`, `MENU_FONTS`, `baseDesign`, the two AI feature keys), plan 765
  (`app-menu-designer`, `app-menu-preview`), plan 767 (`screenshotUrl`).
- New files needed: listed in the scope.
- Model changes: none (the draft schema is 764's).
- Backend / API: `POST /api/v1/ai/menu-design/variants`, `POST /api/v1/ai/menu-design/refine` — both dedicated
  because they call the model, which only `server/routes/ai/**` may do (INV-6).
- Auth and validation: signed token, `requireModule('menu_design')`, own limiter, monthly cap through `callGemini`;
  request checked by the shared schemas, answer by `menuDesignDraftSchema`.
- Security surface: a user-supplied URL is opened by a headless browser on the server — guarded twice (`isSafeUrl` here,
  the host rules of C-PDF in `screenshotUrl`); the image is sent to the model and never stored; the AI cannot set any
  picture URL or business text; logs carry no reference content.
- Data / migration: none.
- Project checks: log-query item (Done-when); Reuse Check present; page recipe line in UI/UX Notes; breadcrumbs in
  scope; Hebrew strings through `translatePipe`; prompts in English.

## Out of Scope
- AI-generated background pictures (deferred, D9).
- Creating designs by WhatsApp chat (D6).
- Storing the reference picture or link (never stored).
- An AI draft trail (`aiDrafts`) for designs.

## Critical Questions
- none

## Execution Notes
- Planner 2026-11-28: Depends-on drops 767. Its code (`menu-pdf.js`, `screenshotUrl`) merged with run md-1 (PR #691); 767 stays open only for its human Render measurement (A8), which this plan doesn't need.
- behaviour: an answer that is not a valid design gives a base template marked as such, never an error, so the chef always sees three choices.
- behaviour: the AI never sets a picture: an AI background of kind `image` becomes the `paper` texture; the chef's own uploaded background and logo are kept when refining.
- behaviour: picking a variant keeps the draft's business name, contact line and logo.
- behaviour: undo goes back one AI step only.
- behaviour: the AI routes need only the `menu_design` module (not `ai_create`).
- behaviour: no `aiDrafts` trail for designs — there is nothing to learn from a style choice yet.

### Builder (2026-11-28, run md-2a)

- P1 not triggered: plan 767 recorded nothing about `screenshotUrl` being unavailable (its A8 measurement is still
  open), so there is no `501 URL_REFERENCE_UNAVAILABLE` and «קישור» always shows.
- The designer asks `ModuleService.modules_()` rather than `has('menu_design')`: the same answer, and the edit page's
  spec (outside the scope) fakes a `BusinessService` without `loaded_`.
- `http-storage.adapter.ts` and `app.config.ts` unchanged: `API.ai` and the four icons were already there.
- The two `[ui]` specs are written and were not run.
- behaviour: a failed call shows the toast and keeps the same message under the button with «נסו שוב» (the toast has no
  action button). Reverse: remove the `role="alert"` block in the two ai-panel templates.
- behaviour: a refine answer marked `fallback` shows «לא הצלחנו להחיל את השינוי» with «נסו שוב» and adds no undo step.
  Reverse: emit the design whatever `fallback` says in `MenuDesignAiRefineComponent.onApply`.
- behaviour: the variants popup has a «ביטול» button; it, Escape and a backdrop click drop the three designs.
  Reverse: remove the `c-modal-actions` row in the panel template.
- behaviour: «ביטול השינוי» restores the whole draft from before the last AI change, so hand edits made after that
  change go too. Reverse: change `onAiUndo` in the designer.
- behaviour: an AI change clears a half-typed color and a picked image kind that has no picture yet. Reverse: edit
  `showDesign_` in the designer.
- behaviour: a refined design is marked `origin: 'ai'`; the typed words stay in the box. Reverse: `withoutOwnValues`
  in `server/utils/menu-design-ai.js`; clear `request_` after a success.
- behaviour: a used-up model shows the general failure message; the designer offers no model switch. Reverse: use
  `GeminiService.offerModelSwitch` in the two ai-panel components.
- seen: `server/routes/ai.js:37-38` with `:64` — the private-address patterns `^fc` / `^fd` are also tested on host
  names, so a public site such as `https://fdexample.com` is refused as a link (here and in the URL imports).

#### Evidence (run on `ff621add`; the commit after it changes this file only)

- `pnpm run build` -> exit 0; `pnpm run lint` -> exit 0 (0 errors, 69 warnings); `pnpm run lint:icons` -> exit 0.
- `pnpm run test:ci` -> exit 0, `TOTAL: 2905 SUCCESS`.
- `pnpm run test:server` -> exit 0, 157 files, 2127 tests passed (the two new server test files among them).
- `scope-check.mjs --arch` -> `ARCH: ok INV-6, INV-4, INV-1`; `--reuse` -> `REUSE: ok`; kit
  `scope-check.mjs --diff=origin/orch/md-2a` -> `SCOPE: ok`; kit `kit-checks.mjs` -> `KIT_CHECKS: ok (6 checks)`;
  kit `kit-manifest-check.mjs` -> `KIT_MANIFEST: ok`.
- `breadcrumbs-check.mjs` -> `BREADCRUMBS: clean`; `log-query.mjs --since=plan-start --level=error` ->
  `SKIP: no database configured`.
