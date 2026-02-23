---
name: Kitchen demo data plan
overview: Create a plan listing ~100 real kitchen products with Israeli-relevant details (prices, allergens, suppliers, yield/waste), then after your approval implement seed data, dictionary and metadata updates, and a demo-load flow.
todos: []
isProject: false
---

# Kitchen Demo Data Plan (~100 Real Products)

## 1. Data model recap

- **Product** ([product.model.ts](c:\foodCo\foodVibe1.0\src\app\core\models\product.model.ts)): `_id`, `name_hebrew`, `base_unit_`, `buy_price_global_`, `purchase_options_`, **`categories_`** (string[]), **`supplierIds_`** (string[]), `yield_factor_`, `allergens_` (string[]), `min_stock_level_`, `expiry_days_default_`. No `category_`/`supplierId_` (legacy only); form uses multi-select for categories and suppliers.
- **Supplier** ([supplier.model.ts](c:\foodCo\foodVibe1.0\src\app\core\models\supplier.model.ts)): `_id`, `name_hebrew`, `contact_person_`, `delivery_days_`, `min_order_mov_`, `lead_time_days_`.
- **Storage**: Products in `PRODUCT_LIST`, suppliers in `KITCHEN_SUPPLIERS`, categories in `KITCHEN_CATEGORIES`, allergens in `KITCHEN_ALLERGENS`, units in `KITCHEN_UNITS`. All localStorage via [async-storage.service.ts](c:\foodCo\foodVibe1.0\src\app\core\services\async-storage.service.ts).
- **Dictionary** ([dictionary.json](c:\foodCo\foodVibe1.0\public\assets\data\dictionary.json)): Hebrew translations for categories, allergens, units, general. Translation lookup uses key as stored (e.g. `milk_solids`); [translation.service.ts](c:\foodCo\foodVibe1.0\src\app\core\services\translation.service.ts) normalizes only when updating (spaces → underscore).
- **Metadata defaults** ([metadata-registry.service.ts](c:\foodCo\foodVibe1.0\src\app\core\services\metadata-registry.service.ts)): Categories `vegetables`, `dairy`, `meat`, `dry`, `fish`. Allergens use `'milk solids'` (with space); dictionary uses `milk_solids`. Plan will standardize on **snake_case** keys in registries and products so they match the dictionary (e.g. `milk_solids`).

---

## 2. Suppliers to create (fixed IDs for seed)

- **sup_vegetable** – ספק ירקות (vegetable supplier only: vegetables, fruit, herbs).
- **sup_dairy** – ספק חלבי (dairy).
- **sup_meat** – ספק בשר ועופות (meat and poultry).
- **sup_dry** – ספק יבש/מכולת (dry goods, grains, sugar, **and oils** – oils supplied here, not from spices).
- **sup_fish** – ספק דגים (fish only; in Israel typically separate from shellfish).
- **sup_shellfish** – ספק פירות ים/סרטניים (shellfish only – shrimp, etc.; separate supplier from fish).
- **sup_spices** – ספק תבלינים (spices only – no oils).
- **sup_eggs** – ספק ביצים (optional; can use sup_dairy).


| _id (fixed)     | name_hebrew (Hebrew) | Use for                            |
| --------------- | -------------------- | ---------------------------------- |
| `sup_vegetable` | ספק ירקות            | Vegetables, fruit, herbs           |
| `sup_dairy`     | ספק חלבי             | Dairy                              |
| `sup_meat`      | ספק בשר ועופות       | Meat, poultry                      |
| `sup_dry`       | ספק יבש ומכולת       | Dry goods, grains, sugar, **oils** |
| `sup_fish`      | ספק דגים             | Fish only                          |
| `sup_shellfish` | ספק פירות ים         | Shellfish only                     |
| `sup_spices`    | ספק תבלינים          | Spices only                        |
| `sup_eggs`      | ספק ביצים            | Eggs (optional)                    |


Each supplier seed will include minimal required fields: `delivery_days_: [0,1,2,3,4]`, `min_order_mov_: 200`, `lead_time_days_: 1`.

---

## 3. Categories and allergens alignment

