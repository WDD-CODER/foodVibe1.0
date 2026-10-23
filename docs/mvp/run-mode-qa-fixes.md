# MVP QA fixes run mode — plans 481–483 and 486–496

Dandan sent the full QA validation report on 2026-10-23 (`docs/mvp/qa-report-2026-10-22.md`) and asked for one
orchestrated run on a new branch: understand → plan → execute. Everything in `docs/mvp/run-mode-review-fixes.md`
and `docs/mvp/run-mode-review.md` applies, with these changes:

## Branches
- Integration branch: **`mvp-qa-fixes`**, cut from `origin/mvp-review-fixes` at `5c711358` (that branch already holds
  all of `main`: 0 commits behind). `main` itself has none of the MVP code, so it can't be the base. Base for every
  feature branch is **`origin/mvp-qa-fixes`**. Read every `origin/mvp-review-fixes` / `origin/mvp-review` in the
  older run-mode files as `origin/mvp-qa-fixes`.
- Never commit, push or merge to `main`, `mvp`, `mvp-review` or `mvp-review-fixes`. Each plan merges into
  `mvp-qa-fixes` as its own `--no-ff` merge (`Merge <branch> into mvp-qa-fixes (plan N)`).
- Plan numbers 486–496 are reserved via remote branch `reserve/496-mvp-qa-fixes` (next main plan = 497).

## Report items → plans
| Report item | Checks | Plan |
| --- | --- | --- |
| 1 Smart import jump | 2 | 478 (merged) |
| 2 Allergen chip text · 3 Stage pills | 4, 6 | 479 (merged) |
| 4 Category carousel | 8 | 480 (merged) |
| Deleted ingredient row | 10 | 481 (built on `origin/feat/481-deleted-ingredient-row`, not merged) |
| 6 Desktop number inputs + coefficients | 11 | 482 (planned, not built) |
| 7 Calendar button rollback | 13 | 483 (planned, not built) |
| 10 Delete business — type the name | 14 | 486 |
| 8 Pricing bar | 92–95 | 487 |
| 9 Event closing dialog | 97, 100, 101 | 488 |
| 11 Import delete row · 12 Import page on phones | 35, 37 | 489 |
| 13 AI ingredient paste matching | 43 | 490 |
| 14 Recipe station selector on phones | 45 | 491 |
| 15 Deleted staff frees the username | 50/118 | 492 |
| 17 Close the event straight from the stage bar | 60 | 493 |
| 16 Page background · 18 Notes bottom padding | —, 65 | 494 |
| 19 Coefficient back to default clears «שונה ידנית» | 66 | 495 |
| 20 One empty dish row per category | — | 496 |

## Passed checks
The report's PASSED list is frozen behaviour: a plan never changes it unless its own item requires it. One planned
exception: item 17 replaces passed check 60 («הסתיים» cannot be picked) by a confirmation popup.

## Slots, evidence, accounts
Same as `run-mode-review-fixes.md`: slots **wt-1** and **wt-2** only; never touch wt-3 / 4203 / 3003. Screenshots
go to `C:\coding projects\Cursor\mvp-review-evidence\qa\<NNN>\`; accounts in
`C:\coding projects\Cursor\mvp-review-evidence\accounts.json`.
