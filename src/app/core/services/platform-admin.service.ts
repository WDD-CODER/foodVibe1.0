import { inject, Injectable, signal } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { environment } from '../../../environments/environment'

/** One line of the platform admin's table (plan 448): counts and dates only, never a business's content. */
export interface BusinessRow {
  _id: string
  name: string
  ownerName: string | null
  staffCount: number
  createdAt: number | null
  internal: boolean
  lastActivityAt: number | null
  activeDays7: number
  events: { total: number; active: number; closed: number; finished: number }
  /** closed / (closed + not closed), 0..1; null when there is nothing to divide. */
  closeRate: number | null
  lastEventDate: string | null
}

/** Cross-business numbers for the platform admin. The server refuses everyone else. */
@Injectable({ providedIn: 'root' })
export class PlatformAdminService {
  private readonly http = inject(HttpClient)

  private readonly _rows_ = signal<BusinessRow[]>([])
  public readonly rows_ = this._rows_.asReadonly()

  async load(): Promise<void> {
    const res = await firstValueFrom(
      this.http.get<{ rows: BusinessRow[] }>(`${environment.apiUrl}/api/v1/admin/businesses`)
    )
    this._rows_.set(res.rows)
  }

  /** Optimistic: flips the row first, puts it back and rethrows when the server refuses. */
  async setInternal(id: string, internal: boolean): Promise<void> {
    const before = this._rows_()
    this._rows_.set(before.map((row) => (row._id === id ? { ...row, internal } : row)))
    try {
      await firstValueFrom(this.http.put(`${environment.apiUrl}/api/v1/admin/businesses/${id}/internal`, { internal }))
    } catch (err) {
      this._rows_.set(before)
      throw err
    }
  }
}
