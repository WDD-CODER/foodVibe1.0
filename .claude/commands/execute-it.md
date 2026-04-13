@.claude/instructions/validation-checklist.md

---
description: Execute the implementation plan from this conversation
allowed-tools: Read, Write, Edit, Bash
---

# Skill: execute-it

Execute the implementation plan from this conversation, incorporating any findings from plan-implementation verification.

## Step -1 — MemPalace Orient (MANDATORY)

Before executing, orient to existing project context:
1. `mempalace_search(query="<2-3 keywords from the plan being executed>", limit=5)`
2. Review results for existing patterns, past constraints, or known implementations.
3. If MCP unavailable → skip silently.

---

## Step 0: Compose & Save

Before executing, persist the plan so it's tracked in `plans/` and `todo.md`.

1. **Scan the conversation** for three sources:
   - **Session brief** — look for `Session: .claude/sessions/...` in plan-implementation output → read that `brief.md`
   - **Architectural brief** — the handoff from the planning brain (has `## Goal`, `## Steps`, `## Rules`, `## Done when`)
   - **Plan-implementation output** — verification results (✓/✗ items, deviations, gaps, corrections)

   **Session brief fallback:** If no `Session:` path in conversation, scan `.claude/sessions/` for directories matching today's date. If exactly one → use it. If multiple → list and ask user. If none → proceed without brief (existing behavior).
2. **Compose one concise plan** from both:
   - Frontmatter: `name` (from Goal), `overview` (one sentence), `todos: []`, `isProject: false`
   - Body: brief's Goal as heading, brief's Steps merged with every ✗ fix/amendment from plan-implementation as `# Atomic Sub-tasks` (each `[ ] description`), brief's Rules as constraints, brief's "Done when" as verification
3. **Invoke save-plan**: read `.claude/skills/save-plan/SKILL.md` and follow it — handles numbering, `plans/` write, and `todo.md` sync

**Skip Step 0** if no architectural brief is found in conversation — go straight to Step 1.

---

## Workflow

1. **Build the merged execution list** — combine the original brief's steps WITH every ✗ fix, missing method, injection, or deviation flagged during plan-implementation. Treat verified items (✓) as confirmed context.
2. **Execute atomically** — one logical unit per commit
3. **Stop only on NEW surprises** — if you hit something not covered by the brief OR the plan-implementation findings, stop and report. Do not improvise.
4. **Update progress** — mark completed tasks. After each task is marked `[x]`, check if ALL remaining items in that plan's `todo.md` section are now `[x]`. If yes → immediately archive: extract the full `### Plan NNN` block, append to `todo-archive.md` under `## Done`, remove from `todo.md`.

## The Rule: Brief + Verification = Full Plan

The original brief is the base. Anything plan-implementation flagged as ✗ or "needs to be created" is an **amendment to the plan**, not a deviation. Execute both together as one unified task list.

Example: if the brief says "add reload calls for three services" and plan-implementation found that two need the method created first — create the methods, then add the calls. Don't stop to ask.

## Tools Available
- `Read` — examine files before modifying
- `Write` — create new files
- `Edit` — modify existing files
- `Bash` — run commands (build, test, git)

## Execution Rules

- **Read first** — always read a file before editing it
- **No auto-commit** — after all file changes are complete, present a summary of what was changed and ask the user for confirmation before running any `git commit` or `git push`
- **Verify** — after each file change, run diagnostics or build checks if applicable
- **Stop on NEW conflict** — if the code differs from what BOTH the brief and plan-implementation expected, stop and report
- **Backend Impact check** — if the plan includes a `## Backend Impact` section with new collections, verify the new `entityType` key is added to `BACKUP_ENTITY_TYPES` in `async-storage.service.ts` before marking the task done
- **Validation override** — the Smart Visual QA Flow section below overrides the validation-checklist's "ask before anything" timing. Code verification is always automatic. User choice applies only to visual QA.

## Verification-Before-Completion Gate

**Iron law: No completion claims without fresh verification evidence.**

After completing each task in the execution list, BEFORE marking it done:

1. **IDENTIFY** — What command proves this task is done? (`ng build`, test command, diagnostic check)
2. **RUN** — Execute the command. Fresh, complete, not cached.
3. **READ** — Full output. Check exit code. Count failures.
4. **VERIFY** — Does output confirm the task is done?
   - YES → Mark task done, state claim WITH evidence: "Build passes (0 errors, 0 warnings)"
   - NO → Fix the issue (using systematic-debugging if needed), re-run, re-verify

**Red flags (STOP if you catch yourself thinking these):**
- "Should work now" → RUN the verification
- "I'm confident" → Confidence is not evidence
- "Linter passed so build passes" → Linter is not compiler. Run the build.
- "Just this once" → No exceptions

**Minimum verification per task:**
- Any `.ts` change → `ng build` must pass (or `getDiagnostics` if available)
- Any `.html` template change → `ng build` must pass
- Any `.scss` change → `ng build` must pass
- Logic change → relevant test must pass (if test exists)

## Systematic-Debugging Protocol

When verification fails or a bug is encountered during execution, follow this protocol BEFORE attempting any fix:

### Phase 1: Root Cause Investigation (MANDATORY before any fix attempt)
1. **Read error messages carefully** — full stack traces, line numbers, error codes
2. **Check what changed** — `git diff` against last known-good state
3. **Trace data flow** — where does the bad value originate? Trace backward through call stack

### Phase 2: Hypothesis
1. State clearly: "I think [X] is the root cause because [Y]"
2. Make the SMALLEST possible change to test the hypothesis
3. ONE variable at a time — don't fix multiple things at once

### Phase 3: Verify Fix
1. Run the same verification that failed
2. If PASS → continue execution
3. If FAIL → form NEW hypothesis, don't pile fixes

### Phase 4: Escalation (3-fix rule)
If 3 fix attempts have failed:
- **STOP** — do not attempt fix #4
- Report to user: what was tried, what failed, what the root cause might be
- Ask for guidance before continuing

**Never:** guess-and-check, add multiple fixes at once, skip error messages, say "it should work now" without running verification.

## Smart Visual QA Flow

The validation-checklist instruction (`@.claude/instructions/validation-checklist.md`) asks "verify / I'll check?" at task start. This section OVERRIDES that timing for tasks that include UI changes:

**New flow for UI-touching tasks:**
1. Execute the task normally
2. Run verification-before-completion gate (build/test) — this is AUTOMATIC, no user choice
3. If verification PASSES and the task touched `.html`, `.scss`, or template files:
   - Show the validation checklist with evidence: "Build passed (0 errors)"
   - Ask: "Code verification passed. Want me to also check the UI visually (/qa), or will you check it?"
   - If user says "verify" or "qa" → run `/qa` on the relevant page
   - If user says "I'll check" → stop, show checklist
4. If verification PASSES and the task is backend/logic only (no UI files):
   - Show validation checklist with evidence
   - Do NOT offer visual QA (no UI to check)
   - Stop and wait

**Key change:** Code verification (build/test) is NEVER optional — it always runs automatically. The user choice is ONLY about visual/browser QA.

## Output

When complete:
```
✓ Execution complete
- Session: .claude/sessions/{session-id} (or "no session brief")
- Plan saved: plans/NNN-slug.plan.md (or "skipped — no brief found")
- Brief tasks: [N completed]
- Plan-implementation fixes: [N incorporated]
- Files modified: [list]
- How to verify: [steps/checks]
- Success criteria:
  - [x] criterion (verified by build/test)
  - [ ] criterion (not yet verified — needs manual check)
```