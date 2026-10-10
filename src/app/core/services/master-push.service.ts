import { inject, Injectable } from '@angular/core'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { RecipeDataService } from '@services/recipe-data.service'
import { DishDataService } from '@services/dish-data.service'
import { ProductDataService } from '@services/product-data.service'
import { SupplierDataService } from '@services/supplier-data.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { UserService } from '@services/user.service'
import { Recipe } from '@models/recipe.model'
import { Product } from '@models/product.model'
import { Supplier } from '@models/supplier.model'

/** What the user chose when saving an item cloned from a shared master. */
export type SaveScope = 'me' | 'everyone' | 'cancel'

/** What the admin is doing — picks the prompt wording (plan 365). */
export type ScopeAction = 'save' | 'create' | 'delete'

/** What kind of item the prompt is about — picks the noun in the wording (plan 365). */
export type ScopeEntity = 'recipe' | 'dish' | 'product' | 'metadata' | 'supplier'

export interface ScopeOptions {
  entity: ScopeEntity
  /** Number of selected items for bulk actions; > 1 switches to the plural wording. */
  count?: number
}

export interface SaveScopeOptions extends ScopeOptions {
  /**
   * A brand-new item: prompt even without a _masterId (the server assigns one only at insert)
   * and word it as a publish ("create") instead of an update. Was `forcePrompt`.
   */
  isNew?: boolean
}

/** Texts for one scope prompt. `message` is final display text (already translated). */
export interface ScopeTexts {
  headerKey: string
  message: string
  meLabelKey: string
  everyoneLabelKey: string
}

/** recipe → 'recipe', dish → 'dish' — the two share one model. */
export function recipeScopeEntity(recipe: Pick<Recipe, 'recipeType'> | null | undefined): ScopeEntity {
  return recipe?.recipeType === 'dish' ? 'dish' : 'recipe'
}

/** A mixed selection reads as recipes; an all-dish selection as dishes. */
export function bulkScopeEntity(recipes: ReadonlyArray<Pick<Recipe, 'recipeType'>>): ScopeEntity {
  return recipes.length > 0 && recipes.every((r) => r.recipeType === 'dish') ? 'dish' : 'recipe'
}

const SCOPE_HEADER_KEYS: Record<ScopeAction, string> = {
  save: 'scope_save_header',
  create: 'scope_create_header',
  delete: 'scope_delete_header'
}

const SCOPE_BUTTON_KEYS: Record<ScopeAction, { me: string; everyone: string }> = {
  save: { me: 'scope_me', everyone: 'scope_everyone_update' },
  create: { me: 'scope_me', everyone: 'scope_everyone_publish' },
  delete: { me: 'scope_delete_me', everyone: 'scope_delete_everyone' }
}

/**
 * Asks whether an edit to a master-derived recipe applies to everyone or only
 * to the current user, and performs the push when they choose everyone.
 *
 * Exists because the choice has to appear at every save that changes SHARED
 * recipe content — recipe builder, cook view, and the recipe-book list's
 * inline edits — and duplicating the prompt across them drifts. A save that
 * skips the prompt silently sets `_userModified: true`, and sync-master's
 * Rule 3 then excludes that recipe from every future master update.
 *
 * Deliberately NOT used for per-user state such as `favoritedBy`: pushing a
 * personal favourite to master would publish it to every other user.
 */
/**
 * Header, message and button texts for one admin scope prompt (plan 365): the action picks
 * the header and buttons, the entity picks the message noun, count > 1 switches to the
 * "{n} items selected" plural message, and deleting products appends the
 * removed-from-every-recipe warning. Pure so metadata-manager can share it without
 * pulling in this service's data dependencies.
 */
export function buildScopeTexts(
  action: ScopeAction,
  entity: ScopeEntity,
  count: number,
  translate: (key: string) => string
): ScopeTexts {
  const buttons = SCOPE_BUTTON_KEYS[action]
  const messageKey = count > 1 ? `scope_${action}_many` : `scope_${action}_${entity}`
  let message = translate(messageKey).replace('{n}', String(count))
  if (action === 'delete' && entity === 'product') {
    message = `${message} ${translate('scope_delete_product_warning')}`
  }
  return {
    headerKey: SCOPE_HEADER_KEYS[action],
    message,
    meLabelKey: buttons.me,
    everyoneLabelKey: buttons.everyone
  }
}

