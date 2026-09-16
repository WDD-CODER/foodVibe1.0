# Gotchas — Angular / frontend

Part of the domain split of `docs/brain/gotchas.md` — see that file for the index and the append routing table. Same rules as the parent file: each entry is what hurt / why the obvious fix is wrong / what to do instead. Append new entries at the bottom; never delete a still-true entry. If this file exceeds ~150 lines / ~10 entries, propose a further split as a brain proposal at the next Merge Gate.

Scope: `src/app/` — components, signals-based state, routing, template/CD behavior.

---

## Login reload bypasses deferred constructor load

**What hurt:** Plan 289 deferred venue / menu-event / section-category constructor fetches, but Equipment and Preparations still hit the network on cold dashboard after login. Removing constructor `loadInitialData()` alone was not enough — `UserService._reloadDataServices()` still called `reloadFromStorage()` unconditionally for those services on every auth hydrate.

**Why the obvious fix is wrong:** Treating “no constructor load” as “no bootstrap GET” ignores the login/guest path, which constructs the service and forces a full rehydrate. Keeping the service eager “because recipe-builder needs it” also skips the cheaper fix: wire `ensureLoaded()` on the recipe-builder route.

**What to do instead:** For every deferred singleton data service, gate login reload with `hasLoaded()` (skip until first route/tab hydrate). Wire `ensureLoaded()` on owning resolvers / first UI surface. See [[defer-singleton-data-ensureLoaded]].

---

## Unregistered Lucide icon aborts list `@for` CD

**What hurt:** Inventory (and any list using `app-row-actions-menu`) showed mostly empty rows (checkbox + ₪ only). Data was fine in the signal; `ng.applyChanges` filled every row. Hovering a nutrition badge “woke” a few more. Agents burned time on paint/`backdrop-filter` theories.

**Why the obvious fix is wrong:** Treating blank cells as a CSS compositing bug (or forcing `detectChanges` hacks) misses the console: Lucide throws `The "more-vertical" icon has not been provided` inside each row’s `RowActionsMenuComponent`. That exception **stops change detection mid-`@for`**, so later bindings never run. Tests can pass while the app is broken if `TEST_LUCIDE_ICONS` includes the icon but `app.config.ts` does not.

**What to do instead:** When list rows are blank but the store has data, open the console first for Lucide provider errors. Register every template icon in `LucideAngularModule.pick` in `app.config.ts` (see glossary **Lucide icon registration**). Keep test picks and app picks in sync when adding shared UI (e.g. `row-actions-menu`). Do not chase paint fixes until the console is clean.

---

## Gating a user action on a fire-and-forget side-write silently breaks it for some users

**What hurt:** `ai-recipe-modal.component.ts`'s "approve and go to recipe builder" button did nothing for non-admin accounts. `onDraftApproved()` only called `navigateToBuilder_()` inside the success callback of `saveShot()`, but `POST /api/v1/ai/shots` required `requireAdmin` — a 403 with no `.subscribe()` error handler silently swallowed the navigation. Render logs showed repeated `POST /api/v1/ai/shots 403` with no visible connection to the reported symptom ("button does nothing").

**Why the obvious fix is wrong:** Adding an error handler that also navigates on failure just hides the coupling — the next side-write added to that callback (analytics, notifications, whatever) reintroduces the same class of bug. The real problem is treating a background/curation write as a precondition for the primary user action at all.

**What to do instead:** Any write that exists to feed a secondary system (training data, analytics, audit log) must be fire-and-forget relative to the user-facing action — compute what the UI needs locally (here, `computeWarnings()` already existed client-side) and never gate navigation on the network call's result. `ai-menu-modal.component.ts` already had this right (apply first, `saveMenuShot(...).catch(() => {})` after); mirror that pattern for any future modal with a training-shot side-write.

---

## Route-resolved data read once in a field initializer goes stale across param-only navigation

