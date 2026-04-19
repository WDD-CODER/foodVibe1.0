# Gate-Chain Files

The mandatory read-chain that every main-session Claude must complete before acting.
Order: CLAUDE.md → agent.md → .claude/copilot-instructions.md

---

### CLAUDE.md

- **Path**: `CLAUDE.md`
- **Stated purpose**: Session-start gate — mandates reading `agent.md` and `.claude/copilot-instructions.md` before responding. Defines branch rule (never commit to main/master), gstack skill list, skill routing rules, codebase search priority (MemPalace → Grep/Glob → Explore agent), and session management conventions.
- **Inputs / triggers**: Loaded by Claude Code at session start as the project-level CLAUDE.md. Main-session Claude must confirm "Yes chef!" after reading both linked files. Subagents are exempt from this gate.
- **Outputs**: Provides operating rules for the entire session — skill routing table, MemPalace search protocol, branch-guard awareness, gstack tool list, session-state.md usage.
- **Cross-references**: `agent.md`, `.claude/copilot-instructions.md`, `docs/session-state.md`, `scripts/branch-guard.sh`, `~/.claude/skills/gstack/` (external), `.claude/sessions/` (checkpoints)
- **Approx size**: ~140 lines

---

### agent.md

- **Path**: `agent.md`
- **Stated purpose**: Preflight checklist and agent task-force index. Lists core rules (MemPalace-first, no-commit rule, Conventional Commits, test-before-commit, signal architecture), agent roster with trigger conditions, commands quick-reference table, and post-execution gate (show validation checklist, run build).
- **Inputs / triggers**: Read at session start immediately after CLAUDE.md. Also read by any agent that needs the full agent roster.
- **Outputs**: Operational reference for session — which agent file to load for which task, commands quick-reference, core invariant rules.
- **Cross-references**: `.claude/agents/` (all 8 agent files), `.claude/commands/` (all commands), `.claude/copilot-instructions.md`, `.claude/instructions/validation-checklist.md`
- **Approx size**: ~96 lines

---

### .claude/copilot-instructions.md

- **Path**: `.claude/copilot-instructions.md`
- **Stated purpose**: Single source of truth for all project rules, standards, and skill/agent triggers. Defines skill trigger table (§0), priority hierarchy (§0.1), context budget (§0.2), Context-First Protocol / MemPalace usage (§0.3), agent personas table (§0.4), task-force sizing (§0.5), model routing tiers (§0.6), persona & identity (§1), Q&A format (§1.1), and the Gatekeeper Protocol (§2) — phases 0.5–5 covering plan→approval→execution→QA lifecycle.
- **Inputs / triggers**: Read at session start (second file in gate-chain). Referenced by Cursor via `.cursor/rules/*.mdc` pointer files. Skills are self-contained; this file is NOT re-read while a skill is active unless the skill explicitly says so.
- **Outputs**: Provides skill trigger rules, persona identity ("Yes chef!" / "No chef!" prefix), Q&A format for decisions, Gatekeeper Protocol phases, standards file load-on-demand table.
- **Cross-references**: `.claude/standards-angular.md`, `.claude/standards-security.md`, `.claude/standards-domain.md`, `.claude/standards-git.md`, `.claude/standards-backend.md`, all `.claude/agents/*.md` files, all `.claude/skills/*/SKILL.md` files, `.claude/commands/*.md` files, `plans/` directory
- **Approx size**: ~200 lines
