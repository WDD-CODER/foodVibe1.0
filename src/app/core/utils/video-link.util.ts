/** Plan 373: translation keys for where a video link points. */
export type VideoSourceKey =
  'video_source_youtube' | 'video_source_drive' | 'video_source_whatsapp' | 'video_source_link'

/** Plan 373: the translation key naming where a video link points, from its hostname; anything else is a plain link. */
export function videoSourceKey(url: string): VideoSourceKey {
  let host = ''
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return 'video_source_link'
  }
  if (host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com')) return 'video_source_youtube'
  if (host === 'drive.google.com' || host === 'docs.google.com') return 'video_source_drive'
  if (host === 'wa.me' || host === 'whatsapp.com' || host.endsWith('.whatsapp.com') || host.endsWith('.whatsapp.net')) {
    return 'video_source_whatsapp'
  }
  return 'video_source_link'
}
