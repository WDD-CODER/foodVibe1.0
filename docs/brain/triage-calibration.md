# Triage calibration

Written by `node scripts/decision-log.mjs stats --write` from `decision-grades.jsonl`. The triage agent reads it; never edit it by hand.

Agreement over the last 21 graded: 52%

| Kind | Graded | Agreement |
| --- | --- | --- |
| evidence | 4 | 100% |
| - | 2 | 0% |
| build-check-substitute | 1 | 100% |
| data-lineage | 1 | 0% |
| data-shape-default | 1 | 0% |
| data-shape-derived-field | 1 | 0% |
| exit-code-masking | 1 | 0% |
| idempotent-history | 1 | 100% |
| owner-only-permission | 1 | 0% |
| plan-snapshot-advance | 1 | 100% |
| report-status-blocked | 1 | 0% |
| report-status-wording | 1 | 0% |

Where the Human disagreed (newest last):
- 2026-11-02 report-status-wording: triage ask, Human ok — behaviour: with no UI-run row in INDEX.md, no new S1/S2 findings and QA on current code, the status 
- 2026-11-02 report-status-blocked: triage ask, Human ok — behaviour: a night with no '.nightly.log' lines on the report date gives BLOCKED, 'the nightly tasks
- 2026-11-02 exit-code-masking: triage ask, Human ok — behaviour: qa-nightly-down.ps1 logs the morning report's exit code but still exits with the qa-down 
- 2026-11-02 data-shape-derived-field: triage ask, Human ok — behaviour: derived phoneNormalized from phone on the doc just before the schema check (the strict sc
- 2026-11-02 data-shape-default: triage ask, Human ok — behaviour: server does not store the clientType default (checkStoredDoc validates only, it does not 
- 2026-11-02 data-lineage: triage ask, Human ok — behaviour: clients carry no _masterId/_userModified on POST or PUT (new NO_LINEAGE set in generic.js
- 2026-11-02 -: triage ask, Human ok — behaviour: derived phoneNormalized from phone just before the schema check, because the strict schem
- 2026-11-02 owner-only-permission: triage ask, Human ok — seen: server/utils/permissions.js:49 — staff are denied create, edit and delete on the 'clients' typ
- 2026-11-02 staff-read-projection: triage ask, Human ok — seen: server/routes/generic.js:83,240,444 — the staff read projection is applied on GET list and GET
- 2026-11-02 -: triage ask, Human ok — seen: server/routes/generic.js:85,513,636 — phoneNormalized is derived with String(...).replace(//D/
