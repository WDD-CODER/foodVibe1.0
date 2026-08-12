/**
 * Syncs master document updates into a user's namespace on login.
 * Respects user modifications — never overwrites user-edited documents.
 *
 * Sync rules (applied per document per collection):
 *   1. New master item (no matching _masterId in user data)   → clone to user
 *   2. Unchanged clone (_userModified: false) with stale data → overwrite with latest master
 *   3. User-modified clone (_userModified: true)              → skip (user's version wins)
 *   4. Deleted master item                                    → skip (no removal from user)
 *
 * Ingredient referenceId remapping (Rules 1 & 2):
 *   When a master recipe/dish is cloned (or refreshed) for a user, its ingredient
 *   referenceIds point to master _ids — either a master product (`type: 'product'`)
 *   or a master sub-recipe/preparation (`type: 'recipe'`, itself a RECIPE_LIST or
 *   DISH_LIST doc). We remap both kinds to the user's corresponding _ids using
 *   _masterId linkage so the ingredients resolve correctly. The recipe/dish map is
 *   built incrementally as new RECIPE_LIST/DISH_LIST clones are allocated during
 *   this same sync run (see `newCloneId` below), so a sub-recipe referencing
 *   a sibling sub-recipe that's *also* being cloned for the first time in this run
 *   resolves too, regardless of which order `masterDocs` happens to return them in.
 */

'use strict';

const mongoose = require('mongoose');
const { CLONEABLE_TYPES } = require('../constants/cloneable-types');

function makeId(length = 5) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < length; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

/**
 * Remap ingredient referenceIds from master IDs to user-scoped IDs.
 * Dispatches on `ing.type`: `'recipe'` (a sub-recipe/preparation used as a
 * component of this recipe/dish) uses `recipeIdMap`; everything else
 * (`'product'`, or legacy rows with no `type`) uses `productIdMap`.
 */
function remapIngredients(ingredients, productIdMap, recipeIdMap) {
  if (!Array.isArray(ingredients)) return ingredients;
  return ingredients.map(ing => {
    if (!ing.referenceId) return ing;
    const idMap = ing.type === 'recipe' ? recipeIdMap : productIdMap;
    const remapped = idMap.get(String(ing.referenceId));
    return remapped ? { ...ing, referenceId: remapped } : ing;
  });
}

/** Remap logistics baseline equipment_id_ from master IDs to user-scoped IDs. */
function remapLogistics(logistics, equipmentIdMap) {
  if (!logistics || !Array.isArray(logistics.baseline_)) return logistics;
  return {
    ...logistics,
    baseline_: logistics.baseline_.map(entry => {
      if (!entry.equipment_id_) return entry;
      const remapped = equipmentIdMap.get(String(entry.equipment_id_));
      return remapped ? { ...entry, equipment_id_: remapped } : entry;
    }),
  };
}

/**
 * Syncs master data changes into the given user's namespace.
 *
 * @param {string} userId
 * @returns {Promise<{ inserted: number, updated: number }>}
 */
