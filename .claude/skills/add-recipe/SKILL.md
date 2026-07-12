---
name: add-recipe
description: Extracts, validates, and commits a new recipe or dish from an image, URL, or raw text into the project ledger (RECIPE_LIST / DISH_LIST) with precise quantity parsing and canonical unit resolution.
---

# Skill: add-recipe

**Model Guidance:** Use Sonnet for Phases 1-2 (extraction and ledger alignment require judgment). Haiku/Flash is sufficient for Phases 3-4 (presentation and mechanical writes) once the draft is finalized.

**Trigger:** User adds a recipe or dish from an image, URL, or raw text.

**Goal:** Produce a structured recipe draft whose ingredient quantities and units are *exactly* what the source states — no invented, rounded, or borrowed values — then persist it to the ledger only after explicit confirmation.

---

## Core Principles (why these rules exist)

1. **Extract, don't infer.** Every `{amount, unit}` pair must trace back to literal text in the source. If a quantity is genuinely absent or ambiguous, leave it blank and flag it — never fill in a plausible-looking number. This is the single biggest lever against invented or misattributed quantities.
2. **One ingredient, one quantity pair.** Never let a quantity from one ingredient line attach to a different ingredient's entry. When a line contains multiple numbers (ranges, alternatives, sub-notes), resolve to ONE `{amount, unit}` per the rules in Phase 1 and push the rest into `note_`, not into `amount_`.
3. **Units must resolve to a canonical key before anything is written.** Unresolved units are a hard stop, not a guess — an unresolved unit persisted as free text silently breaks downstream cost/conversion math everywhere it's read.
4. **Draft shape and persisted shape are different objects.** The extraction draft (`{name, amount, unit}`) is NOT the same shape as the persisted `Ingredient` (`{referenceId, amount_, unit_, nameSnapshot}`). Conflating them (writing `unit` instead of `unit_`, or skipping `referenceId` resolution) is a known prior bug class — see Phase 2's mapping table.
5. **Waste/yield factor lives on the Product, not the recipe ingredient.** Never invent a per-ingredient waste percentage during recipe entry — see Phase 2.
6. **New canonical values must be added to the dictionary, not just the registry.** A new preparation category or unit added to the registry (e.g. `KITCHEN_UNITS`, `KITCHEN_PREPARATIONS`) without a matching `dictionary.json` Hebrew entry renders as raw English in the UI. See Phase 4.
7. **Nothing is written until the user confirms the full draft.** See Phase 3.

---

## Phase 1: Data Extraction

**Parse the source** (OCR from image, URL fetch, or raw text) into: dish name, yield (amount + unit), prep time, ingredient lines, instruction steps.

### Quantity & unit parsing procedure

Apply these rules in order for every ingredient line. When in doubt, consult `references/quantity-examples.md` for a worked example matching the pattern you're seeing — do not improvise a new convention.

1. **Locate the leading numeric token** for the line (digits, spelled-out number, or Hebrew numeral). This is the candidate `amount`.
2. **Fractions:** Unicode fraction chars (½, ¼, ¾) and ASCII forms (`1/2`, `1 1/2`) convert to decimal: `1½` → `1.5`, `3/4` → `0.75`, `1 1/2` → `1.5`.
3. **Ranges** (`2-3`, `2 עד 3`, `2–3 כפות`): take the **midpoint** rounded to a sensible precision (`2-3` → `2.5`), and record the original range text in `note_` (e.g. `note_: "טווח מקורי: 2-3"`). Never take just the first or just the last number silently.
4. **Embedded alternative quantities** (`2 ביצים (או 3 אם קטנות)`, `2 eggs (or 3 if small)`): the **primary** quantity is the one NOT inside parentheses/qualifiers (`2`). Put the alternative in `note_` verbatim. Never let the parenthetical number overwrite or blend with the primary amount.
5. **Hebrew numerals / number-words** (`שתי ביצים`, `כפית אחת`, `שלוש כוסות`): resolve to the numeric value (`שתי` → `2`, `אחת` → `1`, `שלוש` → `3`). Gendered forms (`שתיים`/`שני`/`שתי`, `אחד`/`אחת`) all resolve to the same numeral.
6. **No explicit quantity** (e.g. "מלח לפי הטעם" / "salt to taste", "garnish"): set `amount: null` (or omit), `unit: 'to_taste'` if such a unit exists in the registry, otherwise leave unit unresolved and flag in the draft summary — do NOT default to `1`.
7. **Unit abbreviations:** normalize common short forms before resolution — `כפ׳`/`כף`→tablespoon, `כפית`→teaspoon, `כוס`→cup, `גר׳`/`גרם`→gram, `ק"ג`/`קילו`→kg, `מ"ל`→ml, `ליטר`→liter, `יח׳`/`יחידה`→unit, `קורט`→pinch. This is a normalization step only — the canonical key still comes from resolution (Phase 2), not from this table directly.
8. **Multi-part composite lines** (e.g. "2 cups flour + 1 tsp salt" on one line): split into separate ingredient entries — never sum or merge quantities across units.
9. **After steps 1-8, every ingredient has exactly one `{amount, unit}` pair** (or an explicit `null`/flag). This is the contract Phase 2 depends on.

