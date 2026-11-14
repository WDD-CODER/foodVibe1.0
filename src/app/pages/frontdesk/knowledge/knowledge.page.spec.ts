import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal, WritableSignal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { KnowledgePage } from './knowledge.page'
import { KnowledgeItemDataService } from '@services/knowledge-item-data.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import type { KnowledgeItem } from '@models/knowledge-item.model'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

const item = (_id: string, topic: KnowledgeItem['topic'], extra: Partial<KnowledgeItem> = {}): KnowledgeItem =>
  ({
    _id,
    topic,
    question: 'שאלה ' + _id,
    answer: 'תשובה ' + _id,
    status: 'approved',
    source: 'manual',
    visibility: 'public',
    ...extra
  }) as KnowledgeItem

describe('KnowledgePage (plan 554)', () => {
  let fixture: ComponentFixture<KnowledgePage>
  let items_: WritableSignal<KnowledgeItem[]>
  let data: jasmine.SpyObj<KnowledgeItemDataService> & { allItems_: WritableSignal<KnowledgeItem[]> }

  type Internals = {
    groups_: () => { topic: string; items: KnowledgeItem[] }[]
    setFilter: (f: 'all' | 'drafts' | 'approved') => void
    toggleSelected: (id: string) => void
    approveSelected: () => Promise<void>
  }
  const cmp = (): Internals => fixture.componentInstance as unknown as Internals
  const el = (): HTMLElement => fixture.nativeElement

  function setup(list: KnowledgeItem[], owner = true): void {
    items_ = signal(list)
    data = Object.assign(
      jasmine.createSpyObj('KnowledgeItemDataService', [
        'approve',
        'addItem',
        'updateItem',
        'removeItem',
        'importDrafts'
      ]),
      {
        allItems_: items_
      }
    )
    data.approve.and.resolveTo(2)
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => k ?? '')
    TestBed.configureTestingModule({
      imports: [KnowledgePage, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: KnowledgeItemDataService, useValue: data },
        { provide: PermissionService, useValue: { isOwner_: signal(owner) } },
        { provide: TranslationService, useValue: translation },
        {
          provide: UserMsgService,
          useValue: jasmine.createSpyObj('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])
        },
        { provide: ConfirmModalService, useValue: jasmine.createSpyObj('ConfirmModalService', ['open']) }
      ]
    })
    fixture = TestBed.createComponent(KnowledgePage)
    fixture.detectChanges()
  }

  it('groups the items by topic in the fixed topic order', () => {
    setup([item('1', 'faq'), item('2', 'hours'), item('3', 'menu'), item('4', 'hours')])
    expect(
      cmp()
        .groups_()
        .map((g) => g.topic)
    ).toEqual(['hours', 'menu', 'faq'])
    expect(
      cmp()
        .groups_()[0]
        .items.map((i) => i._id)
    ).toEqual(['2', '4'])
    expect(el().querySelectorAll('[data-testid="knowledge-row"]').length).toBe(4)
  })

  it('the drafts filter shows only drafts', () => {
    setup([item('1', 'faq', { status: 'draft' }), item('2', 'faq')])
    cmp().setFilter('drafts')
    fixture.detectChanges()
    expect(
      cmp()
        .groups_()
        .flatMap((g) => g.items.map((i) => i._id))
    ).toEqual(['1'])
  })

  it('selecting drafts and approving calls the service once with their ids', async () => {
    setup([
      item('1', 'faq', { status: 'draft' }),
      item('2', 'faq', { status: 'draft' }),
      item('3', 'faq', { status: 'draft' })
    ])
    cmp().toggleSelected('1')
    cmp().toggleSelected('3')
    await cmp().approveSelected()
    expect(data.approve).toHaveBeenCalledTimes(1)
    expect(data.approve).toHaveBeenCalledWith(['1', '3'])
  })

  it('staff see no add / edit / delete / import / select controls', () => {
    setup([item('1', 'faq', { status: 'draft' })], false)
    expect(el().querySelector('[data-testid="knowledge-add"]')).toBeNull()
    expect(el().querySelector('[data-testid="knowledge-import"]')).toBeNull()
    expect(el().querySelector('.row-actions')).toBeNull()
    expect(el().querySelector('.row-select')).toBeNull()
    expect(el().querySelector('[data-testid="knowledge-approve-all"]')).toBeNull()
    expect(el().querySelectorAll('[data-testid="knowledge-row"]').length).toBe(1)
  })

  it('the owner sees the add and import controls', () => {
    setup([])
    expect(el().querySelector('[data-testid="knowledge-add"]')).not.toBeNull()
    expect(el().querySelector('[data-testid="knowledge-import"]')).not.toBeNull()
  })
})
