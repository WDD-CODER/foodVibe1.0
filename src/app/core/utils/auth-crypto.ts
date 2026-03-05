/**
 * Local auth: hash password with Web Crypto SHA-256.
 * Production auth should use backend bcrypt over HTTPS; this is for local-only path.
 */
export async function hashPassword(plain: string): Promise<string> {
  const buf = new TextEncoder().encode(plain)
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(plain)
  return computed === hash
}
