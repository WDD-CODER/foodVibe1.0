Page: RB
Commit: abc1234
Status: partial          # the agent writes partial first, done only after the last check
Checks-done: RB-C01, RB-C02, RB-C03

### RB-C01 · code-verified · title and add button
- recipe-book.page.html:12 → `'recipe_book' | translatePipe` → dictionary.json general.recipe_book «ספר מתכונים»

### RB-C02 · suspect · S2 · save has no error message
- **Severity:** S2 · **Type:** FUNC
- **Expected:** a failed save shows «שגיאה בשמירה»
- **Code:** recipe-book-list.component.ts:210 `catch {}` swallows the error, no userMsg call

### RB-C03 · unknown · rating stars save
- needs a running app: the save goes through a debounced signal effect
