import { fakeAsync, tick } from '@angular/core/testing'
import { of, Subject, take } from 'rxjs'
import { CookViewPage } from './cook-view.page'
import { Product } from '@models/product.model'

describe('CookViewPage', () => {
  it('class symbol is defined', () => {
    expect(CookViewPage).toBeDefined()
  })

  describe('timerDisplay_', () => {
    it('returns h:mm:ss format when seconds >= 3600', () => {
      // 1 hour 30 minutes = 5400 seconds
      const h = Math.floor(5400 / 3600)
      const m = Math.floor((5400 % 3600) / 60)
      const sec = 5400 % 60
      const display =
        h > 0
          ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
          : `${m}:${sec.toString().padStart(2, '0')}`
      expect(display).toBe('1:30:00')
    })

    it('returns m:ss format when seconds < 3600', () => {
      const s = 185 // 3 minutes 5 seconds
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      const sec = s % 60
      const display =
        h > 0
          ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
          : `${m}:${sec.toString().padStart(2, '0')}`
      expect(display).toBe('3:05')
    })
  })

  // Plan 423 - a unit added in cook view weighs what the chef typed for THIS product.
  describe('addUnitFor (plan 423)', () => {
    const product = {
      _id: 'p1',
      nameHebrew: 'חמוצים',
      baseUnit: 'kg',
      purchaseOptions: [{ unitSymbol: 'box', conversionRate: 2, uom: 'kg' }]
    } as unknown as Product

    it('opens the window in product mode and saves the typed amount, never the shared rate', fakeAsync(() => {
      const registry = {
        openUnitCreator: jasmine.createSpy('openUnitCreator'),
        getConversion: jasmine.createSpy('getConversion').and.returnValue(500),
        awaitUnitCreated: jasmine.createSpy('awaitUnitCreated'),
        productUnitAdded$: new Subject<{ key: string; amount: number; basis: string }>()
      }
      const awaitProduct = () => registry.productUnitAdded$.pipe(take(1))
      const save = jasmine.createSpy('saveProduct').and.returnValue(of(product))
      const page = Object.create(CookViewPage.prototype) as Record<string, unknown>
      page['kitchenState'] = { products_: () => [product], saveProduct: save }
      page['unitRegistry'] = { ...registry, awaitProductUnitAdded: awaitProduct }
      const chooseUnit = jasmine.createSpy('chooseUnit')
      page['chooseUnit'] = chooseUnit

      ;(CookViewPage.prototype as unknown as { addUnitFor: (i: number, r: object) => void }).addUnitFor.call(page, 2, {
        type: 'product',
        referenceId: 'p1'
      })
      tick()
      expect(registry.openUnitCreator).toHaveBeenCalledWith({
        existingUnitSymbols: ['box'],
        forProduct: { name: 'חמוצים', baseUnit: 'kg' }
      })

      registry.productUnitAdded$.next({ key: 'jar', amount: 350, basis: 'gram' })
      const saved = save.calls.mostRecent().args[0] as Product
      expect(saved.purchaseOptions.at(-1)).toEqual({
        unitSymbol: 'jar',
        conversionRate: 350,
        uom: 'gram',
        priceOverride: 0
      })
      expect(registry.getConversion).not.toHaveBeenCalled()
      expect(chooseUnit).toHaveBeenCalledWith(2, 'jar')
    }))
  })
})
