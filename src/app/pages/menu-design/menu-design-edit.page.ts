import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild
} from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { type MenuDesign, type MenuDesignDraft, menuDesignDraftSchema } from '@schemas/entities/menu-design.schema'
import { MENU_BASE_TEMPLATES, baseDesign } from '@schemas/menu-design/menu-base-templates'
import { BusinessService } from '@services/business.service'
import { LoggingService } from '@services/logging.service'
import { MENU_DESIGN_NAME_MAX, MenuDesignDataService } from '@services/menu-design-data.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { BUSINESS_NAME_MAX, formFromDesign } from '@utils/menu-design-form.util'
import { useSavingState } from '@utils/saving-state.util'
import { refusalShownToUser } from '@utils/server-refusal.util'
import { useUnsavedChanges } from '@utils/unsaved-changes'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { MenuDesignerComponent } from 'src/app/shared/menu-designer/menu-designer.component'
import { PageHeaderComponent } from 'src/app/shared/page-header/page-header.component'

/** Plan 765: one design, new (`menu-design/new?base=<id>`) or saved (`menu-design/:id`): its name and its look. */
@Component({
  selector: 'app-menu-design-edit-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    LucideAngularModule,
    TranslatePipe,
    PageHeaderComponent,
    FormFieldComponent,
    MenuDesignerComponent,
    EmptyStateComponent,
    LoaderComponent
  ],
  templateUrl: './menu-design-edit.page.html',
  styleUrl: './menu-design-edit.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuDesignEditPage {
  // 1. INJECTED
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly designs = inject(MenuDesignDataService)
  private readonly business = inject(BusinessService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly logging = inject(LoggingService)
  private readonly injector = inject(Injector)

  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput')

  // 4. SIGNALS & CONSTANTS
  protected readonly nameMax = MENU_DESIGN_NAME_MAX
  private readonly id = this.route.snapshot.paramMap.get('id')
  readonly nameControl = new FormControl('', { nonNullable: true })
  readonly design_ = signal<MenuDesignDraft>(baseDesign('classic'))
  /** The saved design being edited; null for a new one, and until it is found. */
  protected readonly existing_ = signal<MenuDesign | null>(null)
  protected readonly nameError_ = signal<string | null>(null)
  protected readonly isUploading_ = signal(false)
  private readonly saving = useSavingState()
  protected readonly isSaving_ = this.saving.isSaving_
  private readonly unsaved = useUnsavedChanges({
    form: () => this.nameControl,
    snapshot: () => JSON.stringify([this.nameControl.value, this.design_()])
  })

  // 5. COMPUTED
  /** Why there is nothing to edit: the list did not load, or it holds no such design. */
  protected readonly problem = computed(() => {
    if (!this.id || this.existing_()) return null
    return this.designs.loadFailed_() ? 'failed' : 'missing'
  })

  protected readonly isEditing = this.id !== null

  constructor() {
    this.load_()
  }

  // 6. METHODS
  async onSave(): Promise<void> {
    if (this.isSaving_() || this.isUploading_() || this.problem()) return
    const name = this.nameControl.value.trim()
    if (!name) {
      this.nameError_.set('field_required')
      return
    }
    this.nameError_.set(null)
    // The browser checks the look first, so a bad value never reaches the server.
    const parsed = menuDesignDraftSchema.safeParse(this.design_())
    if (!parsed.success) {
      this.logging.error({
        event: 'menu_design.invalid_draft',
        message: 'Menu design draft failed its schema',
        context: { issues: parsed.error.issues.map((issue) => issue.path.join('.')) }
      })
      this.userMsg.onSetErrorMsg(this.translation.translate('save_failed'))
      return
    }
    await this.saving.withSaving(async () => {
      try {
        const existing = this.existing_()
        if (existing) await this.designs.updateDesign({ ...existing, ...parsed.data, name })
        else await this.designs.addDesign({ ...parsed.data, name })
        this.unsaved.markSaved()
        this.userMsg.onSetSuccessMsg(this.translation.translate('menu_design_saved'))
        await this.router.navigate(['/menu-design'])
      } catch (err) {
        // The data service logged it; the draft stays on screen.
        if (!refusalShownToUser(err)) this.userMsg.onSetErrorMsg(this.translation.translate('save_failed'))
      }
    })
  }

  hasRealChanges(): boolean {
    return this.unsaved.hasChanges()
  }

  protected async onRetry(): Promise<void> {
    await this.designs.ensureLoaded()
    this.load_()
  }

  protected onCancel(): void {
    void this.router.navigate(['/menu-design'])
  }

  /** Fills the page from the saved design, or from the picked base look, and takes that as "nothing changed yet". */
  private load_(): void {
    if (this.id) {
      const found = this.designs.allDesigns_().find((design) => design._id === this.id)
      if (!found) return
      this.existing_.set(found)
      this.nameControl.setValue(found.name)
      this.design_.set(formFromDesign(found))
    } else {
      const asked = this.route.snapshot.queryParamMap.get('base')
      const draft = baseDesign(MENU_BASE_TEMPLATES.find((base) => base === asked) ?? 'classic')
      const businessName = this.business.business_()?.name.slice(0, BUSINESS_NAME_MAX)
      if (businessName) draft.fixedTexts.businessName = businessName
      this.nameControl.setValue(this.translation.translate('menu_design_new'))
      this.design_.set(draft)
    }
    this.unsaved.markSaved()
    afterNextRender(() => this.nameInput()?.nativeElement.focus(), { injector: this.injector })
  }
}
