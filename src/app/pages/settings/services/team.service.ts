import { inject, Injectable, signal } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { environment } from '../../../../environments/environment'
import { API } from '@services/http-storage.adapter'
import { LoggingService } from '@services/logging.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { hashPassword } from '../../../core/utils/auth-crypto'

/** One row of the owner's team list (`GET` on `API.business('team')`). */
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

const TEAM_URL = `${environment.apiUrl}${API.business('team')}`

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

  private readonly team_ = signal<TeamMember[]>([])
  /** The owner and the active staff of the business; filled by `loadTeam()`. */
  readonly teamList_ = this.team_.asReadonly()

  /** Reads the team list (owner only; staff get a 403 and an empty list). */
  async loadTeam(): Promise<void> {
    this.team_.set([])
    try {
      this.team_.set(await firstValueFrom(this.http.get<TeamMember[]>(TEAM_URL)))
    } catch (err) {
      const status = (err as { status?: number }).status
      this.logRefusal('Team could not be loaded', 'team.load_refused', status, err)
      // A 403 already got the "no permission" toast from the interceptor.
      if (status !== 403) this.userMsg.onSetErrorMsg(this.translation.translate('server_error'))
    }
  }

  /** Adds a staff member; the password is hashed here and never sent in plain text. */
  async addStaff(name: string, plainPassword: string): Promise<AddStaffResult> {
    try {
      const password = await hashPassword(plainPassword)
      const member = await firstValueFrom(this.http.post<TeamMember>(TEAM_URL, { name: name.trim(), password }))
      this.team_.update((team) => [...team, member])
      this.userMsg.onSetSuccessMsg(this.translation.translate('team_member_added'))
      return { ok: true }
    } catch (err) {
      const status = (err as { status?: number }).status
      const errorKey = status === 409 ? 'username_taken' : status === 400 ? 'username_invalid_chars' : 'server_error'
      this.logRefusal('Team member could not be added', 'team.add_refused', status, err)
      return { ok: false, errorKey }
    }
  }

  /** Removes a staff member's access (their items stay). Returns true when the server accepted it. */
  async removeStaff(userId: string): Promise<boolean> {
    try {
      await firstValueFrom(this.http.delete(`${TEAM_URL}/${userId}`))
      this.team_.update((team) => team.filter((member) => member._id !== userId))
      this.userMsg.onSetSuccessMsg(this.translation.translate('team_member_removed'))
      return true
    } catch (err) {
      const status = (err as { status?: number }).status
      this.logRefusal('Team member could not be removed', 'team.remove_refused', status, err)
      if (status === 403 && (err as { error?: { error?: string } }).error?.error === 'CANNOT_REMOVE_SELF') {
        this.userMsg.onSetErrorMsg(this.translation.translate('team_cannot_remove_self'))
      } else if (status !== 403) {
        // Any other 403 already got the "no permission" toast from the interceptor.
        this.userMsg.onSetErrorMsg(this.translation.translate('server_error'))
      }
      return false
    }
  }

  /** An expected refusal (4xx) is not an app error: warn. Server and network failures stay errors. */
  private logRefusal(msg: string, event: string, status: number | undefined, err: unknown): void {
    if (status !== undefined && status >= 400 && status < 500) {
      this.logging.warn({ event, message: msg, context: { status: String(status) } })
    } else {
      this.logging.error(msg, { status: String(status), err: String(err) })
    }
  }
}
