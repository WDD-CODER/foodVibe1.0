# Gotchas — CI / build

Part of the domain split of `docs/brain/gotchas.md` — see that file for the index and the append routing table. Same rules as the parent file: each entry is what hurt / why the obvious fix is wrong / what to do instead. Append new entries at the bottom; never delete a still-true entry. If this file exceeds ~150 lines / ~10 entries, propose a further split as a brain proposal at the next Merge Gate.

Scope: `.github/workflows/*`, `ng build`/`angular.json`, `npm audit`, and other build/CI toolchain behavior.

---

## `npm audit fix --force` would force an unplanned Angular major bump

**What hurt:** Remaining root `npm audit --audit-level=high` findings sit in the Angular/* cluster (plus related CLI/build toolchain packages: vite, piscina, http-proxy-middleware, serialize-javascript). Running `npm audit fix --force` would auto-bump Angular to satisfy them — but the app is on Angular 19 and isn't ready for that jump.

**Why the obvious fix is wrong:** `--force` looks like the fast way to clear audit noise, but it silently majors-bumps a framework dependency outside any planned migration window, which can break the build in ways unrelated to the actual vulnerability.

**What to do instead:** Leave these findings alone until the Angular 22 migration. CI temporarily runs `--audit-level=critical` in `.github/workflows/security.yml` as the interim gate; restore `--audit-level=high` after the migration. Server-side `npm audit` is already clean. See `.claude/todo.md`.

---

## Prod build fails when Google Fonts CDN is unreachable

**What hurt:** `ng build` (production) failed with `ENOTFOUND fonts.googleapis.com` because Angular's font-inlining plugin fetches `@import url('https://fonts.googleapis.com/...')` at build time. Dev builds passed; `/ship` hard-stopped.

**Why the obvious fix is wrong:** Retrying the build or waiting for network only papers over CI/sandbox environments that cannot reach Google. Leaving `optimization: true` (default) keeps the footgun.

**What to do instead:** Set `optimization.fonts: false` for `production` and `gh-pages` in `angular.json`. Keep the CSS `@import` so browsers still load fonts at runtime when the CDN is available. Self-host fonts only if you need offline runtime too.
