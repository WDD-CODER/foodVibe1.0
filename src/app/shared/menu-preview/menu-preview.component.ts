import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal
} from '@angular/core'
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'
import type { MenuDesignDraft } from '@schemas/entities/menu-design.schema'
import { type MenuDoc, SAMPLE_MENU_DOC } from '@schemas/menu-design/menu-doc'
import { renderMenuDocument } from '@schemas/menu-design/menu-template'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'

/** An A4 page in CSS pixels (210mm × 297mm at 96 per inch). */
export const A4_WIDTH_PX = 794
export const A4_HEIGHT_PX = 1123

/**
 * Plan 765 (C-TEMPLATE): one design drawn on a menu, exactly as the shared template renders it, inside a frame that runs
 * no script. The page keeps its A4 size and is scaled down to the width it is given; a longer menu scrolls inside it.
 */
@Component({
  selector: 'app-menu-preview',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './menu-preview.component.html',
  styleUrl: './menu-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuPreviewComponent {
  // 1. INJECTED
  private readonly sanitizer = inject(DomSanitizer)
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)
  private readonly destroyRef = inject(DestroyRef)

  // 2. INPUTS
  readonly design = input.required<MenuDesignDraft>()
  readonly doc = input<MenuDoc>(SAMPLE_MENU_DOC)
  readonly poweredBy = input(true)

  // 4. SIGNALS & CONSTANTS
  protected readonly pageWidth = A4_WIDTH_PX
  protected readonly pageHeight = A4_HEIGHT_PX
  private readonly scale_ = signal(1)
  readonly scale = this.scale_.asReadonly()

  // 5. COMPUTED
  /** Trusted only because the shared renderer builds the whole string and escapes every text in it. */
  protected readonly html = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(
      renderMenuDocument(this.design(), this.doc(), { poweredBy: this.poweredBy(), fonts: 'link' })
    )
  )

  constructor() {
    afterNextRender(() => this.watchWidth_())
  }

  private watchWidth_(): void {
    const element = this.host.nativeElement
    const fit = (width: number): void => {
      if (width > 0) this.scale_.set(width / A4_WIDTH_PX)
    }
    fit(element.clientWidth)
    const observer = new ResizeObserver((entries) => fit(entries[0].contentRect.width))
    observer.observe(element)
    this.destroyRef.onDestroy(() => observer.disconnect())
  }
}
