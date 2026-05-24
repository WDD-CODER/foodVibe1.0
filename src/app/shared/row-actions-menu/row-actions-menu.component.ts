import {
  Component,
  ChangeDetectionStrategy,
  signal,
  HostListener,
  ElementRef,
  inject,
} from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'

interface PopoverPos {
  bottom: number
  left: number
  minHeight: number
}

@Component({
  selector: 'app-row-actions-menu',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './row-actions-menu.component.html',
  styleUrl: './row-actions-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RowActionsMenuComponent {
  private readonly el = inject(ElementRef)

  protected readonly isOpen = signal(false)
  protected readonly popoverPos = signal<PopoverPos | null>(null)

  protected toggle(event: MouseEvent): void {
    event.stopPropagation()
    if (this.isOpen()) {
      this.close()
      return
    }
    const btn = event.currentTarget as HTMLElement
    const btnRect = btn.getBoundingClientRect()
    const row = btn.closest('.c-list-row') as HTMLElement
    const rowHeight = row?.getBoundingClientRect().height ?? 44
    this.popoverPos.set({
      bottom: window.innerHeight - btnRect.top + 2,
      left: btnRect.left + btnRect.width / 2,
      minHeight: rowHeight + 4,
    })
    this.isOpen.set(true)
  }

  protected close(): void {
    this.isOpen.set(false)
    this.popoverPos.set(null)
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.isOpen()) this.close()
  }
}
