import { Component, ElementRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectOnFocusDirective } from './select-on-focus.directive';

// 1. Create a Test Host Component to house the directive
@Component({
  standalone: true,
  imports: [SelectOnFocusDirective],
  template: `<input SelectOnFocus #inputField>`
})
class TestHostComponent {
  @ViewChild('inputField') inputElement!: ElementRef<HTMLInputElement>;
}

describe('SelectOnFocusDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let hostComponent: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, SelectOnFocusDirective]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the host component', () => {
    expect(hostComponent).toBeTruthy();
  });

  it('should select the text when the input is focused', () => {
    const inputEl = hostComponent.inputElement.nativeElement;
    
    // Create a spy on the native select method
    const selectSpy = spyOn(inputEl, 'select');

    // Trigger the focus event
    inputEl.dispatchEvent(new Event('focus'));
    
    // Assert the spy was called
    expect(selectSpy).toHaveBeenCalled();
  });
});