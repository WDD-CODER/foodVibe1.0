import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { InventoryPage } from './inventory.page';
import { provideRouter, RouterLink } from '@angular/router';
import { By } from '@angular/platform-browser';

describe('InventoryPage', () => {
  let component: InventoryPage;
  let fixture: ComponentFixture<InventoryPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryPage],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should have correct navigation links for current implementation', fakeAsync(() => {
    const expectedPaths = ['list', 'add'];
    
    // Ensure all signals and async bindings are processed
    fixture.detectChanges();
    tick();

    // 1. Find elements with RouterLink directive
    const linkDebugElements = fixture.debugElement.queryAll(By.directive(RouterLink));
    
    // 2. Extract values using the most compatible method for Signal Inputs
    const actualPaths = linkDebugElements.map(de => {
      const instance = de.injector.get(RouterLink);
      // In Angular 19, try accessing the property directly or through the component instance
      return de.properties['routerLink'] || (instance as any).routerLink;
    });
    
    // If still undefined, fallback to checking the 'href' which RouterLink populates
    const actualHrefs = linkDebugElements.map(de => de.nativeElement.getAttribute('href'));

    expect(actualPaths.length).toBe(2);
    
    // Check either the internal property or the rendered href (strip leading slash if present)
    const normalizedPaths = actualHrefs.map(h => h?.replace(/^\//, ''));
    expect(normalizedPaths).toEqual(jasmine.arrayContaining(expectedPaths));
  }));

  it('should render exactly 2 navigation items in the list', () => {
    const navElements = fixture.debugElement.queryAll(By.css('a.nav-link'));
    expect(navElements.length).toBe(2);
  });
});