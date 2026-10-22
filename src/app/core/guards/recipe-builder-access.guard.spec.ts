import { computed, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router'
import { KitchenStateService } from '@services/kitchen-state.service'
import { RecipeDataService } from '@services/recipe-data.service'
import { DishDataService } from '@services/dish-data.service'
import { LoggingService } from '@services/logging.service'
import { UserService } from '@services/user.service'
import type { Recipe } from '@models/recipe.model'
import type { User } from '@models/user.model'
import { recipeBuilderAccessGuard } from './recipe-builder-access.guard'

const OWNER: User = { _id: 'o1', name: 'owner', email: 'o@x', businessId: 'b1', businessRole: 'owner' }
const STAFF: User = { _id: 's1', name: 'cook', email: 's@x', businessId: 'b1', businessRole: 'staff' }

describe('recipeBuilderAccessGuard (plan 476)', () => {
  const user_ = signal<User | null>(null)
  const items_ = signal<Recipe[]>([])
  let ensureRecipes: jasmine.Spy
  let ensureDishes: jasmine.Spy
  let router: Router

  const item = (over: Partial<Recipe>) => ({ nameHebrew: 'x', ...over }) as Recipe

  const run = (id: string | null) =>
    TestBed.runInInjectionContext(() =>
      recipeBuilderAccessGuard(
        { paramMap: { get: () => id } } as unknown as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot
      )
    ) as Promise<boolean | UrlTree>

  beforeEach(() => {
    user_.set(null)
    items_.set([])
    ensureRecipes = jasmine.createSpy('ensureRecipes').and.resolveTo()
    ensureDishes = jasmine.createSpy('ensureDishes').and.resolveTo()
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: UserService, useValue: { user_, isOwner_: computed(() => user_()?.businessRole === 'owner') } },
        { provide: KitchenStateService, useValue: { recipes_: items_ } },
        { provide: RecipeDataService, useValue: { ensureLoaded: ensureRecipes } },
        { provide: DishDataService, useValue: { ensureLoaded: ensureDishes } },
        { provide: LoggingService, useValue: { info: jasmine.createSpy('info') } }
      ]
    })
    router = TestBed.inject(Router)
  })

  it("sends staff on someone else's recipe to Cook View", async () => {
    user_.set(STAFF)
    items_.set([item({ _id: 'r1', createdBy: 'o1' })])
    const result = await run('r1')
    expect(router.serializeUrl(result as UrlTree)).toBe('/cook/r1')
  })

  it("sends staff on someone else's dish to Cook View", async () => {
    user_.set(STAFF)
    items_.set([item({ _id: 'd1', createdBy: 'o1', recipeType: 'dish' })])
    expect(router.serializeUrl((await run('d1')) as UrlTree)).toBe('/cook/d1')
  })

  it('lets staff open the builder for a recipe he created', async () => {
    user_.set(STAFF)
    items_.set([item({ _id: 'r1', createdBy: 's1' })])
    expect(await run('r1')).toBeTrue()
  })

  it('lets an owner in at once, without waiting for the data', async () => {
    user_.set(OWNER)
    items_.set([item({ _id: 'r1', createdBy: 's1' })])
    expect(await run('r1')).toBeTrue()
    expect(ensureRecipes).not.toHaveBeenCalled()
    expect(ensureDishes).not.toHaveBeenCalled()
  })

  it('waits for recipes and dishes before deciding for staff', async () => {
    user_.set(STAFF)
    await run('r1')
    expect(ensureRecipes).toHaveBeenCalled()
    expect(ensureDishes).toHaveBeenCalled()
  })

  it('lets staff through on an unknown id (the resolver shows not-found)', async () => {
    user_.set(STAFF)
    items_.set([item({ _id: 'r1', createdBy: 'o1' })])
    expect(await run('nope')).toBeTrue()
  })

  it("follows a master id to the user's own copy and sends staff to that copy", async () => {
    user_.set(STAFF)
    items_.set([item({ _id: 'copy1', _masterId: 'prep_1', createdBy: 'o1' })])
    expect(router.serializeUrl((await run('prep_1')) as UrlTree)).toBe('/cook/copy1')
  })
})
