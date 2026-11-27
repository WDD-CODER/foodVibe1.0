import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  model,
  output,
  signal
} from '@angular/core'
import { DOCUMENT, NgTemplateOutlet } from '@angular/common'
import { firstValueFrom } from 'rxjs'
import { LucideAngularModule } from 'lucide-angular'
import type { MenuDesignDraft } from '@schemas/entities/menu-design.schema'
import { SAMPLE_MENU_DOC } from '@schemas/menu-design/menu-doc'
import { MENU_FONTS, MENU_FONT_IDS, type MenuFontId } from '@schemas/menu-design/menu-fonts'
import { designCssVars } from '@schemas/menu-design/menu-template'
import { MENU_TEXTURES, type MenuTextureId } from '@schemas/menu-design/menu-textures'
import { CloudinaryService } from '@services/cloudinary.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { downscaleImage } from '@utils/downscale-image.util'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import {
  BUSINESS_NAME_MAX,
  CONTACT_LINE_MAX,
  FRAME_WIDTH_MAX,
  MENU_COLOR_KEYS,
  VEIL_MAX,
  designFromForm,
  formFromDesign,
  isHexColor,
  type MenuColorKey,
  type MenuDesignForm
} from '@utils/menu-design-form.util'
import { menuFontFamily, menuFontsHref } from '@utils/menu-fonts-link.util'
import { CounterComponent } from '../counter/counter.component'
import { FormFieldComponent } from '../form-field/form-field.component'
import { LoaderComponent } from '../loader/loader.component'
import { MenuPreviewComponent } from '../menu-preview/menu-preview.component'

/** The longest side of an uploaded picture, in pixels. */
export const BACKGROUND_MAX_EDGE = 2400
export const LOGO_MAX_EDGE = 800

/** Marks the one stylesheet link of the curated fonts in `document.head`. */
const FONTS_LINK_MARK = 'data-menu-fonts'

type UploadSlot = 'background' | 'logo'

export interface ChipOption {
  value: string
  labelKey: string
  checked: boolean
  pick: () => void
}

/** One choice of one value, drawn as a group of radio chips. */
export interface ChipPicker {
  id: string
  labelKey: string
  options: ChipOption[]
}

let nextDesignerId = 0

/**
 * Plan 765: every control that sets how a menu looks, beside the sample menu drawn in that look. It changes the
 * `design` it is given and never saves: its host (the design page, later others) decides what to do with it.
 */
