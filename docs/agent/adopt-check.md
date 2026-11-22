# Adopt Check — look for an existing package before building a new capability

Read by the Planner in `/plan`'s Architect + PM review when `node scripts/scope-check.mjs --adopt --plan=<path>` reports
a trigger. Planning side only: the orchestrator, builders, reviewers, `/take-plan` and `/ship` never search.

## When it triggers

After `## Reuse Check` is filled, the plan has:

- a Reuse Check row at rung 4 (a new family), or
- a `package.json` in its `## Read-Write Scope` (a possible new runtime dependency).

Rungs 1–3, bug fixes, refactors and server-only changes with no new piece trigger nothing: the gate prints
`ADOPT: ok none` and no search runs. The Human can force a search on any idea, at any rung, by writing `adopt?` next
to it.

## The section

One row per triggering capability, right after `## Reuse Check`:

```markdown
## Adopt Check
- Date range picker — candidate: litepicker — considered: flatpickr — verdict: wrap — license: MIT — why: maintained, 9 kB, no peers
- Shop opening rules — verdict: skip — why: our own business rules; no package knows them
- none — why: package.json in scope for a script only, no new package
```

- `verdict:` is `adopt` (use it as is), `wrap` (use it behind our own wrapper), `build` (compared, build our own) or
  `skip` (domain logic: no search is run).
- `candidate:` is the package picked or compared; `considered:` names at most 2 more (3 candidates in all).
- A GPL, AGPL or unknown licence on an `adopt` or `wrap` row also needs `license-ok: Human YYYY-MM-DD`, written only
  after the Human's explicit yes in chat.

## The procedure (cheapest first)

1. **Section already filled** (a plan drafted in Claude.ai or another tool): no web search. Run
   `node scripts/adopt-facts.mjs --pkg=<its candidates>` and correct any row the facts contradict (a `fixed:` line).
2. **Section empty and triggered:** for each triggering capability:
   - Domain logic no package could know → a `skip` row (no search).
   - Read every `docs/agent/known-good-*.md`. A listed package that does the job → no search; run `adopt-facts.mjs`
     on it and write the row.
   - Otherwise one search round, at most 3 candidates, then `node scripts/adopt-facts.mjs --pkg=<a>,<b>,<c>`, then
     the row.
3. Facts come from `adopt-facts.mjs`, never from memory or a search snippet. A `FAIL` line (no release in 12 months,
   a GPL / AGPL / unknown licence, not on the registry) rules the candidate out unless the Human says yes in chat.
   `ADOPT_FACTS: skipped — network`: write the row from the known-good list or as `build`, say in the review that the
   facts were not checked, and do not retry.
4. Every `adopt` or `wrap` verdict is one `open:` line in the review with the recommendation — it adds a new
   dependency, which needs the Human's approval in the Plan Contract (`_shared/tech-stack.md`).
5. An `adopt` or `wrap` verdict also adds a Reuse Check row for the wrapper and a family entry in the registry
   (`docs/agent/standards-reuse.md`, "An adopted package"): pages never import the package directly.
6. After the Human approves a package in a project, offer `/kit-feedback` to add it to that stack pack's known-good
   list, so the next project finds it without a search.

## Cost

No trigger: seconds. `skip`: one row. Known-good hit: one `adopt-facts.mjs` call. Full search: one round per
capability, at most 3 candidates.
