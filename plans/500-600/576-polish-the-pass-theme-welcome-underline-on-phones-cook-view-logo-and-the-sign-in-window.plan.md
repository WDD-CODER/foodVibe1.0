# Plan 576 — Polish The Pass theme: the welcome underline on phones, the logo in Cook View, and the sign-in window

Status: done
Depends-on: 571, 572, 574
Snapshot: eea6788003969ad697266b4083729f162ed3a5f6

## Problem Statement
Dandan reviewed the run `pass-theme` (plans 571–574) on 2026-11-10 and 2026-11-11 and asked for three fixes before
merging: the welcome screen's underline on phones, the logo that disappears in Cook View, and a better sign-in
window ("take a good look at the sign in flow and style"). All three were measured on the built run branch with
screenshots at 1280×800 and 390×844.

Verified on `orch/pass-theme` (eea67880, 2026-11-11):
- Welcome screen, phone width: the promise "שום דבר לא יוצא מהמטבח בלי בדיקה. גם לא המחיר." wraps to two lines. `.welcome__promise` has `line-height: var(--lh-tight)` (`src/app/pages/welcome/welcome.page.scss:29-37`), and the `<span class="c-pass-line">` inside it is an inline box, so its 3 px amber border is drawn under each line and the first line's border touches the top of the second line's letters.
- Cook View: `src/app/core/components/header/header.component.html:60-62` renders `<img src="/assets/style/img/fc-mark.svg" …>`; the file's fill is the fixed teal `#115e59`. While Cook View is open the page carries `:root.theme-kitchen` (dark background `#0a1614`, header `rgba(24, 58, 54, 0.94)`), and the pot is almost invisible on it. `src/styles.scss:284` already holds a kitchen-only override (`:root.theme-kitchen .c-dropdown`), so kitchen overrides of shared pieces live there.
- Sign-in window: `src/app/core/components/auth-modal/auth-modal.component.html:1-14` opens `<app-modal-shell size="md" …>` straight into the two tabs. There is no mark, no name and no heading, so the window that every new customer meets first looks anonymous. Sign-up on a 390 px phone is a long form (username, business name, email, password, confirm, profile photo) with the buttons below the fold. The existing keys `welcome_back` ("ברוך שובך") and `welcome_start` ("פתיחת חשבון") fit as the two headings.
- `src/app/core/components/auth-modal/auth-modal.component.spec.ts` builds the component with a stubbed `TranslationService` (`translate: k => k` except one key), opens it with `AuthModalService.open('sign-up')` and switches mode through `TestBed.inject(AuthModalService).mode.set('sign-in')`.
- `tools/theme/check-tokens.mjs` (plan 572) ends with the lines that print `THEME_TOKENS: ok`.

## Goals & Success Criteria
**Primary:** the welcome promise has one clean amber underline on a phone, the logo is visible in Cook View, and the sign-in window opens with the mark, the name and a heading.

