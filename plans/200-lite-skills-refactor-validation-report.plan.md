# Plan 200 — Lite skills refactor validation report

**Context:** The foodVibe 1.0 project has completed a full refactor of its agent skills system. Legacy skills (`.claude/skills/**/SKILL.md`) were monolithic, self-contained files with embedded procedural logic, no model-tier routing, and high token weight (400–3,500T). The new Lite/Hardened skills (`.claude/toBe/skills/*.md`) are thin phase-routing cards (~650–950T) that delegate standards to `copilot-instructions.md` (the Master) and explicitly route each phase to the cheapest capable model tier (Sonnet vs Haiku/Flash).

**Purpose:** Produce the **Production Validation Document** referenced but not yet written in Plans 198 and 199. The report proves token savings, guides model selection per skill phase, and delivers a Go/No-Go verdict on deprecating the legacy `skills/` folder.

**Related plans:** [Plan 198](198-lite-agent-refactor-adoption.plan.md) (agent adoption, Go/No-Go alignment), [Plan 199](199-lite-refactor-workflow-comparative-analysis.plan.md) (workflow policy).

---

## Output artifact

| Item | Value |
|------|--------|
| **File** | `notes/comparative-analysis-report.md` |
| **Full path** | `C:\foodCo\foodVibe1.0\notes\comparative-analysis-report.md` |

---

## Pre-write verification (execute before drafting the report)

Complete these checks and record findings in the report **Risk** section (and as Go/No-Go blockers if applicable).

1. **Content mismatch**
   - Read `.claude/toBe/skills/commit-to-github.md` — confirm it is the Lite commit skill, not UI Inspector or other agent content.
   - Read `.claude/toBe/agents/breadcrumb-navigator.md` — confirm Navigator vs Software Architect metadata (Plan 198 Task 2).

2. **Master section completeness**
   - Read `.claude/toBe/copilot-instructions.md` **Sections 3, 4, 5** (and extend to 6–9 as needed) so Angular, CSS, Security, and other delegated content actually exists. Gaps = potential Go/No-Go blockers.

3. **quick-chat legacy status**
   - Confirm `quick-chat` does **not** exist under legacy `.claude/skills/` (expected: Lite-only). Document impact on like-for-like token delta.

---

## Report structure (15 sections + appendices)

**Title:** Comparative Analysis Report: The Skills Refactor (Lite)  
**Date:** 2026-03-24 · **Author:** System Analysis

1. Executive Summary (5-star ratings + headline savings number)
2. Methodology Notes (what was measured, assumptions, normalization)
3. Skill Inventory: Legacy vs Lite (inventory table)
4. Per-Skill Comparison Table (all 19 skills: token delta, logic density, routing)
5. Logic Density Analysis (definition, scoring rubric, per-skill scores)
6. Section 1 — Functional Refactor Analysis  
   - 6a. Legacy Redundancy (how-to logic repeated across skills)  
   - 6b. Hardened Integration (Master-as-OS pattern)  
   - 6c. Model Routing Evaluation (Efficiency Tier analysis)  
   - *Recommendation after each sub-section*
7. Section 2 — Performance & Economic Metrics  
   - 7a. Token Reduction (static per-skill + aggregate)  
   - 7b. 8-Hour Session Simulation (trigger table, token totals, cost formula)  
   - 7c. Procedural Velocity (Flash routing speed gains)  
   - 7d. Logic Density Reduction (centralization wins)  
   - *Recommendation after each sub-section*
8. Section 3 — Verdict  
   - 8a. Overall winner  
   - 8b. Specific skill wins (quick-chat, add-recipe, commit-to-github, cssLayer)  
   - 8c. Closest-parity cases (angularComponentStructure, github-sync)
9. Go/No-Go Checklist (5 CRITICAL + 5 HIGH + 4 MEDIUM + 2 LOW items)
10. Executive Summary: 5-Star Ratings — Workflow Speed, Cost-Efficiency, Implementation Accuracy  

