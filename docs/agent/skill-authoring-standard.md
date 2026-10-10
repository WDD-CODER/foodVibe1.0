# Skill Authoring Standard — FoodVibe 1.0

Written 2026-10-10 from Anthropic's current documentation. Load this before creating or
rewriting any `SKILL.md`. Part 1 is the standard; Part 2 is the audit of our 14 skills and
the upgrade plan derived from it.

Sources (verified 2026-10-10):

- Platform: *Skill authoring best practices* — https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- Claude Code: *Skills* reference — https://code.claude.com/docs/en/skills
- Engineering post: *Equipping agents for the real world with Agent Skills* — https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
- Open standard + eval workflow: https://agentskills.io/skill-creation/evaluating-skills
- Anthropic's own `skill-creator` skill (bundled in claude.ai / Claude Code)

---

## Part 1 — The standard

### 1. How a skill is actually loaded (this drives every rule below)

Three levels, each paid for separately:

| Level | What loads | When | Cost |
| --- | --- | --- | --- |
| 1 — metadata | `name` + `description` (+ `when_to_use`) | Every turn, every skill | ~1% of the context window is the whole listing budget. When it overflows, Claude Code **drops descriptions** starting with the least-used skills — the skill still exists but Claude can no longer match it. |
| 2 — body | `SKILL.md` body | When Claude decides the skill applies, or on `/name` | Stays in the conversation as one message; **not re-read on later turns**. After compaction only the **top ≤5,000 tokens** per skill survive (25k across all). |
| 3 — resources | files under the skill folder | Only when SKILL.md points to them | Zero until read. Scripts run without being read at all. |

Consequences:

- The description is the *only* thing that decides triggering. Body text about "Trigger:" is invisible until after triggering — it is wasted.
- Put the most important instructions at the **top** of the body; the bottom is what compaction cuts.
- Write **standing** instructions ("run the tests after every edit"), not one-time steps, because the body is not re-read.
- Every paragraph in the body competes with the conversation. "Claude is already very smart. Only add context Claude doesn't already have." Challenge each paragraph: does it justify its token cost?

### 2. Frontmatter

Required (open standard):

- `name` — ≤64 chars, lowercase letters/digits/hyphens only. Preferred form: gerund (`processing-pdfs`) or action (`save-plan`). Must equal the folder name. No `claude`/`anthropic`.
- `description` — non-empty, ≤1,024 chars. **Third person.** Says *what it does* **and** *when to use it*, key use case first. Include the literal words a user would say. Anthropic's current advice: be a little "pushy" (Claude under-triggers), e.g. "Use whenever the user mentions X, Y or Z, even if they don't say 'skill'."

Claude Code extensions worth using (ignored harmlessly elsewhere; **not** allowed in claude.ai-uploaded skills):

| Field | Use it when |
| --- | --- |
| `when_to_use` | Extra trigger phrases; appended to description. Combined cap 1,536 chars in the listing. |
| `disable-model-invocation: true` | The skill has side effects (git push, deletes, deploys, provisioning). Only `/name` runs it; the description leaves the listing (saves budget). |
| `user-invocable: false` | Pure background knowledge/rules Claude should apply but nobody would type as a command. Hidden from the `/` menu, description kept. |
| `allowed-tools` | Pre-approve the bundled script or the exact git commands so the skill runs without prompts: `Bash(node scripts/x.mjs *)`. |
| `paths` | Glob list — the skill auto-activates only when Claude touches matching files (`src/**/*.scss`). Ideal for file-type rules. |
| `context: fork` + `agent:` | Run as a subagent with its own context. Needs an explicit task, not guidelines. |
| `model`, `effort` | Per-skill model/effort override. Replaces prose like "use Haiku for phase 1". |
| `hooks` | A rule that must hold *every time* (e.g. a pre-commit grep) goes in a hook, not in prose — Claude Code runs hooks whether or not Claude is "following" the skill. |
| `argument-hint`, `arguments` | For `/name <args>` skills; use `$ARGUMENTS`, `$0`, `$name`. |
| `shell: powershell` | For `` !`cmd` `` dynamic injection on Windows when bash isn't wanted. |

