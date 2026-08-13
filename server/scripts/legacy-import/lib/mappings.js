'use strict';
/**
 * Static lookup tables translating FoodComposer (SQL) reference-data ids
 * into FoodVibe canonical keys, plus the new dictionary.json entries that
 * need to exist for those keys to display correctly.
 *
 * See plans/... (legacy-foodcomposer-import) for how these were derived.
 */

// tblMeasures.measureUnit -> canonical unit key (KITCHEN_UNITS / dictionary "units")
const MEASURE_UNIT_MAP = {
  1: 'kg',      // קילוגרם
  2: 'gram',    // גרם
  3: 'liter',   // ליטר
  4: 'ml',      // מיליליטר
  5: 'unit',    // יחידה
  7: 'bunch',   // צרור — new key, no existing canonical match
};

// New unit not covered by SYSTEM_UNITS (unit-registry.service.ts) — treated
// like 'unit'/'dish': gram-equivalent rate of 1 (a bunch has no fixed weight).
const NEW_UNIT_DICTIONARY_ENTRIES = {
  bunch: 'צרור',
};

// tblProductGroups.productGroup -> canonical ingredient-category key
// (KITCHEN_CATEGORIES / dictionary "categories"). Ids 1/3/4/5/13 already
// match existing canonical keys exactly (same Hebrew word) — reused per
// standards-domain.md's "don't store the same concept twice" rule. Id 7
// (קשות = shelf-stable dry goods) is reused against the existing 'dry' key
// as the closest canonical match. Id 0's groupName ("ה") is SQL junk — folded
// into 'other' alongside id 6 (אחר).
const PRODUCT_GROUP_MAP = {
  0: 'other',
  1: 'vegetables',
  2: 'fruits',
  3: 'fish',
  4: 'meat',
  5: 'spices',
  6: 'other',
  7: 'dry',
  13: 'dairy',
  14: 'herbs',
  15: 'frozen',
  16: 'bakery_confectionery',
  17: 'ready_baked_goods',
  18: 'wine_alcohol',
  19: 'cleaning_disposables',
  20: 'takeaway_packaging',
  21: 'to_convert_to_recipe',
  22: 'modern_cooking_powders',
  23: 'dried_fruits',
  24: 'nuts_and_seeds',
  25: 'legumes_and_grains',
  26: 'poultry',
  27: 'pork',
  28: 'charcuterie',
  29: 'seafood',
};

// Existing dictionary.json "categories" keys — NOT re-added, just documented
// here so PRODUCT_GROUP_MAP's reuse is auditable.
// dairy: חלבי, dry: יבש, fish: דגים, meat: בשר, spices: תבלינים, vegetables: ירקות

// New dictionary "categories" entries for the ingredient groups that had no
// existing canonical key.
const NEW_CATEGORY_DICTIONARY_ENTRIES = {
  other: 'אחר',
  fruits: 'פירות',
  herbs: 'עשבי תיבול',
  frozen: 'קפואים',
  bakery_confectionery: 'קונדיטוריה ואפייה',
  ready_baked_goods: 'דברי מאפה מוכנים',
  wine_alcohol: 'יין ואלכוהול',
  cleaning_disposables: 'חומרי ניקוי וכלים חד״פ',
  takeaway_packaging: 'כלים לאריזה ומשלוח',
  to_convert_to_recipe: 'להפוך למתכון',
  modern_cooking_powders: 'אבקות ומוצרי בישול מודרני',
  dried_fruits: 'פירות יבשים',
  nuts_and_seeds: 'אגוזים ופיצוחים',
  legumes_and_grains: 'קטניות ודגנים יבשים',
  poultry: 'בעלי כנף',
  pork: 'חזיר',
  charcuterie: 'שרקוטרי',
  seafood: 'פירות ים',
};