**What hurt:** `VenueDetailComponent`'s `venue_` signal was initialized from `this.route.snapshot.data['venue']` in a field initializer. The `venueResolver` correctly re-runs and refetches on every navigation to `/venues/view/:id`, including param-only changes — but Angular's default `RouteReuseStrategy` reuses the component instance across those navigations (same route config, different `:id`), so the field initializer never re-ran and `venue_` stayed pinned to whichever venue loaded first.

**Why the obvious fix is wrong:** The bug was invisible in every manual test this session, because every reachable navigation path into this route goes through `/venues/list` first (a genuine route change, so Angular destroys/recreates the component). It only bites on a same-route param-only transition — a bookmark, browser back/forward across two venue URLs, or any future in-page "next venue" link — none of which existed yet to trigger it.

**What to do instead:** For any component that reads resolver data, use `toSignal(this.route.data)` (reactive) instead of `this.route.snapshot.data` (read-once) unless the route config is provably always destroy/recreate for every reachable navigation into it. See `venue-detail.component.ts`.

---

## Local per-page nav duplicates already-existing shared chip row

**What hurt:** Dashboard showed two identical contextual nav rows stacked on mobile (venues/metadata/suppliers/trash), and the extra row very likely also broke mobile page scroll. The prior Dashboard restyle session (commit 77695f2) brought `dashboard-overview.component.html`/`dashboard-header.component.html`'s own `.header-actions__nav` up to full design-token fidelity, never noticing `TabChipsComponent` (`src/app/core/components/tab-chips/tab-chips.component.ts`, mounted once in `app.component.html` above `<router-outlet>`) already renders the identical 4 destinations for the `dashboard` route group via `CHIPS_BY_GROUP`.

**Why the obvious fix is wrong:** Restyling the local nav to match the design pixel-for-pixel (which that session did correctly) still leaves the duplication — visual fidelity isn't the same question as "should this markup exist at all." A screen-scoped `/design-port` session that only reads the target screen's own component files, without checking `app.component.html`'s always-mounted children, will restyle a nav that should have been deleted.

**What to do instead:** Before restyling or building any per-page contextual nav, check `TabChipsComponent`'s `GROUP_BY_PATH_PREFIX`/`CHIPS_BY_GROUP` (`tab-chips.component.ts`) for whether the current route's group already has these destinations covered. If it does, delete the local nav instead of restyling it — the design source confirms this too: `shell.js` renders exactly one `<nav class="chips">` app-wide, and per-screen `.dc.html` files never contain their own `<nav>`. Only build a local nav for destinations that genuinely aren't in `CHIPS_BY_GROUP` for that route.

---

## Component-scoped SCSS can't reach styles.scss's $break-* breakpoint variables

**What hurt:** `metadata-manager.page.component.scss` needed a 768px/1023px breakpoint matching `header.component.scss`'s own tablet/desktop split exactly. `src/styles.scss` already defines `$break-mobile: 768px` and `$break-tablet-max: 1023px` — the obviously "correct" move per `docs/agent/conventions.md` ("use project tokens, never hardcode pixel breakpoints") is to reference those variables directly.

**Why the obvious fix is wrong:** `angular.json` has no `stylePreprocessorOptions.includePaths` and no shared `@use`/`@forward` setup between `src/styles.scss` and component-scoped `.scss` files — each component stylesheet compiles as its own isolated Sass module. Referencing `$break-mobile` from a component file fails to compile (undefined variable); it isn't a lint nitpick, it's a hard build error. `cell-carousel.component.scss` already hit this and worked around it by declaring its own local `$cell-carousel-break` with a comment noting the value "matches global $break-mobile" — i.e. the established mitigation is already duplication-by-convention, not actual sharing.

**What to do instead:** In component-scoped SCSS, hardcode the pixel breakpoint value and add a comment citing the canonical source (the styles.scss token name, or whichever component's own breakpoint you're matching) — do not attempt to `@use`/reference `$break-*` directly. If cross-file breakpoint sharing ever becomes a real need, the actual fix is adding a shared `@use` entry point, not fighting this per-component; flag that as a real (currently-undone) infrastructure gap rather than a documentation gap.

