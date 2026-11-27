# Plan 757 — Remove the old bottom-sheet popup rules and turn on the two popup defaults

Status: draft
Depends-on: none
Track: code
Snapshot: 103352f316e125c9c4b0e0c8806cd66278a42594

## Problem Statement
Base branch: `chore/restaurant-staging` (plans 720, 721 and 711 are built there and not on `main`; the Snapshot is that branch's head).

Plans 720 and 721 made every popup centred and scrolling and stopped every template from using the bottom-sheet
helpers; both are already on the base branch, which is why this plan depends on no open plan. Plan 720 left the dead
rules in `src/styles.scss` on purpose, because that file is an append-only hotspot (its Out of Scope: "Removing the
dead `.m-sheet`, `.m-sheet-card` and `.inline-edit-panel.as-modal` rules … needs a hotspot cleanup the Human
approves"). Two decisions of the Human on 2026-11-26 close that:

1. **"Old popup rules: remove!"** — the Human approved this removal in chat on 2026-11-26, which is the escalation the
   hotspot rule asks for. This plan deletes the dead rules, makes the guard forbid them, and lets the two append-only
   checks accept this one approved removal.
2. **`default yes modal-centered` and `default yes modal-scrollable`** — the Human turned both product defaults on in
   chat on 2026-11-26. Their two remarks of 2026-11-24, in the Human's words: "don't use modals from the bottom, a
   modal is always centred on the screen" (tag `modal-centered`) and "all modals must scroll; the tablet modal is too
   large and the user can't see the content" (tag `modal-scrollable`). The Planner may not write the contract, so this
   plan carries the turn-on. Plan 720's Execution Notes proposed one combined default, `centred-scrolling-popup`; the
   Human chose the two separate ids instead, so the combined one is **not** added.

Verified on `chore/restaurant-staging` (`103352f3`, 2026-11-26):
- The dead rules, `src/styles.scss` (3243 lines):
  - `:1406-1447` — inside `.inline-edit-panel` (`:1384`): an empty line (`:1406`), the comment "Tablet + mobile: the
    same panel, same form, rendered as a modal …" (`:1407-1415`) and the block `&.as-modal { … }` (`:1416-1447`),
    whose phone `@media` (`:1429-1446`) is the bottom sheet and holds the two plan 347 keyboard lines (`:1432`
    `inset-block: auto var(--kb-inset, 0px)`, `:1436` `max-height: calc(86dvh - var(--kb-inset, 0px))`). The rule
    closes at `:1448`; `.inline-edit-title` starts at `:1450`.
  - `:1854-1870` — inside the phone `@media` that starts at `:1798`: the comment "Centred dialogs become bottom
    sheets." (`:1854`), `.m-sheet { align-items: flex-end !important }` (`:1855-1857`), `.m-sheet-card { … }`
    (`:1859-1869`) and the empty line after it (`:1870`); before them `.m-fab-lift` (`:1849`), after them the "Toasts
    clear the tab bar …" comment (`:1871`).
  - `:2654-2655` — a comment sentence in the plan 459 block: "The tablet/phone modal variant
    (.inline-edit-panel.as-modal, position: fixed, z-index 1001) is excluded: it already sits above its backdrop and
    must stay fixed."; `:2659` the selector `.inline-edit-panel:not(.as-modal):has(.c-dropdown)`.
- Nothing uses them: `git grep -nE "m-sheet|as-modal|\[sheet\]" -- src e2e server public scripts` matches only
  `src/styles.scss` (5 lines: `:1416`, `:1855`, `:1859`, `:2654`, `:2659`),
  `src/app/shared/modal-shell/modal-shell.component.spec.ts:128-129` (the case "is never a bottom sheet (plan 720)",
  `:127`, which checks the classes are absent) and the guard's own three files (`scripts/lib/modal-guard.mjs`,
  `scripts/test/modal-guard.test.mjs`, `scripts/test/style-720.test.mjs`). The equipment edit panel, the last user of
  `as-modal`, is an `app-modal-shell` popup since plan 711
  (`src/app/pages/equipment/components/equipment-list/equipment-list.component.html:181`).
- Keyboard rules (plan 347): only the two lines inside the `&.as-modal` phone block serve `.as-modal`; they go with
  it. The `body.kb-open` block (`src/styles.scss:2062-2078`: hides `.bottom-nav`, `.hero-fab-container`,
  `.approve-stamp`, `.user-msg`; resets `.app-content`; limits `.c-modal-card`) serves the whole app and stays.
  `--kb-inset` is written by `src/app/core/services/keyboard-inset.service.ts:7` and read by plan 720's
  `--modal-max-block` (`src/styles.scss:3205` block): it stays.
- The guard: `scripts/test/style-720.test.mjs:20-26` — `const ALLOW` with five entries; three are for
  `src/styles.scss`, rule `bottom-sheet`, selectors `'.m-sheet'`, `'.m-sheet-card'` and `'&.as-modal'` (their `why`
  ends "the hotspot is append-only"); two are `modal-no-scroll` entries (`:host ::ng-deep .closing-card`,
  `:host ::ng-deep .quick-edit-product-modal`). The first test (`:32`) fails when an allow entry no longer matches a
  finding. `:71` — the test "no file under src/app mentions m-sheet or as-modal, and the shell has no sheet input" (it
  skips `.spec.ts` files and does not read `src/styles.scss`).
- The append-only checks: `scripts/test/style-720.test.mjs:80` ("src/styles.scss above the plan 720 marker is the
  base file (append-only)") and `scripts/test/style-703.test.mjs:29` ("src/styles.scss above the marker is the base
  file (append-only)"). Both read the base file with `git show <merge-base>:src/styles.scss`, where the merge-base is
  `git merge-base HEAD <ref>` for the first of `origin/orch/rs-modals`, `origin/orch/rs-style`, `origin/main` that
  exists, cut both texts at their marker (`head(s)`) and `assert.equal(head(now), head(base))`. Every removal in this
  plan is above both markers (`/* ==== Plan 703 … */` at `:2949`, `/* ==== Plan 720 … */` at `:3205`), so on this
  plan's branch both tests fail until they are taught the approved removal. No other test compares `src/styles.scss`
  with a base (`git grep -n "merge-base" -- scripts/test`).
- Docs: `docs/brain/component-families.md:90` — plan 720 already replaced the "Phone bottom sheet" bullet of
  `### modal-shell` (`:80`) with "Always centred (plan 720) …"; `:100` the family `### modal-guard — the popup rules
  checked by a script`, its Use line at `:103`. `docs/brain/gotchas/angular.md:255` still names
  `.inline-edit-panel.as-modal` (the plan 362 story); neither 720 nor 721 touched it.
- Product defaults: `_shared/product-defaults.md` has 11 entries, 10 `on`, the last one `anchored-popup` (`:138`);
  none is about popups. `_shared/debt-baseline.json:4,8` holds two `default.*` kinds (`default.one-breakpoint-set`,
  `default.unsaved-changes-on-leave`). `scripts/product-defaults.mjs:36` — `add` takes `--id`, `--rule`, `--trigger`,
  `--words`, `--how`, `--check`, `--card`, `--exceptions`, `--status`, `--date`; `:101` writes the entry through
  `addEntry` (`scripts/lib/product-defaults.mjs:181`); `:103` with `:63-65` runs
  `debt-baseline.mjs --add-kind default.<id>` for an `on` entry with rule data, which writes
  `_shared/debt-baseline.json` (`kit.config.json:113`). A `check` that starts with `files:` is rule data (`ruleData`,
  `scripts/lib/product-defaults.mjs:49`); the diff check `scripts/lib/checks/product-defaults.mjs` then reports every
  changed file that matches `files` and `trigger` and shows no `evidence` — a finding fails `kit-checks` whether or not
  the file is in the baseline (`scripts/kit-checks.mjs:140`). `docs/brain/inventory.md:138-148` lists the `on`
  defaults (`scripts/inventory.mjs:103-107`), so it changes when a default is turned on.
- The two check lines of A4 were run against this tree with the three removals applied: `modal-centered` → 0 files,
  `modal-scrollable` → 0 files (before the removal `modal-centered` hits `src/styles.scss`).
- The equipment page: `src/app/app.routes.ts:69` (`path: 'inventory'`) with the child `:103` (`path: 'equipment'`),
  so the URL is `/inventory/equipment`; the popup title is `{{ 'edit' | translatePipe }}: {{ item.nameHebrew }}`
  (`equipment-list.component.html:194`; `edit` = "עריכה").

## Goals & Success Criteria
**Primary:** `src/styles.scss` holds no bottom-sheet rule any more, the guard fails if one comes back, and the two
popup rules the Human asked for are `on` product defaults that a script checks on every later change.

- [auto] `node --test scripts/test/modal-guard.test.mjs scripts/test/style-720.test.mjs scripts/test/style-703.test.mjs` passes, including: `withoutRetiredSheetRules` fixtures (removes the three pieces, returns a text without them unchanged, is the same after a second call); the allow list of `scripts/test/style-720.test.mjs` has exactly two entries, both `modal-no-scroll`, and `modalFindings` over `src/` returns only those; `src/styles.scss` contains neither `m-sheet` nor `as-modal`; both append-only tests pass against the base file with the retired rules taken out; the contract test (both defaults `on`, with rule data, triggers proven on fixtures, no `centred-scrolling-popup` entry).
- [auto] `pnpm run test:scripts` passes.
- [auto] `node scripts/product-defaults.mjs list` → has the lines `DEFAULTS: on       modal-centered — Every popup opens in the middle of the screen at every screen size; no popup slides up from the bottom or drops from the top.` and `DEFAULTS: on       modal-scrollable — Every popup is never taller than the screen and its content scrolls inside it, so the title and the buttons can always be reached on a phone, a tablet and a desktop.`, and no `bad contract` line.
- [auto] `node scripts/debt-baseline.mjs --show` → has the lines `DEBT: default.modal-centered 0 → 0` and `DEBT: default.modal-scrollable 0 → 0`.
- [auto] `node scripts/inventory.mjs --check` exits 0.
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:reuse` exits 0; `node scripts/reuse-lint.mjs --check-registry` exits 0; `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `pnpm run test:ci` passes (no spec is changed; `src/app/shared/modal-shell/modal-shell.component.spec.ts` "is never a bottom sheet (plan 720)" still passes).
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] the equipment edit popup on a phone · window 390×844, `http://localhost:4202/inventory/equipment` → tap a row to edit it · the popup "עריכה: <the item's name>" opens in the middle of the screen with all four corners rounded, not stuck to the bottom
- [human] the equipment edit panel on a desktop · window 1280×800, `http://localhost:4202/inventory/equipment` → click a row, then open the dropdown inside the edit panel that opens under the row · the whole list of the dropdown shows in front of the rows below it, nothing is cut off

## Execution Mode
- Base branch: chore/restaurant-staging
- Parallel: no — it edits `scripts/test/style-720.test.mjs` and `scripts/test/style-703.test.mjs` and removes lines from the hotspot `src/styles.scss`.
- Concurrent plans: any plan that only appends to `src/styles.scss` and writes none of this plan's scope files.
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/styles.scss
scripts/lib/modal-guard.mjs
scripts/test/modal-guard.test.mjs
scripts/test/style-720.test.mjs
scripts/test/style-703.test.mjs
_shared/product-defaults.md
_shared/debt-baseline.json
docs/brain/component-families.md
docs/brain/gotchas/angular.md
docs/brain/inventory.md
src/app/shared/modal-shell/modal-shell.component.spec.ts
docs/workflow-kit/manifest.json
```

`src/styles.scss`: this plan removes lines from the hotspot. The Human approved exactly this removal in chat on
2026-11-26 ("Old popup rules: remove!"); it covers the three pieces named in A2 and nothing else in the file.

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — dead CSS is removed from the shared stylesheet, a Node test helper gets one function, two tests and three docs change, and two entries are added to the product-defaults contract; no data, route, server, permission, schema, AI call or table-engine path is touched.

## Reuse Check

- `withoutRetiredSheetRules` (a new export of `scripts/lib/modal-guard.mjs`) — family: modal-guard — rung: 3 — why: the two append-only tests need the same "base file minus the approved removal" text; it lives in the guard's existing file, next to the rules that forbid the same selectors, so no new file or family is added.

## Adopt Check
- none — why: no rung-4 piece and no `package.json` change; one small function is added to an existing test helper

## Defaults

- one-breakpoint-set — applies — how: the plan only removes rules; it adds no `@media` and no width
- anchored-popup — exception — why: this plan removes dead rules of the centred popup frame and touches no small box beside a control
- unsaved-changes-on-leave — exception — why: no form is added or changed
- confirm-destructive-action — exception — why: no action is added or changed; the "remove" in this plan is the removal of dead CSS
- empty-state-on-list — exception — why: no list is added or changed
- loading-and-error-states — exception — why: no data request is added or changed
- app-list-container — exception — why: no list is added or changed
- hints-in-tooltips — exception — why: no control or explanation text is added
- unit-dropdown-add — exception — why: no unit dropdown is added or changed
- leave-and-return — exception — why: no page sends the user to another page

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want every popup to open in the middle of the screen and to scroll, on every later change to the app too, so that I never again meet a popup I cannot read or close.
- As the owner of the product, I want the rules I said twice to be checked by a script, so that I do not have to say them a third time.

## Functional Requirements

### Must Have (P0)

**A1 — proof that the rules are dead (nothing is written in this step)**
- [ ] Safety check: `scripts/lib/modal-guard.mjs`, `scripts/test/style-720.test.mjs` and
  `scripts/test/style-703.test.mjs` exist and `src/styles.scss` contains the line
  `/* ==== Plan 720 — centred popups that scroll ==== */`. If not: STOP with
  `STOP 757: plan 720 is not on this branch (<what is missing>) — nothing was changed`.
- [ ] Run these four searches (Grep tool or `git grep`) and compare with the expected result:
  1. `git grep -nE "m-sheet|as-modal" -- src` → matches only in `src/styles.scss` (the `&.as-modal {` line, the
     `.m-sheet {` line, the `.m-sheet-card {` line, the plan 459 comment line and the `:not(.as-modal)` selector line)
     and in `src/app/shared/modal-shell/modal-shell.component.spec.ts` (the two `classList.contains(...)).toBeFalse()`
     lines of the "is never a bottom sheet" case).
  2. `git grep -nF "[sheet]" -- src` → no match.
  3. `git grep -nE "\bsheet\s*=\s*input\b" -- src/app/shared/modal-shell` → no match.
  4. `git grep -nE "m-sheet|as-modal|\[sheet\]" -- e2e server public scripts` → matches only in
     `scripts/lib/modal-guard.mjs`, `scripts/test/modal-guard.test.mjs` and `scripts/test/style-720.test.mjs`.
- [ ] Any other match: STOP with `STOP 757: <file>:<line> still uses <m-sheet | m-sheet-card | as-modal | [sheet]> —
  the old popup rules are not dead; nothing was changed`, one line per match. Do not remove the user; that is a
  question for the Human.
- [ ] Write the four results (the matching lines, or "no match") into Execution Notes.

**A2 — remove the three pieces from `src/styles.scss`** (find them by selector; the line numbers above are the
Snapshot's)
- [ ] Inside `.inline-edit-panel`: delete the comment that starts `/* Tablet + mobile: the same panel, same form,
  rendered as a modal` and the whole block `&.as-modal { … }` after it (its nested phone `@media` included), and the
  empty line before the comment. Result: the rule ends `  z-index: 1;` then `}` on the next line, then an empty line,
  then `.inline-edit-title {`.
- [ ] Inside the phone `@media`: delete the comment `/* Centred dialogs become bottom sheets. */`, the rule
  `.m-sheet { … }`, the rule `.m-sheet-card { … }` and the one empty line after each. Result: the closing `}` of
  `.m-fab-lift`, one empty line, then `/* Toasts clear the tab bar, and a page save bar when one is present. */`.
- [ ] In the plan 459 block: the comment ends `20 stays below the app header (z-index 100). */` (the sentence "The
  tablet/phone modal variant (.inline-edit-panel.as-modal, position: fixed, z-index 1001) is excluded: it already sits
  above its backdrop and must stay fixed." is removed), and the selector `.inline-edit-panel:not(.as-modal):has(.c-dropdown)`
  becomes `.inline-edit-panel:has(.c-dropdown)`.
- [ ] Nothing else in the file changes: the `body.kb-open` block, the phone `.c-modal-card` rule, the plan 703 and
  plan 720 blocks and every marker stay as they are. After the edit the file has 60 lines fewer (3243 → 3183 on the
  Snapshot) and no `m-sheet` and no `as-modal` anywhere.

**A3 — the guard forbids the selectors; the append-only checks accept this removal**
- [ ] `scripts/lib/modal-guard.mjs` (single quotes, no semicolons): add
  `export function withoutRetiredSheetRules(text)` → `string`, with the doc comment "Plan 757: the text of
  src/styles.scss without the bottom-sheet rules the Human approved removing on 2026-11-26 (the append-only tests
  compare with a base that may still hold them)". It returns `text` after these four replacements, each tolerant of
  `\r\n` (`\r?\n`), each a no-op when its piece is absent:
  1. `/\r?\n\r?\n  \/\* Tablet \+ mobile: the same panel[\s\S]*?\r?\n  &\.as-modal \{[\s\S]*?\r?\n  \}(?=\r?\n\})/` → `''`
  2. `/  \/\* Centred dialogs become bottom sheets\. \*\/\r?\n  \.m-sheet \{[^}]*\}\r?\n\r?\n  \.m-sheet-card \{[^}]*\}\r?\n\r?\n/` → `''`
  3. `/ The tablet\/phone modal variant \(\.inline-edit-panel\.as-modal,\r?\n\s*position: fixed, z-index 1001\) is excluded: it already sits above its backdrop and must stay fixed\. \*\//` → `' */'`
  4. the string `.inline-edit-panel:not(.as-modal):has(.c-dropdown)` → `.inline-edit-panel:has(.c-dropdown)`
  (These four were run on the Snapshot's file: 60 lines fewer, no `m-sheet` / `as-modal` left, a second call changes
  nothing.) The result of A2 must equal `withoutRetiredSheetRules` of the file before A2 — the tests below prove it.
