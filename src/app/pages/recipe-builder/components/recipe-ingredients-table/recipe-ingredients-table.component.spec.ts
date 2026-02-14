import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecipeIngredientsTableComponent } from './recipe-ingredients-table.component';

describe('RecipeIngredientsTableComponent', () => {
  let component: RecipeIngredientsTableComponent;
  let fixture: ComponentFixture<RecipeIngredientsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeIngredientsTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecipeIngredientsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
