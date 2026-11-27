import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { environment } from '../../../../environments/environment'
import { API } from '@services/http-storage.adapter'
import { AssistantRunDataService } from '@services/assistant-run-data.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { refusalShownToUser } from 'src/app/core/utils/server-refusal.util'
import type { AssistantEngine, AssistantSetup } from '@models/assistant-run.model'

/** How a number is counted; `ms` is shown and typed in seconds. */
export type EngineUnit = 'ms' | 'daily' | 'replies' | 'messages' | 'chars'
export type EngineLimit = { min: number; max: number; unit: EngineUnit }

/** The setup read as the platform admin gets it (plan 760): the ranges, and that the numbers may be changed. */
export type EditableSetup = AssistantSetup & {
  editable?: boolean
  limits?: Record<keyof AssistantEngine, EngineLimit>
}

/** Plan 760: the platform admin's save of one engine number (`PUT /api/v1/assistant-runs/engine-settings`). */
@Injectable({ providedIn: 'root' })
export class AssistantEngineSettingsService {
  private readonly http = inject(HttpClient)
  private readonly data = inject(AssistantRunDataService)
  private readonly logging = inject(LoggingService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)

  /** True once the server saved it and the setup was read again; a failure shows a toast and changes nothing. */
  async save(field: keyof AssistantEngine, value: number): Promise<boolean> {
    try {
      await firstValueFrom(this.http.put(`${environment.apiUrl}${API.assistantRuns}/engine-settings`, { field, value }))
    } catch (err) {
      const status = (err as { status?: number }).status
      const refused = status !== undefined && status >= 400 && status < 500
      this.logging[refused ? 'warn' : 'error']({
        event: 'assistant_engine.save.failed',
        message: 'Engine setting save failed',
        context: { field, status: String(status ?? '') }
      })
      if (!refusalShownToUser(err)) this.userMsg.onSetErrorMsg(this.translation.translate('asr_set_save_failed'))
      return false
    }
    await this.data.loadSetup(true)
    return true
  }
}
