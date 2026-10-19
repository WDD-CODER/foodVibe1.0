import { Injectable } from '@angular/core'
import { KeyedPickerSearch } from 'src/app/core/utils/keyed-picker-search.util'

export type { PickerSearchKey, PickerKeydownOptions } from 'src/app/core/utils/keyed-picker-search.util'

/** Page-scoped search state for the menu page's pickers (keyboard: shared `KeyedPickerSearch`, add-option rule 5). */
@Injectable()
export class MenuPickerSearchService {
  readonly dish = new KeyedPickerSearch()
  readonly section = new KeyedPickerSearch()
  readonly eventType = new KeyedPickerSearch()
}
