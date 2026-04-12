---
description: Generate adversarial test cases to stress-test a fix template
allowed-tools: Read, Glob, Bash, Agent, Edit, Write, Skill
---

# /adversarial-template <slug>

Generate adversarial fixture cases that target gaps in a fix template's DECIDE tree.

## Arguments

- `$ARGUMENTS` — the template slug (e.g. `color-token`, `manual-subscription`)

## Step 1 — Load template

1. Read `.claude/fix-templates/<slug>.md`
2. Parse frontmatter: extract `version`, `applies-to`
3. Store the full template content (everything after frontmatter closing `---`) as `TEMPLATE_CONTENT`

## Step 2 — Snapshot existing scores

<!-- Baseline = the LAST RECORDED score from frontmatter, not a fresh
     run. If the template was edited between the last /test-template
     call and this /adversarial-template call, the baseline may not
     reflect current reality. The Step 2 stale-version warning
     surfaces this — heed it. -->

1. Read the template's `last-score` and `last-tested-version` from frontmatter
2. If `last-tested-version` != `version` → warn: `"⚠ Template has untested changes (v<version> vs last-tested v<last-tested-version>). Consider running /test-template first."`
3. Glob `.claude/fix-templates/tests/<slug>/cases/*` to get the current case list — store as `BASELINE_CASES`
4. If `last-score` is not null, store it as `BASELINE_SCORE` (e.g. "6/6"). Otherwise print `"No baseline score — /test-template has never been run. Adversarial delta detection will be skipped."`

## Step 3 — Generate adversarial cases

Spawn a fresh Agent (general-purpose) with this **exact prompt** (no additions):

```
You are a red-team tester for code fix templates.

## Fix Template

<TEMPLATE_CONTENT>

## Your Task

Generate exactly 3 adversarial test cases — real code fixtures (SCSS or
TypeScript depending on the template's applies-to field) that you believe
would expose gaps, ambiguities, or edge cases in this template's DECIDE
tree.

For each case, respond with a JSON array of 3 objects:
[
  {
    "name": "<short-kebab-case-name>",
    "code": "<the fixture code, no comments>",
    "expected_path": "<the path you believe is correct>",
    "reasoning": "<why this case is hard — what gap or ambiguity it targets>"
  }
]

Rules:
- Each fixture must be valid, compilable code (not pseudocode)
- Each fixture isolates exactly ONE decision — no bundled sub-tests
- Do not include comments in the fixture code — code only
- Name each case descriptively (e.g. "rgba-alpha-half", "nested-var-fallback")
- The expected_path must use the template's own vocabulary
- Focus on cases where the DECIDE tree is ambiguous, has gaps, or could
  reasonably lead to two different paths
```

Where `<TEMPLATE_CONTENT>` is replaced with the actual template content. Nothing else is added — no slug, no existing case names, no hints.

## Step 4 — Parse response

1. Strip markdown code fences if present
2. Parse JSON array from the response
3. If parse fails → try extracting content between `[` and `]`, retry
4. If still fails → print error with raw response, stop

## Step 5 — Per-case human review

For each of the 3 generated cases, **sequentially**:

### 5a — Present the review block

```
┌─ ADVERSARIAL CASE <N>/3: <name> ──────────────────────┐
│ Targets: <reasoning — why this case is hard>          │
│                                                       │
│ Code:                                                 │
│   <the fixture code>                                  │
│                                                       │
│ Subagent's verdict: <expected_path>                   │
│ Subagent's reasoning: <reasoning>                     │
│                                                       │
│ Action:                                               │
│   [add as-is]    — accept code + verdict              │
│   [add, edit]    — accept code, you provide verdict   │
│   [discard]      — skip this case                     │
│   [modify code]  — you edit the code, then verdict    │
└───────────────────────────────────────────────────────┘
```

**Always pause and wait for user response** — regardless of trust mode. Adversarial cases mutate the corpus; every addition requires explicit approval.

### 5b — Handle user action

- **`add as-is`**: Write case file + expected file with subagent's verdict (see Step 6)
- **`add, edit`**: Write case file. Ask user for the correct `path` and `reasoning`. Write expected file with user's values.
- **`discard`**: Skip. Move to next case.
- **`modify code`**: User provides modified fixture code. Ask user for `path` and `reasoning`. Write both files with user's values.

### 5c — Naming

Count existing `adversarial-*` files in `.claude/fix-templates/tests/<slug>/cases/`. Next number = count + 1, zero-padded to 2 digits.

