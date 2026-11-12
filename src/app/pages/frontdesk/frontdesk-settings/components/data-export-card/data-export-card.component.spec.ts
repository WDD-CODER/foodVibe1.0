import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { LucideAngularModule, Download } from 'lucide-angular'
import { ClientDataService } from '@services/client-data.service'
import { RequestDataService } from '@services/request-data.service'
import { BookingDataService } from '@services/booking-data.service'
import { LoggingService } from '@services/logging.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { DataExportCardComponent, jerusalemToday } from './data-export-card.component'

describe('DataExportCardComponent (plan 557)', () => {
  const isOwner_ = signal(true)
  let clientRows: unknown[]
  let requestRows: unknown[]
  let errors: string[]
  let downloads: { name: string; text: string }[]

  async function setup(): Promise<HTMLElement> {
    errors = []
    downloads = []
    spyOn(URL, 'createObjectURL').and.callFake((blob: Blob | MediaSource) => {
      void (blob as Blob).text().then((text) => (downloads[downloads.length - 1].text = text))
      return 'blob:x'
    })
    spyOn(URL, 'revokeObjectURL')
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
      downloads.push({ name: this.download, text: '' })
    })
    TestBed.configureTestingModule({
      imports: [DataExportCardComponent, LucideAngularModule.pick({ Download })],
      providers: [
        { provide: PermissionService, useValue: { isOwner_ } },
        {
          provide: ClientDataService,
          useValue: { reloadFromStorage: () => Promise.resolve(), allClients_: () => clientRows }
        },
        {
          provide: RequestDataService,
          useValue: { reloadFromStorage: () => Promise.resolve(), all_: () => requestRows }
        },
        {
          provide: BookingDataService,
          useValue: { reloadFromStorage: () => Promise.reject(new Error('down')), all_: () => [] }
        },
        { provide: TranslationService, useValue: { translate: (k: string | undefined) => k ?? '' } },
        { provide: UserMsgService, useValue: { onSetErrorMsg: (m: string) => errors.push(m) } },
        { provide: LoggingService, useValue: { error: () => {} } }
      ]
    })
    const fixture = TestBed.createComponent(DataExportCardComponent)
    fixture.detectChanges()
    return fixture.nativeElement
  }

  const click = async (el: HTMLElement, id: string): Promise<void> => {
    ;(el.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement).click()
    await new Promise((r) => setTimeout(r, 20))
  }

  beforeEach(() => {
    isOwner_.set(true)
    clientRows = [
      {
        _id: 'c1',
        name: 'דנה',
        phone: '0521234567',
        clientType: 'private',
        kinds: ['diner'],
        counters: { requests: 2 }
      }
    ]
    requestRows = [
      {
        _id: 'r1',
        kind: 'table',
        status: 'new',
        channel: 'manual',
        guestName: 'א',
        guestPhone: '1',
        wanted: {},
        answers: []
      },
      {
        _id: 'r2',
        kind: 'table',
        status: 'new',
        channel: 'manual',
        guestName: 'TESTER',
        guestPhone: '1',
        wanted: {},
        answers: [],
        test: true
      }
    ]
  })

  it('downloads clients-<today>.csv with a header row and one row per client', async () => {
    const el = await setup()
    await click(el, 'export-clients')
    expect(downloads[0].name).toBe(`clients-${jerusalemToday()}.csv`)
    expect(downloads[0].name).toMatch(/^clients-\d{4}-\d{2}-\d{2}\.csv$/)
    const lines = downloads[0].text.split('\r\n').filter(Boolean)
    expect(lines.length).toBe(2)
    expect(lines[1]).toContain('דנה')
  })

  it('leaves test requests out of the requests file', async () => {
    const el = await setup()
    await click(el, 'export-requests')
    expect(downloads[0].name).toMatch(/^requests-/)
    expect(downloads[0].text).not.toContain('TESTER')
    expect(downloads[0].text.split('\r\n').filter(Boolean).length).toBe(2)
  })

  it('shows the failure toast when a load fails and downloads nothing', async () => {
    const el = await setup()
    await click(el, 'export-bookings')
    expect(errors).toEqual(['fd_export_failed'])
    expect(downloads.length).toBe(0)
  })

  it('shows nothing for a member who is not the owner', async () => {
    isOwner_.set(false)
    const el = await setup()
    expect(el.querySelector('[data-testid="card-export"]')).toBeNull()
  })
})
