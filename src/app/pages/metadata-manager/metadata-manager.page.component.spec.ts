import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MetadataManagerComponent } from './metadata-manager.page.component';


describe('MetadataManagerPageComponent', () => {
  let component: MetadataManagerComponent;
  let fixture: ComponentFixture<MetadataManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetadataManagerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MetadataManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
