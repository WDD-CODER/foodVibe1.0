import { ErrorHandler, inject, Injectable } from '@angular/core'
import { LoggingService } from './logging.service'

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private logging = inject(LoggingService)

  handleError(err: unknown): void {
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    this.logging.error({
      event: 'error.unhandled',
      message,
      context: stack ? { stack } : undefined
    })
    if (typeof window !== 'undefined' && window.console) {
      console.error(err)
    }
  }
}
