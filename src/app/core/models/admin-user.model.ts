export interface AdminUser {
  _id: string
  name: string
  email: string
  businessId?: string
  businessName?: string
  businessRole?: 'owner' | 'staff'
  isPlatformAdmin?: boolean
}
