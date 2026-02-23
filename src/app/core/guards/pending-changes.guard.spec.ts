import { TestBed } from '@angular/core/testing';
import { CanDeactivateFn } from '@angular/router';
import { pendingChangesGuard } from './pending-changes.guard';
import { ConfirmModalService } from '@services/confirm-modal.service';
import { UserMsgService } from '@services/user-msg.service';
import { FormControl } from '@angular/forms';

describe('pendingChangesGuard', () => {
  let mockConfirmModal: jasmine.SpyObj<Pick<ConfirmModalService, 'open'>>;
  let mockUserMsg: jasmine.SpyObj<Pick<UserMsgService, 'onSetErrorMsg'>>;

  const executeGuard: CanDeactivateFn<unknown> = (...guardParameters) =>
    TestBed.runInInjectionContext(() =>
      pendingChangesGuard(...(guardParameters as Parameters<typeof pendingChangesGuard>))
    );

  beforeEach(() => {
    mockConfirmModal = jasmine.createSpyObj('ConfirmModalService', ['open']);
    mockUserMsg = jasmine.createSpyObj('UserMsgService', ['onSetErrorMsg']);
    TestBed.configureTestingModule({
      providers: [
        { provide: ConfirmModalService, useValue: mockConfirmModal },
        { provide: UserMsgService, useValue: mockUserMsg }
      ]
    });
  });

  it('should allow navigation when component has no form', async () => {
    const result = await executeGuard(undefined as any, {} as any, {} as any, {} as any);
    expect(result).toBe(true);
    expect(mockConfirmModal.open).not.toHaveBeenCalled();
  });

  it('should allow navigation when form is not dirty', async () => {
    const form = new FormControl('x');
    form.markAsPristine();
    form.markAsTouched();
    const component = { recipeForm_: form };
    const result = await executeGuard(component as any, {} as any, {} as any, {} as any);
    expect(result).toBe(true);
    expect(mockConfirmModal.open).not.toHaveBeenCalled();
  });

  it('should allow navigation when isSubmitted is true', async () => {
    const form = new FormControl('x');
    form.markAsDirty();
    const component = { recipeForm_: form, isSubmitted: true };
    const result = await executeGuard(component as any, {} as any, {} as any, {} as any);
    expect(result).toBe(true);
    expect(mockConfirmModal.open).not.toHaveBeenCalled();
  });

  it('should show modal when form is dirty and allow navigation when user confirms', async () => {
    mockConfirmModal.open.and.returnValue(Promise.resolve(true));
    const form = new FormControl('x');
    form.markAsDirty();
    const component = { recipeForm_: form };
    const result = await executeGuard(component as any, {} as any, {} as any, {} as any);
    expect(mockConfirmModal.open).toHaveBeenCalledWith('unsaved_changes_confirm', {
      saveLabel: 'leave_without_saving'
    });
    expect(mockUserMsg.onSetErrorMsg).toHaveBeenCalledWith(
      'השינויים לא נשמרו - המידע יאבד בעת יציאה'
    );
    expect(result).toBe(true);
  });

  it('should show modal when form is dirty and block navigation when user cancels', async () => {
    mockConfirmModal.open.and.returnValue(Promise.resolve(false));
    const form = new FormControl('x');
    form.markAsDirty();
    const component = { recipeForm_: form };
    const result = await executeGuard(component as any, {} as any, {} as any, {} as any);
    expect(mockConfirmModal.open).toHaveBeenCalledWith('unsaved_changes_confirm', {
      saveLabel: 'leave_without_saving'
    });
    expect(mockUserMsg.onSetErrorMsg).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });
});