@Component({
  selector: 'app-menu-designer',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    LucideAngularModule,
    TranslatePipe,
    CounterComponent,
    FormFieldComponent,
    LoaderComponent,
    MenuPreviewComponent
  ],
  templateUrl: './menu-designer.component.html',
  styleUrl: './menu-designer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuDesignerComponent {
  // 1. INJECTED
  private readonly cloudinary = inject(CloudinaryService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly logging = inject(LoggingService)
  private readonly document_ = inject(DOCUMENT)

  // 2. INPUTS
  readonly design = model.required<MenuDesignDraft>()
  readonly sampleDoc = input(SAMPLE_MENU_DOC)

  // 3. OUTPUTS
  /** True while a picture is on its way up, so the host can hold its save. */
  readonly uploading = output<boolean>()

  // 4. SIGNALS & CONSTANTS
  protected readonly uid = `menu-designer-${++nextDesignerId}`
  protected readonly frameWidthMax = FRAME_WIDTH_MAX
  protected readonly veilMaxPct = VEIL_MAX * 100
  protected readonly businessNameMax = BUSINESS_NAME_MAX
  protected readonly contactLineMax = CONTACT_LINE_MAX
  protected readonly fonts = MENU_FONTS.map((font) => ({
    id: font.id,
    family: font.family,
    cssFamily: menuFontFamily(font)
  }))
  protected readonly fontSlots: readonly (keyof MenuDesignDraft['fonts'])[] = ['title', 'section', 'dish']
  private readonly uploads_ = signal<readonly UploadSlot[]>([])
  /** The image kind was picked and there is no picture yet: the design keeps its old background until one arrives. */
  private readonly isAwaitingImage_ = signal(false)
  /** Colour texts that are not a colour (yet), by field: shown with an error and not applied. */
  private readonly hexDrafts_ = signal<Partial<Record<MenuColorKey, string>>>({})
  private isDestroyed_ = false

  // 5. COMPUTED
  protected readonly shownKind = computed(() => (this.isAwaitingImage_() ? 'image' : this.design().background.kind))

  protected readonly isBackgroundUploading = computed(() => this.uploads_().includes('background'))
  protected readonly isLogoUploading = computed(() => this.uploads_().includes('logo'))

  protected readonly veilPct = computed(() => Math.round(this.design().background.veil * 100))

  protected readonly colorFields = computed(() => {
    const colors = this.design().colors
    const drafts = this.hexDrafts_()
    return MENU_COLOR_KEYS.map((key) => ({
      key,
      labelKey: `menu_design_color_${key}`,
      picker: colors[key].toLowerCase(),
      text: drafts[key] ?? colors[key],
      isInvalid: drafts[key] !== undefined
    }))
  })

  protected readonly kindOptions = computed(() =>
    (['color', 'texture', 'image'] as const).map((kind) => ({
      value: kind,
      labelKey: `menu_design_kind_${kind}`,
      hintKey: `menu_design_kind_hint_${kind}`,
      hintId: `${this.uid}-kind-hint-${kind}`,
      checked: this.shownKind() === kind
    }))
  )

  protected readonly textureOptions = computed(() => {
    const design = this.design()
    return MENU_TEXTURES.map(({ id }) => ({
      id,
      labelKey: `menu_design_texture_${id}`,
      checked: design.background.textureId === id,
      swatch: designCssVars({
        ...design,
        background: { kind: 'texture', textureId: id, imageFit: 'cover', veil: 0 }
      })['--md-bg']
    }))
  })

  protected readonly fitPicker = computed(() =>
    this.picker_('fit', 'menu_design_fit', ['cover', 'tile'], this.design().background.imageFit, (imageFit) =>
      this.updateBackground_({ imageFit })
    )
  )

  protected readonly frameStylePicker = computed(() =>
    this.picker_(
      'frame',
      'menu_design_frame',
      ['none', 'line', 'double', 'rounded', 'ornament'],
      this.design().frame.style,
      (style) => this.update_({ frame: { ...this.design().frame, style } })
    )
  )

  protected readonly insetPicker = computed(() =>
    this.picker_('inset', 'menu_design_inset', ['narrow', 'normal', 'wide'], this.design().frame.inset, (inset) =>
      this.update_({ frame: { ...this.design().frame, inset } })
    )
  )

  protected readonly dividerPicker = computed(() =>
    this.picker_(
      'divider',
      'menu_design_divider',
      ['none', 'line', 'dots', 'ornament'],
      this.design().divider,
      (divider) => this.update_({ divider })
    )
  )

  protected readonly logoSizePicker = computed(() =>
    this.picker_(
      'logo-size',
      'menu_design_size',
      ['s', 'm', 'l'],
      this.design().logo.size,
      (size) => this.update_({ logo: { ...this.design().logo, size } }),
      'menu_design_logo_size'
    )
  )

  protected readonly placementPicker = computed(() =>
    this.picker_('placement', 'menu_design_placement', ['top', 'none'], this.design().logo.placement, (placement) =>
      this.update_({ logo: { ...this.design().logo, placement } })
    )
  )

  protected readonly layoutPickers = computed(() => {
    const layout = this.design().layout
    const sizes = ['s', 'm', 'l'] as const
    return [
      this.picker_('align', 'menu_design_align', ['center', 'start'], layout.align, (align) =>
        this.updateLayout_({ align })
      ),
      this.picker_('density', 'menu_design_density', ['compact', 'normal', 'airy'], layout.density, (density) =>
        this.updateLayout_({ density })
      ),
      this.picker_(
        'title-size',
        'menu_design_size',
        sizes,
        layout.titleSize,
        (titleSize) => this.updateLayout_({ titleSize }),
        'menu_design_title_size'
      ),
      this.picker_(
        'section-size',
        'menu_design_size',
        sizes,
        layout.sectionSize,
        (sectionSize) => this.updateLayout_({ sectionSize }),
        'menu_design_section_size'
      ),
      this.picker_(
        'dish-size',
        'menu_design_size',
        sizes,
        layout.dishSize,
        (dishSize) => this.updateLayout_({ dishSize }),
        'menu_design_dish_size'
      )
    ]
  })

  constructor() {
    this.loadFonts_()
    inject(DestroyRef).onDestroy(() => (this.isDestroyed_ = true))
  }

  // 6. METHODS
  protected onImagePicked(slot: UploadSlot, event: Event): void {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    // Emptied so picking the same file again is a change.
    input.value = ''
    if (file) void this.uploadImage(slot, file)
  }

  /** Shrinks the picture, uploads it and puts its address into the design. A failure is a message; nothing changes. */
  async uploadImage(slot: UploadSlot, file: File): Promise<void> {
    if (this.uploads_().includes(slot)) return
    this.setUploads_([...this.uploads_(), slot])
    try {
      const small = await downscaleImage(file, slot === 'background' ? BACKGROUND_MAX_EDGE : LOGO_MAX_EDGE)
      const url = await firstValueFrom(this.cloudinary.upload(small))
      if (this.isDestroyed_) return
      if (slot === 'logo') {
        this.update_({ logo: { ...this.design().logo, url } })
      } else if (this.shownKind() === 'image') {
        this.isAwaitingImage_.set(false)
        this.updateBackground_({ kind: 'image', imageUrl: url })
      } else {
        // Another background was picked while the picture was going up: keep the picture, not the kind.
        this.updateBackground_({ imageUrl: url })
      }
    } catch (err) {
      this.logging.error({
        event: 'menu_design.upload_error',
        message: 'Menu design picture upload failed',
        context: { err }
      })
      this.userMsg.onSetErrorMsg(this.translation.translate('image_upload_failed'))
    } finally {
      this.setUploads_(this.uploads_().filter((s) => s !== slot))
    }
  }

  protected onLogoRemove(): void {
    const { url: _url, ...logo } = this.design().logo
    this.update_({ logo })
  }

  protected onFontPick(slot: keyof MenuDesignDraft['fonts'], id: MenuFontId): void {
    this.update_({ fonts: { ...this.design().fonts, [slot]: id } })
  }

  protected onColorPick(key: MenuColorKey, event: Event): void {
    this.applyColor_(key, (event.target as HTMLInputElement).value)
  }

  protected onColorType(key: MenuColorKey, event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim()
    if (isHexColor(value)) {
      this.applyColor_(key, value)
    } else {
      this.hexDrafts_.update((drafts) => ({ ...drafts, [key]: value }))
    }
  }

  protected onKindPick(kind: MenuDesignDraft['background']['kind']): void {
    this.isAwaitingImage_.set(kind === 'image' && !this.design().background.imageUrl)
    this.updateBackground_({ kind })
  }

  protected onTexturePick(textureId: MenuTextureId): void {
    this.updateBackground_({ kind: 'texture', textureId })
  }

  protected onVeilInput(event: Event): void {
    this.updateBackground_({ veil: Number((event.target as HTMLInputElement).value) / 100 })
  }

  protected onFrameWidth(width: number): void {
    this.update_({ frame: { ...this.design().frame, width } })
  }

  protected onTextInput(key: keyof MenuDesignDraft['fixedTexts'], event: Event): void {
    const value = (event.target as HTMLInputElement).value
    this.update_({ fixedTexts: { ...this.design().fixedTexts, [key]: value } })
  }

  private applyColor_(key: MenuColorKey, value: string): void {
    this.hexDrafts_.update(({ [key]: _dropped, ...rest }) => rest)
    this.update_({ colors: { ...this.design().colors, [key]: value } })
  }

  private update_(patch: Partial<MenuDesignForm>): void {
    this.design.update((current) => designFromForm({ ...formFromDesign(current), ...patch }, current))
  }

  private updateBackground_(patch: Partial<MenuDesignForm['background']>): void {
    this.update_({ background: { ...this.design().background, ...patch } })
  }

  private updateLayout_(patch: Partial<MenuDesignForm['layout']>): void {
    this.update_({ layout: { ...this.design().layout, ...patch } })
  }

  /** `keyPrefix` names the values (`<prefix>_<value>`); `labelKey` names the group, by default the prefix itself. */
  private picker_<T extends string>(
    name: string,
    keyPrefix: string,
    values: readonly T[],
    selected: T,
    pick: (value: T) => void,
    labelKey = keyPrefix
  ): ChipPicker {
    return {
      id: `${this.uid}-${name}`,
      labelKey,
      options: values.map((value) => ({
        value,
        labelKey: `${keyPrefix}_${value}`,
        checked: value === selected,
        pick: () => pick(value)
      }))
    }
  }

  private setUploads_(uploads: readonly UploadSlot[]): void {
    this.uploads_.set(uploads)
    if (!this.isDestroyed_) this.uploading.emit(uploads.length > 0)
  }

  /** Every curated font, so each font chip can be written in its own letters. Added to the page once. */
  private loadFonts_(): void {
    if (this.document_.head.querySelector(`link[${FONTS_LINK_MARK}]`)) return
    const link = this.document_.createElement('link')
    link.rel = 'stylesheet'
    link.href = menuFontsHref(MENU_FONT_IDS)
    link.setAttribute(FONTS_LINK_MARK, '')
    this.document_.head.appendChild(link)
  }
}
