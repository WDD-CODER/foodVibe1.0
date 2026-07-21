# Cursor ↔ Claude Code Parity Audit

Date: 2026-07-21
Scope: every `.claude/commands/*.md`, `.claude/skills/*/SKILL.md`, `.claude/agents/*.md` against
`.cursor/commands/*.md`, `.cursor/rules/*.mdc`, and the legacy root `.cursorrules`.
Trigger: the `/ship` Cursor-discoverability gap found this session (fixed — see
`.cursor/commands/ship.md`). This report generalizes that fix across the whole project and
surfaces two issues that are **not** simple discoverability gaps.

**This is a report only — nothing below has been changed.**

---

## 0. Two findings that matter more than the stub-file gaps

### 0.1 The ULTRA-TRIVIAL auto-proceed lane (added to `/ship` this session) conflicts with `.cursorrules`

Root `.cursorrules` (still present, still read by Cursor alongside `.cursor/rules/*.mdc`), line 66:

> "Never commit. Never push. That's the Human's job by default. If Human explicitly asks you to
> commit/push, prepare via the repo's git-agent conventions and **only proceed with explicit
> approval**."

The new `/ship` Phase 0 ULTRA-TRIVIAL lane (single file, ≤10 lines, docs/handoff only) skips the
Y prompt entirely and auto-commits + pushes. That's fine under Claude Code's own model (`/ship`
is explicitly carved out in `git-agent.md` as "the execute path"), but `.cursorrules`'s "only
proceed with explicit approval" line was written before this lane existed and doesn't obviously
carve out a zero-confirmation case. Worth a decision: either (a) ULTRA-TRIVIAL still requires a
lightweight explicit approval in Cursor even though Claude Code auto-proceeds, or (b) amend
`.cursorrules` to explicitly except it, the same way it already excepts `/ship`'s Y-gate flow in
general. Leaving it as-is means the two tools' `/ship` genuinely behaves differently in a way
that isn't written down anywhere.

### 0.2 Three overlapping rule sources for Cursor, not two

