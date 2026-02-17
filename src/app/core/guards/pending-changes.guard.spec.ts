import { TestBed } from '@angular/core/testing';
import { CanDeactivateFn } from '@angular/router';
import { pendingChangesGuard } from './pending-changes.guard';

describe('pendingChangesGuard', () => {
  const executeGuard: CanDeactivateFn<unknown> = (...guardParameters) =>
    TestBed.runInInjectionContext(() => pendingChangesGuard(...(guardParameters as Parameters<typeof pendingChangesGuard>)));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
