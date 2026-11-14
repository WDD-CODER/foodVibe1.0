# Plan 612 — The AI examples section on /platform explains itself, looks like the page, and scores how close the AI was

Status: draft
Depends-on: 600
Snapshot: 9d301459

## Problem Statement
Raised by the Human on 2026-11-14 while checking plan 600 (card ③, run-600, PR #580 not merged yet). This plan runs on `orch/run-600`, before #580 merges.

- **Unclear.** The new "דוגמאות AI למתכונים" section (`src/app/pages/platform-dashboard/components/platform-ai-shots/`) has no text saying what it is for, what "מועמדים" and "מאגר משותף" mean, or what the % is. The Human could not tell what it does.
- **Unstyled.** The remove button uses `c-btn-secondary`, a class that does not exist in `src/styles.scss`. The rows do not look like the section above them (`platform-logistics-items`, which uses `c-glass-card` rows).
- **Wrong score.** `keptRatio` (`server/services/ai-recipe-helpers.js:266`) counts only how many of the AI's ingredient names survived. The Human's AI draft came out as a 1000-gram preparation; they changed it to a dish of 10 portions and saved. The score still said 100%.

## Goals & Success Criteria
**Primary:** the platform admin understands the section at a glance, it looks like the rest of `/platform`, and the % shows how close the AI's draft was to what the cook saved.

- [auto] `server/test/ai-recipe-helpers.test.js`: `draftCloseness(ai, saved)` — identical drafts → 1; a preparation of 1000 gram changed to a dish of 10 portion, ingredients and amounts unchanged → 0.5; same type and yield, half the ingredient names kept with their amounts → 0.75; an amount changed by more than 10% on one of two kept ingredients → amounts part 0.5; an AI draft with no ingredients → names and amounts parts 0; result rounded to 2 decimals.
- [auto] `server/test/ai-shots-shared.test.js`: `GET /api/v1/admin/ai-shots` returns, for a shot stored with `aiDraft` and `draft`, `keptRatio` equal to `draftCloseness(aiDraft, draft)` even when the stored `keptRatio` is 1; a shot without `aiDraft` returns its stored value (or `null`).
- [auto] `server/test/ai-shots-saved.test.js`: a confirm with a changed `recipe_type` stores a `keptRatio` below 1.
- [auto] `src/app/pages/platform-dashboard/components/platform-ai-shots/platform-ai-shots.component.spec.ts`: the section renders the text `platform_ai_shots_desc`; each row shows "דיוק ה-AI: <n>%"; the remove button has class `c-btn-ghost`; no element has class `c-btn-secondary`.
- [auto] `pnpm run build`, `pnpm run test:ci`, `pnpm run test:server`, `pnpm run lint`, `pnpm --dir server run lint` pass.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] `e2e/ui/612-1.spec.ts`: as the platform admin (`signInQa`), on `/platform` the section "דוגמאות AI למתכונים" shows the text that starts "כאן מופיעות דוגמאות"; a seeded candidate (API setup: an opted-in business with one confirmed shot whose `recipe_type` changed) shows "דיוק ה-AI:" with a number below 100; cleanup in `finally`. Screenshot `screens/612-1.png`.
- [human] The section looks like the logistics section above it (cards, spacing, buttons) and reads clearly.

