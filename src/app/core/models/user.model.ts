export interface User {
  _id?: string
  name: string
  email: string
  imgUrl?: string
  businessId?: string
  businessRole?: 'owner' | 'staff'
  isPlatformAdmin?: boolean
}
