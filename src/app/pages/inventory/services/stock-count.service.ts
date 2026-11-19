import { inject, Injectable } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { environment } from '../../../../environments/environment'
import { API } from '@services/http-storage.adapter'
import { PermissionService } from '@services/permission.service'
import { UserService } from '@services/user.service'
import type { StockCount } from '@schemas/entities/stock-count.schema'
import type { OnHandRow, StockCountInput } from '@schemas/stock/stock-count-input.schema'

/** Plan 636: the browser's one client of the stock routes (plan 635). The server computes every base amount. */
@Injectable({ providedIn: 'root' })
export class StockCountService {
  private readonly http_ = inject(HttpClient)
  private readonly permission_ = inject(PermissionService)
  private readonly user_ = inject(UserService)
  private readonly base_ = environment.apiUrl

  private url_(path: string): string {
    return `${this.base_}${API.stock(path)}`
  }

  loadOnHand(): Promise<OnHandRow[]> {
    return firstValueFrom(this.http_.get<OnHandRow[]>(this.url_('on-hand')))
  }

  /** The newest draft the caller may edit: the owner any, staff only the ones they created. */
  async loadOpenDraft(): Promise<StockCount | null> {
    const params = new HttpParams().set('status', 'draft').set('limit', '20')
    const drafts = await firstValueFrom(this.http_.get<StockCount[]>(this.url_('counts'), { params }))
    const isOwner = this.permission_.isOwner_()
    const userId = this.user_.user_()?._id
    const mine = drafts.filter((d) => isOwner || (!!userId && d.createdBy === userId))
    if (!mine.length) return null
    return mine.reduce((best, d) => ((d.updatedAt ?? 0) > (best.updatedAt ?? 0) ? d : best))
  }

  saveDraft(input: StockCountInput, id?: string): Promise<StockCount> {
    return firstValueFrom(
      id
        ? this.http_.put<StockCount>(this.url_(`counts/${encodeURIComponent(id)}`), input)
        : this.http_.post<StockCount>(this.url_('counts'), input)
    )
  }

  finalize(id: string): Promise<StockCount> {
    return firstValueFrom(this.http_.post<StockCount>(this.url_(`counts/${encodeURIComponent(id)}/finalize`), {}))
  }
}