- [auto] `pnpm run test:ci` passes, including the new cases: in `src/app/pages/welcome/welcome.page.spec.ts`, the `.c-pass-line` inside `.welcome__promise` has the computed style `display: inline-block`; in `src/app/core/components/auth-modal/auth-modal.component.spec.ts`, the element `[data-testid="auth-brand"]` holds an `img` and the text `foodCo`, and its `h2` reads `welcome_start` in sign-up mode and `welcome_back` in sign-in mode (the stub returns the key).
- [auto] `node tools/theme/check-tokens.mjs` exits 0 and prints `THEME_TOKENS: ok`, now also failing when `src/styles.scss` lacks the line `:root.theme-kitchen .brand-mark img {`.
- [auto] `pnpm run build` passes.
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run lint:icons` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] On a phone, the welcome promise has one amber line under the whole sentence and no line touches a letter.
- [human] In Cook View the pot mark is clearly visible in the header, and outside Cook View it is still the teal mark.
- [human] The sign-in and sign-up windows open with the mark, the name foodCo and the heading, on a phone and on a laptop, and still fit the screen.

## Execution Mode
- Parallel: no — it edits `src/styles.scss` and files plan 574 created.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/welcome/welcome.page.scss
src/app/pages/welcome/welcome.page.spec.ts
src/app/core/components/auth-modal/auth-modal.component.html
src/app/core/components/auth-modal/auth-modal.component.scss
src/app/core/components/auth-modal/auth-modal.component.spec.ts
tools/theme/check-tokens.mjs
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — style rules, one template block and tests; the sign-in logic (`onSubmit`, tokens, guards) is not edited.

## Reuse Check

- none — no new component, util, pipe, service or `.c-*` class; the heading block uses existing classes and keys.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a new customer on my phone, I want the first screen to look finished so that I trust the product.
- As a cook, I want to see the logo in dark Cook View so that the app looks the same everywhere.

## Functional Requirements

### Must Have (P0)
- [ ] `src/app/pages/welcome/welcome.page.scss`: inside `.welcome__promise` add `line-height: var(--lh-snug);` (replacing `var(--lh-tight)`) and a nested rule `.c-pass-line { display: inline-block; text-wrap: balance; }`, so the two lines sit under one amber line. Keep the group order of `.claude/skills/cssLayer/SKILL.md`; the nested rule goes after the declarations and before the tablet media query.
- [ ] `src/app/pages/welcome/welcome.page.spec.ts`: add the case for the computed `display` (read it with `getComputedStyle` on `.welcome__promise .c-pass-line`).
- [ ] `src/styles.scss`: append, directly after the `:root.theme-kitchen .c-dropdown { … }` rule (line 284), `:root.theme-kitchen .brand-mark img { filter: brightness(0) invert(1); opacity: 0.92; }` with the comment `// Plan 576: the teal pot disappears on the dark kitchen header; show it light there.` (an addition to the hotspot; nothing existing changes).
- [ ] `tools/theme/check-tokens.mjs`: before the `if (fails.length)` line add a check that `src/styles.scss` includes `:root.theme-kitchen .brand-mark img {` and push `src/styles.scss missing the kitchen brand mark rule` when it does not.
- [ ] `src/app/core/components/auth-modal/auth-modal.component.html`: directly inside `<app-modal-shell …>`, before `<div class="auth-tabs">`, add `<div class="auth-brand" data-testid="auth-brand"><img src="/assets/style/img/fc-mark.svg" alt="" width="40" height="40" /><span class="auth-brand__name">foodCo</span><h2 class="auth-brand__title">{{ (isSignUp ? 'welcome_start' : 'welcome_back') | translatePipe }}</h2></div>`.
- [ ] `src/app/core/components/auth-modal/auth-modal.component.scss`: add `.auth-brand` — a centred column (`display: flex; flex-direction: column; align-items: center;`, `gap: var(--space-1)`, `margin-block-end: var(--space-4)`), `.auth-brand__name` (`color: var(--color-primary)`, `font-weight: var(--fw-extrabold)`, `font-size: var(--fs-md)`), `.auth-brand__title` (`margin: 0`, `font-size: var(--fs-lg)`, `font-weight: var(--fw-bold)`, `color: var(--color-text-main)`); tokens and logical properties only, five-group property order.
- [ ] `src/app/core/components/auth-modal/auth-modal.component.spec.ts`: add the two cases named in the Done-when list (sign-up then `mode.set('sign-in')`, `fixture.detectChanges()`).

### Should Have (P1)
- none

### Nice to Have (P2)
- none

## UI/UX Notes
- RTL: the heading block is centred, so nothing mirrors wrongly. The name `foodCo` stays Latin, as in the header.
- No new dictionary keys (`welcome_back`, `welcome_start` exist) and no new icons.
- Not changed on purpose: the form fields, labels, validation, the sign-up fields and every sign-in rule; the dark grey look of the window's backdrop; the modal shell.

## Atomic Sub-tasks

- [x] A1: Put one amber line under the whole welcome promise on a phone — block the highlighted span and balance its lines — src/app/pages/welcome/welcome.page.scss, src/app/pages/welcome/welcome.page.spec.ts
- [x] A2: Show the logo in light colour while Cook View is open — one kitchen rule next to the existing kitchen rules, and the check that guards it — src/styles.scss, tools/theme/check-tokens.mjs
- [x] A3: Open the sign-in and sign-up windows with the mark, the name and a heading — one block, its styles and two spec cases — src/app/core/components/auth-modal/auth-modal.component.html, src/app/core/components/auth-modal/auth-modal.component.scss, src/app/core/components/auth-modal/auth-modal.component.spec.ts
- [x] A4: Run the theme check, build, lint, the icon lint, the unit tests and the log query, and paste the output lines under Execution Notes

## Technical Considerations
- Dependencies: plans 571 (name), 572 (tokens, `tools/theme/check-tokens.mjs`), 574 (welcome page).
- New files needed: none
- Model changes: none
- Backend / API: none
- Auth and validation: none — the form and its handlers are not touched.
- Security surface: none
- Data / migration: none
- Project checks: log-query item present; no new keys or icons; logical CSS properties; hotspot `styles.scss` — one addition.

## Out of Scope
- A redesign of the sign-in form or a shorter sign-up form (the profile photo and business name fields stay).
- The backdrop of the modal, `app-modal-shell`, and any `.c-modal-*` engine.
- Social sign-in, "forgot password", or any change to who can sign in.

## Critical Questions
- none

## Execution Notes
- Planner 2026-11-11: written from screenshots of `orch/pass-theme` served locally (welcome and sign-in at 1280×800 and 390×844, Cook View at 1280×800 and 390×844).
- Builder: test:ci -> exit 0 (1896 SUCCESS); check-tokens -> THEME_TOKENS: ok; build -> 0; lint -> 0 (0 errors); lint:icons -> 0; log-query -> exit 0 (no DB, skipped).
