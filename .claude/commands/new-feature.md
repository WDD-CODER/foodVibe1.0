---
description: Structured feature scoping — forcing questions, landscape search, premise challenge, forced alternatives — produces a sharp brief for plan-implementation
allowed-tools: Read, Grep, Glob, WebSearch, WebFetch
---

# Skill: new-feature

Structured scoping flow that produces a sharp, evidence-based brief. Does NOT write code — outputs a `brief.md` file that feeds into `/plan-implementation`.

**Announce at start:** "I'm using the new-feature skill to scope this feature before planning."

---

## Phase 0: MemPalace Orient + Prior Work Discovery

1. `mempalace_search(query="<2-3 keywords from description>", limit=5)` — find past decisions, existing patterns
2. Search `plans/` directory: `grep -li "<keyword1>\|<keyword2>" plans/*.plan.md` — find related prior plans
3. If prior work found → present to user:
   ```
   Related prior work found:
   - [plan title / MemPalace result]

   Build on this or start fresh?
   ```
4. If nothing found → proceed silently

---

## Phase 1: Forcing Questions (Scoping)

**Smart routing based on description complexity:**
- **Simple/clear** (specific files, specific behavior, < 3 sentences with concrete details) → ask 1-2 questions max
- **Vague/broad** ("improve the cook view", "add a feature for X") → ask 3-4 questions
- **Fully-formed** (specific files, behaviors, clear scope already stated) → skip ALL questions, go straight to Phase 2

**The questions (ask ONE AT A TIME):**

**Q1 — User Pain:**
"What specific moment frustrates users today without this? Describe the scenario — what are they trying to do and where do they get stuck?"

*Push pattern:* If answer is vague ("it would be nice to have"), push once: "Can you describe a specific time you or a user hit this frustration? What were they doing, what happened, what did they have to do instead?"

**Q2 — Current Workaround:**
"How do users handle this right now — even badly? What's the cost (time, friction, extra clicks, abandonment)?"

*Smart-skip:* If Q1 answer already described the workaround → skip Q2 silently.

**Q3 — Narrowest MVP:**
"What's the absolute smallest version that delivers value? What ONE thing must work for this to be useful?"

*Push pattern:* If answer describes a full feature with multiple parts, push once: "If you could only ship one part of that today, which part would make the biggest difference?"

**Q4 — Assumption Check:**
"What's the riskiest assumption here? What might users do with this that you don't expect?"

*Smart-skip:* If prior answers were specific and evidence-based → skip Q4 silently.

### Escape Hatch (NON-NEGOTIABLE)

At ANY question, user can say "skip", "just do it", "go ahead", or similar:
- **First skip** → "Got it. One more critical question, then I'll proceed." → Ask the ONE most important remaining question → proceed to Phase 2
- **Second skip** → Proceed immediately to Phase 2 with what we have. No more questions.

### Rules
- Q&A format only (§1.1): one question line ending with `?`, then options as `a.` `b.` `c.` when applicable
- ONE question at a time — never batch multiple questions
- Push once, not twice — respects user's time
- Smart-skip is mandatory — if an earlier answer covers a later question, skip it silently
- No sycophancy — don't say "great answer!" or "interesting approach!". Move forward.

---

## Phase 2: Landscape Awareness (WebSearch)

**Purpose:** Check if existing solutions, libraries, or patterns solve this before we build custom.

**When to search:**
- Feature involves a NEW capability (timers, charts, drag-drop, auth pattern, data sync)
- Feature involves a library we haven't used before
- User mentioned "like [some app/product]"

**When to skip (go straight to Phase 3):**
- Feature is purely internal UI layout/styling changes
- Feature is app-specific business logic (recipe scaling, ingredient mapping)
- Feature is a bug fix

