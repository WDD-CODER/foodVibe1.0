import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core'
import { Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { TipDirective } from 'src/app/shared/tip/tip.directive'
import { NumberBoxDirective } from '@directives/number-box.directive'
import { AssistantRunDataService } from '@services/assistant-run-data.service'
import { ModuleService } from '@services/module.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { RUN_STEP_KEYS } from '@models/assistant-run.model'
import { AssistantEngineService } from '../../assistant-engine.service'
import { engineUnitKey, fromShown, shownRange, toShown } from '../../assistant-engine.util'
import type { AdminAssistantSetup, EngineEdit } from '../../assistant-engine.util'
import { changeBlock, settingValue } from '../../assistant-settings-value.util'
import type { SettingValue } from '../../assistant-settings-value.util'
import { SETTING_ROWS, settingNameKey } from '../../assistant-settings.data'
import type { SettingRow, SettingWho } from '../../assistant-settings.data'

type SettingView = {
  row: SettingRow
  value: SettingValue
  block: string | null
  who: SettingWho
  /** The engine number this viewer may change in the row, or `null`. */
  edit: EngineEdit | null
}

const WHO: Record<Exclude<SettingWho, 'fixed'>, { tone: string; key: string }> = {
  owner: { tone: 'c-chip--teal', key: 'asr_who_owner' },
  foodvibe: { tone: 'c-chip--amber', key: 'asr_who_foodvibe' }
}

function engineEdit(row: SettingRow, setup: AdminAssistantSetup | null, isAdmin: boolean): EngineEdit | null {
  const field = row.engineField
  if (!isAdmin || !setup?.editable || !field) return null
  const range = setup.ranges?.[field]
  return range ? { field, value: setup.engine[field], range } : null
}

/**
 * Plan 756: "what you can change" — every setting that shapes the assistant's answers, its value for this business and a
 * button to the screen that owns it. Plan 760: the platform admin changes an engine number in its own row; each number
 * is saved on its own.
 */
@Component({
  selector: 'app-assistant-settings-table',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, EmptyStateComponent, LoaderComponent, TipDirective, NumberBoxDirective],
  templateUrl: './settings-table.component.html',
  styleUrl: './settings-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsTableComponent {
  protected readonly data = inject(AssistantRunDataService)
  private readonly engines = inject(AssistantEngineService)
  private readonly modules = inject(ModuleService)
  private readonly router = inject(Router)
  private readonly translation = inject(TranslationService)
  private readonly messages = inject(UserMsgService)

  /** The platform admin also gets the model order, where a fixed setting lives in the code, and the engine's numbers. */
  readonly isAdmin = input(false)

  protected readonly setup_ = this.data.setup_
  protected readonly tablesModule_ = computed(() => this.modules.has('tables'))
  protected readonly who = WHO
  protected readonly nameKey = settingNameKey
  protected readonly unitKey = engineUnitKey
  protected readonly shownRange = shownRange

  /** The one number whose box is open, what the box holds, and whether its save is running. */
  protected readonly editing_ = signal<EngineEdit['field'] | null>(null)
  protected readonly draft_ = signal('')
  protected readonly saving_ = signal(false)

  protected readonly view_ = computed<SettingView[]>(() => {
    const setup = this.setup_()
    const isAdmin = this.isAdmin()
    const viewer = { isAdmin, tablesModule: this.tablesModule_() }
    return SETTING_ROWS.map((row) => {
      const edit = engineEdit(row, setup, isAdmin)
      return {
        row,
        value: settingValue(row, setup, isAdmin),
        block: row.who === 'fixed' ? null : changeBlock(row, viewer),
        who: edit ? 'foodvibe' : row.who,
        edit
      }
    })
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

  /** An engine number opens its box in the row. A blocked button goes nowhere; its tooltip says why. */
  protected change(item: SettingView): void {
    if (item.edit) {
      this.openBox(item.edit)
      return
    }
    if (item.block) return
    void this.router.navigate([item.row.route], { queryParams: item.row.queryParams })
  }

  protected setDraft(event: Event): void {
    this.draft_.set((event.target as HTMLInputElement).value)
  }

  protected cannotSave(edit: EngineEdit): boolean {
    return fromShown(this.draft_(), edit.range) === null
  }

  /** A failed save keeps the box and the row's old value, and says what happened. */
  protected async save(event: Event, edit: EngineEdit): Promise<void> {
    event.preventDefault()
    const value = fromShown(this.draft_(), edit.range)
    if (value === null || this.saving_()) return
    this.saving_.set(true)
    const result = await this.engines.save(edit.field, value)
    this.saving_.set(false)
    if (result === 'saved') {
      this.editing_.set(null)
      return
    }
    const key = result === 'out_of_range' ? 'asr_set_out_of_range' : 'asr_set_save_failed'
    this.messages.onSetErrorMsg(this.translation.translate(key))
  }

  protected cancel(): void {
    this.editing_.set(null)
  }

  protected retry(): void {
    void this.data.loadSetup(true)
  }

  protected goToSettings(): void {
    void this.router.navigate(['/frontdesk/settings'])
  }

  private openBox({ field, value, range }: EngineEdit): void {
    if (this.saving_()) return
    this.draft_.set(toShown(value, range.unit))
    this.editing_.set(field)
  }
}
