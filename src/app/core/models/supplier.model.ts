export interface Supplier {
  _id: string
  nameHebrew: string
  contactPerson?: string
  phone?: string
  phone2?: string
  deliveryDays: number[]
  minOrderMov: number
  leadTimeDays: number
  supplierLogoUrl?: string
  updatedAt?: number
}
