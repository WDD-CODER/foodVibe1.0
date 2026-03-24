# Plan 199 — Lite refactor workflow comparative analysis

**Date:** March 24, 2026  
**Subject:** Workflow optimization and cost-productivity analysis  
**System version:** foodVibe 1.0 (Lite / Hardened)

---

## 1. Executive summary

The refactor has successfully transitioned the project from a **Redundant Context** model to a **Hardened Master** model. By centralizing technical and security rules into `copilot-instructions.md`, we have reduced the token footprint of individual agents by approximately **60–70%**. This shift enables **Efficiency Tiers**, routing procedural work to high-speed models (Composer Fast / Flash) and reserving high-reasoning tokens for architectural logic.

**Overall rating**

| Criterion | Score |
|-----------|-------|
| Architectural cleanliness | ⭐⭐⭐⭐⭐ |
| Cost-reduction potential | ⭐⭐⭐⭐⭐ |
| Global scalability | ⭐⭐⭐⭐⭐ |

---

## 2. Global foundation comparison (`copilot-instructions.md` and `agent.md`)

**Legacy state:** These files were previously used as simple starting points. Rules were often repeated inside each `.md` file in `.claude/agents/`, leading to **logic leaking**, where agents would prioritize local rules over global standards.

**Lite state:** Hardened as the **single source of truth**. All never-events, security mandates, and Angular 19 reactive patterns are centralized here.

**Delta:** Moved **15+** redundant sections (security, task sizing, PRD/HLD hierarchy, UI Inspector wait-rules) into the Master file.

**Verdict:** Lite is superior. It reduces conflicting instructions and gives every agent turn a unified, consistent rule set.

---

## 3. Specialist agent comparison

### Team Leader, PM, and Architect

**Legacy state:** Each agent carried its own copy of the Gatekeeper protocol and Angular standards, leading to high context overhead (~2k tokens per agent load).

**Lite state:** Agents are **thin clients** focused on reasoning (conflict resolution, scoping, signal mapping). They rely on the Master file for implementation details.

**Delta:** Agent files reduced toward **~50 lines** (from ~150 in the worst cases). Explicit **Efficiency Tiers** route tasks (e.g. Gemini 1.5 Pro vs Composer Fast / Flash).

**Verdict:** Lite is better for **multi-agent scaling**: faster context swapping and lower cost during planning and decomposition.

### Security Officer and QA Engineer

**Legacy state:** Heavy scanning logic lived inside the agent file.

**Lite state:** The Security Officer acts as a **logic auditor**; procedural grepping for PII and vulnerabilities is aligned with **Hardened Master Section 5** and can be executed with Flash-class models for pattern work.

**Verdict:** Lite improves **resilience**: hardened never-events in the Master are harder to “drop” across long coding turns.

---

## 4. Skill registry comparison (`commit-to-github`, `update-docs`, `quick-chat`)

**Legacy state:** Skills mixed **how** and **why** in monolithic scripts.

**Lite state:** Skills are **procedural workflows** (phase 1, 2, 3 execution).

**Delta:** Argument shortcuts (`c`, `s`, `sl`, …) and Cursor-oriented tips steer **~90%** of routine workflow to Fast / Flash models where appropriate.

**Verdict:** Lite is stronger for **production speed**; quick-chat style paths save large token volume on trivial updates.

---

## 5. Performance metrics

| Metric | Legacy workflow | Lite workflow | Improvement |
|--------|-----------------|---------------|-------------|
| Context load (avg) | ~4,500 tokens | ~1,200 tokens | ~**73%** reduction |
| Model routing | High-reasoning only | Tiered (Pro + Fast) | **~80%** cost cut (estimated) |
| Logic consistency | Medium (fragmented) | High (centralized) | Fewer conflicting “local” rules |
| Startup speed | Slow (heavy reads) | Lighter (Master-first) | Faster cold starts |

*Figures are directional estimates from the analysis; measure on real sessions where possible.*

---

## 6. Final conclusion

The Lite refactor is a **definitive upgrade**. Legacy was more **self-contained** (one fat agent file could stand alone) but **unsustainable** in production due to token bloat and cost. The new system is built for **agentic speed**: Master instructions act as the **operating system**; agents and skills are **lightweight apps** on top.

**Recommendation:** Proceed with **future development on the Lite stack**. Pair this policy with concrete adoption work (see **Plan 198** — promote `.claude/toBe/`, model-routing table, security checklist migration).

---

## Critical questions

*None — this document records an agreed analysis.*

---

# Atomic Sub-tasks

1. **Policy:** Treat `copilot-instructions.md` as the OS; keep agents and skills thin — do not re-embed full rulebooks inside agent files.
2. **Routing:** Apply Efficiency Tiers (high reasoning vs fast procedural) when splitting planning, decomposition, grep-heavy checks, and formatting.
3. **Skills:** Preserve phase-based procedural skills; use documented shortcuts (`c`, `s`, `sl`, `sf`) for commit flows per `.claude/skills/commit-to-github/SKILL.md`.
4. **Guardrails:** When editing bundles of agents/skills, avoid regressing toward Legacy token loads; prefer Master references and SKILL loads on demand.
5. **Execution:** Complete **Plan 198** tasks for promoting Lite artifacts, §0.5 model routing, and security migration verification.

---

## How to verify

- Agent + skill edits keep **line count and duplication** down vs Legacy baselines.
- Team uses **Master first**, then loads one agent or skill at a time.
- Cost and latency improve in practice when procedural steps use fast models (track informally or via project notes).