See `references/quantity-examples.md` for ~25 worked input → output examples spanning all of the above (Hebrew and English) — use it to calibrate before finalizing ambiguous lines.

### Mise-en-place vs in-service classification

Classify every extracted step using this test, in order:

1. **Timing test:** Can this step be done entirely *before* active cooking/service starts, and does it produce a stored/held component (chopped, marinated, pre-cooked, mixed) rather than a plated result? → **mise-en-place**.
2. **Verb test:** Steps whose primary verb is chop / dice / mince / marinate / soak / pre-cook / measure-out / peel / zest → **mise-en-place**. Steps whose primary verb is sauté / plate / assemble / reduce / finish / garnish-and-serve / sear (as the final cook) → **in-service**.
3. **Dependency test:** If a later in-service step consumes this step's output as a single ready-to-use ingredient (e.g. "add the marinade" referring back to a prep step), the earlier step is mise-en-place.
4. **Default when ambiguous:** classify as in-service (the more conservative choice — mise-en-place items get pulled into a separate prep list surfaced elsewhere in the app, so misclassifying a real cooking step as prep silently removes it from the recipe's step sequence).

**Worked examples:**
- "Dice the onions and carrots" → mise-en-place (verb test: dice).
- "Marinate the chicken in the sauce for 2 hours" → mise-en-place (timing + verb: produces a held component consumed later).
- "Sauté the onions until golden, then add the marinated chicken" → in-service (verb test: sauté; also consumes the mise item from the example above).
- "Plate with a drizzle of olive oil" → in-service (verb test: plate/garnish).

### Unit mapping (first pass)

For each ingredient's normalized unit token, attempt resolution via `TranslationService.resolveUnit()` (or note that resolution will happen in Phase 2 if you don't have live tool access to the service at extraction time). If a unit cannot be matched to any known canonical key or Hebrew label in `public/assets/data/dictionary.json`, flag it — do not silently default it to `unit` or `gram`. Unresolved units are carried forward to Phase 2/4, not discarded.

---

## Phase 2: Ledger Alignment

### Ingredient-to-product resolution (`referenceId`)

