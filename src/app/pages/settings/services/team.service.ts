import { inject, Injectable, signal } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { environment } from '../../../../environments/environment'
import { LoggingService } from '@services/logging.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { hashPassword } from '../../../core/utils/auth-crypto'

/** One row of the owner's team list (`GET /api/v1/business/team`). */
export interface TeamMember {
  _id: string
  name: string
  businessRole: 'owner' | 'staff'
  createdAt: number | null
  /** Latest active day from the usage record (plan 430); null until then. */
  lastActiveAt: number | null
}

/** Why adding a team member failed, as a dictionary key the Team tab shows. */
export type AddStaffResult = { ok: true } | { ok: false; errorKey: string }

const TEAM_URL = `${environment.apiUrl}/api/v1/business/team`

/**
 * The owner's team: list, add, remove (plan 428). Lives with the lazy settings page so the initial bundle
 * does not carry it; `BusinessService` keeps the business itself.
 */
@Injectable({ providedIn: 'root' })
export class TeamService {
  private readonly http = inject(HttpClient)
  private readonly logging = inject(LoggingService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)

  private readonly _team_ = signal<TeamMember[]>([])
  /** The owner and the active staff of the business; filled by `loadTeam()`. */
  readonly team_ = this._team_.asReadonly()

  /** Reads the team list (owner only; staff get a 403 and an empty list). */
  async loadTeam(): Promise<void> {
    this._team_.set([])
    try {
      this._team_.set(await firstValueFrom(this.http.get<TeamMember[]>(TEAM_URL)))
    } catch (err) {
      this.logging.warn('Team could not be loaded', { err: String(err) })
    }
  }

  /** Adds a staff member; the password is hashed here and never sent in plain text. */
  async addStaff(name: string, plainPassword: string): Promise<AddStaffResult> {
    try {
      const password = await hashPassword(plainPassword)
      const member = await firstValueFrom(this.http.post<TeamMember>(TEAM_URL, { name: name.trim(), password }))
      this._team_.update((team) => [...team, member])
      this.userMsg.onSetSuccessMsg(this.translation.translate('team_member_added'))
      return { ok: true }
    } catch (err) {
      const status = (err as { status?: number }).status
      const errorKey = status === 409 ? 'username_taken' : status === 400 ? 'username_invalid_chars' : 'server_error'
      this.logging.warn('Team member could not be added', { status: String(status) })
      return { ok: false, errorKey }
    }
  }

  /** Removes a staff member's access (their items stay). Returns true when the server accepted it. */
  async removeStaff(userId: string): Promise<boolean> {
    try {
      await firstValueFrom(this.http.delete(`${TEAM_URL}/${userId}`))
      this._team_.update((team) => team.filter((member) => member._id !== userId))
      this.userMsg.onSetSuccessMsg(this.translation.translate('team_member_removed'))
      return true
    } catch (err) {
      const status = (err as { status?: number }).status
      this.logging.warn('Team member could not be removed', { status: String(status) })
      // A 403 already got the "no permission" toast from the interceptor.
      if (status !== 403) this.userMsg.onSetErrorMsg(this.translation.translate('server_error'))
      return false
    }
  }
}
