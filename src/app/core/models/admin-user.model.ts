export interface AdminUser {
  _id: string
  name: string
  email: string
  businessId?: string
  businessName?: string
  businessRole?: 'owner' | 'staff'
  isPlatformAdmin?: boolean
  /** Plan 736: the user's lifetime AI requests (the server sends the default 100 when never changed). */
  aiAllowance?: number
  /** Plan 736: counted AI requests so far. */
  aiCallsUsed?: number
}

/** Plan 736: the answer of `PUT /api/v1/admin/users/:userId/ai-allowance`. */
export interface AiAllowanceSaved {
  ok: boolean
  aiAllowance: number
  aiCallsUsed: number
}
