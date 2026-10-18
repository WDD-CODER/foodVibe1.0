# Plan 411 — Workflow Scout: Weekly Claude Code and Community Update Page

Status: draft
Track: code — here (not design)
Snapshot: 8441ded934f524253aad01042f563c22043dda9b

## Problem Statement
New Claude Code features and strong community skills/plugins show up constantly and Dandan only finds them by chance, so the workflow system drifts and sometimes duplicates what Claude Code now does natively. This plan adds a weekly cloud job that collects what's new, judges it against **his** files, and publishes it as a short, engaging HTML page ("advertiser brain": punchy headline, one-line hook, what it does for you, the file it touches) that pulls him in to learn. Proposals only — nothing is applied.

Decisions (Dandan, 2026-10-17):
- **Weekly**, cloud scheduled routine (`/schedule`) — runs with the PC off.
- **Page lives in the repo:** `docs/scout/YYYY-MM-DD.html`, linked from a weekly PR on a `chore/scout-<date>` branch.
- **Kit-first:** the scout command + page template are kit-owned (any kit project gets it); FoodVibe receives it via `kit-sync` (plan 392). Reports land in the project the routine runs against (FoodVibe), so they can map to both kit-owned and FoodVibe-only files.
- Skill improvement is a separate plan: 410.

**FoodVibe and the kit are public repos.** The page and PR never include secrets, `.env` content, or transcript text.

## Prerequisites
- Plan 392 merged (FoodVibe on `kit-sync`).

## Goals & Success Criteria
**Primary:** once a week Dandan opens one page and learns, in under 3 minutes, the 5 changes most worth adopting in his setup.

- [auto] Manual run produces `docs/scout/<date>.html` + `docs/scout/state.json` on branch `chore/scout-<date>` and a PR whose body lists the top 5 as text (one line + file each) and links the page.
- [auto] The page is one self-contained HTML file (no external scripts), renders light and dark, and has: top-5 hero cards, "native feature now replaces your custom X" callouts, community picks with license + stars + last commit, a compact "also new" list, a source + version-range footer.
- [auto] `state.json` records the last Claude Code version and a cursor per source; a second run with no upstream changes produces "nothing new since <version>" and no PR.
- [auto] At least one recommendation in the first report comes from a non-Anthropic source and names a file in this repo.
- [auto] Budget: the run stops at its cap (fixed max sources/items; token cap if the routine supports one — see Step 0) and says `SCOUT: budget reached` on the page.
- [human] Dandan receives one scheduled weekly PR and finds the page easy and engaging to read.
- [human] Dandan marks on one report which recommendations were useful (a checkbox list in the PR body) — feeds tuning.

