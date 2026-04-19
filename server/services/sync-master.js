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
 * Ingredient referenceId remapping (Rule 1 only):
 *   When a new master recipe/dish is cloned to a user, its ingredient referenceIds
 *   point to master product _ids. We remap them to the user's corresponding product _ids
 *   using _masterId linkage so the ingredients resolve correctly.
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

/** Remap ingredient referenceIds from master IDs to user-scoped IDs. */
function remapIngredients(ingredients, idMap) {
  if (!Array.isArray(ingredients)) return ingredients;
  return ingredients.map(ing => {
    if (!ing.referenceId) return ing;
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

    const toInsert = [];
    const toUpdate = [];

    for (const master of masterDocs) {
      const masterId = String(master._id);
      const existing = userByMasterId.get(masterId);

      if (!existing) {
        // Rule 1: new master item — clone to user
        // Skip if the user already has any item with the same name in EITHER
        // RECIPE_LIST or DISH_LIST — these two collections share a name namespace,
        // so a name present in the sibling collection is also a collision.
        if (NAMED_TYPES.has(entityType)) {
          const masterName = master.name_hebrew?.trim();
          if (masterName) {
            const crossNames = await getCrossCollectionNameSet();
            if (crossNames.has(masterName) || pendingNames.has(masterName)) {
              console.log(`[sync-master]   ${entityType}: skipping clone — cross-collection name collision "${masterName}"`);
              continue;
            }
          }
        }
        const newId = makeId();
        const { _id: _mid, userId: _u, _masterId: _m, _userModified: _um, ...rest } = master;
        const clone = {
          ...rest,
          _id: newId,
          userId,
          _masterId: masterId,
          _userModified: false,
        };
        // Track this name so sibling-collection items with the same name are skipped.
        if (NAMED_TYPES.has(entityType) && clone.name_hebrew?.trim()) {
          pendingNames.add(clone.name_hebrew.trim());
        }

        // Remap ingredient refs so they point to user's products, not master products.
        // Remap logistics equipment_id_ so they point to user's equipment, not master equipment.
        if (entityType === 'RECIPE_LIST' || entityType === 'DISH_LIST') {
          const [productMap, eqMap] = await Promise.all([getProductIdMap(), getEquipmentIdMap()]);
          clone.ingredients_ = remapIngredients(clone.ingredients_, productMap);
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

        // Remap ingredient refs so user's product IDs are preserved (same guard as Rule 1).
        // Remap logistics equipment_id_ so user's equipment IDs are preserved.
        if (entityType === 'RECIPE_LIST' || entityType === 'DISH_LIST') {
          const [productMap, eqMap] = await Promise.all([getProductIdMap(), getEquipmentIdMap()]);
          masterRest.ingredients_ = remapIngredients(masterRest.ingredients_, productMap);
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
