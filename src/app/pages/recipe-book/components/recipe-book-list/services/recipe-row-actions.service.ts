import { Injectable, inject, signal } from '@angular/core'

import { KitchenStateService } from '@services/kitchen-state.service'
import { MasterPushService, bulkScopeEntity, recipeScopeEntity } from '@services/master-push.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { RequireAuthService } from 'src/app/core/utils/require-auth.util'
import { Recipe } from '@models/recipe.model'

type RecipeBulkField = 'labels' | 'recipeType'

/**
 * Row and bulk write actions for the recipe book list (plan 399): rating, approval, favorite,
 * delete and bulk edit/delete. Each delete keeps its admin scope prompt in the same flow (plan 365).
 * Component-scoped: provided in RecipeBookListComponent's `providers`.
 */
@Injectable()
export class RecipeRowActionsService {
  private readonly kitchenState = inject(KitchenStateService)
  private readonly masterPush = inject(MasterPushService)
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly requireAuthService = inject(RequireAuthService)

  private readonly removingId_ = signal<string | null>(null)
  readonly removingId = this.removingId_.asReadonly()

  async remove(recipe: Recipe): Promise<void> {
    if (!this.requireAuthService.requireAuth()) return
    if (!(await this.confirmDeleteUnlessScoped(recipe))) return
    const scope = await this.masterPush.askDeleteScope(recipe, { entity: recipeScopeEntity(recipe) })
    if (scope === 'cancel') return
    this.removingId_.set(recipe._id)
    this.kitchenState.deleteRecipe(recipe).subscribe({
      next: () => {
        this.removingId_.set(null)
        if (scope === 'everyone') this.masterPush.deleteFromMaster(recipe)
      },
      error: () => {
        this.removingId_.set(null)
      }
    })
  }

  /** Resolves true when the delete went ahead (caller then clears its selection). */
  async bulkDelete(ids: string[]): Promise<boolean> {
    if (ids.length === 0) return false
    if (!this.requireAuthService.requireAuth()) return false
    const recipes = this.kitchenState.recipes_().filter((r) => ids.includes(r._id ?? ''))
    // Asked once for the whole selection, matching bulkEdit's shape — passing the
    // first master-linked recipe is enough since askDeleteScope only inspects _masterId.
    // When the admin scope prompt will show, it is the only dialog (its cancel is the safety).
    const masterLinked = recipes.find((r) => r._masterId)
    if (!this.masterPush.willAskDeleteScope(masterLinked)) {
      if (!(await this.confirmModal.open(`למחוק ${ids.length} מתכונים?`, { variant: 'danger' }))) return false
    }
    const scope = await this.masterPush.askDeleteScope(masterLinked, {
      entity: bulkScopeEntity(recipes),
      count: recipes.length
    })
    if (scope === 'cancel') return false
    recipes.forEach((recipe) => {
      this.kitchenState.deleteRecipe(recipe).subscribe({
        next: () => {
          if (scope === 'everyone' && recipe._masterId) this.masterPush.deleteFromMaster(recipe)
        },
        error: () => {}
      })
    })
    return true
  }

  async rate(recipe: Recipe, value: number): Promise<void> {
    const scope = await this.masterPush.askScope(recipe, { entity: recipeScopeEntity(recipe) })
    if (scope === 'cancel') return
    this.kitchenState.saveRecipe({ ...recipe, rating: value }).subscribe({
      next: (saved) => {
        if (scope === 'everyone') this.masterPush.pushToMaster(saved)
      }
    })
  }

  async toggleApproval(recipe: Recipe): Promise<void> {
    const scope = await this.masterPush.askScope(recipe, { entity: recipeScopeEntity(recipe) })
    if (scope === 'cancel') return
    const updated = { ...recipe, isApproved: !recipe.isApproved }
    this.kitchenState.saveRecipe(updated).subscribe({
      next: (saved) => {
        if (scope === 'everyone') this.masterPush.pushToMaster(saved)
      }
    })
  }

  toggleFavorite(recipe: Recipe, uid: string | null): void {
    if (!uid) return
    const current = recipe.favoritedBy ?? []
    const updated: Recipe = {
      ...recipe,
      favoritedBy: current.includes(uid) ? current.filter((id) => id !== uid) : [...current, uid]
    }
    this.kitchenState.saveRecipe(updated).subscribe()
  }

  async bulkEdit(event: { field: string; value: string; ids: string[] }): Promise<void> {
    const field = event.field as RecipeBulkField
    const recipes = this.kitchenState.recipes_()
    const targets = event.ids.map((id) => recipes.find((r) => r._id === id)).filter((r): r is Recipe => !!r)
    if (!targets.length) return

    // Labels and recipe type are shared content, so the scope question applies
    // — but asked ONCE for the whole selection, not once per item. Passing the
    // first master-linked recipe is enough: askScope only inspects _masterId.
    const scope = await this.masterPush.askScope(
      targets.find((r) => r._masterId),
      {
        entity: bulkScopeEntity(targets),
        count: targets.length
      }
    )
    if (scope === 'cancel') return

    for (const recipe of targets) {
      let updated: Recipe
      if (field === 'labels') {
        const current = recipe.labels ?? []
        if (current.includes(event.value)) continue
        updated = { ...recipe, labels: [...current, event.value] }
      } else {
        updated = { ...recipe, recipeType: event.value as 'dish' | 'preparation' }
      }
      this.kitchenState.saveRecipe(updated).subscribe({
        next: (saved) => {
          if (scope === 'everyone' && saved._masterId) this.masterPush.pushToMaster(saved)
        },
        error: () => {}
      })
    }
  }

  /**
   * Plain "are you sure?" confirm — skipped when the admin scope prompt is about to show, so an
   * admin deleting a master-linked recipe sees one dialog, not two (plan 365).
   */
  private async confirmDeleteUnlessScoped(recipe: Recipe): Promise<boolean> {
    if (this.masterPush.willAskDeleteScope(recipe)) return true
    return this.confirmModal.open('confirm_delete', { variant: 'danger' })
  }
}
