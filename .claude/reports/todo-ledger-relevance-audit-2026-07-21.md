# Todo ledger relevance audit — 2026-07-21

Source: `.claude/todo.md` checked against `plans/` + current `src/` / `server/`.

**Headline:** The ledger is heavily stale. Most open boxes are either already shipped, process fossils, or verify-only leftovers. The one clear **execute now** item is **Plan 291**.

---

## Counts (by verdict)

| Verdict | Count | Meaning |
| --- | --- | --- |
| Execute | 1 | Real unfinished work |
| Verify only | ~5 groups | Code done; need Human/audit pass |
| Mark done | ~7 | Code present; checkboxes lie |
| Maybe | ~8 | Refresh / decide before executing |
| Discard | ~9 sections | Remove from active todo |
| Keep deferred | 3 | Parked intentionally |

---

## Execute now

| Plan | Why |
| --- | --- |
| **291 Plan persistence & brief sync** | `scripts/plan-ledger-check.mjs` missing; ship/pre-commit/brief/save-plan milestones unfinished; Plan **285** file missing; **291’s own plan file is also missing** — recreate before execute. |

---

## Verify only (no new feature code)

| Plan | Why |
| --- | --- |
| **276–281, 283** mobile audit | Impl `[x]`; re-run `/mobile-flow-audit` + TRIAGE cluster stamps still open |
| **289 §6.2** | PUT parallelization already in `generic.js`; optional trash/backup-import smoke |
| **255 #8–9** | Repair + master-migration scripts still on disk; prod “done?” unknown — confirm before delete |
| **234** ops | Code via PR #53; keep only Atlas stamp + Render smoke if unconfirmed |

---

## Mark done / archive (stale `[ ]`)

| Plan | Evidence |
| --- | --- |
| **297** M1–M2e | `useResponsivePanelState` + all 5 list pages migrated |
| **289** 6.1 | `Promise.all` already in PUT `/:type` |
| **259** Tasks 1–7 | DB `GEMINI_SHOTS`, `POST /shots`, `GeminiShotsService`, modal wired |
| **249** Steps 1–12 | `tools/catalog-seeder` enrich/db_write already has the fields |
| **089** A + timestamps | Auto-name + `updated_at_` live in menu-intelligence |
| **282** | Impl + verify already `[x]` — ready for archive sweep |

---

## Maybe (not sure — refresh before doing)

| Plan | Notes |
| --- | --- |
| **081** toFix UX backlog | Huge; some items already shipped (auth focus, default `gram`). Spot-check before executing. |
| **133** list quick-edit | Plan is `unused-133`; inventory has **bulk** edit, not cell-click inline. Keep only if you still want that UX. |
| **010** roadmap Phases 1–3 | Narrative stale (dashboard/suppliers/low-stock/print exist). Refresh or prune child bullets. |
| **072** login/logging/security | Core shipped; narrow to real remaining gaps or archive. |
| **060** optional auto-download | Manual export exists. Discard unless you want Downloads-folder sync. |
| **255 #10 / #15** | Decide trim-demo; sweep-stale-todos command exists — wire trigger or close. |
| **248** Transloco | Never started; AGENTS still mandates `translatePipe`. Park until policy change. |
| **234** Atlas stamp | Script was deleted in Plan 255; whether Atlas was stamped is unknown. |

---

## Discard (redundant)

| Plan | Why |
| --- | --- |
| **059** Ph9/10 | Phases 1–8 done; grid engine classes live; stubs obsolete |
| **256** client shots body | Superseded by **259** DB pool |
| **233** Gemini direct API | Intentionally partial; status UI done; key path dropped |
| **247** Reflect loop | Reflect stack removed / retired |
| **074** tech debt block | Only a deferred SCSS line already `[x]` |
| **196 / 199 / 200** | Lite-skills / commit-to-github era — replaced by AGENTS + git-agent + `/ship` |
| **222** open ports | Local Windows ops, not app product work |
| **255 #14 / #16** | `reflect-add-tests` + `gemini-shots.util` gone |
| **234** PR-merge rows | No separate PRs — all in PR #53 |

---

## Keep deferred (intentional park)

| Item | Why |
| --- | --- |
| **Angular 22** note | Still on Angular 19; audit findings blocked on major upgrade |
| **122** AI chatbot scope | Product decisions never made (`unused-122` plan) |
| **248** Transloco | Same as Maybe — park, don’t execute against current AGENTS policy |

---

## Suggested next actions (Human pick)

1. **Prune discards** from `.claude/todo.md` (059, 256, 233, 247, 074, 196–200, 222, stale 234/255 rows).
2. **Mark shipped** (297 after your `done`, 289 6.1, 259, 249 1–12, 089, 282).
3. **Execute 291** (recreate missing plan file first).
4. **Batch-verify mobile** 276–283 + update TRIAGE.
5. **Refresh or drop** 081 / 010 / 133 / 072 before treating them as active work.

---

*Audit did not edit todo checkboxes. Say “prune the discards” / “mark the done ones” to apply.*
