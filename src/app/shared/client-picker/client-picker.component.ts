import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal
} from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { ClientFormComponent } from 'src/app/shared/client-form/client-form.component'
import {
  SearchAddPick,
  SearchComboboxComponent,
  SearchPick
} from 'src/app/shared/search-combobox/search-combobox.component'
import { ClientDataService } from '@services/client-data.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { clientLabel, matchesClientQuery } from 'src/app/core/utils/client-display.util'
import type { Client } from '@models/client.model'

const NAME_MAX = 200

/**
 * Plan 546 (contract C-PICKER): find, show or add one client. A search box on `app-search-combobox`; with a client
 * selected it shows the name inside the field with an X; an owner can add a client from the search (the add-client
 * form replaces the box until it is saved or stepped back from). Staff see no add row.
 */
@Component({
  selector: 'app-client-picker',
  standalone: true,
  imports: [SearchComboboxComponent, ClientFormComponent, LucideAngularModule, TranslatePipe],
  templateUrl: './client-picker.component.html',
  styleUrl: './client-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientPickerComponent {
  // 1. INJECTED
  private readonly host_ = inject<ElementRef<HTMLElement>>(ElementRef)
  private readonly injector = inject(Injector)
  private readonly clientData = inject(ClientDataService)
  private readonly eventData = inject(MenuEventDataService)
  private readonly permission = inject(PermissionService)
  private readonly translation = inject(TranslationService)

  // 2. INPUTS
  readonly selected = input<Client | null>(null)
  readonly inputId = input('client-pick')
  readonly variant = input<'box' | 'plain'>('box')
  /** A click outside the search box closes its list and emits `outsideClick` (a page-owned popover). */
  readonly closeOnOutsideClick = input(false)
  /** Plan 551: false hides the add row (a merge target is always an existing client). */
  readonly allowAdd = input(true)
  /** Plan 551: client ids left out of the list (the client being merged). */
  readonly exclude = input<readonly string[]>([])

  // 3. OUTPUTS
  readonly picked = output<Client>()
  /** The X on the selected value. */
  readonly cleared = output<void>()
  /** True while the add-client view shows. */
  readonly addingChange = output<boolean>()
  /** Escape while the search list was showing. */
  readonly escaped = output<void>()
  readonly outsideClick = output<void>()

  // 4. SIGNALS & CONSTANTS
  protected readonly query_ = signal('')
  protected readonly isAdding_ = signal(false)
  protected readonly initialName_ = signal('')
  protected readonly initialPhone_ = signal('')

  // 5. COMPUTED
  protected readonly canCreate_ = computed(() => this.allowAdd() && this.permission.isOwner_())
  /** Staff are told to ask the owner only where an add row would otherwise have been possible. */
  protected readonly emptyKey_ = computed(() => (this.canCreate_() || !this.allowAdd() ? null : 'client_ask_owner'))
  /** Clients matching the typed text; the combobox gets them already filtered (its own filter is off). */
  protected readonly options_ = computed(() =>
    this.clientData.allClients_().filter((c) => !this.exclude().includes(c._id) && matchesClientQuery(c, this.query_()))
  )

  // 6. METHODS
  protected readonly labelOf = (c: Client): string =>
    clientLabel(
      c,
      this.eventData.allMenuEvents_().filter((e) => e.clientId === c._id).length,
      this.translation.translate('client_events_count')
    )
  protected readonly keyOf = (c: Client): string => c._id

  /** Leaves the add-client view (what was typed there is dropped). False when there was nothing to step back from. */
  back(): boolean {
    if (!this.isAdding_()) return false
    this.setAdding(false)
    this.focusSearch()
    return true
  }

  protected onPicked(pick: SearchPick<Client>): void {
    this.picked.emit(pick.option)
  }

  protected onClear(): void {
    this.query_.set('')
    this.cleared.emit()
    this.focusSearch()
  }

  protected onAddChosen(pick: SearchAddPick): void {
    if (!this.canCreate_()) return
    const typed = pick.typed.trim()
    // What was typed fills the matching field so the owner does not retype it.
    const isPhone = !!typed && /^[0-9+\-\s()]+$/.test(typed)
    this.initialPhone_.set(isPhone ? typed : '')
    this.initialName_.set(typed && !isPhone ? typed.slice(0, NAME_MAX) : '')
    this.setAdding(true)
  }

  protected onFormSaved(client: Client): void {
    this.query_.set('')
    this.setAdding(false)
    this.picked.emit(client)
  }

  private setAdding(value: boolean): void {
    this.isAdding_.set(value)
    this.addingChange.emit(value)
  }

  private focusSearch(): void {
    afterNextRender(() => this.host_.nativeElement.querySelector<HTMLInputElement>('#' + this.inputId())?.focus(), {
      injector: this.injector
    })
  }
}
