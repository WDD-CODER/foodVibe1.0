import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { TranslationService } from '@services/translation.service'
import type { AssistantRunView, RunStep, RunStepKey } from '@models/assistant-run.model'
import { outcomeTone, stepRows, verdictOf } from '../../assistant-run-view.util'
import type { StepRow } from '../../assistant-run-view.util'

const TIME_ZONE = 'Asia/Jerusalem'
const dayFull = new Intl.DateTimeFormat('he-IL', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
})
const dayTime = new Intl.DateTimeFormat('he-IL', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
})
const STATUS_TONE: Record<RunStep['status'], string> = {
  ok: 'c-chip--green',
  note: 'c-chip--amber',
  stopped: 'c-chip--red',
  skipped: ''
}
const seconds = (ms: number): string => (ms / 1000).toFixed(1)

type StepView = {
  key: RunStepKey
  status: RunStep['status']
  tone: string
  seconds: string
  groups: { titleKey: string; rows: StepRow[] }[]
}

/** Plan 752: one run of the assistant — the sentence of what happened, then its 13 steps, each opening in place. */
@Component({
  selector: 'app-run-detail',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, TranslatePipe],
  templateUrl: './run-detail.component.html',
  styleUrl: './run-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RunDetailComponent {
  private readonly translation = inject(TranslationService)

  readonly run = input.required<AssistantRunView>()
  /** The platform admin also gets the full prompt. */
  readonly isAdmin = input(false)

  /** The open steps: on a new run the first stopped step, else none. */
  protected readonly open_ = linkedSignal<AssistantRunView, Set<RunStepKey>>({
    source: () => this.run(),
    computation: (run) => {
      const stopped = run.steps.find((s) => s.status === 'stopped')
      return new Set(stopped ? [stopped.key] : [])
    }
  })
  protected readonly promptOpen_ = linkedSignal({ source: () => this.run(), computation: () => false })

  protected readonly verdict_ = computed(() => {
    const { key, params } = verdictOf(this.run())
    const word = (k: string): string => (k ? this.translation.translate(k) : '')
    return this.translation.translate(key).replace('{step}', word(params.step)).replace('{reason}', word(params.reason))
  })

  protected readonly head_ = computed(() => {
    const run = this.run()
    return {
      tone: `c-chip--${outcomeTone(run.outcome)}`,
      time: dayTime.format(new Date(run.startedAt)),
      seconds: seconds(run.ms)
    }
  })

  protected readonly expires_ = computed(() => this.dated('asr_expires', new Date(this.run().expiresAt)))

  protected readonly adminViewed_ = computed(() => {
    const newest = this.run().adminViews?.at(-1)
    return newest ? this.dated('asr_admin_viewed', new Date(newest.at)) : null
  })

  protected readonly steps_ = computed<StepView[]>(() =>
    this.run().steps.map((step) => ({
      key: step.key,
      status: step.status,
      tone: STATUS_TONE[step.status],
      seconds: seconds(step.ms),
      groups: (['in', 'out'] as const)
        .map((side) => ({ titleKey: `asr_${side}`, rows: stepRows(step, side) }))
        .filter((group) => group.rows.length > 0)
    }))
  )

  protected toggle(key: RunStepKey): void {
    this.open_.update((open) => {
      const next = new Set(open)
      if (!next.delete(key)) next.add(key)
      return next
    })
  }

  protected togglePrompt(): void {
    this.promptOpen_.update((open) => !open)
  }

  private dated(key: string, date: Date): string {
    return this.translation.translate(key).replace('{date}', dayFull.format(date))
  }
}
