export type EquipmentCategory =
  | 'heat_source'
  | 'tool'
  | 'container'
  | 'packaging'
  | 'infrastructure'
  | 'consumable';

export interface ScalingRule {
  per_guests_: number;
  min_quantity_: number;
  max_quantity_?: number;
}

export interface Equipment {
  _id: string;
  name_hebrew: string;
  category_: EquipmentCategory;
  owned_quantity_: number;
  scaling_rule_?: ScalingRule;
  is_consumable_: boolean;
  tags_?: string[];
  notes_?: string;
  created_at_: string;
  updated_at_: string;
}