`docs/agent/workflow-map.md` §2 documents `AGENTS.md` (both tools) and `.cursor/rules/*.mdc`
(Cursor-only) as the rule sources. There's a third: root `.cursorrules` (4.2 KB, legacy format —
predates the `.cursor/rules/*.mdc` split but is still present and still read by Cursor). It
duplicates content that also lives in `.cursor/rules/git-commit-must-use-skill.mdc` (Merge Gate,
brain capture) and `.cursor/rules/save-plan-must-use-skill.mdc` (Plan Contract steps) — worded
slightly differently in each place. Nothing enforces the two staying in sync. This is exactly the
kind of drift `docs/agent/workflow-map.md` §9 already calls out for other areas ("known
inconsistencies") — recommend adding it there, or folding `.cursorrules` into the `.mdc` rules
and deleting it, whichever direction you want to standardize on.

---

## 1. Commands — Claude Code has 26, Cursor has 8

**Already redirected to a shared source (no gap):** `done`, `fix-pr-checks`, `ship` (new this
session), `add-recipe`/`deploy-github-pages` (redirect straight to the skill, no `.claude/commands`
counterpart needed), `commit-github`/`git` (redirect to `git-agent.md`).

**Dead file found in passing:** `.cursor/commands/quick-chat.md` is a one-line stub reading
"Retired — three-agent cutover. See PRD-three-agent-cutover.md." — not a parity gap, just stale
and probably worth deleting.

**No Cursor stub at all** (18 commands). Based on the `/ship` precedent — Cursor's agent can
already read and follow `.claude/commands/*.md` directly by name, the stub only adds
palette-autocomplete — these are lower severity than the skills gap in §2, but grouped by how
much it'd matter if Cursor never finds them on its own:

| Command | What it does | Priority if adding a stub |
| --- | --- | --- |
| `feat`, `fix`, `plan`, `refactor`, `security` | Core "path" routers — load standards, invoke `/plan`/`/review-it`, everyday dev flow | **High** — used constantly, same tier as `/ship` |
| `review`, `review-it` | Judgment-only review passes | **High** — reviewer role is explicitly meant to run on "whichever agent" per workflow-map §1 |
| `brief`, `brief-detect` | Session brief capture + brief-detection gate | **High** — brief-detection is already flagged as a race condition in workflow-map §9 finding #5; Cursor has zero enforcement of it (see §2) |
| `docs-refresh`, `cleanup`, `sweep-stale-todos`, `evaluate-me` | Maintenance/hygiene, explicit-trigger only | Medium |
| `mobile-flow-audit`, `render-flow-audit`, `auto-solve` | Use `Agent`/subagent spawns and Playwright MCP tools — **may not translate**, Cursor's subagent model differs | Low / needs a design call, not a copy-paste stub |
| `adversarial-template`, `test-template`, `test-pr-review-merge`, `validate-agent-refs` | Niche template-scoring / CI-adjacent tools | Low |
| `_index`, `commands`, `skills` | Listings | Low — cosmetic |

---

## 2. Skills — the real gap

Claude Code has a native skill-invocation mechanism (skills are listed with descriptions every
turn; the model decides to invoke). **Cursor has no equivalent.** The only way a skill gets
surfaced proactively in Cursor is a `.cursor/rules/*.mdc` file — either `alwaysApply: true`, or
`globs:`-triggered on matching file edits. Without one, the skill exists on disk but nothing
prompts Cursor to open it at the right moment; the Human (or AGENTS.md's trigger table, if the
agent happens to consult it) is the only thing standing in for the native mechanism.

**Has a `.mdc` rule (5 of 17 — enforced in both tools):**
`add-recipe`, `angularComponentStructure`, `cssLayer`, `save-plan` (`alwaysApply: true` —
strongest), and `deploy-github-pages`/`git-commit` flows are covered indirectly via their command
stubs.

**No `.mdc` rule at all (12 of 17):**

| Skill | Trigger (per AGENTS.md) | Severity | Why |
| --- | --- | --- | --- |
| `auth-and-logging` | Guards, interceptors, HTTP CRUD, protected access | **High** | `security.mdc` exists and globs the right paths (`server/middleware/**`, guards, interceptors) but only points to `docs/agent/standards-security.md` — never to this skill's specific procedure. Security-relevant. |
| `auth-crypto` | Hashing/encryption/tokens in `auth-crypto.ts` | **High** | Same gap — no glob rule points here at all, not even indirectly. |
| `brief-detection` | 3+ structured H2 markers in first message | **High** | Zero Cursor enforcement. Already implicated in workflow-map §9 inconsistency #5 (brief-detection vs save-plan race) — Cursor has no mechanism to even attempt the gate Claude Code's `/brief-detect` provides. |
| `angular-pipe-logic` | Before creating/refactoring a pipe or directive | Medium | Same shape as `angularComponentStructure` (which *does* have a rule) — looks like an oversight, not a deliberate omission. Easy glob: `src/app/**/*.{pipe,directive}.ts`. |
| `update-docs` | After significant features/components, or before a PR | Medium | No safety impact if missed, but docs silently drift. |
| `techdebt` | End of session / before PR / "audit tech debt" | Medium | Explicit-trigger phrases exist; a rule isn't strictly required if Cursor's agent reads AGENTS.md's table, but nothing forces it the way `save-plan-must-use-skill.mdc` forces plan persistence. |
| `breadcrumb-navigator` | New `pages/<x>/` or top-level subtree | Medium | Glob-able (`src/app/pages/**`), similar shape to the two Angular rules that already exist. |
| `preflight` | Before dev-server/browser/DB workflows | Low-Medium | Behavioral trigger, not file-glob-shaped — would need `alwaysApply` or a different mechanism. |
| `elegant-fix` | After a hacky fix / duplicate logic appears | Low-Medium | Judgment-based trigger, hard to glob; same caveat as `preflight`. |
| `worktree-setup` | Explicit "setup worktree" only | Low | On-demand, user always says the words — lower risk if Cursor doesn't proactively catch it. |
| `context-management` | `/checkpoint` before context exhaustion | Low, likely by design | Tied to Claude Code's own `PreCompact` hooks (workflow-map §5) — Cursor has no hook system at all, so this may be legitimately Claude-Code-only rather than a gap to close the same way. |
| `github-sync` | Session start, once per calendar day | Low, likely by design | Tied to Claude Code's `SessionStart` hook. Workflow-map §5 states outright: "Cursor runs none of these hooks." Closing this would need a different mechanism (e.g. `alwaysApply` rule that checks a date-stamped file), not a simple stub — flagging as structural, not a copy-paste fix. |

---

## 3. Suggested next step

Given the volume, recommend picking a batch rather than doing all 12 skills + 18 commands in one
pass:

1. **Decide §0.1** (ULTRA-TRIVIAL vs `.cursorrules`) first — it's a live behavioral
   inconsistency in the feature just shipped this session, not a backlog item.
2. **Decide §0.2** (fold `.cursorrules` into `.mdc` rules, or keep both in sync some other way) —
   affects how much duplicate work every future rule change creates.
3. If closing skill gaps: `auth-and-logging`, `auth-crypto`, `brief-detection` are the three with
   real (security/integrity) consequences if missed — start there.
4. Command stubs are cheap (one line each, proven pattern) — `feat`/`fix`/`plan`/`refactor`/
   `security`/`review`/`review-it`/`brief`/`brief-detect` could be batched in one pass whenever
   you want the palette parity; low risk since it's the same redirect-stub pattern already used
   four times.
5. `mobile-flow-audit`/`render-flow-audit`/`auto-solve` need an actual design decision (do they
   even make sense in Cursor's subagent model?) before writing a stub — don't lump these in with
   the cheap ones.
