import { ComponentFixture, TestBed } from '@angular/core/testing'
import { computed, signal } from '@angular/core'
import { History, LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TrashPage } from './trash.page'
import { TrashService, TRASH_SECTIONS, type TrashItem, type TrashType } from '@services/trash.service'
import { ConfirmModalService } from '@services/confirm-modal.service'

describe('TrashPage', () => {
  let fixture: ComponentFixture<TrashPage>
  const items = signal<Record<TrashType, TrashItem[]>>({
    dishes: [],
    recipes: [],
    products: [],
    equipment: [],
    venues: [],
    menuEvents: [],
    suppliers: [],
    clients: []
  })
  const emptyAll = () =>
    items.set({
      dishes: [],
      recipes: [],
      products: [],
      equipment: [],
      venues: [],
      menuEvents: [],
      suppliers: [],
      clients: []
    })

  const trashStub = {
    items: items.asReadonly(),
    sections_: computed(() => TRASH_SECTIONS),
    loadTrash: () => Promise.resolve(),
    restore: jasmine.createSpy('restore'),
    dispose: jasmine.createSpy('dispose'),
    restoreAll: jasmine.createSpy('restoreAll'),
    disposeAll: jasmine.createSpy('disposeAll'),
    restoreFor: jasmine.createSpy('restoreFor')
  }

  const create = async () => {
    sessionStorage.clear()
    await TestBed.configureTestingModule({
      imports: [TrashPage, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, History })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TrashService, useValue: trashStub },
        { provide: ConfirmModalService, useValue: { open: () => Promise.resolve(false) } }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(TrashPage)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  const el = () => fixture.nativeElement as HTMLElement

  it('renders one row per deleted recipe', async () => {
    emptyAll()
    items.update((v) => ({
      ...v,
      recipes: [
        { _id: 'r1', name: 'חומוס', deletedAt: 1 },
        { _id: 'r2', name: 'טחינה', deletedAt: 2 }
      ]
    }))
    await create()
    expect(el().querySelectorAll('.c-list-row').length).toBe(2)
  })

  it('shows one empty state with the trash_empty message when nothing is deleted', async () => {
    emptyAll()
    await create()
    const empties = el().querySelectorAll('app-empty-state')
    expect(empties.length).toBe(1)
    expect(empties[0].textContent).toContain('trash_empty')
    expect(el().querySelectorAll('.c-list-row').length).toBe(0)
  })

  it('history opens a modal shell and Escape closes it', async () => {
    emptyAll()
    items.update((v) => ({ ...v, recipes: [{ _id: 'r1', name: 'חומוס', deletedAt: 1 }] }))
    await create()
    expect(el().querySelector('app-modal-shell')).toBeNull()
    const historyBtn = el().querySelector('.c-list-row .c-icon-btn') as HTMLButtonElement
    historyBtn.click()
    fixture.detectChanges()
    expect(el().querySelector('app-modal-shell')).not.toBeNull()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    fixture.detectChanges()
    expect(el().querySelector('app-modal-shell')).toBeNull()
    expect(el().querySelectorAll('.c-list-row').length).toBe(1)
  })
})