- [ ] `scripts/test/modal-guard.test.mjs`: three cases under the title prefix `withoutRetiredSheetRules:` —
  (1) a fixture holding a small `.inline-edit-panel { z-index: 1;⏎⏎  /* Tablet + mobile: the same panel … */⏎  &.as-modal { position: fixed;⏎⏎    @media (max-width: 767px) {⏎      inset-inline: 0;⏎    }⏎  }⏎}`, a phone block with the
  comment, `.m-sheet` and `.m-sheet-card` between two other rules, and the plan 459 comment and selector list →
  the result has no `m-sheet` and no `as-modal`, still contains `z-index: 1;\n}`, the rule before and the rule after
  the sheet helpers, and `.inline-edit-panel:has(.c-dropdown)`; (2) a text without any of the pieces
  (`.c-modal-card { display: flex; }`) comes back identical; (3) calling it on its own result returns the same text.
- [ ] `scripts/test/style-720.test.mjs`:
  - `ALLOW`: delete the three `src/styles.scss` entries (selectors `'.m-sheet'`, `'.m-sheet-card'`, `'&.as-modal'`).
    The two `modal-no-scroll` entries stay untouched.
  - The test "no file under src/app mentions m-sheet or as-modal, and the shell has no sheet input": add
    `assert.ok(!/m-sheet|as-modal/.test(readFileSync('src/styles.scss', 'utf8')), 'src/styles.scss still has a retired sheet rule')`
    and rename the test to `no file under src/app and not src/styles.scss mentions m-sheet or as-modal, and the shell has no sheet input`.
  - The append-only test: import `withoutRetiredSheetRules` from `../lib/modal-guard.mjs`; the last line becomes
    `assert.equal(head(now), withoutRetiredSheetRules(head(base)))`; the title becomes
    `src/styles.scss above the plan 720 marker is the base file minus the sheet rules plan 757 removed (append-only)`.
    The base lookup keeps its three refs and the skip with its printed reason, plus one ref decided in ask 757-1
    (Planner amendment 2026-11-27): `origin/chore/restaurant-staging` goes right before `origin/main`, in both
    append-only tests, because staging's own stylesheet changes sit above the markers and a merge-base with
    `origin/main` counts them. That added ref is intended, not a weakened test.
