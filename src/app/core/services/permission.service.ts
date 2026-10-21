import { computed, inject, Injectable } from '@angular/core'
import { UserService } from './user.service'

/** The 10 actions of contract C-PERM (mirrors `server/utils/permissions.js`). */
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

export interface PermissionContext {
  /** Entity type (collection name), e.g. `recipes`, `products`, `menuEvents`. */
  type?: string
  /** The stored document the action is about; omit for business-level actions. */
  doc?: object
}

const OWNER_ONLY_ACTIONS: readonly PermissionAction[] = ['editMoney', 'manageTeam', 'editSettings', 'editTaxonomy']

/**
 * Client mirror of the server permission checker (plan 427). It only decides what the UI shows or locks
 * the server stays the one that refuses a write. Owner: everything. Staff: create anything, edit/delete only
 * what they created, never money, team, settings or the locked taxonomy kinds.
 */
@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly userService = inject(UserService)

  readonly isOwner_ = computed(() => this.userService.isOwner_())
  /** True only for a signed-in staff member: the screens lock for him and stay untouched for a signed-out visitor. */
  readonly isStaff_ = computed(() => this.userService.user_()?.businessRole === 'staff')

  can(action: PermissionAction, ctx: PermissionContext = {}): boolean {
    const user = this.userService.user_()
    if (!user) return false
    if (user.businessRole === 'owner') return true
    if (user.businessRole !== 'staff') return false

    if (OWNER_ONLY_ACTIONS.includes(action)) return false
    if (action === 'create') return true

    const isCreator = !!ctx.doc && !!user._id && (ctx.doc as { createdBy?: string }).createdBy === user._id
    if (action === 'edit' || action === 'delete') return isCreator
    if (action === 'changeStage') return isCreator
    // addNote, markArrival: any event of the business.
    return ctx.type === undefined || ctx.type === 'menuEvents'
  }
}
