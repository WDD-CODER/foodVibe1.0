# Brief — Improve agent brain recommendations

> Pass this to a planning/smart agent. Goal: every `/ship` / Merge Gate brain proposal extracts **useful** durable knowledge, not a one-line label that duplicates the code.

**Related files today**
- `.claude/commands/ship.md` — Phase 4 “Also proposing a brain entry” + Phase 4.5 brain replies
- `docs/agent/standards-git.md` — Post-push Merge Gate brain block (`"one-line summary"`)
- `docs/brain/how-it-works.md` — what belongs in brain vs todo/session; pattern shape (problem / solution / when)
- Good examples: `docs/brain/patterns/signals-only-state.md`, `docs/brain/patterns/tombstone-soft-delete.md`, `docs/brain/gotchas.md` entries

---

## Problem

Agents are instructed to propose brain capture with a **path + one-line summary**. That format optimizes for a short Merge Gate banner, not for extracting the judgment that made the session expensive.

Concrete failure modes observed (Plan 289 M5 / defer-eager-data session):

1. **Label ≠ lesson** — Proposal was effectively “use `ensureLoaded`”, which is already visible in the diff. Future agents do not learn *when* to defer, *what to audit*, or *what trap looks like success*.
2. **Prompt under-specifies quality** — Ship/standards say “durable decision / pattern / gotcha” but do not require Problem / Solution / When (or What hurt / Why obvious fix wrong / What to do instead). Agents satisfy the letter with a slogan.
3. **Wrong layer chosen** — Session notes (`sessions/`) already hold “what we did.” Brain should hold “what we would rediscover painfully.” Agents often draft the former as a one-liner and call it a pattern.
4. **Traps not separated from patterns** — The login-reload `hasLoaded()` gate was the costly gotcha; the pattern is the happy path. A single thin pattern line buried the trap.
5. **No self-check before propose** — Nothing asks: “Would a future agent, cold on this area, avoid a wrong choice after reading only this entry?” If no → expand or skip.
6. **Banner format trains thinness** — `docs/brain/… — "one-line summary"` in the Merge Gate UI teaches agents that the one-liner *is* the entry, not a title for a fuller draft waiting on `brain approve`.

Net: brain capture feels like busywork; approve/skip becomes vibes-based; the second brain stays sparse relative to real learning.

---

## Solution (direction for the smart agent)

Redesign the **recommendation step** (not necessarily the Human confirm-to-write gate) so agents always draft **full entry bodies** before asking for approve, and only propose when the draft passes a usefulness bar.

Target properties:

| Property | Meaning |
| --- | --- |
| Judgment over syntax | Capture audit rules, exceptions, and traps — not API names alone |
| Right artifact type | Pattern *or* gotcha *or* ADR — split if both apply |
| Match good examples | Same section shape as existing pattern/gotcha files |
| Skip is valid | Prefer `none durable` / skip over hollow entries |
| Banner stays short | Merge Gate can show a one-line **title**; the proposed body is shown or linked for Human review |

Do **not** remove confirm-to-write. Fix *what* is proposed, not Human veto.

---

## Actions (for the smart agent to design / implement)

1. **Rewrite ship + standards-git brain instructions**
   - Require a draft body in the approval tree (not only path + one-liner).
   - Mandate shapes:
     - Pattern → Problem / Solution / When to use
     - Gotcha → What hurt / Why obvious fix wrong / What to do instead
     - Decision → Context / Decision / Consequences (ADR)
   - Explicitly forbid one-liner-only patterns that restate the commit subject.

2. **Add a “usefulness gate” checklist** the ship agent must run before proposing
   - Example checks: Would this change a future wrong default? Is the trap named? Is “when *not* to use” clear? Does session.md already cover this as changelog?
   - If checklist fails → expand draft or omit brain block.

3. **Extract-from-session procedure**
   - Ordered prompts: (a) what surprised us / cost rework, (b) what rule would prevent that, (c) pattern vs gotcha vs ADR, (d) draft full file, (e) one-line title for the banner.
   - Prefer mining `sessions/YYYY-MM-DD.md` “Decisions” + “Reviewer should scrutinize” over inventing slogans from the diff alone.

4. **Dual-proposal when both apply**
   - Allow two lines under BRAIN CAPTURE (pattern + gotcha) in one ship — this session needed both.

5. **Update examples in how-it-works.md**
   - Show a “bad proposal” vs “good proposal” for the same milestone so agents have a few-shot.

6. **Optional: template stubs**
   - `docs/brain/patterns/_TEMPLATE.md` and a gotcha stub referenced by ship.md — only if it reduces empty slogans without encouraging boilerplate filler.

7. **Success criteria for the redesign**
   - Next 3 ships that claim durable learning produce entries a Human would approve without “this feels too thin.”
   - Skips remain common for chores with no new judgment.
   - Brain files stay short (≈ signals-only / tombstone length), not essay-length session dumps.

---

## Out of scope / constraints

- Do not auto-write brain without Human `brain approve`.
- Do not move coding rules into brain (those stay `AGENTS.md` / `docs/agent/`).
- Do not duplicate full plan Done-when lists into brain.
- Keep Merge Gate UX readable on a small terminal — full draft can be a fenced block under the banner, not a novel in the ASCII box.
