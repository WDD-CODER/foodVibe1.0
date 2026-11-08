import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { UserMsgService } from '@services/user-msg.service'
import { MissingItem } from 'src/app/core/engine/event-plan.types'
import { NumberBoxDirective } from 'src/app/core/directives/number-box.directive'
import { TabChipsComponent } from 'src/app/core/components/tab-chips/tab-chips.component'
import { SearchComboboxComponent } from 'src/app/shared/search-combobox/search-combobox.component'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { CustomMultiSelectComponent } from 'src/app/shared/custom-multi-select/custom-multi-select.component'
import { ModalShellComponent } from 'src/app/shared/modal-shell/modal-shell.component'
import { PageHeaderComponent } from 'src/app/shared/page-header/page-header.component'
import { ListShellComponent } from 'src/app/shared/list-shell/list-shell.component'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { DateFieldComponent } from 'src/app/shared/date-field/date-field.component'
import { InputClearComponent } from 'src/app/shared/input-clear/input-clear.component'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { EditGateComponent } from 'src/app/shared/edit-gate/edit-gate.component'
import { PartialCostBadgeComponent } from 'src/app/shared/partial-cost-badge/partial-cost-badge.component'

interface SampleOption {
  value: string
  label: string
}

/**
 * Plan 535: dev-only catalog. Renders every shared UI family with the real components and static sample
 * data. No data service, no server call, nothing persists. Registered only when `environment.localDev`.
 */
@Component({
  selector: 'app-dev-catalog-page',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    NumberBoxDirective,
    TabChipsComponent,
    SearchComboboxComponent,
    CustomSelectComponent,
    CustomMultiSelectComponent,
    ModalShellComponent,
    PageHeaderComponent,
    ListShellComponent,
    EmptyStateComponent,
    FormFieldComponent,
    DateFieldComponent,
    InputClearComponent,
    CounterComponent,
    LoaderComponent,
    EditGateComponent,
    PartialCostBadgeComponent
  ],
  templateUrl: './dev-catalog.page.html',
  styleUrl: './dev-catalog.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DevCatalogPage {
  private readonly userMsg_ = inject(UserMsgService)

  /** The family ids, in page order (the link bar and the section headings). */
  protected readonly families_ = [
    'search-combobox',
    'multi-pick',
    'modal-shell',
    'list-page',
    'empty-state',
    'form-field',
    'number-box',
    'stepper',
    'chip',
    'feedback',
    'edit-gate',
    'cost-badge',
    'engine-classes'
  ] as const

  protected readonly options_: SampleOption[] = [
    { value: 'recipes', label: 'recipes' },
    { value: 'products', label: 'products' },
    { value: 'suppliers', label: 'suppliers' }
  ]
  protected readonly rows_ = ['recipes', 'products', 'suppliers']
  protected readonly missing_: MissingItem[] = [
    { kind: 'unpriced', name: 'products', recipeIds: [] },
    { kind: 'unlinked', name: 'suppliers', recipeIds: [] }
  ]
  protected readonly labelOf_ = (o: SampleOption): string => o.label
  protected readonly keyOf_ = (o: SampleOption): string => o.value

  // search-combobox
  protected readonly queryEmpty_ = signal('')
  protected readonly queryWith_ = signal('')
  protected readonly queryNone_ = signal('zzzz')
  protected readonly openEmpty_ = signal(false)
  protected readonly openWith_ = signal(true)
  protected readonly openNone_ = signal(true)
  protected readonly selectedValue_ = signal('products')

  // multi-pick
  protected readonly picked_ = signal<string[]>(['recipes', 'products', 'suppliers'])

  // modal-shell
  protected readonly isModalOpen_ = signal(false)

  // form-field
  protected readonly text_ = signal('')
  protected readonly dateEmpty_ = signal('')
  protected readonly dateWith_ = signal('2026-11-08')
  protected readonly dateInvalidValue_ = signal('')
  protected readonly dateInvalid_ = signal(true)
  protected readonly dateDisabled_ = signal('2026-11-08')

  // number-box / stepper
  protected readonly counterValue_ = signal(5)

  protected onText(event: Event): void {
    this.text_.set((event.target as HTMLInputElement).value)
  }

  protected toast(kind: 'success' | 'error' | 'warning'): void {
    if (kind === 'success') this.userMsg_.onSetSuccessMsg('recipes')
    else if (kind === 'error') this.userMsg_.onSetErrorMsg('recipes')
    else this.userMsg_.onSetWarningMsg('recipes')
  }

  protected toastUndo(): void {
    this.userMsg_.onSetSuccessMsgWithUndo('recipes', () => undefined)
  }
}
