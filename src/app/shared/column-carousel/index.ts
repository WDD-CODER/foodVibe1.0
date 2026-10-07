export { ColumnCarouselGroupDirective } from './column-carousel-group.directive'
export { ColumnCarouselHeaderComponent } from './column-carousel-header.component'
export { ColumnCarouselCellComponent } from './column-carousel-cell.component'
export { ColumnSlideDirective } from './column-slide.directive'

import { ColumnCarouselGroupDirective } from './column-carousel-group.directive'
import { ColumnCarouselHeaderComponent } from './column-carousel-header.component'
import { ColumnCarouselCellComponent } from './column-carousel-cell.component'
import { ColumnSlideDirective } from './column-slide.directive'

/** Everything a list template needs for the mobile column carousel (plan 349). */
export const COLUMN_CAROUSEL = [
  ColumnCarouselGroupDirective,
  ColumnCarouselHeaderComponent,
  ColumnCarouselCellComponent,
  ColumnSlideDirective
] as const
