---
name: session-handoff
description: Produces a structured session summary so the next session starts with full context instead of cold.
---

# Session Handoff

When the user says "wrap up", "session end", "handoff", or similar, produce a structured summary of the current session and save it. This bridges sessions so the next agent picks up with context, decisions, and gotchas intact.

## When to Use

- User explicitly ends a session or says to wrap up
- Before a long break when the user mentions they are leaving
- When switching to a different major task area

## Workflow

### 1. Gather

Collect from the current session:
- What tasks were worked on (check `.claude/todo.md` for items marked `[x]` during this session)
- What files were changed (`git status`, `git diff --name-only`)
- What branches were created or committed to
- What decisions were made and why (scan conversation for choices, trade-offs, user preferences)
- What is still in progress or blocked
- **GitHub context (MCP-first)**: Call `mcp__github__list_pull_requests` for open PRs and their review status; call `mcp__github__list_pull_request_reviews` for any blocking reviews. Fall back to `gh pr list` if MCP unavailable. Skip silently if neither is available.

### 2. Write

Save to `notes/session-handoffs/YYYY-MM-DD.md` (create directory if needed). If a file for today already exists, append a timestamped section.

### Template

```markdown
# Session Handoff — [Date]

## Completed
- [Task/plan]: [What was done]
- [Task/plan]: [What was done]

## In Progress
- [Task]: [Current state, what remains]
- Uncommitted changes: [list or "none"]
- Active branch: [branch name]

## GitHub Context
- Open PRs: [title, branch, review status — or "none"]
- Blocking reviews: [any PR with changes-requested or pending approval — or "none"]
- Last merged PR: [title, when — or "none this session"]

## Decisions Made
- [Decision]: [Rationale — why this choice over alternatives]

## Test Status
- [PASS ✓ / FAILED ✗ / not run (WIP)] — [brief note if failed]

## Known Issues / Gotchas
- [Issue]: [Context the next session needs]

## Recommended Next Steps
1. [First priority]
2. [Second priority]
```

### 3. End-of-Day Test Gate

Before saving the handoff, run a context-aware test check:

**Detect current branch:**
```bash
git branch --show-current
```

- **If on `main`** → run the full suite automatically (the day's merges should be clean):
  ```bash
  npm test -- --no-watch --browsers=ChromeHeadless
  ```
  Record result in the handoff: `Tests: PASS ✓` or `Tests: FAILED ✗ — [summary of failures]`.

- **If on a feature branch** → ask the user:
  > "Run full test suite before closing? Feature branch may have intentional WIP that fails."
  > a. Yes — run it and record result.
  > b. No — record `Tests: not run (feature branch WIP)` in the handoff.

- **If tests fail**: do not block the handoff. Record the failure, note it in **Known Issues / Gotchas**, and recommend fixing it as the first task next session.

### 4. Confirm

Output: "Session handoff saved to `notes/session-handoffs/YYYY-MM-DD.md`." with a brief summary of what was captured, including the test result.

## At Session Start

When starting a new session, check `notes/session-handoffs/` for the most recent file. If one exists from the last few days, read it to pick up context before starting work.
