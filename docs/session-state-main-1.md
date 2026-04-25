# Session State — 2026-04-25 AI-Everywhere Menus

## Branch
`feat/session-20260425`

## Session
`.claude/sessions/2026-04-25-ai-everywhere-menus/`

## What shipped this session

### Bug fixes
- **502 on /generate-menu + /patch-menu** — both hardcoded `gemini-2.0-flash` (deprecated). Fixed to use `GEMINI_URL` constant (`gemini-2.5-flash-lite`). `server/routes/ai.js` lines 655, 770.
- **Icon errors** — `CheckCircle` + `HelpCircle` missing from `LucideAngularModule.pick()`. Added to `src/app/app.config.ts`.
- **AI over-generation** — prompt said "complete structured menu draft" → Gemini invented dishes. Prompt now says "only include dishes the user explicitly named, never add or invent".
- **Match display** — matched dishes showed AI input name. Now shows `dish.candidates[0].name` (the actual DB recipe name).

### Features implemented (Phase 1 menu AI)
- **Shots loop** (`GEMINI_MENU_SHOTS` collection):
  - Backend: `getApprovedMenuShots()`, `buildMenuFewShotBlock()`, injection into `/generate-menu`, `/save-menu-shot` POST endpoint (auto-prune to 50). `server/routes/ai.js`.
  - Frontend: `GeminiService.saveMenuShot()`, auto-fired on Apply in `ai-menu-modal.component.ts`. `draft_` signal added to store raw AI output for the shot.
- **In-paper AI button**: removed toolbar pill, added `.paper-ai-btn` inside the paper between meta line and ornamental divider. `menu-intelligence.page.html` + `_paper-ui.scss`.
- **Edit mode entry point fix**: removed confirm dialog gate for edit mode. If form has content → directly opens edit mode (patch). If empty → create mode. `menu-intelligence.page.ts:openAiMenuModal()`.
- **Edit mode diff preview**: replaced key-name list with before→after diff (`diffEntries_()` computed). Shows label, from (strikethrough), arrow, to (green). Handles name_, event_type_, guest_count_, serving_type_, event_date_, sections_. `ai-menu-modal.component.ts + .html + .scss`.

## What's NOT done yet (Sub-brief 1.4 remnants)
- Menu list page ("add with AI" button on library/list page) — not yet wired
- `ng build` passes cleanly (one NG8107 warning fixed)

## Sub-briefs status
| Sub-brief | Status |
|-----------|--------|
| 1.1 Backend endpoints | ✅ Done (was already done, fixed 502 model bug) |
| 1.2 Client models + services + match util | ✅ Done (was already done) |
| 1.3 AI menu modal | ✅ Done (was already done, enhanced this session) |
| 1.4 Integration + entry points | 🟡 Partial — menu-intelligence page done, menu LIST page entry point pending |

## Next session priorities
1. Add "create with AI" button to menu list/library page (Sub-brief 1.4 completion)
2. Run full QA pass on the menu AI flow end-to-end
3. Begin Phase 2 (Products) planning

## Ship Status (in progress — context limit hit)
- Build gate: PASSED (ng build clean)
- Base merge: up to date
- All files staged and ready to commit
- Next: commit → push → create PR

### Files to commit
- server/routes/ai.js
- src/app/app.config.ts
- src/app/core/services/gemini.service.ts
- src/app/pages/menu-intelligence/menu-intelligence.page.html
- src/app/pages/menu-intelligence/menu-intelligence.page.ts
- src/app/shared/ai-menu-modal/ai-menu-modal.component.html
- src/app/shared/ai-menu-modal/ai-menu-modal.component.scss
- src/app/shared/ai-menu-modal/ai-menu-modal.component.ts
- .claude/sessions/2026-04-25-ai-everywhere-menus/ (new)
- docs/session-state-main-1.md (new)

### Suggested commit message
feat(ai-menu): Phase 1 — AI-powered menu creation and editing

- Fix 502: menu endpoints used deprecated gemini-2.0-flash, now use GEMINI_URL (gemini-2.5-flash-lite)
- Fix icons: CheckCircle + HelpCircle added to app.config.ts LucideAngularModule.pick()
- Fix over-generation: prompt now forbids inventing dishes not mentioned by user
- Fix match display: show DB recipe name (candidates[0].name) not AI input name
- Add shots loop: GEMINI_MENU_SHOTS collection, auto-save on Apply, inject into generate-menu
- Add edit mode: AI button in hero FAB (sparkles icon, matches recipe-builder pattern)
- Add diff preview: before→after field diff in edit mode (name, guests, serving type, date, sections)
- Remove confirm gate: edit mode opens directly without confirm dialog
