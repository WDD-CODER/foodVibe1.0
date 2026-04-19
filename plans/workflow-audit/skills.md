# Skill Files

Files under `.claude/skills/`. Each skill is a self-contained execution protocol invoked via the Skill tool.
Workspace data directories and interface-design reference files are listed as sub-entries under their parent skill.
The external gstack suite is listed last.

---

### add-recipe/SKILL.md

- **Path**: `.claude/skills/add-recipe/SKILL.md`
- **Stated purpose**: 4-phase recipe extraction and validation workflow. Extracts recipe data from image or text, validates canonical Hebrew ingredient names, confirms with user before any write (hard stop at Phase 3), then commits the new recipe entry.
- **Inputs / triggers**: Triggered by "Add recipe/dish" rule in copilot-instructions.md. Invoked when user adds a recipe from an image or text.
- **Outputs**: New recipe entry in the recipe data store. Phase 3 requires explicit user confirmation before any file write occurs.
- **Cross-references**: `.claude/standards-domain.md` (Hebrew canonical values, ingredient ledger)
- **Approx size**: ~80 lines

---

### angularComponentStructure/SKILL.md

- **Path**: `.claude/skills/angularComponentStructure/SKILL.md`
- **Stated purpose**: Defines mandatory class section ordering for Angular components: CRDUL (Create, Read, Update, Delete, Lifecycle). Enforces standalone: true, ChangeDetectionStrategy.OnPush, inject() for DI (no constructor DI), and Signals for state.
- **Inputs / triggers**: Triggered before creating or refactoring Angular components. Invoked by copilot-instructions.md "Creating or refactoring Angular components" rule.
- **Outputs**: Angular component file with correct class section order, standalone decorator, OnPush detection, inject()-based DI.
- **Cross-references**: `.claude/standards-angular.md`, `.claude/skills/cssLayer/SKILL.md` (for SCSS)
- **Approx size**: ~120 lines

---

### angular-pipe-logic/SKILL.md

- **Path**: `.claude/skills/angular-pipe-logic/SKILL.md`
- **Stated purpose**: Scaffolds, implements, and tests Angular Pipes and Directives. Enforces pure pipes/directives, standalone: true, no constructor DI (use inject()), and correct transform/selector naming.
- **Inputs / triggers**: Triggered before creating or refactoring any Angular Pipe or Directive per copilot-instructions.md.
- **Outputs**: Angular Pipe or Directive file with pure flag, standalone decorator, inject()-based DI, test spec.
- **Cross-references**: `.claude/standards-angular.md`
- **Approx size**: ~60 lines

---

### auth-and-logging/SKILL.md

- **Path**: `.claude/skills/auth-and-logging/SKILL.md`
- **Stated purpose**: Audits and hardens authentication guards, mutation operations, and logging. Covers auth guard verification, mutation hardening (optimistic UI rollback), and PII scrubbing from logs. Mandatory Security Officer invocation on completion.
- **Inputs / triggers**: Triggered when touching auth, persistence, HTTP, or critical operations per copilot-instructions.md.
- **Outputs**: Hardened auth guard files, mutation-safe service methods, PII-scrubbed logging calls. Ends with Security Officer sign-off.
- **Cross-references**: `.claude/standards-security.md`, `.claude/agents/security-officer.md`
- **Approx size**: ~90 lines

---

### auth-crypto/SKILL.md

- **Path**: `.claude/skills/auth-crypto/SKILL.md`
- **Stated purpose**: Implements and audits hashing and encryption. Uses PBKDF2 for password hashing, AES-256 for encryption. No hardcoded salts. Mandatory Security Officer sign-off at completion.
- **Inputs / triggers**: Triggered before creating or modifying `auth-crypto.ts` per copilot-instructions.md.
- **Outputs**: Updated `auth-crypto.ts` with PBKDF2/AES-256 implementation, Security Officer audit report.
- **Cross-references**: `.claude/standards-security.md`, `.claude/agents/security-officer.md`
- **Approx size**: ~70 lines

---

### breadcrumb-navigator/SKILL.md

