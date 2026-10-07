import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  HostListener,
  effect,
  inject,
  input,
  signal,
  viewChild
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

const MACRO_COLORS: Record<string, string> = {
  protein: '#3b82f6',
  carbs: '#f59e0b',
  fat: '#ef4444',
  fiber: '#10b981'
}

/** Gap between the badge and the tooltip, and the minimum breathing room kept
 *  against every viewport edge. */
const GAP_PX = 8
const VIEWPORT_MARGIN_PX = 8
/** Smallest height the tooltip is squeezed to before it stops shrinking. */
const MIN_HEIGHT_PX = 80
const SCROLL_STEP_PX = 60
const AUTO_SCROLL_PX = 3

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

  readonly nutrition = input<NutritionPer100g | null | undefined>()

  private readonly tooltipRef_ = viewChild<ElementRef<HTMLElement>>('tooltip')
  private readonly scrollerRef_ = viewChild<ElementRef<HTMLElement>>('scroller')
  readonly showTooltip_ = signal(false)
  readonly isBelow_ = signal(false)
  /** Opened by a tap/click (not a mouse hover): the tooltip takes pointer input (scroll, arrows). */
  readonly isPinned_ = signal(false)
  readonly canScrollUp_ = signal(false)
  readonly canScrollDown_ = signal(false)

  private autoScrollFrame_: number | null = null

  constructor() {
    // The tooltip lives in the browser top layer (popover), so it is never
    // clipped by an ancestor's overflow and never trapped in an ancestor's
    // stacking context. Placement therefore happens once the element exists,
    // against the viewport, using its real measured size.
    effect((onCleanup) => {
      const el = this.tooltipRef_()?.nativeElement
      if (!el) return

      if (!el.matches(':popover-open')) el.showPopover()
      this.place_(el)

      const reposition = (event?: Event): void => {
        // Scrolling the tooltip's own content is not a page scroll — leave it where it is.
        if (event?.target instanceof Node && el.contains(event.target)) return
        this.place_(el)
      }
      window.addEventListener('scroll', reposition, true)
      window.addEventListener('resize', reposition)
      onCleanup(() => {
        window.removeEventListener('scroll', reposition, true)
        window.removeEventListener('resize', reposition)
      })
    })
  }

  /** Place the tooltip in viewport coordinates. Flips above/below from the real
   *  measured height, then clamps to the viewport and re-aims the arrow so it
   *  keeps pointing at the badge even when the box had to be pushed sideways. */
  private place_(tooltip: HTMLElement): void {
    const badge = (this.elRef_.nativeElement as HTMLElement).getBoundingClientRect()
    // Natural height = current box + whatever the scroll body hides (keeps its scroll position).
    const scroller = this.scrollerRef_()?.nativeElement
    const { width: tipW, height: boxH } = tooltip.getBoundingClientRect()
    const naturalH = boxH + (scroller ? scroller.scrollHeight - scroller.clientHeight : 0)
    const viewW = document.documentElement.clientWidth
    const viewH = document.documentElement.clientHeight

    const roomAbove = badge.top - VIEWPORT_MARGIN_PX
    const roomBelow = viewH - badge.bottom - VIEWPORT_MARGIN_PX
    const needed = naturalH + GAP_PX
    // Prefer above; drop below only when above cannot fit and below is roomier.
    const below = roomAbove < needed && roomBelow > roomAbove
    this.isBelow_.set(below)

    // Too tall for the chosen side (e.g. a landscape phone): cap the height; the content then
    // scrolls behind the up/down hint arrows instead of a scrollbar.
    const room = Math.max(MIN_HEIGHT_PX, Math.floor((below ? roomBelow : roomAbove) - GAP_PX))
    const tipH = Math.min(naturalH, room)
    tooltip.style.maxHeight = tipH < naturalH ? `${tipH}px` : ''

    const wantedTop = below ? badge.bottom + GAP_PX : badge.top - GAP_PX - tipH
    const top = Math.max(VIEWPORT_MARGIN_PX, Math.min(viewH - VIEWPORT_MARGIN_PX - tipH, wantedTop))

    const badgeCenterX = badge.left + badge.width / 2
    const left = Math.max(VIEWPORT_MARGIN_PX, Math.min(viewW - VIEWPORT_MARGIN_PX - tipW, badgeCenterX - tipW / 2))

    tooltip.style.top = `${top}px`
    tooltip.style.left = `${left}px`
    // Physical offset on purpose: this is a geometric distance from the box's
    // left edge, independent of the tooltip's RTL text direction.
    tooltip.style.setProperty('--nb-arrow-x', `${badgeCenterX - left}px`)
    this.updateScrollHints()
  }

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

  // ── Open / close ───────────────────────────────────────────────────────────

  /** Mouse only — a touch tap also fires enter/leave, which would open and instantly re-close it. */
  onPointerEnter(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || this.showTooltip_()) return
    this.showTooltip_.set(true)
  }

  onPointerLeave(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || this.isPinned_()) return
    this.close_()
  }

  /** Tap opens it pinned. Clicking a hover-opened tooltip pins it (so its arrows and scroll
   *  become usable); clicking a pinned one closes it. */
  onBadgeClick(event: MouseEvent): void {
    event.stopPropagation()
    if (this.showTooltip_() && !this.isPinned_()) {
      this.isPinned_.set(true)
      return
    }
    if (this.showTooltip_()) {
      this.close_()
      return
    }
    this.isPinned_.set(true)
    this.showTooltip_.set(true)
  }

  /** Tap outside closes it (touch has no pointerleave). The tooltip is a DOM child of the host. */
  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.showTooltip_()) return
    const host = this.elRef_.nativeElement as HTMLElement
    if (event.target instanceof Node && host.contains(event.target)) return
    this.close_()
  }

  private close_(): void {
    this.stopAutoScroll()
    this.isPinned_.set(false)
    this.showTooltip_.set(false)
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
    this.scrollerRef_()?.nativeElement.scrollBy({ top: direction * SCROLL_STEP_PX, behavior: 'smooth' })
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
}
