# Plan 409 — Claude Code mods rollout: fleet, guards, ship-pilot

Status: draft
Snapshot: eb1495e490368f965cccddfaa9d1f5144837e2ee

## Problem Statement
Three Claude Code mods (in-process plugins) were built in a cloud session to replace and extend the
Planner-Worker shell hooks: **fleet** (session registry, slot lock, ports, health, handoff), **guards**
(branch / scope / kit-owned / `--no-verify` guards in process, with `/approve`), **ship-pilot** (PR band with
merge-gate buttons, plan progress, `/check`). Source: `C:\coding projects\Cursor\claude-mods-deliverable`
(playbook `AGENT-HANDOFF.md`). They are rolled out one at a time, each proven on this PC before the next,
then moved into `ai-workflow-kit`, then the duplicate shell hooks are retired for Claude Code only.

Done so far (2026-10-14, validated by the Human): Stage 0 (validate + tests on Windows, with fixes),
Stage 1 (fleet from disk: `/fleet`, `/ports`, `/fleet-health`, slot lock, `/handoff`, no PowerShell flash),
Stage 2 install (`fleet@ai-workflow-kit-mods`, user scope, enabled). Now in the one-week use window.

## Goals & Success Criteria
- Primary: all three mods installed at user scope and trusted in daily work; the kit ships them as a layer.
- Success: one full plan runs take-plan → work → /ship → merge with only the mods guarding Claude Code; Cursor unchanged.

## Execution Mode
- Parallel: yes — Stages 2–4 touch no repo files; Stage 6 touches workflow docs/config only
- Concurrent plans: any
- Isolated DB: no

## Read-Write Scope

```scope
# Stage 6 only (Stages 2-5 change nothing in FoodVibe). Kit-owned files arrive as a kit patch (ADR 0018).
.claude/settings.json
scripts/branch-guard.sh
scripts/scope-guard.sh
scripts/plan-write-guard.sh
scripts/session-startup.sh
.claude/commands/take-plan.md
.claude/commands/ship.md
.claude/skills/save-plan/SKILL.md
docs/agent/ship-regular.md
docs/agent/standards-git.md
docs/agent/job-validation.md
AGENTS.md
docs/brain/decisions/**
```

## Read Scope
Entire repo, plus `C:\coding projects\Cursor\claude-mods-deliverable\**` (README, SECURITY, WORKFLOW-CHANGES,
MOVE-TO-KIT, evidence) and `C:\coding projects\Cursor\ai-workflow-kit\**`.

## Escalation Protocol
Standard. Any `[auto]` check that fails stops that stage: report the exact output, do not start the next stage.
Mod code fixes go into the deliverable copy first, then the kit (Stage 5) — never edited in an installed plugin cache.

## Architecture Impact
- INV-none: preserves — the Planner-Worker rules are unchanged; Stage 6 only moves their Claude Code enforcement
  from shell hooks into the guards mod. The shell scripts stay for Cursor. Stage 6 adds an ADR recording that move.

## Step 0 — Reality Check
Before each stage: `claude plugin list` (what is installed), `claude --version` ≥ 2.1.299, deliverable folder present.

## Calendar
- **2026-10-14** — Human chose to compress: guards and ship-pilot installed the same day as fleet (user scope),
  with daily event logs added to all three mods so any problem can be traced back.
- **Now → 2026-10-21 (Wed)** — one shared use week for all three; guards checks 1–7 in a slot; ship-pilot on the next real small PR.
- **2026-10-21** — review the week's logs together (`.claude/mods-*-YYYY-MM-DD.log` in each checkout), close S2b/S3b/S4.
- **After that** — Stage 5 kit PR, then Stage 6 patch.

## Daily logs
Each mod appends JSON lines to `<checkout>/.claude/mods-<mod>-YYYY-MM-DD.log` (gitignored by `.claude/*.log`):
session start/end, every guard deny/approve/error, slot-lock denies, handoffs, merge-gate replies/refusals,
`/check` ticks, checks-finished events. Read all of them: `Get-ChildItem "C:\coding projects\Cursor\foodVibe1.0*\.claude\mods-*.log"`.

## Stage notes (how-to, from AGENT-HANDOFF.md)
- **Stage 2 (now → 2026-10-21):** daily `/fleet` at start, `/fleet-health` when heavy (plain `/health` is gstack's
  skill), `/handoff` instead of `/clear` when context is high. Optional: `/plugin configure fleet@ai-workflow-kit-mods`
  → Phone push URL (ntfy).
