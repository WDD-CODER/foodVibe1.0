export interface User {
  _id?: string
  name: string
  email: string
  imgUrl?: string
  businessId?: string
  businessRole?: 'owner' | 'staff'
  isPlatformAdmin?: boolean
  /** Plan 584: the terms version this user last accepted; null/missing = never. */
  termsAcceptedVersion?: string | null
}
