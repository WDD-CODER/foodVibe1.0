import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing'
import { computed, signal } from '@angular/core'
import { CircleCheckBig, ClipboardCheck, LucideAngularModule } from 'lucide-angular'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { EventLogisticsPanelComponent } from './event-logistics-panel.component'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { EventPipelineService } from '@services/event-pipeline.service'
import { LogisticsItemRegistryService, type LogisticsItemTerm } from '@services/logistics-item-registry.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { PermissionService } from '@services/permission.service'
import type { MenuEvent } from '@models/menu-event.model'
import type { EnvironmentType } from '@models/venue.model'

const term = (
  key: string,
  phase: 'intake' | 'site_visit',
  environments?: LogisticsItemTerm['environments']
): LogisticsItemTerm =>
  ({
    _id: key,
    userId: '__master__',
    schemaVersion: 2,
    createdAt: 1,
    updatedAt: 1,
    kind: 'logisticsItem',
    key,
    sortOrder: 0,
    phase,
    section: 'space',
    answerType: 'status',
    environments
  }) as LogisticsItemTerm

describe('EventLogisticsPanelComponent', () => {
  let fixture: ComponentFixture<EventLogisticsPanelComponent>
  let el: HTMLElement
  let pipeline: jasmine.SpyObj<EventPipelineService>
  let confirm: jasmine.SpyObj<ConfirmModalService>
  let canEdit: boolean

  const event: MenuEvent = {
    _id: 'e1',
    name: 'אירוע',
    eventType: '',
    servingType: '',
    guestCount: 10,
    sections: [],
    stage: 'inquiry',
    logistics: { environmentType: 'professional_kitchen', resolvedItems: [] }
  }
  const items = [
    term('kitchen_on_site', 'intake'),
    term('parking', 'intake'),
    term('chillers', 'site_visit'),
    term('generator', 'site_visit', ['outdoor_field'])
  ]
  const store = signal<MenuEvent[]>([event])

  const header = () => el.querySelector<HTMLButtonElement>('.logistics-toggle')!
  const rows = () => el.querySelectorAll('.logistics-row')
  const pickStatus = (rowIndex: number, status: string) => {
    const radios = rows()[rowIndex].querySelectorAll<HTMLInputElement>('.logistics-status input')
    const idx = ['unchecked', 'needed', 'not_needed', 'client_provides'].indexOf(status)
    radios[idx].click()
    fixture.detectChanges()
  }
  const create = (can = true) => {
    canEdit = can
    fixture = TestBed.createComponent(EventLogisticsPanelComponent)
    fixture.componentRef.setInput('eventId', 'e1')
    fixture.detectChanges()
    el = fixture.nativeElement
  }

  beforeEach(async () => {
    canEdit = true
    store.set([event])
    pipeline = jasmine.createSpyObj<EventPipelineService>('EventPipelineService', ['saveLogistics'])
    pipeline.saveLogistics.and.resolveTo({ ok: true, event })
    confirm = jasmine.createSpyObj<ConfirmModalService>('ConfirmModalService', ['open'])
    confirm.open.and.resolveTo(false)
    const itemSignal = signal(items)
    await TestBed.configureTestingModule({
      imports: [
        EventLogisticsPanelComponent,
        LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, CircleCheckBig, ClipboardCheck })
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MenuEventDataService, useValue: { allMenuEvents_: store.asReadonly() } },
        { provide: EventPipelineService, useValue: pipeline },
        { provide: ConfirmModalService, useValue: confirm },
        { provide: PermissionService, useValue: { can: () => canEdit } },
        {
          provide: LogisticsItemRegistryService,
          useValue: {
            items_: itemSignal.asReadonly(),
            loadSafely: () => Promise.resolve(),
            forPhase: (phase: string, env: EnvironmentType | undefined) =>
              computed(() =>
                itemSignal().filter(
                  (t) => t.phase === phase && (!t.environments?.length || !env || t.environments.includes(env))
                )
              )
          }
        }
      ]
    }).compileComponents()
  })

  it('starts closed with the open count in the header', () => {
    create()
    expect(header().getAttribute('aria-expanded')).toBe('false')
    expect(rows().length).toBe(0)
    expect(header().querySelector('.c-chip__count')?.textContent?.trim()).toBe('3')
  })

  it('renders the intake rows after a header click', () => {
    create()
    header().click()
    fixture.detectChanges()
    expect(header().getAttribute('aria-expanded')).toBe('true')
    expect(rows().length).toBe(2)
  })

  it('shows the outdoor-only item only for the outdoor environment', () => {
    create()
    header().click()
    fixture.detectChanges()
    ;(fixture.componentInstance as unknown as { selectPhase(p: string): void }).selectPhase('site_visit')
    fixture.detectChanges()
    expect(rows().length).toBe(1)
    ;(fixture.componentInstance as unknown as { envDraft_: { set(v: string): void } }).envDraft_.set('outdoor_field')
    fixture.detectChanges()
    expect(rows().length).toBe(2)
  })

  it('saves once after 600 ms with the chosen status', fakeAsync(() => {
    create()
    header().click()
    fixture.detectChanges()
    pickStatus(0, 'needed')
    tick(599)
    expect(pipeline.saveLogistics).not.toHaveBeenCalled()
    tick(1)
    expect(pipeline.saveLogistics).toHaveBeenCalledTimes(1)
    const patch = pipeline.saveLogistics.calls.mostRecent().args[1]
    expect(patch.answers?.length).toBe(1)
    expect(patch.answers?.[0].status).toBe('needed')
  }))

  it('sends two changes made within 600 ms in one call', fakeAsync(() => {
    create()
    header().click()
    fixture.detectChanges()
    pickStatus(0, 'needed')
    tick(300)
    pickStatus(1, 'not_needed')
    tick(600)
    expect(pipeline.saveLogistics).toHaveBeenCalledTimes(1)
    expect(pipeline.saveLogistics.calls.mostRecent().args[1].answers?.length).toBe(2)
  }))

  it('keeps the draft after a failed save and resends both on the next change', fakeAsync(() => {
    create()
    header().click()
    fixture.detectChanges()
    pipeline.saveLogistics.and.resolveTo({ ok: false, code: 'server_error' })
    pickStatus(0, 'needed')
    tick(600)
    pipeline.saveLogistics.and.resolveTo({ ok: true, event })
    pickStatus(1, 'needed')
    tick(600)
    expect(pipeline.saveLogistics).toHaveBeenCalledTimes(2)
    expect(pipeline.saveLogistics.calls.mostRecent().args[1].answers?.length).toBe(2)
  }))

  it('lowers the open count when a row leaves unchecked', fakeAsync(() => {
    create()
    header().click()
    fixture.detectChanges()
    pickStatus(0, 'not_needed')
    expect(header().querySelector('.c-chip__count')?.textContent?.trim()).toBe('2')
    tick(600)
  }))

  it('disables every control and shows read-only when the user cannot edit', () => {
    create(false)
    header().click()
    fixture.detectChanges()
    expect(header().textContent).toContain('logistics_read_only')
    const controls = el.querySelectorAll<HTMLInputElement>('.logistics-body input')
    expect(controls.length).toBeGreaterThan(0)
    controls.forEach((c) => expect(c.disabled).toBe(true))
    expect(el.querySelector('.logistics-add')).toBeNull()
  })

  it('asks for confirmation when finishing a phase with open items', () => {
    create()
    header().click()
    fixture.detectChanges()
    const done = [...el.querySelectorAll<HTMLButtonElement>('.logistics-footer button')].find((b) =>
      b.textContent?.includes('logistics_phase_done')
    )!
    done.click()
    expect(confirm.open).toHaveBeenCalledTimes(1)
    expect(confirm.open.calls.mostRecent().args[0]).toContain('kitchen_on_site')
  })
})
