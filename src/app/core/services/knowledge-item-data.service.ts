import { Injectable, Injector, Signal, inject } from '@angular/core'
import { HttpClient, HttpErrorResponse } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { environment } from '../../../environments/environment'
import { BaseEntityDataService } from './base-entity-data.service'
import { KnowledgeItem } from '@models/knowledge-item.model'

const ENTITY = 'knowledgeItems'
const IMPORT_URL = `${environment.apiUrl}/api/v1/ai/knowledge-import`
const APPROVE_URL = `${environment.apiUrl}/api/v1/knowledge/approve`

export type KnowledgeImportSource = { text: string } | { url: string }

/** Plan 554: the business's knowledge items. The server decides that only the owner may write. */
@Injectable({ providedIn: 'root' })
export class KnowledgeItemDataService extends BaseEntityDataService<KnowledgeItem> {
  private readonly injector = inject(Injector)

  /** Domain alias for the base-class signal. */
  readonly allItems_: Signal<KnowledgeItem[]> = this.all_

  constructor() {
    // Deferred: loaded by the /frontdesk/knowledge route resolver.
    super(ENTITY, false, {
      errorEvent: 'crud.knowledge.hydrate_error',
      errorMessage: 'Failed to load knowledge items',
      clearOnReload: true
    })
  }

  async addItem(body: Omit<KnowledgeItem, '_id'>): Promise<KnowledgeItem> {
    return this.write('create', async () => {
      const saved = await this.storage.post<KnowledgeItem>(ENTITY, body as KnowledgeItem)
      this.updateItems((items) => [...items, saved])
      return saved
    })
  }

  async updateItem(item: KnowledgeItem): Promise<KnowledgeItem> {
    return this.write('update', async () => {
      const saved = await this.storage.put<KnowledgeItem>(ENTITY, item)
      this.updateItems((items) => items.map((i) => (i._id === saved._id ? saved : i)))
      return saved
    })
  }

  async removeItem(id: string): Promise<void> {
    await this.write('delete', async () => {
      await this.storage.remove(ENTITY, id)
      this.updateItems((items) => items.filter((i) => i._id !== id))
    })
  }

  /** One AI call; the server stores the drafts. Reloads the list, answers how many drafts and how many were dropped. */
  async importDrafts(source: KnowledgeImportSource): Promise<{ created: number; dropped: number }> {
    const res = await this.write('import', () =>
      firstValueFrom(
        this.injector.get(HttpClient).post<{ items: KnowledgeItem[]; dropped: number }>(IMPORT_URL, source)
      )
    )
    await this.reloadFromStorage()
    return { created: res.items.length, dropped: res.dropped }
  }

  /** Approves the drafts in `ids` in one server call (INV-3), then reloads the list. */
  async approve(ids: string[]): Promise<number> {
    const res = await this.write('approve', () =>
      firstValueFrom(this.injector.get(HttpClient).put<{ approved: number }>(APPROVE_URL, { ids }))
    )
    await this.reloadFromStorage()
    return res.approved
  }

  private async write<R>(action: string, run: () => Promise<R>): Promise<R> {
    try {
      return await run()
    } catch (err) {
      if (!(err instanceof HttpErrorResponse && err.status === 401)) {
        this.logging.error({
          event: `crud.knowledge.${action}_error`,
          message: `Failed to ${action} knowledge item(s)`,
          context: { err }
        })
      }
      throw err
    }
  }
}
