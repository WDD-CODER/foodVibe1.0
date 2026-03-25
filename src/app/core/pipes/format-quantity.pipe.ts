import { Pipe, PipeTransform } from '@angular/core'

interface FractionEntry {
  value: number
  unicode: string
}

const KNOWN_FRACTIONS: FractionEntry[] = [
  { value: 0.25, unicode: '¼' },
  { value: 1 / 3, unicode: '⅓' },
  { value: 0.5, unicode: '½' },
  { value: 2 / 3, unicode: '⅔' },
  { value: 0.75, unicode: '¾' },
]

const FRACTION_TOLERANCE = 0.04

@Pipe({
  name: 'formatQuantity',
  standalone: true,
})
export class FormatQuantityPipe implements PipeTransform {
  transform(value: number | undefined | null): string {
    if (value == null || isNaN(value)) return ''

    const whole = Math.floor(value)
    const frac = value - whole

    // Check if fractional part matches a known Unicode fraction
    const match = KNOWN_FRACTIONS.find(
      f => Math.abs(frac - f.value) <= FRACTION_TOLERANCE
    )

    if (match) {
      if (whole > 0) {
        return `${whole} ${match.unicode}`
      }
      return match.unicode
    }

    // Integer: no decimal places
    if (frac === 0) {
      return new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(value)
    }

    // Decimal fallback
    return new Intl.NumberFormat('he-IL', { maximumFractionDigits: 3 }).format(value)
  }
}