- **Stage 3:** `claude plugin install guards@ai-workflow-kit-mods --scope user`. In a slot after `/take-plan NNN`:
  in-scope edit passes; out-of-scope edit denied (`SCOPE_GUARD … approved:`; shell guard also speaks — two messages
  expected); `/approve <path>` appends to the scope block; editing the scope block directly denied; `git push
  --no-verify` denied; `/role` shows worker + plan; in the Planner folder code edit denied, `.claude/todo.md` allowed.
- **Stage 4:** `claude plugin install ship-pilot@ai-workflow-kit-mods --scope user`. `/progress`, `/check A1`
  (only that line changes), `/ship` to a PR, `/pr`, green-checks toast, **merge** button / `/merge` (refuses on a
  failing check), slot freed after merge.
- **Stage 5 (kit repo):** branch `feat/claude-code-mods-layer`, `git am` the deliverable `.patch`, then add the
  Windows fixes below, `--mods` flag in `tools/install.mjs`, manifest tier, `kit.json` bump, README row
  (+ recommend community `next-steps@claude-community`). Checks: leak-check, pack-check, install-check.
- **Stage 6 (FoodVibe, `chore/` branch in a slot):** per deliverable `WORKFLOW-CHANGES.md` Phases C–D.

## K7 spec — ship-pilot plan panel (asked by the Human 2026-10-17)
Goal: a glance tells the Human what the agent is doing, what comes next, and whether it needs them.

- **Open/close:** the `plan NNN xx%` chip in the dock becomes a `Button` (`<Button>` can wrap `Text` children), hotkey `p`. Pressing it toggles a framed panel drawn **directly below the dock frame** (same `AbovePrompt` tree, after `frame`). The open/closed choice stays across turns (`$.state`), and the panel closes on its own when there is no active plan.
- **Panel content, top to bottom:**
  1. Title `Plan NNN — <title>`.
  2. A progress bar (the existing `bar()`), `%`, `done/total steps`, and total time on the plan.
  3. Every Atomic Sub-task, one line each: `✓` done (dim) · `▶` now (bold, plus time on this step) · `○` open, with the next open one marked `next`. Long plans: show at most 12 lines, centred on `now`, and `… N more` above/below.
  4. `⚠ Waiting on you: …` (yellow), only when it applies, from deterministic signals only: a PR that is open with checks green (merge), an `AskUserQuestion` tool call still pending, or the agent's last message asking for `approved: <path>` / a go.
  5. `Your checks at the end: N` — the count of `[human]` (and untagged) Done-when items, already parsed into `progress.doneWhen`.
  6. `After this: plan X → Y` — open plans whose text says `must run after plan NNN` (the same wording `take-plan.mjs` reads), followed one hop further.
- **Time:** stored per plan in `$.store` (`planStartedAt`, `stepStartedAt` set when `current` changes) so it survives restarts; shown as `1h 40m` / `25m`.
- **Token cost: zero.** The panel is drawn by the mod. It makes no model calls, adds nothing to `prompt.compose`, and writes nothing to the transcript. Plan files are read only when their mtime changes (the existing `planMtime` poll). The "after this" scan reads open plan files once per plan load, not per redraw.
- **Narrow terminals:** under 80 columns, drop the time and "after this" lines first.

