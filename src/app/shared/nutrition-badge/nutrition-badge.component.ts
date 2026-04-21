import { Component, Input, ChangeDetectionStrategy, signal, ElementRef, inject } from '@angular/core'
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
  carbs:   '#f59e0b',
  fat:     '#ef4444',
  fiber:   '#10b981',
}

@Component({
  selector: 'app-nutrition-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './nutrition-badge.component.html',
  styleUrl: './nutrition-badge.component.scss',
})
export class NutritionBadgeComponent {
  private readonly elRef_ = inject(ElementRef)

  @Input() nutrition: NutritionPer100g | null | undefined
  showTooltip = false
  isBelow_ = signal(false)
  tooltipStyle_ = signal<Record<string, string>>({})

  onMouseEnter(): void {
    this.showTooltip = true
    const host = this.elRef_.nativeElement as HTMLElement
    const rect = host.getBoundingClientRect()
    const cbRect = this.findFixedContainingBlock_(host)

    // All coordinates are in containing-block space.
    // When no intercepting ancestor exists cbRect covers the full viewport,
    // so the formulas degrade to the plain-viewport case.
    const TOOLTIP_W = 164
    const TOOLTIP_EST_HEIGHT = 240
    const halfW = TOOLTIP_W / 2

    const centerX_cb = rect.left + rect.width / 2 - cbRect.left
    const clampedX  = Math.max(halfW, Math.min(cbRect.width - halfW, centerX_cb))

    // Flip to below when the badge is too close to the containing block's top edge
    const below = (rect.top - cbRect.top) < TOOLTIP_EST_HEIGHT + 8
    this.isBelow_.set(below)

    if (!below) {
      this.tooltipStyle_.set({
        bottom: `${cbRect.bottom - rect.top + 8}px`,
        top:    'auto',
        left:   `${clampedX}px`,
      })
    } else {
      this.tooltipStyle_.set({
        top:    `${rect.bottom - cbRect.top + 8}px`,
        bottom: 'auto',
        left:   `${clampedX}px`,
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
        (cs.transform     && cs.transform     !== 'none')   ||
        (cs.filter        && cs.filter        !== 'none')   ||
        (cs.perspective   && cs.perspective   !== 'none')   ||
        cs.willChange.split(',').some(p =>
          ['transform', 'filter', 'perspective'].includes(p.trim()))
      ) {
        return el.getBoundingClientRect()
      }
      el = el.parentElement
    }
    return new DOMRect(0, 0, window.innerWidth, window.innerHeight)
  }

  get dominantColor(): string | null {
    const n = this.nutrition
    if (!n) return null
    const scores: Record<string, number> = {
      protein: (n.protein_g ?? 0) * 4,
      carbs:   (n.carbs_g ?? 0) * 4,
      fat:     (n.fat_g ?? 0) * 9,
      fiber:   (n.fiber_g ?? 0) * 2,
    }
    const total = Object.values(scores).reduce((a, b) => a + b, 0)
    if (total === 0) return null
    const dominant = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]
    return MACRO_COLORS[dominant]
  }

  get macroSegments(): MacroSegment[] {
    const n = this.nutrition
    if (!n) return []
    const vals: Record<string, number> = {
      protein: (n.protein_g ?? 0) * 4,
      carbs:   (n.carbs_g ?? 0) * 4,
      fat:     (n.fat_g ?? 0) * 9,
      fiber:   (n.fiber_g ?? 0) * 2,
    }
    const total = Object.values(vals).reduce((a, b) => a + b, 0)
    if (total === 0) return []
    return Object.entries(vals)
      .filter(([, v]) => v > 0)
      .map(([key, kcal]) => ({ key, color: MACRO_COLORS[key], pct: (kcal / total) * 100 }))
  }

  get legendItems(): LegendItem[] {
    return this.macroSegments.map(seg => ({
      ...seg,
      iconType: seg.key === 'fat' ? 'fat-svg' : 'lucide',
      iconName: { protein: 'dumbbell', carbs: 'wheat', fiber: 'leaf' }[seg.key],
    }))
  }

  get tooltipRows(): TooltipRow[] {
    const n = this.nutrition
    if (!n) return []
    const candidates: (TooltipRow | null)[] = [
      n.energy_kcal != null ? { key: 'calories', label: 'קלוריות',     value: n.energy_kcal, unit: 'קק"ל', iconType: 'lucide', iconName: 'flame',    iconColor: '#f97316', sub: false } : null,
      n.protein_g  != null ? { key: 'protein',  label: 'חלבון',        value: n.protein_g,   unit: 'ג',    iconType: 'lucide', iconName: 'dumbbell', iconColor: '#3b82f6', sub: false } : null,
      n.carbs_g    != null ? { key: 'carbs',    label: 'פחמימות',      value: n.carbs_g,     unit: 'ג',    iconType: 'lucide', iconName: 'wheat',    iconColor: '#f59e0b', sub: false } : null,
      n.sugars_g   != null ? { key: 'sugars',   label: 'מהם סוכרים',  value: n.sugars_g,    unit: 'ג',    iconType: 'lucide', iconName: 'candy',    iconColor: '#f59e0b', sub: true  } : null,
      n.fat_g      != null ? { key: 'fat',      label: 'שומן',         value: n.fat_g,       unit: 'ג',    iconType: 'fat-svg',                       iconColor: '#ef4444', sub: false } : null,
      n.fiber_g    != null ? { key: 'fiber',    label: 'סיבים',        value: n.fiber_g,     unit: 'ג',    iconType: 'lucide', iconName: 'leaf',     iconColor: '#10b981', sub: false } : null,
      n.sodium_g   != null ? { key: 'sodium',   label: 'נתרן',         value: n.sodium_g * 1000, unit: 'מג', iconType: 'lucide', iconName: 'waves',    iconColor: '#64748b', sub: false } : null,
    ]
    return candidates.filter((r): r is TooltipRow => r !== null)
  }

  onBadgeClick(event: MouseEvent): void {
    event.stopPropagation()
    this.showTooltip = !this.showTooltip
  }
}
