import { Injectable, inject, signal, computed } from '@angular/core'
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
import type { VersionEntityType } from './version-history.service'

/** Every collection with a Trash (plan 407: deleted items keep `deletedAt` on the doc itself). */
export type TrashType = 'dishes' | 'recipes' | 'products' | 'equipment' | 'venues' | 'menuEvents' | 'suppliers'

export interface TrashItem {
  _id: string
  name: string
  deletedAt: number
}

export interface TrashSection {
  type: TrashType
  titleKey: string
  /** Set when the type keeps version history (the History button). */
  historyType?: VersionEntityType
}

/** Page order: dishes and recipes first, products, then the rest. */
export const TRASH_SECTIONS: readonly TrashSection[] = [
  { type: 'dishes', titleKey: 'trash_dishes', historyType: 'dish' },
  { type: 'recipes', titleKey: 'trash_recipes', historyType: 'recipe' },
  { type: 'products', titleKey: 'trash_products', historyType: 'product' },
  { type: 'equipment', titleKey: 'trash_equipment' },
  { type: 'venues', titleKey: 'trash_venues' },
  { type: 'menuEvents', titleKey: 'trash_menu_events' },
  { type: 'suppliers', titleKey: 'trash_suppliers' }
]

const TYPE_BY_HISTORY: Record<VersionEntityType, TrashType> = { dish: 'dishes', recipe: 'recipes', product: 'products' }

type TrashDoc = { _id: string; deletedAt: number; nameHebrew?: string; name?: string }

const emptyTrash = (): Record<TrashType, TrashItem[]> => ({
  dishes: [],
  recipes: [],
  products: [],
  equipment: [],
  venues: [],
  menuEvents: [],
  suppliers: []
})

@Injectable({ providedIn: 'root' })
export class TrashService {
  private readonly storage = inject(StorageService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)

  /** A list that already loaded must pick up a restored item; one that never loaded will fetch it anyway. */
  private readonly lists: Record<TrashType, { hasLoaded(): boolean; reloadFromStorage(): Promise<void> }> = {
    dishes: inject(DishDataService),
    recipes: inject(RecipeDataService),
    products: inject(ProductDataService),
    equipment: inject(EquipmentDataService),
    venues: inject(VenueDataService),
    menuEvents: inject(MenuEventDataService),
    suppliers: inject(SupplierDataService)
  }

  private readonly items_ = signal<Record<TrashType, TrashItem[]>>(emptyTrash())
  readonly items = this.items_.asReadonly()

  readonly hasAnyTrash = computed(() => Object.values(this.items_()).some((list) => list.length > 0))

  async loadTrash(): Promise<void> {
    const lists = await Promise.all(
      TRASH_SECTIONS.map(async ({ type }) => {
        const docs = await this.storage.trash<TrashDoc>(type)
        return [
          type,
          docs.map((d) => ({ _id: d._id, name: d.nameHebrew ?? d.name ?? '', deletedAt: d.deletedAt }))
        ] as const
      })
    )
    this.items_.set({ ...emptyTrash(), ...Object.fromEntries(lists) })
  }

  async restore(type: TrashType, _id: string): Promise<void> {
    await this.storage.restore(type, _id)
    await this.afterRestore(type, 'trash_restored_msg')
  }

  async dispose(type: TrashType, _id: string): Promise<void> {
    await this.storage.removePermanently(type, _id)
    this.userMsg.onSetSuccessMsg(this.translation.translate('trash_disposed_msg'))
    await this.loadTrash()
  }

  async restoreAll(type: TrashType): Promise<void> {
    await this.storage.restoreAll(type)
    await this.afterRestore(type, 'trash_restored_all_msg')
  }

  async disposeAll(type: TrashType): Promise<void> {
    await this.storage.emptyTrash(type)
    this.userMsg.onSetSuccessMsg(this.translation.translate('trash_disposed_all_msg'))
    await this.loadTrash()
  }

  /** Version-history "restore this version" on a trashed item: bring the item back first. */
  restoreFor(historyType: VersionEntityType, _id: string): Promise<void> {
    return this.restore(TYPE_BY_HISTORY[historyType], _id)
  }

  private async afterRestore(type: TrashType, msgKey: string): Promise<void> {
    const list = this.lists[type]
    if (list.hasLoaded()) await list.reloadFromStorage()
    this.userMsg.onSetSuccessMsg(this.translation.translate(msgKey))
    await this.loadTrash()
  }
}