Hard mechanics:

- `---` must be the **first bytes of the file**. A UTF-8 BOM or blank line before it means the frontmatter may fail to parse — the body still loads but with no fields, so Claude cannot match the description.
- Unknown fields are ignored; typos in field names are silent.
- `claude plugin validate .claude/skills` finds skills whose frontmatter does not parse.

### 3. Body

- ≤500 lines. Approaching it → move material to a referenced file.
- Imperative voice. Consistent terminology (pick one word per concept).
- **Explain the why** instead of stacking MUST/NEVER/ALWAYS. Models follow reasoned instructions more reliably; all-caps rigidity is a yellow flag in Anthropic's own guidance. Escalate to stronger wording only after observing the model skip a rule.
- **Degrees of freedom** match fragility: open-ended judgement → heuristics/checklist; preferred pattern → pseudocode/parameterised script; fragile sequence → exact command, "do not add flags".
- Give a **default with an escape hatch**, not a menu of alternatives.
- **Examples** (input → output pairs) beat descriptions for format and tone.
- Strict template when the output is consumed by a machine or another agent; flexible template otherwise.
- No time-sensitive text ("before August…", "retired X", "Section 0.3 of the Master Instructions"). Stale references are the most common rot in long-lived skills.
- Forward slashes in paths. Fully qualified MCP tool names (`Server:tool`).

### 4. Bundled resources (progressive disclosure)

```
skill-name/
├── SKILL.md            overview + navigation ("for X see reference/x.md")
├── reference/          loaded only when needed; TOC at top if >100 lines
├── scripts/            executed, not read — deterministic work
└── evals/evals.json    test prompts + assertions
```

- References **one level deep** only; say when to read each one.
- **Prefer scripts for deterministic operations** — more reliable than generated code, saves tokens, consistent. Be explicit: "Run `scripts/x.mjs`" (execute) vs "See `scripts/x.mjs`" (read).
- Scripts solve, they don't defer: handle errors, make validation errors actionable (name the field, list what exists), document every constant ("30 s — typical HTTP completion").
- State dependencies and install commands; don't assume packages exist.

### 5. Workflows and feedback loops

- Complex operations → numbered sequential steps; very complex → a **checklist Claude copies into its reply and ticks**. This prevents skipped validation.
- Quality-critical work → an explicit loop: run validator → fix → re-run → **only proceed when it passes**.
- Batch/destructive work → plan-validate-execute: write a plan file, validate it with a script, then apply, then verify.
- Conditional workflows: "Creating? → section A. Editing? → section B", large branches in separate files.

### 6. Testing — what "better execution, precise, accurate" means in practice

Anthropic's position: **build evals before writing extensive docs.**

