# Fix Template Findings Log

## 2026-04-12 — color-token DETECT gap (box-shadow)
Surfaced by: Brief 1 fixture creation, fff-in-shadow case
Status: resolved 2026-04-14 — fff-in-shadow passes correctly under v3; DECIDE Step 2 catches it reliably. Template vocabulary also fixed (PATH A/B/C → A/B/C) — v3 scores 6/6.
Issue: The DETECT step doesn't exclude box-shadow values. The fff-in-shadow case currently FLAGs correctly only because the DECIDE tree's general "#fff with no colored background" rule catches it as a side effect. If the DECIDE tree is later edited to be more permissive, this case will silently start passing as Path A when it should still FLAG.
Next step: address in a future template revision, after we see how the fixture behaves under /test-template and /adversarial-template. Re-evaluate during the first real /audit-report session that touches color-token.
