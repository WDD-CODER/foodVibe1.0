import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import { AdminUser } from '../models/admin-user.model'
import { environment } from '../../../environments/environment'

@Injectable({ providedIn: 'root' })
export class UserAdminService {
  private http = inject(HttpClient)
  private base = environment.apiUrl

  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.base}/api/v1/admin/users`)
  }

  deleteUser(userId: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/api/v1/admin/users/${userId}`)
  }
}
