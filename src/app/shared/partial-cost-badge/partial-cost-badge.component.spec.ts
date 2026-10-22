import { ComponentFixture, TestBed } from '@angular/core/testing'
import { computed, signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import type { MissingItem } from 'src/app/core/engine/event-plan.types'
import { Product } from '@models/product.model'
import { Recipe } from '@models/recipe.model'
import { KitchenStateService } from '@services/kitchen-state.service'
import { LoggingService } from '@services/logging.service'
import { PermissionService } from '@services/permission.service'
import { ProductDataService } from '@services/product-data.service'
import { QuickAddProductModalService } from '@services/quick-add-product-modal.service'
import { UnlinkedIngredientLinkService } from '@services/unlinked-ingredient-link.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { PartialCostBadgeComponent } from './partial-cost-badge.component'

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 5))

describe('PartialCostBadgeComponent', () => {
  let fixture: ComponentFixture<PartialCostBadgeComponent>
  let canEditMoney = true
  let updateProduct: jasmine.Spy
  let canLink = true
  let link: jasmine.Spy
  let openModal: jasmine.Spy
  let success: jasmine.Spy
  let error: jasmine.Spy

  const oil = { _id: 'oil', nameHebrew: 'שמן', baseUnit: 'kg', sources: [], purchaseOptions: [] } as unknown as Product
  const salad = { _id: 'salad', nameHebrew: 'סלט', ingredients: [] } as unknown as Recipe
  const products = signal<Product[]>([oil])
  const recipes = signal<Recipe[]>([salad])

  const unpriced: MissingItem = { kind: 'unpriced', productId: 'oil', name: 'שמן', recipeIds: ['salad'] }
  const unlinked: MissingItem = { kind: 'unlinked', name: 'קצת פטרוזיליה', recipeIds: ['salad'] }
  const deleted: MissingItem = { kind: 'deleted', productId: 'gone', name: 'נעלם', recipeIds: ['salad'] }

  async function setup(missing: MissingItem[]): Promise<HTMLElement> {
    updateProduct = jasmine.createSpy('updateProduct').and.resolveTo()
    link = jasmine.createSpy('link').and.resolveTo(1)
    openModal = jasmine.createSpy('open').and.resolveTo(null)
    success = jasmine.createSpy('onSetSuccessMsg')
    error = jasmine.createSpy('onSetErrorMsg')
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
        { provide: UserMsgService, useValue: { onSetSuccessMsg: success, onSetErrorMsg: error } },
        { provide: LoggingService, useValue: { error: jasmine.createSpy('error') } },
        { provide: UnlinkedIngredientLinkService, useValue: { link, canLink: () => canLink } },
        { provide: QuickAddProductModalService, useValue: { open: openModal } }
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
    canLink = true
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

  it('an unlinked row shows the note and the link field, and no open-recipe button', async () => {
    const el = await setup([unlinked])
    openPopover(el)
    expect(el.textContent).toContain('line_status_unlinked')
    expect(el.textContent).toContain('partial_unlinked_note')
    expect(el.querySelector('app-custom-select')).not.toBeNull()
    expect(el.querySelector('.partial-open')).toBeNull()
  })

  it('a deleted row shows the deleted note and no button or field', async () => {
    const el = await setup([deleted])
    openPopover(el)
    expect(el.textContent).toContain('line_status_deleted')
    expect(el.textContent).toContain('partial_deleted_note')
    expect(el.querySelector('.partial-body button')).toBeNull()
    expect(el.querySelector('app-custom-select')).toBeNull()
  })

  it('a user who cannot edit one of the recipes sees the no-permission note instead of the field', async () => {
    canLink = false
    const el = await setup([unlinked])
    openPopover(el)
    expect(el.textContent).toContain('partial_link_no_permission')
    expect(el.querySelector('app-custom-select')).toBeNull()
  })

  describe('linking an unlinked row (plan 466)', () => {
    const select = (_el: HTMLElement): { triggerLink(value: string): void; addNew(typed: string): void } => {
      const de = fixture.debugElement.query((d) => d.nativeElement.tagName === 'APP-CUSTOM-SELECT')
      const cmp = de.componentInstance as {
        valueChange: { emit(v: string): void }
        addNewChosen: { emit(v: string): void }
      }
      return {
        triggerLink: (value) => cmp.valueChange.emit(value),
        addNew: (typed) => {
          cmp.addNewChosen.emit(typed)
          cmp.valueChange.emit('__add_product__')
        }
      }
    }

    it('choosing an existing product links it once with the row name and recipe ids, and emits linked', async () => {
      const el = await setup([unlinked])
      fixture.componentRef.setInput('formRecipeId', 'form')
      const emitted: { name: string; product: Product }[] = []
      fixture.componentInstance.linked.subscribe((l) => emitted.push(l))
      openPopover(el)
      select(el).triggerLink('oil')
      await flush()
      expect(link).toHaveBeenCalledTimes(1)
      expect(link).toHaveBeenCalledWith({
        name: 'קצת פטרוזיליה',
        product: oil,
        recipeIds: ['salad'],
        skipRecipeId: 'form'
      })
      expect(emitted).toEqual([{ name: 'קצת פטרוזיליה', product: oil }])
      expect(success).toHaveBeenCalledWith('partial_linked')
    })

    it('add-new opens the create window with the typed name and links the saved product', async () => {
      const el = await setup([unlinked])
      openModal.and.resolveTo(oil)
      openPopover(el)
      select(el).addNew('פטרוז')
      await flush()
      expect(openModal).toHaveBeenCalledWith({ prefillName: 'פטרוז' })
      expect(link).toHaveBeenCalledTimes(1)
    })

    it('add-new with nothing typed prefills the row name', async () => {
      const el = await setup([unlinked])
      openPopover(el)
      select(el).addNew('')
      await flush()
      expect(openModal).toHaveBeenCalledWith({ prefillName: 'קצת פטרוזיליה' })
    })

    it('cancelling the create window links nothing', async () => {
      const el = await setup([unlinked])
      openPopover(el)
      select(el).addNew('x')
      await flush()
      expect(link).not.toHaveBeenCalled()
      expect(success).not.toHaveBeenCalled()
    })

    it('a failed write adds no second log or toast (saveRecipe already reports it)', async () => {
      const el = await setup([unlinked])
      link.and.rejectWith(new Error('boom'))
      const logging = TestBed.inject(LoggingService)
      openPopover(el)
      select(el).triggerLink('oil')
      await flush()
      expect(logging.error).not.toHaveBeenCalled()
      expect(error).not.toHaveBeenCalled()
      expect(success).not.toHaveBeenCalled()
    })

    it('takes the popover out of the top layer while the create window is open, then puts it back', async () => {
      let finish: (p: Product | null) => void = () => undefined
      const el = await setup([unlinked])
      openModal.and.returnValue(new Promise<Product | null>((resolve) => (finish = resolve)))
      openPopover(el)
      const popover = el.querySelector('.partial-popover') as HTMLElement
      expect(popover.matches(':popover-open')).toBeTrue()
      select(el).addNew('x')
      expect(popover.matches(':popover-open')).toBeFalse()
      finish(null)
      await flush()
      expect(popover.matches(':popover-open')).toBeTrue()
    })

    it('keeps the popover open on a click outside while the create window is open', async () => {
      let finish: (p: Product | null) => void = () => undefined
      const el = await setup([unlinked])
      openModal.and.returnValue(new Promise<Product | null>((resolve) => (finish = resolve)))
      openPopover(el)
      select(el).addNew('x')
      document.body.click()
      fixture.detectChanges()
      expect(el.querySelector('.partial-popover')).not.toBeNull()
      finish(null)
      await flush()
    })
  })

  it('closes on Escape', async () => {
    const el = await setup([unpriced])
    openPopover(el)
    ;(el.querySelector('.partial-cost') as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    fixture.detectChanges()
    expect(el.querySelector('.partial-popover')).toBeNull()
  })

  it('stays open when a mouse user hovers the chip and then clicks it (hover, focus, click)', async () => {
    const real = window.matchMedia.bind(window)
    spyOn(window, 'matchMedia').and.callFake((query: string) =>
      query.includes('hover') ? ({ matches: true } as MediaQueryList) : real(query)
    )
    const el = await setup([unpriced])
    const host = el.querySelector('.partial-cost') as HTMLElement
    const chip = el.querySelector('.partial-chip') as HTMLButtonElement
    host.dispatchEvent(new MouseEvent('mouseenter'))
    fixture.detectChanges()
    expect(el.querySelector('.partial-popover')).not.toBeNull()
    chip.focus()
    chip.click()
    fixture.detectChanges()
    expect(el.querySelector('.partial-popover')).not.toBeNull()
    host.dispatchEvent(new MouseEvent('mouseleave'))
    fixture.detectChanges()
    expect(el.querySelector('.partial-popover')).withContext('the click pinned it').not.toBeNull()
    chip.click()
    fixture.detectChanges()
    expect(el.querySelector('.partial-popover')).withContext('a second click closes it').toBeNull()
  })

  it('pins the popover when focus moves into it, so the mouse leaving does not close it', async () => {
    const real = window.matchMedia.bind(window)
    spyOn(window, 'matchMedia').and.callFake((query: string) =>
      query.includes('hover') ? ({ matches: true } as MediaQueryList) : real(query)
    )
    const el = await setup([unpriced])
    const host = el.querySelector('.partial-cost') as HTMLElement
    host.dispatchEvent(new MouseEvent('mouseenter'))
    fixture.detectChanges()
    ;(el.querySelector('.partial-price-input') as HTMLInputElement).focus()
    host.dispatchEvent(new MouseEvent('mouseleave'))
    fixture.detectChanges()
    expect(el.querySelector('.partial-popover')).not.toBeNull()
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
