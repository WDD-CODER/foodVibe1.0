import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { KnowledgeItemDataService } from '@services/knowledge-item-data.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { KNOWLEDGE_TOPICS, type KnowledgeItem, type KnowledgeTopic } from '@models/knowledge-item.model'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { ListShellComponent } from 'src/app/shared/list-shell/list-shell.component'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { ModalShellComponent } from 'src/app/shared/modal-shell/modal-shell.component'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { InputClearComponent } from 'src/app/shared/input-clear/input-clear.component'

export type KnowledgeFilter = 'all' | 'drafts' | 'approved'
type ImportTab = 'text' | 'url'

const MAX_VARIATIONS = 5
const QUESTION_MAX = 200
const ANSWER_MAX = 1200
const IMPORT_TEXT_MAX = 20000

/** Server error codes of the import, mapped to dictionary keys. */
const IMPORT_ERROR_KEYS: Record<string, string> = {
  TEXT_TOO_LONG: 'knowledge_import_too_long',
  TEXT_OR_URL: 'knowledge_import_text_or_url'
}

/** Plan 554: what the business knows about itself — grouped by topic, owner adds / edits / imports / approves. */
@Component({
  selector: 'app-knowledge-page',
  standalone: true,
  imports: [
    FormsModule,
    LucideAngularModule,
    TranslatePipe,
    ListShellComponent,
    EmptyStateComponent,
    ModalShellComponent,
    FormFieldComponent,
    CustomSelectComponent,
    InputClearComponent
  ],
  templateUrl: './knowledge.page.html',
  styleUrl: './knowledge.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KnowledgePage {
  private readonly data = inject(KnowledgeItemDataService)
  private readonly permission = inject(PermissionService)
  private readonly translation = inject(TranslationService)
  private readonly userMsg = inject(UserMsgService)
  private readonly confirmModal = inject(ConfirmModalService)

  protected readonly isOwner_ = this.permission.isOwner_
  protected readonly topics = KNOWLEDGE_TOPICS
  protected readonly questionMax = QUESTION_MAX
  protected readonly answerMax = ANSWER_MAX
  protected readonly importTextMax = IMPORT_TEXT_MAX
  protected readonly maxVariations = MAX_VARIATIONS
  protected readonly filters: KnowledgeFilter[] = ['all', 'drafts', 'approved']

  protected readonly topicOptions = KNOWLEDGE_TOPICS.map((t) => ({ value: t, label: 'knowledge_topic_' + t }))

  protected readonly filter_ = signal<KnowledgeFilter>('all')
  protected readonly searchQuery_ = signal('')
  protected readonly selected_ = signal<Set<string>>(new Set())
  protected readonly isBusy_ = signal(false)

  // Add / edit dialog
  protected readonly isFormOpen_ = signal(false)
  protected readonly editing_ = signal<KnowledgeItem | null>(null)
  protected readonly formTopic_ = signal<KnowledgeTopic>('faq')
  protected readonly formQuestion_ = signal('')
  protected readonly formAnswer_ = signal('')
  protected readonly formPublic_ = signal(true)
  protected readonly formVariations_ = signal<string[]>([])
  protected readonly isFormTouched_ = signal(false)
  protected readonly isFormValid_ = computed(
    () => this.formQuestion_().trim().length > 0 && this.formAnswer_().trim().length > 0
  )

  // Import dialog
  protected readonly isImportOpen_ = signal(false)
  protected readonly importTab_ = signal<ImportTab>('text')
  protected readonly importText_ = signal('')
  protected readonly importUrl_ = signal('')
  protected readonly isImporting_ = signal(false)
  protected readonly importError_ = signal<string | null>(null)

  protected readonly allItems_ = computed(() => this.data.allItems_().filter((i) => !i.deletedAt))
  protected readonly isEmptyList_ = computed(() => this.allItems_().length === 0)

  protected readonly filteredItems_ = computed(() => {
    const q = this.searchQuery_().trim().toLowerCase()
    const filter = this.filter_()
    let list = this.allItems_()
    if (filter === 'drafts') list = list.filter((i) => i.status === 'draft')
    if (filter === 'approved') list = list.filter((i) => i.status === 'approved')
    if (q) {
      list = list.filter((i) =>
        [i.question, i.answer, ...(i.variations ?? [])].some((text) => text.toLowerCase().includes(q))
      )
    }
    return list
  })

  /** The filtered items grouped by topic, in the fixed topic order; empty topics are left out. */
  protected readonly groups_ = computed(() =>
    KNOWLEDGE_TOPICS.map((topic) => ({
      topic,
      items: this.filteredItems_().filter((i) => i.topic === topic)
    })).filter((g) => g.items.length > 0)
  )

  protected readonly draftsInView_ = computed(() => this.filteredItems_().filter((i) => i.status === 'draft'))

  protected setFilter(filter: KnowledgeFilter): void {
    this.filter_.set(filter)
  }

  protected onClearSearch(input: HTMLInputElement): void {
    this.searchQuery_.set('')
    input.focus()
  }

  // ---- selection and approve ----

  protected toggleSelected(id: string): void {
    this.selected_.update((set) => {
      const next = new Set(set)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  protected async approveSelected(): Promise<void> {
    await this.approve([...this.selected_()])
  }

  protected async approveAllDrafts(): Promise<void> {
    await this.approve(this.draftsInView_().map((i) => i._id))
  }

  private async approve(ids: string[]): Promise<void> {
    if (!ids.length || this.isBusy_()) return
    this.isBusy_.set(true)
    try {
      const n = await this.data.approve(ids)
      this.selected_.set(new Set())
      this.userMsg.onSetSuccessMsg(this.translation.translate('knowledge_approved_n').replace('{{n}}', String(n)))
    } catch {
      this.userMsg.onSetErrorMsg(this.translation.translate('knowledge_error'))
    } finally {
      this.isBusy_.set(false)
    }
  }

  // ---- add / edit / delete ----

  protected openAdd(): void {
    this.editing_.set(null)
    this.formTopic_.set('faq')
    this.formQuestion_.set('')
    this.formAnswer_.set('')
    this.formPublic_.set(true)
    this.formVariations_.set([])
    this.isFormTouched_.set(false)
    this.isFormOpen_.set(true)
  }

  protected openEdit(item: KnowledgeItem): void {
    this.editing_.set(item)
    this.formTopic_.set(item.topic)
    this.formQuestion_.set(item.question)
    this.formAnswer_.set(item.answer)
    this.formPublic_.set(item.visibility === 'public')
    this.formVariations_.set([...(item.variations ?? [])])
    this.isFormTouched_.set(false)
    this.isFormOpen_.set(true)
  }

  protected closeForm(): void {
    this.isFormOpen_.set(false)
  }

  protected addVariation(): void {
    if (this.formVariations_().length >= MAX_VARIATIONS) return
    this.formVariations_.update((v) => [...v, ''])
  }

  protected setVariation(index: number, value: string): void {
    this.formVariations_.update((v) => v.map((x, i) => (i === index ? value : x)))
  }

  protected removeVariation(index: number): void {
    this.formVariations_.update((v) => v.filter((_, i) => i !== index))
  }

  protected async saveForm(): Promise<void> {
    this.isFormTouched_.set(true)
    if (!this.isFormValid_() || this.isBusy_()) return
    const variations = this.formVariations_()
      .map((v) => v.trim())
      .filter(Boolean)
    const fields = {
      topic: this.formTopic_(),
      question: this.formQuestion_().trim(),
      answer: this.formAnswer_().trim(),
      visibility: this.formPublic_() ? ('public' as const) : ('internal' as const),
      ...(variations.length ? { variations } : {})
    }
    this.isBusy_.set(true)
    try {
      const current = this.editing_()
      if (current) {
        const { variations: _old, ...rest } = current
        await this.data.updateItem({ ...rest, ...fields })
      } else {
        const body = { ...fields, status: 'approved', source: 'manual' } as Omit<KnowledgeItem, '_id'>
        await this.data.addItem(body)
      }
      this.isFormOpen_.set(false)
    } catch {
      this.userMsg.onSetErrorMsg(this.translation.translate('knowledge_error'))
    } finally {
      this.isBusy_.set(false)
    }
  }

  protected async remove(item: KnowledgeItem): Promise<void> {
    const confirmed = await this.confirmModal.open('knowledge_delete_confirm', { variant: 'danger' })
    if (!confirmed) return
    try {
      await this.data.removeItem(item._id)
      this.selected_.update((set) => {
        const next = new Set(set)
        next.delete(item._id)
        return next
      })
    } catch {
      this.userMsg.onSetErrorMsg(this.translation.translate('knowledge_error'))
    }
  }

  // ---- import ----

  protected openImport(): void {
    this.importTab_.set('text')
    this.importText_.set('')
    this.importUrl_.set('')
    this.importError_.set(null)
    this.isImportOpen_.set(true)
  }

  protected closeImport(): void {
    if (!this.isImporting_()) this.isImportOpen_.set(false)
  }

  protected setImportTab(tab: ImportTab): void {
    this.importTab_.set(tab)
    this.importError_.set(null)
  }

  protected canImport(): boolean {
    const value = this.importTab_() === 'text' ? this.importText_() : this.importUrl_()
    return value.trim().length > 0 && !this.isImporting_()
  }

  protected async submitImport(): Promise<void> {
    if (!this.canImport()) return
    this.isImporting_.set(true)
    this.importError_.set(null)
    try {
      const source =
        this.importTab_() === 'text' ? { text: this.importText_().trim() } : { url: this.importUrl_().trim() }
      const { created, dropped } = await this.data.importDrafts(source)
      this.isImportOpen_.set(false)
      this.filter_.set('drafts')
      this.userMsg.onSetSuccessMsg(
        this.translation
          .translate('knowledge_import_done')
          .replace('{{n}}', String(created))
          .replace('{{dropped}}', String(dropped))
      )
    } catch (err) {
      this.importError_.set(this.importErrorKey(err))
    } finally {
      this.isImporting_.set(false)
    }
  }

  private importErrorKey(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const code = (err.error as { error?: string } | null)?.error
      if (code && IMPORT_ERROR_KEYS[code]) return IMPORT_ERROR_KEYS[code]
      if (err.status === 502 || err.status === 422) return 'knowledge_import_fetch_failed'
    }
    return 'knowledge_error'
  }
}
