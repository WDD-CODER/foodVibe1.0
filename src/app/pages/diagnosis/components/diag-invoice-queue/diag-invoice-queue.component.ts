import { ChangeDetectionStrategy, Component, computed, inject, input, model, signal, viewChild } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from '@pipes/translation-pipe.pipe'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { ProductImportComponent } from '../../../inventory/components/product-import/product-import.component'
import { DiagnosisService } from '../../services/diagnosis.service'

type QueueStatus = 'waiting' | 'current' | 'done' | 'skipped'
interface QueueItem {
  id: number
  file: File
  status: QueueStatus
}

/** A diagnosis holds at most this many invoices (the server's cap). */
const MAX_INVOICES = 100

const STATUS_KEY: Readonly<Record<QueueStatus, string>> = {
  waiting: 'diag_queue_waiting',
  current: 'diag_queue_current',
  done: 'diag_queue_done',
  skipped: 'diag_queue_skipped'
}

/**
 * Plan 634: a batch of invoice files read and approved one at a time. The files live in memory only; exactly one is
 * handed to the embedded import preview, which reads it, shows the normal line check and applies it with its own save.
 */
@Component({
  selector: 'app-diag-invoice-queue',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, ProductImportComponent],
  templateUrl: './diag-invoice-queue.component.html',
  styleUrl: './diag-invoice-queue.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiagInvoiceQueueComponent {
  private readonly diagnosis_ = inject(DiagnosisService)
  private readonly userMsg_ = inject(UserMsgService)
  private readonly translation_ = inject(TranslationService)

  readonly diagnosisId = input.required<string>()
  /** The invoices already on the diagnosis; updated after each approved invoice is saved. */
  readonly invoiceIds = model<string[]>([])
  readonly locked = input(false)

  private readonly preview_ = viewChild(ProductImportComponent)
  protected readonly files_ = signal<QueueItem[]>([])
  private nextId_ = 1

  protected readonly current_ = computed(() => this.files_().find((item) => item.status === 'current') ?? null)
  protected readonly statusKey = (status: QueueStatus): string => STATUS_KEY[status]

  /** True while the open preview holds a read that was not applied. */
  hasRealChanges(): boolean {
    return this.preview_()?.hasRealChanges() ?? false
  }

  protected onFilesChosen(event: Event): void {
    const input = event.target as HTMLInputElement
    const chosen = Array.from(input.files ?? [])
    input.value = '' // the same files can be chosen again
    if (chosen.length === 0 || this.locked()) return
    const queued = this.files_().filter((item) => item.status === 'waiting' || item.status === 'current').length
    const room = Math.max(0, MAX_INVOICES - this.invoiceIds().length - queued)
    if (chosen.length > room) this.userMsg_.onSetErrorMsg(this.translation_.translate('diag_queue_too_many'))
    const added = chosen.slice(0, room).map((file): QueueItem => ({ id: this.nextId_++, file, status: 'waiting' }))
    if (added.length === 0) return
    this.files_.update((items) => this.withCurrent_([...items, ...added]))
  }

  protected skip(): void {
    this.finishCurrent_('skipped')
  }

  protected async onApplied(event: { invoiceId: string | null }): Promise<void> {
    const id = event.invoiceId
    this.finishCurrent_('done')
    if (!id) {
      this.userMsg_.onSetErrorMsg(this.translation_.translate('diag_queue_no_record'))
      return
    }
    const next = [...this.invoiceIds(), id]
    try {
      await this.diagnosis_.saveInvoices(this.diagnosisId(), next)
      this.invoiceIds.set(next)
    } catch {
      this.userMsg_.onSetErrorMsg(this.translation_.translate('diag_queue_no_record'))
    }
  }

  private finishCurrent_(status: 'done' | 'skipped'): void {
    this.files_.update((items) =>
      this.withCurrent_(items.map((item) => (item.status === 'current' ? { ...item, status } : item)))
    )
  }

  /** Makes the first waiting file current when no file is. */
  private withCurrent_(items: QueueItem[]): QueueItem[] {
    if (items.some((item) => item.status === 'current')) return items
    const index = items.findIndex((item) => item.status === 'waiting')
    return index < 0 ? items : items.map((item, i) => (i === index ? { ...item, status: 'current' } : item))
  }
}
