import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { TaxonomyStore, TermInUseError } from '@services/taxonomy-store.service'
import { LogisticsItemRegistryService, type LogisticsItemTerm } from '@services/logistics-item-registry.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { UserService } from '@services/user.service'
import { AuthModalService } from '@services/auth-modal.service'
import { LoggingService } from '@services/logging.service'
import {
  LOGISTICS_ANSWER_TYPES,
  LOGISTICS_LABEL_MAX,
  LOGISTICS_SECTIONS,
  type LogisticsAnswerType,
  type LogisticsPhase,
  type LogisticsSection
} from '@schemas/entities'
import type { EnvironmentType } from '@models/venue.model'

/** What the add form holds until it is submitted. */
export interface LogisticsItemDraft {
  text: string
  phase: LogisticsPhase
  section: LogisticsSection
  answerType: LogisticsAnswerType
  environments: EnvironmentType[]
  shared: boolean
}

interface LogisticsItemRow {
  term: LogisticsItemTerm
  shared: boolean
  typeKey: string
  environmentKeys: EnvironmentType[]
}

interface LogisticsSectionGroup {
  section: LogisticsSection
  labelKey: string
  rows: LogisticsItemRow[]
}

const PHASES: readonly LogisticsPhase[] = ['intake', 'site_visit']
const ENVIRONMENTS: readonly EnvironmentType[] = ['professional_kitchen', 'outdoor_field', 'client_home', 'popup_venue']
const PHASE_TAB_KEY: Record<LogisticsPhase, string> = {
  intake: 'logistics_tab_intake',
  site_visit: 'logistics_tab_site_visit'
}

/**
 * Plan 523: the Metadata Manager card for the event-logistics checklist (`logisticsItem` terms). Lists the shared
 * questions (locked) and the business's own (removable) by phase and section, and adds an own question with its
 * phase, section, answer type and environments. Every write is one `TaxonomyStore.add / remove`.
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

  // 4. SIGNALS & CONSTANTS
  protected readonly phases = PHASES
  protected readonly environments = ENVIRONMENTS
  protected readonly phaseTabKey = PHASE_TAB_KEY
  protected readonly textMax = LOGISTICS_LABEL_MAX
  protected readonly phaseOptions = PHASES.map((p) => ({ value: p, label: PHASE_TAB_KEY[p] }))
  protected readonly sectionOptions = LOGISTICS_SECTIONS.map((s) => ({ value: s, label: `logistics_section_${s}` }))
  protected readonly typeOptions = LOGISTICS_ANSWER_TYPES.map((t) => ({ value: t, label: `logistics_type_${t}` }))
  protected readonly isAdmin = this.taxonomy.isAdmin_

  private readonly phase_ = signal<LogisticsPhase>('intake')
  readonly phase = this.phase_.asReadonly()
  private readonly draft_ = signal<LogisticsItemDraft>({
    text: '',
    phase: 'intake',
    section: 'other',
    answerType: 'status',
    environments: [],
    shared: false
  })
  readonly draft = this.draft_.asReadonly()
  /** Translation key of the inline error under the question field, or null. */
  private readonly error_ = signal<string | null>(null)
  readonly error = this.error_.asReadonly()
  private readonly saving_ = signal(false)
  readonly saving = this.saving_.asReadonly()

  // 5. COMPUTED
  /** The selected phase's items, grouped by section in `LOGISTICS_SECTIONS` order (every section, empty or not). */
  readonly sections = computed<LogisticsSectionGroup[]>(() => {
    const phase = this.phase_()
    const items = this.registry.items_().filter((t) => t.phase === phase)
    return LOGISTICS_SECTIONS.map((section) => ({
      section,
      labelKey: `logistics_section_${section}`,
      rows: items
        .filter((t) => t.section === section)
        .map((term) => ({
          term,
          shared: this.taxonomy.isShared(term),
          typeKey: `logistics_type_${term.answerType}`,
          environmentKeys: ENVIRONMENTS.filter((e) => term.environments?.includes(e))
        }))
    }))
  })

  // 6. METHODS
  requireSignIn(): boolean {
    if (this.isLoggedIn()) return true
    this.userMsg.onSetWarningMsg(this.translation.translate('sign_in_to_use'))
    this.authModal.open('sign-in')
    return false
  }

  //CREATE
  async onAdd(): Promise<void> {
    if (!this.requireSignIn() || this.saving_()) return
    const draft = this.draft_()
    const key = draft.text.trim()
    if (!key) return

    const duplicate = this.registry.items_().some((t) => t.phase === draft.phase && t.key.trim() === key)
    if (duplicate) {
      this.error_.set('metadata_logistics_duplicate')
      return
    }
    this.error_.set(null)

    const envs = ENVIRONMENTS.filter((e) => draft.environments.includes(e))
    this.saving_.set(true)
    try {
      await this.taxonomy.add(
        'logisticsItem',
        key,
        {
          phase: draft.phase,
          section: draft.section,
          answerType: draft.answerType,
          ...(envs.length && { environments: envs })
        },
        { shared: draft.shared && this.isAdmin() }
      )
      this.draft_.update((d) => ({ ...d, text: '', environments: [] }))
      this.userMsg.onSetSuccessMsg(this.translation.translate('metadata_logistics_added'))
    } catch (err) {
      this.logging.error({
        event: 'crud.logistics_items.add_error',
        message: 'Failed to add logistics item',
        context: { err }
      })
      this.userMsg.onSetErrorMsg(this.translation.translate('server_error'))
    } finally {
      this.saving_.set(false)
    }
  }

  //DELETE
  async onRemove(term: LogisticsItemTerm): Promise<void> {
    if (!this.requireSignIn()) return
    const confirmed = await this.confirmModal.open(this.translation.translate('metadata_logistics_remove_confirm'), {
      variant: 'warning'
    })
    if (!confirmed) return

    try {
      await this.taxonomy.remove(term)
    } catch (err) {
      if (err instanceof TermInUseError) {
        this.userMsg.onSetErrorMsg(this.translation.translate('metadata_logistics_in_use'))
        return
      }
      this.logging.error({
        event: 'crud.logistics_items.remove_error',
        message: 'Failed to remove logistics item',
        context: { err }
      })
      this.userMsg.onSetErrorMsg(this.translation.translate('server_error'))
    }
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
    if (!LOGISTICS_SECTIONS.includes(value as LogisticsSection)) return
    this.draft_.update((d) => ({ ...d, section: value as LogisticsSection }))
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
  }

  setShared(on: boolean): void {
    this.draft_.update((d) => ({ ...d, shared: on }))
  }

  // UI handlers
  /** Selecting a tab shows that phase's items and makes it the add form's phase. */
  selectPhase(phase: LogisticsPhase): void {
    this.phase_.set(phase)
    this.setPhase(phase)
  }
}