## Atomic Sub-tasks
- [x] S0: Stage 0 — validate + test all three mods on Windows — `claude-mods-deliverable/layers/claude-code-mods/**`
- [x] S1: Stage 1 — fleet from disk in a slot (fleet/ports/health, slot lock, /handoff, no flash) — `claude-mods-deliverable/layers/claude-code-mods/fleet/**`
- [x] S2a: Stage 2 — install fleet from the local marketplace at user scope — `~/.claude/settings.json`
- [ ] S2b: Stage 2 — one week of fleet use (2026-10-14 → 2026-10-21), no fleet error toasts, ≥1 real lock or recovery — `(no files)`
- [ ] S3a: Stage 3 — install guards at user scope and run checks 1–7 in a slot and the Planner folder — `(no files)`
- [ ] S3b: Stage 3 — one week with shell guards + guards mod, no false denials — `(no files)`
- [ ] S4: Stage 4 — install ship-pilot; /progress, /check, /pr, toast, merge button on a real PR — `(no files)`
- [ ] K1: kit fix — test mocks strip the drive letter (guards path helper; ship-pilot P + fs.write) — `ai-workflow-kit/layers/claude-code-mods/{guards,ship-pilot}/tests/*.test.ts`
- [ ] K2: kit fix — fleet registers each command in its own try/catch; `/fleet-health` alias (gstack `/health` clash) — `ai-workflow-kit/layers/claude-code-mods/fleet/hooks/register.tsx`
- [ ] K3: kit fix — ship-pilot `/pr` handler gets a `.catch` (validator: gating hook without .catch) — `ai-workflow-kit/layers/claude-code-mods/ship-pilot/hooks/register.tsx`
- [ ] K5: kit — daily event logs in all three mods (done in the deliverable copy 2026-10-14) — `ai-workflow-kit/layers/claude-code-mods/*/hooks/register.tsx`
- [ ] K4: kit docs — headless `claude -p "/cmd"` from Git Bash needs `MSYS_NO_PATHCONV=1` — `ai-workflow-kit/layers/claude-code-mods/README.md`
- [ ] K6: kit — mods dock: one framed band above the prompt shared by all three mods (collapsed line, expands on alert; guards status line dropped) — done in the deliverable copy 2026-10-16 — `ai-workflow-kit/layers/claude-code-mods/*/hooks/register.tsx`, `*/tests/*.test.ts`
- [ ] K7: ship-pilot plan panel — click the plan % chip to open a panel under the dock: bar, steps (done/now/next), waiting-on-you, time, end checks, after-this; zero model tokens (see K7 spec) — build in the deliverable copy first — `claude-mods-deliverable/layers/claude-code-mods/ship-pilot/{hooks/register.tsx,types/index.d.ts,tests/*.test.ts}`
- [ ] S5: Stage 5 — kit PR: patch + K1–K4 + `--mods` install flag + manifest tier + kit.json bump + README — `ai-workflow-kit/**`
- [ ] S6a: Stage 6 — remove Claude Code `hooks` from settings (keep `permissions`) — `.claude/settings.json`
- [ ] S6b: Stage 6 — "superseded for Claude Code; still used by Cursor" header on shell guards — `scripts/*-guard.sh`, `scripts/session-startup.sh`
- [ ] S6c: Stage 6 — take-plan step 0 dropped; save-plan Phase 0 uses `/approve` — `.claude/commands/take-plan.md`, `.claude/skills/save-plan/SKILL.md`
- [ ] S6d: Stage 6 — ship-pilot band notes + `/check` sentence — `.claude/commands/ship.md`, `docs/agent/ship-regular.md`, `docs/agent/standards-git.md`, `docs/agent/job-validation.md`
- [ ] S6e: Stage 6 — ADR "Claude Code guards run in-process (mods); shell guards remain for Cursor" — `docs/brain/decisions/`
- [ ] S6f: Stage 6 — AGENTS.md Compaction bullet mentions `/handoff` and `/fleet-health` — `AGENTS.md`

## Done when
- [auto] `claude plugin list` shows `fleet@ai-workflow-kit-mods`, `guards@ai-workflow-kit-mods`, `ship-pilot@ai-workflow-kit-mods` each `✔ enabled`.
- [human] Stage 2: one week of fleet with no fleet error toasts and at least one real lock or recovery event.
- [human] Stage 3: guards checks 1–7 behave as written; one week with no false denials.
- [human] Stage 4: merge happened only through the literal `merge` reply/button; slot freed afterwards.
- [auto] Stage 4: `gh pr view <n> --json state` → `MERGED`.
- [auto] Stage 5: `git am` applies cleanly; `node tools/leak-check.mjs` prints `0 leaks`; pack-check and install-check exit 0; `install.mjs --mods --dry-run` output contains no `{{`.
- [human] Stage 5: kit PR merged.
- [auto] K7: `claude plugin validate` and `claude plugin test` pass for ship-pilot, with new tests for: the panel toggle, the 12-line window around `now`, waiting-on-you signals, the after-this chain, and no `$.model` / `prompt.compose` use (grep finds none in ship-pilot).
- [human] K7: in a slot running a plan, pressing the plan % chip (or `p`) opens the panel under the dock; the steps match the plan file; `▶ now` follows the agent's work; a pending question shows `⚠ Waiting on you`; pressing again closes it.
- [auto] Stage 6: `ng build` passes; `node scripts/plan-ledger-check.mjs` passes.
- [human] Stage 6: one full plan executed end to end with only the mods; Cursor sessions unchanged.

## Out of Scope
Changing the Planner-Worker rules themselves; Cursor-side enforcement; paid features.
