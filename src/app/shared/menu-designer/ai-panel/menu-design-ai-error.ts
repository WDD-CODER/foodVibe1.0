import { HttpErrorResponse } from '@angular/common/http'
import { MenuDesignImageTooLargeError } from '@services/menu-design-ai.service'
import { aiCapErrorKey } from '@utils/ai-error.util'

const KEY_OF_CODE: Readonly<Record<string, string>> = {
  IMAGE_TOO_LARGE: 'menu_design_ai_image_too_large',
  URL_NOT_ALLOWED: 'menu_design_ai_url_not_allowed',
  URL_CAPTURE_FAILED: 'menu_design_ai_url_failed'
}

/** The dictionary key that says why an AI call of the designer failed; `otherKey` for any reason without its own. */
export function menuDesignAiErrorKey(err: unknown, otherKey: string): string {
  const cap = aiCapErrorKey(err)
  if (cap) return cap
  if (err instanceof MenuDesignImageTooLargeError) return 'menu_design_ai_image_too_large'
  const code: unknown = err instanceof HttpErrorResponse ? err.error?.error : null
  return typeof code === 'string' && Object.hasOwn(KEY_OF_CODE, code) ? KEY_OF_CODE[code] : otherKey
}