**Appendix A** — Raw Token/Line Data  
**Appendix B** — Session Simulation Working Sheet (two variants)  
**Appendix C** — Logic Density Scoring Detail (5 deepest legacy skills)

---

## Key metrics (pre-calculated — verify during exploration)

### Token inventory (static per-skill)

| Skill | Legacy (T) | Lite (T) | Delta (T) | Delta % |
|-------|------------|----------|-----------|---------|
| commit-to-github | 3,500 | 900 | -2,600 | -74% |
| worktree-session-end | 2,800 | 800 | -2,000 | -71% |
| add-recipe | 2,200 | 800 | -1,400 | -64% |
| worktree-setup | 1,400 | 800 | -600 | -43% |
| deploy-github-pages | 1,400 | 800 | -600 | -43% |
| breadcrumb-navigator | 1,400 | 800 | -600 | -43% |
| update-docs | 1,300 | 750 | -550 | -42% |
| cssLayer | 1,200 | 750 | -450 | -38% |
| session-handoff | 1,200 | 800 | -400 | -33% |
| auth-and-logging | 1,100 | 750 | -350 | -32% |
| techdebt | 1,100 | 700 | -400 | -36% |
| save-plan | 1,000 | 700 | -300 | -30% |
| angularComponentStructure | 900 | 850 | -50 | -6% |
| github-sync | 600 | 700 | +100 | +17% |
| elegant-fix | 400 | 700 | +300 | +75% |
| quick-chat (NEW) | — | 650 | — | — |
| angular-pipe-logic (NEW) | — | 850 | — | — |
| auth-crypto (NEW) | — | 750 | — | — |
| finalize-docs (NEW) | — | 700 | — | — |
| **Legacy total (15 skills)** | **21,500** | | | |
| **Lite total (15 equivalent)** | | **11,300** | **-10,200** | **-47%** |

### 8-hour session simulation (standard feature-build day)

| Skill | Triggers | Legacy total (T) | Lite total (T) |
|-------|----------|------------------|------------------|
| github-sync | 1 | 600 | 700 |
| save-plan | 2 | 2,000 | 1,400 |
| angularComponentStructure | 3 | 2,700 | 2,550 |
| cssLayer | 4 | 4,800 | 3,000 |
| auth-and-logging | 1 | 1,100 | 750 |
| techdebt | 1 | 1,100 | 700 |
| update-docs | 1 | 1,300 | 750 |
| breadcrumb-navigator | 1 | 1,400 | 800 |
| elegant-fix | 1 | 400 | 700 |
| commit-to-github | 3 | 10,500 | 2,700 |
| session-handoff | 1 | 1,200 | 800 |
| quick-chat (Lite only) | 4 | — | 2,600 |
| **SESSION TOTAL** | | **27,100** | **16,950** |

### Credit cost formula (illustrative)

- **Legacy cost** = 27,100T × 1.0 = **27,100** units (all Sonnet-class).
- **Lite cost** (example mix): (16,950T × 0.25 × 1.0) + (16,950T × 0.75 × 0.10) = 4,237 + 1,271 = **5,508** units → **~80% session cost reduction** vs illustrative Legacy baseline.

*Model mix rationale:* ~2 procedural (Flash) + ~1 reasoning (Sonnet) per 3-phase skill → ~67% Flash / 33% Sonnet; table uses **75/25** as conservative rounding.

### Logic density scoring

- **Scale:** 0–10. Legacy avg **5.5/10**, Lite avg **2.1/10** → **-62%** average density.
- **Anchors:** commit-to-github Legacy **9/10** vs Lite **3/10**; add-recipe Legacy **8/10** vs Lite **4/10** (Hard Pause + Sonnet-labeled domain phases retained).

### 5-star ratings (dimensions)

