# Plan 298 — Cursor ↔ Claude Code Parity Gaps

## Goal

Close the discoverability/enforcement gap between Claude Code's `.claude/commands` +
`.claude/skills` and Cursor's `.cursor/commands` + `.cursor/rules`, found while adding the
`/ship` Phase 0 lane classification this session (`.claude/commands/ship.md` had no
`.cursor/commands/ship.md` counterpart). Full audit: `.claude/reports/cursor-claude-parity-audit.md`.
Also resolves two design issues that audit surfaced: the new ULTRA-TRIVIAL zero-confirmation
auto-commit lane conflicting with `.cursorrules`' "only proceed with explicit approval" policy,
and `.cursorrules` duplicating content that also lives in `.cursor/rules/*.mdc` with nothing
keeping the two in sync.

## Author / role

Architect pass (Claude Code, this session — audit + Human decisions on 0.1/0.2/scope already
locked). Config/docs only, no application code. Can be executed in one pass rather than
milestone-by-milestone-with-review, since every file is either a proven-pattern stub (already used
4x in this repo) or a small, independent edit — but each milestone below is still separable if a
STOP is needed partway through.

## Decisions (locked, from Human review of the audit)

- **0.1** — `/ship`'s own lane gates (including ULTRA-TRIVIAL's zero-confirmation auto-proceed)
  count as sufficient "explicit approval" for git writes, in both tools. Land this in the shared
  files both tools already read (`.claude/agents/git-agent.md`, `docs/agent/standards-git.md`),
  not as a tool-specific carve-out.
- **0.2** — Fold `.cursorrules` into `.cursor/rules/*.mdc` and delete it, rather than hand-syncing
  two sources going forward.
- **Scope** — Everything in the audit except `mobile-flow-audit`, `render-flow-audit`,
  `auto-solve` (Agent/Playwright-MCP dependent — needs its own design call, not a copy-paste stub).

## Milestones

| ID | Status | Deliverable |
| --- | --- | --- |
| M1 | [x] | Git approval exception named explicitly (resolves 0.1) |
| M2 | [x] | `.cursorrules` folded into `.cursor/rules/contractor-role.mdc`, deleted, references repointed (resolves 0.2) |
| M3 | [x] | 13 Cursor command discoverability stubs + delete dead `quick-chat.md` |
| M4 | [x] | 12 Cursor skill-enforcement `.mdc` rules |
| M5 | [x] | `docs/agent/workflow-map.md` synced to reflect M1–M4 |

---

### M1 — Git approval exception (resolves 0.1)

**Files:** `.claude/agents/git-agent.md`, `docs/agent/standards-git.md`

`git-agent.md` already has the relevant exception line ("`/ship` is the execute path... the main
session may commit this-chat files") and is read by both tools (`.cursor/commands/git.md` and
`commit-github.md` redirect straight to it). Update it to name the lanes explicitly so
ULTRA-TRIVIAL's zero-confirmation auto-proceed is unambiguously included, not just the general
Y-gate. Add one cross-reference line to `standards-git.md`'s "Human commits and pushes by default"
bullet pointing at the same exception, since that's the doc both tools load for any git write.

- [x] M1a `.claude/agents/git-agent.md` — reword the exception line to name FAST/ULTRA-TRIVIAL/REGULAR lanes
- [x] M1b `docs/agent/standards-git.md` — add cross-reference line in the Branch & commit rules section
- [x] M1c Grep repo for other places that state a Cursor-specific "always ask before commit" rule (found via `.cursorrules` in M2) and confirm they're superseded, not contradicted

---

### M2 — Fold `.cursorrules` into `.cursor/rules/`, delete it (resolves 0.2)

**Files:** `.cursor/rules/contractor-role.mdc` (new), `.cursorrules` (delete), `README_WORKFLOW.md`,
`_shared/tech-stack.md`, `.github/workflows/ci.yml`

Route each `.cursorrules` section to where it belongs:
- Stack hard rules + Security → already verbatim in `AGENTS.md` (shared). Drop.
- Plan Contracts → already covered by `.cursor/rules/save-plan-must-use-skill.mdc`. Drop.
- Git → superseded by M1. Drop.
- Role / Execution protocol / Handoff (Contractor role + cost routing, one-milestone-at-a-time,
  3-strike rule, no-architecture-drift, `ng lint` before milestone-ready, write
  `sessions/[date].md`) → genuinely not duplicated elsewhere. New home.

