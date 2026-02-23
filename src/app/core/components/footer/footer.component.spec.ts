// src/app/core/components/footer/footer.component.spec.ts
import { ComponentFixture, TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { FooterComponent } from './footer.component';
import { NgOptimizedImage } from '@angular/common';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent, NgOptimizedImage],
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize recipesCount_ with 0', () => {
    expect(component.recipesCount_()).toBe(0);
  });

  it('should update now_ signal every second', fakeAsync(() => {
    // 1. Create the fixture INSIDE fakeAsync to capture the interval
    const fixture = TestBed.createComponent(FooterComponent);
    const component = fixture.componentInstance;
    
    // 2. Initial detection to start the interval
    fixture.detectChanges();
    
    const initialTime = component.now_()?.getTime() || 0;
    
    // 3. Advance virtual time
    tick(1001); 
    
    // 4. Trigger change detection to propagate the signal update
    fixture.detectChanges(); 
  
    const updatedTime = component.now_()?.getTime() || 0;
    
    // 5. Verification
    expect(updatedTime).toBeGreaterThan(initialTime);
  
    // 6. Cleanup
    discardPeriodicTasks(); 
  }));

  it('should display the correct recipe count in the template', () => {
    // 1. Update the signal value
    component.recipesCount_.set(42);
    
    // 2. Trigger change detection to update the DOM
    fixture.detectChanges();
    
    // 3. Verify the rendered text in the right-content div
    const compiled = fixture.nativeElement as HTMLElement;
    const recipeText = compiled.querySelector('.right-content')?.textContent;
    expect(recipeText).toContain('Recipes: 42');
  });
});
