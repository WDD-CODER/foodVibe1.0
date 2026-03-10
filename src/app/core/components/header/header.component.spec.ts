import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { HeaderComponent } from './header.component';
import { provideRouter, RouterLinkWithHref } from '@angular/router';
import { By } from '@angular/platform-browser';
import { LucideAngularModule, Menu, X, CircleUserRound, LogOut } from 'lucide-angular';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent, HttpClientTestingModule, LucideAngularModule.pick({ Menu, X, CircleUserRound, LogOut })],
      providers: [
        // מספקים נתיבים ריקים כדי לאפשר ל-RouterLink לעבוד בבדיקה
        provideRouter([
          { path: 'dashboard', redirectTo: '' },
          { path: 'inventory', redirectTo: '' },
          { path: 'recipe-builder', redirectTo: '' },
          { path: 'recipe-book', redirectTo: '' },
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

    expect(hrefs).toContain('/dashboard');
    expect(hrefs).toContain('/inventory');
    expect(hrefs).toContain('/recipe-book');
    expect(hrefs).toContain('/menu-library');
  });

  it('should have 4 navigation links', () => {
    const navLinks = fixture.nativeElement.querySelectorAll('li a');
    expect(navLinks.length).toBe(4);
  });
});
