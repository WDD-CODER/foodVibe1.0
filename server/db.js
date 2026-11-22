const mongoose = require('mongoose')
const { CLONEABLE_TYPES } = require('./constants/cloneable-types')
const { SEARCHABLE_ENTITY_TYPES } = require('./constants/searchable-entity-types')
const { ensureLogIndexes } = require('./services/log-sink')
const { logger } = require('./logger')
const { targetFromEnv, mongoUri } = require('./utils/db-target')

async function connectDb() {
  const target = targetFromEnv()
  const uri = mongoUri(target)

  if (!process.env.JWT_ACCESS_SECRET) throw new Error('JWT_ACCESS_SECRET is not set in .env')
  if (!process.env.JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET is not set in .env')

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, minPoolSize: 1, maxPoolSize: 10 })
  logger.info({ event: 'mongo.connection.ok', target })

  // Runtime visibility — the initial connect() above only guards startup. Without these,
  // a mid-session Atlas drop (network blip, IP de-allowlisted, cluster maintenance) is
  // invisible until a request happens to hit it and time out.
  mongoose.connection.on('error', err => logger.error({ err, event: 'mongo.connection.error' }))
  mongoose.connection.on('disconnected', () => logger.error({ event: 'mongo.connection.disconnected' }))
  mongoose.connection.on('reconnected', () => logger.info({ event: 'mongo.connection.reconnected' }))

  // Ensure userId index on every entity collection.
  // createIndex is idempotent — safe to call on every startup.
  // background: true is a no-op on MongoDB 4.2+ but harmless for older drivers.
  const db = mongoose.connection.db
  await Promise.all(
    CLONEABLE_TYPES.map(type =>
      db.collection(type).createIndex({ userId: 1 }, { background: true })
    )
  )
  logger.debug({ event: 'mongo.index.ensured', index: 'userId', collections: CLONEABLE_TYPES.length })

  // VERSION_HISTORY is not cloneable but needs a compound index for per-entity queries.
  await db.collection('VERSION_HISTORY').createIndex(
    { userId: 1, entityType: 1, entityId: 1 },
    { background: true }
  )
  logger.debug({ event: 'mongo.index.ensured', index: 'VERSION_HISTORY(userId, entityType, entityId)' })

  // Compound index for the lean prefix-match /search endpoint (plan 301, Milestone 1).
  // Supports { userId, nameHebrew: ^prefix } queries without a collection scan.
  await Promise.all(
    SEARCHABLE_ENTITY_TYPES.map(type =>
      db.collection(type).createIndex({ userId: 1, nameHebrew: 1 }, { background: true })
    )
  )
  logger.debug({ event: 'mongo.index.ensured', index: 'userId+nameHebrew', collections: SEARCHABLE_ENTITY_TYPES })

  // Compound indexes for GET /:type/count filters (plan 312) — without these, the
  // lowStock/unapproved filters only use the userId prefix and scan every remaining
  // doc in memory.
  await db.collection('products').createIndex(
    { userId: 1, minStockLevel: 1 },
    { background: true }
  )
  await Promise.all(
    ['recipes', 'dishes'].map(type =>
      db.collection(type).createIndex({ userId: 1, isApproved: 1 }, { background: true })
    )
  )
  logger.debug({ event: 'mongo.index.ensured', index: 'count-filters' })

  // Multikey compound index for the DELETE /:type/:id referential-integrity check (plan 312) —
  // without this, deleting a product scans every recipe/dish's ingredients array per user.
  await Promise.all(
    ['recipes', 'dishes'].map(type =>
      db.collection(type).createIndex({ userId: 1, 'ingredients.referenceId': 1 }, { background: true })
    )
  )
  logger.debug({ event: 'mongo.index.ensured', index: 'ingredients.referenceId' })

  // Plan 425: every read and write is scoped by businessId, so each index is led by it. The old
  // userId indexes above stay (migration 0003's --verify checks kind_key_user_unique; dropping is out of scope).
  await Promise.all(
    CLONEABLE_TYPES.map(type => db.collection(type).createIndex({ businessId: 1 }, { background: true }))
  )
  await db.collection('VERSION_HISTORY').createIndex({ businessId: 1, entityType: 1, entityId: 1 }, { background: true })
  await Promise.all(
    SEARCHABLE_ENTITY_TYPES.map(type =>
      db.collection(type).createIndex({ businessId: 1, nameHebrew: 1 }, { background: true })
    )
  )
  await db.collection('products').createIndex({ businessId: 1, minStockLevel: 1 }, { background: true })
  // Plan 648: one copy of each master product per business. Partial, so own products (no _masterId) are free.
  // A business that already has doubles makes the build fail: logged, not fatal — run dedupe-business-products.js.
  try {
    await db.collection('products').createIndex(
      { businessId: 1, _masterId: 1 },
      { unique: true, name: 'product_business_master_unique', partialFilterExpression: { _masterId: { $type: 'string' } } }
    )
  } catch (err) {
    logger.warn({ event: 'mongo.index.failed', index: 'product_business_master_unique', err: err.message })
  }
  await Promise.all(
    ['recipes', 'dishes'].flatMap(type => [
      db.collection(type).createIndex({ businessId: 1, isApproved: 1 }, { background: true }),
      db.collection(type).createIndex({ businessId: 1, 'ingredients.referenceId': 1 }, { background: true }),
    ])
  )
  logger.debug({ event: 'mongo.index.ensured', index: 'businessId' })

  // Plan 424: one document per business; looked up by its owner.
  await db.collection('businesses').createIndex({ ownerId: 1 }, { name: 'business_owner' })

  // Plan 430: per-user-per-day activity records; dashboards read them by business and date. No TTL.
  await db.collection('usageDays').createIndex({ businessId: 1, date: 1 }, { name: 'business_date' })

  // Plan 566: server-only AI ledger, read by the platform admin per business, day and feature.
  await db.collection('aiUsage').createIndex({ businessId: 1, day: 1 }, { name: 'ai_usage_business_day' })
  await db.collection('aiUsage').createIndex({ day: 1, feature: 1 }, { name: 'ai_usage_day_feature' })

  // Plan 321 Phase 3: one term per (kind, key, owner); same names as migration 0003 so both are idempotent.
  await db.collection('taxonomyTerms').createIndex({ kind: 1, key: 1, userId: 1 }, { unique: true, name: 'kind_key_user_unique' })
  await db.collection('taxonomyTerms').createIndex({ userId: 1, kind: 1, sortOrder: 1 }, { name: 'user_kind_order' })
  // Plan 425: terms are unique per (kind, key, business). Partial, so an orphan doc without the field can't break startup.
  await db.collection('taxonomyTerms').createIndex(
    { kind: 1, key: 1, businessId: 1 },
    { unique: true, name: 'kind_key_business_unique', partialFilterExpression: { businessId: { $exists: true } } }
  )
  await db.collection('taxonomyTerms').createIndex({ businessId: 1, kind: 1, sortOrder: 1 }, { name: 'business_kind_order' })
  logger.debug({ event: 'mongo.index.ensured', index: 'taxonomyTerms' })

  // Plan 544: find a client by its phone match key (R-01). Not unique: a trashed or merged client keeps its phone.
  await db.collection('clients').createIndex({ businessId: 1, phoneKey: 1 }, { name: 'client_phone_key' })
  // Plan 545: one live, unmerged client per phone key per business. Old clients have no liveKey, so this builds on any data.
  await db.collection('clients').createIndex(
    { businessId: 1, liveKey: 1 },
    { unique: true, partialFilterExpression: { liveKey: { $exists: true } }, name: 'client_live_key_unique' }
  )
  logger.debug({ event: 'mongo.index.ensured', index: 'clients' })

  // Plan 548: one front desk profile per business, and one public slug per profile. Partial on `slug` (every real
  // profile has one) so a raw fixture doc without it cannot break startup or the cleanup tests.
  await db.collection('frontDeskProfiles').createIndex(
    { slug: 1 },
    { unique: true, name: 'frontdesk_slug_unique', partialFilterExpression: { slug: { $type: 'string' } } }
  )
  await db.collection('frontDeskProfiles').createIndex(
    { businessId: 1 },
    { unique: true, name: 'frontdesk_business_unique', partialFilterExpression: { slug: { $type: 'string' } } }
  )
  logger.debug({ event: 'mongo.index.ensured', index: 'frontDeskProfiles' })

  // Plan 549: requests and bookings. publicToken indexes are partial so a raw fixture doc without a token cannot break startup.
  await db.collection('requests').createIndex({ businessId: 1, status: 1, createdAt: 1 }, { name: 'requests_business_status' })
  await db.collection('requests').createIndex(
    { publicToken: 1 },
    { unique: true, name: 'requests_token_unique', partialFilterExpression: { publicToken: { $type: 'string' } } }
  )
  await db.collection('bookings').createIndex({ businessId: 1, startAt: 1 }, { name: 'bookings_business_start' })
  await db.collection('bookings').createIndex(
    { publicToken: 1 },
    { unique: true, name: 'bookings_token_unique', partialFilterExpression: { publicToken: { $type: 'string' } } }
  )
  // Plan 550: the decision log, read by business over time.
  await db.collection('decisionLog').createIndex({ businessId: 1, at: 1 }, { name: 'decisionlog_business_at' })
  logger.debug({ event: 'mongo.index.ensured', index: 'requests' })

  // Plan 615 (C-REGISTRY): the Modules program. One block per collection; the Contract is named in each comment.
  // C-AIDRAFT: newest drafts per business and feature.
  await db.collection('aiDrafts').createIndex({ businessId: 1, feature: 1, at: 1 }, { name: 'ai_drafts_business_feature_at' })
  // C-FILES
  await db.collection('storedFiles').createIndex({ businessId: 1, kind: 1, createdAt: 1 }, { name: 'stored_files_business_kind' })
  // C-INVOICE
  await db.collection('priceHistory').createIndex({ businessId: 1, productId: 1, at: 1 }, { name: 'price_history_business_product_at' })
  await db.collection('priceHistory').createIndex({ businessId: 1, at: 1 }, { name: 'price_history_business_at' })
  // C-ALIAS: both unique and partial, so an own row and a shared row never collide (a partial filter cannot say "not equal").
  await db.collection('invoiceAliases').createIndex(
    { businessId: 1, supplierKey: 1, nameKey: 1 },
    { unique: true, name: 'invoice_alias_own_unique', partialFilterExpression: { productId: { $exists: true } } }
  )
  await db.collection('invoiceAliases').createIndex(
    { supplierKey: 1, nameKey: 1, masterProductId: 1 },
    { unique: true, name: 'invoice_alias_shared_unique', partialFilterExpression: { masterProductId: { $exists: true } } }
  )
  // C-ACCESS: one live grant per user and business. A partial filter cannot say "revokedAt is absent", so a live row is
  // indexed as null (two live rows collide) and a revoked row carries its own time.
  await db.collection('businessAccess').createIndex(
    { userId: 1, businessId: 1, revokedAt: 1 },
    { unique: true, name: 'business_access_live_unique' }
  )
  // The three readable collections are not cloneable, so the generic businessId index loop does not cover them.
  await db.collection('invoices').createIndex({ businessId: 1, createdAt: -1 }, { name: 'invoices_business_created' })
  await db.collection('diagnoses').createIndex({ businessId: 1, createdAt: -1 }, { name: 'diagnoses_business_created' })
  // Plan 646: a user's alerts, newest first.
  await db.collection('notifications').createIndex({ userId: 1, createdAt: -1 }, { name: 'notifications_user_created' })
  // C-STOCK: the on-hand read.
  await db.collection('stockCounts').createIndex({ businessId: 1, status: 1, countedAt: -1 }, { name: 'stock_counts_business_status_counted' })
  logger.debug({ event: 'mongo.index.ensured', index: 'modules' })

  // Plan 662 (C-REGISTRY-R): the Restaurant program. None of these collections is cloneable, so each names its own
  // businessId index. C-FLOOR: at most one floor plan per business. Partial on `grid` (every real floor plan has one,
  // like frontdesk_business_unique above) so a raw fixture doc without it cannot break startup or the cleanup tests.
  await db.collection('floorPlans').createIndex(
    { businessId: 1 },
    { unique: true, name: 'floor_plans_business_unique', partialFilterExpression: { grid: { $type: 'object' } } }
  )
  // C-HOLD (INV-7, ADR 0033): the only guard against two bookings on one table at one time.
  await db.collection('tableHolds').createIndex({ businessId: 1, tableKey: 1, cell: 1 }, { unique: true, name: 'table_holds_cell_unique' })
  await db.collection('tableHolds').createIndex({ businessId: 1, bookingId: 1 }, { name: 'table_holds_booking' })
  // C-WAIT: a day's waiting list by status.
  await db.collection('waitlistEntries').createIndex({ businessId: 1, date: 1, status: 1 }, { name: 'waitlist_business_date_status' })
  // C-CONV: one open conversation per channel and guest; a closed one has no liveKey, so it never collides.
  await db.collection('conversations').createIndex(
    { businessId: 1, liveKey: 1 },
    { unique: true, partialFilterExpression: { liveKey: { $exists: true } }, name: 'conversations_live_key_unique' }
  )
  await db.collection('conversations').createIndex({ businessId: 1, lastMessageAt: -1 }, { name: 'conversations_business_last' })
  // C-CONV: a provider's retry of one message is stored once.
  await db.collection('messages').createIndex({ businessId: 1, providerMessageId: 1 }, { unique: true, name: 'messages_provider_unique' })
  await db.collection('messages').createIndex({ businessId: 1, conversationId: 1, at: 1 }, { name: 'messages_conversation_at' })
  logger.debug({ event: 'mongo.index.ensured', index: 'restaurant' })

  // Plan 382: app_logs — 90-day TTL + level/event/userId lookups (server/services/log-sink.js).
  await ensureLogIndexes(db)
  logger.debug({ event: 'mongo.index.ensured', index: 'app_logs' })
}

module.exports = { connectDb }
