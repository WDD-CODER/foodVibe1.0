# Plan 294 — Second Brain Reuse Instrumentation & Founding-Entry Cleanup

## Goal

Turn the `docs/brain/` value audit's recommendations into disk changes: make brain-entry
*reuse* visible (not just writes), re-audit the 4 founding entries against the usefulness
gate the project adopted after they were written, and put growth/escalation guardrails in
place before they're needed.

## Author / role

Architect pass (Claude Code, Human-directed override). Contractor = Cursor. Executes
**one milestone at a time**, writes `sessions/[date].md` after each, stops for
`/review-it`. Doc-only changes — no product code touched, so a dedicated
`chore/brain-reuse-instrumentation` branch (separate from `chore/plan-persistence-hardening`,
which is Plan 291's branch) is the right isolation.

## Problem statement (evidence)

From the second-brain value audit (this session, see `sessions/[date].md` for the full
report):

1. **No "read" signal exists, only "write" signal.** Every observable brain-related event
   in git history is an entry being written; nothing records an agent citing an entry
   *before* a decision, except one case (M3 below) buried in ADR prose. There is no
   grep-able way to tell "the brain changed a decision" from "the agent got it right
   anyway" — which is the exact question a Human would ask when judging whether the
   system pays for itself.
2. **The one real reuse example is under-formalized.**
   `docs/brain/decisions/0005-scope-npm-audit-to-production-deps.md` cites
   `docs/brain/gotchas.md`'s `npm audit fix --force` entry by name in its "Alternatives
   considered" prose — that's a real citation, but it's free-text inside an ADR, not a
   convention any script or future audit can find without re-reading every brain file.
3. **3 of 4 founding patterns predate the project's own usefulness gate.**
   `docs/brain/patterns/gemini-backend-proxy.md`, `signals-only-state.md`, and
   `tombstone-soft-delete.md` were all written in the bulk-founding commit (`b4a4bb8`,
   2026-07-12) — two days *before* ADR 0004 (2026-07-14) required every brain entry to
   clear a usefulness gate ("would this change a future agent's wrong default? If it
   only describes what we did, skip"). All three explicitly self-describe as recording
   "the why, not the checklist" for a rule that already lives in `AGENTS.md` — borderline
   against a gate they were never checked against.
4. **`gotchas.md` has no growth plan.** It's append-only, never-delete, single flat file
   by design (`docs/brain/gotchas.md:3`). 7 entries / ~124 lines after 8 days is fine;
   nothing on disk says when that stops being a cheap single-file read.
5. **The save-plan bypass gotcha chain already has good practice worth generalizing.**
   `docs/brain/gotchas.md`'s "Existing save-plan mitigations still let a plan skip
   `plans/`" entry already cross-links its structural fix
   (`plans/291-plan-persistence-brief-sync-hardening.plan.md`) — this plan does not
   restate that structural fix, but nothing states the
   general policy this instance illustrates: when the *same* documented gate gets
   bypassed a second time via a new path, that's a signal the fix needs to be structural
   (fewer valid paths), not another gotcha restating the instruction more forcefully.

## Non-goals / out of scope

- **Not re-fixing the `_v[N]` plan-path convention fork** — that's already
  `plans/291-plan-persistence-brief-sync-hardening.plan.md` Milestone 3, currently open.
  This plan does not touch `.claude/commands/plan.md` / `feat.md`.
- **Not building tooling to auto-detect brain reuse** (e.g. a script that great-guesses
  when an entry "should" have been cited). M1 is a manual convention (one line in a
  session log), not automation — matches the project's lean-native-workflow stance
  (ADR 0001) of enforcement via readable files + discipline, not new infra.
- **Not deciding keep-vs-cut for the 3 founding patterns in advance.** M2 runs the gate
  and drafts a recommendation per file; the actual removal (if any) needs Human sign-off
  before deleting from `docs/brain/patterns/`, since `AGENTS.md` explicitly says not to
  silently drop brain content.
- **Not splitting `gotchas.md` today** — it's not big enough yet (M3 only sets the
  threshold and split shape for when it is).

## Milestones

---

### Milestone 1 — Formalize an "Informed by" reuse-tracking convention

**Files:**
- `docs/agent/brain-capture.md`
- `docs/brain/index.md`

**Atomic Sub-tasks:**
- [x] `docs/agent/brain-capture.md` — add a short section (after "Extraction procedure",
      before "Usefulness gate"): whenever a session's decision was actually shaped by an
      existing `docs/brain/` entry (not just "this area is covered by brain" — a specific
      entry that changed what the agent did), add one line to that day's
      `sessions/YYYY-MM-DD.md` under `### Decisions`: `Informed by: [[entry-name]]`. State
      explicitly this is for entries that changed a choice, not a blanket citation habit —
      most sessions will have none, and that's expected.
- [x] `docs/brain/index.md` — Maintenance section: one line noting the `Informed by:`
      convention exists in session logs, so a future audit can `grep -r "Informed by:"
      sessions/` instead of re-deriving reuse from commit archaeology.
- [x] Retroactively add one `Informed by: [[0005-scope-npm-audit-to-production-deps]]`-style
      note is **not** required for past sessions — this is forward-only; do not rewrite
      `sessions/2026-07-20.md`.

**Verify:** `grep -n "Informed by:" docs/agent/brain-capture.md docs/brain/index.md` shows
the new convention text in both files; no existing `sessions/*.md` files are modified.

---

### Milestone 2 — Re-audit the 3 founding patterns against ADR 0004's gate

**Files:**
- `docs/brain/patterns/gemini-backend-proxy.md`
- `docs/brain/patterns/signals-only-state.md`
- `docs/brain/patterns/tombstone-soft-delete.md`

**Atomic Sub-tasks:**
- [x] For each of the 3 files, run the `docs/agent/brain-capture.md` usefulness gate
      checklist against its current content and record the verdict as a one-line HTML
      comment at the top of the file: `<!-- ADR-0004 gate, reviewed 2026-07-20: keep-as-is
      | strengthened | flag-for-removal -->`.
- [x] Where the gate fails (content is inferable from `AGENTS.md` alone, no named trap or
      exception) — do **not** delete unilaterally. Instead strengthen the "why" with the
      actual judgment/trap if one exists (e.g. does the Gemini proxy pattern name a
      specific near-miss, not just "key leak" in the abstract?), or draft a one-line
      removal recommendation for Human review in the milestone's `sessions/[date].md`
      entry under `### Reviewer should scrutinize`.
- [x] Do not remove any file in this milestone — output is the gate verdict + optional
      strengthened text + a removal recommendation list for Human decision, per the
      Non-goals section above.

**Verify:** All 3 pattern files carry the new gate-verdict comment; `git diff --stat`
shows only these 3 files touched; no file under `docs/brain/patterns/` was deleted.

---

### Milestone 3 — Growth threshold for `gotchas.md` + bypass-escalation policy

**Files:**
- `docs/brain/gotchas.md`
- `docs/agent/brain-capture.md`

**Atomic Sub-tasks:**
- [x] `docs/brain/gotchas.md` — add one line under the top-of-file note ("Running list...
      never delete a still-true entry"): "If this file exceeds ~150 lines / ~10 entries,
      propose a split by domain (e.g. `gotchas/ci.md`, `gotchas/git-workflow.md`,
      `gotchas/angular.md`) as a brain proposal at the next Merge Gate, rather than letting
      it grow unbounded."
- [x] `docs/agent/brain-capture.md` — add a one-line policy: "If the *same* documented gate
      (script/hook naming a specific bypass) is reported bypassed a second time via a new
      path, name that explicitly in the new gotcha's 'Why the obvious fix is wrong' section
      as a structural-fix signal, not just another instruction restated" — cross-reference
      the existing "Existing save-plan mitigations still let a plan skip `plans/`" entry
      as the worked example.

**Verify:** `grep -n "150 lines\|structural-fix signal" docs/brain/gotchas.md
docs/agent/brain-capture.md` shows both additions.

---

### Milestone 4 — Run ADR 0004's own self-review now

**Files:**
- `docs/brain/decisions/0004-full-draft-brain-proposals.md`

**Atomic Sub-tasks:**
- [x] Add a `## Review log` section at the bottom of the file (below "Review") with a
      dated entry answering the two questions ADR 0004's own Review section already asks:
      *"did the last ~3 approved entries pass without 'too thin' edits? Are skips still
      common?"* Base the answer on the actual entries since 0004 landed (07-14 → 07-20):
      the `defer-singleton-data-ensureLoaded` pattern + login-reload gotcha, the two
      pasted-plans gotchas, and ADR 0005 — all carry full Problem/Solution/When or
      What-hurt/Why-wrong/What-instead shapes, none are one-liners; "skip" (`none
      durable`) has not yet been exercised in a logged session, which is itself worth
      recording as an open question rather than assumed compliance.
- [x] Keep the addition to 5–8 lines — this is a log entry, not a rewrite of the ADR's
      original Context/Decision/Consequences.

**Verify:** `docs/brain/decisions/0004-full-draft-brain-proposals.md` has a `## Review log`
section with one dated entry; original sections above it are unchanged
(`git diff docs/brain/decisions/0004-full-draft-brain-proposals.md` shows only an
addition, no deletions above the `## Review` heading).

---

## Done when

- [x] `docs/agent/brain-capture.md` documents the `Informed by:` convention and the
      bypass-escalation policy
- [x] `docs/brain/index.md` points to the reuse-tracking convention
- [x] All 3 founding patterns carry an ADR-0004 gate verdict comment; none deleted without
      Human sign-off
- [x] `docs/brain/gotchas.md` states its own split threshold
- [x] `docs/brain/decisions/0004-full-draft-brain-proposals.md` has a dated `## Review log`
      entry
- [x] `ng build` passes (unchanged — this plan touches no Angular code)

## Risk notes

Low risk — doc-only, no product code, no auth/storage/crypto surface, no `.husky` or CI
changes. The only judgment-heavy step is M2 (pattern gate review); it's scoped to
"recommend," not "delete," specifically to avoid an agent silently thinning the brain
based on its own read of a gate it didn't write.
