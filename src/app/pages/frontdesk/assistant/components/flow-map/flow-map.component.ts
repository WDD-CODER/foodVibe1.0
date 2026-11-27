import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { TranslationService } from '@services/translation.service'
import type { AssistantEngine, RunStepKey } from '@models/assistant-run.model'
import { reasonKey } from '../../assistant-run-view.util'
import { engineAmount } from '../../assistant-settings-value.util'
import { FLOW_STEPS, flowWhatKey } from '../../assistant-flow.data'
import type { FlowKind, FlowStep } from '../../assistant-flow.data'
import { SETTING_ROWS, settingNameKey } from '../../assistant-settings.data'
import type { SettingRow } from '../../assistant-settings.data'

const KIND_TONE: Record<FlowKind, string> = {
  script: 'c-chip--glass',
  data: 'c-chip--teal',
  ai: 'c-chip--amber'
}

/** Plan 756: "how it works" — the 13 steps every guest message goes through, one open at a time. Read only. */
@Component({
  selector: 'app-flow-map',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './flow-map.component.html',
  styleUrl: './flow-map.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlowMapComponent {
  private readonly translation = inject(TranslationService)

  /** The engine's numbers; `null` until the setup is read, and then no "current value" line shows. */
  readonly engine = input<AssistantEngine | null>(null)
  /** The platform admin also gets the code path of each step and the reason codes. */
  readonly isAdmin = input(false)
  readonly openRuns = output<void>()
  readonly openSettings = output<void>()

  protected readonly open_ = signal<RunStepKey | null>(null)
  protected readonly steps = FLOW_STEPS
  protected readonly kindTone = KIND_TONE
  protected readonly kinds: readonly FlowKind[] = ['script', 'data', 'ai']
  protected readonly whatKey = flowWhatKey
  protected readonly reasonKey = reasonKey

  /** The settings that affect each step, built once from the fixed list. */
  private readonly settingsByStep_ = computed(
    () => new Map(FLOW_STEPS.map((step) => [step.key, SETTING_ROWS.filter((row) => row.steps.includes(step.key))]))
  )

  protected toggle(key: RunStepKey): void {
    this.open_.update((open) => (open === key ? null : key))
  }

  protected settingsOf(key: RunStepKey): readonly SettingRow[] {
    return this.settingsByStep_().get(key) ?? []
  }

  protected settingNames(key: RunStepKey): string {
    return this.settingsOf(key)
      .map((row) => this.translation.translate(settingNameKey(row.id)))
      .join(' · ')
  }

  protected intro(): string {
    return this.translation.translate('asr_flow_intro').replace('{n}', String(this.steps.length))
  }

  /** One "current value" line of a step, or `null` while the engine's numbers are not here. */
  protected engineLine(fact: FlowStep['facts'][number]): { key: string; n: number | string } | null {
    const engine = this.engine()
    return engine ? { key: `asr_engine_${fact}`, n: engineAmount(fact, engine) } : null
  }

  protected engineText(line: { key: string; n: number | string }): string {
    return this.translation.translate(line.key).replace('{n}', String(line.n))
  }
}
