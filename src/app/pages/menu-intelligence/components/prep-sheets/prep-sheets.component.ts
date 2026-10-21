import { DOCUMENT } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Renderer2,
  computed,
  effect,
  inject,
  input,
  output,
  signal
} from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { EventPlanService } from 'src/app/core/engine/event-plan.service'
import {
  buildPrepSheetGroups,
  buildSupplierSheetGroups,
  prepSheetTableRows,
  type PrepSheetGroup
} from 'src/app/core/utils/prep-sheet-groups.util'
import { buildSupplierOrders } from 'src/app/core/utils/supplier-orders.util'
import type { MenuEvent } from '@models/menu-event.model'
import { ExportService } from '@services/export.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { LoggingService } from '@services/logging.service'
import { StationRegistryService } from '@services/station-registry.service'
import { TranslationService } from '@services/translation.service'

export type PrepSheetsMode = 'by_dish' | 'by_category' | 'by_station' | 'by_supplier'

interface PrepSheetPage {
  group: PrepSheetGroup
  header: (string | number)[]
  body: (string | number)[][]
}

const BODY_CLASS = 'prep-sheets-open'

/** A group name as the content of a CSS string: backslash and quote escaped, newlines removed. */
function cssString(text: string): string {
  return (
    '"' +
    text
      .replace(/[\r\n]+/g, ' ')
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"') +
    '"'
  )
}

/**
 * "דפי הכנה" (plan 437) — the prep checklist as printed pages: one A4 page (or more) per dish, category,
 * station or supplier, with a checkbox per group to choose what prints. Rows come from the event plan, the
 * same groups the Excel export writes. Nothing is saved.
 */
@Component({
  selector: 'app-prep-sheets',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './prep-sheets.component.html',
  styleUrl: './prep-sheets.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'close.emit()' }
})
export class PrepSheetsComponent {
  // 1. INJECTED
  private readonly eventPlan_ = inject(EventPlanService)
  private readonly kitchenState_ = inject(KitchenStateService)
  private readonly stations_ = inject(StationRegistryService)
  private readonly translation_ = inject(TranslationService)
  private readonly exportService_ = inject(ExportService)
  private readonly logging_ = inject(LoggingService)
  private readonly renderer_ = inject(Renderer2)
  private readonly document_ = inject(DOCUMENT)
  private readonly destroyRef_ = inject(DestroyRef)

  // 2. INPUTS
  readonly event = input.required<MenuEvent>()
  readonly mode = input<PrepSheetsMode>('by_station')

  // 3. OUTPUTS
  readonly close = output<void>()

  // 4. SIGNALS & CONSTANTS
  /** The tab the chef picked; null = the mode the sheet was opened with. */
  private readonly pickedMode_ = signal<PrepSheetsMode | null>(null)
  /** Group keys the chef unchecked; empty on open (everything prints). */
  protected readonly excluded_ = signal<ReadonlySet<string>>(new Set())
  protected readonly modes: readonly { mode: PrepSheetsMode; labelKey: string }[] = [
    { mode: 'by_dish', labelKey: 'export_checklist_by_dish' },
    { mode: 'by_category', labelKey: 'export_checklist_by_category' },
    { mode: 'by_station', labelKey: 'export_checklist_by_station' },
    { mode: 'by_supplier', labelKey: 'prep_sheets_by_supplier' }
  ]
  protected readonly t_ = (key: string): string => this.translation_.translate(key)
  private styleEl_: HTMLStyleElement | null = null

  // 5. COMPUTED
  protected readonly activeMode_ = computed(() => this.pickedMode_() ?? this.mode())

  private readonly plan_ = computed(() => this.eventPlan_.planFor(this.event()))

  protected readonly groups_ = computed<PrepSheetGroup[]>(() => {
    const mode = this.activeMode_()
    if (mode === 'by_supplier') {
      const orders = buildSupplierOrders(
        this.plan_(),
        this.kitchenState_.productsById_(),
        this.kitchenState_.suppliersById_(),
        this.t_
      )
      return buildSupplierSheetGroups(orders, this.t_)
    }
    return buildPrepSheetGroups(
      this.plan_(),
      this.event(),
      this.kitchenState_.recipesById_(),
      mode,
      this.t_,
      this.stations_.stations_()
    )
  })

  protected readonly pages_ = computed<PrepSheetPage[]>(() =>
    this.groups_().map((group) => {
      const [header, ...body] = prepSheetTableRows(group, this.t_)
      return { group, header, body }
    })
  )

  protected readonly printedCount_ = computed(() => this.groups_().filter((g) => !this.excluded_().has(g.key)).length)

  /** Event name · date · guests · serving type, printed under every group title. */
  protected readonly metaLine_ = computed(() => {
    const event = this.event()
    const guests = this.t_('prep_sheets_guests').replace('{n}', String(event.guestCount ?? 0))
    return [event.name, this.dateText(event.eventDate), guests, this.t_(event.servingType)].filter(Boolean).join(' · ')
  })

  constructor() {
    this.document_.body.classList.add(BODY_CLASS)
    const style = this.renderer_.createElement('style') as HTMLStyleElement
    this.renderer_.appendChild(this.document_.head, style)
    this.styleEl_ = style
    this.destroyRef_.onDestroy(() => {
      this.document_.body.classList.remove(BODY_CLASS)
      if (this.styleEl_) this.renderer_.removeChild(this.document_.head, this.styleEl_)
      this.styleEl_ = null
    })
    effect(() => {
      const groups = this.groups_()
      const excluded = this.excluded_()
      if (this.styleEl_) this.styleEl_.textContent = this.pageRules(groups, excluded)
    })
  }

  // 6. METHODS
  protected isIncluded(group: PrepSheetGroup): boolean {
    return !this.excluded_().has(group.key)
  }

  protected pickMode(mode: PrepSheetsMode): void {
    this.pickedMode_.set(mode)
    this.excluded_.set(new Set())
  }

  protected toggleGroup(group: PrepSheetGroup): void {
    const next = new Set(this.excluded_())
    if (!next.delete(group.key)) next.add(group.key)
    this.excluded_.set(next)
  }

  protected print(): void {
    window.print()
  }

  protected async exportExcel(): Promise<void> {
    const mode = this.activeMode_()
    if (mode === 'by_supplier') return
    try {
      await this.exportService_.exportChecklist(this.event(), this.kitchenState_.recipes_(), mode)
    } catch (err) {
      this.logging_.error({
        event: 'export.prep_sheets_error',
        message: 'Failed to export prep sheets',
        context: { err }
      })
    }
  }

  protected onOverlayClick(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) this.close.emit()
  }

  private dateText(iso: string | undefined): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
    return match ? `${match[3]}.${match[2]}.${match[1]}` : ''
  }

  /** One named `@page` per printed group, its footer "page X of Y · group" from the dictionary text. */
  private pageRules(groups: PrepSheetGroup[], excluded: ReadonlySet<string>): string {
    const template = this.t_('prep_sheets_page_footer')
    return groups
      .map((group, index) => ({ group, index }))
      .filter(({ group }) => !excluded.has(group.key))
      .map(({ group, index }) => {
        const content = template
          .split(/(\{x\}|\{y\}|\{group\})/)
          .filter((part) => part !== '')
          .map((part) => {
            if (part === '{x}') return 'counter(page)'
            if (part === '{y}') return 'counter(pages)'
            return cssString(part === '{group}' ? group.title : part)
          })
          .join(' ')
        return `@page pg-${index} { size: A4 portrait; margin: 12mm; @bottom-center { content: ${content}; font-size: 10pt } }`
      })
      .join('\n')
  }
}
