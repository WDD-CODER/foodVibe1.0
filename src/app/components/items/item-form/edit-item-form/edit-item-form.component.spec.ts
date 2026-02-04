import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditItemFormComponent } from './edit-item-form.component';
import { ItemDataService } from '../../../../core/services/items-data.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ItemFormComponent } from '../item-form.component';
import { ItemLedger } from '../../../../core/models/ingredient.model';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('EditItemFormComponent', () => {
  let component: EditItemFormComponent;
  let fixture: ComponentFixture<EditItemFormComponent>;

  // נתון דמה עבור הפריט שנשלף
  const mockItem: ItemLedger = { id: 'item_123', itemName: 'Existing Item' } as any;

  // Mock עבור הסרוויס
  const mockService = {
    getItem: jasmine.createSpy('getItem').and.returnValue(Promise.resolve(mockItem)),
    updateItem: jasmine.createSpy('updateItem').and.returnValue(Promise.resolve())
  };

  // Mock עבור ה-Router
  const mockRouter = {
    navigate: jasmine.createSpy('navigate')
  };

  // Mock עבור ה-ActivatedRoute עם ID ב-ParamMap
  const mockActivatedRoute = {
    snapshot: {
      paramMap: {
        get: (key: string) => key === 'id' ? 'item_123' : null
      }
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditItemFormComponent, ItemFormComponent],
      providers: [
        { provide: ItemDataService, useValue: mockService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EditItemFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch item on init using id from route', async () => {
    // מחכים לסיום הפונקציה האסינכרונית ngOnInit
    await fixture.whenStable();
    
    expect(mockService.getItem).toHaveBeenCalledWith('item_123');
    expect(component['item_']()).toEqual(mockItem);
  });

  it('should render item-form only after item is loaded', async () => {
    // לפני טעינה
    component['item_'].set(null);
    fixture.detectChanges();
    let form = fixture.debugElement.query(By.css('item-form'));
    expect(form).toBeFalsy();

    // אחרי טעינה
    component['item_'].set(mockItem);
    fixture.detectChanges();
    form = fixture.debugElement.query(By.css('item-form'));
    expect(form).toBeTruthy();
  });

  it('should call updateItem and navigate back onSave', async () => {
    const updatedItem: ItemLedger = { ...mockItem, itemName: 'Updated' };
    
    await component.onSave(updatedItem);

    expect(mockService.updateItem).toHaveBeenCalledWith(updatedItem);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/inventory/list']);
  });

  it('should navigate to list onBack', () => {
    component.onBack();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/inventory/list']);
  });
});