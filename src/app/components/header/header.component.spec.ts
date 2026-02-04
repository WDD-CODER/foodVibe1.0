import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { provideRouter, RouterLinkWithHref } from '@angular/router';
import { By } from '@angular/platform-browser';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        // מספקים נתיבים ריקים כדי לאפשר ל-RouterLink לעבוד בבדיקה
        provideRouter([
          { path: 'inventory', redirectTo: '' },
          { path: 'recipes', redirectTo: '' },
          { path: 'dishes', redirectTo: '' },
          { path: 'menu-creating', redirectTo: '' },
          { path: 'checklist-creator', redirectTo: '' }
        ])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have correct router links', () => {
    // איתור כל האלמנטים שמשתמשים ב-RouterLink
    const linkDebugElements = fixture.debugElement.queryAll(By.directive(RouterLinkWithHref));
    
    // שליפת הכתובות אליהן הקישורים מצביעים
    const hrefs = linkDebugElements.map(de => de.attributes['routerLink']);

    expect(hrefs).toContain('/inventory');
    expect(hrefs).toContain('/recipes');
    expect(hrefs).toContain('/dishes');
    expect(hrefs).toContain('/menu-creating');
    expect(hrefs).toContain('/checklist-creator');
  });

  it('should have 5 navigation links', () => {
    const navLinks = fixture.nativeElement.querySelectorAll('li a');
    expect(navLinks.length).toBe(5);
  });
});