import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { DatePipe } from '@angular/common'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { PlatformAdminService, type AdminTermRow } from '@services/platform-admin.service'
import { TaxonomyStore } from '@services/taxonomy-store.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { UserMsgService } from '@services/user-msg.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'

export interface LogisticsItemGroup {
  key: string
  rows: AdminTermRow[]
  /** The oldest row: its phase, section and extras are what gets shared. */
  first: AdminTermRow
  phaseKey: string | null
  sectionKey: string | null
}

/**
 * Plan 532: the platform admin sees every business's own logistics items grouped by question and shares one
 * with a tap (the shared-term POST folds each business's same-key copy into it).
 */
@Component({
  selector: 'app-platform-logistics-items',
  standalone: true,
  imports: [DatePipe, LucideAngularModule, TranslatePipe, EmptyStateComponent],
  templateUrl: './platform-logistics-items.component.html',
  styleUrl: './platform-logistics-items.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlatformLogisticsItemsComponent implements OnInit {
  // 1. INJECTED
  private readonly platformAdmin = inject(PlatformAdminService)
  private readonly taxonomy = inject(TaxonomyStore)
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly userMsg = inject(UserMsgService)
  private readonly logging = inject(LoggingService)
  private readonly translation = inject(TranslationService)

  // 4. SIGNALS & CONSTANTS
  protected readonly isLoading_ = signal(true)

  // 5. COMPUTED
  protected readonly groups_ = computed<LogisticsItemGroup[]>(() => {
    const byKey = new Map<string, AdminTermRow[]>()
    for (const row of this.platformAdmin.termRows_()) {
      const key = row.key.trim()
      byKey.set(key, [...(byKey.get(key) ?? []), row])
    }
    const groups = [...byKey.entries()].map(([key, rows]) => {
      const sorted = [...rows].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
      const first = sorted[0]
      return {
        key,
        rows: sorted,
        first,
        phaseKey: first.phase ? `logistics_tab_${first.phase}` : null,
        sectionKey: first.section ? `logistics_section_${first.section}` : null
      }
    })
    return groups.sort((a, b) => {
      const multi = Number(b.rows.length > 1) - Number(a.rows.length > 1)
      return multi || a.key.localeCompare(b.key, 'he')
    })
  })

  // 6. METHODS
  async ngOnInit(): Promise<void> {
    await this.reload()
    this.isLoading_.set(false)
  }

  protected async promote(group: LogisticsItemGroup): Promise<void> {
    const confirmed = await this.confirmModal.open(
      this.translation.translate('platform_logistics_promote_confirm') + '\n' + group.key
    )
    if (!confirmed) return
    const { first } = group
    try {
      await this.taxonomy.add(
        'logisticsItem',
        group.key,
        {
          phase: first.phase ?? 'site_visit',
          section: (first.section ?? 'other') as never,
          answerType: first.answerType ?? 'status',
          ...(first.environments?.length && { environments: first.environments as never }),
          ...(first.hint && { hint: first.hint })
        },
        { shared: true }
      )
      this.userMsg.onSetSuccessMsg(this.translation.translate('platform_logistics_promoted'))
      await this.reload()
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 409) {
        this.userMsg.onSetErrorMsg(this.translation.translate('platform_logistics_already_shared'))
        await this.reload()
        return
      }
      this.logging.error({
        event: 'platform.logistics_promote_failed',
        message: 'Sharing a logistics item failed',
        context: { err: String(err) }
      })
      this.userMsg.onSetErrorMsg(this.translation.translate('platform_logistics_promote_failed'))
    }
  }

  private async reload(): Promise<void> {
    try {
      await this.platformAdmin.loadTerms('logisticsItem')
    } catch (err) {
      this.logging.error({
        event: 'platform.logistics_load_failed',
        message: 'Loading the logistics items failed',
        context: { err: String(err) }
      })
      this.userMsg.onSetErrorMsg(this.translation.translate('platform_logistics_load_failed'))
    }
  }
}
