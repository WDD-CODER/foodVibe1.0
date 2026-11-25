import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal, WritableSignal } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { LucideAngularModule } from 'lucide-angular'
import { MenuDishDialogComponent } from './menu-dish-dialog.component'
import { MenuDishDataService } from '@services/menu-dish-data.service'
import { MenuDishCostService } from '@services/menu-dish-cost.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { MetadataRegistryService } from '@services/metadata-registry.service'
import { TranslationService } from '@services/translation.service'
import type { MenuDish } from '@models/menu-dish.model'
import type { Recipe } from '@models/recipe.model'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

type Internals = {
  name_: WritableSignal<string>
  course_: WritableSignal<string>
  price_: WritableSignal<number | null>
  source_: WritableSignal<string>
  typedCost_: WritableSignal<number | null>
  recipeId_: WritableSignal<string | null>
  nameError_: () => string | null
  isValid_: () => boolean
  onRecipePicked: (pick: { option: Recipe; source: 'pointer' }) => void
  save: () => Promise<void>
  serverError_: () => string | null
}

describe('MenuDishDialogComponent (plan 725)', () => {
  let fixture: ComponentFixture<MenuDishDialogComponent>
  let dishes_: WritableSignal<MenuDish[]>
  let data: jasmine.SpyObj<MenuDishDataService>

  const cmp = (): Internals => fixture.componentInstance as unknown as Internals
  const recipe = {
    _id: 'r1',
    nameHebrew: 'שניצל',
    course: 'main',
    ingredients: [],
    yieldAmount: 1
  } as unknown as Recipe

  async function setup(edit: MenuDish | null = null, existing: MenuDish[] = []): Promise<void> {
    dishes_ = signal(existing)
    data = Object.assign(jasmine.createSpyObj('MenuDishDataService', ['addDish', 'updateDish']), {
      allDishes_: dishes_
    }) as unknown as jasmine.SpyObj<MenuDishDataService>
    data.addDish.and.callFake((b: Omit<MenuDish, '_id'>) => Promise.resolve({ ...b, _id: 'new' }) as Promise<MenuDish>)
    data.updateDish.and.callFake((d: MenuDish) => Promise.resolve(d))
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => k ?? '')
    TestBed.configureTestingModule({
      imports: [MenuDishDialogComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: MenuDishDataService, useValue: data },
        {
          provide: MenuDishCostService,
          useValue: {
            costOf: () => ({ state: 'units', costPerPortion: null, missing: [] }),
            netPrice: () => null,
            leftPerDish: () => null
          }
        },
        {
          provide: KitchenStateService,
          useValue: {
            recipes_: signal([recipe]),
            products_: signal([]),
            recipesById_: signal(new Map([['r1', recipe]])),
            productsById_: signal(new Map())
          }
        },
        { provide: MetadataRegistryService, useValue: { courses_: signal([{ key: 'main' }]) } },
        { provide: TranslationService, useValue: translation }
      ]
    })
    fixture = TestBed.createComponent(MenuDishDialogComponent)
    fixture.componentRef.setInput('dish', edit)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  it('picking a recipe fills an empty name and an empty course from it', async () => {
    await setup()
    cmp().onRecipePicked({ option: recipe, source: 'pointer' })
    expect(cmp().name_()).toBe('שניצל')
    expect(cmp().course_()).toBe('main')
    expect(cmp().recipeId_()).toBe('r1')
  })

  it('picking a recipe keeps a name and a course already typed', async () => {
    await setup()
    cmp().name_.set('המנה שלי')
    cmp().course_.set('starter')
    cmp().onRecipePicked({ option: recipe, source: 'pointer' })
    expect(cmp().name_()).toBe('המנה שלי')
    expect(cmp().course_()).toBe('starter')
  })

  it('a second active dish with the same name is refused; the dish being edited is not', async () => {
    const other = { _id: 'o', name: 'שניצל', costSource: 'units', active: true } as MenuDish
    await setup(null, [other])
    cmp().name_.set(' שניצל ')
    expect(cmp().nameError_()).toBe('menu_dish_name_taken')
    expect(cmp().isValid_()).toBeFalse()
    TestBed.resetTestingModule()
    await setup(other, [other])
    expect(cmp().nameError_()).toBeNull()
  })

  it('saves a new typed-cost dish with only the typed field and active true', async () => {
    await setup()
    cmp().name_.set('קולה')
    cmp().price_.set(12)
    cmp().source_.set('typed')
    cmp().typedCost_.set(3)
    await cmp().save()
    const body = data.addDish.calls.mostRecent().args[0]
    expect(body).toEqual(
      jasmine.objectContaining({ name: 'קולה', priceWithVat: 12, costSource: 'typed', typedCost: 3, active: true })
    )
    expect('recipeId' in body).toBeFalse()
    expect('productId' in body).toBeFalse()
  })

  it('switching the cost source on an edit saves only the new source fields', async () => {
    const existing = { _id: 'd1', name: 'שניצל', costSource: 'recipe', recipeId: 'r1', active: true } as MenuDish
    await setup(existing, [existing])
    cmp().source_.set('units')
    await cmp().save()
    const sent = data.updateDish.calls.mostRecent().args[0]
    expect(sent.costSource).toBe('units')
    expect('recipeId' in sent).toBeFalse()
    expect(sent._id).toBe('d1')
  })

  it('a server refusal keeps the popup open with its message; MODULE_OFF has its own text', async () => {
    await setup()
    cmp().name_.set('קולה')
    cmp().source_.set('units')
    const closed = jasmine.createSpy('closed')
    fixture.componentInstance.closed.subscribe(closed)
    data.addDish.and.rejectWith(new HttpErrorResponse({ status: 400, error: { message: 'refused by server' } }))
    await cmp().save()
    expect(cmp().serverError_()).toBe('refused by server')
    expect(closed).not.toHaveBeenCalled()
    data.addDish.and.rejectWith(new HttpErrorResponse({ status: 403, error: { error: 'MODULE_OFF' } }))
    await cmp().save()
    expect(cmp().serverError_()).toBe('restaurant_menu_module_off')
  })
})
