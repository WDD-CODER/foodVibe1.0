import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserMsg } from './user-msg.component';
import { UserMsgService } from '@services/user-msg.service';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('UserMsg', () => {
  let component: UserMsg;
  let fixture: ComponentFixture<UserMsg>;
  let mockUserMsgService: jasmine.SpyObj<UserMsgService>;

  // Signal to simulate service state
  const msgSignal = signal<{ txt: string; type: string } | null>(null);

  beforeEach(async () => {
    mockUserMsgService = jasmine.createSpyObj('UserMsgService', ['CloseMsg']);
    // Cast to any to override the readonly property for testing
    (mockUserMsgService as any).msg_ = msgSignal;

    await TestBed.configureTestingModule({
      imports: [UserMsg],
      providers: [
        { provide: UserMsgService, useValue: mockUserMsgService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserMsg);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    msgSignal.set(null);
  });

  it('should not render anything when msg_ is null', () => {
    msgSignal.set(null);
    fixture.detectChanges();
    const container = fixture.debugElement.query(By.css('.user-msg'));
    expect(container).toBeNull();
  });

  it('should render message text and apply correct class when msg_ exists', () => {
    const testMsg = { txt: 'Operation Successful', type: 'success' };
    msgSignal.set(testMsg);
    fixture.detectChanges();

    const container = fixture.debugElement.query(By.css('.user-msg'));
    const textElement = fixture.debugElement.query(By.css('p'));

    expect(container).toBeTruthy();
    expect(container.nativeElement.classList).toContain('success');
    expect(textElement.nativeElement.textContent).toContain('Operation Successful');
  });

  it('should apply "error" class for error type messages', () => {
    msgSignal.set({ txt: 'Error occurred', type: 'error' });
    fixture.detectChanges();

    const container = fixture.debugElement.query(By.css('.user-msg'));
    expect(container.nativeElement.classList).toContain('error');
  });

  it('should call CloseMsg on service when clicked', () => {
    msgSignal.set({ txt: 'Click me', type: 'success' });
    fixture.detectChanges();

    const container = fixture.debugElement.query(By.css('.user-msg'));
    container.triggerEventHandler('click', new MouseEvent('click'));

    expect(mockUserMsgService.CloseMsg).toHaveBeenCalled();
  });

  it('should verify signal reactivity in the template', () => {
    // Initial state: hidden
    expect(fixture.debugElement.query(By.css('.user-msg'))).toBeNull();

    // Update signal
    msgSignal.set({ txt: 'Reactive Update', type: 'success' });
    fixture.detectChanges();

    // Now visible
    expect(fixture.debugElement.query(By.css('.user-msg'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('p')).nativeElement.textContent).toContain('Reactive Update');
  });
});
