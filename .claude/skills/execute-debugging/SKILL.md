---
name: execute-debugging
description: Systematic-Debugging Protocol and Verification-Before-Completion Gate extracted from execute-it
---

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
