import { inject, Injectable, signal } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { environment } from '../../../environments/environment'
import { API } from './http-storage.adapter'
import { LoggingService } from './logging.service'
import type { FloorPlan, FloorPlanBody, FloorPlanIssue } from '@models/floor-plan.model'

/** A booking that holds a table the saved plan would drop (no guest detail). */
export type InUseBooking = { _id: string; date: string; time: string; partySize: number; tableKeys: string[] }

/** The stored plan, or the server's refusal: `code` is its `error` (BAD_FLOOR_PLAN, TABLE_IN_USE ...), null when none. */
export type FloorPlanSaveResult =
  | { ok: true; plan: FloorPlan }
  | { ok: false; code: string | null; issues?: FloorPlanIssue[]; bookings?: InUseBooking[] }

/**
 * Plan 664: the business's one floor plan. Every table screen reads `plan_` from here; only the owner's save works.
 * No toast and no dictionary text: the screens show the refusals.
 */
@Injectable({ providedIn: 'root' })
export class FloorPlanDataService {
  private readonly http = inject(HttpClient)
  private readonly logging = inject(LoggingService)
  private readonly plan = signal<FloorPlan | null>(null)
  private readonly loaded = signal(false)
  private readonly failed = signal(false)
  private loading: Promise<void> | null = null

  readonly plan_ = this.plan.asReadonly()
  readonly isLoaded_ = this.loaded.asReadonly()
  readonly loadFailed_ = this.failed.asReadonly()

  private url(): string {
    return `${environment.apiUrl}${API.floorPlan()}`
  }

  async load(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<{ plan: FloorPlan | null }>(this.url()))
      this.plan.set(res.plan)
      this.failed.set(false)
      this.loaded.set(true)
    } catch (err) {
      const status = (err as { status?: number }).status
      this.failed.set(true)
      this.logging[status !== undefined && status >= 400 && status < 500 ? 'warn' : 'error']({
        event: 'floor_plan.load_failed',
        message: 'Floor plan load failed',
        context: { status: String(status ?? '') }
      })
    }
  }

  /** Loads once; a later call returns the same promise or resolves at once. A failed load can be asked again. */
  ensureLoaded(): Promise<void> {
    if (this.loaded()) return Promise.resolve()
    this.loading ??= this.load().finally(() => (this.loading = null))
    return this.loading
  }

  async save(body: FloorPlanBody): Promise<FloorPlanSaveResult> {
    try {
      const res = await firstValueFrom(this.http.put<{ plan: FloorPlan }>(this.url(), body))
      this.plan.set(res.plan)
      this.loaded.set(true)
      return { ok: true, plan: res.plan }
    } catch (err) {
      const e = err as {
        status?: number
        error?: { error?: string; issues?: FloorPlanIssue[]; bookings?: InUseBooking[] }
      }
      const refused = e.status !== undefined && e.status >= 400 && e.status < 500
      this.logging[refused ? 'warn' : 'error']({
        event: 'floor_plan.save_failed',
        message: 'Floor plan save failed',
        context: { status: String(e.status ?? '') }
      })
      return {
        ok: false,
        code: e.error?.error ?? null,
        ...(e.error?.issues && { issues: e.error.issues }),
        ...(e.error?.bookings && { bookings: e.error.bookings })
      }
    }
  }
}
