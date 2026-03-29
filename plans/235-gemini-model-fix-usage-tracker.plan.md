---
name: 235-gemini-model-fix-usage-tracker
overview: Fix Gemini 400 error (wrong model name) and add a localStorage-based daily request usage tracker in the AI recipe modal.
todos: []
isProject: false
---

# Goal

Fix the Gemini AI recipe feature (400 error — wrong model name) and add a lightweight request-usage tracker inside the modal so the user can monitor free-tier consumption without hitting limits unexpectedly.

# Atomic Sub-tasks

- [ ] `gemini.service.ts` — change model URL from `gemini-2.0-flash` to `gemini-2.5-flash-lite`
- [ ] `gemini.service.ts` — replace two-pass fence regex with single non-anchored `` /```json|```/g ``
- [ ] Create `src/app/core/utils/gemini-usage.util.ts` — localStorage usage tracker with limit guard
- [ ] `gemini.service.ts` — import util, add limit guard before fetch, call increment after success
- [ ] `ai-recipe-modal.component.ts` — add `computed` + `OnInit` to imports; implement OnInit; add geminiUsage_ signal, usageColor_ computed, refreshUsage() method; call in ngOnInit + onGenerate finally
- [ ] `ai-recipe-modal.component.html` — insert `.ai-usage-bar` block above generate button footer
- [ ] `ai-recipe-modal.component.scss` — append `.ai-usage-bar` and related styles

# Constraints

- Do not change the `FV_GEMINI_API_KEY` localStorage key name
- Keep raw `fetch` — do not switch to `HttpClient`
- Do not touch modal HTML structure outside of inserting the `.ai-usage-bar` block
- `.ai-usage-bar` SCSS in component SCSS only — not in `styles.scss`
- Signals only — no BehaviorSubject, no Observable for usage state
- No `any` casts, single quotes in TS, double quotes in HTML, no semicolons

# Done When

- Typing a recipe description and clicking generate returns a valid recipe preview with no 400 error
- Browser console shows 200 from `generativelanguage.googleapis.com`
- Usage bar appears in the modal showing `1 / 1,000` after the first successful call
- Bar turns amber at 700+, red at 900+
- Refreshing the page resets count only if the date has changed (next day)
- `ng build` completes with zero errors
