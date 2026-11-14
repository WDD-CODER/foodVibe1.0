import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import type {
  BaselineInput,
  Business,
  BusinessNameInput,
  BusinessSettings,
  EventStage,
  LogisticsHiddenInput,
  StaffVisibleStagesInput,
  ShareAiExamplesInput
} from '@schemas/entities'
import type { BusinessType } from '@schemas/entities/front-desk-profile.schema'
import type { FrontDeskIntake } from '@schemas/front-desk-intake.schema'
import { environment } from '../../../environments/environment'
import { API } from './http-storage.adapter'
import { LoggingService } from './logging.service'
import { UserService } from './user.service'

/** Plan 556: what the front desk still needs; `businessType` is null (and `items` empty) while the business has no profile. */
export interface FrontDeskSetup {
  businessType: BusinessType | null
  items: { key: string; done: boolean }[]
  done: number
  total: number
}

/** What the owner has set up so far (plan 431); the server caps each count at 5. */
export interface SetupStatus {
  pricedProducts: number
  suppliers: number
  recipes: number
  events: number
  staff: number
  frontDesk?: FrontDeskSetup
}

/** Plan 556: the answer of the one-call onboarding save. */
export interface FrontDeskIntakeResult {
  profileId: string
  knowledge: { created: number; updated: number; skipped: number }
  baseline: 'saved' | 'skipped'
}

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

  /** Owner only: renames the business and puts the stored (trimmed) name into `business_`. Throws on any refusal. */
  updateName(name: string): Promise<void> {
    return this._put('name', { name })
  }

  /** Owner only: saves the three business numbers and puts the stored result into `business_`. Throws on any refusal. */
  updateSettings(settings: BusinessSettings): Promise<void> {
    return this._put('settings', settings)
  }

  /** Owner only: stores the opening baseline (only the filled fields; `{}` means skipped) and puts the stored result into `business_`. Throws on any refusal. */
  updateBaseline(input: BaselineInput): Promise<void> {
    return this._put('baseline', input)
  }

  /** Owner only (plan 477): the event stages staff may see; puts the stored list into `business_`. Throws on any refusal. */
  updateStaffVisibleStages(stages: EventStage[]): Promise<void> {
    return this._put('staff-visible-stages', { stages })
  }

  /** Owner only (plan 600): lets the platform admin copy this business's saved AI recipe examples into the shared pool; off deletes the copies. Throws on any refusal. */
  updateShareAiExamples(share: boolean): Promise<void> {
    return this._put('share-ai-examples', { share })
  }

  /** Owner only (plan 579): the whole list of shared logistics questions this business hides; puts the stored list into `business_`. Throws on any refusal. */
  updateHiddenLogisticsKeys(keys: string[]): Promise<void> {
    return this._put('logistics-hidden', { keys })
  }

  /** Owner only: which setup steps are done. Not cached: the setup card asks every time it is created. */
  loadSetupStatus(): Promise<SetupStatus> {
    return firstValueFrom(this.http.get<SetupStatus>(`${environment.apiUrl}${API.business('setup-status')}`))
  }

  /** Owner only (plan 556): the whole onboarding form in one save. Throws on any refusal. */
  saveFrontDeskIntake(body: FrontDeskIntake): Promise<FrontDeskIntakeResult> {
    return firstValueFrom(
      this.http.post<FrontDeskIntakeResult>(`${environment.apiUrl}${API.business('front-desk-intake')}`, body)
    )
  }

  /** PUTs one owner-only part of the business and puts the stored reply into `business_`. */
  private async _put(
    path: 'name' | 'settings' | 'baseline' | 'staff-visible-stages' | 'logistics-hidden' | 'share-ai-examples',
    body:
      | BusinessNameInput
      | BusinessSettings
      | BaselineInput
      | StaffVisibleStagesInput
      | LogisticsHiddenInput
      | ShareAiExamplesInput
  ): Promise<void> {
    const res = await firstValueFrom(
      this.http.put<Partial<Business>>(`${environment.apiUrl}${API.business(path)}`, body)
    )
    this._business_.update((business) => (business ? { ...business, ...res } : business))
  }

  private _load(userId: string): void {
    this.http.get<Business>(`${environment.apiUrl}${API.business()}`).subscribe({
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
