# Agent Persona Files

Files under `.claude/agents/`. Each defines a specialized role that main-session Claude adopts on demand.
Loaded via the Agent tool or by reading the file and following it.

---

### breadcrumb-navigator.md

- **Path**: `.claude/agents/breadcrumb-navigator.md`
- **Stated purpose**: Creates and maintains `breadcrumbs.md` navigation files at major directory seams so agents and developers can instantly understand any directory. Runs at major structural changes to `pages/` or `src/app/` subtrees and after `update-docs`.
- **Inputs / triggers**: Invoked when new `pages/<x>/` or app subtree is created, after structural changes, or after `update-docs`. Also triggered by "Breadcrumbs only" rule in copilot-instructions.md. Reads `.claude/skills/breadcrumb-navigator/SKILL.md` for the execution protocol.
- **Outputs**: `breadcrumbs.md` files at affected directory seams. Only writes at major seams (not every subdirectory). Reads every file before writing to avoid overwrite errors.
- **Cross-references**: `.claude/skills/breadcrumb-navigator/SKILL.md`, `.claude/skills/update-docs/SKILL.md`
- **Approx size**: ~30 lines

---

### end-of-session-agent.md

- **Path**: `.claude/agents/end-of-session-agent.md`
- **Stated purpose**: Unified orchestrator for all session-closing workflows. Runs a 14-phase pipeline: brief validation, build gate, techdebt scan, git operations, todo archive, doc refresh, plan cleanup, session evaluation, and handoff report. Invoked whenever user says "done", "wrap up", "ship", "handoff", "end session", or "finish up".
- **Inputs / triggers**: Invoked by the `end-session` skill (which is itself triggered by session-end keywords). Requires: current branch, session brief (if exists), git status, outstanding todos.
- **Outputs**: Session handoff report written to `.claude/sessions/{id}/session-handoff.md`. Archives completed todos to `todo-archive.md`. Writes `docs/session-state.md`. Optionally runs git commit/push via git-agent.
- **Cross-references**: `.claude/agents/git-agent.md`, `.claude/skills/techdebt/SKILL.md`, `.claude/skills/update-docs/SKILL.md`, `.claude/skills/worktree-session-end/SKILL.md`, `.claude/skills/end-session/SKILL.md`, `.claude/todo.md`, `.claude/todo-archive.md`, `docs/session-state.md`
- **Approx size**: ~200+ lines

---

### git-agent.md

- **Path**: `.claude/agents/git-agent.md`
- **Stated purpose**: Handles all git operations with a visual-tree approval step before any write. Covers commit, push, PR creation, merge, branch management, and batch operations. Never writes to git until the user approves the visual plan.
- **Inputs / triggers**: Invoked when user mentions "commit", "push", "merge", "PR", "branch", or any git workflow (except session-end keywords which route to end-of-session-agent). Reads `.claude/standards-git.md` for branching and commit rules.
- **Outputs**: Git commits (Conventional Commits format), pushed branches, PRs via `gh` CLI, merge operations. Always presents visual tree/plan for user approval first.
- **Cross-references**: `.claude/standards-git.md`, `.claude/copilot-instructions.md` (git trigger rule), `CLAUDE.md` (branch rule)
- **Approx size**: ~120 lines

---

### product-manager.md

- **Path**: `.claude/agents/product-manager.md`
- **Stated purpose**: PRD authoring, feature scoping, requirement definition, and dependency mapping. Produces structured PRDs from user input and feeds them into the `/plan-implementation` workflow.
- **Inputs / triggers**: Invoked when planning a new feature, writing a plan file, or scoping work. Reads `.claude/references/prd-template.md` for the PRD format.
- **Outputs**: PRD documents (using `prd-template.md`), scoped feature briefs, dependency maps. Does NOT write code.
- **Cross-references**: `.claude/references/prd-template.md`, `.claude/commands/new-feature.md`, `.claude/commands/plan-implementation.md`
- **Approx size**: ~60 lines

---

### qa-engineer.md

- **Path**: `.claude/agents/qa-engineer.md`
- **Stated purpose**: Test strategy, regression verification, and diagnostic reasoning. Covers spec gap analysis, diagnosing failing tests, E2E test creation, and visual QA verification.
- **Inputs / triggers**: Invoked when spec gaps are found, tests are failing, E2E tests need creating, or visual QA is needed after feature completion. Part of the standard sequence (after implementation, before Security Officer if security surface touched).
- **Outputs**: Test specs, E2E test files, visual QA reports, diagnostic summaries. Interfaces with `/qa` (gstack) for browser-level verification.
- **Cross-references**: `.claude/instructions/validation-checklist.md`, gstack `/qa` skill
- **Approx size**: ~70 lines

---

### security-officer.md

- **Path**: `.claude/agents/security-officer.md`
- **Stated purpose**: Threat modeling, logic-flow audit, and vulnerability grepping. Covers OWASP Top 10 + STRIDE analysis. Mandatory sign-off after any change touching auth guards, interceptors, crypto, user service, localStorage/sessionStorage, new routes, or `[innerHTML]`/`bypassSecurityTrust*`.
- **Inputs / triggers**: Invoked after feature completion when security surface is touched, pre-deploy, or via `/cso` command. Mandatory after `auth-crypto` skill. Reads `.claude/standards-security.md`.
- **Outputs**: Security audit report with threat model findings, vulnerability list (OWASP/STRIDE), and remediation recommendations.
- **Cross-references**: `.claude/standards-security.md`, `.claude/skills/auth-crypto/SKILL.md`, `.claude/skills/auth-and-logging/SKILL.md`, gstack `/cso` skill
- **Approx size**: ~80 lines

---

### software-architect.md

- **Path**: `.claude/agents/software-architect.md`
- **Stated purpose**: Technical design, HLD authoring, Signal-based data flow mapping, entity modeling, and trade-off analysis. Produces HLDs from PRDs and architectural briefs that feed into `/plan-implementation`.
- **Inputs / triggers**: Invoked when a PRD exists and needs an HLD, or when architectural trade-offs need evaluation. Reads `.claude/references/hld-template.md` for the HLD format. Part of the standard sequence (after Product Manager, before implementation).
- **Outputs**: HLD documents (using `hld-template.md`), entity model diagrams, signal architecture maps, trade-off analyses.
- **Cross-references**: `.claude/references/hld-template.md`, `.claude/standards-angular.md`, `.claude/standards-backend.md`, `.claude/commands/plan-implementation.md`
- **Approx size**: ~80 lines

---

### team-leader.md

- **Path**: `.claude/agents/team-leader.md`
- **Stated purpose**: Multi-agent orchestration, parallel stream coordination, and conflict resolution. Uses `TeamCreate`/`TaskCreate` tools. Applies a two-stage review gate (quality oversight, visual QA trigger). Invoked when a task spans more than 2 subsystems or agents conflict.
- **Inputs / triggers**: Invoked when task spans >2 subsystems, agents conflict, or a progress report is needed. Reads `.claude/references/team-leader-output-template.md` for output format.
- **Outputs**: Task force assembly plan, parallel execution streams, conflict resolution decisions, progress reports using the standard output template.
- **Cross-references**: `.claude/references/team-leader-output-template.md`, `.claude/copilot-instructions.md` (§0.4, §0.5), all other agent persona files
- **Approx size**: ~100 lines
