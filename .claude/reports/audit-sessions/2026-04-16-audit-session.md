# Audit Session — 2026-04-16

Trust mode: normal
Started: session-start

## Drift summary
- color-token: tested 3 times this week — scores: 6/6 (04-12 v2), 5/6 (04-14 v2), 6/6 (04-14 v3)
- color-token bumped v2 → v3 on 04-14 (DECIDE vocabulary A/B/C label fix)
- manual-subscription: tested 2 times — scores: 5/5 (04-12 v1), 5/5 (04-15 v1) — no drift

## Findings surfaced
None (findings.md: color-token box-shadow finding resolved 2026-04-14)

## Triage menu shown
| # | Category                         | Items | Template           |
|---|----------------------------------|-------|--------------------|
| 1 | F3 — Manual Subscription leak    |  1    | manual-sub v1 ✅   |
| 2 | C — cook-view hex colors         |  1    | color-token v3 ✅  |
| 3 | F — Oversized files              |  6    | none               |
| 4 | F — Semicolons (~9318)           | 183f  | none               |

## User pick
all

## Fixes

### Template work — color-token v3 → v4
Step 5 rewritten: added Step 5a (page-palette check) before Step 5b (semantic name check).
Fixed failing case: path-c-clear (step-divider #2dd4bf) now correctly routes to C.
color-token v4 scores 6/6.

### Item 1 — F3: hero-fab.component.ts Router.events leak

```
┌─ FIX SUMMARY ──────────────────────────────────────────┐
│ Item:      hero-fab.component.ts:44, Router.events     │
│            subscription with no cleanup                │
│ Category:  F3 — Manual Subscriptions                   │
│ Template:  manual-subscription v1                      │
│                                                        │
│ Problem:   Router.events subscribed in constructor,    │
│            no takeUntilDestroyed or takeUntil           │
│ First try: Add DestroyRef + takeUntilDestroyed() to    │
│            Router.events pipe chain                    │
│ Failed:    n/a — first try worked                      │
│ Fix:       Added DestroyRef inject + takeUntilDestroyed│
│            to pipe; also added takeUntilDestroyed import│
│ Verified:  Template 5/5 — template-guided              │
│                                                        │
│ Risk:      low — template-guided, all tests passing    │
│ Rollback:  git checkout -- src/app/core/components/    │
│            hero-fab/hero-fab.component.ts              │
│ Decision:  ship                                        │
└────────────────────────────────────────────────────────┘

### Item 2 — C: cook-view.page.scss hex colors

```
┌─ FIX SUMMARY ──────────────────────────────────────────┐
│ Item:      cook-view.page.scss:727,784,839             │
│            3 remaining hex values (33 already done)    │
│ Category:  C — Theme & Styling Violations              │
│ Template:  color-token v4                              │
│                                                        │
│ Problem:   #fff×2 inline + #888 in var() fallback      │
│ First try: PATH A for #fff×2, PATH C for #888          │
│ Failed:    n/a — first try worked                      │
│ Fix:       l727,839: #fff→var(--color-text-on-primary) │
│            l784: --cv-muted:#888 added to :host,       │
│            var(--cv-muted,#888)→var(--cv-muted)        │
│ Verified:  Template 6/6 — template-guided              │
│                                                        │
│ Risk:      low — template-guided, all tests passing    │
│ Rollback:  git checkout --                             │
│            src/app/pages/cook-view/cook-view.page.scss │
│ Decision:  ship                                        │
└────────────────────────────────────────────────────────┘
```
```