- [ ] `scripts/test/style-703.test.mjs`: the same change in its append-only test — import
  `withoutRetiredSheetRules` from `../lib/modal-guard.mjs`, last line
  `assert.equal(head(now), withoutRetiredSheetRules(head(base)))`, title
  `src/styles.scss above the marker is the base file minus the sheet rules plan 757 removed (append-only)`. Its other
  two tests do not change.
- [ ] Why this shape: the base is the file at the branch point. On this plan's branch it still holds the rules; on
  every branch cut after this plan is merged it does not, and then the function changes nothing. Only the base side is
  passed through it, so a retired rule that comes back in the current file fails the comparison (and the guard).

**A4 — turn the two defaults on** (after A2, so the baseline starts at zero; from the repo root, in Git Bash, each
command on one line; the arguments are in single quotes and hold no apostrophe)
- [ ] `node scripts/product-defaults.mjs add --id modal-centered --rule 'Every popup opens in the middle of the screen at every screen size; no popup slides up from the bottom or drops from the top.' --trigger custom --words '\b(?:modals?|popups?|pop-ups?|dialogs?|bottom[- ]sheets?)\b' --how 'app-modal-shell (src/app/shared/modal-shell/, family modal-shell): it has no sheet input and the engine keeps .c-modal-overlay at align-items: center (the plan 720 block in src/styles.scss); the full proof is scripts/lib/modal-guard.mjs (bottom-sheet, top-sheet, sheet-binding) run by scripts/test/style-720.test.mjs' --check 'files: src/**/*.html, src/**/*.scss; trigger: \[sheet\]|\bm-sheet(?:-card)?\b|\bas-modal\b|^[ \t]*[^\n/*{}]*(?:overlay|backdrop)[^\n{}]*\{[^{}]*align-items:\s*(?:flex-)?end; evidence: (?!x)x' --exceptions 'a working panel that must leave the page visible is shown inside the page, not as a popup (the floor editor phone panel, plan 721); a small box beside a control follows anchored-popup; declare exception — why: one line' --date 2026-11-26`
  → prints `DEFAULTS: on modal-centered — Every popup opens in the middle of the screen at every screen size; no popup slides up from the bottom or drops from the top.` and `DEBT: added default.modal-centered at 0`.
