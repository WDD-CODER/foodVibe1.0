import { Injectable, inject } from '@angular/core'
import { HttpClient, HttpEventType } from '@angular/common/http'
import { Observable, filter, map, throwError } from 'rxjs'
import { environment } from '../../../environments/environment'

/** Plan 698: the Cloudinary free tier's video upload cap. */
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024

export type VideoUploadEvent = { kind: 'progress'; percent: number } | { kind: 'done'; url: string }

/** Plan 698: the dictionary key naming why a file cannot be uploaded as a tour video, or null when it can. */
export function checkVideoFile(file: Pick<File, 'size' | 'type'>): 'video_not_video' | 'video_too_big' | null {
  if (!file.type.startsWith('video/')) return 'video_not_video'
  if (file.size > MAX_VIDEO_BYTES) return 'video_too_big'
  return null
}

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
      .pipe(map((res) => res.secure_url))
  }

  /** Plan 698: uploads a video with progress; a refused file errors with its key before any request. */
  uploadVideo(file: File): Observable<VideoUploadEvent> {
    const refusal = checkVideoFile(file)
    if (refusal) return throwError(() => new Error(refusal))
    const form = new FormData()
    form.append('file', file)
    form.append('upload_preset', environment.cloudinaryUploadPreset)
    return this.http
      .post<{ secure_url: string }>(
        `https://api.cloudinary.com/v1_1/${environment.cloudinaryCloudName}/video/upload`,
        form,
        { reportProgress: true, observe: 'events' }
      )
      .pipe(
        map((ev): VideoUploadEvent | null => {
          if (ev.type === HttpEventType.UploadProgress) {
            return { kind: 'progress', percent: ev.total ? Math.round((ev.loaded / ev.total) * 100) : 0 }
          }
          if (ev.type === HttpEventType.Response && ev.body) return { kind: 'done', url: ev.body.secure_url }
          return null
        }),
        filter((ev): ev is VideoUploadEvent => ev !== null)
      )
  }
}