For each extracted ingredient:
1. Try to match its name against the existing Product ledger (`name_hebrew`, case/whitespace-insensitive).
2. **Match found:** use that product's `_id` as `referenceId`, `type: 'product'`. Prefer the product's existing `base_unit_` when the extracted unit is ambiguous or missing (unit trust hierarchy: product's `base_unit_` > extracted unit > default) — but never silently override an extracted unit that resolves cleanly to a *different* valid canonical unit; only fall back to `base_unit_` when extraction was ambiguous.
3. **No match found (create-if-missing):** this recipe references a product that doesn't exist yet. Do not silently drop the ingredient or invent a fake `referenceId`. Ask the user (batched with other gap-filling questions, see below) whether to create the product, or create it directly if the source gives enough info (name + a resolvable unit), following the `AiProductDraft` shape (`name_hebrew`, `base_unit_`, `categories_`, `allergens_`, `yield_factor_`, `min_stock_level_`, `expiry_days_default_` — see `src/app/core/models/ai-product-draft.model.ts`). Record any newly created product IDs so they can be reported in the completion summary.

### Unit resolution → canonical key + gram-equivalent

Every ingredient unit must end up as a three-part representation, resolved via real app services/data:

1. **Extracted amount** — the numeric value from Phase 1.
2. **Canonical unit key** — resolved via `KeyResolutionService.ensureKeyForContext(value, 'unit')` (wraps `TranslationService.resolveUnit`; if the input is Hebrew and unresolved, this is what opens the translation-key modal — see the context table below). Non-Hebrew unresolved input is key-sanitized (lowercased, spaces→underscores) rather than modal-prompted, but should still be cross-checked against `UnitRegistryService.globalUnits_`/`SYSTEM_UNITS` before treating it as valid.
3. **Gram-equivalent** — once the canonical key is resolved, its gram-equivalent conversion rate is available via `UnitRegistryService.getConversion(key)` (e.g. `kg` → 1000, `tablespoon` → 15, `unit`/`dish`/`pinch`/`portion` → 1). This is derived, not something you compute or guess — it exists once the key resolves.

**Scope note:** this three-part resolution applies to *recipe ingredient units only*. It is unrelated to waste/yield percentage math (next section) — do not conflate unit-key resolution with waste-factor calculation.

### Waste factor — correct scope

`yield_factor_` (net-vs-gross yield after trim/waste) is a **Product-level** field, not a per-recipe-ingredient value. When adding a recipe:
- If the matched product already has `yield_factor_` set, nothing to do here — cost calculations elsewhere (`ConversionService.calculateNetCost`) already account for it.
- If the matched product has no `yield_factor_` set (or is newly created), do **not** invent a waste percentage during recipe entry. Instead, flag it in the draft summary as a follow-up item on the *product* record (e.g. "Product X has no yield factor set — consider setting one on the product page"), and proceed with the recipe write regardless.

### Draft shape → persisted shape mapping

The extraction/AI-draft shape and the persisted `Ingredient` shape are different objects. Apply this mapping explicitly when building the final write payload — do not carry draft field names into the persisted object:

| Draft field (`AiRecipeDraft.ingredients[]`) | Persisted field (`Ingredient`) | Notes |
|---|---|---|
| `name` | `nameSnapshot` | Human-readable label at time of add; not re-derived later. |
| — (resolved in this phase) | `referenceId` | Product (or recipe, for sub-recipe ingredients) `_id` from resolution above. |
| — | `type` | `'product'` or `'recipe'` depending on what `referenceId` points to. |
| `amount` | `amount_` | Note the trailing underscore — omitting it is a known bug class. |
| `unit` | `unit_` | Canonical key from resolution above, never the raw extracted string. |
| (range/alternative text, if any) | `note_` | Optional; see Phase 1 rules 3-4. |

The same "draft field → persisted field with trailing underscore" pattern applies to steps and prep items — match field names exactly against `src/app/core/models/recipe.model.ts`, don't assume symmetry with the ingredient mapping above.

### Translation/key-resolution context mapping

Every canonical field must be resolved through `KeyResolutionService.ensureKeyForContext(value, context)` with the correct context — using the wrong context resolves against the wrong dictionary section:

| Extracted field | `KeyResolutionContext` |
|---|---|
| Ingredient/purchase unit | `'unit'` |
| Product category | `'category'` |
| Allergen | `'allergen'` |
| Supplier name | `'supplier'` |
| Mise-en-place / preparation category | `'preparation_category'` |
| Menu section category | `'section_category'` |
| Anything else canonical, no better fit | `'generic'` |

If `ensureKeyForContext` returns `null`, the user cancelled the translation modal or left it empty — treat that field as unresolved and re-surface it in Phase 3, do not proceed with a placeholder.

### Gap-filling questions

Before presenting the Phase 3 summary, check for missing data the user should supply and ask in one batch (don't drip individual questions):
- Yield/servings, if not stated in the source.
- Recipe type (`dish` vs `preparation`), if ambiguous from context.
- Default station, if unknown.
- Prep time in minutes, if missing.
- Any equipment/logistics items mentioned by name but not resolvable to an existing entry.

---

## Phase 3: Interactive Confirmation

**Present the full structured draft** in chat: dish name, type, yield, ingredients (name, amount, canonical unit, flags for anything unresolved), mise-en-place vs in-service step split, any newly-would-be-created products/categories, and any gap-filling answers assumed.

> ## CRITICAL — Hard Pause
> **STOP immediately. Do NOT write any files or call any persistence tool.**
> **Wait for the user to say "Yes chef!" or provide explicit corrections.**
> **Writing before confirmation is a critical error — no exceptions, even if the draft looks complete.**

---

## Phase 4: Atomic Implementation

**Persist via data service, not raw file writes.** The project ledger for recipes/dishes is the MongoDB-backed `RECIPE_LIST` (via `RecipeDataService.addRecipe`) / `DISH_LIST` (via `DishDataService.addDish`) entities — reached through the app's data services, not by writing JSON files directly. (The only exception is if the user is explicitly working in demo-data-seeding mode against `demo-*.json` fixtures — confirm this explicitly before treating JSON files as the write target.)

**Unit/category key verification (final gate):** Before writing, confirm every ingredient's `unit_`, every category, and every preparation category resolved to a canonical key in Phase 2. Anything still unresolved → resolve now via `ensureKeyForContext` (triggers the translation modal if needed) — never write a placeholder or raw Hebrew string into a `_`-suffixed canonical field.

**Dictionary sync for new canonical values:** If this recipe introduced a *new* preparation category, unit, or other canonical value that didn't previously exist in the registry, it must also be added to `public/assets/data/dictionary.json` with its Hebrew label (in the matching section — `units`, `categories`, `allergens`, or `preparation_categories`/`general`). A canonical key that exists in the registry but not the dictionary renders as raw English in the UI. `ensureKeyForContext` handles this automatically when it goes through the translation modal (`translation.addKeyAndHebrew`) — but if you created a key programmatically without going through the modal (e.g. non-Hebrew input that was merely sanitized), verify the dictionary entry exists and add it if not.

**Create-if-missing execution:** Any products or equipment flagged in Phase 2 as not-yet-existing are created now (after confirmation, before or alongside the recipe write), and their new IDs are used as `referenceId`s / logistics references in the recipe payload.

**Registry/index update:** Ensure the new recipe/dish is reachable through normal app queries (the data service's `post` already updates the in-memory signal store — no separate manual index file to maintain for MongoDB-backed persistence).

---

## Completion Gate

Output a summary including:
- `"Recipe [Name] added to the ledger. All units resolved to canonical keys."`
- Any new products created (name + generated ID).
- Any new dictionary keys added (unit/category/preparation_category + Hebrew label).
- Any fields still flagged for user follow-up (e.g. "Product X has no yield_factor_ set").
