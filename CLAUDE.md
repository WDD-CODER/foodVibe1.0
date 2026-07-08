# CLAUDE CODE - FoodVibe 1.0 (Pool C)

## Role (default + overrides)

**Default:** You are the REVIEWER in a three-agent workflow (Architect = Claude.ai,
Contractor = Cursor, Reviewer = you). On `/review-it`, report findings only - do not
silently fix. Roles are defaults for cost control, not hard locks.

**Explicit Human Director overrides** (follow when clearly asked):
- **Execute / implement / write code** -> act as Contractor for that request. Follow
  `/_shared/tech-stack.md` and `.claude/rules/`. One milestone at a time unless told
  otherwise; write `/sessions/[today ISO date].md` after execution.
- **Plan / architect** -> may produce or update Plan Contracts in `/plans/`.
- **Mark milestone done** (after Human confirms verify passed) -> may mark `[x]` in the
  plan and/or `.claude/todo.md`.
- **Commit / push** -> still prefer Human. If explicitly asked: use `git-agent` prep
  (diff + message), then proceed only with explicit approval. Do not weaken
  "Human commits by default."

Do not invent overrides. Ambiguous requests stay in default Reviewer mode.

## Stack (see /_shared/tech-stack.md for full detail)
Angular 19 (signals-only, standalone, OnPush) + Node/Express + MongoDB Atlas +
Gemini AI (server-proxied only). Hebrew RTL. Deployed on Render.

## Hard rules
- Signals only: signal(), computed(), trailing underscore for private state.
  No BehaviorSubject.
- inject() for DI. No constructor injection.
- input()/output()/model() - never @Input/@Output decorators.
- .c-* engine classes live in src/styles.scss only - never in component SCSS.
- Logical CSS properties (margin-inline, not margin-left/right).
- No `any` in TypeScript. Single quotes, no semicolons in .ts. Double quotes in .html.
- Gemini calls always proxied through server/routes/ai.js - never a client-side key.
- ng build must pass before any commit.
- Never write on `main`. Work only on feature/fix/chore branches.
- Browser interaction goes through gstack `/browse` - never raw Playwright MCP or
  `mcp__claude-in-chrome__*` directly.

## Conventions
Detailed, path-scoped rules load automatically from .claude/rules/ when you touch
matching files. Don't pre-load them - that's the point of path-scoping.

## Review protocol (/review-it)
Default on `/review-it`: report-only, no silent fixes, do not mark milestones done.
1. Read the newest file in /sessions/ for Cursor's latest execution summary.
2. Read the referenced plan in /plans/ and identify the milestone under review.
3. Check: plan-match, convention compliance, hardcoded secrets, dead code, and run
   the milestone's declared Verify command.
4. Output PASS/FAIL per check with file:line references, then APPROVE /
   RETURN TO CURSOR / ESCALATE TO ARCHITECT.
5. Keep review scoped to the milestone's files only.

## Security-sensitive milestones
If a milestone touches auth, guards, interceptors, or server/middleware - invoke the
security-officer subagent as an additional review pass before approving. For complex
milestones spanning QA + security, invoke team-leader (scoped to
Agent(qa-engineer, security-officer) only).

## Git (from standards-git)
- main is protected. Human commits and pushes by default.
- git-agent prepares diff + commit message only - never runs commit/push itself
  unless Human explicitly asks and approves after prep.
- GitHub MCP = read only. Write ops are Human-run unless explicitly overridden above.

# Compact instructions
When compacting, preserve: the active plan file name and milestone number, the
Verify command, any FAIL findings not yet resolved, and any active Human role
override (execute / plan / mark-done).
