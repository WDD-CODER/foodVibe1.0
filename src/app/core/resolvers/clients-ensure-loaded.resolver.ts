import { inject } from '@angular/core'
import { ResolveFn } from '@angular/router'
import { ClientDataService } from '../services/client-data.service'

/** Plan 514: ensures clients are hydrated before menu-library / menu-intelligence routes render. */
export const clientsEnsureLoadedResolver: ResolveFn<boolean> = () => {
  const clientData = inject(ClientDataService)
  return clientData.ensureLoaded().then(() => true)
}
