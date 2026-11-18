'use strict'
/** Plan 626 — supplierKey and the pure cleaning of an invoice read. */

const { supplierKey } = require('../utils/supplier-key')
const { parsePrintedDate, cleanInvoiceHeader, cleanPrintedLines, suggestSupplier } = require('../utils/invoice-read')
const { SUPPLIER_KEY_PATTERN } = require('../generated/schemas/entities/invoice.schema')

describe('supplierKey', () => {
  it('builds tax, phone, name and empty keys', () => {
    expect(supplierKey({ taxId: '514236987' })).toBe('tax:514236987')
    expect(supplierKey({ phone: '052-1234567' })).toBe('phone:521234567')
    expect(supplierKey({ phone: '+972 52 123 4567' })).toBe('phone:521234567')
    expect(supplierKey({ name: '  ירקן   הצפון ' })).toBe('name:ירקן הצפון')
    expect(supplierKey({})).toBe('')
    expect(supplierKey({ taxId: '12345', phone: '123', name: ' ' })).toBe('')
  })

  it('every non-empty key matches SUPPLIER_KEY_PATTERN', () => {
    for (const input of [{ taxId: '514236987' }, { phone: '052-1234567' }, { name: 'ירקן' }, { name: 'x'.repeat(300) }]) {
      expect(supplierKey(input)).toMatch(SUPPLIER_KEY_PATTERN)
    }
  })

  it('a tax id wins over a phone, a phone over a name', () => {
    expect(supplierKey({ taxId: '514236987', phone: '0521234567', name: 'a' })).toBe('tax:514236987')
    expect(supplierKey({ phone: '0521234567', name: 'a' })).toBe('phone:521234567')
  })
})

describe('parsePrintedDate', () => {
  it('reads the accepted shapes', () => {
    expect(parsePrintedDate('2026-11-03')).toBe('2026-11-03')
    expect(parsePrintedDate('03/11/2026')).toBe('2026-11-03')
    expect(parsePrintedDate('3.11.26')).toBe('2026-11-03')
    expect(parsePrintedDate('3-11-2026')).toBe('2026-11-03')
  })
  it('drops what is not a real date in range', () => {
    expect(parsePrintedDate('31/02/2026')).toBeNull()
    expect(parsePrintedDate('01/01/1999')).toBeNull()
    expect(parsePrintedDate('01/01/2101')).toBeNull()
    expect(parsePrintedDate('yesterday')).toBeNull()
    expect(parsePrintedDate(null)).toBeNull()
  })
})

describe('cleanInvoiceHeader', () => {
  it('keeps only usable values', () => {
    expect(cleanInvoiceHeader({
      supplierName: '  ירקן   א ', supplierTaxId: '514-236-987', supplierPhone: '052-1234567',
      invoiceNumber: ' 77 ', invoiceDate: '3.11.26', vatIncluded: false,
    })).toEqual({
      supplierName: 'ירקן א', supplierTaxId: '514236987', supplierPhone: '0521234567',
      invoiceNumber: '77', invoiceDate: '2026-11-03', vatIncluded: false,
    })
  })
  it('drops an 8-digit tax id, a short phone, a bad date and a non-boolean vat', () => {
    expect(cleanInvoiceHeader({ supplierTaxId: '51423698', supplierPhone: '1234', invoiceDate: '31/02/2026', vatIncluded: 'yes' })).toEqual({})
    expect(cleanInvoiceHeader(null)).toEqual({})
  })
})

describe('cleanPrintedLines', () => {
  it('keeps printed order, drops nameless lines, calculates nothing', () => {
    expect(cleanPrintedLines([
      { name: ' עגבניות ', quantity: '3', unit: ' kg ', unitPrice: 5, lineTotal: 20 },
      { name: '', quantity: 1 },
      { name: 'מלפפון', quantity: -2, unitPrice: 'x' },
    ])).toEqual([
      { name: 'עגבניות', quantity: 3, unit: 'kg', unitPrice: 5, lineTotal: 20 },
      { name: 'מלפפון', quantity: null, unit: null, unitPrice: null, lineTotal: null },
    ])
  })
  it('keeps at most 200', () => {
    expect(cleanPrintedLines(Array.from({ length: 300 }, (_, i) => ({ name: `p${i}` })))).toHaveLength(200)
  })
})

describe('suggestSupplier', () => {
  const sup = (id, extra) => ({ _id: id, nameHebrew: `ספק ${id}`, ...extra })
  it('matches by tax id, then phone, then name', () => {
    const list = [sup('A', { phone: '050-1111111' }), sup('B', { taxId: '514236987' })]
    expect(suggestSupplier({ supplierTaxId: '514236987', supplierName: 'ספק A' }, list)).toEqual({ supplierId: 'B', matchedBy: 'taxId' })
    expect(suggestSupplier({ supplierPhone: '+972501111111', supplierName: 'ספק B' }, list)).toEqual({ supplierId: 'A', matchedBy: 'phone' })
    expect(suggestSupplier({ supplierName: ' ספק  B' }, list)).toEqual({ supplierId: 'B', matchedBy: 'name' })
    expect(suggestSupplier({ supplierName: 'other' }, list)).toEqual({})
  })
  it('matches phone2 too', () => {
    expect(suggestSupplier({ supplierPhone: '0529999999' }, [sup('A', { phone2: '052-9999999' })])).toEqual({ supplierId: 'A', matchedBy: 'phone' })
  })
  it('two suppliers sharing a phone fall through to the name level', () => {
    const list = [sup('A', { phone: '0521234567' }), sup('B', { phone: '0521234567' })]
    expect(suggestSupplier({ supplierPhone: '0521234567', supplierName: 'ספק B' }, list)).toEqual({ supplierId: 'B', matchedBy: 'name' })
    expect(suggestSupplier({ supplierPhone: '0521234567' }, list)).toEqual({})
  })
})
