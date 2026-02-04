import { ClickOutSideDirective } from './click-out-side';
import { Component } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

@Component({
  standalone: true,
  template: `
    <div id="target" (clickOutside)="onOut()">
      <span id="inside">Inside Content</span>
    </div>
    <button id="outside">Outside Button</button>
  `,
  imports: [ClickOutSideDirective]
})
class TestHostComponent {
  onOut() {}
}

describe('ClickOutSideDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let component: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent] // ייבוא הקומפוננטה המארחת
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create instance', () => {
    const directive = fixture.debugElement.query(By.directive(ClickOutSideDirective));
    expect(directive).toBeTruthy();
  });

  it('should emit when clicking outside the element', () => {
    // 1. הגדרת מרגל אחרי הפונקציה בקומפוננטה
    spyOn(component, 'onOut');

    // 2. סימולציית לחיצה על אלמנט שמחוץ לדירקטיבה
    const outsideButton = fixture.nativeElement.querySelector('#outside');
    outsideButton.click();

    // 3. וידוא שהאירוע נורה
    expect(component.onOut).toHaveBeenCalled();
  });

  it('should NOT emit when clicking inside the element', () => {
    spyOn(component, 'onOut');

    // סימולציית לחיצה בתוך האלמנט שעליו הדירקטיבה
    const insideSpan = fixture.nativeElement.querySelector('#inside');
    insideSpan.click();

    // וידוא שהאירוע לא נורה
    expect(component.onOut).not.toHaveBeenCalled();
  });
});