import { inject, Injectable } from '@angular/core'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { RecipeDataService } from '@services/recipe-data.service'
import { DishDataService } from '@services/dish-data.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { Recipe } from '@models/recipe.model'

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
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)

  /**
   * Returns the chosen scope. When the recipe is not linked to a master there
   * is nothing to publish, so this resolves to `'me'` without prompting.
   */
  async askScope(recipe: Pick<Recipe, '_masterId'> | null | undefined): Promise<SaveScope> {
    if (!recipe?._masterId) return 'me'
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
    const op =
      saved.recipe_type_ === 'dish' ? this.dishData.pushToMaster(saved._id) : this.recipeData.pushToMaster(saved._id)
    op.catch(() => this.userMsg.onSetErrorMsg(this.translation.translate('push_to_master_error')))
  }
}
