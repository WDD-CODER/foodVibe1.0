export type SettingsTab = 'team' | 'business' | 'baseline'

export interface SettingsTabDef {
  key: SettingsTab
  /** Dictionary key of the tab label. */
  labelKey: string
  icon: string
  /** Only the business owner sees and may open this tab. */
  ownerOnly: boolean
}

/** The tabs of `/settings`. Plans 429 (business) and 431 (baseline) append their entry and one `@case` in the page template. */
export const SETTINGS_TABS: SettingsTabDef[] = [
  { key: 'team', labelKey: 'settings_tab_team', icon: 'users', ownerOnly: true },
  { key: 'business', labelKey: 'settings_tab_business', icon: 'building-2', ownerOnly: true },
  { key: 'baseline', labelKey: 'settings_tab_baseline', icon: 'clipboard-list', ownerOnly: true }
]
