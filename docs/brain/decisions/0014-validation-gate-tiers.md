---
status: accepted
date: 2026-10-01
review-by: 2027-04-01
---

# 0014. Split job validation into agent-verified `[auto]` and Human-gated `[human]` tiers

## Context

Every job needed a Human reply (`done` / ship Y) before any todo could be marked `[x]`, even when the Done-when was a deterministic check such as `ng build` exiting 0 or a byte-identical diff. That made the Human the bottleneck for facts a computer can prove, and trained "ok" replies that carried no real judgement. The alternative of letting agents self-approve everything was rejected: visual, UX and product criteria need a person.

ADR 0009 / Plan 326 is unrelated except that both touch Worker flow; Plan 321 P8 pre-claims 0010–0013, hence this number.

## Decision

Plan Done-when items are tagged `[auto]` or `[human]` by the plan author (untagged = `[human]`). `[auto]` items are verified by the agent with raw evidence (command + actual output / exit code / diff hash), printed as `VERIFIED BY AGENT`, and marked with `todo-query mark --auto-verified`. An item that fails or cannot be verified falls back to `[human]` with a ⚠. Agents never promote an item to `[auto]`. `[human]` items keep the hard Human gate. `/ship` Approve Y stays as commit/push consent in every case.

Rejected: tag-free heuristics (agent decides what is checkable) — it lets the verifier choose its own bar.

## Consequences

Pure-tooling jobs finish without a JOB DONE wait. Plan authors must tag criteria, and UI-touching plans need at least one `[human]` item. Existing untagged plans behave exactly as before. `(auto-verified)` is informational only; `todo-archive.mjs` skip rules are unchanged. Re-evaluate if an `[auto]` item is ever found to have passed while the feature was broken.

## Review

Check how many `[auto]` verifications later proved wrong and whether authors over-tag UI work as `[auto]`.
