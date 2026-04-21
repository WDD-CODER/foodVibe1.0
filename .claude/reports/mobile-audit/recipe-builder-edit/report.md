# Mobile Audit — recipe-builder-edit
**Date:** 2026-04-20
**Viewport:** 375×812 RTL
**Route:** /recipe-builder/:id (IwOpL — recipe "כההה")
**Auditor:** Mobile Flow Auditor (subagent)

---

## Navigation Note

Direct URL navigation to `/recipe-builder/:id` redirects to `/` when the session token is absent (e.g., after visiting an external URL). The `recipeResolver` catches the failure and redirects authenticated users to `/recipe-builder` and guests to `/recipe-book`. Edit was only reachable by clicking a recipe row in `/recipe-book` — the `onRowClick` handler (not a button) triggers `onEditRecipe`.

Master-data recipes (userId `__master__`: FkqqUjjX, dRcubomz, etc.) failed to load via direct URL in the guest session. Only user-created recipes worked.

---

## Defects

### CRITICAL

None new. Cross-page critical confirmed:

- **[KNOWN] col-drag 0×0 — ingredient drag handles invisible/non-interactive**
  All `cdk-drag-handle.col-drag` elements measured 0×0. Dragging ingredients to reorder is impossible on mobile. Affects all ingredient rows.
  Screenshot: `shots/03-reorder-attempt.png`

---

### MAJOR

#### [NEW] M-01 — Ingredient search input collapsed to 30px width

**Severity:** Major
**Steps:** Open any recipe in recipe-builder → scroll to Ingredients section → observe search field per row.
**Observed:** Each ingredient search `<input placeholder="חפש מוצר או מתכון">` renders at **30px wide** (`overflow: clip`). The placeholder text needs ~150px. User cannot see what they are typing.
**Expected:** Input fills available column width (~150–180px).
**Screenshot:** `shots/02-added-ingredients.png`

#### [NEW] M-02 — "הוסף שורה" adds excess rows (9 added vs 5 clicks)

**Severity:** Major (needs manual verification)
**Steps:** Click "הוסף שורה" button 5 times with 500ms between clicks.
**Observed:** 9 empty ingredient rows created (10 total including original). DOM confirmed via `querySelectorAll` count of search inputs.
**Expected:** 5 new rows (6 total).
**Note:** May be a double-trigger artefact from JS `.click()` automation. Manual interactive test recommended to confirm.

#### [KNOWN] FAB wrong RTL side — confirmed present

FAB at x=8 (left edge of 375px viewport). RTL layout requires FAB on right edge.

---

### MINOR

#### [NEW] Mi-01 — P4: two unit dropdowns overlap at same viewport Y

**Severity:** Minor
**Steps:** Open yield unit dropdown (top of form) → click an ingredient unit dropdown.
**Observed:** Two `c-dropdown` elements at Y=702 and Y=767 — visually stacked in the lower viewport, making selection ambiguous.
**Expected:** Opening second dropdown dismisses the first, or second positions away from first.
**Screenshot:** `shots/04-yield-unit-p4.png`

#### [NEW] Mi-02 — Asymmetric drag handle sizing between sections

**Severity:** Minor
**Observed:** Step reorder handles (`col-drag-id`) measure **50×28** — functional. Ingredient reorder handles (`col-drag`) measure **0×0** — broken. The inconsistency creates unpredictable UX: steps appear draggable, ingredients do not.
**Screenshot:** `shots/03-reorder-attempt.png`

---

### CROSS-PAGE CONFIRMATIONS

| Issue | Status on this page |
|-------|-------------------|
| col-drag 0×0 | Confirmed |
| FAB wrong RTL side (x=8) | Confirmed |
| Ingredient search text truncated (30px) | Confirmed |

---

## Approve Stamp

Approve button at x=311, right=367, viewport=375. **Not clipping** (8px margin). Does not reproduce the clip-viewport issue reported elsewhere.

---

## Screenshots

| File | Description |
|------|-------------|
| `shots/01-baseline.png` | Recipe builder edit baseline load |
| `shots/02-added-ingredients.png` | After adding rows (9 added, search inputs 30px wide) |
| `shots/03-reorder-attempt.png` | Drag handles: step 50×28 visible, ingredient 0×0 |
| `shots/04-yield-unit-p4.png` | P4: two dropdowns overlapping at Y=702/767 |
| `shots/05-save-button.png` | Save button in footer |

---

## Summary

| Severity | New | Known Confirmed |
|----------|-----|-----------------|
| Critical | 0   | 1 (col-drag 0×0) |
| Major    | 2   | 1 (FAB RTL)      |
| Minor    | 2   | —                |
| Screenshots | 5 | — |
