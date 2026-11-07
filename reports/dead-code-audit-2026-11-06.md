# Dead Code Audit — 2026-11-06

- Snapshot: `origin/main` @ `f99816b3d37f6e0c555c79e7471f8761cbca0068` (2026-11-06 07:11 UTC)
- Scope: `src/`, `shared/schemas/`, `server/`, `scripts/`, `tools/`, `public/`, dependencies, tracked repo clutter.
- Out of scope: `plans/`, `docs/`, `.claude/` workflow content (not code; separate audit if wanted).
- Mode: report only — nothing was changed in the repo. Method and scripts: `dead-code-method.md` + `dead-code-toolkit.zip`.

## שורה תחתונה

הקוד של האפליקציה עצמה במצב טוב: אין קבצי קומפוננטות/שירותים יתומים, אין endpoints בשרת בלי קורא, השכפול נמוך (0.47%), וה-build נקי מ-imports לא בשימוש. המשקל המת נמצא בשלושה מקומות:

1. **סקריפטים שנכתבו נגד הסכמה הישנה (v1)** — כ-8,000 שורות ב-`scripts/`, `server/scripts/legacy-import/` ו-`tools/catalog-seeder/` שכותבות לאוספים שכבר לא קיימים (`PRODUCT_LIST`, `RECIPE_LIST`, `KITCHEN_LABELS`) או למודל ה-tenancy הישן (`userId`). חלקם אפילו מחוברים ל-`package.json` (`repair:*`).
2. **שאריות בתוך קבצים חיים** — 52 מתודות/שדות שאף קוד או template לא קורא להם, 16 נוספים שרק הטסטים קוראים להם, ו-9 exports מתים לגמרי. רובם מתו בפברואר–אפריל.
3. **דברים שנשלחים לפרודקשן בלי צורך** — 8 קבצי הערות `.md` וקובץ דמו ב-`public/assets/data/` שמוגשים לכל מי שגולש לאתר.

ממצא חשוב לתהליך: audit קודם (`techdebt-2026-09-16.md`, plan 311) כבר מצא חלק מאותם exports — והם עדיין כאן. הדוחות לא הפכו לתוכניות, ולכן לא נוקה כלום. הריצה השבועית צריכה להזין תוכנית, לא רק דוח.

## החלטות (2026-11-06, Dandan)

- אין חזרה לסכמה הישנה (v1): מוחקים את כל הסקריפטים והכלים של v1, וגם את אוספי ה-v1 ב-DB (אחרי גיבוי).
- מפתחות מילון שאין להם הפניה בקוד נשארים — אולי ישמשו בהמשך. המילון לא נכלל בניקוי.
- הניקוי מתבצע דרך שלוש תוכניות: סקריפטים וכלים (Tier A1, A5, A6), מחיקת אוספי v1 מה-DB, וקוד מת ב-client (Tier A2–A4).

## Tiers

| Tier | משמעות | פעולה |
|---|---|---|
| A | מת בוודאות — אפס קוראים, ראיה ברורה | למחוק, להריץ את שער האימות |
| B | מת אבל יש לו טסטים, או שרשרת שצריך לאשר ב-UI | למחוק קוד + טסט, לבדוק ב-UI |
| C | תלוי בנתונים או בהחלטה שלך | לבדוק / להחליט לפני נגיעה |
| D | קוסמטי — `export` מיותר על סמל שבשימוש פנימי | לא עכשיו |
| KEEP | נראה מת לכלי, אבל חי | לא לגעת (רשימה למטה) |

---

## Tier A — למחוק

### A1. סקריפטים קשורים ל-v1 (שבורים מול הסכמה הנוכחית)

ראיה: migration `0001-v2-schema.js` שינה `PRODUCT_LIST → products`, `RECIPE_LIST → recipes`, `DISH_LIST → dishes`; `0004` מחק את אוספי ה-registry (`KITCHEN_*`); `server/utils/v1-only-guard.js` חוסם במכוון חלק מהסקריפטים מאז plan 321; ADR 0008 מתאר את `legacy-import/` כ"patch scripts" שהרפקטור בא להחליף.