// tblCategoryMaster.categoryId -> { key, hebrew } for the recipe/dish "label"
// this category becomes (see plan: Recipe/Dish has no dedicated category
// field, labels_ + KITCHEN_LABELS registry is the existing mechanism).
// categoryId 49 and 67 ("Uncategorizes"/"Uncategorized") resolve to key: null
// — no label is applied (equivalent to today's "no category assigned"),
// rather than inventing a fake "no category" tag in the labels registry.
// categoryId 41 ("Trash") uses 'trash_category' (not 'trash') to avoid
// colliding with the app's actual soft-delete "trash" concept.
const CATEGORY_MASTER_MAP = {
  // categoryId 1 is referenced by at least one recipe but has no row in
  // tblCategoryMaster (orphaned FK, likely a deleted category) — no label applied.
  1: { key: null, hebrew: null },
  2: { key: 'spreads_dips_salty_creams', hebrew: 'ממרחים, מטבלים וקרמים מלוחים' },
  3: { key: 'sauces_cold_hot_savory', hebrew: 'רטבים קרים וחמים (מלוחים)' },
  4: { key: 'pastry_sweets', hebrew: 'מאפים ומתוקים' },
  5: { key: 'sorbet_ice_cream_granita', hebrew: 'סורבה, גלידה וגרניטה' },
  6: { key: 'vinaigrettes_mayonnaise_emulsion', hebrew: 'ויניגרט, מיונז ואמולסיה' },
  7: { key: 'soups_stocks_cooking_liquids', hebrew: 'מרקים, ציר ונוזלי בישול' },
  8: { key: 'salty_baking_doughs', hebrew: 'אפייה ובצקים מלוחים' },
  9: { key: 'sweet_baking_doughs', hebrew: 'אפייה ובצקים מתוקים' },
  10: { key: 'stews_cookery', hebrew: 'תבשילים ובישול' },
  11: { key: 'fermentation_curing_pickling', hebrew: 'תסיסה, כבישה והחמצה' },
  12: { key: 'vegetables_snacks_add_ons', hebrew: 'ירקות, נשנושים ותוספות' },
  13: { key: 'jams_sweet_preps_syrup', hebrew: 'ריבות, הכנות מתוקות וסירופ' },
  14: { key: 'charcuterie_meat_mass_meat_preps', hebrew: 'נקניקים, תערובות בשר והכנות בשר' },
  15: { key: 'powders_spice_mixes_dry_preps', hebrew: 'אבקות, תערובות תבלינים והכנות יבשות' },
  16: { key: 'general_preps', hebrew: 'הכנות כלליות' },
  17: { key: 'salads_fresh_side_dish', hebrew: 'סלטים ותוספות טריות' },
  19: { key: 'amuse_bouche', hebrew: 'אמיוז בוש' },
  20: { key: 'starter', hebrew: 'מנה ראשונה' },
  21: { key: 'soups', hebrew: 'מרקים' },
  22: { key: 'bakery', hebrew: 'מאפייה' },
  23: { key: 'side_dish', hebrew: 'תוספת' },
  24: { key: 'pre_dessert', hebrew: 'טרום קינוח' },
  25: { key: 'desserts', hebrew: 'קינוחים' },
  35: { key: 'main_dish_fish', hebrew: 'מנה עיקרית דגים' },
  36: { key: 'main_dish_chicken', hebrew: 'מנה עיקרית עוף' },
  37: { key: 'dairy_prep', hebrew: 'הכנה חלבית' },
  38: { key: 'main_dish_meat', hebrew: 'מנה עיקרית בשר' },
  39: { key: 'salads', hebrew: 'סלטים' },
  40: { key: 'pasta_prep', hebrew: 'הכנת פסטה' },
  41: { key: 'trash_category', hebrew: 'פסולת' },
  42: { key: 'marinade', hebrew: 'מרינדה' },
  43: { key: 'main_dish_vegetarian', hebrew: 'מנה עיקרית צמחונית' },
  44: { key: 'starter_chicken', hebrew: 'מנה ראשונה עוף' },
  45: { key: 'starter_vegetarian', hebrew: 'מנה ראשונה ירקות' },
  46: { key: 'starter_meat', hebrew: 'מנה ראשונה בשר' },
  47: { key: 'starter_fish', hebrew: 'מנה ראשונה דגים' },
  48: { key: 'pasta_dish', hebrew: 'מנת פסטה' },
  49: { key: null, hebrew: null }, // "Uncategorizes" — no label applied
  50: { key: 'starter_seafood', hebrew: 'מנה ראשונה פירות ים' },
  51: { key: 'main_seafood', hebrew: 'מנה עיקרית פירות ים' },
  52: { key: 'vegetable_side_dish', hebrew: 'תוספת ירקות' },
  53: { key: 'starch_side_dish', hebrew: 'תוספת עמילנים' },
  54: { key: 'grains_side_dish', hebrew: 'תוספת דגנים' },
  55: { key: 'legume_side_dish', hebrew: 'תוספת קטניות' },
  56: { key: 'ideas_preparations', hebrew: 'רעיונות (הכנות)' },
  57: { key: 'ideas_dishes', hebrew: 'רעיונות (מנות)' },
  58: { key: 'special_for_boss', hebrew: 'מיוחד לבוס' },
  59: { key: 'special_starter_for_boss', hebrew: 'מנה ראשונה מיוחדת לבוס' },
  60: { key: 'special_main_for_boss', hebrew: 'מנה עיקרית מיוחדת לבוס' },
  61: { key: 'dan_and_adi_cooking_from_the_orchard', hebrew: 'דןדן ועדי מבשלים מהפרדס' },
  62: { key: 'dan_and_adi_dishes_from_the_orchard', hebrew: 'דןדן ועדי בישולים מהפרדס' },
  63: { key: 'oils_and_infusions', hebrew: 'שמנים ותמציות' },
  65: { key: 'pork_dish', hebrew: 'חזיר' },
  66: { key: 'conversions_and_techniques', hebrew: 'המרות וטכניקות' },
  67: { key: null, hebrew: null }, // "Uncategorized" — no label applied
  68: { key: 'foams_hot_cold', hebrew: 'קצפים חמים וקרים' },
  69: { key: 'meat_sauce', hebrew: 'רוטב בשר' },
  70: { key: 'fish_shellfish_sauce', hebrew: 'רוטב דגים ופירות ים' },
  71: { key: 'sweet_sauce', hebrew: 'רוטב מתוק' },
  72: { key: 'salad_sauce', hebrew: 'רוטב לסלט' },
  73: { key: 'dairy_sauce', hebrew: 'רוטב חלבי' },
  74: { key: 'cakes_cookies_tarts', hebrew: 'עוגות, עוגיות וטארטים' },
  75: { key: 'sweet_creams_custards_mousse', hebrew: 'קרמים מתוקים, קרם אנגלז ומוס' },
  76: { key: 'bread_focaccia_savory_baking', hebrew: 'לחם, פוקאצ׳ה ואפייה מלוחה' },
  77: { key: 'soups_up', hebrew: 'שדרוג מרקים' },
};

module.exports = {
  MEASURE_UNIT_MAP,
  NEW_UNIT_DICTIONARY_ENTRIES,
  PRODUCT_GROUP_MAP,
  NEW_CATEGORY_DICTIONARY_ENTRIES,
  CATEGORY_MASTER_MAP,
};
