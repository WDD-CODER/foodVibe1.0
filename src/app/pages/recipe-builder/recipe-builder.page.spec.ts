import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RecipeBuilderPage } from './recipe-builder.page';
import { LucideAngularModule, PlusCircle, ChevronDown, Plus, Trash2, Timer, Search, Minus, ArrowUpDown, X } from 'lucide-angular';

describe('RecipeBuilderComponent', () => {
  let component: RecipeBuilderPage;
  let fixture: ComponentFixture<RecipeBuilderPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeBuilderPage, LucideAngularModule.pick({ PlusCircle, ChevronDown, Plus, Trash2, Timer, Search, Minus, ArrowUpDown, X })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: {}, paramMap: { get: () => null } }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeBuilderPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
