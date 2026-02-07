export interface Supplier {
  _id: string;
  name_hebrew: string;
  contact_person_?: string;
  delivery_days_: number[];
  min_order_mov_: number;
  lead_time_days_: number;
  supplier_logo_url_?: string;
  last_updated_?: Date;
}