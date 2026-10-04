# Plan 335 — AI product: register categories and allergens through the registry

Status: active
Snapshot: acab8cff39fd0240f67af00439a8bd044c23889e

## Problem Statement

Creating a product with AI can store category and allergen values that were never registered in metadata, so they show up as stray labels. The AI prompt (PRODUCT_GENERATE_SYSTEM_PROMPT, server/routes/ai.js:1015) asks Gemini for Hebrew names, but the registry stores English keys (dairy→"חלבי").

Create path: InventoryProductListComponent.openAiCreateModal() (inventory-product-list.component.ts:201) passes draft.categories / draft.allergens straight to addProduct(), with no registry call at all.
Edit path: ProductAiFlowService.applyDraft() (pages/inventory/services/product-ai-flow.service.ts:15) does register the values, but then patches the form with the raw draft values, not the resolved keys. MetadataRegistryService.registerAllergen() (metadata-registry.service.ts:490) returns void, so the resolved key is lost.
Modal free-text: addCategory() / addAllergen() in ai-product-modal.component.ts:121-141 add unresolved strings too.

## Goals & Success Criteria

Primary: every category or allergen on an AI-created or AI-patched product is a registered registry key.
Success: an AI-created product never adds a value to the filter panel that isn't listed in Metadata → categories/allergens.

## Execution Mode

Parallel: yes
Concurrent plans: none touching server/routes/ai.js or src/app/shared/ai-product-modal/**. The AI-product-from-photo plan depends on this one: run it after.
Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
docs/session-state-<branch>.md, .claude/sessions/**, .worktree-*, and the append-only
hotspots (src/styles.scss, public/assets/data/dictionary.json, src/app/app.routes.ts
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/inventory/services/**
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.spec.ts
src/app/shared/ai-product-modal/**
src/app/core/services/metadata-registry.service.ts
src/app/core/services/metadata-registry.service.spec.ts
src/app/core/services/gemini.service.ts
server/routes/ai.js
server/test/**
scripts/take-plan.mjs
src/app/pages/inventory/components/product-form/**
server/routes/generic.js
server/test/push-to-master.test.js
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for approved: <path>; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when scope-check.mjs --drift reports REALITY: drift. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

As a chef, when AI fills a product for me, I want its categories and allergens to be the same ones I manage in Metadata, not new look-alikes.

## Functional Requirements

### Must Have (P0)
- [x] registerAllergen(name) returns Promise<string | null> (the resolved key), matching registerCategory.
- [x] One shared resolver, resolveDraftMetadata(draft, registry), maps each draft category and allergen through registerCategory / registerAllergen, drops nulls (user cancelled), dedupes, and returns { categories, allergens } as keys.
- [x] applyDraft() patches the form with the resolver output, not raw draft.*.
- [x] openAiCreateModal() runs the resolver before addProduct().
- [x] The client sends the user's current category and allergen keys to /generate-product and /patch-product. The server appends them to the system prompt: "prefer one of these existing keys; only invent if nothing fits".

### Should Have (P1)
- [x] The modal's free-text addCategory() / addAllergen() go through the same resolver.
- [x] validateProductDraft() (ai.js:1035) still accepts any strings: the client resolves them. No server rejection.

### Nice to Have (P2)
- None.

## UI/UX Notes

An unknown Hebrew value triggers the existing canonical-key / translation-modal flow (keyResolution.ensureKeyForContext). With several unknowns the modals appear one after another, which is acceptable.
No new dictionary keys.

## Atomic Sub-tasks

- [x] A1: Make registerAllergen return the key (or null). Update callers and the spec. (`src/app/core/services/metadata-registry.service.ts`, `src/app/core/services/metadata-registry.service.spec.ts`)
- [x] A2: Create src/app/pages/inventory/services/ai-draft-metadata.util.ts with resolveDraftMetadata(), plus a spec covering: known key passthrough, Hebrew→key, null dropped, dedupe.
- [x] A3: Wire it into ProductAiFlowService.applyDraft() and openAiCreateModal(). (`src/app/pages/inventory/services/product-ai-flow.service.ts`, `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts`)
- [x] A4: Route the modal's free-text add through it (P1). (`src/app/shared/ai-product-modal/**`)
- [x] A5: GeminiService: send knownCategories and knownAllergens in the product generate and patch bodies. ai.js: read them (optional arrays, cap 200 each) and append them to the prompt. (`src/app/core/services/gemini.service.ts`, `server/routes/ai.js`)
- [x] A6: Server test for the prompt append (or a manual curl if there's no harness for ai.js). Build and run specs. Update the session-state file. (`server/test/**`)

## Technical Considerations

Dependencies: MetadataRegistryService, KeyResolutionService (via ensureKeyForContext), AiProductModalComponent, GeminiService, ProductFormComponent (provides ProductAiFlowService).
New files: ai-draft-metadata.util.ts plus its spec.
Model changes: none.
Hebrew canonical values: yes. This plan exists to enforce the canonical resolution flow in .claude/rules/domain.md.
Gemini stays server-side only (server/routes/ai.js).

## Out of Scope

Cleaning stray values already stored on existing products (a separate data plan if Dandan wants it).
AI image input (next plan).

## Critical Questions

If the user cancels the translation modal for an AI value:
a) Drop that value from the product (default)
b) Abort the whole AI create

## Success Criteria

- [x] [auto] npx ng test --watch=false --include=src/app/pages/inventory/services/*.spec.ts --include=src/app/core/services/metadata-registry.service.spec.ts → 0 failures.
- [x] [auto] npm run build → exit 0.
- [x] [human] Inventory → AI create, e.g. "יוגורט עיזים 3%" → open the created product: its categories and allergens appear in Metadata → categories/allergens, with no new unexplained entries in the inventory filter panel.
- [x] [human] Edit a product → AI patch "add gluten allergen" → the form shows the registered allergen chip.
