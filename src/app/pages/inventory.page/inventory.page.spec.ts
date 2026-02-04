import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, RouterLinkWithHref } from '@angular/router';
import { By } from '@angular/platform-browser';
import { InventoryPage } from './inventory.page';

describe('InventoryPage', () => {
  let component: InventoryPage;
  let fixture: ComponentFixture<InventoryPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryPage],
      providers: [
        // הגדרת נתיבי דמה כדי לאפשר ל-RouterLink לעבוד בבדיקה
        provideRouter([
          { path: 'list', redirectTo: '' },
          { path: 'add', redirectTo: '' },
          { path: 'edit', redirectTo: '' }
        ])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should contain a router-outlet for child routes', () => {
    const outlet = fixture.nativeElement.querySelector('router-outlet');
    expect(outlet).toBeTruthy();
  });

  it('should have correct navigation links', () => {
    // איתור כל הקישורים שמשתמשים ב-RouterLink
    const linkDebugElements = fixture.debugElement.queryAll(By.directive(RouterLinkWithHref));
    const hrefs = linkDebugElements.map(de => de.attributes['routerLink']);

    expect(hrefs).toContain('list');
    expect(hrefs).toContain('add');
    expect(hrefs).toContain('edit');
  });

  it('should render 3 navigation items in the list', () => {
    const navItems = fixture.nativeElement.querySelectorAll('.inventory-nav li');
    expect(navItems.length).toBe(3);
  });
});