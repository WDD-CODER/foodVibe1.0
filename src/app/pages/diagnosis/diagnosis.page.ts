import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { DatePipe } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import type { Diagnosis } from '@schemas/entities'
import { TranslatePipe } from '@pipes/translation-pipe.pipe'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { PageHeaderComponent } from 'src/app/shared/page-header/page-header.component'
import { DisabledWhyDirective } from 'src/app/shared/tooltip/disabled-why.directive'
import { DiagnosisService } from './services/diagnosis.service'

/** Plan 634: the consultant's diagnoses of the active (client's) business, and the form that starts a new one. */
@Component({
  selector: 'app-diagnosis-page',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    LucideAngularModule,
    TranslatePipe,
    CounterComponent,
    EmptyStateComponent,
    FormFieldComponent,
    LoaderComponent,
    PageHeaderComponent,
    DisabledWhyDirective
  ],
  templateUrl: './diagnosis.page.html',
  styleUrl: './diagnosis.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiagnosisPage {
  // 1. INJECTED
  private readonly diagnosis_ = inject(DiagnosisService)
  private readonly router_ = inject(Router)
  private readonly userMsg_ = inject(UserMsgService)
  private readonly translation_ = inject(TranslationService)

  // 4. SIGNALS & CONSTANTS
  protected readonly items_ = signal<Diagnosis[]>([])
  protected readonly isLoading_ = signal(true)
  protected readonly isSaving_ = signal(false)
  protected readonly name_ = signal('')
  protected readonly periodDays_ = signal(60)

  // 5. COMPUTED
  protected readonly canCreate_ = computed(() => this.name_().trim() !== '' && !this.isSaving_())

  constructor() {
    void this.load_()
  }

  // 6. METHODS
  private async load_(): Promise<void> {
    try {
      this.items_.set(await this.diagnosis_.list())
    } catch {
      this.userMsg_.onSetErrorMsg(this.translation_.translate('server_error'))
    } finally {
      this.isLoading_.set(false)
    }
  }

  protected async create(): Promise<void> {
    if (!this.canCreate_()) return
    this.isSaving_.set(true)
    try {
      const created = await this.diagnosis_.create({ name: this.name_().trim(), periodDays: this.periodDays_() })
      await this.router_.navigate(['/diagnosis', created._id])
    } catch {
      this.userMsg_.onSetErrorMsg(this.translation_.translate('server_error'))
    } finally {
      this.isSaving_.set(false)
    }
  }
}