## Execution Mode
- **Parallel:** can run alongside plan 410 only if they touch different kit folders (410: `tools/skill-improver/**`; 411: `tools/scout/**`). Both add a CHANGELOG line — whoever merges second rebases.
- **Isolated DB:** no.
- **Kit edits:** kit branch `feat/411-workflow-scout` + kit PR; FoodVibe side adds `docs/scout/` after kit-sync.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts` —
add to them, never rewrite or remove an existing entry without escalating).

```scope
docs/scout/**
docs/workflow-kit/manifest.md
```

**Outside this repo:** kit `../ai-workflow-kit/tools/scout/**`, `../ai-workflow-kit/core/.claude/commands/scout.md`, `../ai-workflow-kit/templates/scout-page.html`, kit `README.md` / `CHANGELOG.md` section; the cloud routine (created via `/schedule`).

## Read Scope

Kit repo; FoodVibe `CLAUDE.md`, `AGENTS.md`, `.claude/**` (not `settings.local.json`), `docs/agent/**`, `docs/workflow-kit/kit-owned.json`, `docs/brain/decisions/**`. Never `.env*`.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a Worker needs a file outside the `## Read-Write Scope`: STOP, tell the Human the file, the change, and why; offer `approved: <path>`; then append the path to the scope block and retry. Creating the cloud routine is outward-facing and billed: show its prompt, schedule and repo, and wait for Dandan's go.

## Architecture Impact

- INV-none: preserves — kit tooling, a report folder and a cloud routine; no app code, hook or settings change.

## Step 0 — Reality Check

0. Plan 392 merged; kit `main` clean.
1. Spike (≤30 min, findings written here): (a) can a cloud routine read the repo, fetch public GitHub/web pages and push a branch + open a PR? (b) does it support a model choice per step or a token/turn cap? (c) can it run `/doctor prompt-audit` / `/skill-doctor` non-interactively? If not, drop them from the scout (plan 410 covers skill cost locally).
2. Re-check sources still exist and their licenses: anthropics/claude-code CHANGELOG, Claude Code docs "what's new", Anthropic engineering blog, anthropics/claude-plugins-official, marckrenn/claude-code-changelog (no license — read only, never copy text), hesreallyhim/awesome-claude-code, superpowers + gstack releases, sam-illingworth/audit-setup (MIT, used as the Adopt/Improve/Remove/Security/Parked template only).

## Design

- **Sources** in one config file `tools/scout/sources.json` (url, type, cursor key). Dandan edits it to add/remove.
- **Cheap collect, strong rank:** the model fills a JSON (`items[]`: category Adopt/Improve/Remove/Security/Parked, headline ≤8 words, hook line, why-for-you, file touched, effort S/M/L, source link, license/stars/last-commit for community items). A script renders it into the fixed template `templates/scout-page.html` — the model never writes HTML, which keeps the run cheap and the page consistent.
- **Slices:** one run reads only what's new since each cursor; capped at N items per source.
- **Fit against my files:** read `kit-owned.json` + the setup files to name the exact file; flag "native feature replaces custom X" and "community skill beats our skill Y".
- **Expected cost:** ~100–200k tokens per weekly run (~0.4–0.8M/month). Change cadence in the routine schedule; change caps in `sources.json`.

## Functional Requirements

### Must Have (P0)
- [ ] `scout.md` command (kit), `sources.json`, JSON→HTML renderer, page template, `state.json` cursors, PR with top-5 text + useful-checkbox list.
- [ ] Cloud weekly routine running the command against the FoodVibe repo.

### Won't Have (this plan)
- Applying any recommendation; a second "apply" PR (only when Dandan asks); skill editing (plan 410).

## Atomic Sub-tasks
- [ ] C0: Check the plan is still right and test a cloud routine before building — Step 0 reality check + routine spike, findings written here — `plans/411-workflow-scout-weekly-claude-code-and-community-update-page.plan.md`
- [ ] C1: List which news sources to scan and remember what was already seen — Sources config + cursor state format — `../ai-workflow-kit/tools/scout/sources.json`
- [ ] C2: Collect updates and judge which fit our workflow, within a budget — Scout command (collect, judge fit, emit JSON, budget caps) — `../ai-workflow-kit/core/.claude/commands/scout.md`
- [ ] C3: Turn the findings into an easy-to-read web page — Advertiser-style page template + JSON→HTML renderer — `../ai-workflow-kit/templates/scout-page.html`, `../ai-workflow-kit/tools/scout/render.mjs`
- [ ] C4: Open a weekly PR with the top 5 findings and the page link — Branch + PR step (top-5 text, page link, useful checkboxes) — `../ai-workflow-kit/tools/scout/pr.mjs`
- [ ] C5: Document the scout and bring it into FoodVibe — README/CHANGELOG section; kit PR merged; kit-sync into FoodVibe — `../ai-workflow-kit/README.md`, `../ai-workflow-kit/CHANGELOG.md`
- [ ] C6: Run it once by hand and get the first page and PR — Manual run in FoodVibe → first page + PR — `docs/scout/**`
- [ ] C7: Schedule it weekly after your go and receive one automatic PR — Create the weekly cloud routine (Dandan's go); receive one scheduled PR — cloud routine
- [ ] C8: You mark which tips were useful; record that and ship — Dandan marks useful recommendations; manifest note; `/ship` — `docs/workflow-kit/manifest.md`

## Out of Scope
Nightly skill improvement (plan 410); kit-sync itself (plan 392).
