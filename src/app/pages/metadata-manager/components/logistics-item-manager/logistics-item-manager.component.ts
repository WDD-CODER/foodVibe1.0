import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { TaxonomyStore } from '@services/taxonomy-store.service'
import { LogisticsItemRegistryService, type LogisticsItemTerm } from '@services/logistics-item-registry.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { UserService } from '@services/user.service'
import { AuthModalService } from '@services/auth-modal.service'
import { LoggingService } from '@services/logging.service'
import { BusinessService } from '@services/business.service'
import { PermissionService } from '@services/permission.service'
import { AddItemModalService } from '@services/add-item-modal.service'
import { notifyItemAdded } from 'src/app/core/utils/add-option.util'
import {
  LOGISTICS_ANSWER_TYPES,
  LOGISTICS_LABEL_MAX,
  type LogisticsAnswerType,
  type LogisticsPhase
} from '@schemas/entities'
import type { EnvironmentType } from '@models/venue.model'

/** What the add form holds until it is submitted. */
export interface LogisticsItemDraft {
  text: string
  phase: LogisticsPhase
  section: string
  answerType: LogisticsAnswerType
  environments: EnvironmentType[]
  scope: 'mine' | 'everyone'
}

interface LogisticsItemRow {
  term: LogisticsItemTerm
  shared: boolean
  hidden: boolean
  typeKey: string
  environmentKeys: EnvironmentType[]
  canEdit: boolean
  canRemove: boolean
}

interface LogisticsSectionGroup {
  section: string
  labelKey: string
  rows: LogisticsItemRow[]
}

const ADD_SECTION = '__add_section__'
const PHASES: readonly LogisticsPhase[] = ['intake', 'site_visit']
const ENVIRONMENTS: readonly EnvironmentType[] = ['professional_kitchen', 'outdoor_field', 'client_home', 'popup_venue']
const PHASE_TAB_KEY: Record<LogisticsPhase, string> = {
  intake: 'logistics_tab_intake',
  site_visit: 'logistics_tab_site_visit'
}

/**
 * Plans 523, 581: the Metadata Manager card for the event-logistics checklist (`logisticsItem` terms). Lists the
 * shared and own questions by phase and section; adds, edits, removes (own: `removedAt`; shared: hidden for the
 * business, or `removedAt` for everybody by the platform admin) and restores them, and adds own sections.
 * Every write is one call.
 */
