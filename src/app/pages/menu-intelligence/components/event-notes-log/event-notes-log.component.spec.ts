import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { LucideAngularModule, MessageSquare } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { EventNotesLogComponent } from './event-notes-log.component'
import { EventPipelineService } from '@services/event-pipeline.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { UserService } from '@services/user.service'
import type { MenuEvent } from '@models/menu-event.model'

describe('EventNotesLogComponent', () => {
  let fixture: ComponentFixture<EventNotesLogComponent>
  let el: HTMLElement
  let store: ReturnType<typeof signal<MenuEvent[]>>
  let pipeline: jasmine.SpyObj<EventPipelineService>

  const event: MenuEvent = {
    _id: 'e1',
    name: 'אירוע',
    eventType: '',
    servingType: '',
    guestCount: 10,
    sections: [],
    stage: 'inquiry',
    notes: [
      { _id: 'n1', text: 'הראשונה', at: 1000, by: 'u1', byName: 'דן' },
      { _id: 'n3', text: 'השלישית', at: 3000, by: 'u2', byName: 'נועה' },
      { _id: 'n2', text: 'השנייה', at: 2000, by: 'u1', byName: 'דן' }
    ]
  }

  beforeEach(async () => {
    store = signal<MenuEvent[]>([event])
    pipeline = jasmine.createSpyObj<EventPipelineService>('EventPipelineService', ['addNote', 'editNote', 'deleteNote'])
    pipeline.addNote.and.resolveTo({ ok: true, event })
    await TestBed.configureTestingModule({
      imports: [EventNotesLogComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, MessageSquare })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MenuEventDataService, useValue: { allMenuEvents_: store.asReadonly() } },
        { provide: EventPipelineService, useValue: pipeline },
        {
          provide: UserService,
          useValue: {
            user_: signal({ _id: 'u1', name: 'דן', email: '', businessRole: 'owner' }),
            isOwner_: signal(true)
          }
        }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(EventNotesLogComponent)
    fixture.componentRef.setInput('eventId', 'e1')
    fixture.detectChanges()
    el = fixture.nativeElement
  })

  it('lists notes newest first', () => {
    const texts = Array.from(el.querySelectorAll('.note-text')).map((n) => n.textContent?.trim())
    expect(texts).toEqual(['השלישית', 'השנייה', 'הראשונה'])
  })

  it('renders edit and delete buttons only on the current user notes', () => {
    const notes = Array.from(el.querySelectorAll('.note'))
    const hasButtons = notes.map((n) => !!n.querySelector('.note-edit') && !!n.querySelector('.note-delete'))
    // order is newest first: n3 (u2), n2 (u1), n1 (u1)
    expect(hasButtons).toEqual([false, true, true])
  })

  it('shows the author name and the empty message when there are no notes', () => {
    expect(el.querySelector('.note-author')?.textContent?.trim()).toBe('נועה')
    store.set([{ ...event, notes: [] }])
    fixture.detectChanges()
    expect(el.querySelector('.notes-empty')).toBeTruthy()
  })

  it('adds a note through the pipeline service and clears the box', async () => {
    const area = el.querySelector<HTMLTextAreaElement>('.notes-add textarea')!
    area.value = ' חדשה '
    area.dispatchEvent(new Event('input'))
    fixture.detectChanges()
    el.querySelector<HTMLButtonElement>('.notes-add .c-btn-primary')!.click()
    await fixture.whenStable()
    fixture.detectChanges()
    await fixture.whenStable()
    expect(pipeline.addNote).toHaveBeenCalledWith('e1', 'חדשה')
    expect(el.querySelector<HTMLTextAreaElement>('.notes-add textarea')!.value).toBe('')
  })
})
