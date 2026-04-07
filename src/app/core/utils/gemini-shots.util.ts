/**
 * @deprecated Plan 259 — few-shot storage moved to MongoDB (GEMINI_SHOTS collection).
 * Use GeminiShotsService for all shot operations.
 * This file is a no-op stub kept for one release to prevent import errors.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getGeminiShots(): never[] {
  return []
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function addGeminiShot(_prompt: string, _draft: object): void {
  // no-op — shots are now saved via GeminiShotsService → POST /api/v1/ai/shots
}
