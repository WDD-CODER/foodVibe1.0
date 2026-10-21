import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core'
import { UserAdminService } from '@services/user-admin.service'
import { UserService } from '@services/user.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
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
      error: () => {
        this.isLoading_.set(false)
      }
    })
  }

  /** The admin's own business can't be deleted (the server refuses it too). */
  protected isOwnBusiness(user: AdminUser): boolean {
    return !!user.businessId && user.businessId === this.currentBusinessId()
  }

  async onDeleteUser(user: AdminUser): Promise<void> {
    const isOwner = user.businessRole === 'owner'
    const nameInQuotes = ` "${isOwner ? (user.businessName ?? user.name) : user.name}"`
    const first = await this.confirmModal.open(
      this.translation.translate(isOwner ? 'delete_business_confirm' : 'delete_staff_user_confirm') + nameInQuotes,
      { variant: 'danger', saveLabel: 'remove' }
    )
    if (!first) return
    if (isOwner) {
      const second = await this.confirmModal.open(this.translation.translate('delete_business_confirm_final'), {
        variant: 'danger',
        saveLabel: 'remove'
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
      error: () => this.userMsg.onSetErrorMsg(this.translation.translate('server_error'))
    })
  }
}
