import { inject } from '@angular/core'
import { ResolveFn } from '@angular/router'
import { MenuEventDataService } from '../services/menu-event-data.service'

/** Ensures MENU_EVENT_LIST is hydrated before menu-library / menu-intelligence routes render. */
export const menuEventsEnsureLoadedResolver: ResolveFn<boolean> = () => {
  const menuEventData = inject(MenuEventDataService)
  return menuEventData.ensureLoaded().then(() => true)
}
