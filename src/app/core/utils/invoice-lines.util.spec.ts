import { buildInvoiceLines } from './invoice-lines.util'

describe('buildInvoiceLines', () => {
  it('numbers the lines by position and takes the printed values by normalised name', () => {
    const lines = buildInvoiceLines(
      [
        { printedName: 'חלב  3%', needsReview: false },
        { printedName: 'Cheese', needsReview: true }
      ],
      [
        { name: 'cheese', quantity: 2, unit: 'kg', unitPrice: 10, lineTotal: 20 },
        { name: 'חלב 3%', quantity: 6, unit: 'יח', unitPrice: 5, lineTotal: 30 }
      ]
    )
    expect(lines).toEqual([
      { printedName: 'חלב  3%', needsReview: false, row: 0, quantity: 6, unit: 'יח', unitPrice: 5, lineTotal: 30 },
      { printedName: 'Cheese', needsReview: true, row: 1, quantity: 2, unit: 'kg', unitPrice: 10, lineTotal: 20 }
    ])
  })

  it('uses the last printed entry with the same name', () => {
    const lines = buildInvoiceLines(
      [{ printedName: 'a', needsReview: false }],
      [
        { name: 'a', quantity: 1, unit: null, unitPrice: 1, lineTotal: 1 },
        { name: 'A', quantity: 9, unit: null, unitPrice: 2, lineTotal: 18 }
      ]
    )
    expect(lines[0].quantity).toBe(9)
  })

  it('leaves out values that are not numbers above 0 and an empty unit', () => {
    const [line] = buildInvoiceLines(
      [{ printedName: 'a', needsReview: false }],
      [{ name: 'a', quantity: 0, unit: ' ', unitPrice: null, lineTotal: Number.NaN }]
    )
    expect(line).toEqual({ printedName: 'a', needsReview: false, row: 0 })
  })

  it('keeps a line with no printed entry', () => {
    expect(buildInvoiceLines([{ printedName: 'x', needsReview: true }], [])).toEqual([
      { printedName: 'x', needsReview: true, row: 0 }
    ])
  })
})
