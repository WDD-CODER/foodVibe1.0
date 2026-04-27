import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core'
import { UserAdminService } from '@services/user-admin.service'
import { UserService } from '@services/user.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { UserMsgService } from '@services/user-msg.service'
import { AdminUser } from '@models/admin-user.model'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserManagementComponent {
  private userAdmin = inject(UserAdminService)
  private confirmModal = inject(ConfirmModalService)
  private userMsg = inject(UserMsgService)
  private userService = inject(UserService)

  protected users_ = signal<AdminUser[]>([])
  protected isLoading_ = signal(false)
  protected isAdmin = computed(() => this.userService.user_()?.role === 'admin')
  protected currentUserId = computed(() => this.userService.user_()?._id ?? '')

  constructor() {
    effect(() => {
      if (this.isAdmin()) this.loadUsers()
    })
  }

  private loadUsers(): void {
    this.isLoading_.set(true)
    this.userAdmin.getUsers().subscribe({
      next: users => { this.users_.set(users); this.isLoading_.set(false) },
      error: () => { this.isLoading_.set(false) },
    })
  }

  async onDeleteUser(user: AdminUser): Promise<void> {
    const confirmed = await this.confirmModal.open(
      `מחיקת המשתמש "${user.name}" תמחק את כל הנתונים שלו לצמיתות.`,
      { variant: 'danger', saveLabel: 'remove' }
    )
    if (!confirmed) return
    this.userAdmin.deleteUser(user._id).subscribe({
      next: () => { this.userMsg.onSetSuccessMsg('המשתמש נמחק בהצלחה'); this.loadUsers() },
      error: () => this.userMsg.onSetErrorMsg('שגיאה במחיקת המשתמש'),
    })
  }
}
