# Plan 340 — Metadata: compact chips, tap-to-act menu, menu-type fields as toggle chips

Status: draft
Snapshot: acab8cff39fd0240f67af00439a8bd044c23889e

## Problem Statement

The metadata manager (`src/app/pages/metadata-manager/`) wastes space and is hard to use on touch.

- Product categories render as tall boxes. The `#managerCard` template's `[class]` ternaries (`metadata-manager.page.component.html:~246-257`) give `label-pool` / `label-pill` only to `label` and `course`. Categories fall through to `list-stack` / `list-item group`, and `.manager-card[data-type='category'] .list-stack` is a `minmax(115px, auto)` grid with two 2.25rem icon buttons per item.
- Edit and delete can't be seen on touch. `.c-icon-btn.danger` and `.btn-edit` stay `opacity:0` until `.list-item:hover`. This happens in the page scss and in `preparation-category-manager` / `section-category-manager`.
- Where the buttons do show, they make every item bigger.
- Dandan wants this: tap the chip → a small menu with edit / delete.
- Menu-type field pills are messy (`.menu-types-card`, `.menu-type-row`, `.field-pill`):
  - The order changes from row to row.
  - Clicking a pill deletes the field right away.
  - Editing switches to a separate checkbox list (`.field-checkboxes`, `onEditMenuType` / `toggleMenuTypeField` / `onSaveMenuTypeFields`).
  - Dandan wants chips, not checkboxes.

## Goals & Success Criteria

- Primary: every metadata item (units, categories, allergens, labels, courses, preparation categories and section categories) is a compact chip. Tapping one opens an edit/delete menu. No per-item buttons are always visible.
- Primary: each menu type shows all 5 `ALL_DISH_FIELDS` as toggle chips in a fixed order. Tapping a chip toggles it and saves.
- Success: user management keeps its delete action, admin only, as it works now (`UserManagementComponent.isAdmin`).

## Execution Mode

- Parallel: yes
- Concurrent plans: run after the toggle-chip engine plan (plan 339), because this plan uses `.c-toggle-chip`. No other plan touches `src/app/pages/metadata-manager/**`.
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

**Scope:**
- `src/app/pages/metadata-manager/**`
- `src/app/shared/row-actions-menu/**`

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

- As a chef managing metadata on my phone, I want small chips I can tap to edit or delete, so the whole list fits on the screen.
- As a chef, I want to see each menu type's fields at a glance and toggle them with one tap.

## Functional Requirements

### Must Have (P0)

- [ ] `RowActionsMenuComponent` gets a programmatic API: `open(anchor: HTMLElement)` and `close()`. Its positioning must work for any anchor, not only `.c-list-row`: fall back to the anchor's own rect and clamp to the viewport. Existing ⋮ trigger usage stays the same (inventory, recipe-book, suppliers, equipment). Note: `close()` is `protected` today, so make it public.
- [ ] `#managerCard`: every type renders as `label-pool` / `label-pill`. Delete the `.manager-card[data-type='category']` grid block. System units keep their lock badge and can't be tapped.
- [ ] Tapping a pill opens the actions menu anchored to it, with "ערוך" (calls `onRenameMetadata(item, type)`) and "מחק" (calls `onRemoveMetadata(item, type)`, which keeps the existing confirm). Remove the inline `.c-icon-btn` rename/delete buttons from pills at every width.
- [ ] Preparation and section category managers get the same pattern: chips plus the tap menu (`onStartRename` / `onRemove`). The existing `(dblclick)` rename stays as a desktop shortcut.
- [ ] Menu types: each `.menu-type-row` is the name (`.menu-type-key-input`, on its own line) plus a `.c-toggle-chip-group` of all 5 `ALL_DISH_FIELDS` in a fixed order. A chip is selected when its field is in `def.fields`. Tapping a chip saves through `MetadataRegistryService.updateMenuType(key, fields)`. Delete the separate checkbox edit mode (`.field-checkboxes`, the `onEditMenuType` toggle state, and `onSaveMenuTypeFields` if nothing else uses it). Deleting the menu type itself moves into the tap menu on its name.
- [ ] Remove every `opacity:0` + `:hover`-reveal rule for actions in this folder.

### Should Have (P1)

- [ ] Keyboard: the pill is a button (Enter opens the menu), and Escape closes the menu (already supported).

### Nice to Have (P2)

- None.

## UI/UX Notes

- Pills reuse the existing `.label-pill` look. The menu uses the row-actions-menu popover styling.
- Dictionary: reuse the existing `edit` ("עריכה") and `delete` ("מחיקה") keys. Both are already in `dictionary.json`, so don't add new `metadata_action_*` keys.
- RTL: the menu opens aligned to the pill's inline-start and stays clamped inside the viewport.

## Atomic Sub-tasks

- [ ] A1: Add `RowActionsMenuComponent.open(anchor)` / `close()` (public) and anchor-based positioning, with a spec. Verify the 4 existing list usages are unchanged. (`src/app/shared/row-actions-menu/**`)
- [ ] A2: Switch `#managerCard` to pills for every type and add the tap menu. Delete the category grid styles and hover-reveal rules. (`metadata-manager.page.component.*`)
- [ ] A3: Switch the preparation and section category managers to pills plus the tap menu. (`metadata-manager/components/**`)
- [ ] A4: Switch menu types to fixed-order toggle chips that save on toggle, and remove the checkbox edit mode. (`metadata-manager.page.component.*`)
- [ ] A5: Build and run the specs. Check on the phone at 360px. Update the session-state file.

## Technical Considerations

- Dependencies: `MetadataManagerPageComponent`, `PreparationCategoryManagerComponent`, `SectionCategoryManagerComponent`, `MetadataRegistryService` (`updateMenuType`, rename/delete methods), `ALL_DISH_FIELDS` (`core/models/menu-event.model.ts`), `.c-toggle-chip` (plan 339).
- New files: none.
- Model changes: none.
- User management already gates delete on `isAdmin()`. Its delete can become a tap menu on the user row or stay unchanged. It isn't required for the chip conversion.

## Out of Scope

- A long-press gesture (Dandan chose tap).
- Changing rename/delete semantics or master-push behavior.

## Critical Questions

- Resolved (Human, 2026-10-04): unselecting the last field of a menu type is **(a) allowed**. Saving 0 fields is fine and there's no blocking message.

## Success Criteria

- [auto] `rg -n "opacity: 0" src/app/pages/metadata-manager` → no action-reveal rules left.
- [auto] `npx ng test --watch=false --include=src/app/pages/metadata-manager/**/*.spec.ts --include=src/app/shared/row-actions-menu/**/*.spec.ts` → 0 failures.
- [auto] `npm run build` → exit 0.
- [human] Phone: Dashboard → מטה-דאטה. Categories, allergens, units and the rest show as small chips. Tap one → "ערוך / מחק" → rename works, and delete asks for confirmation.
- [human] Menu types: each row shows 5 chips in the same order. Tapping one toggles it; after a reload, the change is still there.
- [human] The inventory and recipe-book row ⋮ menus still work as before.
