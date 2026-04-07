---
name: DB-Backed Shared Few-Shot Pool with Quality Feedback
overview: Replace localStorage few-shot store with a shared MongoDB collection so every approved AI recipe trains all future Gemini calls, with inline quality warnings before the user commits an example.
todos: []
isProject: false
---

# Plan 259 — DB-Backed Shared Few-Shot Pool with Quality Feedback

**Branch:** `feat/gemini-shots-db`
**Risk:** Medium — new MongoDB collection, new API endpoints, modal UI change, removes localStorage dependency

## Goal

Replace the localStorage few-shot store with a shared MongoDB collection. Every approved AI recipe enriches the pool for all future users. Rejected recipes are also recorded (status: 'rejected') for analytics. Before the user approves a draft, show soft validation warnings inline so they can spot AI mistakes and decide whether to commit the example.

## Architecture

**New collection: `GEMINI_SHOTS`**
```
{
  _id: ObjectId,
  prompt: string,
  draft: object,
  status: 'approved' | 'rejected',
  source: 'text' | 'image' | 'url',
  warnings: string[],
  createdAt: Date
}
```

**Soft validation warnings (server-side at save):**
- < 3 ingredients → "מתכון עם מעט מרכיבים — ייתכן שהבינה הצליחה לחלץ חלקית בלבד"
- > 20 portions → "כמות מנות גבוהה במיוחד — בדוק שהתפוקה הגיונית"
- < 2 steps → "מספר שלבים נמוך — ייתכן שחסרות הוראות"
- yield_unit = 'unit' on a dish → "יחידת תפוקה לא סבירה למנה"

## Atomic Sub-tasks

- [ ] Task 1: Add `GEMINI_SHOTS` collection helpers to `server/routes/ai.js` — `saveShot()`, `getApprovedShots(limit)`, `computeSoftWarnings()` — and remove `buildFewShotBlock` from request body path
- [ ] Task 2: Add `POST /api/v1/ai/shots` endpoint — accepts `{ prompt, draft, status, source }`, runs hard + soft validation, saves to DB, returns `{ saved: true, warnings: [] }` or `{ saved: false, errors: [] }`
- [ ] Task 3: Update `/generate`, `/generate-from-image`, `/generate-from-url` — remove `shots` from request body destructuring; call `getApprovedShots(2)` server-side instead
- [ ] Task 4: Create `src/app/core/services/gemini-shots.service.ts` — `saveShot(prompt, draft, status, source)` calling `POST /api/v1/ai/shots`, returns `warnings[]`
- [ ] Task 5: Update `ai-recipe-modal.component.ts` — on approval: call `saveShot(..., 'approved')`; on rejection/dismiss: call `saveShot(..., 'rejected')`; surface returned `warnings[]` as inline notice before builder opens
- [ ] Task 6: Update `gemini.service.ts` — remove `getGeminiShots` import and `shots` from all request bodies
- [ ] Task 7: Deprecate `gemini-shots.util.ts` — remove `addGeminiShot` call from modal, keep file as no-op stub for one release
- [ ] Task 8: `ng build` + smoke test

## Backend Impact
- Collections affected: `GEMINI_SHOTS` (new)
- New collections: yes — self-populating, no migration needed
- Server changes needed: yes — new endpoint + helpers in `ai.js`