async function syncMasterToUser(userId) {
  const db = mongoose.connection.db;
  let totalInserted = 0;
  let totalUpdated = 0;

  // Build masterProductId → userProductId map for ingredient ref remapping.
  // Loaded once before processing RECIPE_LIST / DISH_LIST.
  let productIdMap = null;

  async function getProductIdMap() {
    if (productIdMap) return productIdMap;
    const userProducts = await db.collection('PRODUCT_LIST')
      .find({ userId, _masterId: { $ne: null } })
      .project({ _id: 1, _masterId: 1 })
      .toArray();
    productIdMap = new Map(userProducts.map(p => [String(p._masterId), String(p._id)]));
    return productIdMap;
  }

  // Build masterRecipeId → userRecipeId map for sub-recipe ingredient remapping
  // (ingredients with type: 'recipe'). Spans BOTH RECIPE_LIST and DISH_LIST — a
  // sub-recipe/prep can live in either collection. Loaded once from already-cloned
  // docs, then kept up to date below as new clones are allocated during this run.
  let recipeIdMap = null;

  async function getRecipeIdMap() {
    if (recipeIdMap) return recipeIdMap;
    const [userRecipes, userDishes] = await Promise.all([
      db.collection('RECIPE_LIST').find({ userId, _masterId: { $ne: null } }).project({ _id: 1, _masterId: 1 }).toArray(),
      db.collection('DISH_LIST').find({ userId, _masterId: { $ne: null } }).project({ _id: 1, _masterId: 1 }).toArray(),
    ]);
    recipeIdMap = new Map([...userRecipes, ...userDishes].map(d => [String(d._masterId), String(d._id)]));
    return recipeIdMap;
  }

  // Build masterEquipmentId → userEquipmentId map for logistics baseline remapping.
  // Loaded lazily — only when processing RECIPE_LIST / DISH_LIST.
  let equipmentIdMap = null;

  async function getEquipmentIdMap() {
    if (equipmentIdMap) return equipmentIdMap;
    const userEquipment = await db.collection('EQUIPMENT_LIST')
      .find({ userId, _masterId: { $ne: null } })
      .project({ _id: 1, _masterId: 1 })
      .toArray();
    equipmentIdMap = new Map(userEquipment.map(e => [String(e._masterId), String(e._id)]));
    return equipmentIdMap;
  }

  // Build masterSupplierId → userSupplierId map for product supplier remapping.
  // Loaded lazily — only when processing PRODUCT_LIST.
  let supplierIdMap = null;

  async function getSupplierIdMap() {
    if (supplierIdMap) return supplierIdMap;
    const userSuppliers = await db.collection('KITCHEN_SUPPLIERS')
      .find({ userId, _masterId: { $ne: null } })
      .project({ _id: 1, _masterId: 1 })
      .toArray();
    supplierIdMap = new Map(userSuppliers.map(s => [String(s._masterId), String(s._id)]));
    return supplierIdMap;
  }

  // RECIPE_LIST and DISH_LIST share a global name namespace — a name that exists
  // in either collection counts as "taken" for collision purposes.
  // Build this cross-collection name set once, before the per-collection loop.
  const NAMED_TYPES = new Set(['RECIPE_LIST', 'DISH_LIST']);
  let crossCollectionNameSet = null;
  async function getCrossCollectionNameSet() {
    if (crossCollectionNameSet) return crossCollectionNameSet;
    const [recipeDocs, dishDocs] = await Promise.all([
      db.collection('RECIPE_LIST').find({ userId }, { projection: { name_hebrew: 1 } }).toArray(),
      db.collection('DISH_LIST').find({ userId }, { projection: { name_hebrew: 1 } }).toArray(),
    ]);
    crossCollectionNameSet = new Set([
      ...recipeDocs.map(d => d.name_hebrew?.trim()).filter(Boolean),
      ...dishDocs.map(d => d.name_hebrew?.trim()).filter(Boolean),
    ]);
    return crossCollectionNameSet;
  }
  // Accumulates names queued for insertion during this sync run so that a name
  // added from RECIPE_LIST also blocks cloning it again from DISH_LIST (and vice versa).
  const pendingNames = new Set();

  // Pre-decide which RECIPE_LIST/DISH_LIST master docs will be newly cloned
  // (Rule 1) and allocate their user-scoped ids — for BOTH collections at
  // once, before either one's main pass runs. A sub-recipe/prep ingredient
  // can reference a doc in *either* collection regardless of which type the
  // referencing doc itself is (a RECIPE_LIST preparation can list a DISH_LIST
  // dish as a component, not just the reverse) — since CLONEABLE_TYPES only
  // processes RECIPE_LIST then DISH_LIST once each, doing this per-entityType
  // instead of combined would leave RECIPE_LIST → DISH_LIST references
  // (the "backwards" direction relative to processing order) unresolved.
  // `newCloneId` is the single source of truth for both the collision check
  // and the id — the main per-entityType pass below only reads it.
  const newCloneId = new Map(); // masterId -> newId, for RECIPE_LIST/DISH_LIST masters cloned this run
  let recipeDishPrepassDone = false;

  async function ensureRecipeDishPrepass() {
    if (recipeDishPrepassDone) return;
    recipeDishPrepassDone = true;
    await getRecipeIdMap();
    for (const type of ['RECIPE_LIST', 'DISH_LIST']) {
      const col2 = db.collection(type);
      const [masterDocs2, userDocs2] = await Promise.all([
        col2.find({ userId: '__master__' }).project({ _id: 1, name_hebrew: 1 }).toArray(),
        col2.find({ userId, _masterId: { $ne: null } }).project({ _id: 1, _masterId: 1 }).toArray(),
      ]);
      const userByMasterId2 = new Map(userDocs2.map(d => [String(d._masterId), d]));
      for (const master of masterDocs2) {
        const masterId = String(master._id);
        if (userByMasterId2.has(masterId)) continue; // Rule 2/3 — not a new clone
        const masterName = master.name_hebrew?.trim();
        if (masterName) {
          const crossNames = await getCrossCollectionNameSet();
          if (crossNames.has(masterName) || pendingNames.has(masterName)) {
            console.log(`[sync-master]   ${type}: skipping clone — cross-collection name collision "${masterName}"`);
            continue;
          }
        }
        const newId = makeId();
        newCloneId.set(masterId, newId);
        recipeIdMap.set(masterId, newId);
        if (masterName) pendingNames.add(masterName);
      }
    }
  }

  for (const entityType of CLONEABLE_TYPES) {
    const col = db.collection(entityType);

    const [masterDocs, userDocs, allUserDocs] = await Promise.all([
      col.find({ userId: '__master__' }).toArray(),
      col.find({ userId, _masterId: { $ne: null } }).toArray(),
      col.find({ userId }, { projection: { _id: 1, name_hebrew: 1 } }).toArray(),
    ]);

    if (masterDocs.length === 0) continue;

    // Build lookup: _masterId string → user doc
    const userByMasterId = new Map();
    for (const ud of userDocs) {
      userByMasterId.set(String(ud._masterId), ud);
    }

    // PRODUCT_LIST: names are globally unique within the collection.
    // Build a set of all existing user product names so Rule 1 skips master
    // clones that would collide with a user-created product.
    // Also clean up any stale clones that already conflict (created before this
    // guard existed) — these cause the "name is taken" false-positive on edit.
    if (entityType === 'PRODUCT_LIST') {
      const cloneIds = new Set(userDocs.map(d => String(d._id)));
      const userCreatedNames = new Set(
        allUserDocs
          .filter(d => !cloneIds.has(String(d._id)))
          .map(d => d.name_hebrew?.trim())
          .filter(Boolean)
      );
      const staleClones = userDocs.filter(ud => userCreatedNames.has(ud.name_hebrew?.trim()));
      if (staleClones.length > 0) {
        await col.deleteMany({ _id: { $in: staleClones.map(d => d._id) } });
        console.log(`[sync-master]   PRODUCT_LIST: removed ${staleClones.length} stale duplicate clone(s): ${staleClones.map(d => d.name_hebrew).join(', ')}`);
        // Remove stale clones from userByMasterId so Rule 2 doesn't try to update them
        for (const sc of staleClones) {
          userByMasterId.delete(String(sc._masterId));
        }
      }
    }

    const toInsert = [];
    const toUpdate = [];

    // RECIPE_LIST/DISH_LIST: run the combined pre-pass (see above) once,
    // the first time either collection is reached — it covers both, so the
    // second encounter is a no-op.
    if (NAMED_TYPES.has(entityType)) {
      await ensureRecipeDishPrepass();
    }

    for (const master of masterDocs) {
      const masterId = String(master._id);
      const existing = userByMasterId.get(masterId);

      if (!existing) {
        // Rule 1: new master item — clone to user
        // RECIPE_LIST/DISH_LIST: the collision check + id already happened in
        // the pre-pass above (same name namespace rule: these two collections
        // share one namespace, so a name present in the sibling collection is
        // also a collision) — a doc absent from newCloneId was skipped there.
        if (NAMED_TYPES.has(entityType) && !newCloneId.has(masterId)) {
          continue;
        }
        // Skip if the user already has a product with the same name (any origin).
        if (entityType === 'PRODUCT_LIST') {
          const masterName = master.name_hebrew?.trim();
          const allProductNames = new Set(allUserDocs.map(d => d.name_hebrew?.trim()).filter(Boolean));
          if (masterName && allProductNames.has(masterName)) {
            console.log(`[sync-master]   PRODUCT_LIST: skipping clone — name collision "${masterName}"`);
            continue;
          }
        }
        const newId = NAMED_TYPES.has(entityType) ? newCloneId.get(masterId) : makeId();
        const { _id: _mid, userId: _u, _masterId: _m, _userModified: _um, ...rest } = master;
        const clone = {
          ...rest,
          _id: newId,
          userId,
          _masterId: masterId,
          _userModified: false,
        };

        // Remap ingredient refs so they point to user's products/sub-recipes,
        // not master ones. Remap logistics equipment_id_ likewise.
        if (entityType === 'RECIPE_LIST' || entityType === 'DISH_LIST') {
          const [productMap, eqMap, recMap] = await Promise.all([getProductIdMap(), getEquipmentIdMap(), getRecipeIdMap()]);
          clone.ingredients_ = remapIngredients(clone.ingredients_, productMap, recMap);
          clone.logistics_ = remapLogistics(clone.logistics_, eqMap);
        }

        // Remap supplier IDs so cloned products reference user-scoped supplier IDs.
        if (entityType === 'PRODUCT_LIST') {
          const supMap = await getSupplierIdMap();
          if (Array.isArray(clone.supplierIds_)) {
            clone.supplierIds_ = clone.supplierIds_.map(id => supMap.get(id) ?? id);
          }
          if (Array.isArray(clone.sources_)) {
            clone.sources_ = clone.sources_.map(s =>
              s.supplierId ? { ...s, supplierId: supMap.get(s.supplierId) ?? s.supplierId } : s
            );
          }
        }

        toInsert.push(clone);
      } else if (!existing._userModified) {
        // Rule 2: unmodified clone — overwrite with latest master data
        const { _id: _mid, userId: _u, _masterId: _m, _userModified: _um, ...masterRest } = master;

        // Remap ingredient refs so user's product/sub-recipe IDs are preserved
        // (same guard as Rule 1). Remap logistics equipment_id_ likewise.
        if (entityType === 'RECIPE_LIST' || entityType === 'DISH_LIST') {
          const [productMap, eqMap, recMap] = await Promise.all([getProductIdMap(), getEquipmentIdMap(), getRecipeIdMap()]);
          masterRest.ingredients_ = remapIngredients(masterRest.ingredients_, productMap, recMap);
          masterRest.logistics_ = remapLogistics(masterRest.logistics_, eqMap);
        }

        // For products: remap master supplier IDs to user-scoped IDs, then merge sources_.
        if (entityType === 'PRODUCT_LIST') {
          const supMap = await getSupplierIdMap();
          if (Array.isArray(masterRest.supplierIds_)) {
            masterRest.supplierIds_ = masterRest.supplierIds_.map(id => supMap.get(id) ?? id);
          }
          if (Array.isArray(masterRest.sources_)) {
            masterRest.sources_ = masterRest.sources_.map(s =>
              s.supplierId ? { ...s, supplierId: supMap.get(s.supplierId) ?? s.supplierId } : s
            );
          }
          // Merge sources_ — deduplicate by (now remapped) supplierId
          const existingSources = existing.sources_ || [];
          const existingSupplierIds = new Set(existingSources.map(s => s.supplierId).filter(Boolean));
          const newSources = (masterRest.sources_ || []).filter(
            s => !s.supplierId || !existingSupplierIds.has(s.supplierId)
          );
          masterRest.sources_ = [...existingSources, ...newSources];
        }

        toUpdate.push({
          filter: { _id: existing._id },
          update: { $set: { ...masterRest, _userModified: false } },
        });
      }
      // Rule 3: _userModified === true → skip
      // Rule 4: deleted master items → skip (absence in masterDocs means no action)
    }

    if (toInsert.length > 0) {
      await col.insertMany(toInsert, { ordered: false });
      totalInserted += toInsert.length;
    }

    if (toUpdate.length > 0) {
      await col.bulkWrite(
        toUpdate.map(op => ({ updateOne: op })),
        { ordered: false }
      );
    }
    totalUpdated += toUpdate.length;
  }

  return { inserted: totalInserted, updated: totalUpdated };
}

module.exports = { syncMasterToUser };
