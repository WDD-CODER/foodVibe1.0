import { inject, Injectable, Signal } from '@angular/core'
import { HttpClient, HttpErrorResponse } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import type { Invoice } from '@schemas/entities'
import { environment } from '../../../environments/environment'
import { API } from './http-storage.adapter'
import { BaseEntityDataService } from './base-entity-data.service'

/** Plan 628: the saved invoices (read-only; they are written by `product-import/apply`). The server trims a staff read. */
@Injectable({ providedIn: 'root' })
export class InvoiceDataService extends BaseEntityDataService<Invoice> {
  private readonly http_ = inject(HttpClient)

  readonly allInvoices_: Signal<Invoice[]> = this.all_

  constructor() {
    super('invoices', false)
  }

  /**
   * Opens a stored invoice file in a new tab. The tab is opened inside the click (a tab opened after an await is
   * blocked on phones) and pointed at the 300-second link afterwards. The link is never stored or logged.
   * Returns false (tab closed, status logged) when the file could not be opened.
   */
  async openFile(fileId: string): Promise<boolean> {
    const tab = window.open('about:blank', '_blank')
    try {
      const { url } = await firstValueFrom(
        this.http_.get<{ url: string }>(`${environment.authApiUrl}${API.files(fileId)}`)
      )
      if (!tab) throw new Error('POPUP_BLOCKED')
      tab.opener = null
      tab.location.replace(url)
      return true
    } catch (err) {
      tab?.close()
      this.logging.error({
        event: 'invoices.file_open_failed',
        message: 'Invoice file could not be opened',
        context: { status: err instanceof HttpErrorResponse ? err.status : 0 }
      })
      return false
    }
  }
}
