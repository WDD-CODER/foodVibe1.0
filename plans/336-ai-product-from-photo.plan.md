# Plan 336 — AI product from a photo

Status: active
Snapshot: acab8cff39fd0240f67af00439a8bd044c23889e

## Problem Statement

Creating a product with AI only accepts text. Dandan wants to photograph a product (packaging or label) and have AI fill in the product draft. The photo is only used as AI input; it isn't stored on the product.

The recipe flow already does this: `POST /api/v1/ai/generate-from-image` (`server/routes/ai.js:1238`), `GeminiService.generateFromImage()` (`gemini.service.ts:66`), and the text/image/url tabs in `ai-recipe-modal` (`inputMode_`, `imageFile_`, `imagePreviewUrl_`, `onImageSelected()`). The product modal (`ai-product-modal.component.ts`) only has `prompt_`.

Constraint: the server caps request bodies at `express.json({ limit: '2mb' })` (`server/app.js:124`). A phone photo encoded as base64 is 4–10MB, so it must be downscaled on the client first. The recipe image path has the same latent bug.

## Goals & Success Criteria

- Primary: in AI-create, the user can take or pick a photo and get a product draft back.
- Success: a full-resolution phone photo goes through without a 413 error. The draft's categories and allergens resolve through the registry (from plan 335).

## Execution Mode

- Parallel: yes
- Concurrent plans: must run after plan 335 ("AI product: register categories and allergens") — **plan 335 is still `active` as of this save; do not take plan 336 until 335 is done.** Nothing else may touch `server/routes/ai.js` or `src/app/shared/ai-product-modal/**` while it runs.
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```
src/app/shared/ai-product-modal/**
src/app/shared/ai-recipe-modal/ai-recipe-modal.component.ts
src/app/core/services/gemini.service.ts
src/app/core/services/gemini.service.spec.ts
src/app/core/utils/downscale-image.util.ts
src/app/core/utils/downscale-image.util.spec.ts
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts
server/routes/ai.js
server/test/**
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

As a chef receiving goods, I want to snap a photo of a product and get it added without typing.

## Functional Requirements

### Must Have (P0)

- [x] New `POST /api/v1/ai/generate-product-from-image`, same guards as `/generate-from-image` (`verifyToken`, `aiLimiter`, usage limit, mimeType check). Prompt = `PRODUCT_GENERATE_SYSTEM_PROMPT` + "Identify the product from the photo (packaging, label, or the item itself)" + the known-keys block from plan 335. Image goes as `inlineData`. Output passes through `validateProductDraft()`. Response shape is `{ product }`, like `/generate-product`.
- [x] `GeminiService.generateProductFromImage(file, knownKeys)`.
- [x] New `downscaleImage(file, maxEdge = 1280, quality = 0.8): Promise<File>` in `src/app/core/utils/downscale-image.util.ts`. It uses canvas, outputs JPEG, and skips when the file is already small.
- [x] The AI-product modal in create mode gets a text / image toggle, like `ai-recipe-modal`. The image input uses `accept="image/*"` and `capture="environment"`, with a preview. Generate calls the new method. The result fills `draft_` and goes through the same review → confirm flow.

### Should Have (P1)

- [x] `GeminiService.generateFromImage()` (recipes) also uses `downscaleImage()`, which fixes the latent 413.

### Nice to Have (P2)

- [x] Optional text hint alongside the photo ("brand, size…"), sent as an extra text part.

## UI/UX Notes

- Toggle labels: reuse `ai-recipe-modal`'s keys if they're generic (check dictionary for the `ai_input_text` / `ai_input_image` style). Otherwise add `ai_product_from_text` = "מטקסט" and `ai_product_from_image` = "מתמונה".
- Mobile: the image button opens the rear camera directly.
- The photo is never uploaded to Cloudinary or stored.

## Atomic Sub-tasks

- [x] A1: Write the `downscaleImage` util and its spec (dimensions capped, small file passthrough). — `src/app/core/utils/downscale-image.util.ts`, `downscale-image.util.spec.ts`
- [x] A2: Add the server endpoint plus a test (missing image → 400; bad mime → 400). — `server/routes/ai.js`, `server/test/**`
- [x] A3: Add `GeminiService.generateProductFromImage`, using the util. — `src/app/core/services/gemini.service.ts`, `gemini.service.spec.ts`
- [x] A4: Add the modal toggle, image picker, preview and generate wiring. On confirm, the result goes through the create path from plan 335 (registry resolver). — `src/app/shared/ai-product-modal/**`
- [x] A5: Recipe image path uses the util (P1). (Done inside `GeminiService.generateFromImage()` via the shared `encodeImage_()` — the modal needed no change.) — `src/app/shared/ai-recipe-modal/ai-recipe-modal.component.ts`
- [x] A6: Build and run specs. Update the session-state file.

## Technical Considerations

- Dependencies: `AiProductModalComponent` / `AiProductModalService`, `GeminiService`, `resolveDraftMetadata` (plan 335), `InventoryProductListComponent.openAiCreateModal()`.
- New files: `downscale-image.util.ts` plus its spec.
- Model changes: none (no image field on `Product`).
- Gemini stays server-side only.
- Hebrew canonical values: yes, handled by plan 335's resolver. Don't bypass it.

## Out of Scope

- Storing the product photo or adding `imageUrl` to `Product`.
- Changing the 2MB body limit.
- AI-edit (patch) mode with images.

## Critical Questions

If the photo can't be identified:
a) Show the existing AI error state, so the user can retry or type (default)
b) Fall back to a blank draft

## Success Criteria

- [x] [auto] `npx ng test --watch=false --include=src/app/core/utils/downscale-image.util.spec.ts` → 0 failures.
- [x] [auto] `npm run build` → exit 0.
- [x] [auto] Server tests for the new endpoint pass (`npm --prefix server test` or the repo's server-tests command) → 0 failures.
- [human] On the phone: Inventory → AI create → "מתמונה" → photograph a real product → the draft shows name, unit, categories and allergens → confirm → the product is created, with registered categories only.
- [human] Recipe AI from a full-resolution phone photo still works (no "request too large").