- [ ] `node scripts/product-defaults.mjs add --id modal-scrollable --rule 'Every popup is never taller than the screen and its content scrolls inside it, so the title and the buttons can always be reached on a phone, a tablet and a desktop.' --trigger custom --words '\b(?:modals?|popups?|pop-ups?|dialogs?|bottom[- ]sheets?)\b' --how 'app-modal-shell (src/app/shared/modal-shell/, family modal-shell) with the engine height limit --modal-max-block on .c-modal-card (dvh, safe areas, keyboard; the plan 720 block in src/styles.scss): put the title, .c-modal-body and .c-modal-actions straight inside the shell and the body scrolls; a card sized through cardClass keeps max-block-size at or under var(--modal-max-block) and a part that scrolls; the full proof is scripts/lib/modal-guard.mjs (modal-no-scroll) and the engine values, both in scripts/test/style-720.test.mjs' --check 'files: src/app/**/*.scss; trigger: ^[ \t]*[^\n/*{}]*\.c-modal-(?:card|body)\b[^\n{}]*\{[^{}]*(?:overflow(?:-y)?:\s*(?:hidden|visible)|max-(?:block-size|height):\s*none); evidence: (?!x)x' --exceptions 'a popup card whose own inner part scrolls is listed with its reason in the allow list of scripts/test/style-720.test.mjs; declare exception — why: one line' --date 2026-11-26`
  → prints `DEFAULTS: on modal-scrollable — Every popup is never taller than the screen and its content scrolls inside it, so the title and the buttons can always be reached on a phone, a tablet and a desktop.` and `DEBT: added default.modal-scrollable at 0`.
