import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  HostListener,
  OnInit,
  output,
  signal,
  viewChild
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { ModalShellComponent } from 'src/app/shared/modal-shell/modal-shell.component'
import { Terms, TermsService } from '../../services/terms.service'

/** Pixels from the end of the text at which it counts as read. */
const END_TOLERANCE_PX = 8

/**
 * Plan 584: the terms popup. The confirm button stays disabled until the text is scrolled to its end
 * (at once when the text fits without scrolling), so a checked "I agree" means "read to the end".
 */
@Component({
  selector: 'app-terms-modal',
  standalone: true,
  imports: [TranslatePipe, ModalShellComponent],
  templateUrl: './terms-modal.component.html',
  styleUrl: './terms-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TermsModalComponent implements OnInit {
  private readonly termsService_ = inject(TermsService)
  private readonly destroyRef_ = inject(DestroyRef)

  /** False hides the close button and turns off Escape and click outside. */
  readonly dismissible = input(true)
  /** Emits the version of the text the user read to the end and confirmed. */
  readonly accepted = output<string>()
  readonly closed = output<void>()

  protected readonly terms_ = signal<Terms | null>(null)
  protected readonly hasLoadError_ = signal(false)
  protected readonly isAtEnd_ = signal(false)
  /** True while an owner is posting the acceptance (the gate sets it through `busy`). */
  readonly busy = input(false)

  private readonly body_ = viewChild<ElementRef<HTMLElement>>('body')

  ngOnInit(): void {
    this.termsService_
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef_))
      .subscribe({
        next: (terms) => {
          this.terms_.set(terms)
          setTimeout(() => this.onScroll(), 0)
        },
        error: () => this.hasLoadError_.set(true)
      })
  }

  @HostListener('window:resize')
  protected onScroll(): void {
    const el = this.body_()?.nativeElement
    if (!el || !this.terms_()) return
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight
    if (remaining <= END_TOLERANCE_PX) this.isAtEnd_.set(true)
    // once read, a resize never un-reads it (the signal is only ever set to true)
  }

  protected onAccept(): void {
    const terms = this.terms_()
    if (!terms || !this.isAtEnd_() || this.busy()) return
    this.accepted.emit(terms.version)
  }

  protected onClose(): void {
    if (this.dismissible()) this.closed.emit()
  }
}
