export type EnvironmentType =
  | 'professional_kitchen'
  | 'outdoor_field'
  | 'client_home'
  | 'popup_venue';

export interface VenueInfraItem {
  equipment_id_: string;
  available_quantity_: number;
}

export interface VenueProfile {
  _id: string;
  name_hebrew: string;
  environment_type_: EnvironmentType;
  available_infrastructure_: VenueInfraItem[];
  notes_?: string;
  created_at_: string;
}
