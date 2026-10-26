import { computed, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { PermissionAction, PermissionService } from './permission.service'
import { UserService } from './user.service'
import type { User } from '../models/user.model'
import type { Recipe } from '../models/recipe.model'

const OWNER: User = { _id: 'o1', name: 'owner', email: 'o@x', businessId: 'b1', businessRole: 'owner' }
const STAFF: User = { _id: 's1', name: 'cook', email: 's@x', businessId: 'b1', businessRole: 'staff' }
const ACTIONS: PermissionAction[] = [
  'create',
  'edit',
  'delete',
  'editMoney',
  'changeStage',
  'addNote',
  'markArrival',
  'manageTeam',
  'editSettings',
  'editTaxonomy'
]

describe('PermissionService.can', () => {
  const user_ = signal<User | null>(null)
  let service: PermissionService

  beforeEach(() => {
    user_.set(null)
    TestBed.configureTestingModule({
      providers: [
        { provide: UserService, useValue: { user_, isOwner_: computed(() => user_()?.businessRole === 'owner') } }
      ]
    })
    service = TestBed.inject(PermissionService)
  })

  it('signed out: nothing is allowed', () => {
    for (const action of ACTIONS) expect(service.can(action, { type: 'recipes', doc: { createdBy: 's1' } })).toBeFalse()
    expect(service.isOwner_()).toBeFalse()
  })

  it('owner: every action is allowed', () => {
    user_.set(OWNER)
    for (const action of ACTIONS)
      expect(service.can(action, { type: 'recipes', doc: { createdBy: 'someone' } })).toBeTrue()
    expect(service.isOwner_()).toBeTrue()
  })

  describe('staff', () => {
    beforeEach(() => user_.set(STAFF))

    it('creates anything', () => {
      expect(service.can('create', { type: 'products' })).toBeTrue()
    })

    it('edits and deletes only what he created', () => {
      const own = { createdBy: 's1' }
      const foreign = { createdBy: 'o1' }
      for (const action of ['edit', 'delete'] as const) {
        expect(service.can(action, { type: 'recipes', doc: own })).toBeTrue()
        expect(service.can(action, { type: 'recipes', doc: foreign })).toBeFalse()
        expect(service.can(action, { type: 'recipes', doc: {} })).toBeFalse()
        expect(service.can(action, { type: 'recipes' })).toBeFalse()
      }
    })

    it('never changes money, team, settings or the locked taxonomy kinds', () => {
      for (const action of ['editMoney', 'manageTeam', 'editSettings'] as const) expect(service.can(action)).toBeFalse()
      for (const kind of ['eventType', 'menuType', 'station']) {
        expect(service.can('editTaxonomy', { type: 'taxonomyTerms', doc: { kind } })).toBeFalse()
      }
    })

    it('changes the stage only of his own events, but notes and arrivals on any event', () => {
      expect(service.can('changeStage', { type: 'menuEvents', doc: { createdBy: 's1' } })).toBeTrue()
      expect(service.can('changeStage', { type: 'menuEvents', doc: { createdBy: 'o1' } })).toBeFalse()
      expect(service.can('changeStage', { type: 'recipes', doc: { createdBy: 's1' } })).toBeFalse()
      expect(service.can('addNote', { type: 'menuEvents', doc: { createdBy: 'o1' } })).toBeTrue()
      expect(service.can('markArrival', { type: 'menuEvents', doc: { createdBy: 'o1' } })).toBeTrue()
      expect(service.can('addNote', { type: 'recipes' })).toBeFalse()
    })
  })
})

describe('PermissionService.isReadOnlyRecipe (plan 476)', () => {
  const user_ = signal<User | null>(null)
  let service: PermissionService

  beforeEach(() => {
    user_.set(null)
    TestBed.configureTestingModule({
      providers: [
        { provide: UserService, useValue: { user_, isOwner_: computed(() => user_()?.businessRole === 'owner') } }
      ]
    })
    service = TestBed.inject(PermissionService)
  })

  const recipe = (createdBy: string, recipeType?: 'dish') => ({ _id: 'x', createdBy, recipeType }) as unknown as Recipe

  it('is false for an owner, a signed-out visitor and null', () => {
    expect(service.isReadOnlyRecipe(recipe('s1'))).toBeFalse()
    user_.set(OWNER)
    expect(service.isReadOnlyRecipe(recipe('s1'))).toBeFalse()
    user_.set(STAFF)
    expect(service.isReadOnlyRecipe(null)).toBeFalse()
  })

  it('is false for staff on a recipe or dish he created', () => {
    user_.set(STAFF)
    expect(service.isReadOnlyRecipe(recipe('s1'))).toBeFalse()
    expect(service.isReadOnlyRecipe(recipe('s1', 'dish'))).toBeFalse()
  })

  it('is true for staff on a recipe or dish someone else created', () => {
    user_.set(STAFF)
    expect(service.isReadOnlyRecipe(recipe('o1'))).toBeTrue()
    expect(service.isReadOnlyRecipe(recipe('o1', 'dish'))).toBeTrue()
  })
})
