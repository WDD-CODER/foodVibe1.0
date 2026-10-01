import { computed, inject, Injectable } from '@angular/core'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { RecipeDataService } from '@services/recipe-data.service'
import { DishDataService } from '@services/dish-data.service'
import { ProductDataService } from '@services/product-data.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { UserService } from '@services/user.service'
import { Recipe } from '@models/recipe.model'
import { Product } from '@models/product.model'

/** What the user chose when saving an item cloned from a shared master. */
export type SaveScope = 'me' | 'everyone' | 'cancel'

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
 * Deliberately NOT used for per-user state such as `favoritedBy_`: pushing a
 * personal favourite to master would publish it to every other user.
 */
@Injectable({ providedIn: 'root' })
export class MasterPushService {
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly recipeData = inject(RecipeDataService)
  private readonly dishData = inject(DishDataService)
  private readonly productData = inject(ProductDataService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly userService = inject(UserService)
  private readonly isAdmin_ = computed(() => this.userService.user_()?.role === 'admin')

  /**
   * Returns the chosen scope. When the recipe is not linked to a master there
   * is nothing to publish, so this resolves to `'me'` without prompting —
   * unless `forcePrompt` (2026-09-30: an admin's brand-new recipe, which has
   * no _masterId yet client-side since the server only assigns one at insert,
   * but is just as push-able once saved — see the push-to-master route's
   * upsert fix). Non-admins always resolve to 'me' silently, matching
   * metadata-manager's resolvePushScope — the server's push-to-master/
   * delete-from-master/purge-ingredient-everywhere routes are requireAdmin-gated,
   * so a non-admin would otherwise be offered a prompt that 403s.
   */
  async askScope(recipe: Pick<Recipe, '_masterId'> | null | undefined, forcePrompt = false): Promise<SaveScope> {
    if (!this.isAdmin_()) return 'me'
    if (!recipe?._masterId && !forcePrompt) return 'me'
    const result = await this.confirmModal.openTernary('push_to_master_message', {
      headerKey: 'push_to_master_header',
      saveLabel: 'push_to_master_save_me',
      saveButtonLabel: 'push_to_master_save_everyone'
    })
    if (result === 'cancel') return 'cancel'
    return result === 'save' ? 'everyone' : 'me'
  }

  /**
   * Publishes an already-saved recipe to its master. Call only after the save
   * resolves — the server reads the stored document, not the request body.
   * Failures surface as a message rather than throwing: the user's own copy is
   * already saved, so a failed publish is not a lost edit.
   */
  pushToMaster(saved: Recipe): void {
    const isDish = saved.recipe_type_ === 'dish'
    const op = isDish ? this.dishData.pushToMaster(saved._id) : this.recipeData.pushToMaster(saved._id)
    op.then(({ masterId }) => {
      if (isDish) this.dishData.patchMasterId(saved._id, masterId)
      else this.recipeData.patchMasterId(saved._id, masterId)
    }).catch(() => this.userMsg.onSetErrorMsg(this.translation.translate('push_to_master_error')))
  }

  /**
   * Same shape as askScope, asked at delete time instead of save time. A
   * recipe with no _masterId has nothing on master to remove, so this
   * resolves to 'me' without prompting.
   */
  async askDeleteScope(recipe: Pick<Recipe, '_masterId'> | null | undefined): Promise<SaveScope> {
    if (!this.isAdmin_() || !recipe?._masterId) return 'me'
    const result = await this.confirmModal.openTernary('delete_from_master_message', {
      headerKey: 'delete_from_master_header',
      saveLabel: 'delete_from_master_delete_me',
      saveButtonLabel: 'delete_from_master_delete_everyone'
    })
    if (result === 'cancel') return 'cancel'
    return result === 'save' ? 'everyone' : 'me'
  }

  /**
   * Removes the linked master copy after the caller's own delete already
   * succeeded. Best-effort, matching pushToMaster's failure handling: the
   * user's own delete already went through, so a failed master removal is
   * surfaced as a message, not thrown.
   */
  deleteFromMaster(recipe: Recipe): void {
    const op =
      recipe.recipe_type_ === 'dish'
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
