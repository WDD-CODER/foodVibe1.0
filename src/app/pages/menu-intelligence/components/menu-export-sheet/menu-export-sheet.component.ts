import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'

export type ChecklistMode = 'by_dish' | 'by_category' | 'by_station'

/**
 * "צ'קליסט והדפסות" (plan 344) — a sheet that slides down from the top of the screen with every
 * checklist, shopping-list, all-in-one and print option of the menu builder. Opened from the
 * hero-FAB; a backdrop tap or Escape closes it. Picking an option emits `close` first, then the
 * action, so the page runs the action with the sheet already gone.
 */
@Component({
  selector: 'app-menu-export-sheet',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './menu-export-sheet.component.html',
  styleUrl: './menu-export-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuExportSheetComponent {
  readonly open = input(false)

  readonly close = output<void>()
  readonly viewChecklist = output<ChecklistMode>()
  readonly exportChecklist = output<ChecklistMode>()
  readonly viewShoppingList = output<void>()
  readonly exportShoppingList = output<void>()
  readonly viewAll = output<void>()
  readonly exportAll = output<void>()
  readonly print = output<void>()

  protected readonly checklistModes: readonly { mode: ChecklistMode; labelKey: string }[] = [
    { mode: 'by_dish', labelKey: 'export_checklist_by_dish' },
    { mode: 'by_category', labelKey: 'export_checklist_by_category' },
    { mode: 'by_station', labelKey: 'export_checklist_by_station' }
  ]

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) this.close.emit()
  }

  protected onViewChecklist(mode: ChecklistMode): void {
    this.close.emit()
    this.viewChecklist.emit(mode)
  }

  protected onExportChecklist(mode: ChecklistMode): void {
    this.close.emit()
    this.exportChecklist.emit(mode)
  }

  protected onViewShoppingList(): void {
    this.close.emit()
    this.viewShoppingList.emit()
  }

  protected onExportShoppingList(): void {
    this.close.emit()
    this.exportShoppingList.emit()
  }

  protected onViewAll(): void {
    this.close.emit()
    this.viewAll.emit()
  }

  protected onExportAll(): void {
    this.close.emit()
    this.exportAll.emit()
  }

  protected onPrint(): void {
    this.close.emit()
    this.print.emit()
  }
}
