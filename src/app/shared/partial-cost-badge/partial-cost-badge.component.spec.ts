import { ComponentFixture, TestBed } from '@angular/core/testing'
import { computed, signal } from '@angular/core'
import { Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import type { MissingItem } from 'src/app/core/engine/event-plan.types'
import { Product } from '@models/product.model'
import { Recipe } from '@models/recipe.model'
import { KitchenStateService } from '@services/kitchen-state.service'
import { PermissionService } from '@services/permission.service'
import { ProductDataService } from '@services/product-data.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { PartialCostBadgeComponent } from './partial-cost-badge.component'

describe('PartialCostBadgeComponent', () => {
  let fixture: ComponentFixture<PartialCostBadgeComponent>
  let canEditMoney = true
  let updateProduct: jasmine.Spy
  let navigate: jasmine.Spy
  let success: jasmine.Spy

  const oil = { _id: 'oil', nameHebrew: 'שמן', baseUnit: 'kg', sources: [], purchaseOptions: [] } as unknown as Product
  const salad = { _id: 'salad', nameHebrew: 'סלט', ingredients: [] } as unknown as Recipe
  const products = signal<Product[]>([oil])
  const recipes = signal<Recipe[]>([salad])

  const unpriced: MissingItem = { kind: 'unpriced', productId: 'oil', name: 'שמן', recipeIds: ['salad'] }
  const unlinked: MissingItem = { kind: 'unlinked', name: 'קצת פטרוזיליה', recipeIds: ['salad'] }
  const deleted: MissingItem = { kind: 'deleted', productId: 'gone', name: 'נעלם', recipeIds: ['salad'] }

  async function setup(missing: MissingItem[]): Promise<HTMLElement> {
    updateProduct = jasmine.createSpy('updateProduct').and.resolveTo()
    navigate = jasmine.createSpy('navigate').and.resolveTo(true)
    success = jasmine.createSpy('onSetSuccessMsg')
    await TestBed.configureTestingModule({
      imports: [PartialCostBadgeComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        {
          provide: KitchenStateService,
          useValue: {
            productsById_: computed(() => new Map(products().map((p) => [p._id, p]))),
            recipesById_: computed(() => new Map(recipes().map((r) => [r._id, r])))
          }
        },
        { provide: PermissionService, useValue: { can: () => canEditMoney } },
        { provide: ProductDataService, useValue: { updateProduct } },
        { provide: TranslationService, useValue: { translate: (k: string) => k } },
        { provide: UserMsgService, useValue: { onSetSuccessMsg: success, onSetErrorMsg: jasmine.createSpy() } },
        { provide: Router, useValue: { navigate } }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(PartialCostBadgeComponent)
    fixture.componentRef.setInput('missing', missing)
    fixture.detectChanges()
    return fixture.nativeElement as HTMLElement
  }

  function openPopover(el: HTMLElement): void {
    ;(el.querySelector('.partial-chip') as HTMLButtonElement).click()
    fixture.detectChanges()
  }

  beforeEach(() => {
    canEditMoney = true
  })

  it('renders nothing when nothing is missing', async () => {
    const el = await setup([])
    expect(el.querySelector('.partial-chip')).toBeNull()
  })

  it('shows the chip and opens the popover on click', async () => {
    const el = await setup([unpriced])
    expect(el.querySelector('.partial-popover')).toBeNull()
    openPopover(el)
    expect(el.querySelector('.partial-popover')).not.toBeNull()
    expect(el.textContent).toContain('סלט')
  })

  it('owner gets a price input and save per unpriced row, and saving writes the product', async () => {
    const el = await setup([unpriced])
    openPopover(el)
    const input = el.querySelector('.partial-price-input') as HTMLInputElement
    const save = el.querySelector('.partial-save') as HTMLButtonElement
    expect(save.disabled).toBeTrue()
    input.value = '20'
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()
    expect(save.disabled).toBeFalse()
    save.click()
    await fixture.whenStable()
    expect(updateProduct).toHaveBeenCalledTimes(1)
    const saved = updateProduct.calls.mostRecent().args[0] as Product
    expect(saved.sources).toEqual([{ supplierId: '', price: 20 }])
    expect(success).toHaveBeenCalledWith('quick_price_saved')
  })

  it('staff sees the waiting text and no input', async () => {
    canEditMoney = false
    const el = await setup([unpriced])
    openPopover(el)
    expect(el.textContent).toContain('awaiting_owner_price')
    expect(el.querySelector('.partial-price-input')).toBeNull()
  })

  it('unlinked and deleted rows show their text; deleted offers open recipe', async () => {
    const el = await setup([unlinked, deleted])
    openPopover(el)
    expect(el.textContent).toContain('line_status_unlinked')
    expect(el.textContent).toContain('line_status_deleted')
    const open = el.querySelector('.partial-open') as HTMLButtonElement
    open.click()
    expect(navigate).toHaveBeenCalledWith(['/recipe-builder', 'salad'])
  })

  it('closes on Escape', async () => {
    const el = await setup([unpriced])
    openPopover(el)
    ;(el.querySelector('.partial-cost') as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    fixture.detectChanges()
    expect(el.querySelector('.partial-popover')).toBeNull()
  })

  describe('placement (plan 460)', () => {
    const popover = (el: HTMLElement): HTMLElement => el.querySelector('.partial-popover') as HTMLElement
    const viewW = (): number => document.documentElement.clientWidth
    const viewH = (): number => document.documentElement.clientHeight

    /** The Karma frame can be narrower than the phone breakpoint; pick the layout the spec is about. */
    function forceLayout(mobile: boolean): void {
      const real = window.matchMedia.bind(window)
      spyOn(window, 'matchMedia').and.callFake((query: string) =>
        query.includes('max-width') ? ({ matches: mobile } as MediaQueryList) : real(query)
      )
    }

    function pinHost(el: HTMLElement, css: string): void {
      el.style.cssText = `position: fixed; ${css}`
    }

    it('renders the popover in the browser top layer', async () => {
      const el = await setup([unpriced])
      openPopover(el)
      expect(popover(el).getAttribute('popover')).toBe('manual')
      expect(popover(el).matches(':popover-open')).toBeTrue()
    })

    it('keeps a popover for a chip at the left edge on screen', async () => {
      forceLayout(false)
      const el = await setup([unpriced])
      pinHost(el, 'left: 0; top: 300px')
      openPopover(el)
      const left = parseFloat(popover(el).style.left)
      expect(left).toBeGreaterThanOrEqual(8)
      expect(left + popover(el).offsetWidth).toBeLessThanOrEqual(viewW())
    })

    it('keeps a popover for a chip at the right edge on screen', async () => {
      forceLayout(false)
      const el = await setup([unpriced])
      pinHost(el, 'right: 0; top: 300px')
      openPopover(el)
      const left = parseFloat(popover(el).style.left)
      expect(left).toBeGreaterThanOrEqual(8)
      expect(left + popover(el).offsetWidth).toBeLessThanOrEqual(viewW() - 8 + 0.5)
    })

    it('keeps the popover inside the viewport vertically for a chip at the top', async () => {
      forceLayout(false)
      const el = await setup([unpriced])
      pinHost(el, 'left: 100px; top: 0')
      openPopover(el)
      const top = parseFloat(popover(el).style.top)
      expect(top).toBeGreaterThanOrEqual(8)
      expect(top + popover(el).offsetHeight).toBeLessThanOrEqual(viewH())
    })

    it('leaves the inline position unset on a phone, where the scss pins a full-width bottom sheet', async () => {
      forceLayout(true)
      const el = await setup([unpriced])
      pinHost(el, 'left: 0; top: 300px')
      openPopover(el)
      expect(popover(el).style.left).toBe('')
      expect(popover(el).style.top).toBe('')
    })
  })
})
