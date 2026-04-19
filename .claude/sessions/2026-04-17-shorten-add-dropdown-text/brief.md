## Goal
Shorten "add new" dropdown option text in all dropdowns — display only "הוסף" + existing + icon instead of long dynamic strings that include the typed query name.

## Scope
- `src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.html`
- `src/app/pages/recipe-builder/components/preparation-search/preparation-search.component.html`
- `src/app/shared/chip-search-dropdown/chip-search-dropdown.component.html`

## Out of Scope
- `recipe-builder.page.html` add-new-tool row (no dynamic query appended, text is "הוסף כלי חדש" — shorter)
- `menu-intelligence.page.html` add-new rows (same, no dynamic query)
- Changing the lucide icon names or adding icons to components that don't already have them

## Success Criteria
- [ ] ingredient-search "add" row shows only "הוסף" + plus-circle icon (no query text in quotes)
- [ ] preparation-search "add" button shows only "הוסף" + plus icon (no query text after colon)
- [ ] chip-search-dropdown "add-new" row shows only "+ הוסף" (no addNewLabel text, no query text in quotes)
- [ ] dictionary key `"add": "הוסף"` is used consistently (already exists at line 605)
- [ ] No regressions in keyboard navigation or click behaviour

## Session ID
2026-04-17-shorten-add-dropdown-text
