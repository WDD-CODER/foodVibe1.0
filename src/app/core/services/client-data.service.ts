import { Injectable, Injector, Signal, inject } from '@angular/core'
import { HttpClient, HttpErrorResponse } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { environment } from '../../../environments/environment'
import { MenuEventDataService } from './menu-event-data.service'
import { RequestDataService } from './request-data.service'
import { BookingDataService } from './booking-data.service'
import { BaseEntityDataService } from './base-entity-data.service'
import { UserMsgService } from './user-msg.service'
import { TranslationService } from './translation.service'
import { Client } from '@models/client.model'

const ENTITY = 'clients'
const CLIENTS_URL = `${environment.apiUrl}/api/v1/clients`

/**
 * Plan 514: the business's clients. Read through the storage adapter; the server decides what
 * staff see (name + phone only) and that only the owner may write.
 */
@Injectable({ providedIn: 'root' })
export class ClientDataService extends BaseEntityDataService<Client> {
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  // The HTTP client and the three services a merge refreshes are looked up when used (keeps construction light).
  private readonly injector = inject(Injector)

  /** Domain alias for the base-class signal. */
  readonly allClients_: Signal<Client[]> = this.all_

  constructor() {
    // Deferred: load on ensureLoaded() via the menu-library / menu-intelligence routes.
    super(ENTITY, false, {
      errorEvent: 'crud.clients.hydrate_error',
      errorMessage: 'Failed to load clients',
      clearOnReload: true
    })
  }

  /** From the loaded list; no request is made. */
  getClientById(_id: string): Client | undefined {
    return this.currentItems().find((c) => c._id === _id)
  }

  async addClient(body: Omit<Client, '_id' | 'phoneNormalized'>): Promise<Client> {
    try {
      const saved = await this.storage.post<Client>(ENTITY, body as Client)
      // Plan 545: the server answers with the existing client when the phone is already one — keep one entry and say so.
      const existed = this.currentItems().some((c) => c._id === saved._id)
      this.updateItems((clients) =>
        existed ? clients.map((c) => (c._id === saved._id ? saved : c)) : [...clients, saved]
      )
      if (existed) this.userMsg.onSetSuccessMsg(this.translation.translate('client_existing_selected'))
      return saved
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.client.create_error', message: 'Failed to add client', context: { err } })
      throw err
    }
  }

  async updateClient(client: Client): Promise<Client> {
    try {
      const updated = await this.storage.put<Client>(ENTITY, client)
      this.updateItems((clients) => clients.map((c) => (c._id === updated._id ? updated : c)))
      return updated
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.client.update_error', message: 'Failed to update client', context: { err } })
      throw err
    }
  }

  /**
   * Plan 551: merges the duplicate `id` into `intoId` in one server call (INV-3), then drops it from the list, takes
   * the merged client and reloads what carried the old id. Throws on a refusal; the caller shows the message.
   */
  async mergeClient(id: string, intoId: string): Promise<Client> {
    try {
      const http = this.injector.get(HttpClient)
      const res = await firstValueFrom(
        http.post<{ ok: true; client: Client }>(`${CLIENTS_URL}/${id}/merge`, { intoId })
      )
      this.updateItems((clients) =>
        clients.filter((c) => c._id !== id).map((c) => (c._id === res.client._id ? res.client : c))
      )
      await Promise.all([
        this.injector.get(MenuEventDataService).reloadFromStorage(),
        this.injector.get(RequestDataService).reloadFromStorage(),
        this.injector.get(BookingDataService).reloadFromStorage()
      ])
      return res.client
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.client.merge_error', message: 'Failed to merge clients', context: { err } })
      throw err
    }
  }

  /** Plan 551: sets (`on`, with a reason) or clears (owner only) the do-not-contact flag; keeps the answer in the list. */
  async setDoNotContact(id: string, on: boolean, reason?: string): Promise<Client> {
    try {
      const http = this.injector.get(HttpClient)
      const updated = await firstValueFrom(
        http.put<Client>(`${CLIENTS_URL}/${id}/do-not-contact`, on ? { on, reason } : { on })
      )
      this.updateItems((clients) => clients.map((c) => (c._id === id ? { ...c, ...updated } : c)))
      return updated
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({
        event: 'crud.client.do_not_contact_error',
        message: 'Failed to set do-not-contact',
        context: { err }
      })
      throw err
    }
  }
}
