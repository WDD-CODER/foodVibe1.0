import { inject, Injectable } from '@angular/core'
import { HttpClient, HttpErrorResponse } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { API } from '@services/http-storage.adapter'
import { LoggingService } from '@services/logging.service'
import { AssistantRunDataService } from '@services/assistant-run-data.service'
import type { AssistantEngine } from '@models/assistant-run.model'
import { environment } from '../../../../environments/environment'

export type EngineSaveResult = 'saved' | 'out_of_range' | 'failed'

/** Plan 760: the platform admin's save of one engine number. Logs carry the field and a status only. */
@Injectable({ providedIn: 'root' })
export class AssistantEngineService {
  private readonly http = inject(HttpClient)
  private readonly logging = inject(LoggingService)
  private readonly data = inject(AssistantRunDataService)

  /** Saves one number, then reads the setup again, so every row shows what is in force. Never throws. */
  async save(field: keyof AssistantEngine, value: number): Promise<EngineSaveResult> {
    const url = `${environment.apiUrl}${API.assistantRuns}/engine-settings`
    try {
      await firstValueFrom(this.http.put(url, { field, value }))
    } catch (err) {
      const { status, error } = err as HttpErrorResponse
      const refused = status >= 400 && status < 500
      this.logging[refused ? 'warn' : 'error']({
        event: 'assistant_engine.save.failed',
        message: 'Engine setting save failed',
        context: { field, status: String(status ?? '') }
      })
      return error?.error === 'OUT_OF_RANGE' ? 'out_of_range' : 'failed'
    }
    await this.data.loadSetup(true)
    return 'saved'
  }
}
