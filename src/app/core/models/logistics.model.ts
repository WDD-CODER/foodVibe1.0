import type { EnvironmentType } from './venue.model';

export type EquipmentPhase = 'prep' | 'service' | 'both';

export type LogisticsSource =
  | 'baseline'
  | 'environmental'
  | 'service_style'
  | 'scaling'
  | 'manual';

export interface BaselineEntry {
  equipment_id_: string;
  quantity_: number;
  phase_: EquipmentPhase;
  is_critical_: boolean;
  notes_?: string;
}

export type ServiceStyleKey = 'plated' | 'takeaway' | 'buffet';

export interface ServiceOverride {
  service_style_: ServiceStyleKey;
  equipment_: BaselineEntry[];
}

export interface DishLogistics {
  baseline_: BaselineEntry[];
  service_overrides_?: ServiceOverride[];
}

export interface ResolvedEquipmentItem {
  equipment_id_: string;
  auto_quantity_: number;
  source_: LogisticsSource;
}

export interface ManualOverride {
  equipment_id_: string;
  override_quantity_: number;
}

export interface EventLogistics {
  environment_type_: EnvironmentType;
  venue_profile_id_?: string;
  resolved_items_: ResolvedEquipmentItem[];
  manual_overrides_?: ManualOverride[];
}
