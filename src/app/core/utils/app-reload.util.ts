import { InjectionToken } from '@angular/core'

/**
 * Reloads the whole application (a document reload) at a path. One core helper so no screen calls
 * `window.location` itself and specs can replace it. After a business switch a reload is the only way
 * to be sure no signal of the previous business survives.
 */
export type AppReload = (path: string) => void

export const APP_RELOAD = new InjectionToken<AppReload>('APP_RELOAD', {
  providedIn: 'root',
  factory: () => (path: string) => window.location.assign(path)
})
