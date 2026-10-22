# MVP review fixes run mode — plans 478–483

Dandan validated `mvp-review` on 2026-10-22 and asked for fixes on a separate branch. Everything in
`docs/mvp/run-mode-review.md` applies, with these changes:

## Branches
- Integration branch: **`mvp-review-fixes`** (from `mvp-review` at `ae9dc090`). Base for every feature branch is
  **`origin/mvp-review-fixes`**. Branch name `feat/<NNN>-<slug>`. Read every `origin/mvp-review` in run-mode-review.md
  as `origin/mvp-review-fixes`.
- Never commit, push or merge to `main`, `mvp` or `mvp-review`. Each plan merges into `mvp-review-fixes` as its own
  `--no-ff` merge so Dandan can later take them to `main` one by one.

## Slots and ports
- Use only slots **wt-1 (4201/3001)** and **wt-2 (4202/3002)**.
- **Never touch wt-3, port 4203 or port 3003** — Dandan is validating there. Never stop, restart or kill anything on
  those ports, never check out anything in `C:\coding projects\Cursor\foodVibe1.0-wt-3`.

## Evidence
- Screenshots go to `C:\coding projects\Cursor\mvp-review-evidence\fixes\<NNN>\`. Accounts:
  `C:\coding projects\Cursor\mvp-review-evidence\accounts.json`.

## CSS trap found in this review
- `src/styles.scss` resets `button`, `input`, `select`, `textarea` outside any `@layer`. Unlayered styles beat every
  layered style, so a component rule inside `@layer components.*` that styles a raw native element loses. Load the
  cssLayer skill before SCSS edits and check the rendered result in the browser, not only the source.
