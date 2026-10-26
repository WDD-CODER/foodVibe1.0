# Open plans by group (2026-10-26)

The 15 open plans on `main` after PR #456, grouped so each group can be handed to `/orchestrate` as one run.
Relevance is a judgment from each plan's header, goal and ticked boxes; the code was not re-checked.

## 1. Close or finish only — not orchestrator work

- **440** Event and serving coefficients: store them and compute portions in one place (migration 0007). Relevant, but done and waiting on the Atlas migration with the Human's go.
- **442** Event stage, stage history and notes log on the server (migration 0008). Relevant, but waiting on the Atlas run.
- **450** Reuse layer: component registry, decision ladder and a check that catches duplicates. Boxes look ticked, so it probably just needs closing — check first.
- **490** Pasted ingredient lines match existing products first, and «לא מוכן» never saves. Marked `built` (`docs/mvp/runs/490.md`); needs validation, then closing.

## 2. Products, units and pricing — IN PROGRESS (orchestrator run started 2026-10-26: 377, 423, 473)

- **377** Edit a custom unit's label, key and gram rate from one dialog, with a confirmation showing the affected products and recipes. Relevant.
- **423** Each product gets its own weight for its purchase units, with no weight borrowed from another product. Relevant; fixes a real cost bug. Same unit code as 377.
- **473** Each supplier has its own price for a product, and costs use the cheapest. Relevant; draft "to be refined before the run".

## 3. Exports and printing

- **471** Rework recipe and menu print, preview and Excel so a chef can hand them to staff or a client. Relevant; a draft meant for its own dedicated session, not unattended.

## 4. App health and infrastructure

- **419** Bring the initial bundle back under its size budget (≤ 550 kB). Probably more urgent after the MVP added code; re-measure first.
- **412** Refresh the Gemini model chain to live free-tier models, ordered by daily quota. Relevant if models were retired.
- **497** Run the rule checks (lint, ledger, breadcrumbs) on every PR and delete merged branches. Relevant, cheap win.

## 5. Nightly and weekly automation (Claude Code tooling, not the product)

- **410** Skill improver: one skill gets better each night and opens a kit PR. Draft; may belong in the kit repo (`ai-workflow-kit/plans/`); review due 2026-11-17.
- **411** Weekly page of the top 5 Claude Code changes worth adopting. Nice to have; same kit-repo question.
- **422** Nightly QA morning report (OK / ATTENTION / BLOCKED), code review only for pages that changed. Relevant if the nightly QA still runs.

## 6. Claude Code mods

- **409** Roll out the three mods (fleet, guards, ship-pilot) at user scope. Draft; hands-on work in the Human's own setup, not orchestrator work.
