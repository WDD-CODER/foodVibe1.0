import { Injectable, Signal, computed, signal } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { BaseEntityDataService } from './base-entity-data.service'
import type { DishSalesMonth, DishSalesRow } from '@models/dish-sales-month.model'

const ENTITY = 'dishSalesMonths'

/** Plan 726: the typed monthly dish sales — one document per month, saved in one request. */
@Injectable({ providedIn: 'root' })
export class DishSalesMonthDataService extends BaseEntityDataService<DishSalesMonth> {
  readonly allMonths_: Signal<DishSalesMonth[]> = this.all_

  private readonly loadFailedState_ = signal(false)
  /** True when the last `load()` failed (the page shows a retry). */
  readonly loadFailed_ = this.loadFailedState_.asReadonly()

  private readonly byKey_ = computed(() => new Map(this.all_().map((m) => [m.month, m] as const)))

  constructor() {
    // Deferred: the page loads it and must tell a failed load from a month nobody typed yet.
    super(ENTITY, false, { errorEvent: 'crud.dish_sales_month.hydrate_error', errorMessage: 'Failed to load months' })
  }

  /** The stored document of a month, or undefined while nothing was saved for it. */
  monthOf(key: string): DishSalesMonth | undefined {
    return this.byKey_().get(key)
  }

  async load(): Promise<void> {
    this.loadFailedState_.set(false)
    try {
      const rows = await this.storage.query<DishSalesMonth>(ENTITY)
      this.updateItems(() => (Array.isArray(rows) ? rows : []))
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.loadFailedState_.set(true)
      this.logging.error({
        event: 'crud.dish_sales_month.hydrate_error',
        message: 'Failed to load months',
        context: { err }
      })
    }
  }

  /**
   * Saves the whole month in one request: POST when no document exists, else PUT of the stored document with the new
   * rows. A 409 `MONTH_EXISTS` (someone saved first) reloads once and retries as a PUT.
   */
  async saveMonth(key: string, rows: DishSalesRow[], note?: string): Promise<DishSalesMonth> {
    try {
      return await this.write(key, rows, note)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 409 && err.error?.error === 'MONTH_EXISTS') {
        await this.load()
        if (this.monthOf(key)) {
          try {
            return await this.write(key, rows, note)
          } catch (retryErr) {
            this.logError(retryErr)
            throw retryErr
          }
        }
      }
      this.logError(err)
      throw err
    }
  }

  private async write(key: string, rows: DishSalesRow[], note?: string): Promise<DishSalesMonth> {
    const stored = this.monthOf(key)
    if (!stored) {
      const body = { month: key, rows, ...(note ? { note } : {}) } as DishSalesMonth
      const saved = await this.storage.post<DishSalesMonth>(ENTITY, body)
      this.updateItems((items) => [...items.filter((m) => m.month !== key), saved])
      return saved
    }
    const { note: oldNote, ...rest } = stored
    void oldNote
    const next = { ...rest, rows, ...(note ? { note } : {}) } as DishSalesMonth
    const saved = await this.storage.put<DishSalesMonth>(ENTITY, next)
    this.updateItems((items) => items.map((m) => (m._id === saved._id ? saved : m)))
    return saved
  }

  private logError(err: unknown): void {
    if (err instanceof HttpErrorResponse && err.status === 401) return
    this.logging.error({
      event: 'crud.dish_sales_month.save_error',
      message: 'Failed to save month',
      context: { err }
    })
  }
}
