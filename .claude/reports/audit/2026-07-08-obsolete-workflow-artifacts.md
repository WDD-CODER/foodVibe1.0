# Obsolete Old-Workflow Artifacts â€” Audit Report

**Date:** 2026-07-08
**Branch:** `chore/three-agent-cutover`
**Auditor role:** Reviewer (report-only â€” no files deleted)
**Baseline:** [`2026-07-cutover-summary.md`](2026-07-cutover-summary.md) + [`2026-07-cutover-verification.md`](2026-07-cutover-verification.md)

> **EXECUTION STATUS â€” DONE 2026-07-08 (Contractor / Cursor).** Buckets Aâ€“G executed on
> branch `chore/three-agent-cutover`. Deletions staged via `git rm` (not committed â€”
> Human commits). Bucket F pointers re-pointed. `ng build` PASS. See
> `sessions/2026-07-08.md` for the execution summary.
> **Open item for Reviewer:** `.claude/agents/product-manager.md` and
> `software-architect.md` still exist on disk and still reference the deleted
> `copilot-routing.md` / `copilot-instructions.md` â€” the "Already clean" list below is
> inaccurate for these two. Not in any delete bucket; left for a Human/Architect call.

## Scope

Confirm the three-agent cutover left no stragglers from the old
(MemPalace / copilot-instructions / nightly-reflect / SDK-template) workflow.
`claude-workflow-sdk/` was the seed example; this audit looks for everything like it.

## Method

- Enumerated tracked files with `git ls-files` (working-tree state, not stale index).
- Cross-checked each candidate against the cutover **Retired / Converted / Kept** lists.
- Verified live-routing references with content search (excluding history/plans/archives).
- Confirmed on-disk presence with `Test-Path` (several earlier search hits were stale
  index artifacts â€” see "Already clean").

---

## Verdict summary

