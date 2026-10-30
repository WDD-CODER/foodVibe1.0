import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, signal } from '@angular/core'
import { DatePipe } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { EventPipelineService } from '@services/event-pipeline.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { PermissionService } from '@services/permission.service'
import { UserService } from '@services/user.service'
import { NOTE_MAX_LENGTH } from '@schemas/entities'
import type { EventNote } from '@models/menu-event.model'

/**
 * Plan 443: the notes log of one event. Newest first, with the author and the date; add in any stage,
 * edit or delete only your own notes (the server checks the same). Notes are plain text, shown with interpolation only.
 */
@Component({
  selector: 'app-event-notes-log',
  standalone: true,
  imports: [DatePipe, FormsModule, LucideAngularModule, TranslatePipe],
  templateUrl: './event-notes-log.component.html',
  styleUrl: './event-notes-log.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventNotesLogComponent {
  // 1. INJECTED
  private readonly eventData = inject(MenuEventDataService)
  private readonly pipeline = inject(EventPipelineService)
  private readonly permission = inject(PermissionService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly destroyRef = inject(DestroyRef)
  private readonly userService = inject(UserService)

  // 2. INPUTS
  readonly eventId = input<string | null>(null)

  // 4. SIGNALS & CONSTANTS
  protected readonly maxLength = NOTE_MAX_LENGTH
  protected readonly draft_ = signal('')
  protected readonly editText_ = signal('')
  protected readonly editingId_ = signal<string | null>(null)
  protected readonly isBusy_ = signal(false)

  // 5. COMPUTED
  private readonly event_ = computed(
    () => this.eventData.allMenuEvents_().find((e) => e._id === this.eventId()) ?? null
  )
  protected readonly notes_ = computed(() => [...(this.event_()?.notes ?? [])].sort((a, b) => b.at - a.at))
  protected readonly userId_ = computed(() => this.userService.user_()?._id ?? null)
  protected readonly canAdd_ = computed(() => {
    const event = this.event_()
    return !!event && this.permission.can('addNote', { type: 'menuEvents', doc: event })
  })

  // 6. METHODS
  protected async add(): Promise<void> {
    const id = this.eventId()
    const text = this.draft_().trim()
    if (!id || !text || this.isBusy_()) return
    this.isBusy_.set(true)
    const result = await this.pipeline.addNote(id, text)
    this.isBusy_.set(false)
    if (result.ok) this.draft_.set('')
  }

  protected isOwn(note: EventNote): boolean {
    return !!note.by && note.by === this.userId_()
  }

  protected startEdit(note: EventNote): void {
    this.editText_.set(note.text)
    this.editingId_.set(note._id)
  }

  protected cancelEdit(): void {
    this.editingId_.set(null)
  }

  protected async saveEdit(note: EventNote): Promise<void> {
    const id = this.eventId()
    const text = this.editText_().trim()
    if (!id || !text || this.isBusy_()) return
    this.isBusy_.set(true)
    const result = await this.pipeline.editNote(id, note._id, text)
    this.isBusy_.set(false)
    if (result.ok) this.editingId_.set(null)
  }

  protected async remove(note: EventNote): Promise<void> {
    const id = this.eventId()
    if (!id || this.isBusy_()) return
    this.isBusy_.set(true)
    const result = await this.pipeline.deleteNote(id, note._id)
    this.isBusy_.set(false)
    if (!result.ok) return
    // Undo re-creates the note through the same pipeline route that added it (new time and author).
    this.userMsg.onLineRemoved(
      this.translation.translate('note_removed'),
      async () => {
        await this.pipeline.addNote(id, note.text)
      },
      this.destroyRef
    )
  }
}
