export type UsernameError = 'name_required' | 'username_too_short' | 'username_too_long' | 'username_invalid_chars'
export type EmailError = 'email_required' | 'email_invalid'
export type PasswordError =
  | 'password_required'
  | 'password_too_short'
  | 'password_needs_letter_and_number'
  | 'password_matches_username'
  | 'password_contains_email'

const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateUsername(name: string): UsernameError | null {
  const trimmed = name.trim()
  if (!trimmed) return 'name_required'
  if (trimmed.length < 3) return 'username_too_short'
  if (trimmed.length > 20) return 'username_too_long'
  if (!USERNAME_REGEX.test(trimmed)) return 'username_invalid_chars'
  return null
}

export function validateEmail(email: string): EmailError | null {
  const trimmed = email.trim()
  if (!trimmed) return 'email_required'
  if (!EMAIL_REGEX.test(trimmed)) return 'email_invalid'
  return null
}

export function validatePassword(password: string, name: string, email: string): PasswordError | null {
  const trimmed = password.trim()
  if (!trimmed) return 'password_required'
  if (trimmed.length < 8) return 'password_too_short'
  if (!/[a-zA-Z]/.test(trimmed) || !/[0-9]/.test(trimmed)) return 'password_needs_letter_and_number'

  const lowerPass = trimmed.toLowerCase()
  const lowerName = name.trim().toLowerCase()
  if (lowerName && lowerPass === lowerName) return 'password_matches_username'

  const emailLocal = email.trim().split('@')[0]?.toLowerCase() ?? ''
  if (emailLocal.length >= 3 && lowerPass.includes(emailLocal)) return 'password_contains_email'

  return null
}
