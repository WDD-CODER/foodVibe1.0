// import { ComponentFixture, TestBed } from '@angular/core/testing';
// import { UnitCreatorModal } from './unit-creator-modal.component';
// import { UnitRegistryService } from '@services/unit-registry.service';
// import { FormsModule } from '@angular/forms';
// import { LucideAngularModule, Check } from 'lucide-angular';
// import { ClickOutSideDirective } from '@directives/click-out-side';
// import { Component } from '@angular/core';

// // Mock Directive to satisfy template dependency
// @Component({
//   selector: '[appClickOutSide]',
//   standalone: true,
//   template: '<ng-content></ng-content>'
// })
// class MockClickOutsideDirective {}

// describe('UnitCreatorModal', () => {
//   let component: UnitCreatorModal;
//   let fixture: ComponentFixture<UnitCreatorModal>;
//   let unitRegistrySpy: jasmine.SpyObj<UnitRegistryService>;

//   beforeEach(async () => {
//     unitRegistrySpy = jasmine.createSpyObj('UnitRegistryService', ['registerUnit']);

//     await TestBed.configureTestingModule({
//       imports: [
//         UnitCreatorModal, 
//         FormsModule, 
//         LucideAngularModule.pick({ Check })
//       ],
//       providers: [
//         { provide: UnitRegistryService, useValue: unitRegistrySpy }
//       ]
//     })
//     // Overriding the directive if necessary or using the real one if simple
//     .compileComponents();

//     fixture = TestBed.createComponent(UnitCreatorModal);
//     component = fixture.componentInstance;
//     fixture.detectChanges();
//   });

//   it('should create the modal', () => {
//     expect(component).toBeTruthy();
//   });

//   describe('Business Logic: Saving Units', () => {
//     it('should register the unit in the global registry and emit the saved value', () => {
//       // 1. Setup spies for outputs
//       spyOn(component.unitSaved, 'emit');
//       spyOn(component.closed, 'emit');

//       // 2. Set local signal state
//       component.newUnitName.set('דלי');
//       component.newUnitValue.set(5000);
      
//       // 3. Trigger Save
//       component.save();

//       // 4. Assert Global Persistence (SoT)
//       expect(unitRegistrySpy.registerUnit).toHaveBeenCalledWith('דלי', 5000);

//       // 5. Assert Output Communication
//       expect(component.unitSaved.emit).toHaveBeenCalledWith({
//         symbol: 'דלי',
//         rate: 5000
//       });

//       // 6. Assert Modal Cleanup
//       expect(component.closed.emit).toHaveBeenCalled();
//     });

//     it('should disable the save button if name is empty or value is <= 0', () => {
//       component.newUnitName.set('');
//       component.newUnitValue.set(10);
//       fixture.detectChanges();

//       const saveBtn = fixture.nativeElement.querySelector('button.bg-slate-900');
//       expect(saveBtn.disabled).toBeTrue();
//     });
//   });

//   describe('UI Math: Net Cost Preview', () => {
//     it('should display the calculated cost when netUnitCost input is provided', () => {
//       // Set the input signal using the componentRef API
//       fixture.componentRef.setInput('netUnitCost', 0.5); // 0.5 NIS per gram
//       component.newUnitValue.set(1000); // 1000 grams
//       fixture.detectChanges();

//       const costDisplay = fixture.nativeElement.querySelector('.text-xl.font-black');
//       // 0.5 * 1000 = 500
//       expect(costDisplay.textContent).toContain('₪500.00');
//     });
//   });

//   describe('Modal Lifecycle', () => {
//     it('should reset and close when resetAndClose is called', () => {
//       spyOn(component.closed, 'emit');
      
//       component.newUnitName.set('Temp');
//       component.resetAndClose();

//       expect(component.newUnitName()).toBe('');
//       expect(component.closed.emit).toHaveBeenCalled();
//     });
//   });
// });