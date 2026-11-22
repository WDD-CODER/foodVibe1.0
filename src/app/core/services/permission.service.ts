import { computed, inject, Injectable } from '@angular/core'
import { Recipe } from '../models/recipe.model'
import { UserService } from './user.service'

/** The 14 actions of contract C-PERM (mirrors `server/utils/permissions.js`); plan 662 adds `manageConversations`. */
export type PermissionAction =
  | 'create'
  | 'edit'
  | 'delete'
  | 'editMoney'
  | 'changeStage'
  | 'addNote'
  | 'markArrival'
  | 'manageTeam'
  | 'editSettings'
  | 'editTaxonomy'
  | 'editLogistics'
  | 'editFrontDesk'
  | 'manageRequests'
  | 'manageConversations'

export interface PermissionContext {
  /** Entity type (collection name), e.g. `recipes`, `products`, `menuEvents`. */
  type?: string
  /** The stored document the action is about; omit for business-level actions. */
  doc?: object
}

const OWNER_ONLY_ACTIONS: readonly PermissionAction[] = [
  'editMoney',
  'manageTeam',
  'editSettings',
  'editTaxonomy',
  'editLogistics',
  'editFrontDesk'
]

/** A consultant may do everything the owner may except the team and the business settings (ADR 0032). */
export const CONSULTANT_DENIED: readonly PermissionAction[] = ['manageTeam', 'editSettings']

/**
 * Client mirror of the server permission checker (plan 427). It only decides what the UI shows or locks
 * the server stays the one that refuses a write. Owner: everything. Staff: create anything, edit/delete only
 * what they created, never money, team, settings or the locked taxonomy kinds.
 */
@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly userService = inject(UserService)

  /** True when the user has the owner's rights in the active business: the owner or a consultant. */
  readonly isOwner_ = computed(() => {
    const role = this.userService.user_()?.businessRole
    return role === 'owner' || role === 'consultant'
  })
  /** True only for a signed-in staff member: the screens lock for him and stay untouched for a signed-out visitor. */
  readonly isStaff_ = computed(() => this.userService.user_()?.businessRole === 'staff')

  can(action: PermissionAction, ctx: PermissionContext = {}): boolean {
    const user = this.userService.user_()
    if (!user) return false
    if (user.businessRole === 'owner') return true
    if (user.businessRole === 'consultant') return !CONSULTANT_DENIED.includes(action)
    if (user.businessRole !== 'staff') return false

    if (OWNER_ONLY_ACTIONS.includes(action)) return false
    // Plan 549: any member works the request queue and the bookings.
    if (action === 'manageRequests') return true
    // Plan 662 (C-REGISTRY-R): any member answers the guests' conversations.
    if (action === 'manageConversations') return true
    if (action === 'create') return true

    const isCreator = !!ctx.doc && !!user._id && (ctx.doc as { createdBy?: string }).createdBy === user._id
    if (action === 'edit' || action === 'delete') return isCreator
    // Event actions: the server denies them on any other type (NOT_AN_EVENT).
    if (ctx.type !== undefined && ctx.type !== 'menuEvents') return false
    if (action === 'changeStage') return isCreator
    // addNote, markArrival: any event of the business.
    return true
  }

  /** True only for a signed-in staff member looking at a recipe or dish someone else created (plan 476): Cook View only. */
  isReadOnlyRecipe(recipe: Recipe | null | undefined): boolean {
    if (!recipe || !this.isStaff_()) return false
    return !this.can('edit', { type: recipe.recipeType === 'dish' ? 'dishes' : 'recipes', doc: recipe })
  }
}