- [ ] Files these two commands write: `_shared/product-defaults.md` (two `### <id>` sections appended at the end, each
  with `- status: on`, `- applies when: custom`, `- plan words: …`, `- how: …`, `- check: files: …`, `- exceptions: …`
  and `- turned on: the Human, 2026-11-26`) and `_shared/debt-baseline.json` (two kinds, `default.modal-centered` and
  `default.modal-scrollable`, each `{ "total": 0, "files": {} }`). Nothing else. The contract is never edited by hand.
- [ ] If a command prints `DEBT: added … at <n>` with `n` above 0: STOP and report the files
  (`node scripts/debt-baseline.mjs --show` and the `files` of that kind in `_shared/debt-baseline.json`) — for
  `modal-centered` it means a user of the old rules exists that A1 did not find; for `modal-scrollable` it means a
  component stylesheet turns a popup card's scrolling off. Do not fix the file and do not lower the baseline.
- [ ] If a command prints `DEFAULTS: refused — default "<id>" already exists`: STOP and report the entry's lines; do
  not edit it.
- [ ] `centred-scrolling-popup` is not added (the Human chose the two ids above). No `on`, `off` or `propose` command
  is run for any other id.
- [ ] `scripts/test/style-720.test.mjs`: one more test, `the contract holds modal-centered and modal-scrollable on,
  with rule checks that catch a sheet and a card that cannot scroll` — `readContract(process.cwd())` from
  `../lib/product-defaults.mjs`; `errors` is empty; both entries exist with `status === 'on'`, `diff !== null` and
  `onBy === 'the Human, 2026-11-26'`; no entry has the id `centred-scrolling-popup`; with
  `new RegExp(entry.diff.trigger, 'm')`:
  - `modal-centered` matches `<app-modal-shell [sheet]="true">`, `<div class="x m-sheet">`, `.panel.as-modal {` and
    `.my-backdrop {\n  align-items: flex-end;\n}`; it does not match `.c-modal-overlay { align-items: center; }` nor
    `.prep-sheets { align-items: flex-end }`.
  - `modal-scrollable` matches `:host ::ng-deep .c-modal-card {\n  overflow: hidden;\n}` and
    `.c-modal-body {\n  max-block-size: none;\n}`; it does not match `/* .c-modal-card */\n.y { overflow: hidden; }`
    nor `.c-modal-body {\n  overflow-y: auto;\n}`.
  - both entries' `diff.evidence` is `(?!x)x`.

