import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecipeBuilderComponent } from './recipe-builder.component';

describe('RecipeBuilderComponent', () => {
  let component: RecipeBuilderComponent;
  let fixture: ComponentFixture<RecipeBuilderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeBuilderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecipeBuilderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
