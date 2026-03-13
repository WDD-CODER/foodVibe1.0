---
name: Translation and add-value flow
overview: Restore save-confirmation gatekeeper when leaving products (last step); implement add-time translation with editable Hebrew, "already on this product" messaging, and on-leave translation modal with three actions.
todos: []
isProject: false
---

# Translation and add-value flow (step-by-step)

## Critical: Save-confirmation gatekeeper (last step before leaving)

When editing products, the user **must** be asked to confirm saving the updated product **as the last step before leaving** – but only when there were **real** changes. Right now the save confirmation is being skipped (e.g. after the translation modal the user is sent straight to the list).

**Order:** The save-confirmation modal must run **last**, not first. So: handle translation (and any other checks) first; then, **right before allowing leave**, run the save-confirmation logic.

**When to show the confirmation:**

- **Do show** when the form has **real changes**: the current form state is different from the state when the user **entered** the item. That includes: name changed, new category/unit/allergen, translation added, any field changed and not reverted.
- **Do not show** when the form is effectively unchanged: e.g. user had category A, removed it, selected others, then selected A again so the form is back to how it was on entry. So "no real change" = current form value equals initial value (when they opened the item). In that case do not ask for confirmation.

So the guard needs to know "has the user actually changed the item?" – not just `form.dirty` (which can stay true even if they changed then changed back). The component should expose something like **`hasRealChanges(): boolean`** that compares the current form value to the **initial** value (snapshot when the form was loaded/hydrated). If the component doesn't provide it, fall back to `form.dirty` for backward compatibility.

**New order in the guard:**

1. **Translation check**  
   If the component has `getValuesNeedingTranslation`, get pending untranslated values. While there are any, show the translation modal (save / cancel / continue without saving). Only after that flow proceed.

2. **Other checks**  
   (e.g. `isSubmitted`, form disabled – allow leave without further prompts.)

3. **Save confirmation last (only when there are real changes)**  
   If the form has **real** changes (e.g. `component.hasRealChanges?.() ?? form.dirty`): show the confirm modal ("Leave without saving?").  
   - If the user chooses **No** (stay) → `return false`.  
   - If the user chooses **Yes** (leave without saving) → `return true`.  
   If there are no real changes, skip the modal and `return true`.

**Result:** Translation (and similar) is handled first. The **last** thing before leaving is the save-confirmation modal – and only when the form actually differs from the initial state. If the user reverted all edits (same state as on entry), no confirmation.

**Implementation note:** The product form (and any other component using the guard) should store the initial form value when the form is loaded/hydrated and implement `hasRealChanges(): boolean` (e.g. deep compare current `getRawValue()` to that snapshot). The guard interface extends with optional `hasRealChanges?: () => boolean`; guard uses `component.hasRealChanges?.() ?? form.dirty` to decide whether to show the confirmation.

---

## Current behavior (brief)

- **Units**: UnitRegistryService already: resolves Hebrew to key; if no key opens translation modal; then checks "already on this product" by resolved key and returns `alreadyOnProduct`; unit creator shows in-modal error and stays open.
- **Categories / allergens**: MetadataRegistryService resolves then opens modal if no key; no product-level "already on this product" check before adding (product form's addCategory only prevents duplicate by current.includes(cat)).
- **Translation modal**: translation-key-modal shows Hebrew as **readonly** when pre-filled. So the user cannot fix spelling in the add flow.
- **On-leave**: pending-changes.guard opens translation modal with two outcomes only (save or cancel); no "Continue without saving" and no stripping of untranslated values from the form.

---

## Part 1: Add-time flow (translate as soon as user adds a value)

### 1.1 Translation modal: editable Hebrew when adding (unit / category / allergen / supplier)

When the user adds a new value (e.g. unit "כפית") and we open the translation modal, the Hebrew field must be **editable** so they can fix spelling before saving. Change `isHebrewReadonly_` so the first field is readonly only in the on-leave context (`generic`). For `unit`, `category`, `allergen`, `supplier` leave it editable.

### 1.2 Keep add-time order: dictionary check then product check

Units already correct. Categories (product form): add an explicit "already on this product" message when the user tries to add a key that is already in categories_. Same for allergens.

---

## Part 2: On-leave translation modal – three actions

When the user tries to leave and there are untranslated values, the translation modal should have **three** actions: **Cancel**, **Continue without saving**, and **Save**. Extend TranslationKeyModalService to support the third outcome; in generic context show three buttons. Guard: when "continue without saving", call component `removeValuesNeedingTranslation()`, allow leave, show notification. Product form implements `removeValuesNeedingTranslation()`.

---

## Order of implementation (one by one)

0. **Critical: Save-confirmation gatekeeper (last step)** – In the guard: run translation check first, then at the **end** run the save-confirmation (only when there are **real** changes). Component exposes `hasRealChanges?(): boolean` comparing current form value to initial state; if form is back to that state, do not show confirmation.
1. **Part 1.1** – Translation modal: make Hebrew editable for add flows; keep readonly for generic/on-leave for now.
2. **Part 1.2** – Product form: "already on this product" message for category/allergen.
3. **Part 2.1–2.2** – Translation modal service and UI: third outcome "Continue without saving" and three buttons for generic.
4. **Part 2.3** – Guard and product form: removeValuesNeedingTranslation() and notification.

---

## Files to touch (summary)

| Area | Files |
|------|--------|
| **Save-confirmation last + hasRealChanges** | pending-changes.guard.ts, product-form.component.ts (initial snapshot + hasRealChanges()) |
| Modal editable Hebrew | translation-key-modal.component.ts |
| Product "already on product" message | product-form.component.ts |
| Three outcomes / on-leave UI | translation-key-modal.service.ts, translation-key-modal component |
| Dictionary | dictionary.json (new keys) |
| Guard + strip values | pending-changes.guard.ts, product-form.component.ts |
