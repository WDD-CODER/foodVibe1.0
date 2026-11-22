import { Directionality } from '@angular/cdk/bidi'
import { CdkDrag, type CdkDragEnd } from '@angular/cdk/drag-drop'
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  viewChild
} from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { TranslationService } from '@services/translation.service'
import type { FloorPlan, FloorTable } from '@models/floor-plan.model'
import {
  chairsFor,
  footprintFor,
  isTinyDrag,
  movedCell,
  type ChairsPerSide,
  type FloorTableState
} from './floor-geometry.util'

/** What the map draws: the parts of a floor plan it needs (a saved plan or an editor's draft). */
export type FloorMapPlan = Pick<FloorPlan, 'grid' | 'areas' | 'tables'>

interface TableView {
  table: FloorTable
  footprint: { w: number; h: number }
  chairs: ChairsPerSide
  state: FloorTableState | 'none'
  label: string
  selected: boolean
  dimmed: boolean
  inactive: boolean
  warn: boolean
}

/**
 * Plan 665: the drawing of the room, read-only and shared (editor, service screen, booking dialog).
 * The page owns the data: the map only reports a tap and a move, in whole cells.
 */
@Component({
  selector: 'app-floor-map',
  standalone: true,
  imports: [CdkDrag, LucideAngularModule, TranslatePipe],
  templateUrl: './floor-map.component.html',
  styleUrl: './floor-map.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FloorMapComponent {
  private readonly translation = inject(TranslationService)
  private readonly directionality = inject(Directionality)
  private readonly grid = viewChild.required<ElementRef<HTMLElement>>('grid')
  private suppressClick = false

  readonly plan = input.required<FloorMapPlan>()
  readonly states = input<Record<string, FloorTableState>>({})
  readonly selectedKeys = input<readonly string[]>([])
  readonly draggable = input(false)
  readonly dimOtherThanArea = input<string | null>(null)
  /** Plan 684: keys of tables to mark with a warning (overlap). */
  readonly warnKeys = input<readonly string[]>([])

  readonly tableTapped = output<string>()
  readonly tableMoved = output<{ key: string; x: number; y: number }>()
  /** A tap on an empty part of the grid. */
  readonly gridTapped = output<void>()

  protected readonly sides = ['top', 'end', 'bottom', 'start'] as const

  /** Tables in DOM order by y, then x, so Tab walks the room row by row. */
  protected readonly views_ = computed<TableView[]>(() => {
    const states = this.states()
    const selected = this.selectedKeys()
    const dim = this.dimOtherThanArea()
    const warn = this.warnKeys()
    const label = this.translation.translate('fp_table_label')
    return [...this.plan().tables]
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .map((table) => {
        const state = states[table.key] ?? 'none'
        return {
          table,
          footprint: footprintFor(table),
          chairs: chairsFor(table),
          state,
          label: label
            .replace('{number}', table.number)
            .replace('{min}', String(table.minSeats))
            .replace('{max}', String(table.maxSeats)),
          selected: selected.includes(table.key),
          dimmed: dim !== null && table.areaKey !== dim,
          inactive: !table.active || state === 'not_active',
          warn: warn.includes(table.key)
        }
      })
  })

  protected chairIndexes(count: number): number[] {
    return Array.from({ length: count }, (_, i) => i)
  }

  protected onTableClick(event: Event, key: string): void {
    event.stopPropagation()
    if (this.suppressClick) return
    this.tableTapped.emit(key)
  }

  protected onGridClick(event: Event): void {
    if (event.target === this.grid().nativeElement) this.gridTapped.emit()
  }

  protected onDragEnded(event: CdkDragEnd, table: FloorTable): void {
    const delta = { dx: event.distance.x, dy: event.distance.y }
    event.source.reset()
    if (!this.draggable()) return
    // The browser may still send a click after the pointer is released; that click is not a tap.
    if (delta.dx !== 0 || delta.dy !== 0) {
      this.suppressClick = true
      setTimeout(() => (this.suppressClick = false))
    }
    const { cols, rows } = this.plan().grid
    const cellPx = this.grid().nativeElement.getBoundingClientRect().width / cols
    if (isTinyDrag(delta, cellPx)) return
    const to = movedCell(
      { x: table.x, y: table.y },
      footprintFor(table),
      delta,
      cellPx,
      this.directionality.value === 'ltr' ? 'ltr' : 'rtl',
      { cols, rows }
    )
    if (to.x === table.x && to.y === table.y) return
    this.tableMoved.emit({ key: table.key, ...to })
  }
}
