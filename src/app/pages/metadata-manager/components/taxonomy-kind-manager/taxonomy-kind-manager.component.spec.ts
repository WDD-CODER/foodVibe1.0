import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal, type WritableSignal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { TaxonomyKindManagerComponent, type TaxonomyRenameEvent } from './taxonomy-kind-manager.component'
import { TranslationService } from '@services/translation.service'
import { UserService } from '@services/user.service'

// Plan 468 - the inline rename has Save and Cancel; leaving the field does nothing.
describe('TaxonomyKindManagerComponent inline rename', () => {
  let fixture: ComponentFixture<TaxonomyKindManagerComponent>
  let renamed: TaxonomyRenameEvent[]

  const editing = (): WritableSignal<string | null> =>
    (fixture.componentInstance as unknown as { editingItem_: WritableSignal<string | null> }).editingItem_
  const field = (): HTMLInputElement | null => fixture.nativeElement.querySelector('app-inline-rename-field input')
  const button = (index: number): HTMLButtonElement =>
    fixture.nativeElement.querySelectorAll('app-inline-rename-field button')[index]

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaxonomyKindManagerComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: TranslationService, useValue: { translate: (k: string) => k } },
        { provide: UserService, useValue: { isLoggedIn: signal(true) } }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(TaxonomyKindManagerComponent)
    fixture.componentRef.setInput('items', ['חם', 'קר'])
    fixture.componentRef.setInput('titleKey', 'metadata_stations_title')
    fixture.componentRef.setInput('icon', 'tag')
    fixture.componentRef.setInput('inlineRename', true)
    renamed = []
    fixture.componentInstance.renamed.subscribe((e) => renamed.push(e))
    fixture.detectChanges()
    editing().set('קר')
    fixture.detectChanges()
  })

  it('shows the rename field with a save and a cancel button in place of the chip', () => {
    expect(field()?.value).toBe('קר')
    expect(button(0).textContent?.trim()).toBe('save')
    expect(button(1).textContent?.trim()).toBe('cancel')
  })

  it('Save closes the field and emits renamed with the new text', () => {
    field()!.value = 'קרח'
    field()!.dispatchEvent(new Event('input'))
    fixture.detectChanges()
    button(0).click()
    fixture.detectChanges()
    expect(renamed).toEqual([{ item: 'קר', value: 'קרח' }])
    expect(field()).toBeNull()
  })

  it('Cancel closes the field and emits nothing', () => {
    field()!.value = 'קרח'
    button(1).click()
    fixture.detectChanges()
    expect(renamed).toEqual([])
    expect(field()).toBeNull()
  })

  it('leaving the field (blur) keeps it open and emits nothing', () => {
    field()!.value = 'קרח'
    field()!.dispatchEvent(new FocusEvent('blur'))
    fixture.detectChanges()
    expect(renamed).toEqual([])
    expect(field()).not.toBeNull()
  })
})
