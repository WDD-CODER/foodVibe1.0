import type { PermissionAction } from '@services/permission.service'

export type SettingsTab = 'team' | 'access' | 'business' | 'baseline'

export interface SettingsTabDef {
  key: SettingsTab
  /** Dictionary key of the tab label. */
  labelKey: string
  icon: string
  /** Only the business owner sees and may open this tab. */
  ownerOnly: boolean
  /** The permission that opens the tab: the team for `team` and `access`, the business settings for the rest (plan 632). */
  action: PermissionAction
}

/** The tabs of `/settings`. Plans 429 (business) and 431 (baseline) append their entry and one `@case` in the page template. */
export const SETTINGS_TABS: SettingsTabDef[] = [
  { key: 'team', labelKey: 'settings_tab_team', icon: 'users', ownerOnly: true, action: 'manageTeam' },
  { key: 'access', labelKey: 'settings_tab_access', icon: 'user-check', ownerOnly: true, action: 'manageTeam' },
  { key: 'business', labelKey: 'settings_tab_business', icon: 'building-2', ownerOnly: true, action: 'editSettings' },
  {
    key: 'baseline',
    labelKey: 'settings_tab_baseline',
    icon: 'clipboard-list',
    ownerOnly: true,
    action: 'editSettings'
  }
]
