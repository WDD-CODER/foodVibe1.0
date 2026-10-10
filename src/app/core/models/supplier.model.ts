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
  /** Shared __master__ supplier this copy was cloned from (admin "delete for everyone"). */
  _masterId?: string
  updatedAt?: number
}
