# Fix Template Findings Log

## 2026-04-12 — color-token DETECT gap (box-shadow)
Surfaced by: Brief 1 fixture creation, fff-in-shadow case
Status: open, do not fix yet
Issue: The DETECT step doesn't exclude box-shadow values. The fff-in-shadow case currently FLAGs correctly only because the DECIDE tree's general "#fff with no colored background" rule catches it as a side effect. If the DECIDE tree is later edited to be more permissive, this case will silently start passing as Path A when it should still FLAG.
Next step: address in a future template revision, after we see how the fixture behaves under /test-template and /adversarial-template. Re-evaluate during the first real /audit-report session that touches color-token.
