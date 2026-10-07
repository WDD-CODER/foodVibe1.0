# Session state — feat/night-1007-370-ai-recipe-portions (plan 370)

## Status
- A1–A3, A5 done. Rebased onto main 2026-10-08 (dictionary.json append conflict, kept both keys).
- `ng build` passes; server vitest 183 passed / 6 todo / 0 failed.
- A4: `server/scripts/ai-eval-recipes.js` written. Full run still pending.

## A4 live eval — partial result (2026-10-08)
The free-tier Gemini quota for `gemini-2.5-flash-lite` is **20 calls per day** (quotaId
`GenerateRequestsPerDayPerProjectPerModel-FreeTier`). A full 5 prompts × 5 runs needs 25+ calls,
so it has to be split across days: `node server/scripts/ai-eval-recipes.js --only=1,2,3`, then `--only=4,5`.

First run (before the quota ran out):

| Prompt | Passed | Result |
| --- | --- | --- |
| חביתה | 5/5 | PASS |
| חביתה ל-2 | 5/5 | PASS |
| חביתה מ-3 ביצים | — | 1 run failed on `steps<2`, rest hit the daily quota |
| שקשוקה ל-4 | — | not run (quota) |
| סלט ירקות קצוץ | — | not run (quota) |

## Open
- [ ] Complete the A4 eval across days and paste the full table here.
- [ ] [human] In-app check: "חביתה" → 1 portion, 2–3 eggs; "חביתה ל-2" → 2 portions, 4–6 eggs. Uses the same quota.
- Note (not in scope): the app's `DAILY_LIMIT = 1000` in `server/routes/ai.js` doesn't match the real free-tier 20/day.
- `ai:eval` npm script in `server/package.json` (P1) needs `approved: server/package.json`; out of scope.
