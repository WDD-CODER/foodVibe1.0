# Overnight Maintenance Report — 2026-09-27

**Run type:** Unattended nightly (`/nightly-maintenance`). Nothing was committed, pushed, or opened on GitHub — all changes below live only in this ephemeral cloud checkout, delivered to you as files + a patch.

## Status: ✅ Clean run, no blockers

Top finding: **bundle-budget overage has improved** (93.77 kB over → 39.17 kB over since the Sept 16 audit) and the build is green. The only things needing your attention are a handful of pre-existing style/doc gaps, none urgent.

---

## 1. GitHub Sync
- HEAD detached at `ea6339e` (latest merge on `main`), working tree clean at start.
- `git fetch origin main`: local HEAD already identical to `origin/main` — no pull/rebase needed.
- **Open PRs: 0** (checked via GitHub MCP `list_pull_requests`, state=open).
- Full log: `notes/github-sync/2026-09-27.md`.

## 2. Tech Debt Audit (report-only, nothing auto-fixed)
Full report: `.claude/techdebt-reports/techdebt-2026-09-27.md` (7-report rolling archive, oldest `2026-04-10` retired).

- **Style violations (4, all pre-existing, none fixed):**
  - `nutrition-badge.component.ts:46` — legacy `@Input()` decorator. **Unfixed since at least the 2026-04-20 audit (~5 months).**
  - `auth.interceptor.ts:4,22` — `BehaviorSubject` used for the refresh-token gate; hard rule says signals only. Auth-path file — route any fix through the `auth-and-logging` skill.
  - Two stray trailing semicolons (`quick-add-product-modal.component.ts:121`, `menu-library-list.component.ts:197`).
- **TODOs:** 1, nice-to-have, intentional marker (`translation-pipe.pipe.ts:4`).
- **Refactor candidates (>300 lines):** 24 files, full-project sweep (first one since April). Top 3 are 4x+ over the threshold: `menu-intelligence.page.ts` (1413 lines), `recipe-builder.page.ts` (1394), `cook-view.page.ts` (1201). Scope differs from the April working-tree-only audits, so this isn't a clean apples-to-apples regression — but worth a deliberate split pass, not a nightly drive-by.
- **Security flags:** 0. No hardcoded keys/secrets/tokens found in `src/app` or `server`.

## 3. Docs Sync (`update-docs`) — mechanical edits included as a patch
Breadcrumbs had drifted well behind the actual file tree. Synced (added missing entries, removed stale ones — no application code touched):

| Seam | Added (undocumented, exist on disk) | Removed (documented, no longer exist) |
| --- | --- | --- |
| `core/services/breadcrumbs.md` | 18 files (e.g. `gemini.service.ts`, `master-push.service.ts`, `menu-export.service.ts`, `user-admin.service.ts`, `loading.service.ts`) | — |
| `shared/breadcrumbs.md` | 10 dirs (e.g. `ai-menu-modal/`, `ai-recipe-modal/`, `nutrition-badge/`, `rating-stars/`) | — |
| `core/components/breadcrumbs.md` | 2 dirs (`tab-chips/`, `update-banner/`) | — |
| `core/models/breadcrumbs.md` | 4 files (`admin-user.model.ts`, `ai-menu-draft.model.ts`, `ai-product-draft.model.ts`, `parsed-result.model.ts`) | 3 stale entries (`filter-category.model.ts`, `filter-option.model.ts`, `units.enum.ts` — no longer in the repo) |

Apply with: `git apply nightly-maintenance-2026-09-27.patch` (or `git am` if you want it as a commit). Doc-only, verified against a clean `ng build`.

## 4. PR-Check Diagnosis
No open PRs — nothing to diagnose.

## 5. Self-Validation (`ng build`)
**Build: PASS.** Warnings only, all pre-existing:
- Initial bundle **39.17 kB over** its 500 kB budget (down from 93.77 kB over on 2026-09-16 — improving).
- `cook-view.page.scss` 2.10 kB over its 20 kB budget.
- 2 unnecessary `??` (nullish coalescing) warnings in `venue-detail`/`venue-list` templates (`available_infrastructure_` is never null/undefined per its type) — harmless, easy 2-line cleanup whenever convenient.
- `exceljs` is CommonJS, not ESM — known optimization-bailout risk, not new.

## Recommendation
Nothing here blocks anything. Two items worth a deliberate (not nightly) look when you have time:
1. `auth.interceptor.ts`'s `BehaviorSubject` — it's the one hard-rule violation on the list and it's in an auth-path file.
2. The 24-file refactor-candidate list, especially the three page files over 1200 lines each.
Everything else (docs patch, semicolons, the `@Input()` decorator) is low-stakes cleanup you can fold into whatever you're already touching next.
