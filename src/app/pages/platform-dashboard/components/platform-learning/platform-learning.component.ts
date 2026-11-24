import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core'
import { DatePipe } from '@angular/common'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { PlatformAdminService, type LearningStats } from '@services/platform-admin.service'
import { UserMsgService } from '@services/user-msg.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { formatPctInt } from 'src/app/core/engine/rounding'

/** Plan 642: fewer saves than this and the accuracy is greyed out. */
const LOW_SAMPLE = 5

/**
 * Plan 630: the platform admin reads how close each AI flow's drafts were to what people saved (per model, by week),
 * how big the shared supplier brain is, and whether the private file store is configured. Read-only.
 */
@Component({
  selector: 'app-platform-learning',
  standalone: true,
  imports: [DatePipe, LucideAngularModule, TranslatePipe, EmptyStateComponent, LoaderComponent],
  templateUrl: './platform-learning.component.html',
  styleUrl: './platform-learning.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlatformLearningComponent implements OnInit {
  // 1. INJECTED
  private readonly platformAdmin = inject(PlatformAdminService)
  private readonly userMsg = inject(UserMsgService)
  private readonly logging = inject(LoggingService)
  private readonly translation = inject(TranslationService)

  // 4. SIGNALS & CONSTANTS
  protected readonly isLoading_ = signal(true)
  protected readonly loadFailed_ = signal(false)
  protected readonly stats_ = signal<LearningStats | null>(null)
  protected readonly fileStore_ = signal<boolean | null>(null)
  protected readonly openKey_ = signal<string | null>(null)
  protected readonly privateCount = computed(() => this.stats_()?.privateBusinesses ?? 0)

  // 6. METHODS
  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadStats(), this.loadStatus()])
    this.isLoading_.set(false)
  }

  protected async retry(): Promise<void> {
    this.isLoading_.set(true)
    await Promise.all([this.loadStats(), this.loadStatus()])
    this.isLoading_.set(false)
  }

  protected rowKey(feature: string, model: string | null): string {
    return `${feature}|${model ?? ''}`
  }

  protected toggle(key: string): void {
    this.openKey_.update((open) => (open === key ? null : key))
  }

  protected pct(ratio: number | null): string {
    return ratio === null ? '—' : formatPctInt(ratio * 100)
  }

  /** Plan 642: "{confirmed} מתוך {drafts} ({rate}%)". */
  protected savedOf(row: { drafts: number; confirmed: number }): string {
    const rate = row.drafts ? Math.round((row.confirmed / row.drafts) * 100) : 0
    return this.translation
      .translate('platform_learning_saved_of')
      .replace('{confirmed}', String(row.confirmed))
      .replace('{drafts}', String(row.drafts))
      .replace('{rate}', String(rate))
  }

  /** Plan 642: "{pct}% ({n})", "—" when there is no average. */
  protected accuracy(row: { confirmed: number; avgKeptRatio: number | null }): string {
    return row.avgKeptRatio === null ? '—' : `${this.pct(row.avgKeptRatio)} (${row.confirmed})`
  }

  protected isLowSample(row: { confirmed: number; avgKeptRatio: number | null }): boolean {
    return row.avgKeptRatio !== null && row.confirmed < LOW_SAMPLE
  }

  protected privateNote(count: number): string {
    return this.translation.translate('platform_learning_private_note').replace('{count}', String(count))
  }

  protected emptyPrivate(count: number): string {
    return this.translation.translate('platform_learning_empty_private').replace('{count}', String(count))
  }

  private async loadStats(): Promise<void> {
    this.loadFailed_.set(false)
    try {
      this.stats_.set(await this.platformAdmin.getLearningStats())
    } catch (err) {
      this.loadFailed_.set(true)
      this.logging.error({
        event: 'platform.learning_load_failed',
        message: 'Loading the learning numbers failed',
        context: { err: String(err) }
      })
      this.userMsg.onSetErrorMsg(this.translation.translate('platform_learning_error'))
    }
  }

  private async loadStatus(): Promise<void> {
    try {
      this.fileStore_.set((await this.platformAdmin.getLearningStatus()).fileStore)
    } catch (err) {
      this.logging.error({
        event: 'platform.learning_load_failed',
        message: 'Loading the file store status failed',
        context: { err: String(err) }
      })
    }
  }
}
