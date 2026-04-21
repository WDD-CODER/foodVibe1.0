# Reflect Test-Drive — Decision Criteria

**Decision date**: 2026-04-28
**Log reference**: log.md (runs 1–5 after smoke test Run 0)

---

## Verdict thresholds

After the 7-day test-drive period, apply the first matching verdict:

### KEEP as-is
- Average `output_useful` score ≥ 3.5 across all scored runs, AND
- At least 2 runs had `applied = yes` or `applied = partial`

### REBUILD per Karpathy design
- Average `output_useful` score between 2.0 and 3.4, AND
- Pattern: low `input_quality` (≤ 2) consistently driving low `output_useful` (≤ 3)
- This indicates the harness mechanics are sound but the input pipeline needs redesign

### PARK (disable, preserve code)
- Average `output_useful` score < 2.0, OR
- Fewer than 3 runs logged by 2026-04-28 (not enough data to evaluate)

---

## Tie-breaker questions (if verdict is ambiguous)

1. Did reflect find anything that a fresh Claude session would NOT have found? (Y/N)
2. Did the reflect run add more than 5 minutes to the session in any run? (Y/N — penalizes if yes)
3. Would removing reflect cause measurable regression in code quality? (Y/N)

---

## How to apply the verdict

### If KEEP
- Remove the end-session reminder from `.claude/skills/end-session/SKILL.md`
- Add reflect to the standard end-session flow
- Archive this test-drive dir to `docs/archive/reflect-eval-2026-04/`

### If REBUILD
- Open Brief: Karpathy redesign — inputs from `plans/248-reflect-karpathy-gaps.plan.md`
- Keep reflect paused (no end-session integration) during rebuild
- Archive this test-drive dir to `docs/archive/reflect-eval-2026-04/`

### If PARK
- Disable end-session reminder
- Add a note to `.claude/reflect/README.md` (if exists) or `agent.md`: "reflect parked 2026-04-28 — see docs/archive/reflect-eval-2026-04/"
- Do NOT delete reflect code — preserve for future re-evaluation
- Archive this test-drive dir to `docs/archive/reflect-eval-2026-04/`

---

## Reference

- Karpathy redesign brief: `plans/248-reflect-karpathy-gaps.plan.md`
- MemPalace context: prior decision in Plan 194 audit noted reflect subsystem as "dark"