| Dimension | Legacy | Lite |
|-----------|--------|------|
| Workflow speed | ⭐⭐ (avg) | ⭐⭐⭐⭐ (avg) |
| Cost-efficiency | ⭐ (all-Sonnet) | ⭐⭐⭐⭐⭐ (~80% savings in model) |
| Implementation accuracy | ⭐⭐⭐⭐ (self-contained) | ⭐⭐⭐⭐ (Master-dependent) |

### Specific wins to highlight

- **quick-chat:** New capability; high credit-saving; 100% Flash path where applicable.
- **commit-to-github:** Largest absolute token drop; high trigger frequency; legacy file very large (~615 lines cited).
- **cssLayer:** Strong Flash/procedural routing (~90% procedural work).
- **add-recipe:** Sonnet on OCR/ledger phases; Flash on file-write phases.
- **angularComponentStructure:** Closest parity (~-6% tokens); gains mostly from routing not file shrink.

---

## Go/No-Go: five critical blockers (must pass to deprecate legacy skills)

1. **commit-to-github Lite** field-tested on **3** real ship-full flows (visual tree, rebase, PR merge) — no manual recovery.
2. **add-recipe Lite** Hard Pause (Phase 3) fires before any file write — **2** recipe-from-image tests minimum.
3. **worktree-session-end Lite** tested on real teardown — no `fatal: main is already used`.
4. **Master** (`copilot-instructions.md`) contains all sections referenced by Lite skills (3–9) — aligns with Plan 198 security/Master verification.
5. **`.claude/toBe/`** promoted to canonical locations; triggers in `copilot-instructions.md` and `agent.md` updated — Plan 198 adoption complete.

---

## Risks to surface in the report

1. Content mismatch in `toBe` files (commit skill, breadcrumb agent).
2. Logic loss via over-delegation if Master is incomplete.
3. Model routing is **advisory** — Cursor users may stay on Sonnet and reduce savings.
4. Cold start: Lite skills need Master loaded first (gate mitigates).

---

## Critical files reference

| Path | Role |
|------|------|
| `.claude/skills/commit-to-github/SKILL.md` | Highest-density legacy benchmark |
| `.claude/toBe/skills/*.md` | All Lite skills — verify before citing |
| `.claude/toBe/copilot-instructions.md` | Master — sections 3–9 completeness |
| `.claude/toBe/agents/*.md` | Seven hardened agents |
| `plans/198-lite-agent-refactor-adoption.plan.md` | Go/No-Go task alignment |
| `plans/199-lite-refactor-workflow-comparative-analysis.plan.md` | Prior workflow analysis |

---

## Post-report verification

1. `notes/comparative-analysis-report.md` is readable; tables render in Markdown.
2. Go/No-Go critical items **1–5** align with open items in Plan 198 — no contradictions.
3. Appendix B totals match session headline figures (27,100 / 16,950).
4. Plans **198** and **199** are referenced so documentation is not orphaned.

---

## Critical questions

*None — this plan defines the deliverable and metrics for the validation report.*

---

# Atomic Sub-tasks

1. Run **pre-write verification** (three checks); log results in draft Risks / blockers.
2. Author **`notes/comparative-analysis-report.md`** following the 15-section + appendix outline; embed or reference token tables and session simulation.
3. Populate **§9 Go/No-Go** (5 CRITICAL + 5 HIGH + 4 MEDIUM + 2 LOW) with checkboxes or status.
4. **Cross-link** Plans 198 and 199; reconcile five critical blockers with Plan 198 tasks.
5. Execute **post-report verification** checklist (four items).
6. Optional: after Go/Go decision, schedule legacy `skills/` deprecation behind Plan 198 completion.

---

## How to verify

- Report exists at `notes/comparative-analysis-report.md` with all sections and appendices.
- Stakeholder can trace every critical metric to Appendix A/B and to file reads performed in pre-write verification.
- No unresolved contradiction between this plan’s Go/No-Go list and `plans/198-lite-agent-refactor-adoption.plan.md`.
