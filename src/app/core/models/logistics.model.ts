import type { EnvironmentType } from './venue.model'

export type EquipmentPhase = 'prep' | 'service' | 'both'

export type LogisticsSource = 'baseline' | 'environmental' | 'service_style' | 'scaling' | 'manual'

export interface BaselineEntry {
  equipmentId: string
  quantity: number
  phase: EquipmentPhase
  isCritical: boolean
  notes?: string
}

export type ServiceStyleKey = 'plated' | 'takeaway' | 'buffet'

export interface ServiceOverride {
  serviceStyle: ServiceStyleKey
  equipment: BaselineEntry[]
}

export interface DishLogistics {
  baseline: BaselineEntry[]
  serviceOverrides?: ServiceOverride[]
}

export interface ResolvedEquipmentItem {
  equipmentId: string
  autoQuantity: number
  source: LogisticsSource
}

export interface ManualOverride {
  equipmentId: string
  overrideQuantity: number
}

export interface EventLogistics {
  environmentType: EnvironmentType
  venueProfileId?: string
  resolvedItems: ResolvedEquipmentItem[]
  manualOverrides?: ManualOverride[]
}