- [x] M2a Create `.cursor/rules/contractor-role.mdc` (`alwaysApply: true`) — Role/cost-routing +
      Execution protocol + Handoff content only, written thin (point to
      `docs/agent/job-validation.md` for validation mechanics rather than restating them, matching
      every other `.mdc` file's style in this repo)
- [x] M2b Delete `.cursorrules`
- [x] M2c `README_WORKFLOW.md:43` — repoint "Contractor rules" reference to `.cursor/rules/contractor-role.mdc`
- [x] M2d `_shared/tech-stack.md:2` — repoint `.cursorrules` reference to `.cursor/rules/contractor-role.mdc`
- [x] M2e `.github/workflows/ci.yml:41` — swap `.cursorrules` for `contractor-role.mdc` in the docs-only file-glob pattern
- [x] M2f Grep repo for `.cursorrules` again — only historical files (`sessions/*`, `plans/*`, `docs/brain/*`) should still reference it

---

### M3 — Cursor command discoverability stubs

**Pattern (proven 4x already — `done.md`, `fix-pr-checks.md`, `ship.md`):** new
`.cursor/commands/{name}.md`, `description:` frontmatter line, one body line:
`` Follow `.claude/commands/{name}.md` exactly. ``

- [x] M3a High priority (core workflow, used constantly): `feat.md`, `fix.md`, `plan.md`,
      `refactor.md`, `security.md`, `review.md`, `review-it.md`, `brief.md`, `brief-detect.md`
- [x] M3b Medium priority (maintenance/hygiene, explicit-trigger): `docs-refresh.md`, `cleanup.md`,
      `sweep-stale-todos.md`, `evaluate-me.md`
- [x] M3c Delete dead `.cursor/commands/quick-chat.md` ("Retired — three-agent cutover")

---

### M4 — Cursor skill-enforcement `.mdc` rules

**Pattern:** naming `{skill-name}-must-use-skill.mdc`. Two existing shapes to reuse:
- **Glob-triggered** (like `angular-component-structure.mdc`) for file-type/path-tied skills
- **Agent-Requested** (like `brain-memory-session-start.mdc`: `alwaysApply: false`, no `globs:`,
  description-only) for behavioral-moment skills — Cursor's analogue of Claude Code's
  skill-description auto-invoke

| File | Shape | Skill | Trigger |
| --- | --- | --- | --- |
| `auth-and-logging-must-use-skill.mdc` | Glob (same paths as `security.mdc`) | `auth-and-logging` | guards/interceptors/HTTP CRUD |
| `auth-crypto-must-use-skill.mdc` | Glob (`**/auth-crypto.ts`) | `auth-crypto` | hashing/token work |
| `brief-detection-must-use-skill.mdc` | Agent-Requested | `brief-detection` | structured H2 markers in first message |
| `angular-pipe-logic-must-use-skill.mdc` | Glob (`src/app/**/*.{pipe,directive}.ts`) | `angular-pipe-logic` | pipe/directive work |
| `update-docs-must-use-skill.mdc` | Agent-Requested | `update-docs` | after significant features, before a PR |
| `techdebt-must-use-skill.mdc` | Agent-Requested | `techdebt` | end of session, before PR, "audit tech debt" |
| `breadcrumb-navigator-must-use-skill.mdc` | Glob (`src/app/pages/**`) | `breadcrumb-navigator` | new subtree / structural change |
| `preflight-must-use-skill.mdc` | Agent-Requested | `preflight` | before dev-server/browser/DB workflows |
| `elegant-fix-must-use-skill.mdc` | Agent-Requested | `elegant-fix` | after a hacky fix / duplicate logic |
| `worktree-setup-must-use-skill.mdc` | Agent-Requested | `worktree-setup` | explicit "setup worktree" |
| `context-management-must-use-skill.mdc` | Agent-Requested | `context-management` | mid-task checkpoint / `/checkpoint` |
| `github-sync-must-use-skill.mdc` | Agent-Requested | `github-sync` | session start / once per day |

For `context-management` and `github-sync`: Claude Code's version is hook-driven (`PreCompact`,
`SessionStart`), Cursor has no hook system at all. The `.mdc` rule is best-effort, not a guaranteed
trigger — say so in one line inside each rule body so it's never mistaken for equivalent automation.

- [x] M4a Write all 12 files per the table above
- [x] M4b Spot-check one glob rule and one Agent-Requested rule against their existing-pattern
      counterparts (`angular-component-structure.mdc`, `brain-memory-session-start.mdc`) for shape
      fidelity

---

### M5 — Sync `docs/agent/workflow-map.md`

- [x] M5a §2 rule-sources table — remove `.cursorrules` row, note the fold into `.mdc`
- [x] M5b §3 Cursor commands table — add the 13 new rows from M3
- [x] M5c §4 skills table — add the new `.mdc` file to "Key connections" for each of the 12 skills from M4
- [x] M5d §9 known inconsistencies — drop/resolve the entries this plan closes; leave #7 ("Cursor
      enforcement is advisory") as still true in spirit but now backed by far more `.mdc` coverage

## Validation

Config/docs only — no `ng build` needed, verification is read-through:

1. `git diff --stat` / `git status --short` — confirm only the files named in M1–M5 changed,
   nothing under `src/`
2. Every new `.mdc` file has either `globs:` or a semantically useful `description:` with
   `alwaysApply: false` (Agent-Requested) — never both missing
3. Grep repo for `.cursorrules` — only historical files remain (`sessions/*`, `plans/*`,
   `docs/brain/*`, this plan)
4. Spot-check `.cursor/commands/feat.md` against `.cursor/commands/done.md`, and
   `.cursor/rules/auth-and-logging-must-use-skill.mdc` against
   `.cursor/rules/angular-component-structure.mdc`, for pattern fidelity
5. This plan's own diff (~30 files, touches `.cursor/rules` security-adjacent paths) would classify
   as REGULAR under the new `/ship` Phase 0 — ship it through the normal pipeline, not fast lane