- **Path**: `.claude/skills/breadcrumb-navigator/SKILL.md`
- **Stated purpose**: Creates and maintains `breadcrumbs.md` navigation files at major directory seams. Rules: major seams only (not every subdirectory), read before write (verify every file listed exists), never invent cross-references.
- **Inputs / triggers**: Invoked by `.claude/agents/breadcrumb-navigator.md` and by the "Breadcrumbs only" trigger in copilot-instructions.md.
- **Outputs**: `breadcrumbs.md` at affected major seams (e.g., `src/app/`, `pages/`).
- **Cross-references**: `.claude/agents/breadcrumb-navigator.md`, `.claude/skills/update-docs/SKILL.md`
- **Approx size**: ~50 lines

---

### context-management/SKILL.md

- **Path**: `.claude/skills/context-management/SKILL.md`
- **Stated purpose**: Mid-task state preservation — detects when context is approaching limits and decides when to checkpoint vs continue. Lists specific triggers for checkpointing (task spans 3+ files, 2+ hours estimated, partial completion) and when NOT to (single-file fixes, < 30 min).
- **Inputs / triggers**: Invoked when context pressure is detected during a long task.
- **Outputs**: Checkpoint file at `.claude/sessions/YYYY-MM-DD-HHMM-{slug}.md` via `/checkpoint` command. Prints resume prompt.
- **Cross-references**: `docs/session-state.md`, `.claude/sessions/`
- **Approx size**: ~45 lines

---

### cssLayer/SKILL.md

- **Path**: `.claude/skills/cssLayer/SKILL.md`
- **Stated purpose**: Enforces the project CSS architecture. Five-group vertical rhythm (Reset/Tokens/Base/Components/Utilities). `.c-*` global components in `styles.scss` only. `var(--)` for all values. Logical properties for RTL/LTR support. `@layer` usage required.
- **Inputs / triggers**: Triggered before creating or editing any `.scss`/`.css` in `src/` per copilot-instructions.md.
- **Outputs**: SCSS files conforming to the five-group layer architecture, using design tokens, logical properties, and `.c-*` naming.
- **Cross-references**: `.claude/standards-angular.md`, `.claude/skills/cssLayer-workspace/` (eval data)
- **Approx size**: ~150 lines

---

#### cssLayer-workspace/ (evaluation data)

- **Path**: `.claude/skills/cssLayer-workspace/`
- **Stated purpose**: Evaluation workspace for cssLayer skill iterations. Contains SCSS fixture files and evaluation results for cssLayer v1 and v2 improvement cycles.
- **Inputs / triggers**: Read during `/reflect` PATH 2 when evaluating cssLayer skill mutations.
- **Outputs**: Used to score cssLayer skill versions; not directly written to by normal skill invocations.
- **Cross-references**: `.claude/skills/cssLayer/SKILL.md`, `.claude/commands/reflect.md`, `.claude/reflect/coverage/cssLayer.coverage.md`
- **Approx size**: Multiple files (SCSS fixtures + eval results)

---

### deploy-github-pages/SKILL.md

- **Path**: `.claude/skills/deploy-github-pages/SKILL.md`
- **Stated purpose**: Configures and deploys the foodVibe 1.0 Angular SPA to GitHub Pages. 4-phase workflow: build verification, base-href configuration, dist folder preparation, GitHub Pages push. Not automatic — only runs on explicit user request.
- **Inputs / triggers**: Triggered when user says "deploy", "publish app", "GitHub Pages" per copilot-instructions.md.
- **Outputs**: Deployed SPA on GitHub Pages branch. Build artifacts committed to `gh-pages` branch.
- **Cross-references**: `.claude/workflows/deploy.yml`, `.claude/agents/git-agent.md`
- **Approx size**: ~60 lines

---

### elegant-fix/SKILL.md

- **Path**: `.claude/skills/elegant-fix/SKILL.md`
- **Stated purpose**: Refines a working but mediocre fix into a clean, maintainable solution. Applies Adapter/Facade patterns, Angular Signals, and separation-of-concerns principles to replace hacky workarounds.
- **Inputs / triggers**: Triggered "after a hacky fix" per copilot-instructions.md.
- **Outputs**: Refactored code implementing the clean solution pattern; original hack removed.
- **Cross-references**: `.claude/standards-angular.md`
- **Approx size**: ~40 lines

---

### end-session/SKILL.md

