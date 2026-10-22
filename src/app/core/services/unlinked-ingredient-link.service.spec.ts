import { TestBed } from '@angular/core/testing'
import { computed, signal } from '@angular/core'
import type { Product } from '@models/product.model'
import type { Recipe } from '@models/recipe.model'
import { KitchenStateService } from './kitchen-state.service'
import { PermissionService } from './permission.service'
import { UnlinkedIngredientLinkService } from './unlinked-ingredient-link.service'

describe('UnlinkedIngredientLinkService', () => {
  let service: UnlinkedIngredientLinkService
  let saveRecipe: jasmine.Spy
  let canEdit: (doc: object) => boolean
  const recipes = signal<Recipe[]>([])

  const parsley = { _id: 'p1', nameHebrew: 'פטרוזיליה', baseUnit: 'kg' } as unknown as Product
  const row = (extra: Record<string, unknown>) => ({ _id: 'r', amount: 1, unit: 'kg', ...extra })
  const make = (id: string, recipeType: string, ingredients: unknown[]) =>
    ({ _id: id, nameHebrew: id, recipeType, ingredients, createdBy: 'u' }) as unknown as Recipe

  beforeEach(() => {
    saveRecipe = jasmine.createSpy('saveRecipe').and.callFake((r: Recipe) => Promise.resolve(r))
    canEdit = () => true
    recipes.set([
      make('dish', 'dish', [
        row({ nameSnapshot: 'קצת פטרוזיליה' }),
        row({ referenceId: 'x', type: 'product', nameSnapshot: 'קצת פטרוזיליה' })
      ]),
      make('prep', 'preparation', [row({ nameHebrew: ' קצת פטרוזיליה ' }), row({ nameHebrew: 'מלח' })]),
      make('other', 'dish', [row({ nameHebrew: 'מלח' })]),
      make('skipped', 'dish', [row({ nameHebrew: 'קצת פטרוזיליה' })])
    ])
    TestBed.configureTestingModule({
      providers: [
        {
          provide: KitchenStateService,
          useValue: { recipesById_: computed(() => new Map(recipes().map((r) => [r._id, r]))), saveRecipe }
        },
        { provide: PermissionService, useValue: { can: (_a: string, ctx: { doc: object }) => canEdit(ctx.doc) } }
      ]
    })
    service = TestBed.inject(UnlinkedIngredientLinkService)
  })

  it('links only the unlinked rows with the same name, in a dish and a prep, and skips the form recipe', async () => {
    const count = await service.link({
      name: 'קצת פטרוזיליה',
      product: parsley,
      recipeIds: ['dish', 'prep', 'other', 'skipped', 'gone'],
      skipRecipeId: 'skipped'
    })
    expect(count).toBe(2)
    expect(saveRecipe).toHaveBeenCalledTimes(2)
    const dish = saveRecipe.calls.argsFor(0)[0] as Recipe
    expect(dish._id).toBe('dish')
    expect(dish.ingredients[0]).toEqual(
      jasmine.objectContaining({ referenceId: 'p1', type: 'product', nameSnapshot: 'פטרוזיליה' })
    )
    expect(dish.ingredients[1].referenceId).toBe('x')
    const prep = saveRecipe.calls.argsFor(1)[0] as Recipe
    expect(prep.ingredients[0]).toEqual(jasmine.objectContaining({ referenceId: 'p1', type: 'product' }))
    expect(prep.ingredients[1].referenceId).toBeUndefined()
  })

  it('does not save a recipe that has no matching row', async () => {
    expect(await service.link({ name: 'קצת פטרוזיליה', product: parsley, recipeIds: ['other'] })).toBe(0)
    expect(saveRecipe).not.toHaveBeenCalled()
  })

  it('canLink is false when one listed recipe cannot be edited, and ignores the skipped one', () => {
    canEdit = (doc) => (doc as Recipe)._id !== 'prep'
    expect(service.canLink(['dish', 'prep'])).toBeFalse()
    expect(service.canLink(['dish', 'prep'], 'prep')).toBeTrue()
    expect(service.canLink(['form'])).toBeTrue()
  })
})
