# Plan 308 — Dead CSS Purge: Orphan Component Classes And Engine Blocks

## Goal

Delete all CSS that no template or TS file references — 14 global `.c-*` engines plus ~87 orphan component classes — without touching a single line of TypeScript or HTML.

## Files to check first

- `src/styles.scss` (2118 lines) — global engine layer
- `src/app/shared/ai-recipe-modal/ai-recipe-modal.component.scss` (590 lines) — largest concentration
- `src/app/pages/cook-view/cook-view.page.scss` (1694 lines)
- `src/app/pages/recipe-builder/recipe-builder.page.scss` (679 lines)
- `src/app/shared/rating-stars/rating-stars.component.ts:52` — read this first, it proves why `rating-stars--*` must survive
- `.claude/skills/cssLayer/SKILL.md` — the five-group rhythm rules that govern edits to `styles.scss`

## Atomic Sub-tasks

- [ ] (done, awaiting validation) `src/styles.scss` — deleted all 14 `.c-*` engine blocks, including dedicated header comments where they'd otherwise orphan. 2118 → 1878 lines.
- [ ] (done, awaiting validation) `src/styles.scss:21` — removed `.c-table-wrap` from the doc-comment engine list. Note: `.c-data-table` was never actually present on that line (plan text was inaccurate here) — nothing to remove for it.
- [ ] (done, awaiting validation) `ai-recipe-modal.component.scss:24` — split the compound selector, kept `.ai-prompt-panel {}`. 590 → 383 lines.
- [ ] (done, awaiting validation) `ai-recipe-modal.component.scss` — deleted all 23 dead blocks including the now-fully-dead "Draft preview structured layout" section header. Kept `.ai-draft-preview`.
- [ ] (done, awaiting validation) `cook-view.page.scss` — deleted all 15 blocks + hand-located `.cv-timer-icon` (was compound with `.cv-stopwatch-icon`). 1694 → 1532 lines.
- [ ] (done, awaiting validation) `recipe-builder.page.scss` — deleted all 11 blocks + hand-located `.icon-btn` (was `.export-bar-row .icon-btn`, compound). 679 → 513 lines. Verified `.qty-btn` nested inside deleted `.logistics-qty-controls` is safe to remove — it's Angular-scoped to this component only; the live `.qty-btn` in `recipe-ingredients-table`/`recipe-workflow` has its own separate definition, unaffected.
- [ ] (done, awaiting validation) Single-class orphans, all 11 files: `approve-stamp.component.scss` (all 3, including modifier reference at `&.stamped .approve-stamp__seal` and two media-query size overrides not explicitly itemized in the plan text but part of the same dead classes), `inventory-product-list.component.scss` (all 3), `recipe-book-list.component.scss` (both), `metadata-manager.page.component.scss` (both — `btn-save-small` had two separate rule blocks, both removed), `product-form.component.scss` (both), `trash.page.scss`, `version-history-panel.component.scss` (split compound selector, kept `.panel-empty`), `auth-modal.component.scss`, `menu-library-list.component.scss`, `ai-product-modal.component.scss` (split triple-compound selector, kept the other two), `export-toolbar-overlay.component.scss` (split compound selector, kept `.view-export-wrap`)
- [ ] (done, awaiting validation) `ng build`: passes, 0 errors, same 3 pre-existing warnings (no new ones). Global `styles-*.css`: 34,095 → 30,376 bytes (−3,719 B / −10.9%). Initial JS+CSS bundle: 654.73 kB → 650.91 kB. `cook-view.page.scss` inline budget: 24.52 kB → 22.14 kB over. (Component-scoped SCSS compiles into each component's JS chunk, not the global styles file, which is why the global-file delta is smaller than the ~1,300 total lines removed.)

## Discrepancies found vs. plan text (flagged, not auto-resolved)

- `recipe-builder.page.scss`: a second, unlisted reference to `.section-desc` survives at `&.is-collapsed .section-card-header .section-desc { margin-block-end: 0; }` (originally ~line 214) — now dead since its target class no longer exists in that scope, but the plan only named the base `.section-desc` block (162–165) for removal, not this modifier rule. Left in place, not removed.
- `recipe-builder.page.scss`: `.export-bar-label` (in the same `@layer` block as the deleted export-bar classes) shows 0 matches in `recipe-builder.page.html` — it appears equally dead within this component's scope — but the plan explicitly did not list it for deletion (unlike every sibling class in that layer, which it listed individually and precisely). Left in place per the plan's explicit scope, not removed.

## Addendum (2026-08-23) — same rules: SCSS only, zero .ts/.html, descending line order per file

Follow-up dead-CSS finds after the initial pass. Line numbers have shifted — locate by selector, not by number.

- [ ] (done, awaiting validation) `recipe-builder.page.scss` — removed `&.is-collapsed .section-card-header .section-desc` block, the remaining `.section-desc` block (under `.logistics-logic`), `.export-bar-label` (+ now-empty `@layer` wrapper), `.recipe-name-input` (split off a shared compound selector, kept `.section-card`). `.qty-btn` was already gone (removed in the original pass as part of `.logistics-qty-controls`) — nothing left to do. 513 → 490 lines.
- [ ] (done, awaiting validation) `recipe-workflow.component.scss` — removed `.icon-muted`, `.quantity-controls`, `.qty-btn` (base blocks + 2 dead media-query overrides referencing them).
- [ ] (done, awaiting validation) `cook-view.page.scss` — removed the second `.cv-phone-swap-hint` (a `display:block` media override for the class already deleted in the original pass).
- [ ] **NOT deleted — reverted after empirical check; needs your acknowledgment, not further action.** `unit-creator.component.scss` — `.custom-select-wrap` looked scoped-dead by the standard check (0 matches in unit-creator's own `.html`), but the rule is `:host .c-modal-body:has(.custom-select-wrap.open)`, and unit-creator embeds `<app-custom-select>` as a child. Checked the **compiled dist output**: Angular's emulated encapsulation does NOT scope the `:has()` argument with `[_ngcontent-xxx]` — the compiled selector is `.c-modal-body[_ngcontent-x]:has(.custom-select-wrap.open)`, unscoped inside `:has()`, so it genuinely matches the child `<app-custom-select>`'s internal `.custom-select-wrap.open` element. This is live z-index-stacking logic for when the dropdown opens. Deleted then restored verbatim — **the addendum's "scoped-dead" premise doesn't hold for `:has()` arguments.**
- [ ] **NOT deleted — flagged instead; needs your acknowledgment, not further action.** `recipe-book-list.component.scss` — `.header-actions` looked scoped-dead by the standard check (0 matches in recipe-book-list's own `.html`), but the rule is `:host ::ng-deep .header-actions .c-btn-primary` and recipe-book-list wraps its content in `<app-list-shell>`, which renders `.header-actions` at `list-shell.component.html:22`. `::ng-deep` explicitly pierces child encapsulation, so this rule is live (mobile full-width button styling at a container-query breakpoint). Left untouched — **same trap as above, this time via explicit `::ng-deep` rather than an unscoped `:has()`.**
- [ ] (done, awaiting validation) `menu-library-list.component.scss` — removed `.date-range-inputs` (plain nested selector, no `::ng-deep`/`:has()` — standard check valid).
- [ ] (done, awaiting validation) `product-form.component.scss` — removed `.form-input--no-focus-ring`; simplified `input:not(.form-input--no-focus-ring), select` → `input, select` since the excluded class can never match (plain selector, no `::ng-deep`/`:has()` — standard check valid).

**Verification-method correction:** the addendum's instruction to "grep only the owning component's own `.html`/`.ts`" is valid for plain nested selectors, but insufficient for `::ng-deep` rules and unscoped `:has()`/`:is()`/`:where()` arguments — both can reach into a child component's own encapsulated template. Two of seven targets fell into exactly this trap and were caught only by cross-checking `grep -rl <class> src/` for other definitions + checking whether the file embeds that component, then confirming against the actual compiled `dist` output where the `:has()` case was genuinely ambiguous from source alone.

## Second addendum (2026-08-23) — `recipe-workflow.component.scss` only, corrected verification method

Same rules: SCSS only, zero `.ts`/`.html`, descending line order. Targets (locate by selector, line numbers shifted):

- [ ] (done, awaiting validation) `.category-option-item` — all 4 checks passed, deleted (standalone top-level block)
- [ ] (done, awaiting validation) `.inline-category-picker-wrapper` — all 4 checks passed, deleted (standalone top-level block, adjacent to `.category-option-item`)
- [ ] (done, awaiting validation) `.amount-value` — all 4 checks passed, deleted. Nested inside `.prep-flat-grid`, which has other live siblings (`.grid-select`, `.selected-item-display`, `.clear-btn`, etc.) — parent stays, only the nested block was removed. 484 → 456 lines.
- [ ] (done, awaiting validation) `rating-stars.component.scss` — added the requested comment above `.rating-stars--sm` noting the runtime template-literal composition (`rating-stars.component.ts:52`) and that dead-CSS scans will always flag it incorrectly.
- [ ] (done, awaiting validation) Confirmed all "do not touch" items untouched by this addendum: `unit-creator` `.custom-select-wrap`, `recipe-book-list` `.header-actions`, `list-shell.component.scss`, `recipe-ingredients-table` `.custom-select-trigger`, `export-toolbar-overlay.component.scss`, `supplier-list` `.active`. Bonus check: re-verified `export-toolbar-overlay.component.scss`'s `ViewEncapsulation.None` risk against my *original* (session 2) deletion of `.checklist-export-wrap` from that same file — confirmed genuinely zero matches app-wide, that earlier deletion was safe. `.view-export-wrap` (kept) is the one actually relied on cross-component, by `recipe-builder.page.html` — good empirical confirmation the global-CSS risk is real, it just didn't apply to the class I removed.
- [ ] (done, awaiting validation) `ng build`: passes, 0 errors, same 3 pre-existing warnings (no new ones).
- [ ] (done, awaiting validation) `git diff --stat -- '*.ts' '*.html'`: empty.

**Self-caught mid-edit error:** my first attempt at deleting `.category-option-item` + `.inline-category-picker-wrapper` used a `new_string` that accidentally duplicated the preceding CDK block instead of removing the targets cleanly (an Edit-tool string-replacement slip, not a judgment error). Caught immediately by re-reading the file, fixed by removing the duplicate. Verified no duplicate remains and the file is back to a single copy of that CDK rule.

Do not touch `:host ::ng-deep` blocks in `list-shell.component.scss` or `recipe-ingredients-table.component.scss`. Do not touch `export-toolbar-overlay.component.scss` at all — `ViewEncapsulation.None`, its CSS is global.

## Rules

- Do not remove `rating-stars--sm`, `rating-stars--md`, `rating-stars--lg` — composed at runtime from a template literal in `rating-stars.component.ts:52`.
- Do not remove `cdk-drag-preview`, `cdk-drag-placeholder`, `cdk-drag-animating` in `recipe-workflow.component.scss`, `recipe-ingredients-table.component.scss`, or `ai-draft-editor.component.scss` — Angular CDK applies these at drag time, they will never appear in a template.
- Do not touch any `.ts` or `.html` file in this session. The dead members that pair with this CSS (`expandTimerInput`, `toggleExport`, `onClearDraft`, etc.) are session 3. Mixing them makes a visual regression indistinguishable from a compile break.
- Do not touch `src/app/shared/ai-recipe-modal/ai-draft-editor/ai-draft-editor.component.scss` — it is the live replacement for the parent's dead `ai-draft-*` rules. Its classes are in use.
- Delete whole blocks including the blank line that follows, so the five-group rhythm in `styles.scss` stays intact. No orphan blank runs.
- `.c-*` engines live only in `src/styles.scss` — do not relocate any of these rules into component SCSS as a "just in case." If a rule is dead, it goes.
- Work descending by line number within each file. Ascending edits invalidate every range below them.

## Done when

- `ng build` succeeds with no new warnings and the styles bundle is measurably smaller.
- Re-running the scan finds zero unreferenced `.c-*` classes in `src/styles.scss` (was 14).
- Manual click-through shows no visual change on: cook view (step list and export bar), recipe builder (header, logistics section, export controls), AI recipe modal (prompt panel, draft preview, status bar), inventory and recipe-book empty states, trash page, approve stamp, auth modal.
- `git diff --stat` shows changes confined to `.scss` files — zero `.ts`, zero `.html`.