**A5 — registry, the gotcha and the inventory**
- [ ] `docs/brain/component-families.md`, family `modal-shell`: plan 720 already rewrote the bottom-sheet bullet
  ("Always centred (plan 720) …", `:90`) — do not rewrite it. Add one bullet right after it: "Defaults (on, the Human,
  2026-11-26): `modal-centered` and `modal-scrollable` in `_shared/product-defaults.md`. The old bottom-sheet rules
  (`.m-sheet`, `.m-sheet-card`, `.inline-edit-panel.as-modal`) were removed from `src/styles.scss` by plan 757; the
  guard has no allow entry for them."
- [ ] `docs/brain/component-families.md`, family `modal-guard`: the Use line (`:103`) gains
  "; `withoutRetiredSheetRules(text)` — the base text the append-only tests (`style-703`, `style-720`) compare with,
  minus the rules plan 757 removed".
- [ ] `docs/brain/gotchas/angular.md`, the entry "`container-type` is a `position: fixed` trap too — the list edit
  modal centred mid-list": add at the end of its "What hurt" paragraph (`:255`) the sentence "(The `.as-modal` variant
  no longer exists: the equipment panel is an `app-modal-shell` popup since plan 711 and the rule was removed by plan
  757; the trap holds for any `position: fixed` element.)" Nothing else in the entry changes.
- [ ] `docs/brain/inventory.md`: regenerated with `node scripts/inventory.mjs` (never by hand) — its "Defaults (on)"
  list gains the two defaults.
- [ ] Left as they are (history, not rules): `docs/brain/decision-grades.jsonl:25`, `docs/brain/follow-ups.md:16`,
  the fixtures and comments of `scripts/lib/modal-guard.mjs` and `scripts/test/modal-guard.test.mjs` (the guard must
  keep naming what it forbids) and the "is never a bottom sheet" spec case. The folder maps
  (`src/app/shared/breadcrumbs.md`, `src/app/pages/breadcrumbs.md`) were updated by 720 and 721 and name no removed
  rule.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- No screen changes: the removed rules have no user. Hebrew RTL and logical properties are not affected.
