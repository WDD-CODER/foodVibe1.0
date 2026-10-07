import { Component, input, ChangeDetectionStrategy, signal, ElementRef, inject, HostListener } from '@angular/core'
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
  showTooltip = false
  isBelow_ = signal(false)
  tooltipStyle_ = signal<Record<string, string>>({})

  onMouseEnter(): void {
    this.showTooltip = true
    this.positionTooltip_()
  }

  /**
   * Places the fixed tooltip next to the badge (plan 348: shared by hover and tap). Clamped to
   * the containing block horizontally; vertically it opens on the side with room, and its
   * height is capped to the viewport so it fits even a ~360px-tall landscape phone.
   */
  private positionTooltip_(): void {
    const host = this.elRef_.nativeElement as HTMLElement
    const rect = host.getBoundingClientRect()
    const cbRect = this.findFixedContainingBlock_(host)

    // All coordinates are in containing-block space.
    // When no intercepting ancestor exists cbRect covers the full viewport,
    // so the formulas degrade to the plain-viewport case.
    const TOOLTIP_W = 164
    const GAP = 8
    const estHeight = Math.min(240, window.innerHeight - 16)
    const halfW = TOOLTIP_W / 2

    const centerX_cb = rect.left + rect.width / 2 - cbRect.left
    const clampedX = Math.max(halfW, Math.min(cbRect.width - halfW, centerX_cb))

    // Room in the viewport above / below the badge.
    const roomAbove = rect.top - Math.max(cbRect.top, 0) - GAP
    const roomBelow = Math.min(cbRect.bottom, window.innerHeight) - rect.bottom - GAP
    // Open above when it fits there (as before); otherwise on whichever side has more room.
    const below = roomAbove < estHeight && roomBelow > roomAbove
    this.isBelow_.set(below)
    const maxHeight = `${Math.max(80, Math.floor(below ? roomBelow : roomAbove))}px`

    if (!below) {
      this.tooltipStyle_.set({
        bottom: `${cbRect.bottom - rect.top + GAP}px`,
        top: 'auto',
        left: `${clampedX}px`,
        'max-height': maxHeight,
        'overflow-y': 'auto'
      })
    } else {
      this.tooltipStyle_.set({
        top: `${rect.bottom - cbRect.top + GAP}px`,
        bottom: 'auto',
        left: `${clampedX}px`,
        'max-height': maxHeight,
        'overflow-y': 'auto'
      })
    }
  }

  /** Walk up the DOM and return the bounding rect of the first ancestor that
   *  acts as a containing block for position:fixed (container-type, transform,
   *  filter, perspective, or will-change). Falls back to the full viewport. */
  private findFixedContainingBlock_(start: HTMLElement): DOMRect {
    let el = start.parentElement
    while (el && el !== document.documentElement) {
      const cs = getComputedStyle(el)
      if (
        (cs.containerType && cs.containerType !== 'normal') ||
        (cs.transform && cs.transform !== 'none') ||
        (cs.filter && cs.filter !== 'none') ||
        (cs.perspective && cs.perspective !== 'none') ||
        cs.willChange.split(',').some((p) => ['transform', 'filter', 'perspective'].includes(p.trim()))
      ) {
        return el.getBoundingClientRect()
      }
      el = el.parentElement
    }
    return new DOMRect(0, 0, window.innerWidth, window.innerHeight)
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

  onBadgeClick(event: MouseEvent): void {
    event.stopPropagation()
    this.showTooltip = !this.showTooltip
    if (this.showTooltip) this.positionTooltip_()
  }

  /** Tap outside closes the tooltip (touch has no mouseleave). */
  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.showTooltip) return
    const host = this.elRef_.nativeElement as HTMLElement
    if (event.target instanceof Node && host.contains(event.target)) return
    this.showTooltip = false
  }
}