| קבצים | שורות | ראיה |
|---|---|---|
| `scripts/backup-before-repair.mjs`, `diagnose-broken-refs.mjs`, `repair-recipe-references.mjs` + שלושת ה-npm scripts `repair:backup`, `repair:diagnose`, `repair:refs` | ~380 | קוראים/כותבים `PRODUCT_LIST`/`RECIPE_LIST`/`DISH_LIST`. מחוברים ל-`package.json` אבל לא יכולים לעבוד |
| `scripts/fix-duplicate-names.mjs`, `merge-labels.mjs`, `audit-labels.mjs`, `migrate-labels-to-courses.mjs` | ~1,080 | אוספי v1 + `KITCHEN_LABELS`/`KITCHEN_COURSES` שנמחקו ב-0004. plan 320 הסתיים |
| `scripts/migrate-to-master.mjs`, `link-users-to-master.mjs` | ~285 | זוג migration חד-פעמי של אפריל, אי מבודד (מפנים רק אחד לשני) |
| `scripts/trim-demo-data.mjs` | 136 | קורא `demo-*.json` שכבר לא קיימים ב-`public/assets/data/` |
| `scripts/remove-trailing-semicolons.mjs` | 78 | codemod חד-פעמי (אפריל); `pre-commit-no-semi.mjs` אוכף היום |
| `server/scripts/legacy-import/**` (17 קבצים כולל `lib/` ו-`source-data/README.md`) | 3,403 | תיקוני נתונים ישנים ל-v1 (לא מנגנון ה-rollback). 7 מהם חסומים ב-`v1-only-guard`. אחרי המחיקה גם `server/utils/v1-only-guard.js` מת (שרשרת) |
| `server/scripts/migrate-supplier-ids.js`, `fix-supplier-refs.js` | 140 | חסומים ב-`v1-only-guard` |
| `tools/catalog-seeder/**` (14 קבצים, Python) | 2,552 | `COLLECTION = "PRODUCT_LIST"` ב-`config.py`; אחרון שינוי 2026-04-26 |

### A2. קבצים ו-exports מתים ב-client

- `src/app/core/utils/id.util.ts` — קובץ שלם בלי importers מאז `5512ea1a` (2026-10-05, TaxonomyStore cutover). הערה: הוא נוצר כ"מחולל id יחיד" ב-plan 321, אבל `UtilService.makeId()` נשאר וגם הוא מת (A3).
- exports בלי שום שימוש (גם לא פנימי):
  - `excel-workbook.util.ts`: `styleExcelBlankRow`, `styleExcelBlockBorder`
  - `auth-crypto.ts`: `verifyPassword` + ענף ה-"Legacy SHA-256" שבתוכו (אימות סיסמה עבר לשרת)
  - `export.util.ts`: `formatExportNumber`
  - `list-state.util.ts`: `DateFieldParam`
  - `product-price.util.ts`: `getProductUnits`
  - `shared/schemas`: הטייפים `ReceiptPhotoRequest`, `BusinessBaseline`, `SchemaCollection`

### A3. מתודות ושדות שאף קוד או template לא קורא להם (52)

קבוצות שהן בעצם פיצ'ר שהוסר והקוד נשאר:
- **עריכת מחיר inline ברשימת המוצרים** — `inventory-product-list.component.ts`: `onPriceFocus`, `onPriceBlur`, `onPriceChange`, `lastPriceEdit_`, `savingPriceId_`, וגם `sortIconFor_`.
- **בורר קטגוריה ב-workflow** — `recipe-workflow.component.ts`: `shouldShowAddCategoryPicker_`, `toggleAddCategoryPicker`, `onAddWithCategory`, `onLaborTimeKeydown`, `onCookTimeKeydown`.
- **מקלדת/הקלדה ב-yield** — `recipe-yield-manager.util.ts`: `onAmountManualChange`, `onPrimaryAmountKeydown`, `onSecondaryAmountInput`, `onSecondaryAmountKeydown`.
- **ערכים לתרגום בטופס מוצר** — `product-form.component.ts`: `getValuesNeedingTranslation`, `removeValuesNeedingTranslation`, `allergenOptions_`; וב-`translation.service.ts`: `hasKey`, `updateInternalDictionaries` (private).

