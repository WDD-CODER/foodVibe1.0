import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core'
import { Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { TipDirective } from 'src/app/shared/tip/tip.directive'
import { NumberBoxDirective } from '@directives/number-box.directive'
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive'
import { AssistantRunDataService } from '@services/assistant-run-data.service'
import { ModuleService } from '@services/module.service'
import { TranslationService } from '@services/translation.service'
import { RUN_STEP_KEYS } from '@models/assistant-run.model'
import type { AssistantEngine } from '@models/assistant-run.model'
import { AssistantEngineSettingsService } from '../../assistant-engine-settings.service'
import type { EditableSetup, EngineLimit } from '../../assistant-engine-settings.service'
import { changeBlock, engineSeconds, settingValue } from '../../assistant-settings-value.util'
import type { SettingValue } from '../../assistant-settings-value.util'
import { SETTING_ROWS, settingNameKey } from '../../assistant-settings.data'
import type { SettingRow, SettingWho } from '../../assistant-settings.data'

/** The number box of one engine row: its field, its unit and its range, as typed (seconds for a time). */
type EngineEditor = {
  field: keyof AssistantEngine
  inSeconds: boolean
  unitKey: string
  current: string
  min: string
  max: string
  limit: EngineLimit
}
type SettingView = { row: SettingRow; value: SettingValue; block: string | null; edit: EngineEditor | null }

/** The number box of a row, or `null` when this viewer may not change it. */
function editorOf(row: SettingRow, setup: EditableSetup | null): EngineEditor | null {
  const field = row.value === 'engine' ? row.engineField : undefined
  const limit = field && setup?.editable ? setup.limits?.[field] : undefined
  if (!setup || !field || !limit) return null
  const inSeconds = limit.unit === 'ms'
  const typed = (n: number): string => (inSeconds ? engineSeconds(n) : String(n))
  return {
    field,
    inSeconds,
    unitKey: `asr_unit_${limit.unit}`,
    current: typed(setup.engine[field]),
    min: typed(limit.min),
    max: typed(limit.max),
    limit
  }
}

const WHO: Record<Exclude<SettingWho, 'fixed'>, { tone: string; key: string }> = {
  owner: { tone: 'c-chip--teal', key: 'asr_who_owner' },
  foodvibe: { tone: 'c-chip--amber', key: 'asr_who_foodvibe' }
}

/**
 * Plan 756: "what you can change" — every setting that shapes the assistant's answers, its value for this business and a
 * button to the screen that owns it. Plan 760: the engine's numbers are changed here, in the row, by the platform admin
 * only; everyone else sees them locked.
 */
@Component({
  selector: 'app-assistant-settings-table',
  standalone: true,
  imports: [
    LucideAngularModule,
    TranslatePipe,
    EmptyStateComponent,
    LoaderComponent,
    TipDirective,
    NumberBoxDirective,
    SelectOnFocusDirective
  ],
  templateUrl: './settings-table.component.html',
  styleUrl: './settings-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsTableComponent {
  protected readonly data = inject(AssistantRunDataService)
  private readonly modules = inject(ModuleService)
  private readonly router = inject(Router)
  private readonly translation = inject(TranslationService)
  private readonly engineSettings = inject(AssistantEngineSettingsService)

  /** The platform admin also gets the model order and where a fixed setting lives in the code. */
  readonly isAdmin = input(false)

  protected readonly setup_ = this.data.setup_
  protected readonly tablesModule_ = computed(() => this.modules.has('tables'))
  protected readonly who = WHO
  protected readonly nameKey = settingNameKey

  /** The row whose number box is open (one at a time), and what is typed in it. */
  protected readonly editingId_ = signal<string | null>(null)
  protected readonly draft_ = signal('')
  protected readonly saving_ = signal(false)

  protected readonly view_ = computed<SettingView[]>(() => {
    const setup = this.setup_()
    const isAdmin = this.isAdmin()
    const viewer = { isAdmin, tablesModule: this.tablesModule_() }
    return SETTING_ROWS.map((row) => ({
      row,
      value: settingValue(row, setup, isAdmin),
      block: row.who === 'fixed' ? null : changeBlock(row, viewer),
      edit: editorOf(row, setup)
    }))
  })

  /** The typed number in the engine's own units, or `null` when it is empty or outside the open row's range. */
  protected readonly draftValue_ = computed<number | null>(() => {
    const edit = this.view_().find((item) => item.row.id === this.editingId_())?.edit
    const text = this.draft_().trim()
    if (!edit || !text) return null
    const value = edit.inSeconds ? Math.round(Number(text) * 1000) : Number(text)
    return Number.isInteger(value) && value >= edit.limit.min && value <= edit.limit.max ? value : null
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

  protected startEdit(item: SettingView): void {
    if (!item.edit) return
    this.editingId_.set(item.row.id)
    this.draft_.set(item.edit.current)
  }

  protected typed(event: Event): void {
    this.draft_.set((event.target as HTMLInputElement).value)
  }

  protected cancelEdit(): void {
    this.editingId_.set(null)
  }

  /** A failed save keeps the box open; the row keeps its old value. */
  protected async save(event: Event, item: SettingView): Promise<void> {
    event.preventDefault()
    const value = this.draftValue_()
    if (!item.edit || value === null || this.saving_()) return
    this.saving_.set(true)
    const saved = await this.engineSettings.save(item.edit.field, value)
    this.saving_.set(false)
    if (saved && this.editingId_() === item.row.id) this.editingId_.set(null)
  }

  protected retry(): void {
    void this.data.loadSetup(true)
  }

  protected goToSettings(): void {
    void this.router.navigate(['/frontdesk/settings'])
  }
}
