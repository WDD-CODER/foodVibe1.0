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

    // Build name index for all user docs (to detect name collisions on Rule 1).
    // Prevents cloning a master item when the user already owns a same-name item.
    const NAMED_TYPES = new Set(['RECIPE_LIST', 'DISH_LIST']);
    const userNameSet = new Set();
    if (NAMED_TYPES.has(entityType)) {
      for (const ud of allUserDocs) {
        const n = ud.name_hebrew?.trim();
        if (n) userNameSet.add(n);
      }
    }

    const toInsert = [];
    const toUpdate = [];

    for (const master of masterDocs) {
      const masterId = String(master._id);
      const existing = userByMasterId.get(masterId);

      if (!existing) {
        // Rule 1: new master item — clone to user
        // Skip if the user already has any item with the same name (name-collision guard).
        if (NAMED_TYPES.has(entityType)) {
          const masterName = master.name_hebrew?.trim();
          if (masterName && userNameSet.has(masterName)) {
            console.log(`[sync-master]   ${entityType}: skipping clone — name collision "${masterName}"`);
            continue;
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

        // Remap ingredient refs so they point to user's products, not master products
        if (entityType === 'RECIPE_LIST' || entityType === 'DISH_LIST') {
          const idMap = await getProductIdMap();
          clone.ingredients_ = remapIngredients(clone.ingredients_, idMap);
        }

        toInsert.push(clone);
      } else if (!existing._userModified) {
        // Rule 2: unmodified clone — overwrite with latest master data
        const { _id: _mid, userId: _u, _masterId: _m, _userModified: _um, ...masterRest } = master;

        // Remap ingredient refs so user's product IDs are preserved (same guard as Rule 1)
        if (entityType === 'RECIPE_LIST' || entityType === 'DISH_LIST') {
          const idMap = await getProductIdMap();
          masterRest.ingredients_ = remapIngredients(masterRest.ingredients_, idMap);
        }

        // For products: merge sources_ arrays (deduplicate by supplierId)
        if (entityType === 'PRODUCT_LIST' && Array.isArray(masterRest.sources_)) {
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

    for (const op of toUpdate) {
      await col.updateOne(op.filter, op.update);
    }
    totalUpdated += toUpdate.length;
  }

  return { inserted: totalInserted, updated: totalUpdated };
}

/**
 * One-time cleanup: removes auto-cloned records (_masterId != null) when the user
 * already owns a same-name record with _masterId == null (user-created / old-seed record).
 * User-created records always take precedence over auto-cloned master copies.
 *
 * Safe to run multiple times (idempotent).
 *
 * @param {string} userId
 * @returns {Promise<number>} number of orphan clones removed
 */
async function cleanupNameCollisionClones(userId) {
  const db = mongoose.connection.db;
  const NAMED_TYPES = ['RECIPE_LIST', 'DISH_LIST'];
  let totalRemoved = 0;

  for (const entityType of NAMED_TYPES) {
    const col = db.collection(entityType);
    const allUserDocs = await col.find({ userId }).toArray();

    // Build map: name → list of docs
    const byName = new Map();
    for (const doc of allUserDocs) {
      const n = doc.name_hebrew?.trim();
      if (!n) continue;
      if (!byName.has(n)) byName.set(n, []);
      byName.get(n).push(doc);
    }

    const idsToDelete = [];
    for (const [, docs] of byName) {
      if (docs.length < 2) continue;
      // If there is at least one user-created doc (_masterId null), delete the clones
      const hasUserCreated = docs.some(d => !d._masterId);
      if (!hasUserCreated) continue;
      const clones = docs.filter(d => d._masterId);
      for (const clone of clones) {
        idsToDelete.push(clone._id);
      }
    }

    if (idsToDelete.length > 0) {
      const result = await col.deleteMany({ _id: { $in: idsToDelete } });
      totalRemoved += result.deletedCount;
      console.log(`[sync-master] cleanup ${entityType}: removed ${result.deletedCount} orphan clones for user ${userId}`);
    }
  }

  return totalRemoved;
}

module.exports = { syncMasterToUser, cleanupNameCollisionClones };