- **Path**: `.claude/skills/end-session/SKILL.md`
- **Stated purpose**: Redirect stub — invokes the end-of-session-agent via the Agent tool. Exists so existing references to "end-session skill" don't break. Contains no execution phases of its own.
- **Inputs / triggers**: Triggered by session-end keywords ("done", "wrap up", "ship", "handoff", "end session", "finish up").
- **Outputs**: Delegates entirely to `.claude/agents/end-of-session-agent.md` via Agent tool.
- **Cross-references**: `.claude/agents/end-of-session-agent.md`
- **Approx size**: ~15 lines

---

### finalize-docs/SKILL.md

- **Path**: `.claude/skills/finalize-docs/SKILL.md`
- **Stated purpose**: Global documentation audit — verifies breadcrumbs at all major seams, checks doc registry sync, produces architecture state report. Triggered by "finalize docs" or "global audit" per copilot-instructions.md.
- **Inputs / triggers**: Invoked via `/finalize-docs` or when user says "finalize docs" or "global audit".
- **Outputs**: Updated `breadcrumbs.md` files, doc registry entries, architecture state report.
- **Cross-references**: `.claude/skills/breadcrumb-navigator/SKILL.md`, `.claude/skills/update-docs/SKILL.md`
- **Approx size**: ~55 lines

---

### github-sync/SKILL.md

- **Path**: `.claude/skills/github-sync/SKILL.md`
- **Stated purpose**: Once-per-calendar-day gate — pulls recent GitHub activity, checks PR status, cleans up stale worktree remotes, and verifies hook integrity. Skipped if `notes/github-sync/<today-date>.md` already exists.
- **Inputs / triggers**: Triggered at session start / after time away per copilot-instructions.md. Runs once per calendar day only.
- **Outputs**: `notes/github-sync/YYYY-MM-DD.md` with GitHub sync summary. Worktree remote cleanup if stale refs found.
- **Cross-references**: `notes/github-sync/`, `.claude/skills/worktree-setup/SKILL.md`
- **Approx size**: ~70 lines

---

### interface-design/SKILL.md

- **Path**: `.claude/skills/interface-design/SKILL.md`
- **Stated purpose**: Interface design system — ~392 lines covering craft principles (intent-first, domain exploration, subtle layering), token architecture, and the commands: `/init`, `/audit`, `/critique`, `/extract`, `/status`. Invoked when user asks to design, redesign, layout, or improve a UI page or component.
- **Inputs / triggers**: Triggered by "Interface design" rule in copilot-instructions.md. Commands: `/init` (new design), `/audit` (check existing), `/critique` (improve existing), `/extract` (extract patterns), `/status` (system state).
- **Outputs**: Angular component + template + SCSS following craft principles and token architecture. Design system audit/critique reports.
- **Cross-references**: `.claude/skills/cssLayer/SKILL.md`, `.claude/skills/angularComponentStructure/SKILL.md`, `.claude/skills/interface-design/references/`
- **Approx size**: ~392 lines

---

#### interface-design/references/critique.md

- **Path**: `.claude/skills/interface-design/references/critique.md`
- **Stated purpose**: Reference document for the `/critique` command — defines critique dimensions, scoring rubric, and example critique outputs used by the interface-design skill.
- **Inputs / triggers**: Read by interface-design/SKILL.md during `/critique` execution.
- **Outputs**: Used as reference; not directly written.
- **Cross-references**: `.claude/skills/interface-design/SKILL.md`
- **Approx size**: ~40 lines

---

#### interface-design/references/example.md

- **Path**: `.claude/skills/interface-design/references/example.md`
- **Stated purpose**: Worked example of a complete interface-design output — shows a reference implementation of the craft principles applied to a real component.
- **Inputs / triggers**: Read by interface-design/SKILL.md as a reference example.
- **Outputs**: Used as reference; not directly written.
- **Cross-references**: `.claude/skills/interface-design/SKILL.md`
- **Approx size**: ~60 lines

---

#### interface-design/references/principles.md

- **Path**: `.claude/skills/interface-design/references/principles.md`
- **Stated purpose**: Canonical craft principles for interface design — intent-first, domain-appropriate aesthetics, subtle layering, and token discipline. The authoritative source for the skill's design philosophy.
- **Inputs / triggers**: Read by interface-design/SKILL.md during design work.
- **Outputs**: Used as reference; not directly written.
- **Cross-references**: `.claude/skills/interface-design/SKILL.md`
- **Approx size**: ~50 lines

