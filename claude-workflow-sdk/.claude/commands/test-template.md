---
description: Score a fix template against its fixture corpus
allowed-tools: Read, Glob, Bash, Agent, Edit
---

# /test-template <slug>

Run every fixture case for the given template and produce a scored report.

## Arguments

- `$ARGUMENTS` — the template slug (e.g. `color-token`, `manual-subscription`)

## Step 1 — Load template

1. Read `.claude/fix-templates/<slug>.md`
2. Parse frontmatter: extract `version`, `last-tested-version`, `last-score`
3. Store the full template content (everything after frontmatter closing `---`) as `TEMPLATE_CONTENT`
4. Print stale-test status:
   - `last-tested-version` is null → `"First test run for this template."`
   - `version` != `last-tested-version` → `"⚠ Template edited since last test (v<last-tested-version> → v<version>). Running fresh."`
   - `version` == `last-tested-version` → `"Re-running v<version> (last score: <last-score>)."`

## Step 2 — Discover cases

1. Glob `.claude/fix-templates/tests/<slug>/cases/*`
2. **Exclude** files ending in `.context.md` — these are context supplements, not cases
3. Sort remaining files alphabetically by filename
4. Print: `"Found <N> cases: <list of names>"`

## Step 3 — Run each case

For each case file, **sequentially** (not parallel):

### 3a — Prepare the fixture

1. Read the case file content
2. **Strip leading comments** — remove all leading lines that are:
   - Block comments: everything from a leading `/*` through `*/` (inclusive)
   - Line comments: lines starting with `//` (after optional whitespace)
   - Empty lines between/after stripped comments
3. The first non-comment, non-empty line becomes the start of `CASE_FILE_CONTENT`
4. If stripping removes ALL content → log a finding to `.claude/fix-templates/findings.md`:
   `"<case-name>: entire file is comments — fixture needs rewrite"` and mark as ERROR
5. **Check for context file**: Read `.claude/fix-templates/tests/<slug>/cases/<case-name>.context.md`
   - If it exists → store its content as `CONTEXT_CONTENT`
   - If it does not exist → `CONTEXT_CONTENT` is empty (no Context section will be added)

### 3b — Spawn subagent

Spawn a fresh Agent (general-purpose) with this **exact prompt** (no additions):

```
You are evaluating a code fixture against a fix template's decision logic.

## Fix Template

<TEMPLATE_CONTENT>

<IF CONTEXT_CONTENT is not empty:>
## Context

<CONTEXT_CONTENT>

<END IF>
## Code Fixture

<CASE_FILE_CONTENT>

## Your Task

Apply the template's DETECT, SCOPE, and DECIDE logic to this fixture.
Determine which decision path the fixture falls into.

IMPORTANT: Do NOT use any tools. Do NOT read files, search the codebase,
or run commands. All information you need is provided in this prompt.
Reason ONLY from the Fix Template and Code Fixture sections above, plus
the Context section if present. If the template asks you to verify
something (e.g. "check if a token exists in styles.scss"), treat the
Context section as the authoritative source. If the Context section
does not contain the information the template asks for, state that
in your reasoning and make your best decision from what IS provided.

Respond with ONLY a JSON object, no markdown fencing, no explanation:
{"path": "<value>", "action": "<one line>", "reasoning": "<1-2 sentences>"}

The path field must be exactly one of the values defined in the template's
DECIDE tree (e.g. "A", "B", "C", "FLAG" for color templates, or "SAFE",
"REAL VIOLATION" for subscription templates). Use the template's own
vocabulary — do not invent path names.
The path field must be a SINGLE SHORT VALUE only — the exact letter or word
from the DECIDE tree (e.g. "A", "B", "C", "FLAG"). Do NOT put step traces,
explanations, or reasoning in the path field. One word or letter only.
```

Where `<TEMPLATE_CONTENT>`, `<CONTEXT_CONTENT>`, and `<CASE_FILE_CONTENT>` are replaced with the actual content. The `## Context` section is only included when a `.context.md` file exists for the case. Nothing else is added to the prompt — no slug name, no fixture set name, no expected path, no case filename.

