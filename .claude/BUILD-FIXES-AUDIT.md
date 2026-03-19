# Build failures – root causes and fixes

This document summarizes where the recent build/NG errors came from and how they were fixed, so you can see the pattern and fix similar issues.

---

## 1. Auth / User / session (Plan 062–style work, partially merged)

**What happened:** Routes and components were updated to use `authGuard`, `UserService.isLoggedIn()`, and auth UI (header, hero-fab, auth-modal), but some supporting code was missing or not merged.

| Error | Root cause | Fix |
|-------|------------|-----|
| `Could not resolve "./core/guards/auth.guard"` | Guard compiles only if its dependencies compile. `UserService` had no `isLoggedIn()` and `UtilService` had no session/storage helpers. | Added `UserService.isLoggedIn()`. Added `UtilService.LoadFromStorage()`, `LoadUserFromSession()`, `saveUserToSession()` and used them in `UserService`. |
| `'imgUrl' does not exist on type 'User'` | Auth-modal signup passes `imgUrl`; `User` interface had no such property. | Extended `User` in `core/models/user.model.ts` with optional `imgUrl?: string`. |
| `Property 'isLoggedIn' does not exist on type 'HeaderComponent'` | Template uses `isLoggedIn()`, `user_()`, `logout()`, `openAuth()` but the component did not expose them. | Injected `UserService` and `AuthModalService` in `HeaderComponent` and exposed `isLoggedIn`, `user_`, `userInitial`, `logout()`, `openAuth()`. |
| `Property 'isLoggedIn' does not exist on type 'HeroFabComponent'` | Template uses `isLoggedIn()` but the component did not expose it. | Injected `UserService` in `HeroFabComponent` and exposed `isLoggedIn` (bound from `UserService`). |

**Pattern:** Any template that uses `isLoggedIn()`, `user_()`, `logout()`, or `openAuth()` must get them from the right service and expose them on the component (or use a shared base/facade). Guard and services must be implemented so the guard’s dependency chain compiles.

---

## 2. Cell carousel `activeIndex` (NG8002)

**What happened:** Templates use `<app-cell-carousel [activeIndex]="carouselHeaderIndex_()">`. Angular only recognizes `activeIndex` if the component that uses `<app-cell-carousel>` imports `CellCarouselComponent` (and usually `CellCarouselSlideDirective`).

**Current state:**

- **Recipe-book list:** Imports `CellCarouselComponent`, `CellCarouselSlideDirective` – OK.
- **Equipment list:** Imports both and uses `[activeIndex]` – OK in code; if NG8002 still appears, try a clean build (`ng build` or delete `.angular/cache` and rebuild).
- **Supplier list:** Imports both and uses `[activeIndex]` – OK in code.

**Fix if NG8002 persists:** Ensure the component’s `imports` array includes `CellCarouselComponent` and `CellCarouselSlideDirective` from `'src/app/shared/cell-carousel/cell-carousel.component'`. No other schema (e.g. `NO_ERRORS_SCHEMA`) is needed.

---

## 3. Suppliers page – router and pipe (NG8002 / NG8004)

**What happened:** `suppliers.page.html` uses `[routerLink]`, `routerLinkActive`, and `translatePipe`, but `SuppliersPage` only imported `RouterOutlet`.

| Error | Root cause | Fix |
|-------|------------|-----|
| `Can't bind to 'routerLink'` | Template uses `routerLink` / `routerLinkActive`; they are not in the component’s `imports`. | Add `RouterLink` and `RouterLinkActive` from `@angular/router` to `SuppliersPage` `imports`. |
| `No pipe found with name 'translatePipe'` | Template uses `| translatePipe`; the pipe is not in the component’s `imports`. | Add `TranslatePipe` from `src/app/core/pipes/translation-pipe.pipe` to `SuppliersPage` `imports`. |

**Pattern:** Standalone components must list every directive and pipe used in their template in `@Component.imports`.

---

## 4. Quick reference – “template says X but component doesn’t”

| Template uses | Component needs |
|---------------|------------------|
| `isLoggedIn()` | Inject `UserService`, expose e.g. `isLoggedIn = this.userService.isLoggedIn.bind(this.userService)` |
| `user_()` | Expose `user_ = this.userService.user_` |
| `[routerLink]`, `routerLinkActive` | `imports: [..., RouterLink, RouterLinkActive]` |
| `| translatePipe` | `imports: [..., TranslatePipe]` |
| `<app-cell-carousel [activeIndex]="...">` | `imports: [..., CellCarouselComponent, CellCarouselSlideDirective]` |
| `canActivate: [authGuard]` | Guard file must exist and its dependencies (e.g. `UserService`, `UtilService`) must compile |

---

## 5. Suggested full check after pulling or merging

1. **Build:** `npx ng build`
2. **Search for template-only usage:** For each component that uses auth, carousel, or router/pipe, confirm the corresponding service/directive/pipe is imported and (for auth) exposed.
3. **Guards:** Open `app.routes.ts` and any guard file; ensure every guard’s imports and dependency types compile (e.g. `UserService`, `AuthModalService`, `UtilService`).
4. **Standalone imports:** For every standalone component, open its template and ensure every directive/pipe used there is in the component’s `imports` array.

This audit is under `.claude/BUILD-FIXES-AUDIT.md` for future reference.
