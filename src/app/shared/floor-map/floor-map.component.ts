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
  signal,
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
  type CellBox,
  type ChairsPerSide,
  type FloorTableState
} from './floor-geometry.util'
import {
  cellAtPoint,
  colorOf,
  deltaCells,
  movedRect,
  rectFromCells,
  resizedRect,
  ZONE_CORNERS,
  type ZoneCorner,
  type ZoneRect
} from './floor-zones.util'

/** What the map draws: the parts of a floor plan it needs (a saved plan or an editor's draft). */
export type FloorMapPlan = Pick<FloorPlan, 'grid' | 'areas' | 'tables'>

/** Plan 671: the text a screen puts on one table: its state label and the booking's name and time. */
export type FloorTableDetail = { label?: string; name?: string; time?: string }

/** Plan 699: an area's zone after a draw, a move or a resize on the map. */
export type FloorZoneEvent = { areaKey: string; rect: ZoneRect }

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
  joined: boolean
  /** `var(--color-zone-n)` of the table's area when the screen colours tables; null otherwise. */
  zoneColor: string | null
  detail: FloorTableDetail | null
}

interface ZoneView {
  key: string
  name: string
  rect: ZoneRect
  color: string
  selected: boolean
}

const zoneVar = (index: number): string => `var(--color-zone-${index})`

/**
 * Plan 665: the drawing of the room, read-only and shared (editor, service screen, booking dialog).
 * The page owns the data: the map only reports a tap and a move, in whole cells.
 * Plan 699: each area with a zone is drawn as a coloured, labelled rectangle under the tables; a page that sets
 * `zoneEditable` may draw (`drawZoneKey`), move and resize (`selectedZoneKey`) a zone; the map only reports the rect.
 */
