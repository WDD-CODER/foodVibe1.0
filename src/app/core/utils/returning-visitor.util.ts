const KEY = 'fv_returning'

/** Remembers on this device that someone has signed in here. */
export function markReturningVisitor(): void {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    // storage unavailable: nothing to remember
  }
}

export function clearReturningVisitor(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // storage unavailable: nothing to clear
  }
}

export function isReturningVisitor(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}
