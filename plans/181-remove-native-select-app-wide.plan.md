# Remove native select / default dropdown app-wide

## Audit result

- **Native `<select>`:** One occurrence only — auth-modal (dev-only “quick pick user” dropdown).
- **`<option>` / `datalist`:** Only the options inside that same `<select>`; no other native listbox/datalist usage.
- **Angular Material / mat-select:** None.
- **Custom dropdowns:** The app uses [CustomSelectComponent](src/app/shared/custom-select/custom-select.component.ts) everywhere else; it does not render a native dropdown.

---

## Implementation (executed)

### 1. Replaced auth-modal dev `<select>` with `app-custom-select`

- **auth-modal.component.html:** Native `<select>` replaced with `app-custom-select` (options from `devUserOptions_()`, placeholder `dev_users`, `[translateLabels]="false"`, `[compact]="true"`).
- **auth-modal.component.ts:** Added `CustomSelectComponent`, `devPickValue_` signal, `devUserOptions_` computed, `onDevUserPick(value: string)` that sets name, clears `devPickValue_`, and focuses password; `_reset()` clears `devPickValue_`.
- **auth-modal.component.scss:** Removed `.auth-dev-select`.

### 2. Cleaned up global select styles

- **styles.scss:** Removed `.c-grid-select` from the grid engine rule; only `.c-grid-input` remains (comment updated to “Grid Input”).

### 3. Prevention

- **scripts/check-no-native-select.mjs:** Node script that scans `src/**/*.html` for `<select` and exits 1 with file list if any found.
- **package.json:** Added `"lint:no-native-select": "node scripts/check-no-native-select.mjs"`. Run in CI or before commit to forbid new native selects.

---

## Summary

| Location              | Action taken                                      |
|-----------------------|---------------------------------------------------|
| Auth modal (dev only) | Replaced native `<select>` with `app-custom-select` |
| styles.scss           | Removed `.c-grid-select` from rule                 |
| Prevention            | `npm run lint:no-native-select` added              |

No native `<select>` remains in the app.