---

## CSS Grid `auto-fill` shares column-track widths across rows — squeezes mixed-length labels

**What hurt:** Inventory's filter-panel checkboxes (category/allergen groups) needed to pack densely on tablet/mobile so short labels (most allergens) sit several per row instead of one per row. First attempt used `display:grid; grid-template-columns:repeat(auto-fill, minmax(0, max-content)); grid-auto-flow:dense`. It compiled and built clean, but the Human immediately reported it unreadable — labels visibly cramped/cut off.

**Why the obvious fix is wrong:** `auto-fill` computes a fixed number of column tracks, and every track's width is shared across *all* rows at that column index — it isn't "size each item to its own content," it's "size each column to the widest item that ever lands in it, across the whole grid." When items vary a lot in natural width (a 3-character allergen next to a long category name), auto-placement can drop a wide item into a track sized for a narrower one, clipping its text. Nothing errors on this — it's a purely visual defect a build/test pass cannot catch.

**What to do instead:** For "pack chip-like items of varying width, wrap to the next line" layouts, use `display:flex; flex-wrap:wrap` — each flex item keeps its own natural content width independent of its neighbors, and simply wraps. Reach for CSS Grid dense-packing only when items are meant to share a uniform track size on purpose (e.g. a card grid); for free-width label/chip wrapping, flex-wrap is the correct default, not grid.

---

## Nested `overflow:auto` inside a `max-height`-capped grid row traps scroll instead of letting the page scroll

**What hurt:** `list-shell`'s tablet/mobile layout (shared by Inventory, Recipe Book, Suppliers, Equipment) capped `.list-container` at `max-height:90dvh` with a `1fr` grid row for the table area, while `.table-body` kept its own `overflow-y:auto` (needed for the desktop fixed-height widget). On tablet, opening the filter panel pushed content down, but the page could not scroll past the panel to reach the list below it — even though `.list-container` itself was set to `overflow:visible`.

**Why the obvious fix is wrong:** `overflow:visible` on the *outer* grid container does nothing to stop an *inner* element's own `overflow-y:auto` from claiming all vertical scroll input once that inner box's content exceeds its available height. A `1fr` row inside a `max-height`-bounded grid still computes a bounded height for that row — exactly the budget the inner `overflow:auto` box then scrolls internally instead of letting the outer page take over. Nothing throws or fails a test here; it silently traps input only on real devices at real widths.

**What to do instead:** When a grid layout needs to switch from "internal scroll region" (desktop, fixed-height widget) to "grows with the page" (mobile, page itself scrolls) at a breakpoint, change all three together: the container's height constraint (`max-height` → remove, use `auto`), the row sizing (`1fr` → `auto`, since there's no longer a fixed budget to fill a fraction of), and the previously-scrolling descendant's own `overflow` (`auto` → `visible`). Changing only the outermost `overflow` value is not sufficient on its own.

---

## `ngTemplateOutlet` doesn't inherit `[formGroup]` from the element it's outlet-rendered into <a id="ng-template-outlet-form-group"></a>

**What hurt:** Equipment's row-level inline-edit panel (`equipment-list.component.html`) rendered as a visibly empty box whenever a row's edit was opened — no console error surfaced in normal use, but the browser actually threw `NG01050: formControlName must be used with a parent formGroup directive` mid-render, which aborts that view's change detection the same way an unregistered Lucide icon does (see the entry above this file's earlier "Unregistered Lucide icon" gotcha) — the panel's outer box painted, its `formControlName`-bound fields never did. `[formGroup]="editForm_"` was set correctly on the wrapping `<div class="inline-edit-panel">`, and the form fields lived, in the rendered DOM, as visible descendants of that div — reached only via `<ng-container [ngTemplateOutlet]="panelBody">`.

