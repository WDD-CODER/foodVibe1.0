import { z } from 'zod'

/** Plan 621 (C-VOICE) — request and reply of one voice-note transcription. The recording is kept by the private file store. */
export const VOICE_MIME_TYPES = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/wav'] as const
export const VOICE_AUDIO_MAX_BASE64 = 1_800_000
export const VOICE_MAX_SECONDS = 180
export const VOICE_TRANSCRIPT_MAX = 20_000
export const VOICE_PURPOSES = ['logistics', 'stock'] as const

/** durationSec may exceed 180 by 5 seconds: the recorder's stop delay. */
export const voiceTranscribeRequestSchema = z.strictObject({
  audioBase64: z.string().min(1).max(VOICE_AUDIO_MAX_BASE64),
  mimeType: z.enum(VOICE_MIME_TYPES),
  purpose: z.enum(VOICE_PURPOSES),
  durationSec: z.number().min(0).max(VOICE_MAX_SECONDS + 5).optional(),
  model: z.string().max(80).optional()
})

export const voiceTranscribeResponseSchema = z.strictObject({
  transcript: z.string().max(VOICE_TRANSCRIPT_MAX),
  fileId: z.string().nullable()
})

export type VoiceTranscribeRequest = z.infer<typeof voiceTranscribeRequestSchema>
export type VoiceTranscribeResponse = z.infer<typeof voiceTranscribeResponseSchema>
