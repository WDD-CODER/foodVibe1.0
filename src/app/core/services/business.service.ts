import { effect, inject, Injectable, signal, untracked } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import type { Business } from '@schemas/entities'
import { environment } from '../../../environments/environment'
import { LoggingService } from './logging.service'
import { UserService } from './user.service'

/** The signed-in user's business (name, settings). Loaded once per sign-in, cleared on sign-out. */
@Injectable({ providedIn: 'root' })
export class BusinessService {
  private readonly http = inject(HttpClient)
  private readonly userService = inject(UserService)
  private readonly logging = inject(LoggingService)

  private readonly _business_ = signal<Business | null>(null)
  public readonly business_ = this._business_.asReadonly()

  constructor() {
    effect(() => {
      const userId = this.userService.user_()?._id
      untracked(() => (userId ? this._load() : this._business_.set(null)))
    })
  }

  private _load(): void {
    this.http.get<Business>(`${environment.apiUrl}/api/v1/business`).subscribe({
      next: (business) => this._business_.set(business),
      error: (err: unknown) => {
        this._business_.set(null)
        this.logging.warn('Business could not be loaded', { err: String(err) })
      }
    })
  }
}