**Why the obvious fix is wrong:** DOM nesting and Angular's dependency-injection view of a template are not the same thing. `<ng-template #panelBody>`'s content is compiled against the injector context of where the `<ng-template>` is *declared* in the source, not against wherever `ngTemplateOutlet` later projects its instantiated view. Since `#panelBody` was declared as a top-level sibling (outside any `[formGroup]`-bearing element), every `formControlName` inside it looks for a `ControlContainer` up its *declaration-site* ancestry — finds none — and throws, regardless of which real DOM element the outlet renders it into. Putting `[formGroup]` on the two outlet call sites (desktop inline, tablet/mobile modal) looks right and changes nothing.

**What to do instead:** Put `[formGroup]` (or any `ControlContainer`-providing directive) on an element *inside* the `<ng-template>`'s own declared content, not on the element(s) that `ngTemplateOutlet` renders it into. A `<ng-container [formGroup]="form">` wrapping the template's content works and adds no DOM node, so it can't break surrounding flex/grid layout. Reusing one `<ng-template>` from multiple outlet call sites (as here, for a desktop vs. tablet/mobile variant) makes this doubly worth checking — fix it once, inside the template, not once per call site.

---

## Global `HttpInterceptorFn` that unconditionally attaches `Authorization` breaks any direct-to-third-party `HttpClient` call

**What hurt:** `CloudinaryService.upload()` posts a `FormData` directly to `https://api.cloudinary.com/v1_1/.../image/upload` via Angular's `HttpClient`. Uploading a venue photo (mirroring the already-existing recipe-photo upload pattern) failed with a browser CORS error: `Request header field authorization is not allowed by Access-Control-Allow-Headers in preflight response`. Nothing in `CloudinaryService` itself looked wrong — it doesn't set an `Authorization` header at all.

**Why the obvious fix is wrong:** `authInterceptor` (`src/app/core/interceptors/auth.interceptor.ts`) is registered globally and unconditionally cloned every outgoing request with `Authorization: Bearer <token>` whenever a token existed — no URL filtering. Angular's `HttpClient` routes *every* request, including calls to third-party domains, through the same interceptor chain, so Cloudinary's request got the app's session token attached too. Cloudinary's CORS preflight doesn't allowlist `Authorization`, so the browser blocks the request before it ever reaches Cloudinary — this reads like a Cloudinary config problem, but it's entirely interceptor-side. The same bug already existed for the recipe-photo upload (identical `CloudinaryService` call site); it simply hadn't been exercised in a way that surfaced the error until this session's venue-photo upload.

**What to do instead:** A global auth interceptor must scope the token to requests targeting your own backend explicitly — e.g. `req.url.startsWith(environment.apiUrl) || req.url.startsWith(environment.authApiUrl)` — never attach it based on token presence alone. Any direct-to-third-party `HttpClient` call (upload providers, external APIs) will otherwise silently inherit your app's bearer token and can fail CORS preflight, or worse, leak the token to that third party if its CORS policy happens to allow the header.

---

## A form-rebuilt save payload silently drops any model field the form has no control for

**What hurt:** `menu-intelligence.page.ts`'s `save()`/`saveAndWait()` call `buildEventFromForm()` to construct the `MenuEvent` object it PUTs on save. A new feature (`app-venue-link-chip`) started writing to `MenuEvent.logistics_.venue_profile_id_` directly via `MenuEventDataService.updateMenuEvent()`, outside the page's own form/save cycle. The venue link would persist immediately, then vanish the next time the user hit the normal Save button — no error, just silently gone.

**Why the obvious fix is wrong:** `buildEventFromForm()` returns a brand-new object assembled field-by-field from `this.form_.getRawValue()` — it was never written to preserve fields the reactive form doesn't have a control for (`logistics_`, and also `cuisine_tags_`/`created_from_template_id_`). Spreading that object straight into `updateMenuEvent({...event, _id, updated_at_})` (a full PUT) means any field absent from the form's own shape gets silently dropped on every save, not just the new one — it looked like the new venue-link component had a bug, but the actual defect was in the pre-existing, unrelated save path, which had simply never mattered before because nothing had ever written to `logistics_` in the first place.

