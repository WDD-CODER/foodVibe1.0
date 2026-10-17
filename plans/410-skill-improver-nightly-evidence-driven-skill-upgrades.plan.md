# Plan 410 — Skill Improver: Nightly Evidence-Driven Skill Upgrades

Status: draft
Track: code — here (not design)
Snapshot: 8441ded934f524253aad01042f563c22043dda9b

## Problem Statement
Skills only improve when Dandan notices a failure by hand. This plan adds a nightly local job that picks the skill with the worst evidence from real sessions, writes a better version, proves it with a before/after eval graded by a separate judge, and opens a PR **only when the new version scores higher**. Dandan's only job: validate, then merge.

Decisions (Dandan, 2026-10-17):
- **Budget:** hard cap **400k tokens per night**. Always 1 skill; a 2nd skill only when the 1st finished under 200k.
- **Runs on Dandan's PC** (transcripts stay local). PC off → the job does not run and does **not** catch up later.
- **Kit-first, all skills:** the improver and its edits live in `ai-workflow-kit`; PRs go to the kit repo. FoodVibe gets the change via `kit-sync` (plan 392). Start with the skills FoodVibe uses (all 10 are kit-owned).
- Scout (new Claude Code / community features) is a separate plan: 411.

Lessons kept from retired plans 247/248/259 (retired in the July 2026 cutover, files deleted): the editor must not grade itself → separate blind judge; prefer machine-checkable assertions; keep a change only if the score rises. Dropped from them: custom `test-runner.sh` / `evaluator.md` / 70-30 score (replaced by the built-in skill-creator `evals/evals.json` format, already used by angularComponentStructure, cssLayer, save-plan) and the Stop-hook trigger (replaced by a schedule).

**Both repos are public.** Raw transcript text, user quotes, FoodVibe paths or names never reach a commit, PR body or eval file in the kit. Evidence in the PR is counts + generic one-line descriptions only, and passes kit `leak-check` before push.

## Prerequisites
- Plan 392 merged: FoodVibe runs on `kit-sync` (no patch mode). Without it each improvement needs a hand patch into FoodVibe — do not take this plan before.

## Goals & Success Criteria
**Primary:** one skill per night gets measurably better, and Dandan only validates + merges.

- [auto] Manual run `node tools/skill-improver/run.mjs --once` produces a kit PR `chore/skill-improve-<skill>-<date>` whose body has: evidence counts, the diff summary, before/after eval scores (after > before), and a 3-step "how to validate".
- [auto] A run whose candidate does not beat the old skill opens **no PR** and appends `no-change <skill> <before> <after> <reason>` to the local log.
- [auto] Budget: `--budget 20000` stops the run, prints `SKILL_IMPROVER: budget reached (N/20000)`, leaves no branch pushed.
- [auto] Path guard: a candidate diff touching anything outside `**/.claude/skills/<skill>/**` aborts with `SKILL_IMPROVER: out-of-scope <path>` and pushes nothing.
- [auto] Leak guard: kit `leak-check` passes on the diff + PR body before every push.
- [auto] `schtasks /query /tn "ai-workflow-kit skill-improver" /xml` shows a daily trigger and `StartWhenAvailable` false.
- [human] Dandan receives one scheduled nightly PR, validates it in FoodVibe after kit-sync, and merges it.
- [human] After one month: a one-page review (adopted PRs, real tokens/night vs 400k, keep / tune / stop).

## Execution Mode
- **Parallel:** no. Kit-side plan: the Worker opens its session in `../ai-workflow-kit`; FoodVibe side writes only this plan file.
- **Concurrent plans:** no other plan editing kit `tools/` or kit skills (393 must be merged or paused — the kit checkout is on `fix/393-servers-on-demand` with staged work on 2026-10-17).
- **Isolated DB:** no.
- **Kit edits:** kit branch `feat/410-skill-improver` + kit PR; Dandan merges.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts` —
add to them, never rewrite or remove an existing entry without escalating).

```scope
docs/workflow-kit/manifest.md
```

**Outside this repo:** kit `../ai-workflow-kit/tools/skill-improver/**`, `../ai-workflow-kit/core/.claude/commands/improve-skill.md`, `../ai-workflow-kit/core/.claude/agents/skill-judge.md`, `../ai-workflow-kit/kit-skill-improver.ps1`, kit `README.md` / `CHANGELOG.md` section; per-user state under `~/.claude/skill-improver/` (never inside a repo).

## Read Scope

Kit repo; FoodVibe `.claude/skills/**`, `docs/agent/skill-authoring-standard.md`, `docs/brain/gotchas/**`; local transcripts `~/.claude/projects/*/*.jsonl` (read by the evidence script only, never copied).

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a Worker needs a file outside the `## Read-Write Scope`: STOP, tell the Human the file, the change, and why; offer `approved: <path>`; then append the path to the scope block and retry. Registering the scheduled task changes Dandan's machine: show the exact `schtasks` command and wait for his go.

## Architecture Impact

