import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { environment } from '../../../environments/environment'
import { EventPipelineService } from './event-pipeline.service'
import { MenuEventDataService } from './menu-event-data.service'
import { StorageService } from './async-storage.service'
import { LoggingService } from './logging.service'
import { TranslationService } from './translation.service'
import { UserMsgService } from './user-msg.service'
import type { MenuEvent } from '@models/menu-event.model'

const BASE = environment.apiUrl

describe('EventPipelineService', () => {
  let service: EventPipelineService
  let backend: HttpTestingController
  let data: MenuEventDataService
  let userMsg: jasmine.SpyObj<UserMsgService>

  const inquiry: Omit<MenuEvent, '_id'> = {
    name: 'בדיקה',
    eventType: '',
    servingType: '',
    guestCount: 10,
    sections: [],
    stage: 'inquiry'
  }

  beforeEach(async () => {
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetErrorMsg', 'onSetSuccessMsg'])
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: StorageService, useValue: { post: async (_: string, e: MenuEvent) => ({ ...e, _id: 'e1' }) } },
        { provide: LoggingService, useValue: { warn: () => undefined, error: () => undefined, info: () => undefined } },
        { provide: TranslationService, useValue: { translate: (key: string) => `T:${key}` } },
        { provide: UserMsgService, useValue: userMsg }
      ]
    })
    service = TestBed.inject(EventPipelineService)
    backend = TestBed.inject(HttpTestingController)
    data = TestBed.inject(MenuEventDataService)
    await data.addMenuEvent(inquiry)
  })

  afterEach(() => backend.verify())

  function stageOfStore(): string | undefined {
    return data.allMenuEvents_().find((e) => e._id === 'e1')?.stage
  }

  it('changeStage sends PUT /api/v1/events/<id>/stage and writes the returned event into the store', async () => {
    const done = service.changeStage('e1', { stage: 'quote_sent' })
    const req = backend.expectOne(`${BASE}/api/v1/events/e1/stage`)
    expect(req.request.method).toBe('PUT')
    expect(req.request.body).toEqual({ stage: 'quote_sent' })
    req.flush({ ...inquiry, _id: 'e1', stage: 'quote_sent' })
    const result = await done
    expect(result.ok).toBeTrue()
    expect(stageOfStore()).toBe('quote_sent')
  })

  it('a 400 DATE_REQUIRED shows the stage_needs_date text and leaves the stored event unchanged', async () => {
    const done = service.changeStage('e1', { stage: 'deposit_paid' })
    backend
      .expectOne(`${BASE}/api/v1/events/e1/stage`)
      .flush({ error: 'DATE_REQUIRED' }, { status: 400, statusText: 'Bad Request' })
    const result = await done
    expect(result).toEqual({ ok: false, code: 'DATE_REQUIRED' })
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('T:stage_needs_date')
    expect(stageOfStore()).toBe('inquiry')
  })

  it('a 403 is left to the interceptor toast', async () => {
    const done = service.changeStage('e1', { stage: 'quote_sent' })
    backend
      .expectOne(`${BASE}/api/v1/events/e1/stage`)
      .flush({ error: 'FORBIDDEN' }, { status: 403, statusText: 'Forbidden' })
    expect((await done).ok).toBeFalse()
    expect(userMsg.onSetErrorMsg).not.toHaveBeenCalled()
  })

  it('an unknown error code on a stage move shows stage_change_failed', async () => {
    const done = service.changeStage('e1', { stage: 'quote_sent' })
    backend
      .expectOne(`${BASE}/api/v1/events/e1/stage`)
      .flush({ error: 'STAGE_CHANGED' }, { status: 409, statusText: 'Conflict' })
    await done
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('T:stage_change_failed')
  })

  it('addNote, editNote and deleteNote call the notes routes and keep the returned event', async () => {
    const note = { _id: 'n1', text: 'שלום', at: 1, by: 'u1', byName: 'דן' }
    const add = service.addNote('e1', 'שלום')
    const addReq = backend.expectOne(`${BASE}/api/v1/events/e1/notes`)
    expect(addReq.request.method).toBe('POST')
    expect(addReq.request.body).toEqual({ text: 'שלום' })
    addReq.flush({ ...inquiry, _id: 'e1', notes: [note] }, { status: 201, statusText: 'Created' })
    await add
    expect(data.allMenuEvents_()[0].notes?.length).toBe(1)

    const edit = service.editNote('e1', 'n1', 'חדש')
    const editReq = backend.expectOne(`${BASE}/api/v1/events/e1/notes/n1`)
    expect(editReq.request.method).toBe('PUT')
    editReq.flush({ ...inquiry, _id: 'e1', notes: [{ ...note, text: 'חדש', editedAt: 2 }] })
    await edit
    expect(data.allMenuEvents_()[0].notes?.[0].text).toBe('חדש')

    const del = service.deleteNote('e1', 'n1')
    const delReq = backend.expectOne(`${BASE}/api/v1/events/e1/notes/n1`)
    expect(delReq.request.method).toBe('DELETE')
    delReq.flush({ ...inquiry, _id: 'e1', notes: [] })
    await del
    expect(data.allMenuEvents_()[0].notes).toEqual([])
  })

  it('a refused note shows its own text, and an unknown code falls back to server_error', async () => {
    const empty = service.addNote('e1', ' ')
    backend
      .expectOne(`${BASE}/api/v1/events/e1/notes`)
      .flush({ error: 'NOTE_EMPTY' }, { status: 400, statusText: 'Bad Request' })
    await empty
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('T:notes_empty_error')

    const odd = service.addNote('e1', 'x')
    backend
      .expectOne(`${BASE}/api/v1/events/e1/notes`)
      .flush({ error: 'Server error' }, { status: 500, statusText: 'Server Error' })
    await odd
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('T:server_error')
  })
})
