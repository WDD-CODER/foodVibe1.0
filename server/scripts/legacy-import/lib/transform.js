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
      phone_: (row.phone1 || '').trim() || undefined,
      phone2_: (row.phone2 || '').trim() || undefined,
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

    // quantityBruto/quantityNeto are both literal 0 for ~89 of 1,248 products
    // while a mirror column (grams/liter/punit) holds a real nonzero value.
    // Investigated directly against the full dump (378 products with both
    // populated): the mirror matches quantityBruto only 83-93% of the time
    // for gram/ml/unit products, and NEVER (0/19) for kg-based products —
    // mismatch ratios vary 0.001x-50x with no discoverable consistent
    // formula. Deliberately NOT falling back here (unlike the ingredient
    // quantity / recipe yield mirror-column fallbacks below) — a wrong guess
    // would silently corrupt yield_factor_ (a real recipe-costing input),
    // worse than today's honest "no waste assumed" default. Surfaced as a
    // warning for manual review instead.
    if (bruto === 0 && neto === 0 && (row.grams || row.liter || row.punit)) {
      warnings.push(
        `Product ${row.product} (${row.productName}): quantityBruto and quantityNeto are both 0 but ` +
        `grams/liter/punit has a value (${row.grams || row.liter || row.punit}) — yield_factor_ defaulted ` +
        `to 1; semantics of grams/liter/punit relative to bruto/neto are unconfirmed, review manually`
      );
    }

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

  // Name lookups for ingredient nameSnapshot. PUT /api/v1/data/:type/:id
  // REJECTS any recipe whose linked ingredients lack one, so a recipe imported
  // without it cannot be saved from the app at all — not even to change a
  // rating. Keyed by raw sqlRecipeNo/product id rather than the output arrays,
  // so a line resolves regardless of declaration order.
  const finalNameByRecipeNo = new Map(shells.map(s => [s.row.recipeNo, s.finalName]));
  const productNameBySqlId = new Map(raw.productsRaw.map(r => [r.product, (r.productName || '').trim()]));

  let droppedIngredients = 0;

  const recipes = [];
  const dishes = [];

  for (const { row, newId, finalName } of shells) {
    const ingredientRows = (ingredientsByRecipeNo.get(row.recipeNo) || [])
      .slice()
      .sort((a, b) => a.recipeLine - b.recipeLine);

    const ingredients_ = [];
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

      // tblRecipeProducts.quantity is null for ~2.3% of rows (older rows never
      // backfilled onto that column) AND literal 0 for ~40% of rows regardless
      // of whether a real quantity survives in Gram/Liter/Unit (confirmed
      // against the full dump: 5,445 of 13,424 lines have quantity===0, and
      // 5,415 of those have a nonzero mirror — e.g. recipeNo 1503's 6 lines,
      // all quantity=0, real values in Gram/Unit). Treat quantity as "absent"
      // when it's null OR literal 0, and only then fall back to whichever of
      // Gram/Liter/Unit is populated — never second-guess a quantity that's
      // actually a real nonzero value (Gram/Liter/Unit can be stale once
      // quantity is genuinely set). A genuinely-zero ingredient (quantity 0
      // with all three mirrors also null/0 — 30 lines in the full dump) still
      // correctly resolves to 0, not spuriously overridden.
      const hasRealQuantity = ing.quantity != null && ing.quantity !== 0;
      const amount = hasRealQuantity
        ? ing.quantity
        : (ing.Gram ?? ing.Liter ?? ing.Unit ?? ing.quantity ?? 0);
      if (!hasRealQuantity && amount === 0) {
        warnings.push(`Recipe ${row.recipeNo} line ${ing.recipeLine}: quantity, Gram, Liter, and Unit all null/zero — defaulted to 0`);
      }

      const nameSnapshot = isSubRecipe
        ? (finalNameByRecipeNo.get(ing.product) || '')
        : (productNameBySqlId.get(ing.product) || '');
      if (!nameSnapshot) {
        warnings.push(`Recipe ${row.recipeNo} line ${ing.recipeLine}: could not resolve a name for ${isSubRecipe ? 'sub-recipe' : 'product'} ${ing.product} — nameSnapshot left empty`);
      }

      ingredients_.push({
        _id: idFactory(),
        referenceId,
        type: isSubRecipe ? 'recipe' : 'product',
        amount_: amount,
        unit_: unitKey || 'gram',
        nameSnapshot,
      });
    }

    const stepRows = (stepsByRecipeNo.get(row.recipeNo) || [])
      .slice()
      .sort((a, b) => a.stepNo - b.stepNo);

    const steps_ = stepRows.map((s, idx) => ({
      order_: idx + 1,
      instruction_: (s.stepDescription || '').trim(),
      labor_time_minutes_: s.prepareMinutes ?? 0,
    }));

    // For dishes only: the "mise en place" prep list the recipe-builder
    // dish-workflow UI reads (RecipeFormService.getPrepRowsFromRecipe() — see
    // Recipe.prep_items_/prep_categories_). Not persisted for preparations.
    //
    // Source is tblInstructions, the same rows that feed steps_ above: the old
    // FoodComposer app rendered them in its "צ'ק ליסט" panel, which IS the
    // dish's mise-en-place list (confirmed against the old app's own UI for
    // recipeNo 1317, whose 6 rows match line for line). A previous version of
    // this transform instead copied every ingredient line of the dish here —
    // that was wrong, and plan 300 Finding 5, which justified it, is retracted
    // by plan 314. Do not reintroduce ingredient-derived prep rows.
    //
    // The old comment dismissed tblInstructions as unparseable free text; that
    // is not true for dishes. Across the full dump, dish instruction rows have
    // a median length of 21 characters and read as component names, with only
    // 1.4% over 120 chars. 6.7% cram several components into one row via
    // embedded newlines, so each line becomes its own prep row.
    //
    // The source has no quantity for a checklist line (the old panel's only
    // numeric column was prep-time minutes, preserved above in
    // labor_time_minutes_), so quantity is left at 0 rather than invented — the
    // dish's real quantities live in ingredients_ and are untouched.
    //
    // category_name is left empty for the same reason: the source has no
    // category, and the prep-category dropdown is backed by a live registry
    // (KITCHEN_PREPARATIONS.categories) that does not contain any generic
    // bucket. Writing one anyway would store a value no dropdown option can
    // match, so the row would render as unselected while holding a phantom
    // category. Empty means the stored data and the UI agree.
    let prep_items_;
    let prep_categories_;
    if (row.RecipeOrDish === 2) {
      const prepItemRows = [];
      for (const s of stepRows) {
        for (const line of String(s.stepDescription ?? '').split(/\r\n|\r|\n/)) {
          const preparation_name = line.trim();
          if (!preparation_name) continue;
          prepItemRows.push({
            preparation_name,
            category_name: '',
            quantity: 0,
            unit: 'gram',
          });
        }
      }
      if (prepItemRows.length > 0) {
        prep_items_ = prepItemRows;
        prep_categories_ = [{
          category_name: '',
          items: prepItemRows.map(i => ({ item_name: i.preparation_name, unit: i.unit, quantity: i.quantity })),
        }];
      } else {
        warnings.push(`Dish ${row.recipeNo}: no tblInstructions rows — mise-en-place list left empty`);
      }
    }

    // Yield: every measure the source recorded, not just one.
    //
    // A batch legitimately has several simultaneous measures — the avocado
    // prep (recipeNo 1620) is 850 gram AND 1 portion — and a parent recipe
    // must be able to draw on it by weight, volume or count and still be
    // priced correctly. recipe-cost.service.ts's amountInRecipeYieldUnit()
    // resolves a requested unit against yield_conversions_ via
    // `amount * (yield_amount_ / entry.amount)`, so every measure listed there
    // becomes a correctly-priced option. Anything not listed falls through to
    // normalizeToRecipeYieldUnit(), where gram/ml/unit/dish all carry registry
    // factor 1 — it silently returns the raw number instead of erroring, which
    // is how a 300g request against a 'dish' yield produced an 850x overcharge.
    //
    // row.measureUnit is deliberately NOT consulted: it is literally 2 ('gram')
    // on all 2,093 source rows, a default nobody ever changed. Deriving
    // yield_unit_ from it is what labelled ~394 preparations 'gram' when their
    // value is really a unit count.
    //
    // dbTotalLiter holds MILLILITRES despite its name — the old app's header
    // labelled that column מ"ל, and the magnitudes agree (beef stock reads
    // 4000 against 12000 grams: 4 litres, not 4000).
    const nzv = v => v != null && v !== 0;
    const measures = [];
    if (nzv(row.dbTotalGram)) measures.push({ amount: row.dbTotalGram, unit: 'gram' });
    if (nzv(row.dbTotalLiter)) measures.push({ amount: row.dbTotalLiter, unit: 'ml' });
    if (nzv(row.dbTotalUnit)) measures.push({ amount: row.dbTotalUnit, unit: 'unit' });
    if (nzv(row.noOfDishes)) measures.push({ amount: row.noOfDishes, unit: 'dish' });

    const isDishRow = row.RecipeOrDish === 2;
    let primary;
    if (isDishRow) {
      // A dish's yield is its portion count: recipe-form.service.ts reads
      // yield_amount_ straight into `serving_portions` and forces row 0 of the
      // conversions to 'dish' on load, so this matches the app's own contract.
      primary = measures.find(m => m.unit === 'dish');
    }
    if (!primary && nzv(row.finalQuantity)) {
      primary = measures.find(m => m.amount === row.finalQuantity);
      if (!primary) {
        const gram = measures.find(m => m.unit === 'gram');
        if (gram) {
          // 28 rows hold a finalQuantity that matches no total column while
          // dbTotalGram holds its own figure. Only one can occupy the 'gram'
          // slot — a duplicate unit would be silently dead, since
          // amountInRecipeYieldUnit() resolves with .find(). The total columns
          // are what the old app displayed in its header, so they win.
          primary = gram;
          warnings.push(`Recipe ${row.recipeNo}: finalQuantity ${row.finalQuantity} matches no total column — using dbTotalGram ${gram.amount} as the yield, finalQuantity dropped`);
        } else {
          primary = { amount: row.finalQuantity, unit: 'gram' };
          measures.unshift(primary);
        }
      }
    }
    if (!primary) primary = measures[0];
    if (!primary) {
      primary = { amount: 0, unit: 'gram' };
      warnings.push(`Recipe ${row.recipeNo}: no finalQuantity, dbTotalGram, dbTotalLiter, dbTotalUnit or noOfDishes — yield_amount_ defaulted to 0`);
    }

    const yieldAmount = primary.amount;
    const yieldUnitKey = primary.unit;
    // The old app recorded this yield deliberately, and for a preparation it is
    // a NET figure — the avocado prep (recipeNo 1620) takes 1000g of whole
    // avocado and yields 850g once peel and stone are gone. Without this flag
    // recipe-header.component.ts's auto-sync effect overwrites the stored yield
    // with the gross sum of the ingredient weights the moment the recipe is
    // opened, and persists the gross figure on the next save — which is exactly
    // how 850 became 1000 on screen. neto_confirmed_ is the app's own opt-out
    // from that auto-sync, so a recorded source yield sets it.
    const netoConfirmed = yieldAmount > 0;
    // Row 0 must be the primary: both toRecipe() and patchFormFromRecipe()
    // (recipe-form.service.ts) treat yield_conversions_[0] as the primary
    // yield. Writing anything else there makes the builder display the wrong
    // measure and, on save, overwrite yield_amount_/yield_unit_ with it.
    const conversions = [primary, ...measures.filter(m => m !== primary)];

    const labels_ = [];
    if (row.categoryId != null) {
      const cat = CATEGORY_MASTER_MAP[row.categoryId];
      if (cat === undefined) {
        warnings.push(`Recipe ${row.recipeNo}: unmapped categoryId ${row.categoryId}`);
      } else if (cat.key) {
        labels_.push(cat.key);
      }
    }

    const yield_conversions_ = conversions.length > 0 ? conversions : undefined;

    const doc = {
      _id: newId,
      name_hebrew: finalName,
      ingredients_,
      steps_,
      yield_amount_: yieldAmount,
      yield_unit_: yieldUnitKey,
      yield_conversions_,
      neto_confirmed_: netoConfirmed,
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
