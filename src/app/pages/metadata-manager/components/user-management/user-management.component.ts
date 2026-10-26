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

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
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
    if (isOwner) {
      const second = await this.confirmModal.open(this.translation.translate('delete_business_confirm_final'), {
        variant: 'danger',
        saveLabel: 'remove',
        typedConfirm: { expected: businessLabel, labelKey: 'delete_business_type_name' }
      })
      if (!second) return
    }
    this.userAdmin.deleteUser(user._id).subscribe({
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
