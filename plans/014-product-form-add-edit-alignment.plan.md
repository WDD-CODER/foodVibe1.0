---
name: Product form add vs edit alignment
overview: The add-product and edit-product views use the same component but differ in header height and top spacing, so the form content starts at different vertical positions. The plan unifies the header block and top spacing so both modes share the same alignment.
todos: []
isProject: false
---

# Product form: Add vs Edit layout alignment

## Current behavior

Both **Add Product** (`/inventory/add`) and **Edit Product** (`/inventory/edit/:id`) use the same component and template: [product-form.component.html](src/app/pages/inventory/components/product-form/product-form.component.html) and [product-form.component.scss](src/app/pages/inventory/components/product-form/product-form.component.scss). The parent is always [inventory.page.html](src/app/pages/inventory/inventory.page.html) (nav + `<router-outlet>`), so the difference is entirely inside the product form.

## Root causes of the layout difference

### 1. Header height is different

- **Edit mode:** Renders both a title and a subtitle:
  - `h2`: "עריכת מוצר: {{ name }}"
  - `p.subtitle`: "עדכון נתונים במנוע התמחור הרקורסיבי"
- **Add mode:** Renders only the title:
  - `h2`: "הוספת מוצר חדש למלאי"
  - No subtitle

So the header block is taller in edit mode. The form content (`.form-container`) starts lower on the edit page than on the add page.

### 2. Edit-only top border shifts content

In [product-form.component.scss](src/app/pages/inventory/components/product-form/product-form.component.scss), `.edit-mode` adds:

```scss
&.edit-mode {
  border-top: 6px solid #10b981; // Emerald-600 indicator
  background: #fff;
  ...
}
```

Add mode has no top border. So in edit mode the whole container (including the form) is shifted down by 6px relative to add, which reinforces the misalignment.

### 3. No reserved space for the subtitle in add mode

Because the subtitle exists only in edit, there is no consistent "slot" for that line. Any fix that relies on a fixed header height or a single structure for both modes will resolve this.

---

## Recommended changes

### 1. Unify header structure and height (HTML + SCSS)

- **Template:** Always render the same header structure in both modes. In add mode, show a subtitle line with add-specific text (or use translation key).
- **SCSS:** Give `.form-header` a `min-height` so that the header block height is the same in add and edit.

### 2. Unify top spacing

Apply the same 6px top strip in both modes. In add mode use the same emerald bar so the container has the same top offset and the form aligns with edit.

---

## Files to touch

| File | Change |
|------|--------|
| [product-form.component.html](src/app/pages/inventory/components/product-form/product-form.component.html) | Use one header structure for both modes (always include subtitle). |
| [product-form.component.scss](src/app/pages/inventory/components/product-form/product-form.component.scss) | Add `min-height` to `.form-header`; apply the same top strip to both add and edit. |

---

## Summary

- **Problem:** Edit has a taller header (title + subtitle) and a 6px top border; add has a shorter header and no top border, so the form content is misaligned between the two views.
- **Fix:** (1) Unify header structure and height (same DOM structure + `min-height` on `.form-header`). (2) Unify top spacing (same 6px strip in both modes). After that, add and edit will share the same alignment.
