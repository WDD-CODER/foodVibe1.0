import { fakeAsync, tick } from '@angular/core/testing';
import { UserMsgService } from './user-msg.service';

describe('UserMsgService', () => {
  let service: UserMsgService;

  beforeEach(() => {
    service = new UserMsgService();
  });

  it('should show success and clear after 2s', fakeAsync(() => {
    service.onSetSuccessMsg('Done');
    expect(service.msg_()).toEqual({ txt: 'Done', type: 'success' });
    tick(2000);
    expect(service.msg_()).toBeNull();
  }));

  it('should coalesce rapid successes: replace and reset timer', fakeAsync(() => {
    service.onSetSuccessMsg('Saved 1');
    service.onSetSuccessMsg('Saved 2');
    service.onSetSuccessMsg('Saved 3');
    expect(service.msg_()?.txt).toBe('Saved 3');
    tick(2000);
    expect(service.msg_()).toBeNull();
    tick(2000);
    expect(service.msg_()).toBeNull();
  }));

  it('should interrupt success when error arrives', fakeAsync(() => {
    service.onSetSuccessMsg('Saved');
    expect(service.msg_()?.type).toBe('success');
    service.onSetErrorMsg('Network failed');
    expect(service.msg_()?.type).toBe('error');
    expect(service.msg_()?.txt).toBe('Network failed');
    tick(4000);
    expect(service.msg_()).toBeNull();
  }));

  it('should queue multiple errors and show each in order', fakeAsync(() => {
    service.onSetErrorMsg('Error 1');
    expect(service.msg_()?.txt).toBe('Error 1');
    service.onSetErrorMsg('Error 2');
    service.onSetErrorMsg('Error 3');
    expect(service.msg_()?.txt).toBe('Error 1');
    tick(4000);
    expect(service.msg_()?.txt).toBe('Error 2');
    tick(4000);
    expect(service.msg_()?.txt).toBe('Error 3');
    tick(4000);
    expect(service.msg_()).toBeNull();
  }));

  it('should coalesce rapid warnings like success', fakeAsync(() => {
    service.onSetWarningMsg('Warn 1');
    service.onSetWarningMsg('Warn 2');
    expect(service.msg_()?.txt).toBe('Warn 2');
    tick(2000);
    expect(service.msg_()).toBeNull();
  }));

  it('CloseMsg clears current and shows next from pending', fakeAsync(() => {
    service.onSetSuccessMsg('First');
    service.onSetSuccessMsg('Second');
    expect(service.msg_()?.txt).toBe('Second');
    service.CloseMsg();
    expect(service.msg_()).toBeNull();
    service.onSetErrorMsg('Error after close');
    expect(service.msg_()?.txt).toBe('Error after close');
  }));

  it('success while error is showing is queued and shown after error', fakeAsync(() => {
    service.onSetErrorMsg('Error first');
    service.onSetSuccessMsg('Success after');
    expect(service.msg_()?.txt).toBe('Error first');
    tick(4000);
    expect(service.msg_()?.txt).toBe('Success after');
    tick(2000);
    expect(service.msg_()).toBeNull();
  }));

  it('onSetSuccessMsgWithUndo sets message with undo', () => {
    const undo = jasmine.createSpy('undo');
    service.onSetSuccessMsgWithUndo('Undo me', undo);
    expect(service.msg_()).toEqual({ txt: 'Undo me', type: 'success', undo });
  });
});
