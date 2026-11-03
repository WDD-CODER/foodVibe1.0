# Triage calibration

Written by `node scripts/decision-log.mjs stats --write` from `decision-grades.jsonl`. The triage agent reads it; never edit it by hand.

Agreement over the last 44 graded: 57%

| Kind | Graded | Agreement |
| --- | --- | --- |
| - | 8 | 38% |
| evidence | 4 | 100% |
| plan-test-command | 2 | 50% |
| removed-keyboard-path | 2 | 50% |
| build-check-substitute | 1 | 100% |
| client-reuse | 1 | 0% |
| combobox-wiring | 1 | 100% |
| data-lineage | 1 | 0% |
| data-shape-default | 1 | 0% |
| data-shape-derived-field | 1 | 0% |
| exit-code-masking | 1 | 0% |
| idempotent-history | 1 | 100% |

Where the Human disagreed (newest last):
- 2026-11-02 data-shape-default: triage ask, Human ok — behaviour: server does not store the clientType default (checkStoredDoc validates only, it does not 
- 2026-11-02 data-lineage: triage ask, Human ok — behaviour: clients carry no _masterId/_userModified on POST or PUT (new NO_LINEAGE set in generic.js
- 2026-11-02 -: triage ask, Human ok — behaviour: derived phoneNormalized from phone just before the schema check, because the strict schem
- 2026-11-02 owner-only-permission: triage ask, Human ok — seen: server/utils/permissions.js:49 — staff are denied create, edit and delete on the 'clients' typ
- 2026-11-02 staff-read-projection: triage ask, Human ok — seen: server/routes/generic.js:83,240,444 — the staff read projection is applied on GET list and GET
- 2026-11-02 -: triage ask, Human ok — seen: server/routes/generic.js:85,513,636 — phoneNormalized is derived with String(...).replace(//D/
- 2026-11-03 permission-gap: triage ask, Human ok — seen: src/app/core/services/permission.service.ts:47 has no owner-only rule for the clients type, so
- 2026-11-03 label-wording: triage ask, Human ok — seen: plans/515-new-inquiry-dialog-client-picker.plan.md:119 — the plan says the picked client shows
- 2026-11-03 removed-keyboard-path: triage ask, Human ok — removes: when picking an existing client, Enter in the client search picks the highlighted client (t
- 2026-11-03 name-only-clients: triage ask, Human ok — behaviour: the plan contradicts itself here. clientSchema requires `phone` (min 7), so a name-only g
- 2026-11-03 client-reuse: triage ask, Human ok — behaviour: groups reuse the oldest existing client of the same business with the same phoneNormalize
- 2026-11-03 plan-test-command: triage ask, Human ok — seen: plans/513-migration-0009-clients-from-events.plan.md Done-when `npm test -- server/test/migrat
- 2026-11-03 -: triage ask, Human ok — seen: server/migrations/0009-clients-from-events.js:167-168 write() skips checkBackup only when --db
- 2026-11-03 -: triage ask, Human ok — seen: server/migrations/0009-clients-from-events.js:39,90,130 every query is scoped by businessId an
- 2026-11-03 -: triage ask, Human ok — seen: server/migrations/0009-clients-from-events.js:84,191 filter values are strings built by trimme