- No new dictionary key, no new icon. Plans 720 and 721 left nothing behind in `public/assets/data/dictionary.json`.
- Page recipe: none — no page or page frame is added or changed.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Prove that nothing uses the old bottom-sheet rules any more, and stop if something does — the safety check and the four searches of section A1; results into Execution Notes; writes no file — reads src/, e2e/, server/, public/, scripts/
- [x] A2: Remove the three dead bottom-sheet pieces from the shared stylesheet, as the Human approved — the block inside the inline edit panel, the two phone helpers with their comment, the plan 459 comment sentence and selector — src/styles.scss
- [x] A3: Make the guard forbid the removed selectors and teach the two append-only checks this one approved removal — new export withoutRetiredSheetRules with three fixture cases, three allow entries deleted, the stylesheet added to the no-mention test, both append-only assertions compare with the base minus the retired rules — scripts/lib/modal-guard.mjs, scripts/test/modal-guard.test.mjs, scripts/test/style-720.test.mjs, scripts/test/style-703.test.mjs
- [x] A4: Turn on the two popup defaults the Human asked for and prove their checks with a test — the two add commands of section A4, expected baseline zero for both, the contract test — _shared/product-defaults.md, _shared/debt-baseline.json, scripts/test/style-720.test.mjs
- [x] A5: Record the removal and the defaults in the registry, correct the gotcha note, regenerate the inventory — docs/brain/component-families.md, docs/brain/gotchas/angular.md, docs/brain/inventory.md
- [x] A6: Run every check of this plan and hand the Human the two equipment looks — every auto item of Goals with its exact output into Execution Notes; then the two human checks as cards — no file

## Technical Considerations
- Dependencies: already on the base branch — plans 720 and 721 (`scripts/lib/modal-guard.mjs` with `modalFindings`, `scripts/test/style-720.test.mjs` with `ALLOW` and its four tests, `scripts/test/style-703.test.mjs`, the plan 720 block in `src/styles.scss`) and plan 711's move of the equipment panel onto `app-modal-shell`.
- New files needed: none.
- Model changes: none.
- Backend / API: none.
- Auth and validation: none.
- Security surface: none.
- Data / migration: none.
- Project checks: the `log-query` Done-when item; `src/styles.scss` is a hotspot and this plan removes from it — approved by the Human on 2026-11-26 for exactly the three pieces of A2; dictionary and routes not touched; no file is added, so no folder map changes; `node scripts/reuse-lint.mjs --check-registry` stays 0 (no registered piece is renamed or removed — the removed selectors are not `.c-*` engines). Stylesheet edits follow `.claude/skills/cssLayer/SKILL.md`. Nothing under `.claude/` is written.
- Order matters: A4 runs after A2. `add` records the gaps that exist at that moment in the baseline; before A2 `modal-centered` would record `src/styles.scss`, and the only command that lowers a baseline (`node scripts/debt-baseline.mjs --lower`) also rewrites every other kind that fell.
- The run's own gate (`node scripts/kit-checks.mjs`) evaluates the two new rules on this branch's changed files: `src/styles.scss` is one of them and matches neither trigger after A2.
- Specificity of the changed selector: `.inline-edit-panel:has(.c-dropdown)` is (0,2,0), still above the engine's `.inline-edit-panel { z-index: 1 }` (0,1,0), so an open dropdown still lifts its panel (`position: relative; z-index: 20`).
- Windows shell: the two `add` commands were checked in Git Bash — the arguments reach Node unchanged. In PowerShell the same single-quoted arguments are literal too.
- When the base branch later lands on `main`, the append-only tests keep passing there: the function only takes the retired rules out of the base side.

## Out of Scope
- Any live user of the old rules (A1 stops instead of removing one).
- Rules that plan 720's appended block now overrides but that still apply to an element: the phone-only `.c-modal-card` height rule and the `.c-modal-card` lines of the `body.kb-open` block. The Human's approval names the bottom-sheet rules only.
- The guard's rules and its fixtures, the two remaining `modal-no-scroll` allow entries, and the popups they name.
- A combined default `centred-scrolling-popup`; any change to another default.
- Dictionary keys, folder maps and specs — plans 720 and 721 left nothing of theirs behind there.
- Recording or committing the Human's two remarks of 2026-11-24 (the Planner's files; this plan only quotes them).

## Critical Questions
- none

