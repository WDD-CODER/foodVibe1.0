const STORAGE_KEY = 'FV_GEMINI_SHOTS'
const MAX_SHOTS = 3

interface GeminiShot {
  prompt: string
  draft: object
}

export function getGeminiShots(): GeminiShot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as GeminiShot[] : []
  } catch {
    return []
  }
}

export function addGeminiShot(prompt: string, draft: object): void {
  const shots = getGeminiShots()
  shots.unshift({ prompt, draft })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shots.slice(0, MAX_SHOTS)))
}
