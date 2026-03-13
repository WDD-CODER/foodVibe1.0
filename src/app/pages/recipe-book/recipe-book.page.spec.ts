import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { LucideAngularModule, Menu, Plus, X, Search, ArrowUpDown, ArrowUp, ArrowDown, ShieldAlert, Pencil, Trash2, BookOpen, Tag, ChevronRight, ChevronLeft, ChevronDown, CircleX, CookingPot } from 'lucide-angular';
import { RecipeBookPage } from './recipe-book.page';
import { RecipeBookListComponent } from './components/recipe-book-list/recipe-book-list.component';

describe('RecipeBookPage', () => {
  let component: RecipeBookPage;
  let fixture: ComponentFixture<RecipeBookPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RecipeBookPage,
        RecipeBookListComponent,
        LucideAngularModule.pick({ Menu, Plus, X, Search, ArrowUpDown, ArrowUp, ArrowDown, ShieldAlert, Pencil, Trash2, BookOpen, Tag, ChevronRight, ChevronLeft, ChevronDown, CircleX, CookingPot })
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { queryParams: of({}), params: of({}), snapshot: { queryParams: {}, params: {} } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeBookPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
