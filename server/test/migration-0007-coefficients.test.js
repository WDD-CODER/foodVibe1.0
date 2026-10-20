'use strict'
/**
 * Plan 440 — migration 0007: coefficients on event / serving types, master seeds, folds, event snapshots,
 * portionsPerDiner, dish-type colors removed; idempotent; verify read-only.
 */

const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app')
const M = require('../migrations/0007-coefficients')
const { taxonomyTermSchema } = require('../generated/schemas/entities')

beforeAll(async () => {
  await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

beforeEach(async () => {
  const db = testDb()
  for (const c of await db.listCollections().toArray()) if (c.type === 'collection') await db.collection(c.name).drop()
})

const silently = async fn => {
  const log = console.log
  const lines = []
  console.log = (...a) => lines.push(a.join(' '))
  try {
    await fn()
  } finally {
    console.log = log
  }
  return lines
}

const term = (userId, kind, key, extra = {}) => ({
  _id: `${kind}:${userId}:${key}`,
  schemaVersion: 2,
  userId,
  businessId: userId === '__master__' ? '__master__' : `b-${userId}`,
  createdBy: userId,
  createdAt: 1,
  updatedAt: 1,
  kind,
  key,
  sortOrder: 0,
  ...extra,
})

const FIELDS = ['sell_price', 'food_cost_money', 'serving_portions']

async function seed() {
  const db = testDb()
  await db.collection('taxonomyTerms').insertMany([
    term('__master__', 'menuType', 'plated_course', { fields: FIELDS }),
    term('__master__', 'menuType', 'buffet_family', { fields: FIELDS, sortOrder: 1 }),
    term('__master__', 'menuType', 'cocktail_passed', { fields: ['food_cost_pct'], sortOrder: 2 }),
    term('u1', 'eventType', 'חתונה'),
    term('u1', 'eventType', 'בר מצווה', { sortOrder: 1 }),
    term('__master__', 'course', 'starter', { color: '#3B82F6' }),
    term('u1', 'course', 'main', { color: '#EF4444' }),
    term('__master__', 'course', 'nocolor'),
  ])
  await db.collection('menuEvents').insertMany([
    {
      _id: 'ev1',
      userId: 'u1',
      businessId: 'b-u1',
      name: 'חתונה של דנה',
      eventType: 'חתונה',
      servingType: 'buffet_family',
      guestCount: 80,
      sections: [{ _id: 's1', name: 'עיקריות', sortOrder: 0, items: [{ recipeId: 'r1', recipeType: 'dish', servingPortions: 2, derivedPortions: 160 }] }],
    },
    {
      _id: 'ev2',
      userId: 'u1',
      businessId: 'b-u1',
      name: 'קוקטייל',
      eventType: 'בר מצווה',
      servingType: 'cocktail_passed',
      guestCount: 50,
      deletedAt: 5,
      sections: [{ _id: 's1', name: 'ביסים', sortOrder: 0, items: [{ recipeId: 'r2', recipeType: 'dish', derivedPortions: 0 }, { recipeId: 'r3', recipeType: 'dish', portionsPerDiner: 3, derivedPortions: 150 }] }],
    },
    { _id: 'tomb', userId: 'u1', _masterId: 'm', deletedAt: 1, purgedAt: 1 },
  ])
}

async function run(extra = {}) {
  const db = testDb()
  const now = Date.now()
  const result = await M.plan(db, now)
  await M.write(db, { target: 'local', db: 'scratch', ...extra }, result, now)
  return result
}

const labels = { buffet_family: 'בופה / משפחתי', cocktail_passed: 'קוקטייל' }

describe('pure functions', () => {
  it('seedCoefficient: serving types, event types, anything else is 1', () => {
    expect(M.seedCoefficient('menuType', 'plated_course')).toBe(1)
    expect(M.seedCoefficient('menuType', 'buffet_family')).toBe(1.1)
    expect(M.seedCoefficient('menuType', 'cocktail_passed')).toBe(3)
    expect(M.seedCoefficient('menuType', 'chef_plated_front')).toBe(2)
    expect(M.seedCoefficient('menuType', 'unknown')).toBe(1)
    expect(M.seedCoefficient('eventType', 'חתונה')).toBe(1.2)
    expect(M.seedCoefficient('eventType', 'כנסים')).toBe(0.9)
    expect(M.seedCoefficient('eventType', 'בר מצווה')).toBe(1)
  })

  it('termPatch only for an eventType / menuType term without a coefficient', () => {
    expect(M.termPatch({ kind: 'menuType', key: 'buffet_family' })).toEqual({ $set: { coefficient: 1.1 } })
    expect(M.termPatch({ kind: 'menuType', key: 'buffet_family', coefficient: 5 })).toBeNull()
    expect(M.termPatch({ kind: 'course', key: 'x' })).toBeNull()
  })

  it('masterSeedDocs inserts the five event types and chef_plated_front, skipping existing keys', () => {
    const docs = M.masterSeedDocs(new Set(['menuType:plated_course']), 99, { menuType: 2, eventType: -1 })
    expect(docs.map(d => `${d.kind}:${d.key}:${d.coefficient}`)).toEqual([
      'eventType:עסקי:1.1', 'eventType:פרטי:1.15', 'eventType:חתונה:1.2', 'eventType:מסיבה:1.1', 'eventType:כנסים:0.9',
      'menuType:chef_plated_front:2',
    ])
    expect(docs.map(d => d.sortOrder)).toEqual([0, 1, 2, 3, 4, 3])
    for (const d of docs) {
      expect(d).toMatchObject({ userId: '__master__', businessId: '__master__', createdBy: '__master__', schemaVersion: 2, createdAt: 99 })
      expect(taxonomyTermSchema.safeParse(d).success).toBe(true)
    }
    expect(M.masterSeedDocs(new Set(docs.map(d => `${d.kind}:${d.key}`)), 1)).toEqual([])
  })

  it('foldTargets: own terms with a master seed kind + key', () => {
    const own = [term('u1', 'eventType', 'חתונה'), term('u1', 'eventType', 'בר מצווה'), term('u2', 'menuType', 'chef_plated_front', { fields: [] })]
    const keys = new Set(['eventType:חתונה', 'menuType:chef_plated_front'])
    expect(M.foldTargets(own, keys).map(t => t._id)).toEqual(['eventType:u1:חתונה', 'menuType:u2:chef_plated_front'])
  })

  it('eventPatch adds snapshots with coefficient 1 and portionsPerDiner from servingPortions', () => {
    const patch = M.eventPatch({
      eventType: 'חתונה', servingType: 'buffet_family', guestCount: 80,
      sections: [{ items: [{ servingPortions: 2 }, { portionsPerDiner: 0.5 }, {}] }],
    }, labels)
    expect(patch).toEqual({
      $set: {
        eventTypeSnapshot: { key: 'חתונה', name: 'חתונה', coefficient: 1 },
        servingTypeSnapshot: { key: 'buffet_family', name: 'בופה / משפחתי', coefficient: 1 },
        'sections.0.items.0.portionsPerDiner': 2,
        'sections.0.items.2.portionsPerDiner': 1,
      },
    })
  })

  it('eventPatch: nothing missing -> null; empty eventType -> no snapshot', () => {
    expect(M.eventPatch({
      eventType: 'a', servingType: 'b',
      eventTypeSnapshot: { key: 'a', name: 'a', coefficient: 1.2 },
      servingTypeSnapshot: { key: 'b', name: 'b', coefficient: 1 },
      sections: [{ items: [{ portionsPerDiner: 1 }] }],
    }, {})).toBeNull()
    expect(M.eventPatch({ eventType: '', servingType: '', sections: [] }, {})).toBeNull()
  })

  it('portionsChange lists items whose recomputed portions differ from derivedPortions', () => {
    const changes = M.portionsChange({
      _id: 'e', name: 'n', businessId: 'b', guestCount: 50,
      sections: [{ name: 's', items: [
        { recipeId: 'a', servingPortions: 1, derivedPortions: 0 },
        { recipeId: 'b', portionsPerDiner: 1, derivedPortions: 50 },
      ] }],
    })
    expect(changes).toEqual([{ _id: 'e', name: 'n', businessId: 'b', section: 's', recipeId: 'a', stored: 0, recomputed: 50 }])
  })

  it('courseColorPatch only for a course with a color', () => {
    expect(M.courseColorPatch({ kind: 'course', color: '#fff' })).toEqual({ $unset: { color: '' } })
    expect(M.courseColorPatch({ kind: 'course' })).toBeNull()
    expect(M.courseColorPatch({ kind: 'label', color: '#fff' })).toBeNull()
  })
})

describe('write', () => {
  it('seeds, folds, snapshots and removes colors', async () => {
    await seed()
    const result = await run()
    expect(result.folds.map(t => t._id)).toEqual(['eventType:u1:חתונה'])

    const db = testDb()
    const terms = db.collection('taxonomyTerms')
    const coeff = async (userId, kind, key) => (await terms.findOne({ _id: `${kind}:${userId}:${key}` }))?.coefficient
    expect(await coeff('__master__', 'menuType', 'plated_course')).toBe(1)
    expect(await coeff('__master__', 'menuType', 'buffet_family')).toBe(1.1)
    expect(await coeff('__master__', 'menuType', 'cocktail_passed')).toBe(3)
    expect(await coeff('__master__', 'menuType', 'chef_plated_front')).toBe(2)
    for (const [key, c] of [['עסקי', 1.1], ['פרטי', 1.15], ['חתונה', 1.2], ['מסיבה', 1.1], ['כנסים', 0.9]]) {
      expect(await coeff('__master__', 'eventType', key)).toBe(c)
    }
    // own "חתונה" folded into the master one; own "בר מצווה" kept with 1
    expect(await terms.findOne({ _id: 'eventType:u1:חתונה' })).toBeNull()
    expect(await coeff('u1', 'eventType', 'בר מצווה')).toBe(1)
    // every stored term is still valid
    for (const t of await terms.find({}).toArray()) expect(taxonomyTermSchema.safeParse(t).success).toBe(true)
    // course colors removed
    expect((await terms.find({ kind: 'course' }).toArray()).some(t => 'color' in t)).toBe(false)

    const ev1 = await db.collection('menuEvents').findOne({ _id: 'ev1' })
    expect(ev1.eventTypeSnapshot).toEqual({ key: 'חתונה', name: 'חתונה', coefficient: 1 })
    expect(ev1.servingTypeSnapshot).toMatchObject({ key: 'buffet_family', coefficient: 1 })
    expect(ev1.sections[0].items[0].portionsPerDiner).toBe(2)
    expect(ev1.sections[0].items[0].servingPortions).toBe(2)
    // a trashed event is migrated too
    const ev2 = await db.collection('menuEvents').findOne({ _id: 'ev2' })
    expect(ev2.eventTypeSnapshot).toMatchObject({ key: 'בר מצווה', coefficient: 1 })
    expect(ev2.sections[0].items.map(i => i.portionsPerDiner)).toEqual([1, 3])
    // the purged stub is untouched
    expect(await db.collection('menuEvents').findOne({ _id: 'tomb' })).toEqual({ _id: 'tomb', userId: 'u1', _masterId: 'm', deletedAt: 1, purgedAt: 1 })
  })

  it('the dry run lists the portions that change and writes nothing', async () => {
    await seed()
    const db = testDb()
    const result = await M.plan(db, Date.now())
    expect(result.changes.map(c => `${c._id}:${c.recipeId}:${c.stored}>${c.recomputed}`)).toEqual(['ev2:r2:0>50'])
    expect(await db.collection('taxonomyTerms').countDocuments({ coefficient: { $exists: true } })).toBe(0)
    expect(await db.collection('menuEvents').countDocuments({ eventTypeSnapshot: { $exists: true } })).toBe(0)
  })

  it('a second plan after the write reports 0 changes in every step', async () => {
    await seed()
    await run()
    const again = await M.plan(testDb(), Date.now())
    expect(again.inserts).toHaveLength(0)
    expect(again.folds).toHaveLength(0)
    expect(again.termPatches).toHaveLength(0)
    expect(again.colorPatches).toHaveLength(0)
    expect(again.eventPatches).toHaveLength(0)
    const lines = await silently(() => run())
    expect(lines.join('\n')).toContain('0 inserted, 0 folded, 0 coefficients, 0 colors removed, 0 events patched')
  })

  it('a non-scratch write needs a backup', async () => {
    await seed()
    const db = testDb()
    const result = await M.plan(db, Date.now())
    await expect(M.write(db, { target: 'local' }, result, Date.now())).rejects.toThrow('--backup-dir')
  })
})

describe('verify', () => {
  it('fails before the write and passes after it', async () => {
    await seed()
    const db = testDb()
    process.exitCode = 0
    await silently(() => M.verify(db))
    expect(process.exitCode).toBe(1)
    process.exitCode = 0
    await run()
    const lines = await silently(() => M.verify(db))
    expect(process.exitCode).toBe(0)
    expect(lines.join('\n')).toContain('[verify] OK')
  })
})
