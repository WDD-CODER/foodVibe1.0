import { Component, inject, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { LoaderComponent } from '../loader/loader.component'
import { RecipeTextImportModalService } from '@services/recipe-text-import-modal.service'
import { RecipeParserService } from '@services/recipe-parser.service'
import type { ParsedResult, ParsedResultType } from '@models/parsed-result.model'

type ModalState = 'idle' | 'loading' | 'error'

@Component({
  selector: 'app-recipe-text-import-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslatePipe, LoaderComponent],
  templateUrl: './recipe-text-import-modal.component.html',
  styleUrl: './recipe-text-import-modal.component.scss',
})
export class RecipeTextImportModalComponent {
  protected readonly modalService = inject(RecipeTextImportModalService)
  private readonly parserService = inject(RecipeParserService)

  protected readonly rawText_ = signal('')
  protected readonly state_ = signal<ModalState>('idle')
  /** Set when confidence < 0.6 — shows override banner until user confirms. */
  protected readonly pendingResult_ = signal<ParsedResult | null>(null)

  protected onParse(): void {
    const text = this.rawText_().trim()
    if (!text) return
    this.state_.set('loading')
    this.pendingResult_.set(null)

    this.parserService.parseText(text).subscribe({
      next: (result) => {
        this.state_.set('idle')
        if (result.confidence === 0) {
          // Sentinel — treat as error
          this.state_.set('error')
          return
        }
        if (result.confidence < 0.6) {
          this.pendingResult_.set(result)
          return
        }
        this.modalService.deliver(result)
      },
      error: () => this.state_.set('error'),
    })
  }

  protected onRetry(): void {
    this.state_.set('idle')
    this.pendingResult_.set(null)
  }

  protected onOverrideType(type: ParsedResultType): void {
    const pending = this.pendingResult_()
    if (!pending) return
    this.modalService.deliver({ ...pending, type })
    this.pendingResult_.set(null)
  }

  protected onConfirmDetected(): void {
    const pending = this.pendingResult_()
    if (!pending) return
    this.modalService.deliver(pending)
    this.pendingResult_.set(null)
  }
}
