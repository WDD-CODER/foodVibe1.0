export interface User {
  _id?: string
  name: string
  email: string
  imgUrl?: string
  businessId?: string
  businessRole?: 'owner' | 'staff' | 'consultant'
  /** The user's own business; `businessId` is the active one (plan 632). */
  homeBusinessId?: string
  /** Set while the user works in another business than his own. */
  acting?: 'consultant' | 'platform'
  /** The resolved modules of the home business, sent only while acting. */
  homeModules?: string[]
  isPlatformAdmin?: boolean
  /** Plan 584: the terms version this user last accepted; null/missing = never. */
  termsAcceptedVersion?: string | null
}
