import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { LoggingService } from '@services/logging.service'

/**
 * Plan 667: a QR image of a link, drawn in the browser (nothing is sent anywhere). The library is loaded on first
 * use, so it is a lazy chunk and not part of the first bundle. The last value wins: a slow image of an older value
 * is dropped.
 */
@Component({
  selector: 'app-qr-code',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './qr-code.component.html',
  styleUrl: './qr-code.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QrCodeComponent {
  private readonly logging = inject(LoggingService)

  readonly value = input.required<string>()
  /** Side length in CSS pixels. */
  readonly size = input(160)
  /** Translation key of the image's alt text. */
  readonly altKey = input('')

  protected readonly src_ = signal('')
  private latest = 0
  private failedLogged = false

  constructor() {
    effect(() => {
      const value = this.value()
      const size = this.size()
      const ticket = ++this.latest
      if (!value) {
        this.src_.set('')
        return
      }
      void this.render(value, size, ticket)
    })
  }

  private async render(value: string, size: number, ticket: number): Promise<void> {
    try {
      const { toDataURL } = await import('qrcode')
      const url = await toDataURL(value, { margin: 1, width: size * 2, errorCorrectionLevel: 'M' })
      if (ticket === this.latest) this.src_.set(url)
    } catch (err) {
      if (ticket !== this.latest) return
      this.src_.set('')
      if (!this.failedLogged) {
        this.failedLogged = true
        this.logging.error({ event: 'qr.render_failed', message: 'QR code render failed', context: { err } })
      }
    }
  }
}
