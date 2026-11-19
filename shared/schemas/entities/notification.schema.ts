import { z } from 'zod'

/** Plan 646: an in-app alert to one user about one business's product. Server-only collection; one document per recipient. */
export const notificationSchema = z.strictObject({
  _id: z.string().min(1),
  businessId: z.string().min(1),
  userId: z.string().min(1),
  kind: z.literal('price_change'),
  productId: z.string().min(1),
  productName: z.string().max(200),
  supplierName: z.string().max(200),
  from: z.number(),
  to: z.number(),
  changePct: z.number(),
  createdAt: z.number(),
  readAt: z.number().optional()
})
export type Notification = z.infer<typeof notificationSchema>
