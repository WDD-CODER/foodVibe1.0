export { ColumnCarouselGroupDirective } from './column-carousel-group.directive'
export { ColumnCarouselHeaderComponent } from './column-carousel-header.component'
export { ColumnCarouselCellComponent } from './column-carousel-cell.component'
export { ColumnSlideDirective } from './column-slide.directive'
export { FallColumnDirective } from './fall-column.directive'

import { ColumnCarouselGroupDirective } from './column-carousel-group.directive'
import { ColumnCarouselHeaderComponent } from './column-carousel-header.component'
import { ColumnCarouselCellComponent } from './column-carousel-cell.component'
import { ColumnSlideDirective } from './column-slide.directive'
import { FallColumnDirective } from './fall-column.directive'

/** Everything a list template needs for the column carousel (plan 349; falling columns plan 745). */
export const COLUMN_CAROUSEL = [
  ColumnCarouselGroupDirective,
  ColumnCarouselHeaderComponent,
  ColumnCarouselCellComponent,
  ColumnSlideDirective,
  FallColumnDirective
] as const
