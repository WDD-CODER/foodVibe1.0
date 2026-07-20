---
status: accepted
date: 2026-07-20
review-by: 2027-01-31
---

# 0005. Scope CI `npm audit` to production dependencies only

## Context

`.github/workflows/security.yml` ran `npm audit --audit-level=critical` (root +
server) as a temporary workaround while the Angular 19→22 migration is deferred
— the framework itself has open high/moderate CVEs (XSS, DoS) that only clear
on the major bump. On 2026-07-20, PR #162 (unrelated docs/plan-only diff) failed
this check anyway: `websocket-driver` (a transitive devDependency of
`webpack-dev-server`/`sockjs`, pulled in by `@angular/cli`) picked up a new
critical advisory. The audit-level workaround only bounds *severity*, not
*which dependency tree* is being audited — so any devDependency (build tooling
that never ships: Angular CLI, vite, webpack-dev-server, piscina, tar,
serialize-javascript, ...) can trip a "critical" and block every PR regardless
of the app's actual runtime attack surface. Alternatives considered: raise the
threshold further (masks real prod findings too — rejected), disable the
security workflow on doc-only PRs via path filters (hides genuine prod-dep
regressions in future doc-adjacent PRs — rejected), `npm audit fix --force`
(forces an unplanned Angular major bump outside any planned migration window —
already rejected, see `docs/brain/gotchas.md` "`npm audit fix --force` would
force an unplanned Angular major bump").

## Decision

`npm audit` in CI (root and server) always runs with `--omit=dev`. Only
production `dependencies` are audited; `devDependencies` (build/dev-server
tooling, never shipped) are excluded permanently, not as a temporary measure.
`--audit-level=critical` stays on the production-only tree until the Angular 22
migration clears the current `@angular/*` high/moderate findings, then restores
to `--audit-level=high` on top of `--omit=dev` (not a return to auditing
devDependencies).

## Consequences

Easier: devDependency churn (Angular CLI point releases, webpack-dev-server,
vite, transitive build-tool bumps) can never again spuriously fail a PR
unrelated to app code — verified locally 2026-07-20: `--omit=dev
--audit-level=high` still correctly fails on real `@angular/core` /
`@angular/common` / `@angular/compiler` XSS/DoS findings (production deps,
genuinely deferred to the migration), while `--omit=dev --audit-level=critical`
passes clean. Harder: a critical vulnerability introduced purely by dev
tooling (e.g. a compromised build-time package) would no longer block CI —
accepted, because CI `npm ci` still installs and runs that tooling either way,
and `npm audit` was never a supply-chain integrity gate (that's `gitleaks` /
`pre-commit-secret-scan.mjs` / `pre-commit-security-grep.mjs`). Re-evaluate if
a real devDependency supply-chain incident makes this look wrong in hindsight.

## Review

At review-by: has the Angular 22 migration landed? If yes, restore
`--audit-level=high` (keep `--omit=dev` permanently) and drop the deferred note
in `.claude/todo.md`. If still deferred, confirm `--omit=dev` hasn't hidden a
new production-dependency critical in the interim (re-run without `--omit=dev`
once and diff against the last full audit).