---

#### interface-design/references/validation.md

- **Path**: `.claude/skills/interface-design/references/validation.md`
- **Stated purpose**: Validation checklist specific to interface-design outputs — verifies token usage, craft principles adherence, and component structure before marking design tasks complete.
- **Inputs / triggers**: Read by interface-design/SKILL.md at the verification step.
- **Outputs**: Used as reference; not directly written.
- **Cross-references**: `.claude/skills/interface-design/SKILL.md`, `.claude/instructions/validation-checklist.md`
- **Approx size**: ~30 lines

---

### mp-search/SKILL.md

- **Path**: `.claude/skills/mp-search/SKILL.md`
- **Stated purpose**: Semantic search across all 5,992+ embedded MemPalace drawers. 4-phase protocol: orient (list wings), search (mempalace_search), follow-up (kg_query for entities), synthesize. Notes a known wing-filter bug: do not pass wing filter parameter.
- **Inputs / triggers**: Invoked via `/mp-search <query>` or `/recall <query>` per copilot-instructions.md.
- **Outputs**: Search results from MemPalace printed to conversation, optionally followed by KG entity details.
- **Cross-references**: MemPalace MCP (`mempalace_search`, `mempalace_kg_query`, `mempalace_list_wings`)
- **Approx size**: ~55 lines

---

### nightly-audit/SKILL.md

- **Path**: `.claude/skills/nightly-audit/SKILL.md`
- **Stated purpose**: 8-phase autonomous nightly codebase audit covering 6 categories: (A) Hebrew strings, (B) component duplication, (C) styling/token violations, (D) security surface, (E) dead code, (F) Angular conventions. Auto-fix map for C1/E1/E3/F5.
- **Inputs / triggers**: Loaded by `.claude/commands/nightly-audit.md`. Runs nightly via scheduled automation or `/nightly-audit` command.
- **Outputs**: Audit report at `.claude/reports/audit/YYYY-MM-DD-nightly-audit.md`. Auto-fixes for whitelisted categories. Staging file per `.claude/standards-scheduled-reporting.md`.
- **Cross-references**: `.claude/reports/audit/`, `.claude/standards-angular.md`, `.claude/standards-domain.md`, `.claude/standards-security.md`, `.claude/standards-scheduled-reporting.md`
- **Approx size**: ~180 lines

---

### quick-chat/SKILL.md

- **Path**: `.claude/skills/quick-chat/SKILL.md`
- **Stated purpose**: Bypasses standard planning gates for a fast-path response. Skips github-sync trigger and end-of-session trigger for the current turn only.
- **Inputs / triggers**: Invoked via `/quick-chat` command.
- **Outputs**: Skips github-sync and session-end detection for one turn.
- **Cross-references**: `.claude/skills/github-sync/SKILL.md`, `.claude/skills/end-session/SKILL.md`
- **Approx size**: ~10 lines

---

### save-plan/SKILL.md

- **Path**: `.claude/skills/save-plan/SKILL.md`
- **Stated purpose**: Determines the next plan number (NNN), syncs atomic sub-tasks to `todo.md` first (collision guard), writes `plans/NNN-slug.plan.md`, and calls `mempalace_kg_add` to record the plan in the knowledge graph.
- **Inputs / triggers**: Invoked by execute-it (Step 0) and by the Gatekeeper Protocol Phase 3 ("save the plan" message). Requires a composed plan in context.
- **Outputs**: `plans/NNN-slug.plan.md`, updated `.claude/todo.md`, KG entry via `mempalace_kg_add`.
- **Cross-references**: `plans/`, `.claude/todo.md`, MemPalace MCP (`mempalace_kg_add`)
- **Approx size**: ~60 lines

---

### session-handoff/SKILL.md

- **Path**: `.claude/skills/session-handoff/SKILL.md`
- **Stated purpose**: Redirect stub — session handoff has been absorbed into the end-of-session agent. Exists so existing references don't break. Contains no execution phases.
- **Inputs / triggers**: Triggered by session-end keywords.
- **Outputs**: Delegates to `end-session` skill via Skill tool.
- **Cross-references**: `.claude/skills/end-session/SKILL.md`
- **Approx size**: ~14 lines

