import { TestBed } from '@angular/core/testing'
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router'
import { FormControl, FormGroup } from '@angular/forms'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { pendingChangesGuard, PendingChangesComponent } from './pending-changes.guard'

describe('pendingChangesGuard', () => {
  let open: jasmine.Spy
  let openTernary: jasmine.Spy

  const run = (component: PendingChangesComponent): Promise<boolean> =>
    TestBed.runInInjectionContext(() =>
      pendingChangesGuard(component, {} as ActivatedRouteSnapshot, {} as RouterStateSnapshot, {} as RouterStateSnapshot)
    ) as Promise<boolean>

  const dirtyForm = (): FormGroup => {
    const form = new FormGroup({ name: new FormControl('') })
    form.markAsDirty()
    return form
  }

  beforeEach(() => {
    open = jasmine.createSpy('open').and.resolveTo(true)
    openTernary = jasmine.createSpy('openTernary').and.resolveTo('confirm')
    TestBed.configureTestingModule({
      providers: [{ provide: ConfirmModalService, useValue: { open, openTernary } }]
    })
  })

  it('lets the user leave without a modal when nothing changed', async () => {
    expect(await run({ readProductForm_: new FormGroup({}) })).toBeTrue()
    expect(open).not.toHaveBeenCalled()
    expect(openTernary).not.toHaveBeenCalled()
  })

  it('lets the user leave without a modal after a successful submit', async () => {
    expect(await run({ readProductForm_: dirtyForm(), isSubmitted: true })).toBeTrue()
    expect(open).not.toHaveBeenCalled()
  })

  it('lets the user leave without a modal when the form is disabled', async () => {
    const form = dirtyForm()
    form.disable()
    expect(await run({ readProductForm_: form })).toBeTrue()
    expect(open).not.toHaveBeenCalled()
  })

  it('uses hasRealChanges over the form dirty flag', async () => {
    expect(await run({ readProductForm_: dirtyForm(), hasRealChanges: () => false })).toBeTrue()
    expect(open).not.toHaveBeenCalled()
  })

  it('a form-less page opts in with hasRealChanges alone', async () => {
    expect(await run({ hasRealChanges: () => true })).toBeTrue()
    expect(open).toHaveBeenCalledTimes(1)
  })

  it('asks when dirty, and leaves when confirmed', async () => {
    expect(await run({ recipeForm_: dirtyForm() })).toBeTrue()
    expect(open).toHaveBeenCalledWith(
      'unsaved_changes_confirm',
      jasmine.objectContaining({ saveLabel: 'leave_without_saving' })
    )
  })

  it('stays when the user cancels', async () => {
    open.and.resolveTo(false)
    expect(await run({ recipeForm_: dirtyForm() })).toBeFalse()
  })

  describe('with saveAndWait (three buttons)', () => {
    it('leaves without saving on "leave without saving"', async () => {
      const saveAndWait = jasmine.createSpy('saveAndWait').and.resolveTo(true)
      openTernary.and.resolveTo('confirm')
      expect(await run({ hasRealChanges: () => true, saveAndWait })).toBeTrue()
      expect(saveAndWait).not.toHaveBeenCalled()
    })

    it('saves, then leaves when the save works', async () => {
      const saveAndWait = jasmine.createSpy('saveAndWait').and.resolveTo(true)
      openTernary.and.resolveTo('save')
      expect(await run({ hasRealChanges: () => true, saveAndWait })).toBeTrue()
      expect(saveAndWait).toHaveBeenCalledTimes(1)
    })

    it('stays when the save fails', async () => {
      const saveAndWait = jasmine.createSpy('saveAndWait').and.resolveTo(false)
      openTernary.and.resolveTo('save')
      expect(await run({ hasRealChanges: () => true, saveAndWait })).toBeFalse()
    })

    it('stays on cancel, without saving', async () => {
      const saveAndWait = jasmine.createSpy('saveAndWait').and.resolveTo(true)
      openTernary.and.resolveTo('cancel')
      expect(await run({ hasRealChanges: () => true, saveAndWait })).toBeFalse()
      expect(saveAndWait).not.toHaveBeenCalled()
    })
  })
})
