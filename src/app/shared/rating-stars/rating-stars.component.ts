import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { LucideAngularModule } from 'lucide-angular'

export type RatingSize = 'sm' | 'md' | 'lg'

export interface StarState {
  index: number
  full: boolean
  half: boolean
  empty: boolean
}

@Component({
  selector: 'app-rating-stars',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './rating-stars.component.html',
  styleUrl: './rating-stars.component.scss',
})
export class RatingStarsComponent {
  // INPUTS
  value = input<number>(0)
  max = input<number>(5)
  readonly = input<boolean>(true)
  size = input<RatingSize>('md')

  // OUTPUTS
  ratingChange = output<number>()

  // SIGNALS & CONSTANTS
  private hoveredIndex_ = signal<number>(-1)
  protected hoveredIndex = this.hoveredIndex_.asReadonly()

  // COMPUTED SIGNALS
  protected stars_ = computed<StarState[]>(() => {
    const total = this.max()
    const active = this.hoveredIndex_() >= 0
      ? this.hoveredIndex_() + 1
      : this.value()

    return Array.from({ length: total }, (_, i) => {
      const threshold = i + 1
      const diff = active - i
      return {
        index: i,
        full: diff >= 1,
        half: diff > 0 && diff < 1,
        empty: diff <= 0,
      }
    })
  })

  protected sizeClass_ = computed(() => `rating-stars--${this.size()}`)

  // CRDUL methods
  protected onStarClick(index: number): void {
    if (this.readonly()) return
    this.ratingChange.emit(index + 1)
  }

  protected onStarHover(index: number): void {
    if (this.readonly()) return
    this.hoveredIndex_.set(index)
  }

  protected onLeave(): void {
    this.hoveredIndex_.set(-1)
  }
}
