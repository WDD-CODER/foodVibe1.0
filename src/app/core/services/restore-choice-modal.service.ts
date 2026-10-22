import { Injectable } from '@angular/core'
import { ModalController } from './modal-controller'

export type RestoreChoice = 'replace' | 'add-new'

@Injectable({ providedIn: 'root' })
export class RestoreChoiceModalService {
  private readonly controller_ = new ModalController<RestoreChoice | null>(null)

  readonly isOpen = this.controller_.isOpen_

  open(): Promise<RestoreChoice | null> {
    return this.controller_.open()
  }

  choose(choice: RestoreChoice | null): void {
    this.controller_.close(choice)
  }
}