- **Categories** (already in dictionary): `vegetables`, `dairy`, `meat`, `dry`, `fish`, `spices`. Add **spices** to default categories in metadata if missing. Optional: `oils` (or keep oils under `dry`/`spices`).
- **Allergens**: Use **snake_case** everywhere so product `allergens_` and registry match dictionary keys. Current dictionary: `eggs`, `fish`, `gluten`, `milk_solids`, `nuts`, `peanuts`, `seafood`, `sesame`, `shellfish`, `soy`. Update metadata default list from `'milk solids'` to `milk_solids` and use same snake_case for all defaults (`gluten`, `eggs`, `peanuts`, `nuts`, `soy`, `milk_solids`, `sesame`). Add `fish`, `seafood`, `shellfish` to default list so they appear in the form.

---

## 4. Product list (~100 items) – real names, ILS prices, yield, allergens

**Price and base unit convention (purchase unit = base unit):**

- **Solids sold by weight (e.g. 1 kg pack):** **base_unit_** = **kg** (1 kg = 1000 g). **buy_price_global_** = price in ILS **per 1 kg** (e.g. salmon 95 ₪/kg, onion 4.5 ₪/kg). So the form shows "95 ₪" per kg, not per gram.
- **Liquids sold by volume (e.g. 1 L):** **base_unit_** = **liter** (1 liter = 1000 ml). **buy_price_global_** = price in ILS **per 1 liter** (e.g. milk 6.5 ₪/L).
- **Eggs / countables:** **base_unit_** = **unit**. **buy_price_global_** = price per 1 unit (e.g. 32 ₪ per tray of 30 → 32/30 ≈ 1.07 ₪ per egg if base unit is one egg; or keep 32 if "unit" = 1 tray and add purchase_option for 30 eggs).

So: **buy_price_global_** is always **the price for one base_unit_**. No "per gram" or "per ml" in the stored value—only per kg, per liter, or per unit.

**Fish yield:** Fresh/cut fish use **yield factor 0.4** (40%). Canned fish 1.0. **Meat/poultry:** no allergen tags. Use **categories_** (array) and **supplierIds_** (array). Prices approximate Israeli ILS 2024–2025.

### Vegetables – supplierIds_: [`sup_vegetable`], categories_: [`vegetables`]

Base unit: **kg**. Yield: trim/peel ~88–95%.

| # | name_hebrew | buy_price_global_ (₪/kg) | base_unit_ | yield_factor_ | allergens_ | min_stock | expiry_days |
|---|-------------|--------------------------|------------|---------------|------------|-----------|-------------|
| 1 | בצל צהוב | 4.5 | kg | 0.88 | [] | 5 | 30 |
| 2 | גזר | 5 | kg | 0.9 | [] | 5 | 21 |
| 3 | סלרי | 8 | kg | 0.75 | [] | 2 | 14 |
| 4 | שום | 25 | kg | 0.92 | [] | 1 | 60 |
| 5 | תפוחי אדמה | 3.5 | kg | 0.9 | [] | 10 | 45 |
| 6 | עגבניה | 6 | kg | 0.97 | [] | 3 | 14 |
| 7 | מלפפון | 5 | kg | 0.92 | [] | 3 | 7 |
| 8 | פלפל אדום | 12 | kg | 0.88 | [] | 2 | 14 |
| 9 | פלפל ירוק | 10 | kg | 0.88 | [] | 2 | 14 |
| 10 | חסה | 7 | kg | 0.9 | [] | 2 | 7 |
| 11 | כרוב לבן | 3 | kg | 0.9 | [] | 3 | 30 |
| 12 | כרובית | 6 | kg | 0.85 | [] | 2 | 14 |
| 13 | ברוקולי | 10 | kg | 0.88 | [] | 2 | 7 |
| 14 | קישוא | 5 | kg | 0.93 | [] | 3 | 10 |
| 15 | חציל | 6 | kg | 0.92 | [] | 2 | 10 |
| 16 | דלעת | 4 | kg | 0.85 | [] | 3 | 30 |
| 17 | בטטה | 6 | kg | 0.9 | [] | 3 | 21 |
| 18 | פטריות שמפיניון | 22 | kg | 0.95 | [] | 1 | 7 |
| 19 | תרד טרי | 15 | kg | 0.9 | [] | 1 | 5 |
| 20 | עירית/בצל ירוק | 12 | kg | 0.9 | [] | 0.5 | 7 |
| 21 | שמיר | 20 | kg | 0.95 | [] | 0.2 | 5 |
| 22 | פטרוזיליה | 18 | kg | 0.9 | [] | 0.2 | 5 |
| 23 | כוסברה | 25 | kg | 0.9 | [] | 0.2 | 5 |
| 24 | לימון | 6 | kg | 0.6 | [] | 2 | 21 |
| 25 | ליים | 15 | kg | 0.65 | [] | 0.5 | 14 |

