import { Injectable, Injector, Signal, computed, inject, signal } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { ResolveFn } from '@angular/router'
import { resolveMenuDesign } from '@schemas/menu-design/menu-resolve'
import { MenuDesign, NewMenuDesign } from '../models/menu-design.model'
import { formFromDesign } from '../utils/menu-design-form.util'
import { BaseEntityDataService } from './base-entity-data.service'
import { BusinessService } from './business.service'
import { LoadingService } from './loading.service'
import { TranslationService } from './translation.service'

const ENTITY = 'menuDesigns'
/** The longest name the shared schema accepts. */
export const MENU_DESIGN_NAME_MAX = 60

/**
 * Plan 764: the business's menu designs. Loads on `ensureLoaded()` only (the module may be off).
 * Plan 765: a failed load is remembered (`loadFailed_`) and tried again by the next `ensureLoaded()`, so a screen
 * can show the failure with a retry instead of an empty list.
 */
@Injectable({ providedIn: 'root' })
export class MenuDesignDataService extends BaseEntityDataService<MenuDesign> {
  private readonly business_ = inject(BusinessService)
  private readonly busy_ = inject(LoadingService)
  private readonly injector_ = inject(Injector)

  private readonly failed_ = signal(false)
  private isReady_ = false
  private pending_: Promise<void> | null = null

  /** Domain alias for the base-class signal. */
  readonly allDesigns_: Signal<MenuDesign[]> = this.all_
  /** True while the last try to load the list failed. */
  readonly loadFailed_ = this.failed_.asReadonly()

  /**
   * The design a menu without its own wears (C-SETTINGS): the business default while it is live, else the first live
   * design by `createdAt`, else null (the caller then uses the `classic` base design).
   */
  readonly defaultDesign_ = computed<MenuDesign | null>(() => {
    const design = resolveMenuDesign(null, this.allDesigns_(), this.business_.business_())
    return '_id' in design ? design : null
  })

  constructor() {
    super(ENTITY, false)
  }

  override hasLoaded(): boolean {
    return this.isReady_
  }

  /** Loads the list until one load works; callers at the same time share one request. */
  override ensureLoaded(): Promise<void> {
    if (this.isReady_) return Promise.resolve()
    this.pending_ ??= this.fetchDesigns_().finally(() => (this.pending_ = null))
    return this.pending_
  }

  override reloadFromStorage(): Promise<void> {
    this.isReady_ = false
    return this.ensureLoaded()
  }

  async getDesignById(_id: string): Promise<MenuDesign> {
    try {
      return await this.storage.get<MenuDesign>(ENTITY, _id)
    } catch (err) {
      this.logFailure('crud.menu_design.get_error', 'Failed to get menu design', err)
      throw err
    }
  }

  async addDesign(design: NewMenuDesign): Promise<MenuDesign> {
    try {
      const saved = await this.storage.post<MenuDesign>(ENTITY, design as MenuDesign)
      this.updateItems((list) => [...list, saved])
      this.logging.info({
        event: 'crud.menu_design.create',
        message: 'Menu design created',
        context: { entityType: ENTITY, id: saved._id }
      })
      return saved
    } catch (err) {
      this.logFailure('crud.menu_design.create_error', 'Failed to add menu design', err)
      throw err
    }
  }

  /** One create: the same look under the same name plus the copy mark, the name shortened so the mark fits. */
  async duplicateDesign(_id: string): Promise<MenuDesign> {
    const source = this.allDesigns_().find((d) => d._id === _id) ?? (await this.getDesignById(_id))
    // Read when used: the translations need the network, which loading the designs must not.
    const suffix = ` ${this.injector_.get(TranslationService).translate('menu_design_copy_suffix')}`
    const name = `${source.name.slice(0, MENU_DESIGN_NAME_MAX - suffix.length).trimEnd()}${suffix}`
    return this.addDesign({ ...formFromDesign(source), name })
  }

  async updateDesign(design: MenuDesign): Promise<MenuDesign> {
    try {
      const updated = await this.storage.put<MenuDesign>(ENTITY, design)
      this.updateItems((list) => list.map((d) => (d._id === updated._id ? updated : d)))
      this.logging.info({
        event: 'crud.menu_design.update',
        message: 'Menu design updated',
        context: { entityType: ENTITY, id: updated._id }
      })
      return updated
    } catch (err) {
      this.logFailure('crud.menu_design.update_error', 'Failed to update menu design', err)
      throw err
    }
  }

  async deleteDesign(_id: string): Promise<void> {
    try {
      // The server stamps deletedAt; the design now sits in Trash.
      await this.storage.remove(ENTITY, _id)
      this.updateItems((list) => list.filter((d) => d._id !== _id))
      this.logging.info({
        event: 'crud.menu_design.delete',
        message: 'Menu design deleted',
        context: { entityType: ENTITY, id: _id }
      })
    } catch (err) {
      this.logFailure('crud.menu_design.delete_error', 'Failed to delete menu design', err)
      throw err
    }
  }

  private async fetchDesigns_(): Promise<void> {
    this.failed_.set(false)
    try {
      const rows = await this.busy_.track(this.storage.query<MenuDesign>(ENTITY))
      this.updateItems(() => (Array.isArray(rows) ? rows : []))
      this.isReady_ = true
    } catch (err) {
      this.failed_.set(true)
      this.logFailure('crud.menu_design.load_error', 'Failed to load menu designs', err)
    }
  }

  /** A signed-out answer (401) is handled by the auth interceptor, so it is not logged here. */
  private logFailure(event: string, message: string, err: unknown): void {
    if (err instanceof HttpErrorResponse && err.status === 401) return
    this.logging.error({ event, message, context: { err } })
  }
}

/** Plan 765: the designs are loaded (or known to have failed) before a design screen renders. */
export const menuDesignsEnsureLoadedResolver: ResolveFn<boolean> = () => {
  const designs = inject(MenuDesignDataService)
  return designs.ensureLoaded().then(() => true)
}