בודדים: `base-entity-data.service.ts` `setItems` · `conversion.service.ts` `getChainConversion` · `cook-view-state.service.ts` `clearLastViewed` · `metadata-registry.service.ts` `reloadLabelsFromStorage`, `reloadCoursesFromStorage` · `preparation-registry.service.ts` `getPreparationsByCategory_` · `product-data.service.ts` `getProductById` · `user.service.ts` `currentUser`, `_clearSessionStorage`, `_getLoggedInUser` · `util.service.ts` `makeId` · `cook-view.page.ts` `replaceIngredient`, `toggleStepPeek` · `product-import.component.ts` `maxRows` · `event-stage-bar.component.ts` `canEdit_` · `menu-intelligence.page.ts` `isEditingDishField` · `menu-library-list.component.ts` `getSectionCount`, `getDishCount` · `recipe-header.component.ts` `hasManualLabels_`, `onPrimaryUnitChangeWrapper` · `recipe-ingredients-table.component.ts` `focusUnitAtRow`, `onUnitKeydown`, `getGrossWeight` · `venue-form.component.ts` `equipmentName` · `venue-list.component.ts` `envTypeLabel` · `ai-recipe-modal.component.ts` `onClearDraft`, `translateUnit` · `list-selection.state.ts` `someSelected` · `rating-stars.component.ts` `hoveredIndex` · `scaling-chip.component.ts` `customSelect` · `menu-ai-flow.service.ts` `menuSectionCategories_` (inject שלא בשימוש).

רשימה מלאה עם שורות: `members.tsv` בתוך ה-toolkit.

### A4. נשלח לפרודקשן בלי סיבה

`public/` מועתק כולו ל-build (`angular.json` → `glob: **/*`), אז הקבצים האלה מוגשים לכל גולש. אומת ב-`dist/food-vibe1.0/browser/assets/data/`:
- `Ideas.md`, `project-plan.md`, `toFix.md`, `step2-1280px.md` … `step6-360px.md` (8 קבצי הערות פנימיים, פברואר–אפריל)
- `demoProducts.json` (אפס הפניות בקוד)

אם ההערות עוד רלוונטיות — מקומן ב-Drive או ב-`notes/`, לא ב-`public/`.

### A5. dependencies

- `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser` — כפולים: `eslint.config.mjs` מייבא רק את `typescript-eslint` (שמביא אותם בעצמו).
- `autoprefixer`, `postcss` — אין `postcss.config` ואין import; ה-builder של Angular מביא גרסאות משלו.
- אימות חובה אחרי הסרה: `pnpm lint`, `ng build`, `ng test` (ראה KEEP — ה-`platform-browser-dynamic` כבר נכשל ככה פעם).

### A6. זבל ב-git

קבצים שנמצאים ב-git למרות שה-`.gitignore` מתעלם מהם (17): `.superpowers/brainstorm/**` (10), `.playwright-mcp/**` (2), `entities.json`, `.claude/sessions/*` (3). לא כולל `server/.env.example` (מכוון). פעולה: `git rm --cached`.

---

## Tier B — למחוק יחד עם הטסטים / לאשר ב-UI

- **קוד שרק טסטים קוראים לו (19)** — הטסטים נותנים תחושת כיסוי לקוד שאף אחד לא מריץ:
  `conversion.service.ts` `calculateNetCost`, `getWasteQuantity`, `getWastePercent` · `menu-intelligence.service.ts` `computeFoodCostPct`, `computeEventIngredientCost` · `metadata-registry.service.ts` `purgeGlobalUnit` · `taxonomy-store.service.ts` `reorder`, `allTerms_` · `client-data.service.ts` `updateClient` · `trash.service.ts` `hasAnyTrash` · `product-data.service.ts` `allTopCategories_` · `activity-log.service.ts` `activityLog_` · `user.service.ts` `businessRole_` · `recipe-yield-manager.util.ts` `updatePrimaryAmount`, `updateSecondaryAmount` · `unit-creator.component.ts` output `unitSaved` · exports `selectableStages`, `formatVenueHoursLines`, `REGISTRY_KIND_BY_COLLECTION`.
  לבדוק לפני מחיקה: `updateClient` ו-`reorder` נשמעים כמו API שתוכנית פתוחה (CRM, plan 514) אולי מתכננת להשתמש בו.
