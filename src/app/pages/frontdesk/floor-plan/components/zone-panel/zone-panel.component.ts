import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal
} from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { TranslationService } from '@services/translation.service'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
import { TipDirective } from 'src/app/shared/tip/tip.directive'
import { colorOf, ZONE_COLOR_COUNT, type ZoneRect } from 'src/app/shared/floor-map/floor-zones.util'
import type { FloorPlanBody } from '@models/floor-plan.model'
import { areaNameError } from '../../floor-plan-edit.util'

/** Plan 700: the card of one area (zone) — name, colour, shape on the map, order, remove. Inputs in, events out. */
@Component({
  selector: 'app-floor-zone-panel',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, FormFieldComponent, CounterComponent, TipDirective],
  templateUrl: './zone-panel.component.html',
  styleUrl: './zone-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZonePanelComponent {
  private readonly translation = inject(TranslationService)
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)

  readonly plan = input.required<FloorPlanBody>()
  readonly areaKey = input.required<string>()
  /** True while the map waits for the owner to drag this area's shape. */
  readonly drawing = input(false)
  /** True right after "add area": the name field takes the focus. */
  readonly focusName = input(false)

  readonly renamed = output<{ key: string; name: string }>()
  readonly colorChange = output<{ key: string; color: number }>()
  readonly drawRequested = output<string>()
  readonly rectChange = output<{ key: string; rect: ZoneRect }>()
  readonly cleared = output<string>()
  readonly moved = output<{ key: string; dir: 'up' | 'down' }>()
  readonly removed = output<string>()
  /** Plan 700: the draw mode was cancelled with the "ביטול" button. */
  readonly drawCancelled = output<void>()

  protected readonly colors = Array.from({ length: ZONE_COLOR_COUNT }, (_, n) => n)
  /** What was typed in the name field, to show the error while the draft keeps the last valid name. */
  private readonly typed_ = signal<string | null>(null)

  protected readonly area_ = computed(() => this.plan().areas.find((a) => a.key === this.areaKey()) ?? null)
  protected readonly color_ = computed(() => {
    const area = this.area_()
    return area ? colorOf(area) : 0
  })
  protected readonly sorted_ = computed(() => [...this.plan().areas].sort((a, b) => a.order - b.order))
  protected readonly index_ = computed(() => this.sorted_().findIndex((a) => a.key === this.areaKey()))
  protected readonly count_ = computed(() => this.plan().tables.filter((t) => t.areaKey === this.areaKey()).length)
  protected readonly nameError_ = computed(() => {
    const text = this.typed_()
    return text === null ? null : areaNameError(this.plan(), this.areaKey(), text)
  })
  protected readonly blockedKey_ = computed<string | null>(() => {
    if (this.plan().areas.length <= 1) return 'fp_area_last'
    return this.count_() > 0 ? 'fp_area_has_tables' : null
  })
  protected readonly reason_ = computed(() => {
    const key = this.blockedKey_()
    return key ? this.translation.translate(key) : ''
  })
  protected readonly countText_ = computed(() =>
    this.translation.translate('fp_zone_count').replace('{count}', String(this.count_()))
  )
  protected readonly hint_ = computed(() =>
    this.translation.translate('fp_zone_draw_hint').replace('{name}', this.area_()?.name ?? '')
  )
  protected readonly counters_ = computed(() => {
    const zone = this.area_()?.zone
    const { cols, rows } = this.plan().grid
    if (!zone) return null
    return {
      zone,
      colMax: cols - zone.w + 1,
      rowMax: rows - zone.h + 1,
      wMax: cols - zone.x,
      dMax: rows - zone.y
    }
  })

  constructor() {
    effect(() => {
      // A new area key (another zone selected) forgets what was typed for the previous one.
      this.areaKey()
      this.typed_.set(null)
    })
    effect(() => {
      if (!this.focusName()) return
      this.areaKey()
      queueMicrotask(() => {
        const input = this.host.nativeElement.querySelector<HTMLInputElement>('[data-testid="zone-name"]')
        input?.focus()
        input?.select()
      })
    })
  }

  protected onNameInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value
    this.typed_.set(text)
    if (areaNameError(this.plan(), this.areaKey(), text) !== null) return
    this.renamed.emit({ key: this.areaKey(), name: text.trim() })
  }

  protected onNameBlur(event: Event): void {
    if (!this.nameError_()) return
    ;(event.target as HTMLInputElement).value = this.area_()?.name ?? ''
    this.typed_.set(null)
  }

  protected onRect(part: 'x' | 'y' | 'w' | 'h', value: number): void {
    const zone = this.area_()?.zone
    if (!zone) return
    this.rectChange.emit({ key: this.areaKey(), rect: { ...zone, [part]: value } })
  }

  protected colorName(n: number): string {
    return `fp_color_${n}`
  }

  protected remove(): void {
    if (this.blockedKey_()) return
    this.removed.emit(this.areaKey())
  }
}
