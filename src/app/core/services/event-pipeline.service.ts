import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom, Observable } from 'rxjs'
import { environment } from '../../../environments/environment'
import { API } from './http-storage.adapter'
import type { EventClosing, EventStage, MenuEvent, NotClosedReason, PlanSnapshot } from '@models/menu-event.model'
import { stageErrorKey } from '../utils/event-stage-ui.util'
import { LoggingService } from './logging.service'
import { MenuEventDataService } from './menu-event-data.service'
import { TranslationService } from './translation.service'
import { UserMsgService } from './user-msg.service'

const EVENTS_URL = `${environment.apiUrl}${API.events}`

export interface StageChange {
  stage: EventStage
  reason?: NotClosedReason
  reasonText?: string
  /** Plan 446: the planning snapshot the server stores or freezes for this move */
  planSnapshot?: PlanSnapshot
}

/** The updated event (already in the store), or the server's error code (null when there was none). */
export type PipelineResult = { ok: true; event: MenuEvent } | { ok: false; code: string | null }

/**
 * Plan 443: the client of plan 442's `API.events` routes: stage moves and notes. Every call writes the
 * event the server returns into `MenuEventDataService`, so the library and the event screen update without a reload.
 * A refused call shows the translated reason itself; a 403 is left to the interceptor's "no permission" toast.
 */
@Injectable({ providedIn: 'root' })
export class EventPipelineService {
  private readonly http = inject(HttpClient)
  private readonly eventData = inject(MenuEventDataService)
  private readonly logging = inject(LoggingService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)

  changeStage(eventId: string, change: StageChange): Promise<PipelineResult> {
    return this.run('stage.change', 'stage_change_failed', () =>
      this.http.put<MenuEvent>(`${EVENTS_URL}/${eventId}/stage`, change)
    )
  }

  /** Plan 446: saves the closing (amounts: owner; arrived, invoice, photos: staff too; the server decides). */
  saveClosing(eventId: string, closing: EventClosing): Promise<PipelineResult> {
    return this.run('closing.save', 'server_error', () =>
      this.http.put<MenuEvent>(`${EVENTS_URL}/${eventId}/closing`, { closing })
    )
  }

  /**
   * Plan 446: owner only; locks the closing and moves the event to "הסתיים".
   * Plan 493: from any live stage; `planSnapshot` is sent when the event has no frozen plan yet (the server freezes it).
   */
  finish(eventId: string, planSnapshot?: PlanSnapshot): Promise<PipelineResult> {
    return this.run('finish', 'server_error', () =>
      this.http.post<MenuEvent>(`${EVENTS_URL}/${eventId}/finish`, planSnapshot ? { planSnapshot } : {})
    )
  }

  /** Plan 446: owner only; a finished event goes back to "פוסט-פרודקשן". */
  reopen(eventId: string): Promise<PipelineResult> {
    return this.run('reopen', 'server_error', () => this.http.post<MenuEvent>(`${EVENTS_URL}/${eventId}/reopen`, {}))
  }

  /** Plan 446: owner only; replaces the frozen plan with one built from today's prices. */
  refreshPlan(eventId: string, planSnapshot: PlanSnapshot): Promise<PipelineResult> {
    return this.run('plan.refresh', 'server_error', () =>
      this.http.post<MenuEvent>(`${EVENTS_URL}/${eventId}/refresh-plan`, { planSnapshot })
    )
  }

  addNote(eventId: string, text: string): Promise<PipelineResult> {
    return this.run('note.add', 'server_error', () =>
      this.http.post<MenuEvent>(`${EVENTS_URL}/${eventId}/notes`, { text })
    )
  }

  editNote(eventId: string, noteId: string, text: string): Promise<PipelineResult> {
    return this.run('note.edit', 'server_error', () =>
      this.http.put<MenuEvent>(`${EVENTS_URL}/${eventId}/notes/${noteId}`, { text })
    )
  }

  deleteNote(eventId: string, noteId: string): Promise<PipelineResult> {
    return this.run('note.delete', 'server_error', () =>
      this.http.delete<MenuEvent>(`${EVENTS_URL}/${eventId}/notes/${noteId}`)
    )
  }

  private async run(name: string, fallbackKey: string, request: () => Observable<MenuEvent>): Promise<PipelineResult> {
    try {
      const event = await firstValueFrom(request())
      this.eventData.applyServerEvent(event)
      return { ok: true, event }
    } catch (err) {
      const status = (err as { status?: number }).status
      const code = (err as { error?: { error?: string } }).error?.error ?? null
      if (status !== undefined && status >= 400 && status < 500) {
        this.logging.warn({
          event: `events.${name}_refused`,
          message: 'Event pipeline call refused',
          context: { status: String(status), code: code ?? '' }
        })
      } else {
        this.logging.error({
          event: `events.${name}_failed`,
          message: 'Event pipeline call failed',
          context: { status: String(status), err: String(err) }
        })
      }
      // A 403 already got the "no permission" toast from the interceptor.
      if (status !== 403) {
        const mapped = stageErrorKey(code)
        this.userMsg.onSetErrorMsg(this.translation.translate(mapped === 'stage_change_failed' ? fallbackKey : mapped))
      }
      return { ok: false, code }
    }
  }
}
