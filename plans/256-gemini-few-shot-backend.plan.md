# Plan 256 — Gemini Few-Shot Injection (Backend Migration)

**Source:** Dead-code audit investigation (2026-04-07) — `gemini-shots.util.ts`
**Branch:** `feat/gemini-few-shot-backend`
**Risk:** Low-medium — touches backend generate endpoints and frontend service only.

---

## Background

### What was built (Plan 235)

Plan 235 introduced a **few-shot learning system** for the AI recipe modal. The idea: every time the user approves an AI-generated recipe and opens it in the builder, the prompt + draft pair is saved to localStorage (max 3, stored under `FV_GEMINI_SHOTS`). On the *next* Gemini request, those prior examples are injected into the system prompt so Gemini can learn from previously approved outputs and produce better results over time.

In Plan 235, `gemini.service.ts` imported `getGeminiShots()` and built a Hebrew few-shot block:

```
קלט: "[your prompt]"
פלט: { ...the approved draft }
```

This was prepended to the Gemini system prompt on every `generateRecipe()` call.

### What broke it (commit 362ef18)

Commit `362ef18` ("route Gemini through backend") moved the entire Gemini API call from the frontend Angular service to the Express backend (`/api/v1/ai/generate` etc.) for security reasons (key off client). When the system prompt was moved to the server, the few-shot injection code was stripped from `gemini.service.ts` — but the storage side (`addGeminiShot`, `getGeminiShots`) was left in place.

### Current state

- `addGeminiShot` is called in `ai-recipe-modal.component.ts` (line 159) on every approved draft → data IS being collected
- `getGeminiShots()` is exported but never called anywhere — the read side is orphaned
- Every user is silently accumulating shot history that has no effect

---

## Goal

Restore few-shot injection by passing the stored shots from the frontend to the backend with each generate request, and injecting them server-side into the Gemini system prompt.

---

## Atomic Sub-tasks

- [ ] Task 1: Extend backend generate endpoints to accept optional `shots` array in request body
  - Files: `server/routes/ai.js` (or equivalent) — add `shots?` to request destructuring; pass to prompt builder
- [ ] Task 2: Build few-shot prompt block on the server using the shots array
  - Inject shots as Hebrew examples before the main system prompt (same format as Plan 235)
  - Guard: skip injection if shots array is empty or undefined
- [ ] Task 3: Update `GeminiService.generateRecipe()` to call `getGeminiShots()` and pass shots to backend
  - File: `src/app/core/services/gemini.service.ts`
  - Import `getGeminiShots` from `gemini-shots.util`; pass `shots: getGeminiShots().slice(0, 2)` in request body
- [ ] Task 4: Repeat for `generateFromImage()` and `generateFromUrl()` — all generate endpoints that build a recipe draft
  - `patchRecipe()` may not need shots (it operates on an existing draft, not generating from scratch — decide at execution time)
- [ ] Task 5: Verify `ng build` passes and test end-to-end in dev
  - Approve one AI recipe → check localStorage `FV_GEMINI_SHOTS` has entry → fire second request → confirm shots appear in server logs

---

## Files Involved

| File | Change |
|---|---|
| `server/routes/ai.js` (or equivalent) | Accept `shots[]` in body; inject into system prompt |
| `src/app/core/services/gemini.service.ts` | Import `getGeminiShots`; pass shots on all generate calls |
| `src/app/core/utils/gemini-shots.util.ts` | No change — already correct |
| `src/app/shared/ai-recipe-modal/ai-recipe-modal.component.ts` | No change — `addGeminiShot` already wired |

---

## Definition of Done

- `getGeminiShots()` is called in the frontend and shots are sent with generate requests
- Backend injects shots into Gemini system prompt when present
- `ng build` passes, no TypeScript errors
- Manual verification: second AI request produces output visibly influenced by prior approved draft style
