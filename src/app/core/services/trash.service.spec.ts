import { TestBed } from '@angular/core/testing'
import { TrashService, TRASH_SECTIONS } from './trash.service'
import { StorageService } from './async-storage.service'
import { RecipeDataService } from './recipe-data.service'
import { DishDataService } from './dish-data.service'
import { ProductDataService } from './product-data.service'
import { EquipmentDataService } from './equipment-data.service'
import { VenueDataService } from './venue-data.service'
import { MenuEventDataService } from './menu-event-data.service'
import { SupplierDataService } from './supplier-data.service'
import { UserMsgService } from './user-msg.service'
import { TranslationService } from './translation.service'

describe('TrashService (plan 407)', () => {
  let service: TrashService
  let storage: jasmine.SpyObj<StorageService>
  const list = (loaded: boolean) =>
    jasmine.createSpyObj('List', { hasLoaded: loaded, reloadFromStorage: Promise.resolve() })
  const recipes = list(true)
  const dishes = list(false)

  beforeEach(() => {
    storage = jasmine.createSpyObj<StorageService>('StorageService', [
      'trash',
      'restore',
      'restoreAll',
      'removePermanently',
      'emptyTrash'
    ])
    storage.trash.and.callFake(<T>(type: string) =>
      Promise.resolve(
        (type === 'menuEvents'
          ? [{ _id: 'e1', name: 'חתונה', deletedAt: 2 }]
          : type === 'recipes'
            ? [{ _id: 'r1', nameHebrew: 'מרק', deletedAt: 1 }]
            : []) as unknown as (T & { deletedAt: number })[]
      )
    )
    storage.restore.and.resolveTo({})
    storage.restoreAll.and.resolveTo()
    storage.removePermanently.and.resolveTo()
    storage.emptyTrash.and.resolveTo()
    recipes.reloadFromStorage.calls.reset()
    dishes.reloadFromStorage.calls.reset()
    TestBed.configureTestingModule({
      providers: [
        TrashService,
        { provide: StorageService, useValue: storage },
        { provide: RecipeDataService, useValue: recipes },
        { provide: DishDataService, useValue: dishes },
        { provide: ProductDataService, useValue: list(false) },
        { provide: EquipmentDataService, useValue: list(false) },
        { provide: VenueDataService, useValue: list(false) },
        { provide: MenuEventDataService, useValue: list(false) },
        { provide: SupplierDataService, useValue: list(false) },
        { provide: UserMsgService, useValue: jasmine.createSpyObj('UserMsgService', ['onSetSuccessMsg']) },
        { provide: TranslationService, useValue: { translate: (k: string) => k } }
      ]
    })
    service = TestBed.inject(TrashService)
  })

  it('loads every Trash type and shows each item by its name', async () => {
    await service.loadTrash()
    expect(storage.trash).toHaveBeenCalledTimes(TRASH_SECTIONS.length)
    expect(service.items().recipes).toEqual([{ _id: 'r1', name: 'מרק', deletedAt: 1 }])
    expect(service.items().menuEvents).toEqual([{ _id: 'e1', name: 'חתונה', deletedAt: 2 }])
    expect(service.hasAnyTrash()).toBeTrue()
  })

  it('restore refreshes a list that already loaded, and leaves an unloaded one alone', async () => {
    await service.restore('recipes', 'r1')
    expect(storage.restore).toHaveBeenCalledWith('recipes', 'r1')
    expect(recipes.reloadFromStorage).toHaveBeenCalled()
    await service.restore('dishes', 'd1')
    expect(dishes.reloadFromStorage).not.toHaveBeenCalled()
  })

  it('dispose, restore-all and empty go to the matching Trash calls', async () => {
    await service.dispose('suppliers', 's1')
    await service.restoreAll('venues')
    await service.disposeAll('equipment')
    expect(storage.removePermanently).toHaveBeenCalledWith('suppliers', 's1')
    expect(storage.restoreAll).toHaveBeenCalledWith('venues')
    expect(storage.emptyTrash).toHaveBeenCalledWith('equipment')
  })

  it('restoreFor maps a version-history type onto its Trash type', async () => {
    await service.restoreFor('dish', 'd1')
    expect(storage.restore).toHaveBeenCalledWith('dishes', 'd1')
  })
})