### Dairy – supplierIds_: [`sup_dairy`], categories_: [`dairy`]

Liquids: **base_unit_** = **liter**, **buy_price_global_** = ₪/L. Cheeses/butter/yogurt: **base_unit_** = **kg**, **buy_price_global_** = ₪/kg. Yield: 1 except where noted.

| # | name_hebrew | buy_price_global_ | base_unit_ | yield_factor_ | allergens_ | min_stock | expiry_days |
|---|-------------|-------------------|------------|---------------|------------|-----------|-------------|
| 26 | חלב 3% | 6.5 | liter | 1 | [milk_solids] | 6 | 14 |
| 27 | שמנת מתוקה 38% | 7.2 | liter | 1 | [milk_solids] | 2 | 10 |
| 28 | שמנת לבישול 15% | 5.5 | liter | 1 | [milk_solids] | 2 | 14 |
| 29 | גבינת פרמזן מגורדת | 85 | kg | 0.98 | [milk_solids] | 0.5 | 60 |
| 30 | גבינה צהובה למריחה | 45 | kg | 1 | [milk_solids] | 1 | 60 |
| 31 | גבינת ריקוטה | 28 | kg | 1 | [milk_solids] | 0.5 | 7 |
| 32 | גבינת קוטג' 5% | 22 | kg | 1 | [milk_solids] | 1 | 14 |
| 33 | יוגורט טבעי 3% | 8 | kg | 1 | [milk_solids] | 3 | 21 |
| 34 | חמאה | 42 | kg | 1 | [milk_solids] | 1 | 60 |
| 35 | שמנת חמוצה | 12 | kg | 1 | [milk_solids] | 0.5 | 21 |

### Eggs – supplierIds_: [`sup_eggs`] or [`sup_dairy`], categories_: [`dairy`]

**base_unit_** = **unit** (1 egg). **buy_price_global_** = ₪ per egg (e.g. 32 ₪/30 eggs ≈ 1.07).

| # | name_hebrew | buy_price_global_ (₪/unit) | base_unit_ | yield_factor_ | allergens_ | min_stock | expiry_days |
|---|-------------|----------------------------|------------|---------------|------------|-----------|-------------|
| 36 | ביצים L | 1.07 | unit | 1 | [eggs] | 60 | 21 |

### Meat & poultry – supplierIds_: [`sup_meat`], categories_: [`meat`]

**base_unit_** = **kg**. **buy_price_global_** = ₪/kg. No chicken/meat allergens.

| # | name_hebrew | buy_price_global_ (₪/kg) | base_unit_ | yield_factor_ | allergens_ | min_stock | expiry_days |
|---|-------------|---------------------------|------------|---------------|------------|-----------|-------------|
| 37 | חזה עוף טרי | 38 | kg | 0.85 | [] | 3 | 3 |
| 38 | ירך עוף | 28 | kg | 0.82 | [] | 3 | 3 |
| 39 | טחון עוף | 35 | kg | 0.95 | [] | 2 | 2 |
| 40 | הודו טחון | 42 | kg | 0.95 | [] | 1 | 2 |
| 41 | בקר טחון | 55 | kg | 0.9 | [] | 2 | 2 |
| 42 | צלי בקר | 75 | kg | 0.85 | [] | 1 | 3 |
| 43 | כבש צלעות | 95 | kg | 0.78 | [] | 0.5 | 3 |

### Fish – supplierIds_: [`sup_fish`], categories_: [`fish`]

**base_unit_** = **kg**. **buy_price_global_** = ₪/kg. **Yield 0.4** for fresh fish; canned 1.0.