| Bucket | Count | Action | Status |
|---|---|---|---|
| **A. Redundant template repos** | 2 dirs (125 files) | Remove from repo | DONE 2026-07-08 |
| **B. Dead MemPalace config** | 2 files | Remove | DONE 2026-07-08 |
| **C. Superseded router docs** | 3 files | Remove after re-pointing refs | DONE 2026-07-08 |
| **D. Legacy stubs (scheduled for delete)** | 2 files | Delete per cutover follow-up | DONE 2026-07-08 |
| **E. Orphaned / stale operational files** | 2 files | Remove | DONE 2026-07-08 (execute-debugging orphaned â†’ removed) |
| **F. Stale pointers inside kept files** | 4 files | Edit (fix pointer, don't delete) | DONE 2026-07-08 (incl. prd-template.md) |
| **G. Non-workflow loose files (needs Human call)** | 3 files | Confirm then remove | DONE 2026-07-08 (refactor-plan.md KEPT per Human) |

---

## A. Redundant template repositories (the `claude-workflow-sdk` class)

Both are self-contained copies of the **old** workflow scaffolding, vendored into the
project. Nothing in the live app or the new workflow references them (only `CHANGELOG.md`
mentions the names historically). They are the single biggest source of confusion.

| Path | Tracked files | What it is | Action |
|---|---|---|---|
| `claude-workflow-sdk/` | 98 | Old SDK template â€” full `.claude/` with `copilot-instructions.md`, nightly-audit/reflect skills, `[FRAMEWORK]` placeholders, old agents | `git rm -r claude-workflow-sdk` |
| `claude-workflow-toolkit/` | 27 | Old toolkit template â€” old agents (`product-manager`, `software-architect`), retired commands (`execute-it`, `plan-implementation`, `validate-agent-refs`), `standards-*.md` | `git rm -r claude-workflow-toolkit` |

> If either is meant to be a reusable starter kit, it belongs in its **own repo**, not
> inside FoodVibe. Recommendation: extract to a separate repo (or delete) â€” do not keep
> in-tree.

## B. Dead MemPalace configuration

MemPalace was fully retired (MCP registration, allows, `mp-search` skill all removed).
These two config files were missed:

| Path | Issue | Action |
|---|---|---|
| `.claude/mcp.json` | Still registers the `mempalace` MCP server (`python -m mempalace.mcp_server`). The root `.mcp.json` is already clean (github only). | Delete file (or remove the `mempalace` block if the file is needed for anything else â€” it isn't) |
| `mempalace.yaml` (root) | MemPalace runtime config. No live consumer. | `git rm mempalace.yaml` |

## C. Superseded router documents

The old "read `copilot-instructions.md` and confirm Yes chef!" router is fully replaced by
`CLAUDE.md` (Reviewer) + `.cursorrules` (Contractor) + path-scoped `.claude/rules/*.md`.
These three files are the old brain and should go â€” **but** re-point the two live commands
that still cite them first (see bucket F).

| Path | What it is | Action |
|---|---|---|
| `.claude/copilot-instructions.md` | The old monolithic Â§0 router / MemPalace-first search protocol | Remove after F is done |
| `.claude/copilot-routing.md` | Old model/agent routing table | Remove |
| `.claude/copilot-protocol.md` | Old protocol doc (still points at copilot-instructions; modified in working tree) | Remove |

## D. Legacy stubs (already scheduled for deletion)

The cutover summary Human follow-up says: *"Delete `CLAUDE.md.legacy` / `agent.md.legacy`
after one more cycle if unused."* They are unused by the new workflow.

| Path | Action |
|---|---|
| `CLAUDE.md.legacy` | `git rm` (cutover-approved) |
| `agent.md.legacy` | `git rm` (cutover-approved) |

## E. Orphaned / stale operational files

| Path | Issue | Action |
|---|---|---|
| `.claude/scheduled_tasks.lock` | Lock file for the retired nightly-audit / reflect cron. No scheduler remains. | Delete |
| `.claude/skills/execute-debugging/` | Extracted from the now-deleted `execute-it` command; the parent flow is gone. Verify no `/fix` or `review-it` path still invokes it, then remove. | Verify â†’ remove if orphaned |

## F. Stale pointers inside KEPT files (edit, don't delete)

These files stay, but contain dangling references to retired artifacts:

| File | Line | Stale reference | Fix |
|---|---|---|---|
| `.claude/commands/fix.md` | 26 | routes `other` bugs to `.claude/copilot-instructions.md` (full read) | Re-point to `.claude/rules/` + `CLAUDE.md` |
| `.claude/commands/evaluate-me.md` | 74 | lists `copilot-instructions.md` as IDE guidance | Re-point to `CLAUDE.md` / `.cursorrules` |
| `.claude/commands/feat.md` | â€” | old path-router command; verify it doesn't invoke retired `plan-implementation` / `execute-it` | Review vs new `/plan` + `/review-it` flow |

## G. Non-workflow loose files (Human judgment needed)

Not part of the workflow, but look like stale one-off artifacts at repo root. Flagging for
confirmation â€” not auto-removing:

| Path | Likely | 
|---|---|
| `test-output.txt` | Stray test dump |
| `01-home-page-snapshot.md` | One-off snapshot |
| `refactor-plan.md` | Superseded by `plans/` |
| `MOBILE_AUDIT_REPORT.md` | Superseded by `.claude/reports/mobile-audit/` |

---

## Already clean (verified â€” no action)

The cutover already removed these; earlier tool hits were stale-index false positives:

- `.claude/skills/mp-search/`, `.claude/skills/nightly-audit/` â€” **absent on disk**
- `.claude/commands/{plan-implementation,execute-it,nightly-audit,validate-agent-refs}.md` â€” **absent**
- `.claude/agents/{/ship,product-manager,reflect-agent,software-architect}.md` â€” **deleted**
- `.claude/reflect/`, `.claude/fix-templates/`, `.cursor/rules/`, `.claude/skills/worktree-session-end/` â€” **absent**
- `.claude/settings.json` â€” clean: `defaultMode: plan`, no `mcp__mempalace__*` allows, no reflect hooks
- root `.mcp.json` â€” github only

## Keep as-is (do NOT touch)

- `.claude/rules/*.md` (converted standards), `.cursorrules`, `CLAUDE.md`, `_shared/*`
- `sessions/`, `bugs/`, `plans/` (new + legacy `NNN-*.plan.md` coexist by design)
- Kept skills: `cssLayer`, `angularComponentStructure`, `add-recipe`, `auth-and-logging`,
  `auth-crypto`, `angular-pipe-logic`, `breadcrumb-navigator`, `techdebt`,
  `deploy-github-pages`, `update-docs`
- `render-flow-auditor`, `mobile-flow-auditor`, `qa-engineer`, `security-officer`,
  `team-leader`, `git-agent` (converted subagents)
- Historical audit/retrospective/reflect **reports** under `.claude/reports/` â€” history, not routing

---

## Recommended execution order (for the Human / Contractor)

1. **F first** â€” re-point `fix.md`, `evaluate-me.md`; review `feat.md`. (Unblocks C.)
2. **C** â€” remove `copilot-instructions.md`, `copilot-routing.md`, `copilot-protocol.md`.
3. **B** â€” delete `.claude/mcp.json`, `mempalace.yaml`.
4. **A** â€” `git rm -r claude-workflow-sdk claude-workflow-toolkit` (or extract to own repo).
5. **D** â€” delete the two `.legacy` stubs.
6. **E** â€” delete `scheduled_tasks.lock`; verify+remove `execute-debugging`.
7. **G** â€” confirm the 4 loose files with Human, then remove.
8. `ng build` gate â†’ single commit on `chore/three-agent-cutover` (Human commits).

> Per Reviewer protocol this report changes nothing. All deletions above are proposals
> awaiting the Human Director's go-ahead.
