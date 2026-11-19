import { HttpErrorResponse } from '@angular/common/http'
import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import type { Diagnosis } from '@schemas/entities'
import type { VolatilityRow } from '@schemas/diag/volatility'
import { TranslatePipe } from '@pipes/translation-pipe.pipe'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import type { PendingChangesComponent } from 'src/app/core/guards/pending-changes.guard'
import { warnBeforeUnload } from 'src/app/core/utils/leave-warning.util'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { PageHeaderComponent } from 'src/app/shared/page-header/page-header.component'
import { ScrollRailComponent } from 'src/app/shared/scroll-rail/scroll-rail.component'
import { DiagInvoiceQueueComponent } from '../diag-invoice-queue/diag-invoice-queue.component'
import { DiagMenuComponent } from '../diag-menu/diag-menu.component'
import { DiagReportComponent } from '../diag-report/diag-report.component'
import { DiagnosisService } from '../../services/diagnosis.service'

export type DiagnosisTab = 'invoices' | 'menu' | 'report'

const TABS: ReadonlyArray<{ key: DiagnosisTab; labelKey: string; icon: string }> = [
  { key: 'invoices', labelKey: 'diag_tab_invoices', icon: 'file-text' },
  { key: 'menu', labelKey: 'diag_tab_menu', icon: 'clipboard-list' },
  { key: 'report', labelKey: 'diag_tab_report', icon: 'printer' }
]

/**
 * Plan 634: one diagnosis and its three tabs (invoices, menu, report), chosen by `?tab=`. The route runs the
 * leave guard on a `?tab=` change too, so a tab switch asks when the menu or the open preview holds an edit.
 */
@Component({
  selector: 'app-diagnosis-workspace',
  standalone: true,
  imports: [
    LucideAngularModule,
    TranslatePipe,
    LoaderComponent,
    PageHeaderComponent,
    ScrollRailComponent,
    DiagInvoiceQueueComponent,
    DiagMenuComponent,
    DiagReportComponent
  ],
  templateUrl: './diagnosis-workspace.component.html',
  styleUrl: './diagnosis-workspace.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiagnosisWorkspaceComponent implements PendingChangesComponent {
  private readonly route_ = inject(ActivatedRoute)
  private readonly router_ = inject(Router)
  private readonly diagnosis_ = inject(DiagnosisService)
  private readonly userMsg_ = inject(UserMsgService)
  private readonly translation_ = inject(TranslationService)

  private readonly menu_ = viewChild(DiagMenuComponent)
  private readonly queue_ = viewChild(DiagInvoiceQueueComponent)
  private readonly params_ = toSignal(this.route_.paramMap)
  private readonly query_ = toSignal(this.route_.queryParamMap)

  protected readonly tabs = TABS
  protected readonly item_ = signal<Diagnosis | null>(null)
  protected readonly volatility_ = signal<VolatilityRow[]>([])
  protected readonly isLoading_ = signal(true)
  protected readonly isBusy_ = signal(false)

  protected readonly id_ = computed(() => this.params_()?.get('id') ?? '')
  protected readonly tab_ = computed<DiagnosisTab>(() => {
    const wanted = this.query_()?.get('tab')
    return TABS.some((tab) => tab.key === wanted) ? (wanted as DiagnosisTab) : 'invoices'
  })
  protected readonly isDone_ = computed(() => this.item_()?.status === 'done')

  constructor() {
    warnBeforeUnload(() => this.hasRealChanges())
    void this.load_()
  }

  /** True when the menu tab holds unsaved edits or the embedded preview holds a read that was not applied. */
  hasRealChanges(): boolean {
    return (this.menu_()?.hasRealChanges() ?? false) || (this.queue_()?.hasRealChanges() ?? false)
  }

  /** Saves the menu tab; with preview changes it answers false (the preview keeps its own save button). */
  async saveAndWait(): Promise<boolean> {
    if (this.queue_()?.hasRealChanges()) return false
    return (await this.menu_()?.saveAndWait()) ?? true
  }

  private async load_(): Promise<void> {
    try {
      const data = await this.diagnosis_.loadData(this.id_())
      this.item_.set(data.diagnosis)
      this.volatility_.set(data.volatility)
    } catch (err) {
      if (this.isModuleOff_(err)) await this.router_.navigate(['/dashboard'])
      else {
        this.userMsg_.onSetErrorMsg(this.translation_.translate('server_error'))
        await this.router_.navigate(['/diagnosis'])
      }
    } finally {
      this.isLoading_.set(false)
    }
  }

  private isModuleOff_(err: unknown): boolean {
    return err instanceof HttpErrorResponse && err.status === 403 && err.error?.error === 'MODULE_OFF'
  }

  protected setTab(tab: DiagnosisTab): void {
    void this.router_.navigate([], { relativeTo: this.route_, queryParams: { tab }, queryParamsHandling: 'merge' })
  }

  protected onSaved(stored: Diagnosis): void {
    this.item_.set(stored)
  }

  protected onInvoiceIds(invoiceIds: string[]): void {
    this.item_.update((item) => (item ? { ...item, invoiceIds } : item))
  }

  protected async toggleDone(): Promise<void> {
    const item = this.item_()
    if (!item || this.isBusy_()) return
    this.isBusy_.set(true)
    try {
      this.item_.set(await this.diagnosis_.setStatus(item._id, item.status === 'done' ? 'open' : 'done'))
    } catch (err) {
      if (this.isModuleOff_(err)) await this.router_.navigate(['/dashboard'])
      else this.userMsg_.onSetErrorMsg(this.translation_.translate('server_error'))
    } finally {
      this.isBusy_.set(false)
    }
  }
}