@Injectable({ providedIn: 'root' })
export class MasterPushService {
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly recipeData = inject(RecipeDataService)
  private readonly dishData = inject(DishDataService)
  private readonly productData = inject(ProductDataService)
  private readonly supplierData = inject(SupplierDataService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly userService = inject(UserService)
  private readonly isAdmin_ = this.userService.isAdmin_

  /**
   * Returns the chosen scope. When the item is not linked to a master there
   * is nothing to publish, so this resolves to `'me'` without prompting —
   * unless `isNew` (2026-09-30: an admin's brand-new recipe/product, which has
   * no _masterId yet client-side since the server only assigns one at insert,
   * but is just as push-able once saved — see the push-to-master route's
   * upsert fix). Non-admins always resolve to 'me' silently, matching
   * metadata-manager's resolvePushScope — the server's push-to-master/
   * delete-from-master/purge-ingredient-everywhere routes are requireAdmin-gated,
   * so a non-admin would otherwise be offered a prompt that 403s.
   */
  async askScope(item: Pick<Recipe, '_masterId'> | null | undefined, opts: SaveScopeOptions): Promise<SaveScope> {
    if (!this.isAdmin_()) return 'me'
    if (!item?._masterId && !opts.isNew) return 'me'
    return this.openScopePrompt(opts.isNew ? 'create' : 'save', opts.entity, opts.count)
  }

  /**
   * Opens the admin "only me / everyone" prompt for `action` on `entity` and maps the
   * answer to a SaveScope. Callers own the admin/_masterId gating (askScope and
   * askDeleteScope do it; metadata-manager gates on its own registry state).
   */
  async openScopePrompt(action: ScopeAction, entity: ScopeEntity, count = 1): Promise<SaveScope> {
    const texts = this.buildTexts(action, entity, count)
    const result = await this.confirmModal.openTernary(texts.message, {
      headerKey: texts.headerKey,
      saveLabel: texts.meLabelKey,
      saveButtonLabel: texts.everyoneLabelKey
    })
    if (result === 'cancel') return 'cancel'
    return result === 'save' ? 'everyone' : 'me'
  }

  /**
   * True when askDeleteScope would show the prompt — lets a caller skip its own
   * "are you sure?" confirm so an admin sees one dialog, not two (plan 365).
   */
  willAskDeleteScope(item: Pick<Recipe, '_masterId'> | null | undefined): boolean {
    return this.isAdmin_() && !!item?._masterId
  }

  /**
   * Publishes an already-saved recipe to its master. Call only after the save
   * resolves — the server reads the stored document, not the request body.
   * Failures surface as a message rather than throwing: the user's own copy is
   * already saved, so a failed publish is not a lost edit.
   */
  pushToMaster(saved: Recipe): void {
    const isDish = saved.recipeType === 'dish'
    const op = isDish ? this.dishData.pushToMaster(saved._id) : this.recipeData.pushToMaster(saved._id)
    op.then(({ masterId }) => {
      if (isDish) this.dishData.patchMasterId(saved._id, masterId)
      else this.recipeData.patchMasterId(saved._id, masterId)
    }).catch(() => this.userMsg.onSetErrorMsg(this.translation.translate('push_to_master_error')))
  }

  /**
   * Same shape as askScope, asked at delete time instead of save time. An
   * item with no _masterId has nothing on master to remove, so this
   * resolves to 'me' without prompting.
   */
  async askDeleteScope(item: Pick<Recipe, '_masterId'> | null | undefined, opts: ScopeOptions): Promise<SaveScope> {
    if (!this.willAskDeleteScope(item)) return 'me'
    return this.openScopePrompt('delete', opts.entity, opts.count)
  }

  /** Header, message and button texts for one prompt — see `buildScopeTexts`. */
  buildTexts(action: ScopeAction, entity: ScopeEntity, count = 1): ScopeTexts {
    return buildScopeTexts(action, entity, count, (key) => this.translation.translate(key))
  }

  /**
   * Removes the linked master copy after the caller's own delete already
   * succeeded. Best-effort, matching pushToMaster's failure handling: the
   * user's own delete already went through, so a failed master removal is
   * surfaced as a message, not thrown.
   */
  deleteFromMaster(recipe: Recipe): void {
    const op =
      recipe.recipeType === 'dish'
        ? this.dishData.deleteFromMaster(recipe._id)
        : this.recipeData.deleteFromMaster(recipe._id)
    op.catch(() => this.userMsg.onSetErrorMsg(this.translation.translate('delete_from_master_error')))
  }

  /** Product equivalent of pushToMaster above (Plan 322 M9). */
  pushProductToMaster(saved: Product): void {
    this.productData
      .pushToMaster(saved._id)
      .then(({ masterId }) => this.productData.patchMasterId(saved._id, masterId))
      .catch(() => this.userMsg.onSetErrorMsg(this.translation.translate('push_to_master_error')))
  }

  /** Product equivalent of deleteFromMaster above (Plan 322 M8). */
  deleteProductFromMaster(product: Product): void {
    this.productData
      .deleteFromMaster(product._id)
      .catch(() => this.userMsg.onSetErrorMsg(this.translation.translate('delete_from_master_error')))
  }

  /**
   * Plan 366: "delete this supplier for everyone" — the server removes the master supplier
   * and every other user's copy, and unlinks them from their products. Awaited (call it
   * before deleting the caller's own copy, which the server looks up); failures surface as a
   * message, not thrown, so the caller's own delete still goes ahead.
   */
  async deleteSupplierFromMaster(supplier: Supplier): Promise<void> {
    try {
      await this.supplierData.deleteFromMaster(supplier._id)
    } catch {
      this.userMsg.onSetErrorMsg(this.translation.translate('supplier_delete_from_master_error'))
    }
  }

  /**
   * Plan 322 M8: strips this product's ingredient line from every OTHER user's own
   * recipes/dishes. Explicitly Human-requested, dev-only — unlike every other method
   * in this service, this reaches into other users' own documents, not just the
   * shared __master__ copy. Call only after deleteProductFromMaster, on "everyone".
   */
  purgeProductIngredientEverywhere(product: Product): void {
    this.productData
      .purgeIngredientEverywhere(product._id)
      .catch(() => this.userMsg.onSetErrorMsg(this.translation.translate('delete_from_master_error')))
  }
}