## Execution Notes
- The Human's words, chat, 2026-11-26: "Old popup rules: remove!", `default yes modal-centered`, `default yes modal-scrollable`. These are the turn-on the product-defaults skill requires; no agent proposed the `on`.
- behaviour: the whole `&.as-modal` block is removed (its tablet part too), not only its phone bottom sheet — no element can carry the class, and a half block would keep the selector in the file. Reverse: restore the block from the commit before this plan.
- behaviour: the `:not(.as-modal)` in the plan 459 selector and the comment sentence about it are removed with the class, so the file names `as-modal` nowhere and the guard needs no allow entry.
- behaviour: both defaults get a script check (rule data), not a card, so no later plan gets a human check from them. The contract's rule format can only say "a file that matches this pattern is a finding"; it cannot call `scripts/test/style-720.test.mjs` and cannot read a rule's `@media` or a `cardClass` value. So the rule data is a quick net in `kit-checks` — `modal-centered`: the retired names, the `[sheet]` binding and an overlay or backdrop aligned to the end; `modal-scrollable`: a component stylesheet that sets `overflow: hidden / visible` or `max-block-size: none` on `.c-modal-card` / `.c-modal-body` — and each default's `how` names the guard test as the full proof (it runs in `pnpm run test:scripts`, which CI runs). Reverse: `node scripts/product-defaults.mjs off --id <id>`.
- behaviour: `modal-scrollable` looks at `src/app/**/*.scss` only. `src/styles.scss` is left out because its print rule for the loading list sets `overflow: visible` on `.c-modal-card` on purpose and the format cannot see `@media print`; the engine's values in that file are proven by the guard test's engine case.
- behaviour: both defaults use the same plan words (`modal`, `popup`, `pop-up`, `dialog`, `bottom sheet`), so a plan about a popup answers both rows.
- behaviour: `--date 2026-11-26` is passed so `turned on:` carries the day of the Human's words, not the build day.
- behaviour: this plan's own `## Defaults` has no row for `modal-centered` / `modal-scrollable` — they are not in the contract when the plan is saved, and a row for an unknown id fails the defaults gate.
- behaviour: A4 comes after A2 (see Technical Considerations), although the turn-on was the first thing asked for.

### Build (2026-11-27, branch `feat/757-remove-old-sheet-rules`)

Step 0 (drift): `git merge-base --is-ancestor <commit> HEAD` answers no for each listed commit, so none of them is on this branch.
- `79d691f7` ok · `73be8a0a` ok · `711cd215` ok · `a34fc0e3` ok · `9e339e05` ok · `bbf020bf` ok · `def248b0` ok · `30626b01` ok · `0df51a40` ok
- Scope files changed between the Snapshot and the branch point: only `docs/brain/component-families.md` and `docs/brain/inventory.md` (added entries of plans 751 and 752); no symbol this plan names was removed or rewritten.

A1 (safety check: the three files and the plan 720 marker exist):
1. `git grep -nE "m-sheet|as-modal" -- src` → `src/app/shared/modal-shell/modal-shell.component.spec.ts:128`, `:129`; `src/styles.scss:1416`, `:1855`, `:1859`, `:2654`, `:2659`.
2. `git grep -nF "[sheet]" -- src` → no match.
3. `git grep -nE "\bsheet\s*=\s*input\b" -- src/app/shared/modal-shell` → no match.
4. `git grep -nE "m-sheet|as-modal|\[sheet\]" -- e2e server public scripts` → only `scripts/lib/modal-guard.mjs`, `scripts/test/modal-guard.test.mjs`, `scripts/test/style-720.test.mjs`.

A2: `wc -l src/styles.scss` → 3183 (was 3243); the append-only tests prove the file equals `withoutRetiredSheetRules` of the base.

A4: both `add` commands printed their `DEFAULTS: on …` line and `DEBT: added default.<id> at 0`.

A5: besides the planned Use-line addition, `modal-guard` got a `Pieces:` line: `kit-checks` failed with `reuse-registry-missing-piece` until a line held the Reuse Check piece text as written; after it `KIT_CHECKS: ok (6 checks)`.

A6 evidence:
- `node --test scripts/test/modal-guard.test.mjs scripts/test/style-720.test.mjs scripts/test/style-703.test.mjs` → exit 0, pass 22, fail 0, skipped 0
- `pnpm run test:scripts` → exit 0, pass 269, fail 0
- `pnpm run build` → exit 0
- `pnpm run lint` → exit 0 (0 errors, 72 warnings)
- `pnpm run test:ci` → exit 0, `TOTAL: 3276 SUCCESS`
- `node scripts/product-defaults.mjs list` → exit 0, both `DEFAULTS: on` lines, `13 defaults, 12 on`, no `bad contract` line
- `node scripts/debt-baseline.mjs --show` → exit 0, `default.modal-centered 0 → 0`, `default.modal-scrollable 0 → 0`
- `node scripts/inventory.mjs --check` → exit 0, `INVENTORY: ok`
- `pnpm run lint:reuse` → exit 0 · `node scripts/reuse-lint.mjs --check-registry` → exit 0 · `node scripts/breadcrumbs-check.mjs` → exit 0, `BREADCRUMBS: clean`
- `pnpm run lint:icons`, `pnpm run lint:no-native-select`, `node scripts/plan-ledger-check.mjs`, `node scripts/override-check.mjs` → exit 0
- `kit-manifest-check` → exit 0, `0 unclassified` · `scope-check --diff=origin/orch/rs-console` → exit 0, `SCOPE: ok` · `kit-checks` → exit 0
- `node scripts/ci-scope-check.mjs --checkout-branch` → exit 0 (`skipped`: no branch name is passed outside CI)
- `node scripts/log-query.mjs --since=plan-start --level=error` → exit 0, `SKIP: no database configured` (no entries)
- The two `[human]` checks are not done: they are the Human's.
