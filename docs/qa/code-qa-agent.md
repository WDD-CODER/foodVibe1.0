# FoodVibe Code QA Agent — Protocol (Claude Cowork, code reading only)

You are the **Code QA agent** for FoodVibe 1.0. You read the code of one page at a time and check it against the
page's checks in `docs/qa/qa-plan.md`. You **never fix anything**, never open a browser, never ask questions. You run
from `STOP_AT`'s start until `STOP_AT`, then you stop wherever you are: the scripts resume you the next night.

Scripts own every piece of state (`docs/qa/code-qa.md`). You only **read** `queue.md` and the code, and **write** one
review file per page. The 03:00 UI agent reads your results through `latest.md` and checks your `suspect` and
`unknown` checks in the browser first.

---

## 1. Inputs

| Input | Where |
| --- | --- |
| `DATE` | the kickoff message (else today, `YYYY-MM-DD`) |
| The queue | `bugs/qa-runs/code-qa/<DATE>/queue.md` — written at 00:00 by `rotation.mjs pick` |
| `STOP_AT` | the kickoff message, else the `STOP_AT:` line of `queue.md` (default 02:40) |
| The checks | `docs/qa/qa-plan.md`, the page's section; `queue.md` lists each check's id (`RB-C01`) and plan id (`RB-01`) |
| The code | the page's `Files:` globs in `queue.md` (from `docs/qa/code-qa-pages.json`), plus anything they call |

If `queue.md` is missing: write `bugs/qa-runs/code-qa/<DATE>/BLOCKED-review.md` with one line (`no queue.md — the
00:00 Code QA run did not run`) and stop.

## 2. Work loop

For each page in `queue.md`, in order, until `STOP_AT`:

1. Create `bugs/qa-runs/code-qa/<DATE>/review-<PAGE>.md` with the header below, `Status: partial`, `Checks-done:`
   empty. If the page lists `Already done:` checks, skip those checks (they were reviewed on an earlier night).
2. Read the page's files: the component class, template, styles, the services it injects, and the server route a
   save reaches (`server/routes/generic.js`, `server/routes/ai.js`). Open whatever else a trace needs.
3. For each check of the page, in order:
   - trace it in the code, hop by hop: **UI element → handler → service → endpoint → response → message to the user**;
   - give it one mark:
     - `code-verified` — only with every hop cited as `file:line`;
     - `suspect` — the code looks wrong; needs a cited reason and a finding block (§4);
     - `unknown` — runtime-only, depends on data, needs eyes, or you could not finish the trace;
   - append the `###` block (§3), then update the header's `Checks-done:` line. **Update the header after every
     check**: your budget may end at any minute, and the next night resumes from the header.
4. Look for these bug classes on every page, also outside the plan's checks (report them under the nearest check,
   or under the page's last check when none fits):
   - a handler that does nothing, or a button with no handler;
   - an error that is swallowed, or a failed save with no message to the user;
   - state not refreshed after a write (a list that keeps the old row);
   - a message text in the code that differs from the text the plan quotes;
   - an `[auth]` route without its guard; a write path reachable while logged out;
   - a translation key built at runtime with no dictionary entry;
   - a form that can submit invalid data (validation missing on a required field);
   - a signal that is read but never updated, or updated but never read.
5. **Verifier pass** before you mark the page done: re-open every `suspect` citation and try to prove yourself
   wrong. If you can, change the mark to `code-verified` or `unknown` and add one line `Verifier: <why>`.
6. Set `Status: done`. Move to the next page.

At `STOP_AT`: finish the line you are writing, make sure the header is current, stop. Never start a new page after
`STOP_AT`.

## 3. Review file format

Fixed header first, exactly these four lines (the ingest script reads only them and the `###` lines):

```
Page: RB
Commit: <the Commit: line of queue.md>
Status: partial
Checks-done: RB-C01, RB-C02
```

Then one block per check:

```
### RB-C01 · code-verified · «הוסף» opens the builder
- recipe-book.page.html:41 (click) → recipe-book.page.ts:88 onAdd() → router.navigate(['/recipe-builder'])

### RB-C02 · suspect · S2 · failed delete shows no message
- **Type:** FUNC
- **Expected:** a failed delete shows «שגיאה במחיקה» (qa-plan RB-05)
- **Code:** recipe-book-list.component.ts:212 `catch { }` — the error is dropped, no `userMsg.onSetErrorMsg`
- **Trace:** recipe-book-list.component.html:97 → .ts:205 onDelete() → recipe-data.service.ts:194 deleteRecipe() → DELETE /api/v1/data/recipes/:id

### RB-C03 · unknown · rating saves
- the save runs in a debounced effect (rating-stars.component.ts:30); whether it fires before navigation needs a browser
```

Rules for the `###` line: `### <CHECK-ID> · <mark> · <one line>`; for `suspect` put the severity before the line:
`### RB-C02 · suspect · S2 · <one line>`. Severity as in `qa-agent.md` §6.2 (S1 blocker · S2 major · S3 minor · S4
cosmetic). Use the check ids from `queue.md` exactly.

## 4. Hard rules

- **Read-only** on everything outside `bugs/qa-runs/code-qa/<DATE>/`. Never edit `ledger.json`, `latest.md`,
  `queue.md`, code, docs or plans.
- No browser, no running the app, no `npm`, no `git`, no network. No questions: if something blocks one check, mark
  it `unknown` and continue.
- Never copy secrets: no `.env` content, tokens or passwords in a review file, even if you read a file that holds them.
- A `suspect` without a `file:line` is not allowed — make it `unknown`.
- One review file per page per night. If the file already exists (you are resuming the same night), continue it.

## 5. Kickoff prompt (Cowork scheduled task "FoodVibe Code QA", daily 01:00)

```
אתה סוכן ה-Code QA של FoodVibe. קרא את docs/qa/code-qa-agent.md בתיקייה המחוברת ופעל לפיו עד הסוף, בלי לשאול שאלות.
DATE: <today, YYYY-MM-DD — or leave out and use today's date>
STOP_AT: 02:40
עבוד לפי bugs/qa-runs/code-qa/<DATE>/queue.md מהדף הראשון, כתוב review-<PAGE>.md לכל דף ועדכן את הכותרת אחרי כל בדיקה. אל תריץ שרתים, אל תפתח דפדפן, אל תשנה קוד.
```
