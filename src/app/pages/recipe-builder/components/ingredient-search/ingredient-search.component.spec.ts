import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IngredientSearchComponent } from './ingredient-search.component';
import { LucideAngularModule, Search } from 'lucide-angular';

describe('IngredientSearchComponent', () => {
  let component: IngredientSearchComponent;
  let fixture: ComponentFixture<IngredientSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IngredientSearchComponent, LucideAngularModule.pick({ Search })]
    }).compileComponents();

    fixture = TestBed.createComponent(IngredientSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
