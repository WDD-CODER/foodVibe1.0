import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core'
import { DatePipe } from '@angular/common'
import { Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import type { Invoice } from '@schemas/entities'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { COLUMN_CAROUSEL } from 'src/app/shared/column-carousel'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import type { ListColumn } from 'src/app/shared/list-shell/list-columns.util'
import { ListShellComponent } from 'src/app/shared/list-shell/list-shell.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { InvoiceDataService } from '@services/invoice-data.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'

/** Newest first: by invoice date (a missing date sorts last), then by the day it was saved. */
function newestFirst(a: Invoice, b: Invoice): number {
  const byDate = (b.invoiceDate ?? '').localeCompare(a.invoiceDate ?? '')
  return byDate !== 0 ? byDate : b.createdAt - a.createdAt
}

/** Plan 628: the invoices the owner saved from a photo or a PDF, with the stored file one tap away. */
@Component({
  selector: 'app-invoices-list',
  standalone: true,
  imports: [
    DatePipe,
    LucideAngularModule,
    TranslatePipe,
    EmptyStateComponent,
    ListShellComponent,
    LoaderComponent,
    ...COLUMN_CAROUSEL
  ],
  templateUrl: './invoices-list.component.html',
  styleUrl: './invoices-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvoicesListComponent implements OnInit {
  private readonly data_ = inject(InvoiceDataService)
  private readonly permission_ = inject(PermissionService)
  private readonly router_ = inject(Router)
  private readonly translation_ = inject(TranslationService)
  private readonly userMsg_ = inject(UserMsgService)

  protected readonly isLoading_ = signal(true)
  protected readonly isOwner_ = computed(() => this.permission_.can('editMoney', { type: 'products' }))
  protected readonly invoices_ = computed(() => [...this.data_.allInvoices_()].sort(newestFirst))
  /** Declared columns (plan 746): file → saved at → lines count → invoice number; supplier and date stay. */
  protected readonly columns_ = computed<readonly ListColumn[]>(() => {
    const head: ListColumn[] = [
      { id: 'supplier', track: '1.6fr', min: '9rem', phoneMin: '7rem' },
      { id: 'date', track: '1fr', min: '6rem' },
      { id: 'number', track: '1fr', min: '6rem', fall: 4 }
    ]
    if (!this.isOwner_()) return [...head, { id: 'saved', track: '1fr', min: '6.5rem', fall: 2 }]
    return [
      ...head,
      { id: 'lines', track: '0.7fr', min: '4rem', fall: 3 },
      { id: 'saved', track: '1fr', min: '6.5rem', fall: 2 },
      { id: 'file', track: '1.2fr', min: '7rem', fall: 1 }
    ]
  })

  async ngOnInit(): Promise<void> {
    // An apply writes on the server, so a list cached from an earlier visit is stale.
    try {
      await this.data_.reloadFromStorage()
    } finally {
      this.isLoading_.set(false)
    }
  }

  protected scanNew(): void {
    void this.router_.navigateByUrl('/inventory/import')
  }

  protected async openFile(fileId: string): Promise<void> {
    // window.open runs synchronously inside openFile, before its first await.
    const isOpened = await this.data_.openFile(fileId)
    if (!isOpened) this.userMsg_.onSetErrorMsg(this.translation_.translate('invoice_file_open_failed'))
  }
}
