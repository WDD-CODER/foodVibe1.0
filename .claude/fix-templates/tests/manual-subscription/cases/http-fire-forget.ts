// Component: ai-recipe-modal.component.ts (adapted)
import { Component, inject } from '@angular/core';

@Component({ selector: 'app-ai-recipe-modal', template: '' })
export class AiRecipeModalComponent {
  private shots = inject(GeminiShotsService);

  onReject(): void {
    const draft = this.draft();
    if (draft) {
      this.shots.saveShot(this.prompt(), draft, 'rejected', this.inputMode())
        .subscribe();
    }
  }
}
