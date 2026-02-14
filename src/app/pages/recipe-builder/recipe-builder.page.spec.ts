import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecipeBuilderPage } from './recipe-builder.page';

describe('RecipeBuilderComponent', () => {
  let component: RecipeBuilderPage;
  let fixture: ComponentFixture<RecipeBuilderPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeBuilderPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecipeBuilderPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
