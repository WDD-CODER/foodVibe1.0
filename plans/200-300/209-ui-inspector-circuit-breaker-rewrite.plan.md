---
name: UI Inspector circuit-breaker rewrite
overview: Rewrite the UI Inspector agent with a circuit-breaker pipeline, scope filtering, inline rules, deferred screenshots, and dual-route output to cut token usage ~60-70%.
todos:
  - Rewrite .claude/agents/ui-inspector.md — circuit-breaker pipeline, scope filtering, inline rules, dual-route output, model routing
isProject: false
---

## Goal

Rewrite the UI Inspector agent to use a circuit-breaker pipeline with scope filtering, inline rules, deferred screenshots, and dual-route output — cutting token usage by ~60-70% on typical runs.

## Atomic Sub-tasks

- [ ] Rewrite `.claude/agents/ui-inspector.md` — circuit-breaker pipeline, scope filtering, inline rules, dual-route output, model routing

## Rules

- Don't touch team-leader.md or qa-engineer.md
- Don't touch copilot-instructions.md
- Keep Playwright Gate exactly as-is
- Keep Context Scope: gate-exempt header
- Inline rules section must be ≤5 lines
- Model routing: Haiku for structural + report, Sonnet for visual + a11y
- No SKILL.md exists — build protocol from current agent references
- validate-agent-refs.md has no ui-inspector SKILL entry — no update needed

## Done when

- UI Inspector with Playwright available: navigates, detects misalignment, takes screenshot, emits report — without reading any external file except .worktree-port
- UI Inspector with scope: structural skips visual and a11y sections entirely
- UI Inspector with page that 404s: stops at Step 1 gate, emits 1-line FAIL, no screenshot
- UI Inspector with caller: agent returns compressed JSON-like format
- validate-agent-refs still passes
