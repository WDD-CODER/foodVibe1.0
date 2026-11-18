'use strict'
/** Plan 625 — the pure rules of the invoice trail. */
const { changePct, buildInvoiceLines, invoiceKeptRatio } = require('../utils/invoice-trail')

describe('changePct', () => {
  it('gives the percent with two decimals', () => {
    expect(changePct(5.9, 6.49)).toBe(10)
    expect(changePct(3, 4)).toBe(33.33)
    expect(changePct(10, 8)).toBe(-20)
  })
  it('is undefined without a usable previous price', () => {
    expect(changePct(undefined, 5)).toBeUndefined()
    expect(changePct(0, 5)).toBeUndefined()
    expect(changePct('4', 5)).toBeUndefined()
  })
})

describe('buildInvoiceLines', () => {
  it('keeps the order, the sent fields and the outcome of each row', () => {
    const lines = buildInvoiceLines(
      [{ printedName: 'b', quantity: 2, needsReview: false, row: 1 }, { printedName: 'a', needsReview: true, row: 0 }],
      [{ result: 'created', productId: 'p0', price: 4 }, { result: 'no_price', productId: 'p1', price: null }]
    )
    expect(lines).toEqual([
      { printedName: 'b', quantity: 2, needsReview: false, price: null, result: 'no_price', productId: 'p1' },
      { printedName: 'a', needsReview: true, price: 4, result: 'created', productId: 'p0' },
    ])
    expect(lines[0]).not.toHaveProperty('row')
  })
  it('leaves productId out when the outcome has none', () => {
    expect(buildInvoiceLines([{ printedName: 'x', needsReview: false, row: 0 }], [{ result: 'invalid', price: null }])[0]).not.toHaveProperty('productId')
  })
})

describe('invoiceKeptRatio', () => {
  const printed = [
    { name: 'עגבניה', quantity: 2, unit: 'kg', unitPrice: 5, lineTotal: 10 },
    { name: 'מלפפון', quantity: 1, unit: 'kg', unitPrice: 4, lineTotal: 4 },
  ]
  it('counts lines saved unchanged', () => {
    const saved = [
      { printedName: 'עגבניה', quantity: 2, unitPrice: 5, lineTotal: 10 },
      { printedName: 'מלפפון', quantity: 1, unitPrice: 4.5, lineTotal: 4.5 },
    ]
    expect(invoiceKeptRatio({ printed }, saved)).toBe(0.5)
  })
  it('treats null and absent as equal', () => {
    expect(invoiceKeptRatio({ printed: [{ name: 'a', quantity: null, unitPrice: 3, lineTotal: null }] }, [{ printedName: 'a', unitPrice: 3 }])).toBe(1)
  })
  it('counts a repeated printed name once, with its last line', () => {
    const draft = { printed: [{ name: 'a', unitPrice: 1 }, { name: 'A ', unitPrice: 2 }] }
    expect(invoiceKeptRatio(draft, [{ printedName: 'a', unitPrice: 2 }])).toBe(1)
    expect(invoiceKeptRatio(draft, [{ printedName: 'a', unitPrice: 1 }])).toBe(0)
  })
  it('uses each saved line once and never gives more than 1', () => {
    const draft = { printed: [{ name: 'a', unitPrice: 1 }, { name: 'b', unitPrice: 1 }] }
    expect(invoiceKeptRatio(draft, [{ printedName: 'a', unitPrice: 1 }, { printedName: 'a', unitPrice: 1 }, { printedName: 'b', unitPrice: 1 }])).toBe(1)
  })
  it('is 0 for a draft with no suggested lines', () => {
    expect(invoiceKeptRatio({}, [])).toBe(0)
    expect(invoiceKeptRatio({ printed: 'x' }, [])).toBe(0)
    expect(invoiceKeptRatio({ printed: [] }, [{ printedName: 'a' }])).toBe(0)
    expect(invoiceKeptRatio({ printed: [{ name: '  ' }] }, [])).toBe(0)
  })
})