@Component({
  selector: 'app-logistics-item-manager',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, TranslatePipe, CustomSelectComponent, FormFieldComponent],
  templateUrl: './logistics-item-manager.component.html',
  styleUrl: './logistics-item-manager.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LogisticsItemManagerComponent {
  // 1. INJECTED
  private readonly taxonomy = inject(TaxonomyStore)
  private readonly registry = inject(LogisticsItemRegistryService)
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  protected readonly isLoggedIn = inject(UserService).isLoggedIn
  private readonly authModal = inject(AuthModalService)
  private readonly logging = inject(LoggingService)
  private readonly business = inject(BusinessService)
  private readonly permission = inject(PermissionService)
  private readonly addItemModal = inject(AddItemModalService)

  // 2. VIEW CHILDREN
  private readonly formRef = viewChild<ElementRef<HTMLElement>>('addForm')

  // 4. SIGNALS & CONSTANTS
  protected readonly phases = PHASES
  protected readonly environments = ENVIRONMENTS
  protected readonly phaseTabKey = PHASE_TAB_KEY
  protected readonly textMax = LOGISTICS_LABEL_MAX
  protected readonly addSectionValue = ADD_SECTION
  protected readonly phaseOptions = PHASES.map((p) => ({ value: p, label: PHASE_TAB_KEY[p] }))
  protected readonly typeOptions = LOGISTICS_ANSWER_TYPES.map((t) => ({ value: t, label: `logistics_type_${t}` }))
  protected readonly isAdmin = this.taxonomy.isAdmin_

  private readonly phase_ = signal<LogisticsPhase>('intake')
  readonly phase = this.phase_.asReadonly()
  private readonly draft_ = signal<LogisticsItemDraft>({
    text: '',
    phase: 'intake',
    section: 'other',
    answerType: 'status',
    environments: [...ENVIRONMENTS],
    scope: 'mine'
  })
  readonly draft = this.draft_.asReadonly()
  /** Translation key of the inline error under the question field, or null. */
  private readonly error_ = signal<string | null>(null)
  readonly error = this.error_.asReadonly()
  private readonly saving_ = signal(false)
  readonly saving = this.saving_.asReadonly()
  /** The term the form is editing, or null when it adds. */
  private readonly editing_ = signal<LogisticsItemTerm | null>(null)
  readonly editing = this.editing_.asReadonly()
  /** Plan 588: keys of shared questions removed during this visit; they stay dimmed in their section until the page is left. */
  private readonly removedThisVisit_ = signal<Set<string>>(new Set())
  private readonly removedOpen_ = signal(false)
  readonly removedOpen = this.removedOpen_.asReadonly()

  // 5. COMPUTED
  /** The section select's options: built-in, shared and own sections, then the add option last. */
  protected readonly sectionOptions = computed(() => [
    ...this.registry.sections_().map((s) => ({ value: s, label: this.registry.sectionLabel(s) })),
    { value: ADD_SECTION, label: 'add_new_logistics_section' }
  ])

  private readonly isOwner = computed(
    () => !this.isAdmin() && this.permission.can('editSettings', { type: 'businesses' })
  )

  /** The selected phase's items (hidden shared ones dimmed), grouped by section in `registry.sections_()` order. */
  readonly sections = computed<LogisticsSectionGroup[]>(() => {
    const phase = this.phase_()
    const hiddenAt = this.registry.hiddenAt_()
    const visit = this.removedThisVisit_()
    const items = this.registry
      .items_()
      .filter((t) => t.phase === phase)
      .filter((t) => !(this.taxonomy.isShared(t) && hiddenAt.has(t.key) && !visit.has(t.key)))
    return this.registry.sections_().map((section) => ({
      section,
      labelKey: this.registry.sectionLabel(section),
      rows: items
        .filter((t) => t.section === section)
        .map((term) => {
          const shared = this.taxonomy.isShared(term)
          const hidden = shared && hiddenAt.has(term.key)
          return {
            term,
            shared,
            hidden,
            typeKey: `logistics_type_${term.answerType}`,
            environmentKeys: ENVIRONMENTS.filter((e) => term.environments?.includes(e)),
            canEdit: this.taxonomy.canEdit(term) && !hidden,
            canRemove: !hidden && (!shared || this.isAdmin() || this.isOwner())
          }
        })
    }))
  })

  /** Plan 588: the selected phase's removed shared questions, listed behind the small "removed (N)" link. */
  readonly removedRows = computed<LogisticsItemTerm[]>(() => {
    const phase = this.phase_()
    const hiddenAt = this.registry.hiddenAt_()
    return this.registry.items_().filter((t) => t.phase === phase && this.taxonomy.isShared(t) && hiddenAt.has(t.key))
  })

  protected readonly removedLabel = computed(() =>
    this.translation.translate('logistics_removed_count').replace('{{count}}', String(this.removedRows().length))
  )

  // 6. METHODS
  toggleRemoved(): void {
    this.removedOpen_.update((v) => !v)
  }

  requireSignIn(): boolean {
    if (this.isLoggedIn()) return true
    this.userMsg.onSetWarningMsg(this.translation.translate('sign_in_to_use'))
    this.authModal.open('sign-in')
    return false
  }

  //CREATE / UPDATE (the form)
  async onAdd(): Promise<void> {
    await this.onSubmit()
  }

  /** Adds, re-adds a removed own question, or saves the edit. Resolves true when it stored. */
  async onSubmit(): Promise<boolean> {
    if (!this.requireSignIn() || this.saving_()) return false
    const draft = this.draft_()
    const key = draft.text.trim()
    if (!key) return false
    const editing = this.editing_()

    if (!draft.environments.length) {
      this.error_.set('metadata_logistics_env_required')
      return false
    }
    const envs = ENVIRONMENTS.filter((e) => draft.environments.includes(e))
    const environments = envs.length === ENVIRONMENTS.length ? [] : envs

    const removedOwn = editing
      ? undefined
      : this.registry
          .allItems_()
          .find(
            (t) =>
              !this.taxonomy.isShared(t) &&
              !t.foldedAt &&
              !!t.removedAt &&
              t.removedAt > 0 &&
              t.phase === draft.phase &&
              t.key.trim() === key
          )
    const duplicate = this.registry
      .items_()
      .some((t) => t._id !== editing?._id && t.phase === draft.phase && t.key.trim() === key)
    if (duplicate) {
      this.error_.set('metadata_logistics_duplicate')
      return false
    }
    this.error_.set(null)

    this.saving_.set(true)
    const event = editing ? 'update' : 'add'
    try {
      if (editing) {
        await this.taxonomy.update(editing, {
          key,
          phase: draft.phase,
          section: draft.section,
          answerType: draft.answerType,
          environments
        } as never)
        this.userMsg.onSetSuccessMsg(this.translation.translate('metadata_logistics_updated'))
      } else if (removedOwn) {
        await this.taxonomy.update(removedOwn, {
          removedAt: 0,
          section: draft.section,
          answerType: draft.answerType,
          environments
        } as never)
        this.userMsg.onSetSuccessMsg(this.translation.translate('metadata_logistics_added'))
      } else {
        await this.taxonomy.add(
          'logisticsItem',
          key,
          {
            phase: draft.phase,
            section: draft.section,
            answerType: draft.answerType,
            ...(environments.length && { environments })
          } as never,
          { shared: this.isAdmin() && draft.scope === 'everyone' }
        )
        this.userMsg.onSetSuccessMsg(this.translation.translate('metadata_logistics_added'))
      }
      this.editing_.set(null)
      this.draft_.update((d) => ({ ...d, text: '', environments: [...ENVIRONMENTS] }))
      return true
    } catch (err) {
      this.fail(`crud.logistics_items.${event}_error`, `Failed to ${event} logistics item`, err)
      return false
    } finally {
      this.saving_.set(false)
    }
  }

  /** Adds an own (the admin's "everyone": shared) section from the section list's add option. */
  async onAddSection(typed: string): Promise<void> {
    if (!this.requireSignIn()) return
    const result = await this.addItemModal.open({
      title: 'add_new_logistics_section',
      label: 'metadata_logistics_section',
      saveLabel: 'metadata_add',
      initialValue: typed
    })
    const name = (result ?? '').trim().slice(0, LOGISTICS_LABEL_MAX)
    if (!name) return
    const existing = this.registry
      .sections_()
      .find((s) => this.translation.translate(this.registry.sectionLabel(s)).trim() === name)
    if (existing) {
      this.setSection(existing)
      return
    }
    try {
      const created = await this.taxonomy.add(
        'logisticsSection',
        name,
        {},
        { shared: this.isAdmin() && this.draft_().scope === 'everyone' }
      )
      this.setSection(created.key)
      notifyItemAdded(this.userMsg, (k) => this.translation.translate(k), name)
    } catch (err) {
      this.fail('crud.logistics_items.add_section_error', 'Failed to add logistics section', err)
    }
  }

  //EDIT
  /** Loads a term into the form; asks first when the form holds an unsaved question (F9). */
  async onEdit(term: LogisticsItemTerm): Promise<void> {
    if (!this.requireSignIn()) return
    if (this.isDirty()) {
      const choice = await this.confirmModal.openTernary(
        this.translation.translate('metadata_logistics_unsaved_confirm'),
        { variant: 'warning', saveButtonLabel: 'save', saveLabel: 'metadata_logistics_discard' }
      )
      if (choice === 'cancel') return
      if (choice === 'save' && !(await this.onSubmit())) return
    }
    this.editing_.set(term)
    this.phase_.set(term.phase)
    this.draft_.set(this.draftOf(term))
    this.error_.set(null)
    const form = this.formRef()?.nativeElement
    form?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    form?.querySelector<HTMLInputElement>('#logistics-item-text')?.focus()
  }

  cancelEdit(): void {
    this.editing_.set(null)
    this.draft_.update((d) => ({ ...d, text: '', environments: [...ENVIRONMENTS] }))
    this.error_.set(null)
  }

  /** True when the form holds work: typed text when adding, any changed field when editing. */
  isDirty(): boolean {
    const editing = this.editing_()
    const d = this.draft_()
    if (!editing) return d.text.trim() !== ''
    const base = this.draftOf(editing)
    return (
      d.text.trim() !== base.text ||
      d.phase !== base.phase ||
      d.section !== base.section ||
      d.answerType !== base.answerType ||
      d.environments.length !== base.environments.length ||
      base.environments.some((e) => !d.environments.includes(e))
    )
  }

  //REMOVE / RESTORE
  async onRemove(term: LogisticsItemTerm): Promise<void> {
    if (!this.requireSignIn()) return
    if (!this.taxonomy.isShared(term)) {
      const ok = await this.confirmModal.open(this.translation.translate('metadata_logistics_remove_confirm'), {
        variant: 'warning'
      })
      if (ok) await this.run('remove', () => this.taxonomy.update(term, { removedAt: Date.now() } as never))
      return
    }
    if (this.isAdmin()) {
      const choice = await this.confirmModal.openTernary(
        this.translation.translate('metadata_logistics_remove_scope_confirm'),
        {
          variant: 'warning',
          saveButtonLabel: 'metadata_logistics_scope_everyone',
          saveLabel: 'metadata_logistics_scope_mine'
        }
      )
      if (choice === 'save')
        await this.run('remove', () => this.taxonomy.update(term, { removedAt: Date.now() } as never))
      else if (choice === 'confirm') await this.hide(term.key)
      return
    }
    if (!this.isOwner()) return
    const ok = await this.confirmModal.open(this.translation.translate('metadata_logistics_hide_confirm'))
    if (ok) await this.hide(term.key)
  }

  async onRestore(term: LogisticsItemTerm): Promise<void> {
    if (!this.requireSignIn()) return
    const keys = [...this.registry.hiddenAt_().keys()].filter((k) => k !== term.key)
    await this.run('restore', () => this.business.updateHiddenLogisticsKeys(keys))
    this.removedThisVisit_.update((set) => new Set([...set].filter((k) => k !== term.key)))
  }

  //UPDATE (the draft)
  setText(text: string): void {
    this.draft_.update((d) => ({ ...d, text }))
    if (this.error_()) this.error_.set(null)
  }

  setPhase(value: string): void {
    if (!PHASES.includes(value as LogisticsPhase)) return
    this.draft_.update((d) => ({ ...d, phase: value as LogisticsPhase }))
    if (this.error_()) this.error_.set(null)
  }

  setSection(value: string): void {
    if (value === ADD_SECTION || !this.registry.sections_().includes(value)) return
    this.draft_.update((d) => ({ ...d, section: value }))
  }

  setAnswerType(value: string): void {
    if (!LOGISTICS_ANSWER_TYPES.includes(value as LogisticsAnswerType)) return
    this.draft_.update((d) => ({ ...d, answerType: value as LogisticsAnswerType }))
  }

  toggleEnvironment(env: EnvironmentType, on: boolean): void {
    this.draft_.update((d) => ({
      ...d,
      environments: on ? [...d.environments.filter((e) => e !== env), env] : d.environments.filter((e) => e !== env)
    }))
    if (this.error_() === 'metadata_logistics_env_required') this.error_.set(null)
  }

  setScope(scope: 'mine' | 'everyone'): void {
    this.draft_.update((d) => ({ ...d, scope }))
  }

  // UI handlers
  /** Selecting a tab shows that phase's items and makes it the add form's phase. */
  selectPhase(phase: LogisticsPhase): void {
    this.phase_.set(phase)
    this.setPhase(phase)
  }

  // 7. PRIVATE
  private draftOf(term: LogisticsItemTerm): LogisticsItemDraft {
    const envs = ENVIRONMENTS.filter((e) => term.environments?.includes(e))
    return {
      text: term.key,
      phase: term.phase,
      section: term.section,
      answerType: term.answerType,
      environments: envs.length ? envs : [...ENVIRONMENTS],
      scope: this.taxonomy.isShared(term) ? 'everyone' : 'mine'
    }
  }

  private hide(key: string): Promise<void> {
    const keys = [...this.registry.hiddenAt_().keys()].filter((k) => k !== key)
    this.removedThisVisit_.update((set) => new Set(set).add(key))
    return this.run('hide', () => this.business.updateHiddenLogisticsKeys([...keys, key]))
  }

  private async run(event: string, action: () => Promise<unknown>): Promise<void> {
    try {
      await action()
    } catch (err) {
      this.fail(`crud.logistics_items.${event}_error`, `Failed to ${event} logistics item`, err)
    }
  }

  private fail(event: string, message: string, err: unknown): void {
    this.logging.error({ event, message, context: { err } })
    this.userMsg.onSetErrorMsg(this.taxonomy.errorMessage(err) ?? this.translation.translate('server_error'))
  }
}
