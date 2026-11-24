import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { CloudinaryService, VideoUploadEvent, checkVideoFile } from './cloudinary.service'
import { environment } from '../../../environments/environment'

describe('CloudinaryService.uploadVideo (plan 698)', () => {
  let service: CloudinaryService
  let http: HttpTestingController
  const url = `https://api.cloudinary.com/v1_1/${environment.cloudinaryCloudName}/video/upload`
  const video = new File(['x'], 'a.mp4', { type: 'video/mp4' })

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    service = TestBed.inject(CloudinaryService)
    http = TestBed.inject(HttpTestingController)
  })
  afterEach(() => http.verify())

  it('posts to the video endpoint with the preset and emits progress then done', () => {
    const events: VideoUploadEvent[] = []
    service.uploadVideo(video).subscribe((e) => events.push(e))
    const req = http.expectOne(url)
    expect(req.request.method).toBe('POST')
    expect((req.request.body as FormData).get('upload_preset')).toBe(environment.cloudinaryUploadPreset)
    expect(req.request.reportProgress).toBeTrue()
    req.event({ type: 1, loaded: 1, total: 3 })
    req.flush({ secure_url: 'https://res.cloudinary.com/x/video/upload/v.mp4' })
    expect(events).toEqual([
      { kind: 'progress', percent: 33 },
      { kind: 'done', url: 'https://res.cloudinary.com/x/video/upload/v.mp4' }
    ])
  })

  it('refuses a non-video and an oversized file without any request', () => {
    const errors: string[] = []
    service
      .uploadVideo(new File(['x'], 'a.png', { type: 'image/png' }))
      .subscribe({ error: (e: Error) => errors.push(e.message) })
    const big = new File(['x'], 'b.mp4', { type: 'video/mp4' })
    Object.defineProperty(big, 'size', { value: 100 * 1024 * 1024 + 1 })
    service.uploadVideo(big).subscribe({ error: (e: Error) => errors.push(e.message) })
    expect(errors).toEqual(['video_not_video', 'video_too_big'])
    http.expectNone(url)
  })

  it('checkVideoFile accepts a small video', () => {
    expect(checkVideoFile(video)).toBeNull()
  })
})
