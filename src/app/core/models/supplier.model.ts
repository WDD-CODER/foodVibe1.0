export interface Supplier {
  _id: string;
  name_hebrew: string; // [cite: 8]
  contact_person_?: string;
  
  // Logistics & Constraints
  delivery_days_: number[];    // 0 = Sunday, 1 = Monday, etc. [cite: 298]
  min_order_mov_: number;      // Minimum Order Value (₪) for delivery [cite: 119, 299]
  lead_time_days_: number;     // Days from order to delivery [cite: 277]
  
  // Metadata
  supplier_logo_url_?: string; // For the Smart Filter Bar [cite: 34]
  last_updated_?: Date;
}