- INV-none: preserves — kit tooling + a local scheduled task; no FoodVibe app file, hook or settings file is touched.

## Step 0 — Reality Check

0. Plan 392 merged; FoodVibe `.kit/install.json` exists. Kit `main` clean and equal to `origin/main`; no open kit PRs/branches with unmerged work.
1. Spike (≤30 min, write findings into this plan): (a) `claude -p` headless with `--output-format stream-json` exposes per-turn token usage the runner can sum; (b) `--model` works per call; (c) can `/skill-doctor` run headless (`claude -p "/skill-doctor"`)? If not, the context-cost signal comes from SKILL.md size instead. (d) skill-creator eval flow runs headless.
2. Confirm the transcript JSONL shape shows Skill tool calls and the user turns after them.

## Design

Nightly flow (`tools/skill-improver/run.mjs`, Node, no PowerShell 7 needed — `pwsh` isn't installed):
1. **Evidence (0 tokens, pure script):** `evidence.mjs` scans local transcripts since the last run → per skill: times fired, user corrections within 3 turns after it fired, retries/repeated tool failures, "should have fired" hits (trigger phrases from its description seen with no Skill call), SKILL.md size. Output: `~/.claude/skill-improver/evidence-<date>.json` (local only).
2. **Pick:** highest evidence score; ties → least recently improved; skip a skill with an open improver PR; pause entirely when ≥3 improver PRs are open unmerged (no pile-up).
3. **Isolate:** fresh `git worktree` of kit `origin/main` under `~/.claude/skill-improver/wt/` — never the kit checkout Dandan works in.
4. **Evals:** use the skill's `evals/evals.json`; if missing, first write 3 generic eval cases derived from the evidence (no project names) — these become part of the PR.
5. **Edit (strong model):** `improve-skill.md` proposes the edit per `skill-authoring-standard.md`, only inside the skill folder.
6. **Judge (cheap model, separate agent `skill-judge.md`):** runs old vs new against the evals blind (no hypothesis, no diff); runner computes scores.
7. **Decide:** after > before → path guard → leak-check → push branch → `GITHUB_TOKEN= gh pr create` on the kit repo. Else log `no-change`.
8. **Budget:** runner sums stream-json usage across every call; at 400k it kills the child, writes `budget reached`, pushes nothing half-done.
9. **Delete/merge proposals:** a skill that fired 0 times in 30 days gets a one-line "consider removing/merging" note in the next PR body (never auto-deleted).

Expected cost: evidence 0; edit ~30–60k; evals 6 runs × ~20–40k → **~150–300k per skill**, so usually 1 skill/night, sometimes 2.

## Functional Requirements

### Must Have (P0)
- [ ] Evidence script, picker, isolated worktree, evals (existing or generated), editor, blind judge, decide/push, budget cap, path guard, leak guard, local log.
- [ ] `kit-skill-improver.ps1` (PowerShell 5) registers / removes the daily task, `StartWhenAvailable` false, runs only when on AC power.
- [ ] PR body template: evidence counts, before/after, "how to validate" (kit-sync dry-run into FoodVibe, then the eval prompts to try by hand).

### Won't Have (this plan)
- Cloud runs, edits to hooks/settings/AGENTS.md/commands/scripts, auto-merge, the Scout (plan 411).

## Atomic Sub-tasks
- [ ] S0: Step 0 reality check + headless spike, findings written here — `plans/410-skill-improver-nightly-evidence-driven-skill-upgrades.plan.md`
- [ ] S1: Evidence script over local transcripts (counts only, local output) — `../ai-workflow-kit/tools/skill-improver/evidence.mjs`
- [ ] S2: Picker + rotation state + open-PR pause — `../ai-workflow-kit/tools/skill-improver/pick.mjs`
- [ ] S3: Runner: isolated worktree, budget meter over stream-json, path guard, leak guard, log — `../ai-workflow-kit/tools/skill-improver/run.mjs`
- [ ] S4: Editor command + blind judge agent + eval generation for skills without evals — `../ai-workflow-kit/core/.claude/commands/improve-skill.md`, `../ai-workflow-kit/core/.claude/agents/skill-judge.md`
- [ ] S5: PR creation + body template — `../ai-workflow-kit/tools/skill-improver/pr.mjs`
- [ ] S6: Scheduler script (PS5) + README/CHANGELOG section — `../ai-workflow-kit/kit-skill-improver.ps1`, `../ai-workflow-kit/README.md`, `../ai-workflow-kit/CHANGELOG.md`
- [ ] S7: Manual end-to-end run on one skill + budget-stop test + out-of-scope test — kit repo
- [ ] S8: Register the task (Dandan's go), receive one nightly PR — local machine
- [ ] S9: FoodVibe manifest note; `/ship` — `docs/workflow-kit/manifest.md`
- [ ] S10: One-month review (2026-11-17 or later) — `plans/410-skill-improver-nightly-evidence-driven-skill-upgrades.plan.md`

## Out of Scope
The weekly Scout and its HTML page (plan 411); kit-sync itself (plan 392).
