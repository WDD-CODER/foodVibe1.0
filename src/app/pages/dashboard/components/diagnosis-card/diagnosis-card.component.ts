import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { DatePipe } from '@angular/common'
import { RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import type { Diagnosis } from '@schemas/entities'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { LoggingService } from '@services/logging.service'
import { ModuleService } from '@services/module.service'
import { TranslationService } from '@services/translation.service'
import { UserService } from '@services/user.service'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { DiagnosisService } from 'src/app/pages/diagnosis/services/diagnosis.service'

/** The diagnoses listed before «לכל האבחונים». */
const MAX_ROWS = 3

/** Plan 652: the consultant's diagnoses on the dashboard. Shown with consultant_diag; hidden when the load fails. */
@Component({
  selector: 'app-diagnosis-card',
  standalone: true,
  imports: [DatePipe, LucideAngularModule, RouterLink, TranslatePipe, EmptyStateComponent],
  templateUrl: './diagnosis-card.component.html',
  styleUrl: './diagnosis-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiagnosisCardComponent {
  private readonly diagnosis = inject(DiagnosisService)
  private readonly modules = inject(ModuleService)
  private readonly userService = inject(UserService)
  private readonly logging = inject(LoggingService)
  private readonly translation = inject(TranslationService)

  private readonly items_ = signal<Diagnosis[]>([])
  private readonly isRequested_ = signal(false)
  private readonly isFailed_ = signal(false)

  /** Same rule as the header's diagnosis pill: while acting the home modules decide, else the business modules. */
  private readonly enabled_ = computed(() =>
    this.userService.acting_()
      ? this.userService.homeModules_().includes('consultant_diag')
      : this.modules.has('consultant_diag')
  )

  protected readonly visible = computed(() => this.enabled_() && !this.isFailed_())
  protected readonly rows = computed(() => this.items_().slice(0, MAX_ROWS))
  protected readonly openText = computed(() =>
    this.translation
      .translate('diag_card_open_count')
      .replace('{count}', String(this.items_().filter((item) => item.status === 'open').length))
  )

  constructor() {
    effect(() => {
      if (!this.enabled_()) return
      untracked(() => {
        if (this.isRequested_()) return
        this.isRequested_.set(true)
        void this.load()
      })
    })
  }

  private async load(): Promise<void> {
    try {
      this.items_.set(await this.diagnosis.list())
    } catch (err) {
      this.isFailed_.set(true)
      this.logging.warn('Diagnoses could not be loaded', { status: (err as { status?: number }).status })
    }
  }
}
