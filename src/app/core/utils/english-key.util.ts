/**
 * English translation-key helpers — let the user type a key like `olive_oil` with any keyboard
 * layout active and with spaces instead of `_`.
 * Leftover non-`[a-z0-9_]` chars are kept on purpose so key validation can show its error.
 */

/** `KeyA`–`KeyZ` → `a`–`z`, `Digit0`–`Digit9` → `0`–`9`; anything else → null. */
export function codeToEnglishChar(code: string): string | null {
  const letter = /^Key([A-Z])$/.exec(code)
  if (letter) return letter[1].toLowerCase()
  const digit = /^Digit([0-9])$/.exec(code)
  if (digit) return digit[1]
  return null
}

/** Live normalization while typing: whitespace → `_`, lowercase. Keeps length 1:1 for ASCII. */
export function liveEnglishKey(value: string): string {
  return value.replace(/\s/g, '_').toLowerCase()
}

/** Final normalization on blur / save: live rules, `-` → `_`, collapse `__+`, trim `_` at both ends. */
export function finalizeEnglishKey(value: string): string {
  return liveEnglishKey(value.trim())
    .replace(/-/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
}
