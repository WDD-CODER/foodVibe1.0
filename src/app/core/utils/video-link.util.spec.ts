import { videoSourceKey } from './video-link.util'

describe('videoSourceKey (plan 373)', () => {
  it('names YouTube links', () => {
    expect(videoSourceKey('https://youtu.be/abc')).toBe('video_source_youtube')
    expect(videoSourceKey('https://www.youtube.com/watch?v=abc')).toBe('video_source_youtube')
    expect(videoSourceKey('https://m.youtube.com/watch?v=abc')).toBe('video_source_youtube')
  })

  it('names Google Drive links', () => {
    expect(videoSourceKey('https://drive.google.com/file/d/x/view')).toBe('video_source_drive')
    expect(videoSourceKey('https://docs.google.com/x')).toBe('video_source_drive')
  })

  it('names WhatsApp links', () => {
    expect(videoSourceKey('https://wa.me/972500000000')).toBe('video_source_whatsapp')
    expect(videoSourceKey('https://mmg.whatsapp.net/v/x.mp4')).toBe('video_source_whatsapp')
  })

  it('treats look-alike hosts, other hosts and broken URLs as a plain link', () => {
    expect(videoSourceKey('https://notyoutube.com/x')).toBe('video_source_link')
    expect(videoSourceKey('https://example.com/v.mp4')).toBe('video_source_link')
    expect(videoSourceKey('not a url')).toBe('video_source_link')
  })
})
