---
name: finalize-docs
description: Performs a global documentation audit for foodVibe 1.0 — verifies all seams, prunes stale docs, syncs the Lucide/Hebrew registries, and produces an architecture state report.
---

# Skill: finalize-docs

**Trigger:** User says "finalize docs", "global audit", or after a major architectural refactor.
**Standard:** Follows Section 4 (Folder Structure) and Section 0 (Documentation Standards) of the Master Instructions.

---

## Phase 1: Consistency Audit `[Procedural — Haiku/Composer (Fast/Flash)]`

**Seam Check:** Global scan — ensure `breadcrumbs.md` exists at every Major Seam (Section 4) and has been removed from all leaf directories.

**Link Verification:** Check for dead file references in breadcrumbs and the Master Entry Point (`agent.md`).

**Registry Sync:** Verify the Lucide Icon Registry (Section 8) and Hebrew Dictionary (Section 7) are up to date with the latest code changes.

---

## Phase 2: Knowledge Pruning `[High Reasoning — Sonnet/Gemini 1.5 Pro]`

**Obsolescence:** Identify and suggest deletion of stale `.plan.md` files or old session handoffs that no longer reflect the current state of the project.

**Documentation Debt:** Identify missing context in breadcrumbs where underlying logic has become significantly more complex.

---

## Phase 3: Final Indexing `[Procedural — Haiku/Composer (Fast/Flash)]`

**Update Docs:** Execute the `update-docs` skill (Section 0) to regenerate all navigation maps.

**Architecture State Report:** Create a final report in `notes/architecture-audits/<YYYY-MM-DD>-architecture-state.md` summarizing current seams, key exports, and any pruning performed.

---

## Completion Gate

Output: `"Global documentation finalized. [X] seams verified, [Y] stale files pruned. Project is 100% indexed for multi-agent navigation."`

---

## Cursor Tip
> This is a global maintenance task — always use Composer 2.0 (Fast/Flash) for scanning the entire repository and verifying structure.
> Reserve Gemini 1.5 Pro for Phase 2 only when evaluating whether documentation is genuinely obsolete vs. still relevant.
> Credit-saver: ~67% of this skill (Phases 1 + 3) is Flash-eligible.