---

### techdebt/SKILL.md

- **Path**: `.claude/skills/techdebt/SKILL.md`
- **Stated purpose**: 4-phase tech debt audit — scans for duplicated code, dead code, style debt, and TODO accumulation. Two modes: working-tree (current diff only) and full-project. Retains 7 rolling reports.
- **Inputs / triggers**: Triggered at end-of-session before PR per copilot-instructions.md. Also invoked by end-of-session-agent (phase 3).
- **Outputs**: Tech debt report at `.claude/techdebt-reports/techdebt-YYYY-MM-DD.md`. Deletes oldest report when >7 exist.
- **Cross-references**: `.claude/techdebt-reports/`, `.claude/agents/end-of-session-agent.md`
- **Approx size**: ~90 lines

---

### update-docs/SKILL.md

- **Path**: `.claude/skills/update-docs/SKILL.md`
- **Stated purpose**: Refreshes breadcrumb navigation maps and project docs after feature completion. Runs after any structural change to `pages/` or `src/app/` subtrees.
- **Inputs / triggers**: Triggered "after features" per copilot-instructions.md. Also invoked by end-of-session-agent.
- **Outputs**: Updated `breadcrumbs.md` files at affected seams, updated project-level docs.
- **Cross-references**: `.claude/skills/breadcrumb-navigator/SKILL.md`, `.claude/agents/breadcrumb-navigator.md`
- **Approx size**: ~40 lines

---

### worktree-session-end/SKILL.md

- **Path**: `.claude/skills/worktree-session-end/SKILL.md`
- **Stated purpose**: Closes a worktree session — handles cleanup only. Never runs `git checkout main` from inside the worktree. All PR creation and merges must use `git -C <mainRepoPath>` from root. Agent-managed; called by end-of-session-agent when a worktree session is detected.
- **Inputs / triggers**: Invoked by end-of-session-agent when current working directory is inside a worktree.
- **Outputs**: Cleaned up worktree (stale branches removed, port file cleared).
- **Cross-references**: `.claude/skills/worktree-setup/SKILL.md`, `.claude/agents/end-of-session-agent.md`, `CLAUDE.md` (worktree boundary rule)
- **Approx size**: ~30 lines

---

### worktree-setup/SKILL.md

- **Path**: `.claude/skills/worktree-setup/SKILL.md`
- **Stated purpose**: On-demand provisioning of a git worktree for parallel multi-agent work. Creates worktree outside the main repo, assigns port starting from 4201, writes `.worktree-root` and `.worktree-port` files.
- **Inputs / triggers**: Invoked via `/worktree-setup` on demand — NOT automatic. Only when parallel multi-agent work is explicitly needed.
- **Outputs**: New git worktree directory, `.worktree-root` and `.worktree-port` files.
- **Cross-references**: `CLAUDE.md` (worktree boundary rule), `.claude/skills/worktree-session-end/SKILL.md`
- **Approx size**: ~40 lines

---

### gstack (external)

- **Path**: `~/.claude/skills/gstack/` (outside repo)
- **Stated purpose**: External skill suite providing browser automation, visual QA, safety guardrails, and lifecycle tools. Installed globally in the user's Claude directory. Supplements (does not replace) the repo's own workflow.
- **Inputs / triggers**: Skills invoked via `/browse`, `/qa`, `/qa-only`, `/connect-chrome`, `/setup-browser-cookies`, `/canary`, `/benchmark`, `/review`, `/cso`, `/investigate`, `/ship`, `/land-and-deploy`, `/setup-deploy`, `/document-release`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/retro`, `/gstack-upgrade`, `/design-review`, `/design-shotgun`, `/design-consultation`. Hard rule: ALL browser interaction goes through gstack `/browse` — never call raw Playwright MCP tools directly.
- **Outputs**: Browser snapshots, visual QA reports, deploy artifacts, security audit reports, retrospective files depending on the specific skill invoked.
- **Cross-references**: `CLAUDE.md` (gstack list, hard rule), `.claude/agents/security-officer.md` (`/cso`), `.claude/agents/qa-engineer.md` (`/qa`)
- **Approx size**: Multiple files (external)
