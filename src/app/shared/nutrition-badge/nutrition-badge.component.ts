import { Component, ChangeDetectionStrategy, ElementRef, effect, inject, input, signal, viewChild } from '@angular/core'
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
  readonly showTooltip_ = signal(false)
  readonly isBelow_ = signal(false)

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

      const reposition = (): void => this.place_(el)
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
    const { width: tipW, height: tipH } = tooltip.getBoundingClientRect()
    const viewW = document.documentElement.clientWidth
    const viewH = document.documentElement.clientHeight

    const roomAbove = badge.top - VIEWPORT_MARGIN_PX
    const roomBelow = viewH - badge.bottom - VIEWPORT_MARGIN_PX
    const needed = tipH + GAP_PX
    // Prefer above; drop below only when above cannot fit and below is roomier.
    const below = roomAbove < needed && roomBelow > roomAbove
    this.isBelow_.set(below)

    const wantedTop = below ? badge.bottom + GAP_PX : badge.top - GAP_PX - tipH
    const top = Math.max(VIEWPORT_MARGIN_PX, Math.min(viewH - VIEWPORT_MARGIN_PX - tipH, wantedTop))

    const badgeCenterX = badge.left + badge.width / 2
    const left = Math.max(VIEWPORT_MARGIN_PX, Math.min(viewW - VIEWPORT_MARGIN_PX - tipW, badgeCenterX - tipW / 2))

    tooltip.style.top = `${top}px`
    tooltip.style.left = `${left}px`
    // Physical offset on purpose: this is a geometric distance from the box's
    // left edge, independent of the tooltip's RTL text direction.
    tooltip.style.setProperty('--nb-arrow-x', `${badgeCenterX - left}px`)
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

  onMouseEnter(): void {
    this.showTooltip_.set(true)
  }

  onMouseLeave(): void {
    this.showTooltip_.set(false)
  }

  onBadgeClick(event: MouseEvent): void {
    event.stopPropagation()
    this.showTooltip_.update((open) => !open)
  }
}