**What to do instead:** Before wiring a new writer to a field a page's own form-rebuilt save payload doesn't cover, check whether that save path reconstructs the object from form values (drops anything the form doesn't model) vs. patches the existing stored object (preserves everything by default). If it reconstructs, either add the field to the form, or explicitly merge it back in at each save call site from the currently-stored record before the PUT — don't assume "the object round-trips" just because the field itself saves correctly in isolation.

---

## A service that both `autoLoad`s in its constructor and exposes `reloadFromStorage()` double-fetches on every session bootstrap

**What hurt:** Network capture (`gstack browse network`) showed `PRODUCT_LIST` (739KB), `RECIPE_LIST` (1.69MB), `DISH_LIST` (2.6MB), and five smaller collections each fetched twice, back-to-back, on every page load — ~5MB of duplicate JSON per boot. Every copy returned 200; nothing errored, `ng build` stayed clean, no console warning.

**Why the obvious fix is wrong:** The instinct is to hunt for two separate call sites firing the fetch — but there's only one call chain. `UserService._reloadDataServices()` runs `this.injector.get(SomeDataService).reloadFromStorage()` after login/guest-auth resolves. `injector.get(...)` *constructs* the service in that same expression if nothing touched it yet, and the constructor immediately fires `void this.ensureLoaded()` — fire-and-forget, but it sets `this.loadPromise_` synchronously (an async function runs synchronously up to its first `await`). The very next statement on the same line then calls `.reloadFromStorage()` on that freshly-constructed instance — which, if it unconditionally resets `loaded_`/`loadPromise_` and starts a new load without checking for the one already in flight, races a second concurrent fetch against the first. Searching for a second `ensureLoaded()`/`reloadFromStorage()` call site elsewhere finds nothing, because there isn't one — it's one call site invoking two overlapping code paths.

**What to do instead:** Any `reloadFromStorage()` (or equivalent force-refresh method) on a service that also `autoLoad`s in its constructor must check for an in-flight load first and await it instead of starting a new one:
```ts
async reloadFromStorage(): Promise<void> {
  if (this.loadPromise_) { await this.loadPromise_; return }
  this.loaded_ = false
  this.loadPromise_ = null
  await this.loadInitialData()
  this.loaded_ = true
}
```
This preserves normal force-refresh behavior for the common case (called long after the initial load finished, `loadPromise_` is null) while closing the one narrow window — `injector.get()` on a not-yet-constructed service — where it actually races. Applied across `base-entity-data.service.ts`, `product-data.service.ts`, `recipe-data.service.ts`, `dish-data.service.ts`, `menu-event-data.service.ts`, `menu-section-categories.service.ts`, `preparation-registry.service.ts`, and `metadata-registry.service.ts` (plans 301 M4).

---

## Dev-mode "double-fetch" that isn't: HMR eagerly loads `@defer` blocks

**What hurt:** `KITCHEN_UNITS`/`EQUIPMENT_LIST` appeared to fetch twice on every page load under `ng serve`, surviving two separate investigation sessions and seven ruled-out code-level hypotheses (see plan 309 M1). The duplicate looked exactly like [[Login reload bypasses deferred constructor load]] — a service's own constructor load racing `_reloadDataServices()`'s unconditional `reloadFromStorage()` — but wasn't.

**Why the obvious fix is wrong:** `ng serve`'s console prints `NG0751` on every load once the app has `@defer` blocks: *"this application contains `@defer` blocks and HMR mode is enabled. All `@defer` block dependencies will be loaded eagerly."* That's not advisory text — it means normally-deferred component trees (modals, etc.) actually instantiate eagerly in dev mode, pulling in whatever services their constructors inject, on top of the constructor-time load that already ran. Chasing this as an application-code bug (race-guard logic, injection order, resolver coverage) burns time on something that was never reachable from the served code.

**What to do instead:** Before investigating any dev-mode-only fetch duplication, check the console for `NG0751`. If present, reproduce against a production build first (`ng build`, serve `dist/*/browser` — this repo's local Express server already does, at `:3000`) before touching any application code. If the duplicate doesn't reproduce there, it isn't a bug — stop.

---

## `cdk-virtual-scroll` is incompatible with the shared `.c-list-row` grid

**What hurt:** Plan 304 M3 called for adding `cdk-virtual-scroll` to `recipe-book-list` and `inventory-product-list` to cut rendered DOM nodes on large catalogs (2,000+ rows). Implementing it as literally specified would have silently misaligned every column on both pages, and on every other list page sharing the same engine class (`equipment-list`, `supplier-list`, `venue-list`, `menu-library-list`).

**Why the obvious fix is wrong:** Every list row uses `.c-list-row { display: contents; }` (`src/styles.scss`) — the row itself generates no box; its cells (`.c-list-body-cell`) become direct children of `.table-body`'s own CSS Grid (`grid-template-columns: var(--list-grid)`), which is what keeps columns pixel-aligned with the header across variable-height rows. `cdk-virtual-scroll-viewport`'s `*cdkVirtualFor` wraps each rendered item in its own real DOM element (`.cdk-virtual-scroll-content-wrapper` + per-item wrapper) — a box that can't be `display: contents` without breaking CDK's own positioning — so the cells would nest one level deeper than the header's grid expects, misaligning every column. `content-visibility: auto` has the identical problem: it needs the element it's applied to have a principal box, and `.c-list-row` deliberately has none.

**What to do instead:** For this row architecture, use pagination instead of virtualization — slice the already-computed row array (see `displayRows_()` → `pagedRows_()` in `recipe-book-list.component.ts` / `inventory-product-list.component.ts`) to ~50 rows and add Prev/Next controls (`.c-pagination-controls` engine class, `grid-column: 1 / -1` to span the row grid). Same DOM-size win, zero risk to the shared engine class. If virtualization is ever revisited, it requires first converting `.c-list-row` to a real per-row grid (`display: grid; grid-template-columns: var(--list-grid)`) with matching visual QA across every page that uses it — not a drop-in on one component.

---

## Empty `environment.apiUrl` makes `url.startsWith(apiUrl)` match everything

**What hurt:** `auth.interceptor.ts` decided whether a request was "our own backend" (and so should get the `Authorization` header) via `req.url.startsWith(environment.apiUrl) || req.url.startsWith(environment.authApiUrl)`. `environment.prod.ts` — the config `npm run build:render` actually uses — sets both to `''` for same-origin deployment. `''.startsWith('')` is always `true`, so on that build *every* request matched, including the direct browser→Cloudinary image-upload POST. Cloudinary's CORS policy rejects the `Authorization` header on that endpoint, so the browser silently killed the upload — and the calling components swallowed the error, so it just looked like uploads didn't work on Render, with no console signal pointing at the interceptor. Local dev and the remote/staging build have non-empty `apiUrl`, so neither reproduced it.

**Why the obvious fix is wrong:** Requiring `environment.apiUrl` to be non-empty before calling `startsWith` "fixes" the false-positive but reintroduces the opposite bug — on the very deployment that has an empty `apiUrl` *because* the API is same-origin, own-backend calls (relative URLs like `/api/v1/...`) would then wrongly fail the check and never get authenticated. The real defect is testing an absolute, cross-origin URL against a base string that can legitimately be `''`.

**What to do instead:** When "own backend" can mean same-origin with an intentionally empty base URL, don't rely on `url.startsWith(baseUrl)` alone. Check whether the request URL is relative (no `http(s)://` scheme) first — relative always means same-origin, so it's ours regardless of what `apiUrl` is configured to. Only fall back to `startsWith` matching against a *non-empty* configured base when the URL is absolute (third-party). See `src/app/core/interceptors/auth.interceptor.ts`'s `isAbsolute` check.