| # | name_hebrew | buy_price_global_ (₪/kg) | base_unit_ | yield_factor_ | allergens_ | min_stock | expiry_days |
|---|-------------|---------------------------|------------|---------------|------------|-----------|-------------|
| 44 | פילה סלמון | 95 | kg | 0.4 | [fish] | 1 | 2 |
| 45 | פילה דניס | 45 | kg | 0.4 | [fish] | 1 | 2 |
| 46 | טונה בקופסה בשמן | 18 | kg | 1 | [fish] | 2 | 365 |
| 47 | אנשובי בשמן | 35 | kg | 1 | [fish] | 0.5 | 365 |

### Shellfish – supplierIds_: [`sup_shellfish`], categories_: [`fish`] or `shellfish`

**base_unit_** = **kg**. **buy_price_global_** = ₪/kg.

| # | name_hebrew | buy_price_global_ (₪/kg) | base_unit_ | yield_factor_ | allergens_ | min_stock | expiry_days |
|---|-------------|---------------------------|------------|---------------|------------|-----------|-------------|
| 48 | שרימפ קפוא | 65 | kg | 0.9 | [shellfish] | 0.5 | 90 |

### Dry goods & grains – supplierIds_: [`sup_dry`], categories_: [`dry`]

**base_unit_** = **kg**. **buy_price_global_** = ₪/kg. Yield: 1.

| # | name_hebrew | buy_price_global_ (₪/kg) | base_unit_ | yield_factor_ | allergens_ | min_stock | expiry_days |
|---|-------------|---------------------------|------------|---------------|------------|-----------|-------------|
| 49 | קמח חיטה לבן | 4.5 | kg | 1 | [gluten] | 10 | 180 |
| 50 | קמח מלא | 6 | kg | 1 | [gluten] | 5 | 180 |
| 51 | סוכר לבן | 4 | kg | 1 | [] | 10 | 365 |
| 52 | סוכר חום | 8 | kg | 1 | [] | 2 | 365 |
| 53 | אורז לבן | 5 | kg | 1 | [] | 10 | 365 |
| 54 | אורז בסמטי | 12 | kg | 1 | [] | 3 | 365 |
| 55 | פסטה ספגטי | 7 | kg | 1 | [gluten] | 5 | 365 |
| 56 | קוסקוס | 9 | kg | 1 | [gluten] | 3 | 365 |
| 57 | בורגול | 8 | kg | 1 | [gluten] | 2 | 365 |
| 58 | עדשים ירוקות | 12 | kg | 1 | [] | 2 | 365 |
| 59 | חומוס יבש | 10 | kg | 1 | [] | 2 | 365 |
| 60 | אבקת אפייה | 25 | kg | 1 | [] | 0.5 | 365 |
| 61 | סודה לשתייה | 15 | kg | 1 | [] | 0.5 | 365 |
| 62 | קורנפלור | 12 | kg | 1 | [] | 2 | 365 |
| 63 | פירורי לחם | 8 | kg | 1 | [gluten] | 2 | 90 |
| 64 | שקדים טחונים | 55 | kg | 1 | [nuts] | 0.5 | 180 |
| 65 | אגוזי מלך | 60 | kg | 0.95 | [nuts] | 0.5 | 180 |
| 66 | צימוקים | 25 | kg | 1 | [] | 1 | 365 |
| 67 | תמרים | 35 | kg | 0.95 | [] | 1 | 365 |

### Oils & vinegar – supplierIds_: [`sup_dry`], categories_: [`dry`] or `oils`

**base_unit_** = **liter** (1 L = 1000 ml). **buy_price_global_** = ₪/L.

| # | name_hebrew | buy_price_global_ (₪/L) | base_unit_ | yield_factor_ | allergens_ | min_stock | expiry_days |
|---|-------------|--------------------------|------------|---------------|------------|-----------|-------------|
| 68 | שמן זית כתית מעולה | 40 | liter | 1 | [] | 2 | 365 |
| 69 | שמן קנולה | 12 | liter | 1 | [] | 3 | 365 |
| 70 | שמן צמחי | 8 | liter | 1 | [] | 3 | 365 |
| 71 | חומץ לבן | 6 | liter | 1 | [] | 1 | 365 |
| 72 | חומץ בן יין אדום | 15 | liter | 1 | [] | 0.5 | 365 |

