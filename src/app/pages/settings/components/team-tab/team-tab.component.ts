import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core'
import { DatePipe } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { TeamService, TeamMember } from '../../services/team.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { TranslationService } from '@services/translation.service'
import { validatePassword, validateUsername } from 'src/app/core/utils/auth-validation.util'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'

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
  private readonly teamService = inject(TeamService)
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly translation = inject(TranslationService)

  // 4. SIGNALS & CONSTANTS
  readonly team_ = this.teamService.teamList_
  protected readonly name_ = signal('')
  protected readonly password_ = signal('')
  protected readonly isFormOpen_ = signal(false)
  protected readonly isSaving_ = signal(false)
  /** Dictionary key of the last failed check, or null. */
  protected readonly errorKey_ = signal<string | null>(null)

  // 5. COMPUTED
  readonly hasStaff_ = computed(() => this.team_().some((member) => member.businessRole === 'staff'))

  ngOnInit(): void {
    void this.teamService.loadTeam()
  }

  // 6. METHODS in CRDUL order
  async addMember(): Promise<void> {
    if (this.isSaving_()) return
    const name = this.name_().trim()
    const error = validateUsername(name) ?? validatePassword(this.password_(), name, '')
    if (error) {
      this.errorKey_.set(error)
      return
    }
    this.isSaving_.set(true)
    this.errorKey_.set(null)
    const result = await this.teamService.addStaff(name, this.password_())
    this.isSaving_.set(false)
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
    if (confirmed) await this.teamService.removeStaff(member._id)
  }

  openForm(): void {
    this.isFormOpen_.set(true)
  }

  closeForm(): void {
    this.isFormOpen_.set(false)
    this.name_.set('')
    this.password_.set('')
    this.errorKey_.set(null)
  }
}
