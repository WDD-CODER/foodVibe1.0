# Plan 255 — Dead Code Cleanup

**Source:** `reports/dead-code-audit.md` (audit run 2026-04-06)
**Branch:** `fix/dead-code-cleanup`
**Risk:** Low — deletions and config text edits only. No application logic changes.

---

## Goal

Remove confirmed dead files, fix broken wiring in the AI workflow tooling, and document investigation decisions for the probable-dead scripts. Result: a cleaner project where everything that exists is either actively used or explicitly documented as to why it stays.

---

## Background

A full dead code audit was run across 303 files on 2026-04-06. The application code itself is clean — all Angular components, services, guards, and pipes are actively wired. The dead weight is concentrated in three areas:

1. **Deprecated AI workflow skills** — two skill folders explicitly marked deprecated in their own files but never deleted
2. **One-time migration scripts** — nine scripts in `scripts/` that were run once and left behind with no npm entry or CI hook
3. **Broken wiring in the AI agent config** — stale references, missing roster entries, and triggers that were never added

Full findings and reasoning: `reports/dead-code-audit.md`

---

## Atomic Sub-tasks

### Phase 1 — Confirmed Deletions (safe, no debate)

- [ ] Task 1: Delete `.claude/skills/commit-to-github/` — confirmed deprecated, replaced by git-agent
- [ ] Task 2: Delete `.claude/skills/end-session/` — confirmed deprecated, replaced by worktree-session-end
- [ ] Task 3: Delete `.claude/agents/triage-agent.md` — zero references, never wired in
- [ ] Task 4: Delete `scripts/backfill-name-snapshots.mjs` — untracked, no npm entry
- [ ] Task 5: Delete `scripts/seed-from-dump.js` — one-time seed, explicitly documented as done
- [ ] Task 6: Delete `scripts/stamp-master-userId.js` — one-time migration, explicitly "Run ONCE"
- [ ] Task 7: Run `ng build` — confirm zero errors after all Phase 1 deletions

### Phase 2 — Script Investigation (probable dead — requires a human decision first)

- [ ] Task 8: Investigate repair trio — ask: was the broken-ref repair fully applied in prod?
  - If YES → delete `scripts/backup-before-repair.mjs`, `scripts/diagnose-broken-refs.mjs`, `scripts/repair-recipe-references.mjs`
  - If NO / unsure → add a comment in each file documenting why it still exists, and add an npm script entry so it is no longer invisible
- [ ] Task 9: Investigate migration pair — ask: is the master-layer migration complete in production?
  - If YES → delete `scripts/migrate-to-master.mjs` and `scripts/link-users-to-master.mjs`
  - If NO / unsure → document status in each file header
- [ ] Task 10: Investigate `scripts/trim-demo-data.mjs` — ask: is demo trimming a recurring operation or a one-time step?
  - If recurring → add `npm run trim-demo` entry in `package.json`
  - If one-time and done → delete

### Phase 3 — AI Workflow Wiring Fixes

- [ ] Task 11: `copilot-instructions.md` §0.3 — add a row for `git-agent.md` in the agent roster table (it is heavily used but absent from the roster)
- [ ] Task 12: `.claude/agents/qa-engineer.md` — remove or update the stale line referencing "commit-to-github Phase 0"; replace with the equivalent `git-agent` trigger if applicable
- [ ] Task 13: `copilot-instructions.md` §0 — add a trigger entry for `interface-design` skill so conversational prompts like "design this page" auto-route to it
- [ ] Task 14: `.claude/commands/reflect-add-tests.md` — decide: add a trigger in `copilot-instructions.md` (e.g., `/reflect add-tests`) or delete the command
- [ ] Task 15: `.claude/commands/sweep-stale-todos.md` — verify the pending update described in `truly-open-tasks.md` has been applied; then add a trigger entry so it runs at session end
- [ ] Task 16: `src/app/core/utils/gemini-shots.util.ts` — decide: build the read-back feature that consumes `getGeminiShots()`, or remove the orphan export and the paired `localStorage` write in `addGeminiShot`

---

## Execution Notes

- Create branch `fix/dead-code-cleanup` before starting
- Phase 1 tasks can be executed immediately — no investigation needed
- Phase 2 tasks require a YES/NO answer from the team before touching files — do not delete without confirmation
- Phase 3 tasks are config/text edits — low risk, but read the full context of each file before editing
- Run `ng build` after Phase 1 to confirm the application still compiles; no build step needed for Phases 2–3

---

## Definition of Done

- All Phase 1 files deleted, `ng build` passes
- Phase 2 decisions documented (either deleted or comment added explaining why they stay)
- Phase 3 wiring fixes applied and verified by reading the updated config files
- `reports/dead-code-audit.md` stays as a permanent audit record — do not delete it
