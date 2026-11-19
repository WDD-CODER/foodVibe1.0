import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import { AdminUser } from '../models/admin-user.model'
import { environment } from '../../../environments/environment'
import { API } from './http-storage.adapter'

@Injectable({ providedIn: 'root' })
export class UserAdminService {
  private http = inject(HttpClient)
  private base = environment.apiUrl

  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.base}${API.admin('users')}`)
  }

  /** Plan 639: `eraseLearned` also erases what the platform learned from the business (whole-business deletes only). */
  deleteUser(
    userId: string,
    eraseLearned = false
  ): Observable<{ ok: boolean; deletedBusiness?: boolean; usersDeleted?: number }> {
    const suffix = eraseLearned ? '?eraseLearned=true' : ''
    return this.http.delete<{ ok: boolean; deletedBusiness?: boolean; usersDeleted?: number }>(
      `${this.base}${API.admin(`users/${userId}`)}${suffix}`
    )
  }
}