- **שרשרת "Menu info" export** — `menu-intelligence.page.ts` `onViewMenuInfo`/`onExportMenuInfo` מתים, ולכן גם הענף `if (type === 'menu-info')` (שורה 969) לא נגיש, וגם `export.service.ts` `exportMenuInfo`/`getMenuInfoPreviewPayload` ו-`menu-export.service.ts` (שורות ~49–100, ~182+). לאשר ב-UI שאין כפתור "מידע תפריט" בייצוא.
- **טסט יתום** — `scripts/lib/remote-proxy.test.mjs` לא נכלל ב-glob של `test:scripts` (`scripts/test/*.test.mjs`) ולכן לא רץ אף פעם. להעביר ל-`scripts/test/` או למחוק.
- **`html2canvas`** — `scripts/qa/evidence-server.mjs` משתמש ב-`html2canvas-pro` ונופל ל-`html2canvas` רק אם ה-pro חסר. אפשר להשאיר רק את ה-pro.

---

## Tier C — החלטות שלך / תלוי נתונים

1. ~~rollback ל-v1~~ — הוחלט: אין חזרה. אוספי v1 נמחקים מה-DB (migration 0010).
2. **shims לשדות legacy ב-client** — `product-data.service.ts` (`category`, `is_dairy_`, `supplierId_`, `buy_price_global_`), `dish-data.service.ts` (`mise_categories_`), שדות `@deprecated` ב-`product.model.ts`, `menu-event.model.ts` (plans 440/445), `equipment.model.ts` (`ScalingRule`, plan 338). הם מתים רק אם אין יותר מסמכים ב-DB עם השדות האלה. בדיקה: `node server/migrations/tools/field-inventory.js` מול ה-DB האמיתי.
3. ~~מילון~~ — הוחלט: לא מוחקים מפתחות. לתיעוד: מתוך 1,583 מפתחות ב-`dictionary.json`: ‏157 (`general` 144, `actions` 13) בלי שום הפניה בקוד; 46 נוספים אולי נבנים דינמית (`prefix_${x}`). בדגימה של 12 — רובם הוסרו מהקוד בפברואר–אוקטובר. 18 ערכים בקבוצות `preparation_categories`/`section_categories` תלויים בנתונים ב-DB. `dictionary.json` הוא hotspot append-only, אז הניקוי צריך תוכנית משלו עם scope בלעדי.
4. **סקריפטי master ישנים** — `scripts/promote-guest-to-master.js`, `push-master-to-atlas.js` (אפריל) עובדים לפי `userId: '__master__'`, בעוד ש-INV-2 מגדיר היום master לפי `businessId`. האם אתה עוד משתמש בהם?

גם כן כאן, אבל לא דחוף: `kit-extract.mjs` / `kit-lessons-extract.mjs` (לא מחוברים לשום דבר — האם הוחלפו בזרימת ה-kit-sync של ADR 0021?), `ROUTE_INVENTORY.md` ו-`.qa-reports/` (אפריל, בלי הפניות), `prettier` (יש `.prettierrc.json` אבל שום script לא מריץ אותו), והכינוי `isAdmin_` ב-`user.service.ts` שמסומן `@deprecated` אבל עוד בשימוש ב-8 קבצים (מיגרציה ל-`isPlatformAdmin_`, לא מחיקה). `chip-search-dropdown` מסומן `@deprecated` (ADR 0025) ומשמש רק את `product-form` (3 מופעים) — יימחק אחרי מעבר ל-`custom-multi-select`.

---

## Tier D — exports מיותרים (קוסמטי)

