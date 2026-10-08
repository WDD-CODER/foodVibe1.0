# QA Flow Table (Short + Page Ordered)

Use this order. For each save action, confirm spinner appears during save and disappears after.

## 1) Save Flow

| Step | Page | Action | Expected | Status | Issue |
|---|---|---|---|---|---|
| 1 | `/venues/new` | Fill name + environment, save | Loader shows, then navigates to venues list | Issue found | Duplicate venue name was allowed |
| 2 | `/suppliers/new` | Fill name, save | Loader shows, then navigates to suppliers list | Issue found | Duplicate supplier name was allowed |
| 3 | `/suppliers/:id/edit` | Change name, save | Loader shows, then navigates to suppliers list | Not done | Not tested yet |
| 4 | `/inventory/new` | Fill product fields, save | Loader shows, then navigates to inventory list | Not done | Not tested yet |
| 5 | Unit creator modal | Create unit, save | Loader shows, modal closes | Not done | Not tested yet |
| 6 | Recipe builder (any recipe) | Save recipe | Loader shows, then navigates to recipe book | Not done | Not tested yet |
| 7 | Cook view (any recipe) | Edit + save | Loader shows, exits edit mode | Not done | Not tested yet |
| 8 | Cook view (any recipe) | Toggle approve stamp | Loader shows, stamp toggles | Not done | Not tested yet |
| 9 | Menu Intelligence | Trigger save | Loader shows, save completes | Not done | Not tested yet |

## 2) Counter Flow (`app-counter`)

| Step | Page | Check | Status | Issue |
|---|---|---|---|---|
| 10 | Cook view (any recipe) | `- input +` works, typing updates, long-press accelerates | Not done | Not tested yet |
| 11 | Cook view (dish recipe) | Integer only, min `1` | Not done | Not tested yet |
| 12 | Cook view (preparation recipe) | Decimal steps `0.01`, min `0.01` | Not done | Not tested yet |
| 13 | Recipe builder -> Logistics | Tool quantity uses `- input +`, integer steps, min `1` | Not done | Not tested yet |
| 14 | Recipe builder -> Workflow (dish) | Prep row quantity uses `- input +`, cannot go below `0` | Not done | Not tested yet |

## 3) Regression Spot Check

| Step | Page | Check | Status | Issue |
|---|---|---|---|---|
| 15 | Recipe builder ingredients table | Qty +/- still updates amount and cost | Not done | Not tested yet |
| 16 | Cook view edit mode ingredients | Small +/- buttons still change amount | Not done | Not tested yet |
| 17 | Any list page bulk delete | Selection bar appears and delete works | Not done | Not tested yet |

## Clear Issue Explanation

### Done
- Duplicate-name validation check was executed for:
  - `/venues/new`
  - `/suppliers/new`

### Not done
- All other checks are still pending and marked `Not done`.

### Problem found
- **Duplicate names are currently accepted** on venue and supplier creation.
- **Why this is an issue**: it creates ambiguous records, can break search/filter behavior, and makes future edits/deletes error-prone because multiple items share the same identifier text.
- **Expected behavior**: save should be blocked when name already exists (case-insensitive + trimmed), and user should see a clear validation message.