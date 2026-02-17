import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { RecipeBuilderPage } from './recipe-builder.page';

describe('RecipeBuilderComponent', () => {
  let component: RecipeBuilderPage;
  let fixture: ComponentFixture<RecipeBuilderPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeBuilderPage],
      providers: [
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
