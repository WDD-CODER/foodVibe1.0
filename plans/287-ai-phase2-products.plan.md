---
name: AI Phase 2 — Products
overview: "Extend AI-Everywhere pattern to Products: /generate-product + /patch-product endpoints, AiProductModal, ProductAiFlowService, and AI entry points on inventory list, product form, and QuickAddProductModal."
todos:
  - id: backend-generate-prompt
    content: "server/routes/ai.js — Add PRODUCT_GENERATE_SYSTEM_PROMPT"
    status: pending
  - id: backend-validate
    content: "server/routes/ai.js — Add validateProductDraft() helper"
    status: pending
  - id: backend-generate-endpoint
    content: "server/routes/ai.js — Add POST /generate-product endpoint"
    status: pending
  - id: backend-patch-prompt
    content: "server/routes/ai.js — Add PRODUCT_PATCH_SYSTEM_PROMPT"
    status: pending
  - id: backend-patch-endpoint
    content: "server/routes/ai.js — Add POST /patch-product endpoint"
    status: pending
  - id: model-types
    content: "Create src/app/core/models/ai-product-draft.model.ts"
    status: pending
  - id: gemini-methods
    content: "gemini.service.ts — Add generateProduct() + patchProduct()"
    status: pending
  - id: flow-service
    content: "Create src/app/pages/inventory/services/product-ai-flow.service.ts"
    status: pending
  - id: modal-service
    content: "Create src/app/shared/ai-product-modal/ai-product-modal.service.ts"
    status: pending
  - id: modal-component-ts
    content: "Create ai-product-modal.component.ts"
    status: pending
  - id: modal-component-html
    content: "Create ai-product-modal.component.html"
    status: pending
  - id: modal-component-scss
    content: "Create ai-product-modal.component.scss"
    status: pending
  - id: modal-mount
    content: "app.component.html + app.component.ts — mount AiProductModal"
    status: pending
  - id: dictionary-keys
    content: "dictionary.json — add 14 ai_product_* keys"
    status: pending
  - id: inventory-list-entry
    content: "inventory-product-list.component.ts — add HeroFab sparkles action"
    status: pending
  - id: product-form-entry
    content: "product-form.component.ts/.html — AI button + provide flow service"
    status: pending
  - id: quick-add-ai
    content: "quick-add-product-modal.component.ts/.html — AI icon button inline fill"
    status: pending
  - id: dictionary-keys-2
    content: "dictionary.json — add ai_product_open + ai_product_create_new"
    status: pending
isProject: false
---

# AI Phase 2 — Products

## Goal
Extend the AI-Everywhere pattern to Products — two backend endpoints, AiProductModal, ProductAiFlowService, and AI entry points on the inventory list, product form, and QuickAddProductModal.

## Atomic Sub-tasks

### Sub-brief 2.1 — Backend
- [ ] Task 1: `server/routes/ai.js` — Add `PRODUCT_GENERATE_SYSTEM_PROMPT` after `MENU_PATCH_SYSTEM_PROMPT`
- [ ] Task 2: `server/routes/ai.js` — Add `validateProductDraft()` helper
- [ ] Task 3: `server/routes/ai.js` — Add `POST /generate-product` endpoint (verifyToken, rawText → `{ product }`)
- [ ] Task 4: `server/routes/ai.js` — Add `PRODUCT_PATCH_SYSTEM_PROMPT`
- [ ] Task 5: `server/routes/ai.js` — Add `POST /patch-product` endpoint (verifyToken, currentProduct+instruction → `{ changes }`)

### Sub-brief 2.2 — Client layer
- [ ] Task 6: Create `src/app/core/models/ai-product-draft.model.ts` — AiProductDraft, AiProductPatch types
- [ ] Task 7: `src/app/core/services/gemini.service.ts` — Add `generateProduct()` + `patchProduct()` methods
- [ ] Task 8: Create `src/app/pages/inventory/services/product-ai-flow.service.ts` — `init()`, `applyDraft()`, `applyPatch()`

### Sub-brief 2.3 — Modal
- [ ] Task 9: Create `src/app/shared/ai-product-modal/ai-product-modal.service.ts`
- [ ] Task 10: Create `src/app/shared/ai-product-modal/ai-product-modal.component.ts`
- [ ] Task 11: Create `src/app/shared/ai-product-modal/ai-product-modal.component.html`
- [ ] Task 12: Create `src/app/shared/ai-product-modal/ai-product-modal.component.scss`
- [ ] Task 13: `app.component.html` + `app.component.ts` — mount `<app-ai-product-modal/>`
- [ ] Task 14: `public/assets/data/dictionary.json` — add 14 `ai_product_*` keys

### Sub-brief 2.4 — Integration
- [ ] Task 15: `inventory-product-list.component.ts` — add sparkles HeroFab action + `openAiCreateModal()`
- [ ] Task 16: `product-form.component.ts/.html` — `providers`, inject services, `openAiProductModal()`, button
- [ ] Task 17: `quick-add-product-modal.component.ts/.html` — inject GeminiService, `onAiFill()`, AI icon button
- [ ] Task 18: `public/assets/data/dictionary.json` — add `ai_product_open`, `ai_product_create_new`

## Rules
- CommonJS, single quotes, semicolons in `server/routes/ai.js`.
- No Angular decorators (`@Input`, `@Output`) in TypeScript — `inject()`, signals, `input()`, `output()` only.
- No `any`. Single quotes in TS, double quotes in HTML, no semicolons in TS.
- `.c-*` engine classes from `styles.scss` only.
- ProductForm must NOT grow more than ~25 LOC.
- QuickAddProductModal keyboard flow (Enter-to-save) must not be broken.
- Do NOT auto-generate suppliers.

## Done when
- `POST /generate-product` returns valid AiProductDraft JSON.
- `POST /patch-product` returns `{ changes }` sparse patch.
- Inventory list "add with AI" → create modal → generate → apply → creates Product → navigates to `/inventory/:id`.
- ProductForm "edit with AI" button → edit modal → instruction → diff → apply patches form.
- QuickAddProductModal AI icon fills fields; Enter-to-save still works.
- `ng build` passes.
