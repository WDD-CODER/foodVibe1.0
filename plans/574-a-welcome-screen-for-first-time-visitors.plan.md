# Plan 574 — A welcome screen: a first-time visitor sees the promise and a way in, not an empty dashboard

Status: draft
Depends-on: 572
Snapshot: 4ba8887cc16eb5c1c3d3ccd4a0bbb9b63cb6c3c9

## Problem Statement
The product has no front door. This is step 3 of the "The Pass" theme board Dandan approved on 2026-11-10 ("Give it a
front door: one screen with the mark, the promise and the three rooms").

Verified on `origin/main` (4ba8887c, 2026-11-10):
- `src/app/app.routes.ts:245` `{ path: '', redirectTo: 'dashboard', pathMatch: 'full' }`; `:246` `{ path: '**', redirectTo: 'dashboard' }`. The `dashboard` route (`:218-224`) has no `canActivate`. No route uses `data`.
- A signed-out visitor on the live site (`environment.prod.ts`: `autoLoginGuest: false`) who opens `/` therefore gets the full dashboard with empty cards and a disabled "add product" button (`dashboard-overview.component.html:31-32`); nothing says what the product is or how to sign in except the small header link.
- `UserService` (`src/app/core/services/user.service.ts`): `isLoggedIn = () => this._user_() !== null` (line 48); the user and the token live in `sessionStorage` (`SESSION_USER_KEY`, `TOKEN_KEY`, lines 12-13), so a returning owner who opens a new tab is "signed out" until the silent `refreshToken()` of the constructor (lines 132-147) answers. `_saveUserLocal(user)` (line 381) is the one place a user is stored; `logout()` (line 339) clears it. In local and test builds `autoLoginGuest` is true and the app signs the dev guest in at start (`src/app/app.config.ts:137-149`).
- `AuthModalService.open(mode: 'sign-in' | 'sign-up' = 'sign-in', returnUrl?: string)` (`src/app/core/services/auth-modal.service.ts:14`); after a successful sign-in or sign-up the modal navigates to `returnUrl` when one was given (`auth-modal.component.ts:221-227`).
- `src/app/appRoot/app.component.html` always renders `<app-header />`, `<app-tab-chips />` and `<app-hero-fab />`. The header shows the mark and "foodCo" (`header.component.html:59-62`) and, signed out, a sign-in link. `HeroFabComponent` (`src/app/core/components/hero-fab/hero-fab.component.ts`) derives `isOnMenuIntelligence_` and `isOnRecipeBuilder_` from `router.url` in `setRoute()`; its template starts with `<div class="hero-fab-container" …>`.
- Icons `coins`, `chef-hat` and `utensils` are registered in `src/app/app.config.ts` and in `src/testing/test-lucide-icons.ts`.
- Dictionary keys `sign_in` ("התחברות") and `sign_up` ("הרשמה") exist in `general`; no key contains `welcome_` except `welcome_back`.
- Engine classes available: `.c-btn-primary` (`src/styles.scss:469`), `.c-btn-ghost` (`:509`), `.c-glass-panel` (`:459`); plan 572 adds `.c-pass-line` and `--color-lamp`.
- Pages are `src/app/pages/<x>/<x>.page.ts|html|scss|spec.ts`, class `<X>Page`; `src/app/pages/breadcrumbs.md` lists each page folder in a `| Entry | Purpose |` table and in its "Key exports" line.

## Goals & Success Criteria
**Primary:** a person who has never signed in on this device and opens the site's address sees one welcome screen
with the mark, the promise and two buttons; a person who has signed in before goes straight to the dashboard as today.

- [auto] `pnpm run test:ci` passes, including the new specs: `src/app/pages/welcome/welcome.page.spec.ts`, `src/app/pages/welcome/home-redirect.spec.ts`, `src/app/core/guards/welcome.guard.spec.ts`, `src/app/core/utils/returning-visitor.util.spec.ts`, the new `src/app/core/components/hero-fab/hero-fab.component.spec.ts` and the new cases in `src/app/core/services/user.service.spec.ts`.
- [auto] `src/app/pages/welcome/home-redirect.spec.ts`: signed out and not a returning visitor → `'welcome'`; signed out and a returning visitor → `'dashboard'`; signed in → `'dashboard'`.
- [auto] `src/app/core/guards/welcome.guard.spec.ts`: signed in → a `UrlTree` for `/dashboard`; signed out → `true`.
- [auto] `src/app/pages/welcome/welcome.page.spec.ts`: the page renders the text of `welcome_promise`, three room blocks and two buttons; the sign-in button calls `AuthModalService.open('sign-in', '/dashboard')` and the sign-up button calls `open('sign-up', '/dashboard')`; when the user signal becomes a user, `Router.navigateByUrl('/dashboard', { replaceUrl: true })` is called.
- [auto] `src/app/core/services/user.service.spec.ts`: after `_saveUserLocal(<a user>)` the returning-visitor mark is set; after `_saveUserLocal(null)` it is still set; after `logout()` it is cleared.
- [auto] `pnpm run build` passes and the initial bundle does not cross its 570 kB warning because of this plan (the page is a lazy route).
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run lint:icons` exits 0.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] In a private browser window on the live address (or a build with `autoLoginGuest: false`), opening `/` shows the welcome screen; it reads well on a phone and on a laptop, and the amber line sits under the promise.
- [human] From the welcome screen, signing in lands on the dashboard. After that, opening `/` in a new tab goes to the dashboard without showing the welcome screen. After "התנתקות", opening `/` shows the welcome screen again.

## Execution Mode
- Parallel: no — it rewrites one entry of `src/app/app.routes.ts` and edits `user.service.ts`.
- Concurrent plans: none that edit `src/app/app.routes.ts`, `src/app/core/services/user.service.ts` or `src/app/core/components/hero-fab/**`.
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/welcome/**
src/app/pages/welcome/welcome.page.spec.ts
src/app/pages/welcome/home-redirect.spec.ts
src/app/pages/breadcrumbs.md
src/app/core/breadcrumbs.md
src/app/core/guards/welcome.guard.ts
src/app/core/guards/welcome.guard.spec.ts
src/app/core/utils/returning-visitor.util.ts
src/app/core/utils/returning-visitor.util.spec.ts
src/app/core/services/user.service.ts
src/app/core/services/user.service.spec.ts
src/app/core/components/hero-fab/hero-fab.component.ts
src/app/core/components/hero-fab/hero-fab.component.html
src/app/core/components/hero-fab/hero-fab.component.spec.ts
public/assets/data/dictionary.json
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — `src/app/core/services/user.service.ts` is not under an INV-1 `Touches` glob, and the change adds only a device mark (no token, no user data, no permission): who may read or write what is decided by the server exactly as before.
- INV-none: preserves — one new public page with static text, one redirect choice and one guard; no data, schema or server change.

## Reuse Check

- `WelcomePage` — family: none — rung: 4 — why: no existing page is a signed-out landing screen; it composes existing engines (`.c-btn-primary`, `.c-btn-ghost`, `.c-glass-panel`, `.c-pass-line`) and adds no new `.c-*` class.
- `welcomeGuard` — family: none — rung: 4 — why: the existing guards send a signed-out visitor away (`authGuard`) or check a role; none sends a signed-in user away from a public page.
- `returning-visitor.util` — family: none — rung: 4 — why: no util records "this device has signed in before"; `panel-preference.util.ts` and `list-state.util.ts` store per-screen preferences under other keys.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef who was sent a link to foodCo, I want the first screen to tell me what it does and how to start so that I do not land on an empty dashboard.
- As an owner who uses the app every day, I want to land on my dashboard as before so that the welcome screen never gets in my way.

## Functional Requirements

### Must Have (P0)
- [ ] New `src/app/core/utils/returning-visitor.util.ts`: `const KEY = 'fv_returning'`; `markReturningVisitor(): void` (`localStorage.setItem(KEY, '1')`), `clearReturningVisitor(): void`, `isReturningVisitor(): boolean` (`=== '1'`). Every storage call is inside `try { … } catch { }`; `isReturningVisitor` returns `false` when storage throws. Spec covers set, clear, read and a throwing storage (spy on `Storage.prototype.getItem`).
- [ ] `src/app/core/services/user.service.ts`: in `_saveUserLocal(user)`, after the two existing lines, add `if (user) markReturningVisitor()`; in `logout()`'s `tap`, after `this.clearToken()`, add `clearReturningVisitor()`. Import both from `../utils/returning-visitor.util`. Nothing else in the file changes (the refresh-failure path calls `_saveUserLocal(null)` and must not clear the mark). Follow `.claude/skills/auth-and-logging/SKILL.md` before editing.
- [ ] New `src/app/pages/welcome/home-redirect.ts`: `export const homeRedirect = (): string => inject(UserService).isLoggedIn() || isReturningVisitor() ? 'dashboard' : 'welcome'`. Spec runs it with `TestBed.runInInjectionContext` and a stubbed `UserService` (`{ isLoggedIn: () => false | true }`).
- [ ] New `src/app/core/guards/welcome.guard.ts`: `export const welcomeGuard: CanActivateFn = () => inject(UserService).isLoggedIn() ? inject(Router).createUrlTree(['/dashboard']) : true`.
- [ ] `src/app/app.routes.ts`: add the imports of `welcomeGuard` and `homeRedirect`; add, directly before the `// Plan 535` comment line, the route `{ path: 'welcome', loadComponent: () => import('./pages/welcome/welcome.page').then(m => m.WelcomePage), canActivate: [welcomeGuard] }`; rewrite the entry `{ path: '', redirectTo: 'dashboard', pathMatch: 'full' }` to `{ path: '', redirectTo: homeRedirect, pathMatch: 'full' }`. The `**` entry stays. (Approved hotspot rewrite of that one entry: Human 2026-11-10, theme board step 3.)
- [ ] New page `src/app/pages/welcome/welcome.page.ts|html|scss and its spec`, class `WelcomePage`, selector `app-welcome-page`, standalone, OnPush, member order per `.claude/skills/angularComponentStructure/SKILL.md`:
  - injects `UserService`, `AuthModalService`, `Router`; imports `TranslatePipe`, `LucideAngularModule`.
  - `protected readonly rooms = [{ icon: 'coins', titleKey: 'welcome_room_office_title', textKey: 'welcome_room_office_text' }, { icon: 'chef-hat', titleKey: 'welcome_room_kitchen_title', textKey: 'welcome_room_kitchen_text' }, { icon: 'utensils', titleKey: 'welcome_room_table_title', textKey: 'welcome_room_table_text' }]`.
  - `protected signIn(): void { this.authModal.open('sign-in', '/dashboard') }` and `protected signUp(): void { this.authModal.open('sign-up', '/dashboard') }`.
  - constructor: `effect(() => { if (this.user.user_()) void this.router.navigateByUrl('/dashboard', { replaceUrl: true }) })` — a returning session that the silent refresh restores leaves the screen by itself.
  - Template (`dir="rtl"`): `<main class="welcome">` with (1) the mark `<img src="/assets/style/img/fc-mark.svg" alt="" width="56" height="56" />` and the name `foodCo` as plain text beside it; (2) `<h1 class="welcome__promise"><span class="c-pass-line">{{ 'welcome_promise' | translatePipe }}</span></h1>`; (3) `<p class="welcome__sub">{{ 'welcome_sub' | translatePipe }}</p>`; (4) two buttons: `<button type="button" class="c-btn-primary" data-testid="welcome-sign-up" (click)="signUp()">{{ 'welcome_start' | translatePipe }}</button>` and `<button type="button" class="c-btn-ghost" data-testid="welcome-sign-in" (click)="signIn()">{{ 'sign_in' | translatePipe }}</button>`; (5) `<ul class="welcome__rooms">` with one `<li class="c-glass-panel welcome-room" data-testid="welcome-room">` per room: `<lucide-icon [name]="room.icon" [size]="22" />`, `<h2>` title, `<p>` text; (6) `<p class="welcome__for">{{ 'welcome_for' | translatePipe }}</p>`.
  - Styles, mobile first, tokens and logical properties only, five-group order (`.claude/skills/cssLayer/SKILL.md`): `.welcome` is a centred column, `max-inline-size: 56rem`, `margin-inline: auto`, `padding-inline: var(--space-4)`, `padding-block: var(--space-8) var(--space-12)`, `gap: var(--space-6)`, `text-align: center`; the promise is `font-size: var(--fs-xl)`, `font-weight: var(--fw-extrabold)`, `line-height: var(--lh-tight)`, and `var(--fs-3xl)` from the tablet breakpoint (`$break-tablet: 900px; // mirrors src/styles.scss`); the sub line is `color: var(--color-text-muted)`, `font-size: var(--fs-md)`; the rooms list is one column on a phone and three equal columns from the tablet breakpoint, `gap: var(--space-4)`, no list bullets; each room is a column with `padding: var(--space-5)`, `gap: var(--space-2)`, `text-align: start`, icon `color: var(--color-primary)`, title `font-size: var(--fs-lg)`, text `color: var(--color-text-secondary)`; the buttons sit in a wrapping row with `gap: var(--space-3)`, centred.
- [ ] `src/app/core/components/hero-fab/hero-fab.component.ts`: add `readonly isOnWelcome_ = signal(false)` and, in `setRoute()`, `this.isOnWelcome_.set(url.startsWith('/welcome'))`. `hero-fab.component.html`: wrap the whole existing content in `@if (!isOnWelcome_()) { … }`. New `src/app/core/components/hero-fab/hero-fab.component.spec.ts` (the component has no spec today) with two cases: with `router.url` = `/welcome` the element `.hero-fab-container` is not rendered; with `/dashboard` it is. Stub `UserService` (`{ isLoggedIn: () => false }`) and provide `provideRouter([])`.
- [ ] `public/assets/data/dictionary.json`, section `general`, append: `welcome_promise` "שום דבר לא יוצא מהמטבח בלי בדיקה. גם לא המחיר.", `welcome_sub` "מתכונים, עלויות, אירועים והזמנות מספקים במקום אחד.", `welcome_start` "פתיחת חשבון", `welcome_for` "למסעדות, לקייטרינג ולשפים פרטיים", `welcome_room_office_title` "המשרד", `welcome_room_office_text` "תמחור מנות ואירועים, ורווח צפוי מול רווח בפועל.", `welcome_room_kitchen_title` "המטבח", `welcome_room_kitchen_text` "דפי הכנה, כמויות מדויקות ותצוגת בישול לצוות.", `welcome_room_table_title` "השולחן", `welcome_room_table_text` "תפריטים והצעות מחיר שהלקוח שלכם רואה.".
- [ ] `src/app/pages/breadcrumbs.md`: add the row `` | `welcome/` | `/welcome` — the signed-out front door: the mark, the promise, sign-up and sign-in; `/` leads here for a first-time visitor (`home-redirect.ts`) | `` and `WelcomePage` in "Key exports". The guard and the util go in the nearest existing map, `src/app/core/breadcrumbs.md`, one row each.

### Should Have (P1)
- none

### Nice to Have (P2)
- none

## UI/UX Notes
- Hebrew RTL; the name `foodCo` is Latin text and is not translated (the header does the same).
- The header stays on this screen (it carries the mark and the sign-in link); only the floating add button is hidden.
- Ten new dictionary keys (listed above). No new icons.
- Behaviour that is easy to leave unsaid: a signed-in user who types `/welcome` is sent to `/dashboard`; closing the sign-in window without signing in leaves the visitor on the welcome screen; deep links (`/recipe-book`, `/dashboard`) behave exactly as today for everyone; in local and test builds the dev guest is signed in at start, so `/` goes to the dashboard there.

## Atomic Sub-tasks

- [x] A1: Remember on the device that someone has signed in here, and forget it on sign-out — the util with its spec; two lines in the user service with three spec cases — src/app/core/utils/returning-visitor.util.ts, src/app/core/utils/returning-visitor.util.spec.ts, src/app/core/services/user.service.ts, src/app/core/services/user.service.spec.ts
- [x] A2: Decide where the site's bare address leads: welcome for a first-time visitor, dashboard for everyone else — the redirect function and the guard, each with its spec — src/app/pages/welcome/home-redirect.ts, src/app/pages/welcome/home-redirect.spec.ts, src/app/core/guards/welcome.guard.ts, src/app/core/guards/welcome.guard.spec.ts
- [x] A3: Build the welcome screen with the mark, the promise, two buttons and the three rooms — the page's four files — src/app/pages/welcome/welcome.page.ts, src/app/pages/welcome/welcome.page.html, src/app/pages/welcome/welcome.page.scss, src/app/pages/welcome/welcome.page.spec.ts
- [x] A4: Add the ten Hebrew texts of the welcome screen — public/assets/data/dictionary.json
- [x] A5: Connect the screen to the address bar — the welcome route and the one rewritten home entry — src/app/app.routes.ts
- [x] A6: Hide the floating add button on the welcome screen — one signal, one wrapper, one spec case — src/app/core/components/hero-fab/hero-fab.component.ts, src/app/core/components/hero-fab/hero-fab.component.html, src/app/core/components/hero-fab/hero-fab.component.spec.ts
- [x] A7: Record the new page, guard and util in the folder maps — src/app/pages/breadcrumbs.md, src/app/core/breadcrumbs.md
- [x] A8: Run build, lint, the icon lint, the unit tests, the breadcrumbs check and the log query, and paste the output lines under Execution Notes

## Technical Considerations
- Dependencies: `UserService`, `AuthModalService`, the header (unchanged), `.c-pass-line` (plan 572).
- New files needed: the four page files, `home-redirect.ts` + spec, `welcome.guard.ts` + spec, `returning-visitor.util.ts` + spec.
- Model changes: none
- Backend / API: none
- Auth and validation: no change to who is signed in or to any token. The mark `fv_returning` holds the single character `1`.
- Security surface: one non-secret flag in `localStorage`; it grants nothing — it only chooses which public screen `/` opens.
- Data / migration: none
- Project checks: log-query item present; keys named; icons already registered; RTL and logical properties; route file is a hotspot — one approved rewrite, the rest is additions.

## Out of Scope
- Hiding the header on this screen (plan 555 brings a general "bare page" mode).
- Sending a visitor to the welcome screen after sign-out (sign-out stays on the current page, as today).
- Changing what a signed-out visitor sees on `/dashboard` or any other deep link.
- Screenshots, a video or pricing on the welcome screen.

## Critical Questions
- Q: May the home entry of the `app.routes.ts` hotspot be rewritten? A: yes — Human 2026-11-10 approved the board's step 3; the entry keeps its path and only chooses between two targets.
- Q: Hebrew wording of the promise? A: the board's line, approved with the board: "שום דבר לא יוצא מהמטבח בלי בדיקה. גם לא המחיר." The other nine texts are the Planner's drafts and are a `[human]` check.

## Execution Notes
- Planner 2026-11-10: no `[ui]` card on purpose. The dev build signs the guest in at start, so a script cannot reach the signed-out state without blocking the sign-in requests; the unit specs cover each decision and the two `[human]` cards cover the real flow.
- Builder: `pnpm run build` → exit 0; `pnpm run lint` → exit 0 (0 errors); `pnpm run test:ci` → exit 0, TOTAL: 1894 SUCCESS; `pnpm run lint:icons` → exit 0; `node scripts/breadcrumbs-check.mjs` → exit 0, "BREADCRUMBS: clean" (row for welcome/ written without backticks around home-redirect.ts, which the check read as a stale entry); `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (SKIP: no database configured).
