import { computed, inject, Injectable, signal } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { environment } from '../../../environments/environment'
import { API } from './http-storage.adapter'
import { LoggingService } from './logging.service'
import { TranslationService } from './translation.service'
import { UserMsgService } from './user-msg.service'
import { UserService } from './user.service'

/** One business the signed-in user may enter (plan 631 `GET /access/businesses`). */
export interface EnterableBusiness {
  businessId: string
  name: string
  role: 'owner' | 'staff' | 'consultant'
}

/** One live consultant grant of the active business (`GET /access/grants`). */
export interface AccessGrant {
  _id: string
  name: string
  grantedAt: number
}

/** Why giving access failed, as a dictionary key the grant dialog shows. */
export type CreateGrantResult = { ok: true } | { ok: false; errorKey: string }

const ACCESS_URL = (path: string) => `${environment.apiUrl}${API.access(path)}`

/** The businesses a user may enter and the consultant grants of a business (plan 632, ADR 0032). */
@Injectable({ providedIn: 'root' })
export class AccessService {
  private readonly http = inject(HttpClient)
  private readonly logging = inject(LoggingService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly userService = inject(UserService)

  private readonly _businesses_ = signal<EnterableBusiness[]>([])
  readonly businesses_ = this._businesses_.asReadonly()

  private readonly _grants_ = signal<AccessGrant[]>([])
  readonly grants_ = this._grants_.asReadonly()

  private readonly _grantsLoading_ = signal(false)
  readonly grantsLoading_ = this._grantsLoading_.asReadonly()

  /** True when there is somewhere to switch to: another business in the list, or the user is inside one. */
  readonly canSwitch_ = computed(() => this._businesses_().length > 1 || this.userService.acting_() !== null)

  async loadBusinesses(): Promise<void> {
    try {
      this._businesses_.set(await firstValueFrom(this.http.get<EnterableBusiness[]>(ACCESS_URL('businesses'))))
    } catch (err) {
      this.logging.warn({
        event: 'access.businesses_failed',
        message: 'Businesses could not be loaded',
        context: { status: String((err as { status?: number }).status) }
      })
      this._businesses_.set([])
    }
  }

  async loadGrants(): Promise<void> {
    this._grantsLoading_.set(true)
    this._grants_.set([])
    try {
      this._grants_.set(await firstValueFrom(this.http.get<AccessGrant[]>(ACCESS_URL('grants'))))
    } catch (err) {
      const status = (err as { status?: number }).status
      this.logging.warn({
        event: 'access.grants_failed',
        message: 'Grants could not be loaded',
        context: { status: String(status) }
      })
      // A 403 already got the "no permission" toast from the interceptor.
      if (status !== 403) this.userMsg.onSetErrorMsg(this.translation.translate('server_error'))
    } finally {
      this._grantsLoading_.set(false)
    }
  }

  async removeGrant(id: string): Promise<boolean> {
    try {
      await firstValueFrom(this.http.delete(ACCESS_URL(`grants/${id}`)))
      this._grants_.update((rows) => rows.filter((row) => row._id !== id))
      this.userMsg.onSetSuccessMsg(this.translation.translate('access_removed'))
      return true
    } catch (err) {
      const status = (err as { status?: number }).status
      this.logging.warn({
        event: 'access.remove_failed',
        message: 'Grant could not be removed',
        context: { status: String(status) }
      })
      if (status !== 403) this.userMsg.onSetErrorMsg(this.translation.translate('server_error'))
      return false
    }
  }

  async createGrant(businessId: string, username: string): Promise<CreateGrantResult> {
    try {
      await firstValueFrom(this.http.post(ACCESS_URL('grants'), { businessId, username }))
      return { ok: true }
    } catch (err) {
      const code = (err as { error?: { error?: string } }).error?.error
      const errorKey =
        code === 'USER_NOT_FOUND'
          ? 'access_err_user_not_found'
          : code === 'ALREADY_MEMBER'
            ? 'access_err_already_member'
            : code === 'ALREADY_GRANTED'
              ? 'access_err_already_granted'
              : 'server_error'
      this.logging.warn({
        event: 'access.grant_failed',
        message: 'Access could not be given',
        context: { status: String((err as { status?: number }).status) }
      })
      return { ok: false, errorKey }
    }
  }
}