1. Run Claude on 2–3 representative tasks *without* the skill; note what it gets wrong.
2. Write the minimal skill that fixes those gaps.
3. Run the same prompts with the skill (and, when revising, against the **old version** as baseline). Fresh context per run (subagent or new session).
4. Add **assertions** after seeing the first outputs: objectively checkable ("file X exists", "no `.c-*` selector in component scss", "exit code 0"), not "output is good". Use scripts for mechanical checks.
5. Grade with evidence, aggregate pass-rate / tokens / time, and look at: assertions that always pass (delete), always fail (fix the assertion or the task), pass-only-with-skill (that's the value), high variance (ambiguous instruction → add an example).
6. Human review of the actual outputs; iterate; stop when feedback is empty.
7. Test with every model the skill will run under. Haiku needs more guidance than Opus.
8. Watch navigation: files read repeatedly → inline them; never read → delete or signal better.

Tooling: the `skill-creator` skill automates runs/grading/benchmark/viewer. `claude plugin eval` (Claude Code ≥2.1.233) runs `evals.json` suites with a `tool_used: Skill` grader to measure triggering. `/skill-doctor` reports listing cost and unused skills.

### 7. Pre-share checklist

- [ ] `---` is byte 0; `name` = folder; description third-person, what + when, trigger words, ≤1,024 chars
- [ ] Side effects → `disable-model-invocation: true`; file-scoped rules → `paths`; must-always rules → `hooks`
- [ ] Body ≤500 lines, most important rules first, standing instructions, why > MUST
- [ ] One default per decision; examples for formats; no stale/time-bound references
- [ ] Deterministic steps are scripts with error handling; references one level deep with TOC
- [ ] Validation loop for anything quality-critical
- [ ] `evals/evals.json` with ≥3 prompts + assertions; baseline vs skill run at least once
- [ ] `claude plugin validate .claude/skills` passes

---

## Part 2 — Audit of FoodVibe's 14 skills (2026-10-10, `main` @ f739e9a)

### Cross-cutting findings

| # | Finding | Skills affected | Why it matters |
| --- | --- | --- | --- |
| F1 | **UTF-8 BOM before `---`** | angular-pipe-logic, auth-and-logging, auth-crypto, brief-detection, elegant-fix, github-sync, techdebt, update-docs (+10 command files) | Docs: `---` must be the first line. Parse failure = no description = no triggering. Zero-cost fix. |
| F2 | **Mojibake** (`â€”`, `âœ“`, `â†‘`) from double-encoding | auth-crypto, update-docs, github-sync, techdebt (+6 commands) | Garbage tokens; `âœ“` is printed literally into logs. |
| F3 | **Trigger info lives in the body** (`**Trigger:** …`), not in `description` | all 12 phase-style skills | Body is invisible until after triggering. Descriptions are 73–150 chars of 1,024 available and name no user phrases. |
| F4 | **"Model Guidance: Haiku/Flash for Phase 1, Sonnet for Phase 2"** prose | 10 skills | Legacy from the Cursor multi-model era. Claude Code cannot switch model mid-skill from prose; the correct mechanism is `model:`/`effort:` frontmatter (whole skill) — or nothing. Pure token cost today. |
| F5 | **Stale references**: `commit-to-github Phase 0` (retired command), "Section 4 of the Master Instructions", "Section 0.3", "pre-commit security grep + CI agent", `mcp__github__list_pull_requests` (GitHub MCP is disabled in settings), `~/.cursor/plans/` | angular-pipe-logic, angularComponentStructure, update-docs, auth-and-logging, auth-crypto, github-sync, techdebt, save-plan | Anthropic lists time-sensitive/stale references as a top anti-pattern; each one is a dead-end Claude has to resolve on its own. |
| F6 | **Rules duplicated** from AGENTS.md / `docs/agent/standards-*.md` ("inline — no guide read required") | angularComponentStructure, cssLayer, elegant-fix, techdebt, auth-and-logging | Two sources drift (they already have: cssLayer adds a token rule AGENTS.md lacks). Keep the rule where the trigger table points, or make the skill the single owner and strip AGENTS.md. |
| F7 | **Side-effecting skills are model-invocable** | github-sync (`git push --delete`, stash/pop), worktree-setup (`git worktree add`, `npm install`), techdebt (deletes reports, edits todo.md), save-plan (commit+push to main) | Docs recommend `disable-model-invocation: true` for exactly these; it also removes their descriptions from the per-turn budget. |
| F8 | **Deterministic steps written as prose** (rolling 7-report retention, date math, once-per-day gate, breadcrumb seam check, preflight curl/mongosh) | techdebt, github-sync, breadcrumb-navigator, update-docs, preflight | "Prefer scripts for deterministic operations." Prose retention logic is re-derived every run and already has two conflicting descriptions inside techdebt itself. |
| F9 | **No `paths` on file-type skills** | cssLayer (`src/**/*.scss`), angularComponentStructure (`**/*.component.ts`), angular-pipe-logic (`**/*.pipe.ts`, `**/*.directive.ts`), auth-crypto (`src/app/core/auth-crypto.ts`) | `paths` is the precise trigger for "before any `.scss` edit"; the AGENTS.md trigger table is a weaker, text-only substitute. |
| F10 | **No evals** for any skill | all | No way to know whether a rewrite is better. This is what the "evaluate the diff" request needs. |
| F11 | **Completion-gate strings are fake-precise** (`"Component [Name] created with [X] signals…"`) | 9 skills | Output templates are fine when another agent/script parses them; nothing parses these. They cost tokens and encourage reporting over verifying. |
| F12 | gstack `/browse` still referenced; Playwright MCP allowed in settings | preflight, AGENTS.md | Open item from 2026-09-30; decide, then make preflight match. |

### Per-skill verdict

| Skill | Lines | Keep / Rewrite | Main changes |
| --- | --- | --- | --- |
| angular-pipe-logic | 64 | Rewrite | BOM; description + `paths`; drop model prose, phases 1–3 collapse to a checklist + one example; remove `commit-to-github` ref |
| angularComponentStructure | 72 | Rewrite (rename? keep) | Description + `paths`; section-order rule as a code example (input→output); drop duplicated AGENTS.md rules; `user-invocable: false` |
| auth-and-logging | 63 | Rewrite | BOM; description with trigger words; replace "security grep + CI agent" with the real command/hook; checklist |
| auth-crypto | 52 | Rewrite | BOM + mojibake; `paths: src/app/core/auth-crypto.ts`; move the pre-commit grep into `hooks` or `scripts/`; keep rules, drop phases |
| breadcrumb-navigator | 55 | Rewrite + script | Seam list and "every file must exist" check → `scripts/breadcrumb-check.mjs`; description |
| brief-detection | 91 | Light edit | BOM; already well structured; `user-invocable: false`; description with the H2 marker words |
| cssLayer | 65 | Rewrite | `paths: src/**/*.scss`; keep five-group rhythm as an example block; token rule stays (it's the single owner); validation loop (`grep` for `.c-` in component scss) |
| elegant-fix | 66 | Rewrite | BOM; description with user phrases ("hacky", "not ideal", "duplicate"); drop rules duplicated from AGENTS.md |
| github-sync | 64 | Rewrite + script | BOM + mojibake; `disable-model-invocation: true`; once-per-day gate + cleanup → `scripts/github-sync.mjs`; drop GitHub MCP ref |
| preflight | 23 | Script | Already minimal; turn the 4 checks into `scripts/preflight.mjs` with `allowed-tools`; decide gstack |
| save-plan | 189 | Restructure | Largest and most load-bearing. Keep content, reorder: Phase 0–3 core first, Phase 4 (mid-flight sync) → `reference/mid-flight-sync.md`; `disable-model-invocation: true`; `allowed-tools` for the 4 scripts; evals |
| techdebt | 145 | Rewrite + script | BOM + mojibake; retention/trend → `scripts/techdebt-report.mjs`; remove duplicated retention text; drop `commit-to-github` |
| update-docs | 52 | Merge candidate | Overlaps breadcrumb-navigator ~70%. Propose: fold into breadcrumb-navigator (one skill, two modes) — needs Dandan's decision |
| worktree-setup | 73 | Light edit | `disable-model-invocation: true`; Phase 1 legacy migration → "old patterns" collapsed section or delete |

### Upgrade method (so the change can be evaluated, not just read)

1. Snapshot: `.claude/skills/` copied to `<workspace>/skill-snapshot/` before any edit.
2. Write v2 skills. Each gets `evals/evals.json` with 2–3 realistic prompts + assertions.
3. For the 3 highest-value skills (cssLayer, angularComponentStructure, save-plan), run each prompt twice in fresh subagents — once with the snapshot (`old_skill`), once with v2 (`with_skill`) — grade, aggregate, and produce the review viewer (`generate_review.py --static`).
4. Deliver: unified diff per skill + a one-paragraph rationale per diff, the benchmark table, and the viewer HTML.
5. Kit rule: skills are kit-owned → land the change in `ai-workflow-kit` first, then patch into FoodVibe on a `chore/` branch (ADR 0018).
