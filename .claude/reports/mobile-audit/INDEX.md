# Mobile Audit Index
**Last full run:** 2026-04-20
**Viewport:** 375×812 RTL

| Flow | Last run | Critical | Major | Minor | Report |
|------|----------|----------|-------|-------|--------|
| signup | 2026-04-20 | 0 | 3 | 2 | [→](./signup/report.md) |
| login | 2026-04-20 | 0 | 2 | 2 | [→](./login/report.md) |
| dashboard | 2026-04-20 | 0 | 2 | 2 | [→](./dashboard/report.md) |
| recipe-book-list | 2026-07-20 | 0 | 3 | 3 | [→](./recipe-book-list/report.md) |
| recipe-builder-new-prep | 2026-04-20 | 4 | 5 | 3 | [→](./recipe-builder-new-prep/report.md) |
| recipe-builder-new-dish | 2026-04-20 | 2 | 4 | 2 | [→](./recipe-builder-new-dish/report.md) |
| recipe-builder-edit | 2026-04-20 | 0 | 2 | 2 | [→](./recipe-builder-edit/report.md) |
| cook-view | 2026-04-20 | 1 | 3 | 3 | [→](./cook-view/report.md) |
| inventory-add-product | 2026-04-20 | 0 | 3 | 5 | [→](./inventory-add-product/report.md) |
| inventory-edit-product | 2026-04-20 | 2 | 3 | 2 | [→](./inventory-edit-product/report.md) |
| suppliers-add | 2026-04-20 | 0 | 2 | 2 | [→](./suppliers-add/report.md) |
| equipment-add | 2026-04-20 | 0 | 2 | 1 | [→](./equipment-add/report.md) |
| venues-add | 2026-04-20 | 0 | 2 | 3 | [→](./venues-add/report.md) |
| menu-intelligence-event | 2026-04-20 | 2 | 2 | 2 | [→](./menu-intelligence-event/report.md) |
| metadata-manager-all-tabs | 2026-04-20 | 0 | 2 | 4 | [→](./metadata-manager-all-tabs/report.md) |
| trash-restore | 2026-07-20 | 0 | 0 | 3 | [→](./trash-restore/report.md) |

---

## Totals

| Severity | Count |
|----------|-------|
| **Critical** | **11** |
| **Major** | **40** |
| **Minor** | **41** |
| **Total** | **92** |

---

## Top Systemic Issues (affect 8+ flows)

1. **FAB `left:8px` hardcoded** — wrong side in RTL across every page (should be `inset-inline-end:8px`)
2. **`col-actions: display:none` on mobile** — ingredient/prep-item delete button completely inaccessible in all recipe builder flows
3. **`col-drag: 0×0`** — drag reordering broken on all mobile ingredient rows
4. **Content scrolls behind sticky header** — no `padding-top` safe zone on page content wrappers
5. **Bottom nav covers bottom 56px** — no `padding-bottom` on scroll containers; content permanently hidden
6. **Dropdowns don't dismiss on Escape** — all ng-select / custom dropdowns affected
