import { Injectable } from '@angular/core'
import { KeyedPickerSearch } from 'src/app/core/utils/keyed-picker-search.util'

export type { PickerSearchKey, PickerKeydownOptions } from 'src/app/core/utils/keyed-picker-search.util'

/** Page-scoped dish-search text, one entry per dish row (the keyboard lives in the shared `app-search-combobox`). */
@Injectable()
export class MenuPickerSearchService {
  readonly dish = new KeyedPickerSearch()
}
