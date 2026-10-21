import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core'
import { DatePipe } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { TeamService, TeamMember } from '../../services/team.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { TranslationService } from '@services/translation.service'
import { validatePassword, validateUsername } from '../../../../core/utils/auth-validation.util'
import { EmptyStateComponent } from '../../../../shared/empty-state/empty-state.component'

@Component({
  selector: 'app-team-tab',
  standalone: true,
  imports: [FormsModule, DatePipe, LucideAngularModule, TranslatePipe, EmptyStateComponent],
  templateUrl: './team-tab.component.html',
  styleUrl: './team-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeamTabComponent implements OnInit {
  // 1. INJECTED
  private readonly business = inject(TeamService)
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly translation = inject(TranslationService)

  // 4. SIGNALS & CONSTANTS
  readonly team = this.business.team_
  readonly name_ = signal('')
  readonly password_ = signal('')
  readonly formOpen_ = signal(false)
  readonly saving_ = signal(false)
  /** Dictionary key of the last failed check, or null. */
  readonly errorKey_ = signal<string | null>(null)

  // 5. COMPUTED
  readonly hasStaff = computed(() => this.team().some((member) => member.businessRole === 'staff'))

  ngOnInit(): void {
    void this.business.loadTeam()
  }

  // 6. METHODS in CRDUL order
  async addMember(): Promise<void> {
    if (this.saving_()) return
    const name = this.name_().trim()
    const error = validateUsername(name) ?? validatePassword(this.password_(), name, '')
    if (error) {
      this.errorKey_.set(error)
      return
    }
    this.saving_.set(true)
    this.errorKey_.set(null)
    const result = await this.business.addStaff(name, this.password_())
    this.saving_.set(false)
    if (!result.ok) {
      this.errorKey_.set(result.errorKey)
      return
    }
    this.closeForm()
  }

  async removeMember(member: TeamMember): Promise<void> {
    const confirmed = await this.confirmModal.open(this.translation.translate('team_remove_confirm'), {
      variant: 'danger',
      title: 'remove'
    })
    if (confirmed) await this.business.removeStaff(member._id)
  }

  openForm(): void {
    this.formOpen_.set(true)
  }

  closeForm(): void {
    this.formOpen_.set(false)
    this.name_.set('')
    this.password_.set('')
    this.errorKey_.set(null)
  }
}
