# toFix.md verification report (undone)

Status of each item in [public/assets/data/toFix.md](public/assets/data/toFix.md). **Plan name marked "undone"** — items below are not yet all done.

---

## Sign-in / Sign-up

| Item | Status | Notes |
|------|--------|--------|
| On load: move focus to input, show signed-up users in dropdown (dev only) | **Done** | [auth-modal.component.ts](src/app/core/components/auth-modal/auth-modal.component.ts): `effect` focuses `nameInput` when modal opens; dev dropdown uses `devUserOptions_()` when `isDevMode() && !isSignUp`. |
| User must have password; use crypt library to encrypt | **Done** | [auth-crypto.ts](src/app/core/utils/auth-crypto.ts): Web Crypto SHA-256 `hashPassword`/`verifyPassword`. [user.service.ts](src/app/core/services/user.service.ts): signup hashes password; login verifies. |
| On valid user + Enter: close container | **Done** | Form `(keydown.enter)="onSubmit()"`; `_onSuccess()` calls `modalService.close()`. |
| On error: show notice in red under relevant input | **Done** | `errorKey` set per case; [auth-modal.component.html](src/app/core/components/auth-modal/auth-modal.component.html): `auth-error` under name/password. |

---

## Recipe builder — Add-new-item (quick-add-title)

| Item | Status | Notes |
|------|--------|--------|
| Default base unit = **gram** | **Done** | [quick-add-product-modal.component.ts](src/app/shared/quick-add-product-modal/quick-add-product-modal.component.ts): `baseUnit_ = signal('gram')`. |

---

## Recipe view

| Item | Status | Notes |
|------|--------|--------|
| Format quantities locale-aware (e.g. 1,200 / 20,000) | **Done** | [format-quantity.pipe.ts](src/app/core/pipes/format-quantity.pipe.ts): `Intl.NumberFormat('he-IL')`. |
| Change measurement unit **before** applying multiplication | **Done** | Cook-view: unit select + conversion badge. |
| Align values in recipe list ingredients (top, per column) | **Unverified** | May need visual/layout check. |

---

## Recipe builder

| Item | Status | Notes |
|------|--------|--------|
| Persist open/closed state per container | **Done** | localStorage `rb_col_*` in [recipe-builder.page.ts](src/app/pages/recipe-builder/recipe-builder.page.ts). |
| Remove up/down arrows in the category title | **Not done** | Section headers still use chevron-down/chevron-up. |
| Quantity control: custom button with plus and minus | **Done** | `.quantity-controls` with `.qty-btn`. |
| Expandable containers: click anywhere on container | **Partially done** | Only when collapsed does card click expand; collapse by clicking card not implemented. |
| Drag and drop; reorder steps and update step numbers | **Done** | cdkDrag in ingredients + workflow; `onDropStep` sets order. |

---

## Maison Plus (menu-intelligence)

| Item | Status | Notes |
|------|--------|--------|
| Improve row style; quantity control; category before add + focus new row | **Unverified** / **Partially done** | Counter-pill present; rest need confirmation. |

---

## Application-wide — Category and unit dropdowns

| Item | Status | Notes |
|------|--------|--------|
| Audit dropdowns; add "add new" where applicable | **Done** | `__add_unit__` / `__add_category__` / `__add_new__` across app. |

---

## Logistics

| Item | Status | Notes |
|------|--------|--------|
| Chips grid: chip width fit content, full label visible | **Not done** | scaling-chip: no fit-content for long labels. |
| Search dropdown: Arrow Up/Down + Enter | **Done** | [custom-select.component.ts](src/app/shared/custom-select/custom-select.component.ts). |

---

## Add-item modal (equipment)

| Item | Status | Notes |
|------|--------|--------|
| Add new category → open modal immediately; quick save flow | **Done** | [add-equipment-modal.component.ts](src/app/shared/add-equipment-modal/add-equipment-modal.component.ts). |

---

## Labels / Menu builder / Recipe builder edit (Plan 147) / Dashboard / Activity / Lists / Add new category modal

See full verification report for per-item status. Summary of **not done or unclear**:

- **Recipe builder:** Remove chevron arrows; expandable: click anywhere to collapse.
- **Logistics:** Chips grid — chip width fit content.
- **Activity:** change-tag — show "from → to" values.
- **Add new category modal:** Two-case focus (Hebrew → English or prefill Hebrew + focus English) not implemented.
- **Unverified:** Recipe view alignment; Maison Plus; Labels selectability; Menu builder keyboard; Plan 147 items; Dashboard style/header; Activity scroll; Lists sidebar/allergen; Unit-creator focus on name when open.
- **Clarify:** metrics-square gram→volume (current code does not convert gram to 1ml).
