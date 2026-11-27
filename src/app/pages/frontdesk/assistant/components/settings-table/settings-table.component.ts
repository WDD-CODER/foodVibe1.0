import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core'
import { Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { TipDirective } from 'src/app/shared/tip/tip.directive'
import { AssistantRunDataService } from '@services/assistant-run-data.service'
import { ModuleService } from '@services/module.service'
import { TranslationService } from '@services/translation.service'
import { RUN_STEP_KEYS } from '@models/assistant-run.model'
import { changeBlock, settingValue } from '../../assistant-settings-value.util'
import type { SettingValue } from '../../assistant-settings-value.util'
import { SETTING_ROWS, settingNameKey } from '../../assistant-settings.data'
import type { SettingRow, SettingWho } from '../../assistant-settings.data'

type SettingView = { row: SettingRow; value: SettingValue; block: string | null }

const WHO: Record<Exclude<SettingWho, 'fixed'>, { tone: string; key: string }> = {
  owner: { tone: 'c-chip--teal', key: 'asr_who_owner' },
  foodvibe: { tone: 'c-chip--amber', key: 'asr_who_foodvibe' }
}

/**
 * Plan 756: "what you can change" — every setting that shapes the assistant's answers, its value for this business and a
 * button to the screen that owns it. Nothing is edited here.
 */
@Component({
  selector: 'app-assistant-settings-table',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, EmptyStateComponent, LoaderComponent, TipDirective],
  templateUrl: './settings-table.component.html',
  styleUrl: './settings-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsTableComponent {
  protected readonly data = inject(AssistantRunDataService)
  private readonly modules = inject(ModuleService)
  private readonly router = inject(Router)
  private readonly translation = inject(TranslationService)

  /** The platform admin also gets the model order and where a fixed setting lives in the code. */
  readonly isAdmin = input(false)

  protected readonly setup_ = this.data.setup_
  protected readonly tablesModule_ = computed(() => this.modules.has('tables'))
  protected readonly who = WHO
  protected readonly nameKey = settingNameKey

  protected readonly view_ = computed<SettingView[]>(() => {
    const setup = this.setup_()
    const isAdmin = this.isAdmin()
    const viewer = { isAdmin, tablesModule: this.tablesModule_() }
    return SETTING_ROWS.map((row) => ({
      row,
      value: settingValue(row, setup, isAdmin),
      block: row.who === 'fixed' ? null : changeBlock(row, viewer)
    }))
  })

  constructor() {
    void this.data.loadSetup()
  }

  protected stepNames(row: SettingRow): string {
    return row.steps
      .map((key) => `${RUN_STEP_KEYS.indexOf(key) + 1}. ${this.translation.translate('asr_step_' + key)}`)
      .join(' · ')
  }

  /** A value as the row shows it: the dictionary text with its numbers put in, or text left to right as it is. */
  protected shown(value: SettingValue): { text: string; dir: 'ltr' | null } | null {
    if (!value) return null
    if ('text' in value) return { text: value.text, dir: 'ltr' }
    const text = Object.entries(value.params ?? {}).reduce(
      (words, [name, param]) => words.replace(`{${name}}`, String(param)),
      this.translation.translate(value.key)
    )
    return { text, dir: null }
  }

  protected changeLabel(row: SettingRow): string {
    return `${this.translation.translate('asr_set_change')}: ${this.translation.translate(settingNameKey(row.id))}`
  }

  /** A blocked button goes nowhere; its tooltip says why. */
  protected change(item: SettingView): void {
    if (item.block) return
    void this.router.navigate([item.row.route], { queryParams: item.row.queryParams })
  }

  protected retry(): void {
    void this.data.loadSetup(true)
  }

  protected goToSettings(): void {
    void this.router.navigate(['/frontdesk/settings'])
  }
}
