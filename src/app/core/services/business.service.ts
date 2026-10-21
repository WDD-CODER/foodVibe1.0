import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import type { Business, BusinessSettings } from '@schemas/entities'
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

  /** Only the id: a new user object with the same _id (profile update, token refresh) must not reload. */
  private readonly _userId_ = computed(() => this.userService.user_()?._id ?? null)

  constructor() {
    effect(() => {
      const userId = this._userId_()
      untracked(() => (userId ? this._load(userId) : this._business_.set(null)))
    })
  }

  /** Owner only: saves the three business numbers and puts the stored result into `business_`. Throws on any refusal. */
  async updateSettings(settings: BusinessSettings): Promise<void> {
    const res = await firstValueFrom(
      this.http.put<{ settings: BusinessSettings }>(`${environment.apiUrl}/api/v1/business/settings`, settings)
    )
    this._business_.update((business) => (business ? { ...business, settings: res.settings } : business))
  }

  private _load(userId: string): void {
    this.http.get<Business>(`${environment.apiUrl}/api/v1/business`).subscribe({
      next: (business) => {
        if (this._userId_() === userId) this._business_.set(business)
      },
      error: (err: unknown) => {
        if (this._userId_() === userId) this._business_.set(null)
        this.logging.warn('Business could not be loaded', { err: String(err) })
      }
    })
  }
}
