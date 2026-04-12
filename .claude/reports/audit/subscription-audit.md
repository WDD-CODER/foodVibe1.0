# Subscription Audit — 2026-04-12

Scanned all `.subscribe(` calls in `src/app/**/*.component.ts`.
Decision rule: `.claude/fix-templates/manual-subscription.md` (category F3).

---

## Real Violations (need fixing)

| File | Line | Code | Recommended fix |
|---|---|---|---|
| `src/app/appRoot/app.component.ts` | 38 | `this.router.events.pipe(filter(...)).subscribe(event => {...})` | Add `takeUntilDestroyed()` to pipe — component has `inject(Router)` so injection context is already available |
| `src/app/core/components/hero-fab/hero-fab.component.ts` | 45 | `this.router.events.pipe(filter(...)).subscribe(setRoute)` | Add `takeUntilDestroyed()` to pipe — component has `inject(Router)` so injection context is already available |

---

## Discarded (false positives)

**Total discarded: 44**

### Reason: `takeUntilDestroyed()` in pipe chain (11)
| File | Line |
|---|---|
| `recipe-book-list.component.ts` | ~129 — `router.events.pipe(filter, takeUntilDestroyed()).subscribe()` |
| `venue-form.component.ts` | 85 — `route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe()` |
| `supplier-form.component.ts` | 94 — `route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe()` |
| `equipment-form.component.ts` | 70 — `route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe()` |
| `product-form.component.ts` | 249 — `route.data.pipe(takeUntilDestroyed).subscribe()` |
| `product-form.component.ts` | 261 — `unitAdded$.pipe(takeUntilDestroyed).subscribe()` |
| `product-form.component.ts` | 316 — `percentCtrl.valueChanges.pipe(takeUntilDestroyed).subscribe()` |
| `product-form.component.ts` | 326 — `yieldCtrl.valueChanges.pipe(takeUntilDestroyed).subscribe()` |
| `product-form.component.ts` | 612 — `unit_symbol_.valueChanges.pipe(takeUntilDestroyed).subscribe()` |
| `product-form.component.ts` | 650 — `conversion_rate_.valueChanges.pipe(takeUntilDestroyed).subscribe()` |
| `product-form.component.ts` | 661 — `show_special_price_.valueChanges.pipe(takeUntilDestroyed).subscribe()` |

### Reason: `take(1)` or `first()` in pipe chain (7)
| File | Line |
|---|---|
| `recipe-header.component.ts` | 153 — `unitAdded$.pipe(take(1)).subscribe()` |
| `quick-add-product-modal.component.ts` | 149 — `unitAdded$.pipe(take(1)).subscribe()` |
| `recipe-ingredients-table.component.ts` | 484 — `unitAdded$.pipe(take(1)).subscribe()` |
| `recipe-workflow.component.ts` | 150 — `unitAdded$.pipe(take(1)).subscribe()` |
| `product-form.component.ts` | 421 — `unitAdded$.pipe(take(1)).subscribe()` |
| `product-form.component.ts` | 438 — `unitAdded$.pipe(take(1)).subscribe()` |
| `product-form.component.ts` | 453 — `unitAdded$.pipe(take(1)).subscribe()` |

### Reason: HttpClient observable (completes automatically) (25)
| File | Lines | Methods |
|---|---|---|
| `ai-recipe-modal.component.ts` | 111, 187, 197, 260 | `shots.saveShot(...).subscribe()` ×4 |
| `recipe-book-list.component.ts` | 491, 659, 668, 677, 709, 720, 724, 737, 745, 759 | `kitchenState.saveRecipe/deleteRecipe/hideRecipe/permanentlyDeleteRecipe` ×10 |
| `recipe-ingredients-table.component.ts` | 508 | `kitchenStateService.saveProduct().subscribe()` |
| `product-form.component.ts` | 814 | `kitchenStateService.saveProduct().subscribe()` |
| `inventory-product-list.component.ts` | 412, 423, 463, 501, 510 | `deleteProduct/saveProduct` ×5 |
| `header.component.ts` | 53 | `userService.logout().subscribe()` |
| `auth-modal.component.ts` | 131, 136, 147 | `signup/login/loginAsGuestBackend().subscribe()` ×3 |

### Reason: Manual `ngOnDestroy` cleanup (1)
| File | Line | Note |
|---|---|---|
| `scaling-chip.component.ts` | 58 | `unitControl.valueChanges.subscribe()` stored in `private subscription`; `ngOnDestroy` calls `subscription?.unsubscribe()`. Explicit teardown present — technically older-style but correct. |

---

## Summary

- **Total scanned:** 46
- **Real violations:** 2
- **False positives:** 44 (95.7%)

### Violation breakdown by reason discarded
| Reason | Count |
|---|---|
| `takeUntilDestroyed()` | 11 |
| `take(1)` / `first()` | 7 |
| HttpClient (auto-completing) | 25 |
| Manual `ngOnDestroy` unsubscribe | 1 |
| **Total discarded** | **44** |

---

## Next Steps

Both violations are straightforward `takeUntilDestroyed()` additions.
Do NOT auto-fix — open a separate brief for each fix per the template's SAFETY rule.
