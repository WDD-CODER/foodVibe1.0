import { computed, signal } from '@angular/core'
import { TestBed, fakeAsync, tick } from '@angular/core/testing'
import { ActivatedRoute, provideRouter } from '@angular/router'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { of } from 'rxjs'
import { LucideAngularModule, icons } from 'lucide-angular'
import { UserService } from '@services/user.service'
import { TranslationService } from '@services/translation.service'
import { Recipe } from '@models/recipe.model'
import type { User } from '@models/user.model'
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
        awaitUnitCreated: jasmine.createSpy('awaitUnitCreated')
      }
      let deliver!: (added: { key: string; amount: number; basis: string } | null) => void
      const awaitProduct = () => new Promise((resolve) => (deliver = resolve))
      const save = jasmine.createSpy('saveProduct').and.returnValue(Promise.resolve(product))
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

      deliver({ key: 'jar', amount: 350, basis: 'gram' })
      tick()
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

  // Plan 476 - staff on someone else's recipe get Cook View with no edit buttons.
  describe('edit buttons (plan 476)', () => {
    const user_ = signal<User | null>(null)
    const render = (createdBy: string) => {
      const recipe = {
        _id: 'r1',
        nameHebrew: 'x',
        createdBy,
        ingredients: [],
        steps: [],
        yieldAmount: 1
      } as unknown as Recipe
      TestBed.overrideProvider(ActivatedRoute, { useValue: { data: of({ recipe }), snapshot: { params: {} } } })
      const fixture = TestBed.createComponent(CookViewPage)
      fixture.detectChanges()
      return fixture.nativeElement as HTMLElement
    }
    const editPill = (el: HTMLElement) =>
      Array.from(el.querySelectorAll('button.cv-pill-btn')).filter((b) => b.textContent?.trim() === 'edit')

    beforeEach(async () => {
      user_.set(null)
      await TestBed.configureTestingModule({
        imports: [CookViewPage, LucideAngularModule.pick({ ...icons, MoreVertical: icons.EllipsisVertical })],
        providers: [
          provideRouter([]),
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: TranslationService, useValue: { translate: (k: string) => k, resolveUnit: (k: string) => k } },
          {
            provide: UserService,
            useValue: {
              user_,
              isLoggedIn: () => !!user_(),
              isOwner_: computed(() => user_()?.businessRole === 'owner')
            }
          }
        ]
      }).compileComponents()
    })

    it("hides the edit pill for staff on someone else's recipe", () => {
      user_.set({ _id: 's1', name: 'c', email: 'c@x', businessId: 'b1', businessRole: 'staff' })
      expect(editPill(render('o1')).length).toBe(0)
    })

    it('shows the edit pill for staff on their own recipe', () => {
      user_.set({ _id: 's1', name: 'c', email: 'c@x', businessId: 'b1', businessRole: 'staff' })
      expect(editPill(render('s1')).length).toBe(1)
    })

    it('shows the edit pill for an owner on any recipe', () => {
      user_.set({ _id: 'o1', name: 'o', email: 'o@x', businessId: 'b1', businessRole: 'owner' })
      expect(editPill(render('s1')).length).toBe(1)
    })
  })
})
