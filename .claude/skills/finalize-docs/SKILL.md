---
name: finalize-docs
description: Performs a global documentation audit — verifies all seams, prunes stale docs, syncs icon and domain registries, and produces an architecture state report.
---

# Skill: finalize-docs
**Model Guidance:** Use Haiku/Flash for Phases 1 and 3. Use Sonnet for Phase 2 only.

**Trigger:** User says "finalize docs", "global audit", or after a major architectural refactor.

**Documentation Rules (inline — no guide read required):**
- Major Seams that must have `breadcrumbs.md`: `core/`, `core/services/`, `core/models/`, `core/components/`, `shared/`, `pages/`
- Delete any `breadcrumbs.md` found outside these seams
- Dead links in `breadcrumbs.md` or `agent.md` must be resolved or removed
- Lucide Icon Registry must match all icons currently used in templates
- Domain dictionary (e.g. Hebrew canonical values) must reflect latest code changes
- Architecture state report path: `notes/architecture-audits/<YYYY-MM-DD>-architecture-state.md`

---

## Phase 1: Consistency Audit 

**Seam Check:** Global scan — verify `breadcrumbs.md` exists at every Major Seam and has been removed from all leaf directories.

**Link Verification:** Check for dead file references in all `breadcrumbs.md` files and `agent.md`. Flag every broken link.

**Registry Sync:** Verify the Lucide Icon Registry and domain dictionary are up to date with the latest code changes.

---

## Phase 2: Knowledge Pruning 

> **Only invoke if** stale files are found or documentation complexity has grown significantly.

**Obsolescence:** Identify and suggest deletion of stale `.plan.md` files or old session handoffs that no longer reflect current project state.

**Documentation Debt:** Identify breadcrumbs where underlying logic has become significantly more complex — flag for rewrite.

---

## Phase 3: Final Indexing 

**Update Docs:** Execute the `update-docs` skill to regenerate all navigation maps.

**Architecture State Report:** Write report to `notes/architecture-audits/<YYYY-MM-DD>-architecture-state.md` — include: current seams, key exports, pruning performed, registries synced.

---

## Completion Gate

Output: `"Global documentation finalized. [X] seams verified, [Y] stale files pruned. Project is 100% indexed for multi-agent navigation."`

---

## Cursor Tip
> This is a global maintenance task — always use Composer 2.0 (Fast/Flash) for scanning the entire repository and verifying structure.
> Reserve Gemini 1.5 Pro for Phase 2 only when evaluating whether documentation is genuinely obsolete vs. still relevant.
> Credit-saver: ~67% of this skill (Phases 1 + 3) is Flash-eligible.