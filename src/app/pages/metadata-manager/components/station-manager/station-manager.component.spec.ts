import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal, type WritableSignal } from '@angular/core'
import { By } from '@angular/platform-browser'
import { TaxonomyKindManagerComponent } from '../taxonomy-kind-manager/taxonomy-kind-manager.component'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { StationManagerComponent } from './station-manager.component'
import { StationRegistryService } from '@services/station-registry.service'
import { RecipeDataService } from '@services/recipe-data.service'
import { DishDataService } from '@services/dish-data.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { UserService } from '@services/user.service'
import { AuthModalService } from '@services/auth-modal.service'
import { TaxonomyStore } from '@services/taxonomy-store.service'

describe('StationManagerComponent', () => {
  let fixture: ComponentFixture<StationManagerComponent>
  let component: StationManagerComponent
  let registry: jasmine.SpyObj<StationRegistryService>
  let confirm: jasmine.SpyObj<ConfirmModalService>
  let userMsg: jasmine.SpyObj<UserMsgService>
  let recipes: jasmine.SpyObj<RecipeDataService>
  let dishes: jasmine.SpyObj<DishDataService>
  let loggedIn_: ReturnType<typeof signal<boolean>>
  let authModal: jasmine.SpyObj<AuthModalService>

  beforeEach(async () => {
    loggedIn_ = signal(true)
    registry = jasmine.createSpyObj<StationRegistryService>(
      'StationRegistryService',
      ['addStation', 'renameStation', 'removeStation', 'hasStation', 'canEdit'],
      { stations_: signal(['חם', 'קר']) as never }
    )
    registry.hasStation.and.callFake((k: string) => ['חם', 'קר'].includes(k))
    registry.canEdit.and.callFake((k: string) => k !== 'חם')
    registry.addStation.and.callFake((n: string) => Promise.resolve(n))
    registry.renameStation.and.returnValue(Promise.resolve(true))
    registry.removeStation.and.returnValue(Promise.resolve(true))
    confirm = jasmine.createSpyObj<ConfirmModalService>('ConfirmModalService', ['open'])
    confirm.open.and.returnValue(Promise.resolve(true))
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', [
      'onSetSuccessMsg',
      'onSetErrorMsg',
      'onSetWarningMsg'
    ])
    recipes = jasmine.createSpyObj<RecipeDataService>('RecipeDataService', ['reloadFromStorage'])
    recipes.reloadFromStorage.and.returnValue(Promise.resolve())
    dishes = jasmine.createSpyObj<DishDataService>('DishDataService', ['reloadFromStorage'])
    dishes.reloadFromStorage.and.returnValue(Promise.resolve())
    authModal = jasmine.createSpyObj<AuthModalService>('AuthModalService', ['open'])

    await TestBed.configureTestingModule({
      imports: [StationManagerComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: StationRegistryService, useValue: registry },
        { provide: RecipeDataService, useValue: recipes },
        { provide: DishDataService, useValue: dishes },
        { provide: ConfirmModalService, useValue: confirm },
        { provide: UserMsgService, useValue: userMsg },
        { provide: TranslationService, useValue: { translate: (k: string) => k } },
        { provide: UserService, useValue: { isLoggedIn: loggedIn_, isAdmin_: signal(false) } },
        { provide: AuthModalService, useValue: authModal },
        { provide: TaxonomyStore, useValue: { errorMessage: () => null } }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(StationManagerComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('renders the stations', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('חם')
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('קר')
  })

  it('adds a new station and clears the field', async () => {
    const input = document.createElement('input')
    input.value = 'גריל'
    await component.onAdd('גריל', input)
    expect(registry.addStation).toHaveBeenCalledWith('גריל')
    expect(input.value).toBe('')
    expect(userMsg.onSetSuccessMsg).toHaveBeenCalledWith('metadata_updated_success')
  })

  it('refuses a duplicate station name', async () => {
    await component.onAdd('קר', document.createElement('input'))
    expect(registry.addStation).not.toHaveBeenCalled()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('metadata_station_exists')
  })

  it('asks to sign in instead of adding when signed out', async () => {
    loggedIn_.set(false)
    await component.onAdd('גריל', document.createElement('input'))
    expect(registry.addStation).not.toHaveBeenCalled()
    expect(authModal.open).toHaveBeenCalledWith('sign-in')
  })

  it('renames after the confirm and refreshes recipes and dishes', async () => {
    await component.onRenameBlur('גריל', 'גריל פחמים')
    expect(confirm.open).toHaveBeenCalled()
    expect(registry.renameStation).toHaveBeenCalledWith('גריל', 'גריל פחמים')
    expect(recipes.reloadFromStorage).toHaveBeenCalled()
    expect(dishes.reloadFromStorage).toHaveBeenCalled()
  })

  it('does not rename when the confirm is declined', async () => {
    confirm.open.and.returnValue(Promise.resolve(false))
    await component.onRenameBlur('גריל', 'גריל פחמים')
    expect(registry.renameStation).not.toHaveBeenCalled()
  })

  describe('inline rename in the card (plan 468)', () => {
    const host = (): HTMLElement => fixture.nativeElement as HTMLElement
    const openField = (): HTMLInputElement => {
      const card = fixture.debugElement.query(By.directive(TaxonomyKindManagerComponent))
        .componentInstance as unknown as { editingItem_: WritableSignal<string | null> }
      card.editingItem_.set('קר')
      fixture.detectChanges()
      return host().querySelector('app-inline-rename-field input') as HTMLInputElement
    }

    it('asks before saving only after Save is pressed', async () => {
      const input = openField()
      input.value = 'קרח'
      input.dispatchEvent(new Event('input'))
      fixture.detectChanges()
      await fixture.whenStable()
      expect(confirm.open).not.toHaveBeenCalled()
      host().querySelector<HTMLButtonElement>('app-inline-rename-field button')!.click()
      await fixture.whenStable()
      expect(confirm.open).toHaveBeenCalled()
      expect(registry.renameStation).toHaveBeenCalledWith('קר', 'קרח')
    })

    it('does not ask or rename when the field loses focus', async () => {
      const input = openField()
      input.value = 'קרח'
      input.dispatchEvent(new FocusEvent('blur'))
      await fixture.whenStable()
      expect(confirm.open).not.toHaveBeenCalled()
      expect(registry.renameStation).not.toHaveBeenCalled()
    })
  })

  it('removes after the confirm', async () => {
    await component.onRemove('גריל')
    expect(registry.removeStation).toHaveBeenCalledWith('גריל')
  })

  it('shows the server error text when removal is refused', async () => {
    const store = TestBed.inject(TaxonomyStore) as unknown as { errorMessage: (e: unknown) => string | null }
    store.errorMessage = () => 'in use: מתכון א'
    registry.removeStation.and.returnValue(Promise.reject(new Error('409')))
    await component.onRemove('גריל')
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('in use: מתכון א')
  })

  it('locks a shared station for a non-admin', () => {
    expect(component['lockReason']('חם')).toBe('taxonomy_shared_admin_only')
    expect(component['lockReason']('גריל')).toBeNull()
  })
})
