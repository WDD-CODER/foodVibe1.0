import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core'
import { UserAdminService } from '@services/user-admin.service'
import { UserService } from '@services/user.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { LoggingService } from '@services/logging.service'
import { AdminUser } from '@models/admin-user.model'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { DisabledWhyDirective } from 'src/app/shared/tooltip/disabled-why.directive'
import { NumberBoxDirective } from 'src/app/core/directives/number-box.directive'
import { SelectOnFocusDirective } from 'src/app/core/directives/select-on-focus.directive'
import { AI_ALLOWANCE_MAX, AI_DEFAULT_ALLOWANCE } from '@schemas/ai-allowance.schema'

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, DisabledWhyDirective, NumberBoxDirective, SelectOnFocusDirective],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserManagementComponent {
  private userAdmin = inject(UserAdminService)
  private confirmModal = inject(ConfirmModalService)
  private userMsg = inject(UserMsgService)
  private userService = inject(UserService)
  private translation = inject(TranslationService)
  private logging = inject(LoggingService)

  protected users_ = signal<AdminUser[]>([])
  protected isLoading_ = signal(false)
  protected isPlatformAdmin_ = this.userService.isPlatformAdmin_
  protected currentBusinessId = computed(() => this.userService.user_()?.businessId ?? '')
  /** Plan 736: the AI allowance typed on a row and not saved yet, by user id (the raw text of the field). */
  protected allowanceDrafts_ = signal<ReadonlyMap<string, string>>(new Map())
  /** Plan 736: rows whose allowance PUT is running. */
  protected savingAllowance_ = signal<ReadonlySet<string>>(new Set())
  protected readonly allowanceMax = AI_ALLOWANCE_MAX

  constructor() {
    effect(() => {
      if (this.isPlatformAdmin_()) this.loadUsers()
    })
  }

  private loadUsers(): void {
    this.isLoading_.set(true)
    this.userAdmin.getUsers().subscribe({
      next: (users) => {
        this.users_.set(users)
        this.isLoading_.set(false)
      },
      error: (err: unknown) => {
        this.logging.error({ event: 'admin.users.load_error', message: 'Admin user list load error', context: { err } })
        this.isLoading_.set(false)
      }
    })
  }

  /** Plan 736: the row's saved allowance (the default when the server sent none). */
  protected savedAllowance(user: AdminUser): number {
    return typeof user.aiAllowance === 'number' ? user.aiAllowance : AI_DEFAULT_ALLOWANCE
  }

  /** «נוצלו N» for the row. */
  protected usedText(user: AdminUser): string {
    return this.translation.translate('admin_ai_allowance_used').replace('{{used}}', String(user.aiCallsUsed ?? 0))
  }

  /** The number field's text: the draft while one is typed, else the saved number. */
  protected allowanceText(user: AdminUser): string {
    return this.allowanceDrafts_().get(user._id) ?? String(this.savedAllowance(user))
  }

  /** The typed number when it is a whole number from 0 to the maximum, else null. */
  private draftNumber(user: AdminUser): number | null {
    const text = (this.allowanceDrafts_().get(user._id) ?? '').trim()
    if (!/^\d+$/.test(text)) return null
    const n = Number(text)
    return n <= AI_ALLOWANCE_MAX ? n : null
  }

  /** A draft is typed and it is not a valid number: the field shows the error line and nothing is sent. */
  protected allowanceInvalid(user: AdminUser): boolean {
    return this.allowanceDrafts_().has(user._id) && this.draftNumber(user) === null
  }

  /** Save is on only for a valid number that differs from the saved one, and not while a save runs. */
  protected canSaveAllowance(user: AdminUser): boolean {
    const n = this.draftNumber(user)
    return n !== null && n !== this.savedAllowance(user) && !this.savingAllowance_().has(user._id)
  }

  /** Why the allowance save cannot be used (a translation key), or null when it can. A running save is not a reason. */
  protected allowanceWhy(user: AdminUser): string | null {
    if (this.savingAllowance_().has(user._id)) return null
    if (this.allowanceInvalid(user)) return 'admin_ai_allowance_invalid'
    const n = this.draftNumber(user)
    return n === null || n === this.savedAllowance(user) ? 'why_nothing_to_save' : null
  }

  protected onAllowanceInput(user: AdminUser, value: string): void {
    this.allowanceDrafts_.update((m) => new Map(m).set(user._id, value))
  }

  onSaveAllowance(user: AdminUser): void {
    if (!this.canSaveAllowance(user)) return
    const value = this.draftNumber(user) as number
    this.savingAllowance_.update((s) => new Set(s).add(user._id))
    const done = () =>
      this.savingAllowance_.update((s) => {
        const next = new Set(s)
        next.delete(user._id)
        return next
      })
    this.userAdmin.setAiAllowance(user._id, value).subscribe({
      next: (res) => {
        this.users_.update((list) =>
          list.map((u) =>
            u._id === user._id ? { ...u, aiAllowance: res.aiAllowance, aiCallsUsed: res.aiCallsUsed } : u
          )
        )
        this.allowanceDrafts_.update((m) => {
          const next = new Map(m)
          next.delete(user._id)
          return next
        })
        done()
        this.userMsg.onSetSuccessMsg(this.translation.translate('admin_ai_allowance_saved'))
      },
      error: (err: unknown) => {
        done()
        this.logging.error({
          event: 'admin.users.ai_allowance_error',
          message: 'AI allowance save error',
          context: { err }
        })
        this.userMsg.onSetErrorMsg(this.translation.translate('server_error'))
      }
    })
  }

  /** The admin's own business can't be deleted (the server refuses it too). */
  protected isOwnBusiness(user: AdminUser): boolean {
    return !!user.businessId && user.businessId === this.currentBusinessId()
  }

  async onDeleteUser(user: AdminUser): Promise<void> {
    // Same rule as the server (admin.js): a business user who is not staff deletes the whole business.
    const isOwner = !!user.businessId && user.businessRole !== 'staff'
    const businessLabel = user.businessName?.trim() || user.name
    const nameInQuotes = ` "${isOwner ? businessLabel : user.name}"`
    const first = await this.confirmModal.open(
      this.translation.translate(isOwner ? 'delete_business_confirm' : 'delete_staff_user_confirm') + nameInQuotes,
      { variant: 'danger', saveLabel: 'remove' }
    )
    if (!first) return
    let eraseLearned = false
    if (isOwner) {
      // Plan 639: keeping what the platform learned from the business is the rule; erasing it is the explicit answer.
      const learned = await this.confirmModal.openTernary(
        this.translation.translate('delete_business_learned_question'),
        {
          variant: 'danger',
          saveLabel: 'delete_business_learned_keep',
          saveButtonLabel: 'delete_business_learned_erase'
        }
      )
      if (learned === 'cancel') return
      eraseLearned = learned === 'save'
      const finalMessage = this.translation.translate('delete_business_confirm_final')
      const second = await this.confirmModal.open(
        eraseLearned
          ? `${finalMessage} ${this.translation.translate('delete_business_learned_erase_note')}`
          : finalMessage,
        {
          variant: 'danger',
          saveLabel: 'remove',
          typedConfirm: { expected: businessLabel, labelKey: 'delete_business_type_name' }
        }
      )
      if (!second) return
    }
    this.userAdmin.deleteUser(user._id, eraseLearned).subscribe({
      next: (res) => {
        this.userMsg.onSetSuccessMsg(
          this.translation.translate(res.deletedBusiness ? 'business_deleted' : 'user_deleted')
        )
        this.loadUsers()
      },
      error: (err: unknown) => {
        this.logging.error({ event: 'admin.users.delete_error', message: 'Admin user delete error', context: { err } })
        this.userMsg.onSetErrorMsg(this.translation.translate('server_error'))
      }
    })
  }
}