### Spices & condiments – supplierIds_: [`sup_spices`], categories_: [`spices`]

**base_unit_** = **kg** (or **liter** for soy sauce, vanilla). **buy_price_global_** = ₪/kg or ₪/L.

| # | name_hebrew | buy_price_global_ | base_unit_ | yield_factor_ | allergens_ | min_stock | expiry_days |
|---|-------------|-------------------|------------|---------------|------------|-----------|-------------|
| 73 | מלח ים | 3 | kg | 1 | [] | 2 | 730 |
| 74 | פלפל שחור גרוס | 45 | kg | 1 | [] | 0.2 | 365 |
| 75 | פפריקה מתוקה | 35 | kg | 1 | [] | 0.3 | 365 |
| 76 | כמון | 40 | kg | 1 | [] | 0.2 | 365 |
| 77 | כורכום | 50 | kg | 1 | [] | 0.2 | 365 |
| 78 | קינמון | 60 | kg | 1 | [] | 0.2 | 365 |
| 79 | אגוז מוסקט | 80 | kg | 0.98 | [nuts] | 0.1 | 365 |
| 80 | עלי דפנה | 25 | kg | 1 | [] | 0.1 | 365 |
| 81 | אורגנו יבש | 45 | kg | 1 | [] | 0.1 | 365 |
| 82 | בזיליקום יבש | 50 | kg | 1 | [] | 0.1 | 365 |
| 83 | שומשום | 20 | kg | 1 | [sesame] | 0.5 | 365 |
| 84 | חרדל | 15 | kg | 1 | [] | 0.5 | 365 |
| 85 | רוטב סויה | 12 | liter | 1 | [soy] | 1 | 365 |
| 86 | טחינה | 18 | kg | 1 | [sesame] | 2 | 180 |
| 87 | דבש | 35 | kg | 1 | [] | 1 | 365 |
| 88 | ריבת חלב | 40 | kg | 1 | [milk_solids] | 0.5 | 90 |
| 89 | קקאו אבקה | 45 | kg | 1 | [] | 0.5 | 365 |
| 90 | וניל תמצית | 25 | liter | 1 | [] | 0.1 | 365 |

### Canned & jars – supplierIds_: [`sup_dry`], categories_: [`dry`]

**base_unit_** = **kg**. **buy_price_global_** = ₪/kg.

| # | name_hebrew | buy_price_global_ (₪/kg) | base_unit_ | yield_factor_ | allergens_ | min_stock | expiry_days |
|---|-------------|---------------------------|------------|---------------|------------|-----------|-------------|
| 91 | רסק עגבניות | 6 | kg | 1 | [] | 3 | 365 |
| 92 | שעועית לבנה בקופסה | 8 | kg | 1 | [] | 2 | 365 |
| 93 | תירס בקופסה | 5 | kg | 1 | [] | 2 | 365 |
| 94 | זיתים שחורים | 22 | kg | 0.9 | [] | 1 | 365 |
| 95 | מלפפונים חמוצים | 12 | kg | 1 | [] | 1 | 365 |
| 96 | צ'ילי אדום יבש | 50 | kg | 1 | [] | 0.2 | 365 |
| 97 | אבקת מרק עוף | 45 | kg | 1 | [] | 0.5 | 365 |
| 98 | ג'ליאטין אבקה | 80 | kg | 1 | [] | 0.2 | 365 |
| 99 | קוקוס מגורד | 30 | kg | 1 | [] | 0.5 | 365 |
| 100 | שמרים יבשים | 35 | kg | 1 | [] | 0.5 | 365 |

Notes:

- **base_unit_** = **kg** for solids sold by weight (1 kg = 1000 g), **liter** for liquids (1 L = 1000 ml), **unit** for countables. **buy_price_global_** = price in ILS **per one base_unit_** (e.g. 95 ₪/kg, 6.5 ₪/L). So the form shows the real purchase price (e.g. "95 ₪ per kg"), not per gram or per ml.
- **min_stock_level_** is in the same unit as base_unit_ (e.g. 5 kg, 2 L, 60 units).
- **purchase_options_**: optional; add alternate pack sizes (e.g. 500 g, 0.5 L) with `unit_symbol_`, `conversion_rate_` to base, and `price_override_` when different.
- **IDs**: Seed products use stable prefixed IDs (e.g. `demo_001` … `demo_100`). **Legacy**: Seed supports `categories_`/`supplierIds_` arrays; normalizeProduct supports legacy `category_`/`supplierId_`.

