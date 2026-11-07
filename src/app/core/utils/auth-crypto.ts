/**
 * Local auth: PBKDF2 password hashing with a random salt.
 * Stored format: "<saltHex>:<hashHex>"
 * Verification runs on the server.
 */
const ITERATIONS = 100_000
const HASH_ALGO = 'SHA-256'
const KEY_BITS = 256

export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(plain), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: HASH_ALGO },
    key,
    KEY_BITS
  )
  const toHex = (buf: ArrayBuffer) =>
    Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `${saltHex}:${toHex(bits)}`
}