## Execution Mode
- Parallel: yes with plan 613 (no shared files).
- Concurrent plans: 613
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, public/assets/data/dictionary.json, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/services/ai-recipe-helpers.js
server/routes/ai.js
server/routes/admin.js
server/test/ai-recipe-helpers.test.js
server/test/ai-shots-shared.test.js
server/test/ai-shots-saved.test.js
src/app/pages/platform-dashboard/components/platform-ai-shots/**
docs/agent/standards-backend.md
e2e/ui/612-1.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — no change to who reads or writes shots; only the score and the screen change.
- INV-6: preserves — no Gemini call changes.
- INV-2: preserves — `server/services/ai-recipe-helpers.js` gains a pure function; no scoped query changes (shared shots still read by `MASTER_BUSINESS_ID`).

## Reuse Check
- `draftCloseness` — family: helpers — rung: 4 — why: replaces `keptRatio` beside it in `server/services/ai-recipe-helpers.js`; reuses `normIngredientName`.
- Section rows — family: engine-classes — rung: 1 — why: `c-glass-card` rows and `c-btn-primary` / `c-btn-ghost` buttons, as `platform-logistics-items` uses; no new `.c-*` class.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

Check by symbol on `orch/run-600`: `keptRatio`, `normIngredientName` in `ai-recipe-helpers.js`; `POST /shots/confirm` in `ai.js`; `GET /ai-shots` and `POST /ai-shots/:id/promote` in `admin.js`; `keptLabel` in `platform-ai-shots.component.ts`.

## User Stories
- As the platform admin, I want a short explanation and a clear accuracy number, so I can pick good examples for every kitchen's AI.

## Functional Requirements

### Must Have (P0)
- [ ] **Closeness score.** `server/services/ai-recipe-helpers.js`: `draftCloseness(aiDraft, savedDraft)` = the mean of four parts, each 0–1, rounded to 2 decimals:
  1. type — 1 when `recipe_type` is the same, else 0;
  2. yield — 1 when `yield_unit` is the same and the two `yield_amount` differ by at most 10% of the larger one, else 0;
  3. names — the share of the AI draft's ingredient names (`normIngredientName`) found in the saved draft (today's `keptRatio`);
  4. amounts — among the AI ingredients whose name was kept, the share whose saved `unit` is the same and whose `amount` differs by at most 10% of the larger one; 0 when none was kept.
  `keptRatio` is removed and its callers use `draftCloseness`; the export list changes with it.
- [ ] **Stored and shown.** `POST /shots/confirm` (`server/routes/ai.js`) stores `keptRatio: draftCloseness(stored, posted)` (the field name stays `keptRatio`). `GET /api/v1/admin/ai-shots` (`server/routes/admin.js`) returns `draftCloseness(doc.aiDraft, doc.draft)` when the document has both, else the stored number or `null`; promote copies that same value.
- [ ] **Explanation.** Under the title a paragraph `platform_ai_shots_desc`: "כאן מופיעות דוגמאות של מתכונים שנוצרו ב-AI ונשמרו בעסקים שהסכימו לשתף. «הוספה למאגר» מלמדת את ה-AI של כל העסקים מהדוגמה. «דיוק ה-AI» אומר כמה הטיוטה של ה-AI הייתה קרובה למה שנשמר בסוף." The two list headings get one short line each: `platform_ai_shots_shared_hint` "ה-AI של כל העסקים לומד מאלה" and `platform_ai_shots_candidates_hint` "מעסקים שהסכימו לשתף, עוד לא במאגר".
- [ ] **Accuracy label.** Each row shows `platform_ai_shots_accuracy` "דיוק ה-AI: {n}" with `{n}` = `formatPctInt(keptRatio * 100)`, or "—" when `null`.
- [ ] **Look.** Each row is an `article.c-glass-card`, laid out like `platform-logistics-items` rows: name and meta line on the start side, the button on the end side; the request text one line with an ellipsis. The remove button uses `c-btn-ghost`; promote keeps `c-btn-primary`. The section keeps `c-glass-panel`. The component SCSS uses logical properties and design tokens only.
- [ ] **Docs.** `docs/agent/standards-backend.md`: the `GEMINI_SHOTS` row says `keptRatio` is the closeness score (type, yield, names, amounts).

### Should Have (P1)
- none

### Nice to Have (P2)
- none

## UI/UX Notes
- `/platform` only. Same position on the page; text added, rows restyled.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Score how close the AI draft was to the saved recipe, not only the names kept — draftCloseness replaces keptRatio, tests — server/services/ai-recipe-helpers.js, server/test/ai-recipe-helpers.test.js
- [x] A2: Store and show the new score, also for examples saved before this fix — confirm, admin list and promote — server/routes/ai.js, server/routes/admin.js, server/test/ai-shots-shared.test.js, server/test/ai-shots-saved.test.js
- [x] A3: Explain the section and restyle its rows like the logistics section — text, accuracy label, c-glass-card rows, c-btn-ghost — src/app/pages/platform-dashboard/components/platform-ai-shots/**, public/assets/data/dictionary.json
- [x] A4: Write the screen check and update the docs — e2e/ui/612-1.spec.ts, docs/agent/standards-backend.md
- [ ] A5: Run the checks and hand over — build, test:ci, test:server, both lints, log-query, spec 612-1 against the slot app; then the [human] card

## Technical Considerations
- Dependencies: plan 600 (on `orch/run-600`, not on main yet). Run with `--run run-600` so the builder starts from that branch.
- New files needed: `e2e/ui/612-1.spec.ts`.
- Model changes: none (`keptRatio` keeps its name; its meaning widens).
- Backend / API: response shape unchanged; the number changes.
- Auth and validation: unchanged.
- Security surface: none.
- Data / migration: none — the admin list recomputes from `aiDraft` and `draft`.
- Cost: none.

## Backend Impact
- Collections affected: `GEMINI_SHOTS` (how `keptRatio` is computed).
- New collections: no
- Server changes needed: yes — helpers, `ai.js` confirm, `admin.js` list and promote.

## Out of Scope
- Using the score to rank examples in prompts.
- The opt-in card on `/metadata-manager` (passed card ①).

## Critical Questions
- none open. Score = mean of type, yield, names, amounts (Planner proposal, Human chose "plan fixes first" 2026-11-14).

## Execution Notes
- Planner draft 2026-11-14 from the Human's card ③ notes on run-600.
- Builder 2026-11-14 (resume after ask 612-1): cherry-picked 1dcaef01 and 6b4122be onto orch/run-600 as the Human answered (todo: only the plan 612 block added; plan 613 file kept as the run branch had it); run branch fast-forwarded to c2a3e1f5 and pushed.
- Decision: the P0 text says the amounts part is a share "among the AI ingredients whose name was kept", but the Done-when expects 0.75 for "half the names kept with their amounts", which only holds when the amounts part is a share of all AI ingredients. Followed the Done-when (amounts = AI ingredients kept with the same unit and an amount within 10%, over all AI ingredients). Reverse: divide `sameAmount.length` by `kept.length` in `draftCloseness` and change that test to 0.88.
- Rows stay `ul > li` with an `article.c-glass-card` inside, so e2e/ui/600-2.spec.ts (selects `li`) keeps working.
- pnpm run build -> 0; pnpm run lint -> 0 (warnings only); pnpm --dir server run lint -> 0; pnpm run test:ci -> 0 (2200 SUCCESS); pnpm run test:server -> 0 (109 files, 1385 tests).
- e2e/ui/612-1.spec.ts written, not run (no app or QA login in the worktree).
