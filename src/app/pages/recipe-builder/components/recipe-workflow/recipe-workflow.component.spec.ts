import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecipeWorkflowComponent } from './recipe-workflow.component';

describe('RecipeWorkflowComponent', () => {
  let component: RecipeWorkflowComponent;
  let fixture: ComponentFixture<RecipeWorkflowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeWorkflowComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecipeWorkflowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
