import { ChangeDetectionStrategy, Component, computed, inject, signal, WritableSignal } from '@angular/core'
import { DatePipe } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { ClientDataService } from '@services/client-data.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { CLIENT_KINDS, CLIENT_LIFECYCLES, RESERVED_CLIENT_TAGS, type Client } from '@models/client.model'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { COLUMN_CAROUSEL } from 'src/app/shared/column-carousel'
import { ListShellComponent } from 'src/app/shared/list-shell/list-shell.component'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { ModalShellComponent } from 'src/app/shared/modal-shell/modal-shell.component'
import { ClientFormComponent } from 'src/app/shared/client-form/client-form.component'
import { InputClearComponent } from 'src/app/shared/input-clear/input-clear.component'
import { StringParam, StringSetParam, useListState } from 'src/app/core/utils/list-state.util'
import { useResponsivePanelState } from 'src/app/core/utils/panel-preference.util'
import { useCollapsibleCategories } from 'src/app/core/utils/collapsible-categories.util'
import { useListControls } from 'src/app/core/utils/list-controls.util'
import { matchesClientQuery } from 'src/app/core/utils/client-display.util'
import { clientLifecycle } from '../../client-lifecycle.util'

type ClientSort = 'last_contact' | 'name'
type ClientTone = 'amber' | 'red' | null

const OWNER_GRID = 'minmax(8rem, 1.6fr) minmax(7rem, 1fr) 1.2fr 1.4fr minmax(5rem, 0.8fr) 0.6fr 0.6fr'
const STAFF_GRID = 'minmax(8rem, 1.6fr) minmax(7rem, 1fr) 1.2fr 1.6fr'
const RESERVED_TAGS: readonly string[] = RESERVED_CLIENT_TAGS

