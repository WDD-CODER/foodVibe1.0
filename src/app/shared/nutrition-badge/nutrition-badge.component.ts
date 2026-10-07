import {
  Component,
  input,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  DestroyRef,
  signal,
  viewChild,
  ElementRef,
  inject,
  HostListener
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { LucideAngularModule } from 'lucide-angular'
import { NutritionPer100g } from '@models/product.model'

interface MacroSegment {
  key: string
  color: string
  pct: number
}

interface LegendItem extends MacroSegment {
  iconType: 'lucide' | 'fat-svg'
  iconName?: string
}

interface TooltipRow {
  key: string
  label: string
  value: number
  unit: string
  iconType: 'lucide' | 'fat-svg'
  iconName?: string
  iconColor: string
  sub: boolean
}

const TOOLTIP_W = 164
const GAP = 8
const VIEWPORT_MARGIN = 8
const MIN_HEIGHT = 80
const SCROLL_STEP = 60
const AUTO_SCROLL_PX = 3

const MACRO_COLORS: Record<string, string> = {
  protein: '#3b82f6',
  carbs: '#f59e0b',
  fat: '#ef4444',
  fiber: '#10b981'
}

@Component({
  selector: 'app-nutrition-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './nutrition-badge.component.html',
  styleUrl: './nutrition-badge.component.scss'
})
export class NutritionBadgeComponent {
  private readonly elRef_ = inject(ElementRef)
  private readonly cdr_ = inject(ChangeDetectorRef)
  private readonly destroyRef_ = inject(DestroyRef)

  readonly nutrition = input<NutritionPer100g | null | undefined>()

  readonly showTooltip_ = signal(false)
  readonly isBelow_ = signal(false)
  readonly canScrollUp_ = signal(false)
  readonly canScrollDown_ = signal(false)

  private readonly tooltipRef_ = viewChild<ElementRef<HTMLElement>>('tooltip')
  private readonly scrollerRef_ = viewChild<ElementRef<HTMLElement>>('scroller')

  private openedByHover_ = false
  private autoScrollFrame_: number | null = null
  private readonly onOutsideScroll_ = (event: Event): void => {
    const tooltip = this.tooltipRef_()?.nativeElement
    if (tooltip && event.target instanceof Node && tooltip.contains(event.target)) return
    this.close_()
  }

  constructor() {
    this.destroyRef_.onDestroy(() => this.close_())
  }

  // ── Open / close ───────────────────────────────────────────────────────────

  onPointerEnter(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || this.showTooltip_()) return
    this.openedByHover_ = true
    this.open_()
  }

  onPointerLeave(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || !this.openedByHover_) return
    this.close_()
  }

  onBadgeClick(event: MouseEvent): void {
    event.stopPropagation()
    // A click on a hover-opened tooltip pins it open instead of closing it.
    if (this.showTooltip_() && this.openedByHover_) {
      this.openedByHover_ = false
      return
    }
    if (this.showTooltip_()) this.close_()
    else this.open_()
  }

  /** Tap outside closes the tooltip (touch has no pointerleave). */
  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.showTooltip_()) return
    const host = this.elRef_.nativeElement as HTMLElement
    const tooltip = this.tooltipRef_()?.nativeElement
    if (event.target instanceof Node && (host.contains(event.target) || tooltip?.contains(event.target))) return
    this.close_()
  }

  @HostListener('window:resize')
  protected onWindowResize(): void {
    if (this.showTooltip_()) this.close_()
  }

  /**
   * Renders the tooltip, moves it to <body> so no ancestor's overflow, stacking context or
   * containing block (container-type, transform, filter) can clip or cover it, then positions it.
   */
  private open_(): void {
    this.showTooltip_.set(true)
    this.cdr_.detectChanges()
    const tooltip = this.tooltipRef_()?.nativeElement
    if (!tooltip) return
    if (tooltip.parentElement !== document.body) document.body.appendChild(tooltip)
    this.positionTooltip_(tooltip)
    this.updateScrollHints()
    document.addEventListener('scroll', this.onOutsideScroll_, true)
  }

  private close_(): void {
    this.stopAutoScroll()
    document.removeEventListener('scroll', this.onOutsideScroll_, true)
    this.openedByHover_ = false
    if (!this.showTooltip_()) return
    // The portaled node lives under <body>; Angular only removes it while this view is alive.
    this.tooltipRef_()?.nativeElement.remove()
    this.showTooltip_.set(false)
  }

  /**
   * Viewport-fixed placement next to the badge, centred and clamped to the screen edges.
   * Opens above when it fits (as before), otherwise on the side with more room; when neither
   * side fits, the height is capped and the content scrolls behind the up/down arrows.
   */
  private positionTooltip_(tooltip: HTMLElement): void {
    const rect = (this.elRef_.nativeElement as HTMLElement).getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const halfW = TOOLTIP_W / 2

    tooltip.style.maxHeight = ''
    const naturalHeight = tooltip.offsetHeight

    const centerX = rect.left + rect.width / 2
    const left = Math.max(halfW + VIEWPORT_MARGIN, Math.min(vw - halfW - VIEWPORT_MARGIN, centerX))
    const roomAbove = rect.top - GAP - VIEWPORT_MARGIN
    const roomBelow = vh - rect.bottom - GAP - VIEWPORT_MARGIN
    const below = naturalHeight > roomAbove && roomBelow > roomAbove
    const room = Math.max(MIN_HEIGHT, Math.floor(below ? roomBelow : roomAbove))

    this.isBelow_.set(below)
    tooltip.classList.toggle('nb-tooltip--below', below)
    tooltip.style.left = `${left}px`
    tooltip.style.top = below ? `${rect.bottom + GAP}px` : 'auto'
    tooltip.style.bottom = below ? 'auto' : `${vh - rect.top + GAP}px`
    tooltip.style.maxHeight = `${room}px`
  }

  // ── Scroll hints ───────────────────────────────────────────────────────────

  updateScrollHints(): void {
    const el = this.scrollerRef_()?.nativeElement
    if (!el) return
    this.canScrollUp_.set(el.scrollTop > 1)
    this.canScrollDown_.set(el.scrollTop + el.clientHeight < el.scrollHeight - 1)
  }

  scrollStep(direction: 1 | -1, event: MouseEvent): void {
    event.stopPropagation()
    this.scrollerRef_()?.nativeElement.scrollBy({ top: direction * SCROLL_STEP, behavior: 'smooth' })
  }

  /** Mouse resting on an arrow keeps scrolling that way. */
  startAutoScroll(direction: 1 | -1, event: PointerEvent): void {
    if (event.pointerType !== 'mouse') return
    this.stopAutoScroll()
    const tick = (): void => {
      const el = this.scrollerRef_()?.nativeElement
      if (!el) return
      el.scrollTop += direction * AUTO_SCROLL_PX
      this.updateScrollHints()
      this.autoScrollFrame_ = requestAnimationFrame(tick)
    }
    this.autoScrollFrame_ = requestAnimationFrame(tick)
  }

  stopAutoScroll(): void {
    if (this.autoScrollFrame_ === null) return
    cancelAnimationFrame(this.autoScrollFrame_)
    this.autoScrollFrame_ = null
  }

  // ── Derived display data ───────────────────────────────────────────────────

  get dominantColor(): string | null {
    const n = this.nutrition()
    if (!n) return null
    const scores: Record<string, number> = {
      protein: (n.proteinG ?? 0) * 4,
      carbs: (n.carbsG ?? 0) * 4,
      fat: (n.fatG ?? 0) * 9,
      fiber: (n.fiberG ?? 0) * 2
    }
    const total = Object.values(scores).reduce((a, b) => a + b, 0)
    if (total === 0) return null
    const dominant = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]
    return MACRO_COLORS[dominant]
  }

  get macroSegments(): MacroSegment[] {
    const n = this.nutrition()
    if (!n) return []
    const vals: Record<string, number> = {
      protein: (n.proteinG ?? 0) * 4,
      carbs: (n.carbsG ?? 0) * 4,
      fat: (n.fatG ?? 0) * 9,
      fiber: (n.fiberG ?? 0) * 2
    }
    const total = Object.values(vals).reduce((a, b) => a + b, 0)
    if (total === 0) return []
    return Object.entries(vals)
      .filter(([, v]) => v > 0)
      .map(([key, kcal]) => ({ key, color: MACRO_COLORS[key], pct: (kcal / total) * 100 }))
  }

  get legendItems(): LegendItem[] {
    return this.macroSegments.map((seg) => ({
      ...seg,
      iconType: seg.key === 'fat' ? 'fat-svg' : 'lucide',
      iconName: { protein: 'dumbbell', carbs: 'wheat', fiber: 'leaf' }[seg.key]
    }))
  }

  get tooltipRows(): TooltipRow[] {
    const n = this.nutrition()
    if (!n) return []
    const candidates: (TooltipRow | null)[] = [
      n.energyKcal != null
        ? {
            key: 'calories',
            label: 'קלוריות',
            value: n.energyKcal,
            unit: 'קק"ל',
            iconType: 'lucide',
            iconName: 'flame',
            iconColor: '#f97316',
            sub: false
          }
        : null,
      n.proteinG != null
        ? {
            key: 'protein',
            label: 'חלבון',
            value: n.proteinG,
            unit: 'ג',
            iconType: 'lucide',
            iconName: 'dumbbell',
            iconColor: '#3b82f6',
            sub: false
          }
        : null,
      n.carbsG != null
        ? {
            key: 'carbs',
            label: 'פחמימות',
            value: n.carbsG,
            unit: 'ג',
            iconType: 'lucide',
            iconName: 'wheat',
            iconColor: '#f59e0b',
            sub: false
          }
        : null,
      n.sugarsG != null
        ? {
            key: 'sugars',
            label: 'מהם סוכרים',
            value: n.sugarsG,
            unit: 'ג',
            iconType: 'lucide',
            iconName: 'candy',
            iconColor: '#f59e0b',
            sub: true
          }
        : null,
      n.fatG != null
        ? { key: 'fat', label: 'שומן', value: n.fatG, unit: 'ג', iconType: 'fat-svg', iconColor: '#ef4444', sub: false }
        : null,
      n.fiberG != null
        ? {
            key: 'fiber',
            label: 'סיבים',
            value: n.fiberG,
            unit: 'ג',
            iconType: 'lucide',
            iconName: 'leaf',
            iconColor: '#10b981',
            sub: false
          }
        : null,
      n.sodiumG != null
        ? {
            key: 'sodium',
            label: 'נתרן',
            value: n.sodiumG * 1000,
            unit: 'מג',
            iconType: 'lucide',
            iconName: 'waves',
            iconColor: '#64748b',
            sub: false
          }
        : null
    ]
    return candidates.filter((r): r is TooltipRow => r !== null)
  }
}
