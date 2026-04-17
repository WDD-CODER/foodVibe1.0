# AI Draft Editor — Design Spec
**Date:** 2026-04-17  
**Status:** Approved

---

## Goal

Replace the read-only AI recipe preview card in `AiRecipeModalComponent` (create mode) with a fully interactive editor. The user can edit all draft fields directly in the modal before approving and opening in the recipe builder.

---

## Approved Design Decisions

| Question | Decision |
|---|---|
| Which fields are editable? | All: name, type, yield, ingredients (name/amount/unit), workflow/steps |
| Interaction style | Always-edit form — all fields are inputs from the start, no click-to-activate |
| Unit fields | Creatable dropdown — app's known unit list + "add new" option (same pattern as rest of app) |
| Steps (preparation) | Add / remove / edit text — full CRUD |
| Preparation references (dish) | Add / remove / edit name+qty+unit — full CRUD |
| New ingredients in preview | No inventory lookup — they get a yellow "חדש" badge; unlinked resolution happens in the builder |
| Ingredient row highlighting | Hover only — no zebra striping |
| Scrollbar | Hidden (`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`) |
| Architecture | Extract `AiDraftEditorComponent` — modal owns generation, editor owns editing state |

---

## Architecture

### Existing: `AiRecipeModalComponent`
- Keeps all generation logic: prompt input, Gemini calls, error/status handling, usage bar, shot saving
- **Change:** when `draft_()` is non-null, renders `<app-ai-draft-editor>` instead of the read-only preview block
- `onDraftApproved(draft: AiRecipeDraft)` replaces `onOpenInBuilder()` — saves shot, calls `aiDraft.set(draft)`, navigates

### New: `AiDraftEditorComponent`
**Location:** `src/app/shared/ai-recipe-modal/ai-draft-editor/`

**Inputs / Outputs:**
```typescript
draft = input.required<AiRecipeDraft>()
approved = output<AiRecipeDraft>()
generateAgain = output<void>()
```

**On init:** deep-copies the input draft into local working-copy signals. Never mutates the original.

**Owns signals:**
- `name_` — string
- `type_` — `'dish' | 'preparation'`
- `yieldAmount_` — number
- `yieldUnit_` — string (only used when `type_ === 'preparation'`)
- `ingredients_` — `{ name: string; amount: number; unit: string; isNew: boolean }[]`
- `workflowItems_` — `{ text: string }[]` (instruction text for both types)

**On "Open in Builder":** assembles final `AiRecipeDraft` from signals, emits `approved`.  
**On "Generate Again":** emits `generateAgain` (no draft attached).

### Unchanged
- `AiRecipeDraftService` — receives final edited draft via `set()`
- `RecipeBuilderPage` / `RecipeAiFlowService` — consume draft via `consume()`, run inventory lookup, mark unlinked

---

## Type-Aware Behavior

### מנה (Dish)
| Field | Behavior |
|---|---|
| Yield | Number input + label "מנות" (unit locked, no dropdown) |
| Workflow section | "הכנות" — rows with: name text input + qty number input + unit creatable dropdown + delete button |
| Workflow hint | Info callout: prep names will show as unlinked in the builder |

Maps to builder: `serving_portions = yieldAmount_`, workflow rows → `preparation_name` in workflow FormArray

### הכנה (Preparation)
| Field | Behavior |
|---|---|
| Yield | Number input + creatable unit dropdown |
| Workflow section | "שלבי הכנה" — rows with: numbered step + textarea + delete button |

Maps to builder: `yield_conversions[0] = { amount, unit }`, workflow rows → `instruction` in workflow FormArray

---

## Ingredient Rows

Each row: `[name input] [amount number] [unit creatable dropdown] [× delete]`

- All existing AI-generated ingredients start with `isNew = false` (no badge)
- Ingredients added by the user in the preview get `isNew = true` → yellow "חדש" badge displayed inline inside the name input cell (e.g. as a small pill overlaid at the start of the field). The delete button is always present on every row including new ones.
- No inventory lookup occurs in preview — `isNew` ingredients will resolve to unlinked in the builder

---

## Unit Dropdown

Reuses the app's `CustomSelectComponent` with `[typeToFilter]="true"` and `[addNewValue]="'__add_unit__'"`. The existing `UnitRegistryService.allUnitKeys_()` provides the option list.

When "add new" is chosen: `TranslationKeyModalService` opens (same flow as the existing unit creation in recipe-header).

---

## Styling

- All inputs/selects use `.c-input` / `.c-select` engine classes
- Ingredient table: `border + border-radius` glass panel, uniform row background, teal hover tint
- Type toggle: displayed as a styled button (dish = sky blue tint, preparation = teal tint), clicking it toggles `type_` signal and resets `yieldUnit_` to `'gram'` if switching to preparation
- Scrollbar hidden: `scrollbar-width: none` (Firefox) + `::-webkit-scrollbar { display: none }` (Chrome/Safari)
- No new design tokens introduced — all existing CSS variables

---

## Files Affected

| File | Change |
|---|---|
| `src/app/shared/ai-recipe-modal/ai-draft-editor/ai-draft-editor.component.ts` | **NEW** |
| `src/app/shared/ai-recipe-modal/ai-draft-editor/ai-draft-editor.component.html` | **NEW** |
| `src/app/shared/ai-recipe-modal/ai-draft-editor/ai-draft-editor.component.scss` | **NEW** |
| `src/app/shared/ai-recipe-modal/ai-recipe-modal.component.html` | Replace read-only preview block with `<app-ai-draft-editor>` |
| `src/app/shared/ai-recipe-modal/ai-recipe-modal.component.ts` | Add `onDraftApproved()`, replace `onOpenInBuilder()` wiring |

No changes to: `AiRecipeDraftService`, `RecipeBuilderPage`, `RecipeAiFlowService`, `GeminiService`, server routes.

---

## Out of Scope

- Steps reordering via drag-and-drop (builder has this; preview keeps it simple)
- Secondary yield conversions (the `+` chip in recipe-header) — preview handles primary yield only
- "Minimum batch size" field — does not exist in the current data model
- Equipment section — present in `AiRecipeDraft` but not shown in the preview (low usage, builder handles it)
