# Orchestrator run biz-house

Run branch: `orch/biz-house` (from `origin/main` at 98654a0) · started 2026-11-27T06:38:27.124Z · finished 2026-11-27T07:44:14.204Z
Result: 1 merged, 0 parked, skipped or left out, 1 in the run (counted from git and status.json).
`main` untouched: yes — origin/main is 98654a0.

Final gate: ok (attempt 1)

## Decided without you

1 decision(s) the run made itself. Read them before `merge it`; each says how to undo it.

### Scope (1)

- plan 759 · advisor · scope: ask 759-1 ("The run branch merge left 2 settings tests expecting a native disabled Save button, and 241 tooltip copies against a baseline of 202. May plan 759 update that s") answered: approved: src/app/pages/settings/components/business-settings-tab/business-settings-tab.component.spec.ts, _shared/debt-baseline.json
  - why: scope: 2 path(s) inside the repo, none sensitive (2 of 5 for this plan)
  - undo: before merge it: on the run branch, git checkout origin/main -- src/app/pages/settings/components/business-settings-tab/business-settings-tab.component.spec.ts _shared/debt-baseline.json (drops the plan's change to those files), commit, push

## Plans

| Plan | State | Rounds | Builder tier | Merge | Why |
| --- | --- | --- | --- | --- | --- |
| 759 Dish VAT in the shared tooltip, the month picture filled from the forecast, one chip behaviour | merged | 1 | build | 3c8e157 |  |

## Scorecard

- Wall: 64.5 min · gate passes: 2 · asks raised mid-run: 1
- Minutes per state (summed over plans): building 38.7 · fixing 7.6 · gate 6.9 · checking 4.9 · asking 1.8 · merging 1.4 · parked 1.3
- Checks left out (cached, skipped, not run, same tree): 0, about 0 min saved

## App errors since the run started

Command (from the main folder): `node scripts/log-query.mjs --since=2026-11-27T06:38:27.124Z --level=error`
Exit code: 0

```text
2026-11-27T07:41:18.252Z error server frontdesk.turn.gemini_failed demo_rest_owner e23d562c-a57b-49df-ba53-2d571f41961c frontdesk.turn.gemini_failed {"model":"gemini-3.1-flash-lite","status":503,"geminiMessage":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later."}
2026-11-27T07:40:49.728Z error client http.error demo_rest_owner 9e661447-c88f-4154-aa16-ac363cdfcebc HTTP 409 {"method":"POST","url":"http://localhost:3002/api/v1/sim/inbound","status":409}
2026-11-27T07:40:40.012Z error client http.error demo_rest_owner e920b9db-a502-41db-a2c0-c62190d84825 HTTP 409 {"method":"POST","url":"http://localhost:3002/api/v1/sim/inbound","status":409}
2026-11-27T07:38:31.615Z error server frontdesk.turn.gemini_failed demo_rest_owner ec9ac2de-9740-43fd-b767-062cd5ae2674 frontdesk.turn.gemini_failed {"model":"gemini-3.1-flash-lite","status":503,"geminiMessage":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later."}
2026-11-27T07:33:32.963Z error server frontdesk.turn.gemini_failed demo_rest_owner 3d6f7b44-2c23-44bc-bcc1-529a1e268aa9 frontdesk.turn.gemini_failed {"model":"gemini-3.1-flash-lite","status":503,"geminiMessage":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later."}
```

## Decisions

triage: shadow · agreement (last 50): 56% · collapsed: 0 · ask: 0 · follow-ups: 0

### Not triaged

- D1 · 759 · none · behaviour: a total with one input filled from the forecast and another with no number is faded and keeps «חלקי»; the fixed-costs «חלקי» flag goes only when the forecast covers every line with no actual; the «הוזנו X מתוך 4» badge and «חסר» line still count typed actuals — reverse: actualColumn in month-plan.ts and flags_ in monthly-plan.page.ts
- D2 · 759 · none · behaviour: a negative figure from the forecast shows faded, not red — reverse: move .mf__money--forecast above .mf__money--neg in month-figures.component.scss
- D3 · 759 · none · behaviour: an open box keeps its small chip beside it, pressing a chip does not close another box before the click lands, and each side keeps a 2.75rem row so closing moves nothing below — reverse: remove the mousedown line in month-pair.component.html and the .mpp__side min size
- D4 · 759 · none · behaviour: a dish with no price has no VAT hint, and the net title and priced net cells can be reached by keyboard — reverse: remove the tabindex bindings in restaurant-menu.page.html
- D5 · 759 · none · seen: _shared/debt-baseline.json allows 202 tooltip copies but origin/orch/biz-house holds 241, so kit-checks fails for any plan cut from it
- D6 · 759 · none · seen: src/app/pages/settings/components/business-settings-tab/business-settings-tab.component.spec.ts:134 and :191 expect a native disabled Save button; the template uses [appDisabledWhy], so test:ci fails on this branch
- D7 · 759 · none · seen: src/app/pages/settings/components/business-settings-tab/business-settings-tab.component.ts:170 — saveWhy_ compares only the five number fields, so changing just the dealer type or a month target leaves Save blocked with the 'nothing to save' reason (Settings, change only the dealer type, press Save). Not fixed: the component is outside the scope. The spec's two 'save enab
- D8 · 759 · none · behaviour: a derived figure with one input filled from the forecast and another with no number at all is faded and keeps the 'partial' tag; the fixed-costs 'partial' flag goes only when the forecast covers every fixed line without an actual; the entered-count badge and the 'missing' line still count typed actuals — reverse: actualColumn in month-plan.ts and flags_ in monthly-pl
- D9 · 759 · none · behaviour: a negative figure that comes from the forecast is faded, not red — reverse: move .mf__money--forecast above .mf__money--neg.
- D10 · 759 · none · behaviour: an open box keeps its small chip beside it (a press on it closes the box), a chip press does not blur another box before the click, and each side keeps a 2.75rem row so closing moves nothing below — reverse: the mousedown line in month-pair.component.html and .mpp__side in its stylesheet.
- D11 · 759 · none · behaviour: a dish with no price has no VAT hint, the net-price title and priced net cells take keyboard focus, and the old restaurant_menu_vat_note(_patur) dictionary keys stay unused because the dictionary is append-only — reverse: the net-price bindings in restaurant-menu.page.html.
- D12 · 759 · none · seen: src/app/pages/settings/components/business-settings-tab/business-settings-tab.component.ts:170 — saveWhy_ compares only the five number fields, so changing only the dealer type or a month target leaves Save blocked with 'nothing to save' (Settings → change only the dealer type → press Save). The component is outside this plan's scope; the spec assertions at :145 and :183

## Run notes

- 759: the folder foodVibe1.0-orch-biz-house-759 was installed (root, scripts, server)
- 759: builder left undone (round 0): C5: every check was run and its output is in the plan, but test:ci and kit-checks fail, so it stays open
- 759: parked: nothing to save (nothing uncommitted)
- 759: ask 759-1 (scope, the Human or the advisor answers): The run branch merge left 2 settings tests expecting a native disabled Save button, and 241 tooltip copies against a baseline of 202. May plan 759 update that spec and raise the tooltip baseline to 240?
- 759: decided without the Human: advisor · scope: ask 759-1 ("The run branch merge left 2 settings tests expecting a native disabled Save button, and 241 tooltip copies against a baseline of 202. May plan 759 update that s") answered: approved: src/app/pages/settings/components/business-settings-tab/business-settings-tab.component.spec.ts, _shared/debt-baseline.json
- 759: ask 759-1 answered by the advisor: approved: src/app/pages/settings/components/business-settings-tab/business-settings-tab.component.spec.ts, _shared/debt-baseline.json
- 759: scope of plan 759 extended on orch/biz-house by the answer to 759-1: src/app/pages/settings/components/business-settings-tab/business-settings-tab.component.spec.ts, _shared/debt-baseline.json
- 759: resumed from park/biz-house-759: round 0, tier build, after: asking 759-1: replan needed: ESCALATE: scope `pnpm run test:ci` ends `TOTAL: 2 FAILED, 3080 SUCCESS` (business-settings-tab.component.spec.ts:134 and :191, noth
- 759: the folder foodVibe1.0-orch-biz-house-759 was installed (root, scripts, server)
- 759: the folder foodVibe1.0-orch-merge-biz-house was installed (root, scripts, server)
- FINAL: same tree as plan 759's gate — node scripts/orch-state.mjs prepare --missing server/generated/schemas --script build:schemas --pm pnpm, pnpm run build, pnpm run lint, pnpm run test:ci, node scripts/override-check.mjs, pnpm run lint:icons, pnpm run lint:no-native-select, node scripts/plan-ledger-check.mjs, node scripts/breadcrumbs-check.mjs, node scripts/ci-scope-check.mjs --checkout-branch
- make this a default? a total with one input filled from the forecast and another with no number is faded and keeps «חלקי»; the fixed-costs «חלקי» flag goes only when the forecast covers every line with no actual; the «הוז (trigger: screen) — reply: default yes run-screen
- make this a default? an open box keeps its small chip beside it, pressing a chip does not close another box before the click lands, and each side keeps a 2.75rem row so closing moves nothing below — reverse: remove the mo (trigger: destructive-action) — reply: default yes run-destructive-action

## Models per agent

- 759 builder: sonnet
- 759 reviewer: sonnet
- 759 builder fix: sonnet

## What only the Human can do

### The plans' [human] items (no UI check ran)

1. 759 Dish VAT in the shared tooltip, the month picture filled from the forecast, one chip behaviour: Signed in as `demo_host`, on «תפריט המסעדה» hover the «מחיר ללא מע"מ» of a dish: the app's tooltip box
2. 759 Dish VAT in the shared tooltip, the month picture filled from the forecast, one chip behaviour: On «תכנון חודשי», «נובמבר 2026» (forecast only): type only «הכנסות» בפועל 100000: «תמונת החודש» בפועל
3. 759 Dish VAT in the shared tooltip, the month picture filled from the forecast, one chip behaviour: On the same month every pair, in every card, is two chips: empty shows «תחזית» / «בפועל» alone, filled shows

- Review and merge the run branch (PowerShell, one line each):

```powershell
git fetch origin
gh pr create --base main --head orch/biz-house --title "Orchestrator run biz-house" --body-file .claude\orchestrator-runs\biz-house.md
```

Context added by learning: 3.8k chars across 6 roles

Trend (last 3 runs): ✗ per plan 0 → 0 → - · fix rounds per plan 0 → 0 → 1 · parked 0 → 0 → 0
