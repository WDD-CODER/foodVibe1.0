import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild
} from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { UserService } from '@services/user.service'
import { RowActionsMenuComponent } from 'src/app/shared/row-actions-menu/row-actions-menu.component'

/** What an add asks for: the typed text and the input, so the owner can clear it on success. */
export interface TaxonomyAddEvent {
  value: string
  input: HTMLInputElement
}

/** An inline rename: the chip's item and the text the user left in the field. */
export interface TaxonomyRenameEvent {
  item: string
  value: string
}

/**
 * Plan 321 Phase 3 — one Metadata Manager card for any taxonomy kind: add field, tap chips
 * (edit / delete menu, plan 340), read-only locked chips, optional inline rename. It owns no
 * data rules; the parent decides what add / edit / rename / delete mean for its kind.
 */
@Component({
  selector: 'app-taxonomy-kind-manager',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, RowActionsMenuComponent],
  templateUrl: './taxonomy-kind-manager.component.html',
  styleUrl: './taxonomy-kind-manager.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaxonomyKindManagerComponent {
  //INJECTED
  protected readonly isLoggedIn = inject(UserService).isLoggedIn
  private readonly injector = inject(Injector)

  //INPUTS
  readonly items = input.required<string[]>()
  readonly titleKey = input.required<string>()
  readonly icon = input.required<string>()
  readonly iconClass = input('icon-primary')
  readonly descKey = input<string | null>(null)
  /** Defaults to "<add> <title>...". */
  readonly placeholderKey = input<string | null>(null)
  readonly addLabelKey = input('add')
  /** Defaults to "<no items prefix> <title> <suffix>". */
  readonly emptyKey = input<string | null>(null)
  /** Dictionary key explaining why a chip is read-only, or null when it can be tapped. */
  readonly lockReason = input<(item: string) => string | null>(() => null)
  /** Color for a dot before the chip text (labels), or null for none. */
  readonly dotColor = input<((item: string) => string) | null>(null)
  /** Whether the tap menu offers edit at all (units: delete only). */
  readonly canEdit = input(true)
  /** Edit opens an in-place text field (emits `renamed`) instead of emitting `editRequested`.
   *  Signed out, edit still emits `editRequested` so the parent can ask the user to sign in. */
  readonly inlineRename = input(false)
  /** Initial text of the inline rename field. */
  readonly renameValue = input<(item: string) => string>((item) => item)

  //OUTPUTS
  readonly added = output<TaxonomyAddEvent>()
  readonly editRequested = output<string>()
  readonly renamed = output<TaxonomyRenameEvent>()
  readonly removeRequested = output<string>()

  //SIGNALS
  /** Chip whose tap menu is open. */
  protected readonly menuItem_ = signal<string | null>(null)
  /** Chip being renamed in place. */
  protected readonly editingItem_ = signal<string | null>(null)

  private readonly itemMenu = viewChild.required(RowActionsMenuComponent)
  private readonly renameInput = viewChild<ElementRef<HTMLInputElement>>('renameInput')

  //CREATE
  protected onAdd(inputEl: HTMLInputElement): void {
    this.added.emit({ value: inputEl.value, input: inputEl })
  }

  //READ
  protected onOpenMenu(event: MouseEvent, item: string): void {
    this.menuItem_.set(item)
    this.itemMenu().open(event.currentTarget as HTMLElement)
  }

  //DELETE
  protected onMenuDelete(item: string): void {
    this.itemMenu().close()
    this.removeRequested.emit(item)
  }

  //UPDATE
  protected onMenuEdit(item: string): void {
    this.itemMenu().close()
    if (!this.canEdit()) return
    if (!this.inlineRename() || !this.isLoggedIn()) {
      this.editRequested.emit(item)
      return
    }
    this.editingItem_.set(item)
    afterNextRender(() => this.renameInput()?.nativeElement.select(), { injector: this.injector })
  }

  protected onRenameBlur(item: string, value: string): void {
    this.editingItem_.set(null)
    this.renamed.emit({ item, value })
  }
}
