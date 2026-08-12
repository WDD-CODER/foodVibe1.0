'use strict';
/**
 * Transforms parsed FoodComposer SQL rows into FoodVibe entity-type docs.
 * Pure functions — no DB access, no console output — so the CLI can dry-run
 * this and print/inspect the result before anything is written.
 */

const {
  MEASURE_UNIT_MAP,
  PRODUCT_GROUP_MAP,
  CATEGORY_MASTER_MAP,
} = require('./mappings');

function makeId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < length; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function groupBy(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const k = row[key];
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(row);
  }
  return map;
}

/**
 * @param {object} raw - { suppliersRaw, productsRaw, recipesRaw, recipeProductsRaw, instructionsRaw }
 * @param {object} opts - { now: number, idFactory?: () => string }
 */
function buildImport(raw, opts = {}) {
  const now = opts.now ?? Date.now();
  const idFactory = opts.idFactory ?? makeId;
  const warnings = [];
  // Existing __master__ data already in the DB (products/suppliers by name,
  // recipe+dish names as a combined set) — passed in by the CLI so this run's
  // dedup logic can reuse existing docs instead of creating name-colliding
  // duplicates. FoodVibe's clone/sync layer silently skips cloning any master
  // doc whose name already exists for a user (see sync-master.js), so a
  // colliding duplicate would be permanently uncloneable for every user —
  // this must be resolved at import time, not left for the app to hide.
  const existingProductIdByName = opts.existingProductIdByName ?? new Map();
  const existingSupplierIdByName = opts.existingSupplierIdByName ?? new Map();
  const existingRecipeDishNames = opts.existingRecipeDishNames ?? new Set();

  // ---- Suppliers -----------------------------------------------------
  const supplierIdMap = new Map(); // sqlSupplierCode -> newId
  const supplierNameToId = new Map(existingSupplierIdByName); // name -> newId, seeded with existing master suppliers
  const suppliers = [];
  for (const row of raw.suppliersRaw) {
    const name = (row.SupplierName || '').trim();
    const existingId = name ? supplierNameToId.get(name) : undefined;
    if (existingId) {
      warnings.push(`Supplier ${row.supplierCode} (${name}): name collides with an existing master supplier — reusing it instead of creating a duplicate`);
      supplierIdMap.set(row.supplierCode, existingId);
      continue;
    }
    const newId = idFactory();
    supplierIdMap.set(row.supplierCode, newId);
    if (name) supplierNameToId.set(name, newId);
    suppliers.push({
      _id: newId,
      name_hebrew: row.SupplierName || '',
      contact_person_: row.contactPerson || undefined,
      delivery_days_: [],
      min_order_mov_: 0,
      lead_time_days_: 1,
      userId: '__master__',
      _masterId: null,
      _userModified: false,
      _legacyImport: true,
      _legacySupplierCode: row.supplierCode,
    });
  }

  // ---- Products --------------------------------------------------------
  const productIdMap = new Map(); // sqlProductId -> newId
  const productNameToId = new Map(existingProductIdByName); // name -> newId, seeded with existing master products
  const products = [];
  for (const row of raw.productsRaw) {
    const productName = (row.productName || '').trim();
    const existingId = productName ? productNameToId.get(productName) : undefined;
    if (existingId) {
      warnings.push(`Product ${row.product} (${productName}): name collides with an existing master product — reusing it instead of creating a duplicate`);
      productIdMap.set(row.product, existingId);
      continue;
    }

    const newId = idFactory();
    productIdMap.set(row.product, newId);
    if (productName) productNameToId.set(productName, newId);

    const unitKey = MEASURE_UNIT_MAP[row.measureUnit];
    if (!unitKey) {
      warnings.push(`Product ${row.product} (${row.productName}): unmapped measureUnit ${row.measureUnit} — defaulted to 'gram'`);
    }

    const catKey = row.productGroup != null ? PRODUCT_GROUP_MAP[row.productGroup] : undefined;
    if (row.productGroup != null && !catKey) {
      warnings.push(`Product ${row.product} (${row.productName}): unmapped productGroup ${row.productGroup}`);
    }

    const bruto = row.quantityBruto;
    const neto = row.quantityNeto;
    const yieldFactor = bruto && neto && bruto > 0 ? neto / bruto : 1;

    let price = 0;
    if (row.price != null && bruto && bruto > 0) {
      price = row.price / bruto;
    } else {
      warnings.push(`Product ${row.product} (${row.productName}): missing price or quantityBruto — price set to 0`);
    }

    const sources_ = [];
    // supplierCode 0 is FoodComposer's "no supplier assigned" sentinel (real
    // suppliers start at 1) — not a broken reference, just no source.
    if (row.supplierCode != null && row.supplierCode !== 0) {
      const mappedSupplierId = supplierIdMap.get(row.supplierCode);
      if (mappedSupplierId) {
        sources_.push({ supplierId: mappedSupplierId, price, addedAt: now });
      } else {
        warnings.push(`Product ${row.product} (${row.productName}): supplierCode ${row.supplierCode} not found among suppliers`);
      }
    }

    products.push({
      _id: newId,
      name_hebrew: productName,
      name_hebrew_normalized: productName.replace(/\s+/g, ' ').toLowerCase(),
      base_unit_: unitKey || 'gram',
      sources_,
      purchase_options_: [],
      categories_: catKey ? [catKey] : [],
      yield_factor_: yieldFactor || 1,
      allergens_: [],
      min_stock_level_: 0,
      expiry_days_default_: 0,
      addedAt_: now,
      seeded_: true,
      userId: '__master__',
      _masterId: null,
      _userModified: false,
      _legacyImport: true,
      _legacyProductId: row.product,
    });
  }

  // ---- Recipes & Dishes --------------------------------------------------
  // Pass 1: allocate every recipe/dish its final id first, so both
  // product-referencing and recipe-referencing ingredient lines can resolve
  // regardless of declaration order (preparations can reference other
  // preparations; dishes can reference preparations).
  const recipeIdMap = new Map(); // sqlRecipeNo -> newId
  // RECIPE_LIST and DISH_LIST share one name namespace app-wide (sync-master.js
  // skips cloning any master doc whose name is already taken for a user) — so
  // an exact-duplicate name within this import (10 pairs observed in the real
  // data — old FoodComposer allowed it) would make the second copy permanently
  // uncloneable for every future user. Resolved here by suffixing, never by
  // dropping data.
  const usedRecipeDishNames = new Set(existingRecipeDishNames);
  const shells = raw.recipesRaw.map(row => {
    const newId = idFactory();
    recipeIdMap.set(row.recipeNo, newId);

    let finalName = (row.recipeName || '').trim();
    if (finalName && usedRecipeDishNames.has(finalName)) {
      let suffix = 2;
      while (usedRecipeDishNames.has(`${finalName} (${suffix})`)) suffix++;
      const original = finalName;
      finalName = `${finalName} (${suffix})`;
      warnings.push(`Recipe ${row.recipeNo}: duplicate name "${original}" — renamed to "${finalName}" so both remain cloneable`);
    }
    if (finalName) usedRecipeDishNames.add(finalName);

    return { row, newId, finalName };
  });

  const ingredientsByRecipeNo = groupBy(raw.recipeProductsRaw, 'recipeNo');
  const stepsByRecipeNo = groupBy(raw.instructionsRaw, 'recipeNo');

  // Lookups by raw sqlRecipeNo (not the yet-to-be-populated `recipes`/`dishes`
  // output arrays) so a dish can resolve a sub-recipe's display name/category
  // for its prep list regardless of declaration order — same reasoning as the
  // `recipeIdMap` two-pass id allocation above.
  const finalNameByRecipeNo = new Map(shells.map(s => [s.row.recipeNo, s.finalName]));
  const categoryIdByRecipeNo = new Map(raw.recipesRaw.map(r => [r.recipeNo, r.categoryId]));
  // Plain-product name lookup for the same reason — a dish's prep list can name a
  // product line directly (see prepItemRows below), not only sub-recipes.
  const productNameBySqlId = new Map(raw.productsRaw.map(r => [r.product, (r.productName || '').trim()]));
  const FALLBACK_PREP_CATEGORY = 'הכנות';

  let droppedIngredients = 0;

  const recipes = [];
  const dishes = [];

  for (const { row, newId, finalName } of shells) {
    const ingredientRows = (ingredientsByRecipeNo.get(row.recipeNo) || [])
      .slice()
      .sort((a, b) => a.recipeLine - b.recipeLine);

    const ingredients_ = [];
    // For dishes only: the "mise en place" prep list, reshaped into the
    // flat/grouped shape the recipe-builder dish-workflow UI actually reads
    // (RecipeFormService.getPrepRowsFromRecipe() — see Recipe.prep_items_/
    // prep_categories_). Not persisted for preparations (row.RecipeOrDish !== 2).
    //
    // Every ingredient line of a dish belongs here, not just sub-recipe
    // components — a מיזאנפלס item can be a prepared sub-recipe OR a plain
    // product the cook needs staged to assemble the dish (confirmed by the
    // domain owner; see plan 300 Finding 5). There is no field in the source
    // schema distinguishing "assembly component" from "generic ingredient" —
    // tblInstructions was checked as a candidate signal but is inconsistent
    // free text (sometimes one component per row, sometimes several crammed
    // into one row via embedded newlines, sometimes full narrative prose
    // unrelated to any single ingredient) and unsafe to parse structurally.
    // Including every ingredient line is the conservative choice: it cannot
    // under-report (the original bug), only ever over-report, and is exactly
    // what the raw ingredient list already unambiguously says belongs to the
    // dish. This only affects import derivation for already-existing legacy
    // data — dishes created going forward in the app itself have their
    // mise-en-place list entered directly by the user, not derived.
    const prepItemRows = [];
    for (const ing of ingredientRows) {
      const unitKey = MEASURE_UNIT_MAP[ing.measureUnit];
      if (!unitKey) {
        warnings.push(`Recipe ${row.recipeNo} line ${ing.recipeLine}: unmapped measureUnit ${ing.measureUnit} — defaulted to 'gram'`);
      }

      const isSubRecipe = ing.productType === 1;
      const referenceId = isSubRecipe ? recipeIdMap.get(ing.product) : productIdMap.get(ing.product);

      if (!referenceId) {
        warnings.push(
          `Recipe ${row.recipeNo} line ${ing.recipeLine}: ${isSubRecipe ? 'sub-recipe' : 'product'} ` +
          `${ing.product} not found — ingredient line dropped`
        );
        droppedIngredients++;
        continue;
      }

      ingredients_.push({
        _id: idFactory(),
        referenceId,
        type: isSubRecipe ? 'recipe' : 'product',
        amount_: ing.quantity ?? 0,
        unit_: unitKey || 'gram',
      });

      if (row.RecipeOrDish === 2) {
        const preparation_name = isSubRecipe
          ? (finalNameByRecipeNo.get(ing.product) || '')
          : (productNameBySqlId.get(ing.product) || '');
        const subCat = isSubRecipe ? CATEGORY_MASTER_MAP[categoryIdByRecipeNo.get(ing.product)] : undefined;
        prepItemRows.push({
          preparation_name,
          category_name: (subCat && subCat.hebrew) || FALLBACK_PREP_CATEGORY,
          quantity: ing.quantity ?? 0,
          unit: unitKey || 'gram',
        });
      }
    }

    let prep_items_;
    let prep_categories_;
    if (prepItemRows.length > 0) {
      prep_items_ = prepItemRows;
      const byCategory = new Map();
      for (const item of prepItemRows) {
        const list = byCategory.get(item.category_name) ?? [];
        list.push({ item_name: item.preparation_name, unit: item.unit, quantity: item.quantity });
        byCategory.set(item.category_name, list);
      }
      prep_categories_ = Array.from(byCategory.entries()).map(([category_name, items]) => ({ category_name, items }));
    }

    const stepRows = (stepsByRecipeNo.get(row.recipeNo) || [])
      .slice()
      .sort((a, b) => a.stepNo - b.stepNo);

    const steps_ = stepRows.map((s, idx) => ({
      order_: idx + 1,
      instruction_: (s.stepDescription || '').trim(),
      labor_time_minutes_: s.prepareMinutes ?? 0,
    }));

    const yieldUnitKey = MEASURE_UNIT_MAP[row.measureUnit];
    if (!yieldUnitKey) {
      warnings.push(`Recipe ${row.recipeNo}: unmapped measureUnit ${row.measureUnit} — defaulted to 'gram'`);
    }

    const labels_ = [];
    if (row.categoryId != null) {
      const cat = CATEGORY_MASTER_MAP[row.categoryId];
      if (cat === undefined) {
        warnings.push(`Recipe ${row.recipeNo}: unmapped categoryId ${row.categoryId}`);
      } else if (cat.key) {
        labels_.push(cat.key);
      }
    }

    const yield_conversions_ = row.noOfDishes && row.noOfDishes > 0
      ? [{ amount: row.noOfDishes, unit: 'dish' }]
      : undefined;

    const doc = {
      _id: newId,
      name_hebrew: finalName,
      ingredients_,
      steps_,
      yield_amount_: row.finalQuantity ?? 0,
      yield_unit_: yieldUnitKey || 'gram',
      yield_conversions_,
      default_station_: '',
      is_approved_: !!row.isChecked,
      recipe_type_: row.RecipeOrDish === 2 ? 'dish' : 'preparation',
      labels_: labels_.length ? labels_ : undefined,
      prep_items_,
      prep_categories_,
      addedAt_: now,
      updatedAt_: now,
      userId: '__master__',
      _masterId: null,
      _userModified: false,
      _legacyImport: true,
      _legacyRecipeNo: row.recipeNo,
    };

    if (row.RecipeOrDish === 2) dishes.push(doc);
    else recipes.push(doc);
  }

  return {
    suppliers,
    products,
    recipes,
    dishes,
    warnings,
    stats: {
      suppliers: suppliers.length,
      products: products.length,
      recipes: recipes.length,
      dishes: dishes.length,
      ingredientLines: recipes.concat(dishes).reduce((n, r) => n + r.ingredients_.length, 0),
      steps: recipes.concat(dishes).reduce((n, r) => n + r.steps_.length, 0),
      droppedIngredients,
      warningCount: warnings.length,
    },
  };
}

module.exports = { buildImport, makeId };
