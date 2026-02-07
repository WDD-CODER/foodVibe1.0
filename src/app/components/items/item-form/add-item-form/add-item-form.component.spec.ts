import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddItemFormComponent } from './add-item-form.component';
import { ItemDataService } from '@services/items-data.service';
import { Router } from '@angular/router';
import { ItemFormComponent } from '../item-form.component';
import { By } from '@angular/platform-browser';
import { ItemLedger } from '@models/ingredient.model';

describe('AddItemFormComponent', () => {
  let component: AddItemFormComponent;
  let fixture: ComponentFixture<AddItemFormComponent>;
  
  // Mocks הגדרת
  const mockItemDataService = {
    addItem: jasmine.createSpy('addItem').and.returnValue(Promise.resolve()),
    allItems_: () => [] // מחזיר מערך ריק כברירת מחדל עבור ה-Signal בסרוויס
  };

  const mockRouter = {
    navigate: jasmine.createSpy('navigate')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // ייבוא הקומפוננטה הנבדקת והבת שלה (שתיהן Standalone)
      imports: [AddItemFormComponent, ItemFormComponent],
      providers: [
        { provide: ItemDataService, useValue: mockItemDataService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AddItemFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('Business Logic', () => {
    it('should call addItem and navigate to list on onSave', async () => {
      const dummyItem: ItemLedger = { _id: 'item_1', itemName: 'Test Item' } as any;
      
      await component.onSave(dummyItem);

      expect(mockItemDataService.addItem).toHaveBeenCalledWith(dummyItem);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/inventory/list']);
    });

    it('should navigate to edit page on onSwitch', () => {
      const dummyItem: ItemLedger = { _id: '123', itemName: 'Switch Item' } as any;
      
      component.onSwitch(dummyItem);

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/inventory/edit', '123']);
    });

    it('should navigate back to inventory list on onBack', () => {
      component.onBack();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/inventory/list']);
    });
  });

  describe('Child Interaction (ItemFormComponent)', () => {
    it('should trigger onSave when child emits save event', () => {
      spyOn(component, 'onSave');
      const childDebugElement = fixture.debugElement.query(By.directive(ItemFormComponent));
      const dummyItem: ItemLedger = { _id: 'test', itemName: 'From Child' } as any;

      childDebugElement.componentInstance.save.emit(dummyItem);

      expect(component.onSave).toHaveBeenCalledWith(dummyItem);
    });

    it('should trigger onBack when child emits cancel event', () => {
      spyOn(component, 'onBack');
      const childDebugElement = fixture.debugElement.query(By.directive(ItemFormComponent));

      childDebugElement.componentInstance.cancel.emit();

      expect(component.onBack).toHaveBeenCalled();
    });
  });
});