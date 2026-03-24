# Plan 198 — Lite agent refactor adoption

**Source:** Comparative Analysis Report: The Lite Refactor (2026-03-24) — Legacy vs. Lite/Hardened agentic workflow for foodVibe 1.0.

**Goal:** Adopt the Lite pattern: centralize hardened rules in `copilot-instructions.md`, keep agent files as domain-agnostic reasoning personas with Efficiency Tier routing, and eliminate duplication (security, Hebrew rules, ports, prompt injection).

**Scope (paths):**

| Role | Legacy | Lite (staging) |
|------|--------|----------------|
| Foundation | `agent.md`, `.claude/copilot-instructions.md` | `.claude/toBe/agent.md`, `.claude/toBe/copilot-instructions.md` |
| Agents (×7) | `.claude/agents/*.md` | `.claude/toBe/agents/*.md` |

**Executive summary**

- **Single source of truth:** Task Force doctrine (§0.4), prompt injection (§9), security/QA hardened content, Hebrew/translation (§7), folder structure (§4) live in Master; agents reference Master instead of restating.
- **Efficiency tiers:** High Reasoning vs. Procedural sub-tasks reduce cost; Security Officer Lite (~79% line reduction) is the largest token win.
- **Risk:** Agents invoked without Master have less standalone context — gate (read Master first) must stay explicit.

---

## Critical questions

*None — this plan restates the agreed analysis and final recommendations.*

---

# Atomic Sub-tasks

1. **[CRITICAL]** Verify `security-officer` migration: confirm all 8 foodVibe-specific security requirements and the 30-item checklist from Legacy `.claude/agents/security-officer.md` are fully present in `.claude/copilot-instructions.md` §5 (Security & QA hardened) before retiring or replacing the Legacy agent file.
2. **[HIGH]** Fix `.claude/toBe/agents/breadcrumb-navigator.md` — verify content matches Breadcrumb Navigator (report noted possible Software Architect metadata / filename mismatch).
3. **[HIGH]** Add **§0.5 — Model Routing** to the target `copilot-instructions.md` (Lite or merged Master): a table listing Efficiency Tier assignments per agent/phase so routing is centrally discoverable (report recommendation).
4. **[MEDIUM]** In Lite **QA Engineer** agent: preserve a prominent callout for the spec-authoring constraint (e.g. do not write `.spec.ts` during iterative plan execution) — blockquote or equivalent so it is not lost vs. Legacy.
5. **[MEDIUM]** Add one **pointer line per Lite agent** to the Master section(s) each role delegates to (e.g. PM → Hebrew §7.1–7.2; Team Leader → Task Force §0.4; Architect → §3–4; Security → §5 + §9 as applicable).
6. **[LOW]** Document the **UI Inspector** mixed-tier pattern (Procedural for structural QA + report; High Reasoning for visual verification + a11y) as a reference for future agents — either in §0.5 notes or agent file comment block.
7. **[Adoption]** When 1–3 are satisfied: promote Lite foundation and agents from `.claude/toBe/` to canonical locations (`agent.md` root, `.claude/copilot-instructions.md`, `.claude/agents/*.md`) per project branching rules; run `/validate-agent-refs` (or equivalent) after edits.
8. **[Verification]** Confirm `.claude/skills/breadcrumb-navigator/SKILL.md` and **ui-inspector** skill contain canonical procedural detail (Playwright protocol, paths, checks) so Lite agents can stay thin; fix gaps before removing Legacy inline detail.

---

## How to verify

- `validate-agent-refs` (or project health command) passes with no broken paths after moves.
- Spot-check: open Lite `security-officer` + Master §5 — no missing checklist items vs. Legacy audit list.
- Open `breadcrumb-navigator` Lite file — role/title matches Navigator, not Architect.
- Master file contains §0.5 Model Routing table; agents cross-reference expected sections.

---

## Ratings (from report, for traceability)

| Criterion | Legacy → Lite |
|-----------|----------------|
| Architectural cleanliness | ~2/5 → ~4.5/5 |
| Cost-reduction potential | ~2/5 → ~5/5 |
| Global scalability | ~1/5 → ~5/5 |
| Resilience vs. isolation-invocation | ~3/5 → ~4/5 |
