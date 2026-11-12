import { HttpClient } from '@angular/common/http'
import { inject, Injectable } from '@angular/core'
import { map, Observable, tap } from 'rxjs'
import { environment } from '../../../environments/environment'
import { User } from '../models/user.model'
import { API } from './http-storage.adapter'
import { UserService } from './user.service'

export interface TermsSection {
  heading: string
  paragraphs: string[]
}

/** The one terms file, `public/assets/legal/terms.he.json` (plan 584). */
export interface Terms {
  version: string
  title: string
  updated: string
  sectionsHash: string
  sections: TermsSection[]
}

export const TERMS_URL = '/assets/legal/terms.he.json'

/** Plan 584: loads the one terms file and posts the signed-in user's acceptance of its version. */
@Injectable({ providedIn: 'root' })
export class TermsService {
  private readonly http_ = inject(HttpClient)
  private readonly userService_ = inject(UserService)

  /** Always fetched fresh, so a popup opened after a terms change shows the new text. */
  load(): Observable<Terms> {
    return this.http_.get<Terms>(TERMS_URL, { headers: { 'Cache-Control': 'no-cache' } })
  }

  /** Records the acceptance on the server and replaces the stored user with the answer. */
  accept(version: string): Observable<User> {
    return this.http_
      .post<{ user: User }>(
        `${environment.authApiUrl}${API.auth('accept-terms')}`,
        { termsVersion: version },
        { withCredentials: true }
      )
      .pipe(
        map(({ user }) => user),
        tap((user) => this.userService_._saveUserLocal(user))
      )
  }
}
