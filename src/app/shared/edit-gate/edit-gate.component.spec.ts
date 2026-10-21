import { Component, computed, signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { UserService } from '@services/user.service'
import { TranslationService } from '@services/translation.service'
import type { User } from '@models/user.model'
import { EditGateComponent } from './edit-gate.component'

@Component({
  selector: 'app-edit-gate-host',
  standalone: true,
  imports: [EditGateComponent],
  template: '<app-edit-gate type="recipes"><button data-testid="save">save</button></app-edit-gate>'
})
class HostComponent {}

const STAFF: User = { _id: 's1', name: 'cook', email: 's@x', businessId: 'b1', businessRole: 'staff' }
const OWNER: User = { _id: 'o1', name: 'owner', email: 'o@x', businessId: 'b1', businessRole: 'owner' }

describe('EditGateComponent', () => {
  let fixture: ComponentFixture<HostComponent>
  const user_ = signal<User | null>(null)

  function setup(user: User, data: Record<string, unknown>): void {
    user_.set(user)
    TestBed.configureTestingModule({
      imports: [HostComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: UserService, useValue: { user_, isOwner_: computed(() => user_()?.businessRole === 'owner') } },
        { provide: TranslationService, useValue: { translate: (key: string) => key } },
        { provide: ActivatedRoute, useValue: { snapshot: { data } } }
      ]
    })
    fixture = TestBed.createComponent(HostComponent)
    fixture.detectChanges()
  }

  const saveButton = () => fixture.nativeElement.querySelector('[data-testid="save"]')
  const note = () => fixture.nativeElement.querySelector('[data-testid="edit-gate-note"]')

  it('staff on a recipe another member created: content not rendered, note shown', () => {
    setup(STAFF, { recipe: { _id: 'r1', createdBy: 'o1' } })
    expect(saveButton()).toBeNull()
    expect(note()).not.toBeNull()
  })

  it('staff on his own recipe: content rendered', () => {
    setup(STAFF, { recipe: { _id: 'r1', createdBy: 's1' } })
    expect(saveButton()).not.toBeNull()
    expect(note()).toBeNull()
  })

  it('staff on a new recipe (no route data): content rendered', () => {
    setup(STAFF, {})
    expect(saveButton()).not.toBeNull()
  })

  it('owner on any recipe: content rendered', () => {
    setup(OWNER, { recipe: { _id: 'r1', createdBy: 's1' } })
    expect(saveButton()).not.toBeNull()
  })
})