@Component({
  selector: 'app-floor-map',
  standalone: true,
  imports: [CdkDrag, LucideAngularModule, TranslatePipe],
  host: { '(document:keydown.escape)': 'cancelDraw()' },
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
  /** Plan 671: text per table (state label, name, time); it becomes part of the table's accessible name. */
  readonly details = input<Record<string, FloorTableDetail>>({})
  readonly selectedKeys = input<readonly string[]>([])
  readonly draggable = input(false)
  readonly dimOtherThanArea = input<string | null>(null)
  /** Plan 684: keys of tables to mark with a warning (overlap). */
  readonly warnKeys = input<readonly string[]>([])
  /** Plan 699: draw each area's zone (fill, dashed border, name). */
  readonly showZones = input(true)
  /** Plan 699: each table's border takes its area's colour (the editor); service screens keep the neutral one. */
  readonly colorTables = input(false)
  /** Plan 699: keys of tables that are part of a join: violet border, a link mark, "מחובר" in the name. */
  readonly joinedKeys = input<readonly string[]>([])
  /** Plan 699: zones are buttons that can be tapped, and the selected one moved and resized. */
  readonly zoneEditable = input(false)
  readonly selectedZoneKey = input<string | null>(null)
  /** Plan 699: while set (an area key), a press-drag-release on the grid draws that area's zone. */
  readonly drawZoneKey = input<string | null>(null)

  readonly tableTapped = output<string>()
  readonly tableMoved = output<{ key: string; x: number; y: number }>()
  /** A tap on an empty part of the grid. */
  readonly gridTapped = output<void>()
  readonly zoneDrawn = output<FloorZoneEvent>()
  readonly zoneChanged = output<FloorZoneEvent>()
  readonly zoneTapped = output<string>()

  protected readonly sides = ['top', 'end', 'bottom', 'start'] as const
  protected readonly corners = ZONE_CORNERS

  /** The cell a draw started on and the cell under the pointer now; null when not drawing. */
  private readonly drawFrom_ = signal<CellBox | null>(null)
  private readonly drawTo_ = signal<CellBox | null>(null)
  private drawPointer: number | null = null

  protected readonly drawing_ = computed(() => this.zoneEditable() && this.drawZoneKey() !== null)

  protected readonly zones_ = computed<ZoneView[]>(() => {
    if (!this.showZones()) return []
    const selected = this.zoneEditable() ? this.selectedZoneKey() : null
    return [...this.plan().areas]
      .sort((a, b) => a.order - b.order)
      .filter((a) => !!a.zone)
      .map((a) => ({
        key: a.key,
        name: a.name,
        rect: a.zone as ZoneRect,
        color: zoneVar(colorOf(a)),
        selected: a.key === selected
      }))
  })

  /** The rectangle being drawn, in the colour of the area it is for. */
  protected readonly draft_ = computed<{ rect: ZoneRect; color: string } | null>(() => {
    const from = this.drawFrom_()
    const to = this.drawTo_()
    const key = this.drawZoneKey()
    if (!from || !to || !key || !this.zoneEditable()) return null
    const area = this.plan().areas.find((a) => a.key === key)
    return { rect: rectFromCells(from, to), color: zoneVar(area ? colorOf(area) : 0) }
  })

  /** Tables in DOM order by y, then x, so Tab walks the room row by row. */
  protected readonly views_ = computed<TableView[]>(() => {
    const states = this.states()
    const selected = this.selectedKeys()
    const dim = this.dimOtherThanArea()
    const warn = this.warnKeys()
    const joined = this.joinedKeys()
    const label = this.translation.translate('fp_table_label')
    const joinedSuffix = this.translation.translate('fp_joined_suffix')
    const details = this.details()
    const areaColors = new Map<string, string>()
    if (this.colorTables()) for (const a of this.plan().areas) areaColors.set(a.key, zoneVar(colorOf(a)))
    return [...this.plan().tables]
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .map((table) => {
        const state = states[table.key] ?? 'none'
        const detail = details[table.key] ?? null
        const isJoined = joined.includes(table.key)
        const name = detail?.label
          ? [table.number, detail.label, [detail.name, detail.time].filter(Boolean).join(' ')]
              .filter(Boolean)
              .join(' · ')
          : label
              .replace('{number}', table.number)
              .replace('{min}', String(table.minSeats))
              .replace('{max}', String(table.maxSeats))
        return {
          table,
          footprint: footprintFor(table),
          chairs: chairsFor(table),
          state,
          label: isJoined ? `${name} · ${joinedSuffix}` : name,
          selected: selected.includes(table.key),
          dimmed: dim !== null && table.areaKey !== dim,
          inactive: !table.active || state === 'not_active',
          warn: warn.includes(table.key),
          joined: isJoined,
          zoneColor: areaColors.get(table.areaKey) ?? null,
          detail
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
    if (this.drawing_()) return
    if (event.target === this.grid().nativeElement) this.gridTapped.emit()
  }

  protected onZoneClick(event: Event, key: string): void {
    event.stopPropagation()
    if (this.suppressClick || !this.zoneEditable()) return
    this.zoneTapped.emit(key)
  }

  private dir(): 'ltr' | 'rtl' {
    return this.directionality.value === 'ltr' ? 'ltr' : 'rtl'
  }

  private cellPx(): number {
    return this.grid().nativeElement.getBoundingClientRect().width / this.plan().grid.cols
  }

  /** The browser may still send a click after the pointer is released; that click is not a tap. */
  private swallowNextClick(delta: { dx: number; dy: number }): void {
    if (delta.dx === 0 && delta.dy === 0) return
    this.suppressClick = true
    setTimeout(() => (this.suppressClick = false))
  }

  protected onDragEnded(event: CdkDragEnd, table: FloorTable): void {
    const delta = { dx: event.distance.x, dy: event.distance.y }
    event.source.reset()
    if (!this.draggable()) return
    this.swallowNextClick(delta)
    const { cols, rows } = this.plan().grid
    const cellPx = this.cellPx()
    if (isTinyDrag(delta, cellPx)) return
    const to = movedCell({ x: table.x, y: table.y }, footprintFor(table), delta, cellPx, this.dir(), { cols, rows })
    if (to.x === table.x && to.y === table.y) return
    this.tableMoved.emit({ key: table.key, ...to })
  }

  /** The selected zone's body was dragged: the whole rect moves by whole cells. */
  protected onZoneDragEnded(event: CdkDragEnd, zone: ZoneView): void {
    const delta = { dx: event.distance.x, dy: event.distance.y }
    event.source.reset()
    if (!this.zoneEditable()) return
    this.swallowNextClick(delta)
    const cells = deltaCells(delta, this.cellPx(), this.dir())
    const rect = movedRect(zone.rect, cells, this.plan().grid)
    if (sameRect(rect, zone.rect)) return
    this.zoneChanged.emit({ areaKey: zone.key, rect })
  }

  /** A corner handle of the selected zone was dragged: that corner moves, the opposite one stays. */
  protected onHandleDragEnded(event: CdkDragEnd, zone: ZoneView, corner: ZoneCorner): void {
    const delta = { dx: event.distance.x, dy: event.distance.y }
    event.source.reset()
    if (!this.zoneEditable()) return
    this.swallowNextClick(delta)
    const cells = deltaCells(delta, this.cellPx(), this.dir())
    const rect = resizedRect(zone.rect, corner, cells, this.plan().grid)
    if (sameRect(rect, zone.rect)) return
    this.zoneChanged.emit({ areaKey: zone.key, rect })
  }

  private cellOf(event: PointerEvent): CellBox {
    const box = this.grid().nativeElement.getBoundingClientRect()
    return cellAtPoint({ x: event.clientX, y: event.clientY }, box, this.plan().grid, this.dir())
  }

  protected onPointerDown(event: PointerEvent): void {
    if (!this.drawing_() || (event.pointerType === 'mouse' && event.button !== 0)) return
    event.preventDefault()
    const cell = this.cellOf(event)
    this.drawPointer = event.pointerId
    try {
      this.grid().nativeElement.setPointerCapture(event.pointerId)
    } catch {
      // A synthetic or already-gone pointer cannot be captured; the draw still works without it.
    }
    this.drawFrom_.set(cell)
    this.drawTo_.set(cell)
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.drawFrom_() === null || event.pointerId !== this.drawPointer) return
    const cell = this.cellOf(event)
    const to = this.drawTo_()
    if (!to || to.x !== cell.x || to.y !== cell.y) this.drawTo_.set(cell)
  }

  protected onPointerUp(event: PointerEvent): void {
    const from = this.drawFrom_()
    const key = this.drawZoneKey()
    if (from === null || event.pointerId !== this.drawPointer) return
    const to = this.cellOf(event)
    this.cancelDraw()
    if (!key || !this.zoneEditable()) return
    this.zoneDrawn.emit({ areaKey: key, rect: rectFromCells(from, to) })
  }

  /** Escape or a lost pointer: the preview goes and nothing is reported. */
  cancelDraw(): void {
    const pointer = this.drawPointer
    this.drawPointer = null
    this.drawFrom_.set(null)
    this.drawTo_.set(null)
    if (pointer === null) return
    try {
      this.grid().nativeElement.releasePointerCapture(pointer)
    } catch {
      // Not captured (synthetic pointer): nothing to release.
    }
  }
}

const sameRect = (a: ZoneRect, b: ZoneRect): boolean => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h