68 סמלים מיוצאים אבל בשימוש רק בתוך הקובץ שלהם (55) או בקובץ + טסט (13). בעיקר `excel-workbook.util.ts` (7), `export.util.ts` (5), `parsed-result.model.ts` (5), `logistics.model.ts` (5). בצד השרת: 27 כאלה. לא מקטין קוד — רק מוריד רעש מהדוח הבא. אפשר לטפל אוטומטית (`knip --fix --fix-type exports,types`) בתוכנית נפרדת.

---

## מה נבדק ונמצא נקי

- **קבצים בשרת** — אפס קבצים יתומים (knip, entries: `index.js`, `app.js`, jobs, migrations, scripts, tests).
- **Endpoints** — 66 routes בכל 9 ה-routers; לכל אחד יש קורא ב-client/scripts/e2e.
- **Standalone imports** — `ng build` עבר בלי אף אזהרת `NG8113` (import לא בשימוש בקומפוננטה).
- **שכפול** — jscpd: ‏13 בלוקים, 226 שורות מתוך 47,719 (0.47%). הבולט: ~80 שורות משותפות בין `ai-menu-modal`, `ai-product-modal`, `ai-recipe-modal` — מועמד ל-reuse layer, לא למחיקה.
- **Assets** — כל האייקונים, התמונות וה-favicon מופנים.

## KEEP — נראה מת לכלים, אבל חי

| פריט | למה הכלי טועה |
|---|---|
| `@angular/platform-browser-dynamic` | Karma מייבא אותו מקובץ virtual שנוצר ב-build. הוסר פעם ב-plan 311 ושבר את `ng test` |
| `zod` (root + server) | root: נדרש ל-`build:schemas` ולטייפים מ-`shared/schemas`. server: נדרש בזמן ריצה ע"י `server/generated/schemas` (gitignored, ולכן knip לא רואה) |
| `shared/schemas/**` "unused" | השרת צורך אותם דרך ה-build ל-CJS (`server/generated/schemas`), לא דרך import ישיר |
| `src/app/core/models/v2/conformance.ts` | שומר compile-time בין סכמת Zod לבין מודלי ה-client, נבדק דרך `v2-types.spec.ts` |
| `src/app/core/engine/testing/event-plan.fixture.ts` | fixture לטסטים |
| שדות `effect()` / `destroyRef.onDestroy()` שלא מופנים | רצים כ-side effect בעצם היצירה |
| 64 קבצים ב-`scripts/` שרשומים ב-`.kit/install.json` (למשל `run-python.sh`) | שייכים ל-ai-workflow-kit; מחיקה מקומית תחזור ב-kit-sync. שינוי — רק ב-repo של ה-kit |
| `scripts/qa/qa-*.ps1` | מופעלים ע"י Windows Task Scheduler (נרשם ב-`qa-schedule.ps1`), לא ע"י קוד |
| `server/migrations/**`, `server/migrations/tools/**`, `server/scripts/*.js` (שאינם v1) | כלי admin/runbook שמורצים ידנית; migrations הם היסטוריה, ו-`seed-master.js` מייבא את 0003 ו-0007 |
| קבועים "mirror" ב-client (`PRODUCT_MATCH_*` ב-`product-name-matcher.service.ts`) | ייבוא runtime מ-`shared/schemas` היה מושך את zod ל-bundle |

## למה זה מצטבר (ומה לשנות בריצה השבועית)

- 41 מהסמלים המתים איבדו את הקורא האחרון שלהם בקומיט מזוהה — 32 מהם בפברואר–אפריל. 39 נוספים לא היו להם אף פעם קורא מחוץ לקובץ שלהם (נכתבו ולא חוברו).
- `knip.json` הנוכחי סורק רק `src/app`, כולל fixtures של טסטים כרעש, ולא רואה את השרת, `shared/` או סקריפטים. ה-script `audit:deadcode` קיים אבל ה-nightly הקל לא מריץ אותו.
- ה-audit של אפריל היה grep ברמת קובץ; של ספטמבר מצא exports אבל לא מתודות, ולא הפך לתוכנית. שני הפערים מכוסים בשיטה המצורפת.