Filename: `adversarial-<NN>-<name>.<ext>`
- `<NN>` = zero-padded counter (01, 02, 03...)
- `<name>` = the subagent's `name` field (kebab-case)
- `<ext>` = `.scss` for color-token, `.ts` for manual-subscription (match template's `applies-to`)

## Step 6 — Write files

For each accepted case:

1. Write case file to `.claude/fix-templates/tests/<slug>/cases/adversarial-<NN>-<name>.<ext>`
   - Content: the fixture code only (no comments, no metadata)

2. Write expected file to `.claude/fix-templates/tests/<slug>/expected/adversarial-<NN>-<name>.md`
   - Content:
     ```
     path: <verdict — from subagent if "add as-is", from user if "add, edit" or "modify code">
     action: <one-line description>
     reasoning: <1-2 sentences — from subagent or user>
     ```

3. Track the list of added filenames as `ADDED_CASES`

If no cases were added (all discarded), print `"No cases added. Corpus unchanged."` and stop.

## Step 7 — Post-add verification with delta detection

After all accepted cases are written:

1. Invoke `/test-template <slug>` (via Skill tool) — this runs the FULL corpus including new adversarial cases
2. After it completes, compute the **delta**:

### Delta computation

Compare the new test results against the baseline:
- `BASELINE_CASES` = the case list from Step 2 (before adversarial additions)
- For each case in `BASELINE_CASES`, check if it still passes in the new run
- For each case in `ADDED_CASES`, check if it passes or fails

Print the delta:

```
┌─ ADVERSARIAL DELTA ────────────────────────────────────┐
│ Baseline score: <BASELINE_SCORE>                       │
│ New score:      <new score>                            │
│                                                        │
│ New cases:                                             │
│   adversarial-01-name  │ <path> │ ✅ pass / ❌ fail    │
│   adversarial-02-name  │ <path> │ ✅ pass / ❌ fail    │
│                                                        │
│ Previously passing, now failing:                       │
│   <none>  OR  <case-name> (was PASS, now FAIL)         │
│                                                        │
│ Corpus integrity: ✅ intact / ⚠ REGRESSION DETECTED    │
└────────────────────────────────────────────────────────┘
```

### Regression handling

If ANY case that was in `BASELINE_CASES` and previously passed now FAILS:

1. **STOP** — do not proceed
2. Print warning:
   ```
   ⚠ CORPUS REGRESSION: <N> previously-passing case(s) now fail.
   This may indicate the new adversarial cases shifted subagent reasoning.
   
   Options:
     [keep]     — leave new cases in corpus, accept the regression
     [rollback] — delete the adversarial cases added this session
   ```
3. Wait for user decision
4. If **rollback**:
   - Delete each file in `ADDED_CASES` (both `cases/` and `expected/` files)
   - Append a rollback entry to `history.jsonl` using Bash `echo '...' >>`:
     ```json
     {"timestamp":"<ISO 8601 UTC>","template":"<slug>","version":<N>,"action":"rollback","rolled_back_cases":["adversarial-01-name","adversarial-02-name"],"reason":"corpus regression — <N> baseline cases broke","trigger":"adversarial"}
     ```
   - Print: `"Rolled back <N> adversarial cases. Corpus restored to baseline."`

**This is the ONE exception to "fixtures are append-only."** Rollback only happens with explicit user consent after a detected regression. The history.jsonl entry is never deleted (append-only invariant holds for the log).

If `BASELINE_SCORE` is null (no prior /test-template run), skip delta detection entirely — just show the raw /test-template results.

### New adversarial cases failing — expected behavior

New adversarial cases failing is **normal and expected** — they were designed to expose gaps. Do NOT treat this as a regression. Only previously-passing cases breaking is a regression.

After a clean delta (no regressions), print:
```
Adversarial run complete. <N> cases added, <M> passed, <K> exposed template gaps.
Review the failures above — they may indicate template improvements needed.
```

## Step 8 — History

The `/test-template` invocation in Step 7 handles its own history.jsonl append with `"trigger": "adversarial"`. No additional history entry needed here unless a rollback occurs (handled in Step 7).

## Rules

- **Always pause per case** — even in auto trust mode, corpus mutations require explicit approval
- **Never commit** — the calling session decides when to commit
- **Human validates expected verdicts** — the subagent's expected_path is a draft, not ground truth
- **Rollback is the only fixture deletion** — and only after user consent on detected regression
- **history.jsonl is append-only** — rollback adds a new entry, never edits existing ones
