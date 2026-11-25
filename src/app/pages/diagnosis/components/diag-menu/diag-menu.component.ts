import { HttpErrorResponse } from '@angular/common/http'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import type { Diagnosis } from '@schemas/entities'
import { NumberBoxDirective } from '@directives/number-box.directive'
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive'
import { TranslatePipe } from '@pipes/translation-pipe.pipe'
import { DishDataService } from '@services/dish-data.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { normalizeHebrew } from 'src/app/core/utils/recipe-match.util'
import { aiCapErrorKey } from 'src/app/core/utils/ai-error.util'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { SearchComboboxComponent } from 'src/app/shared/search-combobox/search-combobox.component'
import { DiagnosisService } from '../../services/diagnosis.service'

interface MenuEditRow {
  id: number
  name: string
  /** null = the text had no printed price; the person types it. */
  sellPrice: number | null
  dishId?: string
}
interface DishOption {
  id: string
  name: string
}

/**
 * Plan 634: the menu step. Pasted text is read by the server (one AI call) into rows the person edits; a row is linked
 * to a dish by code only on an exact name match, otherwise by the person. Nothing here computes a price.
 */
@Component({
  selector: 'app-diag-menu',
  standalone: true,
  imports: [
    FormsModule,
    LucideAngularModule,
    NumberBoxDirective,
    SelectOnFocusDirective,
    TranslatePipe,
    CounterComponent,
    LoaderComponent,
    SearchComboboxComponent
  ],
  templateUrl: './diag-menu.component.html',
  styleUrl: './diag-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiagMenuComponent {
  private readonly diagnosis_ = inject(DiagnosisService)
  private readonly dishes_ = inject(DishDataService)
  private readonly userMsg_ = inject(UserMsgService)
  private readonly translation_ = inject(TranslationService)

  readonly diagnosis = input.required<Diagnosis>()
  readonly locked = input(false)
  /** The stored diagnosis after a save. */
  readonly saved = output<Diagnosis>()

  protected readonly rows_ = signal<MenuEditRow[]>([])
  protected readonly pricesIncludeVat_ = signal(true)
  protected readonly vatPct_ = signal(18)
  protected readonly text_ = signal('')
  protected readonly errorKey_ = signal<string | null>(null)
  protected readonly isReading_ = signal(false)
  protected readonly isSaving_ = signal(false)
  protected readonly isDirty_ = signal(false)
  private draftId_: string | undefined
  private nextId_ = 1
  private initFor_: string | null = null

  protected readonly dishOptions_ = computed<DishOption[]>(() =>
    this.dishes_
      .allDishes_()
      .filter((dish) => dish.recipeType === 'dish')
      .map((dish) => ({ id: dish._id, name: dish.nameHebrew }))
  )

  protected readonly canSave_ = computed(
    () =>
      this.isDirty_() &&
      !this.isSaving_() &&
      !this.locked() &&
      this.rows_().every((row) => row.name.trim() !== '' && row.sellPrice !== null && row.sellPrice >= 0)
  )

  protected readonly labelOf = (option: DishOption): string => option.name
  protected readonly keyOf = (option: DishOption): string => option.id

  constructor() {
    effect(() => {
      const diagnosis = this.diagnosis()
      untracked(() => {
        if (this.initFor_ === diagnosis._id) return
        this.initFor_ = diagnosis._id
        this.rows_.set(diagnosis.menu.map((row) => this.toEditRow_(row.name, row.sellPrice, row.dishId)))
        this.pricesIncludeVat_.set(diagnosis.pricesIncludeVat)
        this.vatPct_.set(diagnosis.vatPct)
        this.isDirty_.set(false)
      })
    })
  }

  /** True when the rows, the switch or the percent hold an unsaved edit. */
  hasRealChanges(): boolean {
    return this.isDirty_()
  }

  async saveAndWait(): Promise<boolean> {
    if (!this.isDirty_()) return true
    return this.save()
  }

  protected setVat(on: boolean): void {
    this.pricesIncludeVat_.set(on)
    this.isDirty_.set(true)
  }

  protected setVatPct(value: number): void {
    this.vatPct_.set(value)
    this.isDirty_.set(true)
  }

  protected async read(): Promise<void> {
    const text = this.text_().trim()
    if (!text || this.isReading_()) return
    this.isReading_.set(true)
    this.errorKey_.set(null)
    try {
      const result = await this.diagnosis_.readMenu(text)
      if (result.items.length === 0) {
        this.errorKey_.set('diag_menu_nothing_found')
        return
      }
      const added = result.items.map((item) => this.toEditRow_(item.name, item.sellPrice, undefined, true))
      this.rows_.update((rows) => [...rows, ...added])
      this.draftId_ = result.draftId
      this.isDirty_.set(true)
    } catch (err) {
      const status = err instanceof HttpErrorResponse ? err.status : 0
      // Plan 736: the monthly cap and the user's own AI allowance read through the shared helper first.
      const capKey = aiCapErrorKey(err)
      if (capKey) this.errorKey_.set(capKey)
      else if (status === 429) this.errorKey_.set('ai_daily_limit_reached_all')
      else this.errorKey_.set('diag_menu_read_failed')
    } finally {
      this.isReading_.set(false)
    }
  }

  protected addRow(): void {
    this.rows_.update((rows) => [...rows, { id: this.nextId_++, name: '', sellPrice: null }])
    this.isDirty_.set(true)
  }

  protected removeRow(id: number): void {
    this.rows_.update((rows) => rows.filter((row) => row.id !== id))
    this.isDirty_.set(true)
  }

  protected updateRow(id: number, patch: Partial<MenuEditRow>): void {
    this.rows_.update((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)))
    this.isDirty_.set(true)
  }

  protected setPrice(id: number, value: string | number | null): void {
    const n = value === null || value === '' ? null : Number(value)
    this.updateRow(id, { sellPrice: n !== null && Number.isFinite(n) && n >= 0 ? n : null })
  }

  protected dishName(id: string | undefined): string {
    return this.dishOptions_().find((dish) => dish.id === id)?.name ?? ''
  }

  protected async save(): Promise<boolean> {
    if (!this.canSave_()) return false
    this.isSaving_.set(true)
    try {
      const menu = this.rows_().map((row) => ({
        name: row.name.trim(),
        sellPrice: row.sellPrice as number,
        ...(row.dishId ? { dishId: row.dishId } : {})
      }))
      const stored = await this.diagnosis_.saveMenu(this.diagnosis()._id, {
        menu,
        ...(this.draftId_ ? { draftId: this.draftId_ } : {}),
        pricesIncludeVat: this.pricesIncludeVat_(),
        vatPct: this.vatPct_()
      })
      this.draftId_ = undefined
      this.isDirty_.set(false)
      this.userMsg_.onSetSuccessMsg(this.translation_.translate('diag_menu_saved'))
      this.saved.emit(stored)
      return true
    } catch (err) {
      this.userMsg_.onSetErrorMsg(this.translation_.translate('server_error'))
      if (err instanceof HttpErrorResponse && err.status === 400 && err.error?.error === 'UNKNOWN_DISH') {
        void this.dishes_.reloadFromStorage()
      }
      return false
    } finally {
      this.isSaving_.set(false)
    }
  }

  /** After a read, a name equal to exactly one dish's is linked by code; every other row starts unlinked. */
  private toEditRow_(name: string, sellPrice: number | null, dishId?: string, autoLink = false): MenuEditRow {
    let linked = dishId
    if (autoLink) {
      const key = normalizeHebrew(name)
      const hits = this.dishOptions_().filter((dish) => normalizeHebrew(dish.name) === key)
      if (key && hits.length === 1) linked = hits[0].id
    }
    return { id: this.nextId_++, name, sellPrice, ...(linked ? { dishId: linked } : {}) }
  }
}
