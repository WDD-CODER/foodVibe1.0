import { Injectable, Signal, computed, inject } from '@angular/core'
import { HttpClient, HttpErrorResponse } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { environment } from '../../../environments/environment'
import { API } from './http-storage.adapter'
import { tableServiceOf } from '@schemas/front-desk/table-service'
import { templateFor } from '@schemas/front-desk-templates'
import { BaseEntityDataService } from './base-entity-data.service'
import type { BusinessType, FrontDeskProfile } from '@models/front-desk-profile.model'

const ENTITY = 'frontDeskProfiles'

/**
 * Plan 548: the business's one front desk profile. Only the owner writes (the server refuses staff); the server
 * keeps `status` and `whatsapp`, and never sends `whatsapp.phoneNumberId`.
 */
@Injectable({ providedIn: 'root' })
export class FrontDeskProfileDataService extends BaseEntityDataService<FrontDeskProfile> {
  private readonly http = inject(HttpClient)

  /** Domain alias for the base-class signal. */
  readonly allProfiles_: Signal<FrontDeskProfile[]> = this.all_

  /** The business's one profile, or `null` while it has none. */
  readonly profile_ = computed<FrontDeskProfile | null>(() => this.all_()[0] ?? null)

  constructor() {
    super(ENTITY, false, {
      errorEvent: 'crud.frontDeskProfiles.hydrate_error',
      errorMessage: 'Failed to load the front desk profile',
      clearOnReload: true
    })
  }

  /** Creates the profile from the template of `businessType`; the server answers 409 PROFILE_EXISTS or SLUG_TAKEN. */
  async createFromTemplate(businessType: BusinessType, slug: string, displayName: string): Promise<FrontDeskProfile> {
    try {
      const body = { ...templateFor(businessType), slug, displayName } as unknown as FrontDeskProfile
      const saved = await this.storage.post<FrontDeskProfile>(ENTITY, body)
      this.updateItems((items) => [...items, saved])
      return saved
    } catch (err) {
      if (!(err instanceof HttpErrorResponse && (err.status === 401 || err.status === 409))) {
        this.logging.error({
          event: 'crud.frontDeskProfile.create_error',
          message: 'Failed to create the front desk profile',
          context: { err }
        })
      }
      throw err
    }
  }

  /**
   * Plan 667: the one-button confirm-mode switch, saved by its own call. On success the stored profile shows the new
   * mode; on a failure nothing changes and it answers `false`.
   */
  async setConfirmMode(mode: 'auto' | 'manual'): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.put<{ confirmMode: string }>(`${environment.apiUrl}${API.floorPlan('confirm-mode')}`, {
          confirmMode: mode
        })
      )
      this.updateItems((items) =>
        items.map((p, i) => (i === 0 ? { ...p, tableService: { ...tableServiceOf(p), confirmMode: mode } } : p))
      )
      return true
    } catch (err) {
      if (!(err instanceof HttpErrorResponse && err.status === 401)) {
        this.logging.error({
          event: 'crud.frontDeskProfile.confirm_mode_error',
          message: 'Failed to change the confirm mode',
          context: { status: String((err as { status?: number }).status ?? '') }
        })
      }
      return false
    }
  }

  /**
   * Plan 734: the owner's assistant level switch (0 drafts only, 1 answers guests alone), saved by its own call.
   * On success the stored profile shows the new level; on a failure nothing changes and it answers the server's
   * error code (`'error'` when there is none).
   */
  async setAssistantLevel(level: 0 | 1): Promise<{ ok: true } | { ok: false; code: string }> {
    try {
      await firstValueFrom(
        this.http.put<{ level: number }>(`${environment.apiUrl}${API.business('front-desk/assistant-level')}`, {
          level
        })
      )
      this.updateItems((items) => items.map((p, i) => (i === 0 ? { ...p, assistant: { ...p.assistant, level } } : p)))
      return { ok: true }
    } catch (err) {
      const status = (err as { status?: number }).status
      if (status !== 401) {
        this.logging.error({
          event: 'crud.frontDeskProfile.assistant_level_error',
          message: 'Failed to change the assistant level',
          context: { status: String(status ?? '') }
        })
      }
      const code = err instanceof HttpErrorResponse ? (err.error as { error?: unknown } | null)?.error : undefined
      return { ok: false, code: typeof code === 'string' ? code : 'error' }
    }
  }

  async save(profile: FrontDeskProfile): Promise<FrontDeskProfile> {
    try {
      const updated = await this.storage.put<FrontDeskProfile>(ENTITY, profile)
      this.updateItems((items) => items.map((p) => (p._id === updated._id ? updated : p)))
      return updated
    } catch (err) {
      if (!(err instanceof HttpErrorResponse && (err.status === 401 || err.status === 409))) {
        this.logging.error({
          event: 'crud.frontDeskProfile.update_error',
          message: 'Failed to save the front desk profile',
          context: { err }
        })
      }
      throw err
    }
  }
}
