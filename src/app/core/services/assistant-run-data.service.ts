import { inject, Injectable, signal } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { environment } from '../../../environments/environment'
import { API } from './http-storage.adapter'
import { LoggingService } from './logging.service'
import type { AssistantRunRow, AssistantRunView, AssistantSetup, RunFilter } from '@models/assistant-run.model'

const runsUrl = () => `${environment.apiUrl}${API.assistantRuns}`

type ListOptions = { filter: RunFilter; test: boolean }
type ListAnswer = { runs: AssistantRunRow[]; more: boolean }

/**
 * Plan 752 (C-RUNS): the client of `/api/v1/assistant-runs`. The list is filtered and paged on the server and read
 * only, so it does not extend `BaseEntityDataService`. Logs carry an event and a status — nothing from a run.
 * Plan 756: it also reads how the assistant is set up, once, and keeps the answer.
 */
@Injectable({ providedIn: 'root' })
export class AssistantRunDataService {
  private readonly http = inject(HttpClient)
  private readonly logging = inject(LoggingService)

  private readonly runsSig = signal<AssistantRunRow[]>([])
  private readonly moreSig = signal(false)
  private readonly listLoadedSig = signal(false)
  private readonly listFailedSig = signal(false)
  private readonly loadingMoreSig = signal(false)
  private readonly runSig = signal<AssistantRunView | null>(null)
  private readonly runLoadingSig = signal(false)
  private readonly runFailedSig = signal<'not_found' | 'failed' | null>(null)
  private readonly setupSig = signal<AssistantSetup | null>(null)
  private readonly setupLoadedSig = signal(false)
  private readonly setupFailedSig = signal(false)

  readonly runs_ = this.runsSig.asReadonly()
  /** The server has older runs than the ones shown. */
  readonly more_ = this.moreSig.asReadonly()
  /** True once a list read has answered (so the first load can show the loader). */
  readonly listLoaded_ = this.listLoadedSig.asReadonly()
  readonly listFailed_ = this.listFailedSig.asReadonly()
  readonly loadingMore_ = this.loadingMoreSig.asReadonly()
  readonly run_ = this.runSig.asReadonly()
  readonly runLoading_ = this.runLoadingSig.asReadonly()
  readonly runFailed_ = this.runFailedSig.asReadonly()
  readonly setup_ = this.setupSig.asReadonly()
  /** True once the setup read has succeeded. */
  readonly setupLoaded_ = this.setupLoadedSig.asReadonly()
  readonly setupFailed_ = this.setupFailedSig.asReadonly()

  /** The setup read on its way, so the page and its panel asking together make one call. */
  private setupCall: Promise<void> | null = null
  private options: ListOptions = { filter: 'all', test: false }
  /** Only the answer of the newest list read, and of the newest run read, is shown. */
  private listTurn = 0
  private runTurn = 0

  async list(options: ListOptions): Promise<void> {
    this.options = options
    const turn = ++this.listTurn
    this.loadingMoreSig.set(false)
    try {
      const res = await this.read()
      if (turn !== this.listTurn) return
      this.runsSig.set(res.runs ?? [])
      this.moreSig.set(res.more === true)
      this.listFailedSig.set(false)
    } catch (err) {
      if (turn !== this.listTurn) return
      this.listFailedSig.set(true)
      this.logFailure('list', err)
    }
    this.listLoadedSig.set(true)
  }

  /** The next older page of the same filter. */
  async loadMore(): Promise<void> {
    const last = this.runsSig().at(-1)
    if (!last || this.loadingMoreSig()) return
    const turn = this.listTurn
    this.loadingMoreSig.set(true)
    try {
      const res = await this.read(last.startedAt)
      if (turn !== this.listTurn) return
      this.runsSig.update((rows) => [...rows, ...(res.runs ?? [])])
      this.moreSig.set(res.more === true)
    } catch (err) {
      if (turn !== this.listTurn) return
      this.logFailure('list', err)
    }
    this.loadingMoreSig.set(false)
  }

  async open(id: string): Promise<void> {
    const turn = ++this.runTurn
    this.runSig.set(null)
    this.runFailedSig.set(null)
    this.runLoadingSig.set(true)
    try {
      const res = await firstValueFrom(
        this.http.get<{ run: AssistantRunView }>(`${runsUrl()}/${encodeURIComponent(id)}`)
      )
      if (turn !== this.runTurn) return
      this.runSig.set(res.run)
    } catch (err) {
      if (turn !== this.runTurn) return
      this.runFailedSig.set((err as { status?: number }).status === 404 ? 'not_found' : 'failed')
      this.logFailure('open', err)
    }
    this.runLoadingSig.set(false)
  }

  closeRun(): void {
    this.runTurn++
    this.runSig.set(null)
    this.runFailedSig.set(null)
    this.runLoadingSig.set(false)
  }

  /** Reads the setup unless it is already here; `force` reads it again. */
  loadSetup(force = false): Promise<void> {
    if (this.setupLoadedSig() && !force) return Promise.resolve()
    this.setupCall ??= this.readSetup().finally(() => (this.setupCall = null))
    return this.setupCall
  }

  private async readSetup(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<AssistantSetup>(`${runsUrl()}/setup`))
      this.setupSig.set(res)
      this.setupFailedSig.set(false)
      this.setupLoadedSig.set(true)
    } catch (err) {
      this.setupFailedSig.set(true)
      this.setupLoadedSig.set(false)
      this.logFailure('setup', err)
    }
  }

  private read(before?: number): Promise<ListAnswer> {
    const params: Record<string, string> = {
      filter: this.options.filter,
      scope: this.options.test ? 'test' : 'real',
      ...(before !== undefined && { before: String(before) })
    }
    return firstValueFrom(this.http.get<ListAnswer>(runsUrl(), { params }))
  }

  private logFailure(name: 'list' | 'open' | 'setup', err: unknown): void {
    const status = (err as { status?: number }).status
    const refused = status !== undefined && status >= 400 && status < 500
    this.logging[refused ? 'warn' : 'error']({
      event: `assistant_runs.${name}.failed`,
      message: 'Assistant runs call failed',
      context: { status: String(status ?? '') }
    })
  }
}
