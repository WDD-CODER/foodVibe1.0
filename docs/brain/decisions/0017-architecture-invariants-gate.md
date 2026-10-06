---
status: accepted
date: 2026-10-06
review-by: 2027-04-06
---

# 0017. Load-bearing architecture rules live in a checked registry, not only in prose ADRs

## Context

On 2026-10-05 a core rule broke without the Human noticing. ADR 0008 D1 locks "shared master +
per-user overrides". Plan 321 P3.4 then removed users' own copies of the default metadata
with no override in place. A mid-execution question ("shared terms admin-only?") was answered
and recorded only as a "Human decision" line in a session-state file, the commit message and
the plan tick. Nothing said the answer contradicted D1, or that regular users would lose
create/edit/delete on every default list.

The rules existed, but only as prose ADRs, and checking them was left to each agent's
judgment ("read `decisions/` *if* it's an architectural choice"). No template section, script,
question rule or test enforced them. Rejected alternatives:

- **"Read the ADRs more carefully" (more prose in AGENTS.md):** that is exactly what failed. Judgment
  calls get skipped under pressure, and a Human answering a narrow question can't see an ADR
  they aren't shown.
- **Turning every ADR into a check:** most ADRs are workflow choices (0001, 0009, 0014, 0015) with no
  runtime behavior to break. Checking them adds noise and no protection.
- **Only CI tests:** tests catch broken behavior after the code is written, but not a plan or
  question that sets out to break a rule.

## Decision

Four layers, each catching what the one before misses:

1. **Registry:** `docs/brain/invariants.md` lists only the load-bearing runtime rules (INV-1…6), each with
   the files it `Touches`, what users lose if it breaks, and its test. ADRs keep the reasoning.
2. **Plan section:** every plan has `## Architecture Impact`, one line per touched invariant:
   `preserves`, `deviation until …`, or `changes — ADR …`. A deviation or change needs
   `Arch-approved: Human YYYY-MM-DD`, written only after the Human's explicit
   `approve arch change INV-n` in chat. Questions that could break an invariant are asked as
   INV-n · current rule · proposed change · who loses what.
3. **Mechanical gate:** `scope-check.mjs --arch --plan` blocks saving/taking a plan whose scope
   touches an invariant with no entry, or whose deviation/change is unapproved;
   `--arch --diff` warns at `/ship` and `/review-it` about touched invariants the plan doesn't cover
   and about "Human decision" notes that name no INV/ADR. Plans numbered below
   `Enforced from plan:` without the section are grandfathered.
4. **Invariant tests:** `server/test/invariants.test.js`, test names prefixed `INV-n`, so CI fails
   by rule name when INV-1/2/4 behavior breaks.

## Consequences

- Easier: a Human sees "INV-2, users lose X" before saying yes, and a wrong yes still needs an ADR.
- Harder: every plan carries one more section; a plan that only brushes a `Touches` glob still
  needs a `preserves` line.
- Accepted: `Touches` globs are a proxy — a change outside them can still break a rule. The tests are
  the backstop for INV-1/2/4; INV-3/5/6 rely on the gate only for now.
- Accepted: the gate scripts are workflow-kit files (ADR 0015), so they change kit-first.
- Re-evaluate if plans start filling `INV-none` by reflex, or if the warn-only diff check gets ignored.

## Review

Count plans since 388 with a `deviation`/`changes` line and check each has a superseding ADR.
Check whether any invariant broke in a way the gate or tests should have caught, and whether
the `Touches` globs still match where the code lives.
