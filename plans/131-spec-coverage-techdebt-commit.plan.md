---
name: Spec coverage in techdebt and commit
overview: Add Phase 7 (Spec coverage) to techdebt; commit-to-github Phase 0 handles spec items; copilot-instructions and agent.md limit spec updates to commit flow or explicit ask.
---

# Spec coverage in techdebt + commit-only spec updates

## Goal

- Techdebt reports which components/services need `.spec.ts` added or updated.
- Commit-to-github Phase 0: after techdebt, if report has Spec coverage items, add/update those specs (or ask user), then Phase 1.
- Normal execution: do not add or update `.spec.ts`; only when user runs commit-to-github or explicitly asks.

## Implemented

1. **Techdebt** — Phase 7: Spec coverage; report format includes Spec coverage section and metrics.
2. **Commit-to-github** — Phase 0: handle spec-coverage items from report before Phase 1.
3. **copilot-instructions** — Phase 5 ends at How to verify (no spec ask); Section 5.1 when to touch specs; Section 3 qualifier.
4. **agent.md** — Audit: run tests only; no spec updates (see Section 5.1).