### 3c — Parse response

1. Take the Agent's returned message
2. Strip markdown code fences if present (triple-backtick json blocks or plain triple-backtick blocks)
3. Try JSON.parse on the cleaned string
4. If parse fails → extract the first substring between `{` and `}` (inclusive), retry parse
5. If still fails → mark as **ERROR**, store `{"result": "error", "raw": "<the full unparseable response>"}`
6. If parsed but `path` field missing → mark as **ERROR**, store `{"result": "error", "raw": "<the parsed object as string>"}`

### 3d — Compare

1. Read `.claude/fix-templates/tests/<slug>/expected/<case-name>.md`
2. Extract the `path:` line value, trim whitespace, uppercase
3. Uppercase the subagent's `path` value
4. Exact string comparison:
   - Match → **PASS** — store `{"path": "<got>", "action": "<got>", "reasoning": "<got>", "result": "pass"}`
   - No match → **FAIL** — store `{"path": "<got>", "action": "<got>", "reasoning": "<got>", "result": "fail", "expected": "<expected>"}`

## Step 4 — Scoreboard

After ALL cases complete, print this exact format:

```
┌─ TEMPLATE TEST: <slug> v<version> ─────────────────────┐
│ Case                  │ Expected │ Got      │ Result    │
│───────────────────────│──────────│──────────│───────────│
│ ambiguous-flag        │ FLAG     │ FLAG     │ ✅ pass   │
│ fff-in-shadow         │ FLAG     │ A        │ ❌ fail   │
│ fff-on-danger         │ A        │ A        │ ✅ pass   │
│ ...                   │          │          │           │
│─────────────────────────────────────────────────────────│
│ Score: 5/6                                              │
│ Failed: fff-in-shadow (expected FLAG, got A)            │
│ Errors: none                                            │
└─────────────────────────────────────────────────────────┘
```

Where `<slug>` and `<version>` are substituted with the real template slug and version number.

If there are errors, list them: `Errors: weird-case (unparseable response)`

## Step 5 — Write history

Append ONE line to `.claude/fix-templates/tests/history.jsonl` (create file if missing).

Use Bash `echo '...' >> .claude/fix-templates/tests/history.jsonl` to append. **NEVER use Edit or Write on this file.**

Line format:

```json
{"timestamp":"<ISO 8601 UTC>","template":"<slug>","version":<N>,"score":"<passed>/<total>","passed":["<case-names>"],"failed":["<case-names>"],"errors":["<case-names>"],"verdicts":{"<case-name>":{"path":"A","action":"...","reasoning":"...","result":"pass"},"<other-case>":{"path":"A","action":"...","reasoning":"...","result":"fail","expected":"FLAG"},"<error-case>":{"result":"error","raw":"<unparseable string>"}},"trigger":"test"}
```

Fields:
- `timestamp` — ISO 8601 UTC
- `template` — the slug
- `version` — template version number at time of test
- `score` — "N/total" string
- `passed` — array of case names that matched
- `failed` — array of case names with wrong path
- `errors` — array of case names where JSON parsing failed
- `verdicts` — object keyed by case name with full subagent response + result + expected (on fail)
- `trigger` — `"test"` for /test-template, `"adversarial"` for /adversarial-template

**This file is APPEND-ONLY.** Never edit or delete existing lines.

## Step 6 — Update template frontmatter

Edit `.claude/fix-templates/<slug>.md` frontmatter fields:
- `last-tested:` → current ISO 8601 UTC timestamp
- `last-tested-version:` → the template's current `version` value
- `last-score:` → the score string (e.g. `"5/6"`)

## Rules

- **Never read expected files before running the subagent** — expected files are loaded only at comparison time (Step 3d)
- **Never commit** — the calling session decides when to commit
- **Run all cases** — never stop on first failure
- **Alphabetical order** — cases processed by filename sort
- **One subagent per case** — fresh context each time, no bleed
- **Strip leading comments from case files** — the subagent sees code only, no metadata comments
