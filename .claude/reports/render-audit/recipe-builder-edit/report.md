# Render Flow Audit — recipe-builder-edit

**Date:** 2026-04-24  
**Auditor:** Render Flow Auditor agent  
**User:** renderaudit20260424  
**Viewport:** 1366x768  
**Target:** https://foodvibe.onrender.com  
**Route:** /recipe-builder/:id (note: /recipe-builder/edit/:id returns NG04002)  
**Recipes tested:** רוטב לסלט איטריות (ID: 67DnG) for F2 probe; Audit Recipe 20260424 (ID: DD02L) for F1/F5/F6

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 1 |
| Major | 1 |
| Minor | 0 |
| API errors (4xx/5xx) | 0 |
| Console errors | 0 |
| Screenshots | 9 |

---

## Defects

### [critical] span.name-error-msg — F2: False-positive "name already taken" on edit of existing recipe

**Screenshot:** shots/03-f2-result.png  
**Selector:** `span.name-error-msg.ng-star-inserted`

**Description:** When an existing recipe is opened in the editor at `/recipe-builder/:id`, the sequence "focus name field → type char → delete char → blur" triggers the validator "שם מתכון זה כבר קיים" ("This recipe name already exists") even though the name was not changed. The validator checks the name against all recipes system-wide without excluding the current recipe's own name.

**Impact:** Save button (`button.c-btn-primary.main-submit-btn`) produces zero API calls when the error is active. Form submission is silently blocked. No API request, no error toast — only the inline validation message.

**Reproduction:**
1. Login as renderaudit20260424
2. Go to /recipe-book, click any recipe with a name that exists across multiple accounts (e.g. "רוטב לסלט איטריות", ID 67DnG)
3. Recipe opens at /recipe-builder/67DnG
4. Click the name field, type "x", press Backspace (restores original name), press Tab
5. RESULT: "שם מתכון זה כבר קיים" error appears, save makes 0 network requests

**Network log:** Validation is client-side — no API validator call. The cached name list includes the current recipe's own name as "taken".

**Scope note:** Does NOT trigger on freshly created own-user recipes (tested: DD02L "Audit Recipe 20260424" — clean). Affects recipes where the name appears globally across accounts.

---

### [major] Angular NG04002 — Route /recipe-builder/edit/:id does not exist

**Screenshot:** (console log only)  
**Description:** Route `/recipe-builder/edit/:id` (as documented in audit brief) throws `NG04002: 'recipe-builder/edit/UqU5Hp6v'` and silently redirects to `/`. The actual edit route is `/recipe-builder/:id`.

**Console excerpt:**
```
[error] error.unhandled: NG04002: 'recipe-builder/edit/UqU5Hp6v'
  at Jn.noMatchError (chunk-CKUQYEWI.js:1:67702)
```

**Impact:** Deep links, bookmarks, and external integrations using the `/edit/` route pattern silently fail. No 404 page shown — user lands at `/` with no feedback.

---

## Probe Results

### F1 — Persist round-trip: PASS
Recipe DD02L "Audit Recipe 20260424" created with 5 ingredients (מלח ים, מים, שמן רגיל/שמן טיגון, קמח אורז, סוכר חום). After save and re-navigation, all 5 present with correct quantities.
- POST /api/v1/data/RECIPE_LIST → 201 (create)
- PUT /api/v1/data/RECIPE_LIST/DD02L → 200 (update)
Evidence: shots/05-after-reload.png

### F2 — Update-without-change: FAIL (critical)
Trigger: open recipe 67DnG → click name → type x → Backspace → Tab.
Result: "שם מתכון זה כבר קיים" visible, save blocked (0 network requests).
Evidence: shots/03-f2-result.png

### F5 — API error capture: PASS
All save API calls returned 2xx. No 4xx/5xx observed.
- POST /api/v1/data/RECIPE_LIST → 201
- PUT /api/v1/data/RECIPE_LIST/DD02L → 200
- GET/PUT /api/v1/data/VERSION_HISTORY → 200/200

### F6 — Console error capture: PASS
No [error] console entries during the successful save flow. Info logs only:
- [info] crud.recipe.create: Recipe created {entityType: RECIPE_LIST, id: DD02L}
- [info] crud.recipe.update: Recipe updated {entityType: RECIPE_LIST, id: DD02L}

---

## Additional Observations

1. **Auth is token-in-memory only.** Hard page reload ($B goto) drops the Angular auth token. Only `fv_refresh` cookie persists. SPA navigation must be used to maintain session across the audit flow.

2. **Silent save-permission failure.** For recipes not owned by the current user, the Save button renders fully enabled but produces zero network calls silently. No error toast or permission message. User has no feedback that save is blocked.

3. **Quantity-required validation.** Adding an ingredient at qty 0 marks the row ng-invalid and blocks save. Correct behavior but no visible error message shown to user.

---

## Screenshots

| File | Description |
|------|-------------|
| shots/00-logged-in.png | Dashboard after login |
| shots/01-baseline.png | New recipe builder (Audit Recipe 20260424) |
| shots/02-pre-f2.png | Recipe 67DnG with F2 error visible |
| shots/03-f2-result.png | F2: duplicate name error under name field (definitive) |
| shots/03-f2-error-closeup.png | F2 error close-up |
| shots/04-before-save.png | Recipe with 5 ingredients before save |
| shots/04-after-save.png | Recipe book after save |
| shots/05-after-reload.png | F1: all 5 ingredients persisted after reload |
| shots/leave-dialog.png | Route guard unsaved-changes dialog |
