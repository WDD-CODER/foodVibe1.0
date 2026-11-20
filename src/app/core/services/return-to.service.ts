import { Injectable } from '@angular/core'

/** What a page keeps while the person is away adding something, so it can finish the line on return. */
export interface ReturnToPending {
  spoken: string
  quantity?: number
  unit?: string
}

/**
 * Plan 651 (leave-and-return): one small helper beside the auth guard's `returnUrl` pattern. A page that sends the
 * person away (add a product from the stock count) passes `?returnUrl=`; the page it opens reads it back through
 * `safeUrl` and returns there. `pending` holds the line the person came from, until the page takes it back.
 */
@Injectable({ providedIn: 'root' })
export class ReturnToService {
  private pending_: ReturnToPending | null = null

  /** The `returnUrl` query value when it is an in-app path (one leading slash), else null. Never an outside address. */
  safeUrl(raw: string | null | undefined): string | null {
    if (typeof raw !== 'string') return null
    if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\') || raw.includes('://')) return null
    return raw
  }

  setPending(pending: ReturnToPending): void {
    this.pending_ = pending
  }

  /** The kept line, once; it is forgotten after this call. */
  takePending(): ReturnToPending | null {
    const out = this.pending_
    this.pending_ = null
    return out
  }
}
