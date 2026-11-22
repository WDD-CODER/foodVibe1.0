'use strict'
/** Plan 668 (C-HOLD): the hold service. The unique index of `tableHolds` decides who has a table. */

const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app')
const { CELL_MS, claim, move, release, holdsOf, rangesOf } = require('../services/table-holds')

beforeAll(async () => {
  await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

beforeEach(async () => {
  await testDb().collection('tableHolds').deleteMany({})
})

const MIN = 60000
const T20 = Date.UTC(2030, 0, 1, 20, 0) // a multiple of 15 minutes
const at = minutes => T20 + minutes * MIN // 0 = 20:00
const A = 'tableaaa1'
const B = 'tablebbb2'
const book = (id, businessId = 'b1') => ({ _id: id, businessId })
const rows = (query = {}) => testDb().collection('tableHolds').find(query).toArray()

describe('claim', () => {
  it('takes every cell of every table: two tables, 20:00-21:30, 12 rows', async () => {
    expect(await claim(testDb(), book('k1'), [A, B], at(0), at(90))).toEqual({ ok: true })
    const all = await rows()
    expect(all).toHaveLength(12)
    expect(all.every(r => r.bookingId === 'k1' && r.businessId === 'b1')).toBe(true)
  })

  it('a second claim of one table from 21:15 loses and leaves exactly the first 12 rows; 21:30 is free', async () => {
    await claim(testDb(), book('k1'), [A, B], at(0), at(90))
    const before = (await rows()).map(r => r._id).sort()
    expect(await claim(testDb(), book('k2'), [A], at(75), at(135))).toEqual({ ok: false })
    expect((await rows()).map(r => r._id).sort()).toEqual(before)
    expect(await claim(testDb(), book('k3'), [A], at(90), at(150))).toEqual({ ok: true })
    expect(await rows({ bookingId: 'k3' })).toHaveLength(4)
  })

  it('the same table in another business is not in the way', async () => {
    await claim(testDb(), book('k1'), [A], at(0), at(90))
    expect(await claim(testDb(), book('k2', 'b2'), [A], at(0), at(90))).toEqual({ ok: true })
  })
})

describe('release', () => {
  it('removes all rows of the booking, or the cells from a moment on', async () => {
    await claim(testDb(), book('k1'), [A], at(0), at(90))
    await claim(testDb(), book('k2'), [B], at(0), at(30))
    await release(testDb(), 'b1', 'k1', at(45))
    expect((await rows({ bookingId: 'k1' })).map(r => r.cell).sort()).toEqual([at(0), at(15), at(30)])
    await release(testDb(), 'b1', 'k1')
    expect(await rows({ bookingId: 'k1' })).toHaveLength(0)
    expect(await rows({ bookingId: 'k2' })).toHaveLength(2)
  })
})

describe('holdsOf', () => {
  it('one hold per row inside the range, none of another business, own booking left out on request', async () => {
    await claim(testDb(), book('k1'), [A], at(0), at(45))
    await claim(testDb(), book('k2', 'b2'), [A], at(0), at(45))
    await claim(testDb(), book('k3'), [B], at(300), at(330))
    const holds = await holdsOf(testDb(), 'b1', at(0), at(120))
    expect(holds).toEqual([0, 15, 30].map(m => ({ tableKey: A, startAt: at(m), endAt: at(m) + CELL_MS })))
    expect(await holdsOf(testDb(), 'b1', at(0), at(120), 'k1')).toEqual([])
  })
})

describe('move', () => {
  it('to the same table one cell later keeps exactly the new cells', async () => {
    await claim(testDb(), book('k1'), [A], at(0), at(60))
    expect(await move(testDb(), book('k1'), [A], at(15), at(75))).toEqual({ ok: true })
    expect((await rows()).map(r => r.cell).sort()).toEqual([15, 30, 45, 60].map(at))
  })

  it('onto a table another booking holds loses and leaves the old rows untouched', async () => {
    await claim(testDb(), book('k1'), [A], at(0), at(60))
    await claim(testDb(), book('k2'), [B], at(30), at(90))
    const before = (await rows({ bookingId: 'k1' })).map(r => r._id).sort()
    expect(await move(testDb(), book('k1'), [B], at(0), at(60))).toEqual({ ok: false })
    expect((await rows({ bookingId: 'k1' })).map(r => r._id).sort()).toEqual(before)
    expect(await rows({ bookingId: 'k2' })).toHaveLength(4)
  })
})

describe('rangesOf', () => {
  it('merges touching cells of one booking on one table', async () => {
    await claim(testDb(), book('k1'), [A, B], at(0), at(45))
    await claim(testDb(), book('k2'), [A], at(60), at(75))
    expect(rangesOf(await rows())).toEqual([
      { tableKey: A, bookingId: 'k1', startAt: at(0), endAt: at(45) },
      { tableKey: B, bookingId: 'k1', startAt: at(0), endAt: at(45) },
      { tableKey: A, bookingId: 'k2', startAt: at(60), endAt: at(75) },
    ])
  })
})