---

## 5. Dictionary updates

- **Categories**: Ensure `spices` (תבלינים) exists (already in dictionary). Add `oils` if we add that category: `"oils":"שמנים"`.
- **Allergens**: Dictionary already has: eggs, fish, gluten, milk_solids, nuts, peanuts, seafood, sesame, shellfish, soy. Ensure **metadata default list** uses these exact keys (no spaces).
- **Suppliers**: Add entries for each supplier key used in UI (e.g. `sup_dairy` → ספק חלבי) if the app displays supplier names via translation; otherwise seed only `name_hebrew` on the supplier document.
- **Units**: Default units (kg, liter, gram, ml, unit, dish) and dictionary (cup, tbsp, tsp, milliliter) are already present. No new units required unless you add e.g. "bunch" for herbs.

---

## 6. Implementation steps (after you confirm)

1. **Align metadata defaults**
   In [metadata-registry.service.ts](c:\foodCo\foodVibe1.0\src\app\core\services\metadata-registry.service.ts) set default allergens to snake_case: `['gluten', 'eggs', 'peanuts', 'nuts', 'soy', 'milk_solids', 'sesame', 'fish', 'shellfish', 'seafood']`. Add `spices` to default categories if not already there.
2. **Dictionary**
   Update [dictionary.json](c:\foodCo\foodVibe1.0\public\assets\data\dictionary.json): add any missing category/allergen/unit keys and supplier name keys used for display.
3. **Seed files**
   - `public/assets/data/demo-suppliers.json`: array of suppliers with fixed `_id`: `sup_vegetable`, `sup_dairy`, `sup_meat`, `sup_dry`, `sup_fish`, `sup_shellfish`, `sup_spices`, `sup_eggs`.
   - `public/assets/data/demo-products.json`: array of ~100 products with **supplierIds_** (array), **categories_** (array), **base_unit_** = kg | liter | unit, **buy_price_global_** = price per 1 kg / 1 L / 1 unit (purchase unit = base unit).
4. **Demo load flow**
   - Add a "Load demo data" (טען נתוני הדגמה) entry point: e.g. in settings, metadata-manager, or dashboard.
   - On confirm: (a) POST or replace `KITCHEN_SUPPLIERS` with demo suppliers (preserve existing or replace), (b) POST demo products into `PRODUCT_LIST` (or replace if you prefer clean demo). Optionally merge default categories/allergens from metadata so they exist.
   - Reload product/supplier lists so the UI reflects new data.
5. **Validation**
   - Run through product form: open a few products (dairy, vegetable, meat) and confirm price, unit, yield, allergens display and save correctly.
   - Confirm dictionary shows Hebrew for all categories and allergens used in the list.

---

## 7. Summary

- **~100 products** across vegetables, dairy, eggs, meat, fish, shellfish, dry goods, oils, spices, canned.
- **Suppliers**: `sup_vegetable` (vegetables only), `sup_dairy`, `sup_meat`, `sup_dry` (dry + oils), `sup_fish` (fish only), `sup_shellfish` (shellfish only), `sup_spices` (spices only), `sup_eggs`. Products reference them via **supplierIds_** (array).
- **Multi-select**: Each product uses **categories_** (string[]) and **supplierIds_** (string[]) per current form and model.
- **Price & units**: **base_unit_** = **kg** for solids (1000 g), **liter** for liquids (1000 ml), **unit** for eggs. **buy_price_global_** = **price per 1 base_unit** (e.g. 95 ₪/kg for salmon, 6.5 ₪/L for milk). So the stored value is the real purchase price, not per gram or per ml. Fish yield 40% (0.4); meat/poultry no allergen tags.
- **Allergens**: snake_case keys matching dictionary. After you **confirm**, next steps: metadata defaults, dictionary, seed JSON, demo-load flow.
