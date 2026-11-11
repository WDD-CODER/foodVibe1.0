import { Injectable, Signal, inject } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { BaseEntityDataService } from './base-entity-data.service'
import { UserMsgService } from './user-msg.service'
import { TranslationService } from './translation.service'
import { Client } from '@models/client.model'

const ENTITY = 'clients'

/**
 * Plan 514: the business's clients. Read through the storage adapter; the server decides what
 * staff see (name + phone only) and that only the owner may write.
 */
@Injectable({ providedIn: 'root' })
export class ClientDataService extends BaseEntityDataService<Client> {
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)

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
}