/** Plan 547: the Front Desk client list — search, kind/tag/lifecycle filters, sort, owner-only add. */
@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    LucideAngularModule,
    TranslatePipe,
    ...COLUMN_CAROUSEL,
    ListShellComponent,
    EmptyStateComponent,
    ModalShellComponent,
    ClientFormComponent,
    InputClearComponent
  ],
  templateUrl: './client-list.component.html',
  styleUrl: './client-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientListComponent {
  private readonly clientData = inject(ClientDataService)
  private readonly permission = inject(PermissionService)
  private readonly translation = inject(TranslationService)
  private readonly userMsg = inject(UserMsgService)

  protected readonly isOwner_ = this.permission.isOwner_
  protected readonly kinds = CLIENT_KINDS
  protected readonly lifecycles = CLIENT_LIFECYCLES

  protected readonly searchQuery_ = signal('')
  protected readonly selectedKinds_ = signal<Set<string>>(new Set())
  protected readonly selectedTags_ = signal<Set<string>>(new Set())
  protected readonly selectedLifecycles_ = signal<Set<string>>(new Set())
  protected readonly sortBy_ = signal<string>('last_contact')
  protected readonly isAddOpen_ = signal(false)
  protected readonly isPanelOpen_: WritableSignal<boolean>
  private readonly togglePanelState_: () => void
  protected readonly filterCategories = useCollapsibleCategories()
  protected readonly listControls = useListControls<never>({ search: this.searchQuery_ })

  /** The moment the list was opened; the lifecycle is worked out against it. */
  private readonly now_ = Date.now()

  protected readonly gridTemplate_ = computed(() => (this.isOwner_() ? OWNER_GRID : STAFF_GRID))

  constructor() {
    const panel = useResponsivePanelState('clients')
    this.isPanelOpen_ = panel.isPanelOpen_
    this.togglePanelState_ = panel.togglePanel
    useListState('clients', [
      { urlParam: 'q', signal: this.searchQuery_, serializer: StringParam },
      { urlParam: 'kind', signal: this.selectedKinds_, serializer: StringSetParam },
      { urlParam: 'tag', signal: this.selectedTags_, serializer: StringSetParam },
      { urlParam: 'life', signal: this.selectedLifecycles_, serializer: StringSetParam },
      { urlParam: 'sort', signal: this.sortBy_, serializer: StringParam }
    ])
  }

  /** Every client that was not merged into another one. */
  protected readonly baseClients_ = computed(() => this.clientData.allClients_().filter((c) => !c.mergedInto))

  protected readonly isEmptyList_ = computed(() => this.baseClients_().length === 0)

  /** Every tag in use, reserved tags first (in their fixed order), then the others A–Z. */
  protected readonly allTags_ = computed(() => {
    const used = new Set<string>()
    for (const c of this.baseClients_()) for (const t of c.tags ?? []) used.add(t)
    const reserved: string[] = RESERVED_CLIENT_TAGS.filter((t) => used.has(t))
    const others = [...used].filter((t) => !RESERVED_TAGS.includes(t)).sort((a, b) => a.localeCompare(b, 'he'))
    return [...reserved, ...others]
  })

  protected readonly hasActiveFilters_ = computed(
    () =>
      this.selectedKinds_().size > 0 ||
      this.selectedTags_().size > 0 ||
      (this.isOwner_() && this.selectedLifecycles_().size > 0)
  )

  protected readonly filteredClients_ = computed(() => {
    const q = this.searchQuery_().trim()
    const kinds = this.selectedKinds_()
    const tags = this.selectedTags_()
    const lifecycles = this.isOwner_() ? this.selectedLifecycles_() : new Set<string>()
    const now = this.now_
    let list = this.baseClients_()
    if (q) list = list.filter((c) => matchesClientQuery(c, q))
    if (kinds.size) list = list.filter((c) => (c.kinds ?? []).some((k) => kinds.has(k)))
    if (tags.size) list = list.filter((c) => (c.tags ?? []).some((t) => tags.has(t)))
    if (lifecycles.size) list = list.filter((c) => lifecycles.has(clientLifecycle(c, now)))
    const byName = (a: Client, b: Client): number => (a.name ?? '').localeCompare(b.name ?? '', 'he')
    if (this.sortBy_() === 'name') return [...list].sort(byName)
    return [...list].sort((a, b) => {
      const la = a.lastContactAt
      const lb = b.lastContactAt
      if (la != null && lb != null && la !== lb) return lb - la
      if (la != null && lb == null) return -1
      if (la == null && lb != null) return 1
      return byName(a, b)
    })
  })

  protected togglePanel(): void {
    this.togglePanelState_()
  }

  protected toggleIn(target: WritableSignal<Set<string>>, value: string): void {
    target.update((set) => {
      const next = new Set(set)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  protected clearAllFilters(): void {
    this.listControls.clearAll(
      () => this.selectedKinds_.set(new Set()),
      () => this.selectedTags_.set(new Set()),
      () => this.selectedLifecycles_.set(new Set())
    )
  }

  protected onClearSearch(input: HTMLInputElement): void {
    this.listControls.onClearSearch(input)
  }

  protected onSearchEscape(event: Event, input: HTMLInputElement): void {
    this.listControls.onSearchEscape(event, input)
  }

  protected setSort(sort: ClientSort): void {
    this.sortBy_.set(sort)
  }

  /** Reserved tags show their dictionary word; any other tag shows as typed. */
  protected tagLabel(tag: string): string {
    if (!RESERVED_TAGS.includes(tag)) return tag
    return this.translation.translate('client_tag_' + tag) || tag
  }

  protected tagTone(tag: string): ClientTone {
    if (tag === 'vip') return 'amber'
    if (tag === 'allergy' || tag === 'repeat_no_show') return 'red'
    return null
  }

  protected openAdd(): void {
    if (this.isOwner_()) this.isAddOpen_.set(true)
  }

  protected closeAdd(): void {
    this.isAddOpen_.set(false)
  }

  protected onSaved(): void {
    this.isAddOpen_.set(false)
    this.userMsg.onSetSuccessMsg(this.translation.translate('client_saved'))
  }
}
