# Plan 285 — AI Menu Phase 1

> Reconstructed on 2026-07-21 from `.claude/todo.md` / todo-archive history; original plan was never persisted (Plan 291 M7).

## Goal

Add AI-powered menu creation (from natural language text on the list page) and editing (natural language instruction on the menu page), following the established AiRecipeModal + GeminiService pattern.

## Atomic Sub-tasks

### Sub-brief 1.1 — Backend endpoints

- [x] `server/routes/ai.js` — add `MENU_GENERATE_SYSTEM_PROMPT`
- [x] `server/routes/ai.js` — add `validateMenuDraft()` helper
- [x] `server/routes/ai.js` — add `POST /generate-menu` endpoint
- [x] `server/routes/ai.js` — add `MENU_PATCH_SYSTEM_PROMPT`
- [x] `server/routes/ai.js` — add `POST /patch-menu` endpoint

### Sub-brief 1.2 — Client models, services, match utility

- [x] `src/app/core/models/ai-menu-draft.model.ts` — create
- [x] `src/app/core/utils/recipe-match.util.ts` — create
- [x] `src/app/core/services/gemini.service.ts` — add `generateMenu()` + `patchMenu()`
- [x] `src/app/pages/menu-intelligence/services/menu-ai-flow.service.ts` — create

### Sub-brief 1.3 — AI menu modal (shared UI)

- [x] `src/app/shared/ai-menu-modal/ai-menu-modal.service.ts` — create
- [x] `src/app/shared/ai-menu-modal/ai-menu-modal.component.ts` — create
- [x] `src/app/shared/ai-menu-modal/ai-menu-modal.component.html` — create
- [x] `src/app/shared/ai-menu-modal/ai-menu-modal.component.scss` — create
- [x] `src/app/appRoot/app.component.html` — add `<app-ai-menu-modal/>`
- [x] `src/app/appRoot/app.component.ts` — import `AiMenuModalComponent`
- [x] `public/assets/data/dictionary.json` — add 19 `ai_menu_*` keys

### Sub-brief 1.4 — Integration + entry points

- [x] `menu-intelligence.page.ts` — providers + inject + ngOnInit `init()`
- [x] `menu-intelligence.page.ts` — `openAiMenuModal()` + `buildAiMenuSnapshot_()`
- [x] `menu-intelligence.page.html` — add AI button
- [x] `menu-library-list.component.ts` + `.html` — `onCreateWithAi()` + button
- [x] `public/assets/data/dictionary.json` — add 4 integration keys
- [x] `ng build` — 0 errors

## Constraints

- Never store Gemini API key client-side
- `serving_type_` and other enum fields always English canonical keys
- Signals only, `inject()` only, no `any`
- `.c-*` engine classes in `styles.scss` only
