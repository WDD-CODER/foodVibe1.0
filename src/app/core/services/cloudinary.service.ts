import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable, map } from 'rxjs'
import { environment } from '../../../environments/environment'

@Injectable({ providedIn: 'root' })
export class CloudinaryService {
  private readonly http = inject(HttpClient)

  upload(file: File): Observable<string> {
    const form = new FormData()
    form.append('file', file)
    form.append('upload_preset', environment.cloudinaryUploadPreset)
    return this.http
      .post<{ secure_url: string }>(
        `https://api.cloudinary.com/v1_1/${environment.cloudinaryCloudName}/image/upload`,
        form
      )
      .pipe(map(res => res.secure_url))
  }
}