**If searching:**
1. `WebSearch` for "[feature keywords] angular library" and "[feature keywords] existing solution 2026"
2. Fetch **2-3 URLs** to build a spectrum of options — aim for variety (different libraries, different approaches)
3. **One attempt per URL** — if a fetch returns 429, is blocked, or is rejected → skip it, move to the next candidate. Never retry the same URL or burn an attempt on an alternative for the same result
4. **Hard cap: 3 fetch attempts total**, counting failures. Stop after the third attempt regardless of how many succeeded
5. Synthesize what you have — even 1-2 successful fetches is enough for a useful spectrum
6. If all fetches failed → note "Landscape search inconclusive" and proceed to Phase 3 silently

**HARD STOP if significant finding:**
```
Landscape search found something relevant:

[summary of finding]

a. Use [library] — covers [X], we build [Y] on top
b. Build custom — [library] doesn't fit because [reason]
c. Investigate further before deciding
```
Wait for user choice. This changes the entire plan.

If nothing significant found → proceed silently to Phase 3.

---

## Phase 3: Premise Challenge

Present 3-4 premises the user must agree/disagree with:

```
PREMISES (agree/disagree with each):

1. [Problem statement derived from Q1-Q4] — is this the right framing?
2. [Scope statement] — this is what we're building, nothing more
3. What existing code partially solves this: [list files/patterns found in codebase scan]
4. If we do nothing, the impact is: [assessment]
```

**HARD STOP:** User must respond to premises. If user disagrees with any premise → revise understanding and re-present. Building on wrong premises wastes everything downstream.

---

## Phase 4: Forced Alternatives

Present 2-3 distinct implementation approaches:

```
APPROACH A: [Minimal Viable] — [1-2 sentences]
  Effort: S/M/L    Risk: Low/Med/High
  Files: [list]     Reuses: [existing code/patterns]

APPROACH B: [Ideal Architecture] — [1-2 sentences]
  Effort: S/M/L    Risk: Low/Med/High
  Files: [list]     Reuses: [existing code/patterns]

APPROACH C: [Creative/Lateral] (optional — only if meaningfully different)
  ...

Recommendation: [X] because [one-line reason]
```

**HARD STOP:** User must pick an approach. Cannot proceed without explicit choice.

---

## Phase 5: Brief Generation

1. Generate session ID: `YYYY-MM-DD-{2-4-word-slug}` (lowercase, hyphens, no special chars)
2. Collision check: If `.claude/sessions/{session-id}/` already exists → append `-2`, `-3`, etc.
3. Write to `.claude/sessions/{session-id}/brief.md` using this template:

```markdown
## Goal
[one sentence — sharpened by forcing questions]

## Scope
### Modified files:
- [file]: [what changes]

### New files (if any):
- [file]: [purpose]

## Out of Scope
[anything explicitly excluded or implied as off-limits]

## Constraints
- [premises from Phase 3 that user agreed to]
- [chosen approach from Phase 4]

## Prior Work
- [MemPalace findings or prior plans from Phase 0, or "None"]

## Success Criteria
- [ ] criterion 1
- [ ] criterion 2

## Session ID
{session-id}
```

4. Print brief verbatim
5. **HARD STOP:** "Brief captured. Confirm or adjust, then say `/plan-implementation` to proceed."

---

## Behavioral Rules

- Total flow should take **2-5 minutes** for a typical feature, not 20 minutes
- **Landscape search budget: max 3 fetch attempts** — aim for 2-3 options (a spectrum), stop hard at 3 attempts whether they succeeded or failed
- **One attempt per URL:** 429, rate-limit, or rejected = skip that URL and move on — never retry the same URL or burn a second attempt chasing the same result
- 3 hard stops total: (1) landscape search finds significant existing solution, (2) premise challenge agree/disagree, (3) choose approach + confirm brief
- Forcing questions are natural conversation turns, not hard stops
- If user provides a complete, specific brief upfront → skip Phases 1-4, go straight to Phase 5
- Use MemPalace for prior work discovery, NOT grep through session handoffs
