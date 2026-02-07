// import { ComponentFixture, TestBed } from '@angular/core/testing';
// import { InventoryItemListComponent } from './inventory-item-list.component';
// import { ItemDataService } from '@services/items-data.service';
// import { KitchenStateService } from '@services/kitchen-state.service';
// import { Router } from '@angular/router';
// import { signal } from '@angular/core';
// import { By } from '@angular/platform-browser';

// describe('InventoryItemListComponent', () => {
//   let component: InventoryItemListComponent;
//   let fixture: ComponentFixture<InventoryItemListComponent>;
  
//   // Mocks
//   const mockItemDataService = {
//     allItems_: signal([])
//   };
  
//   const mockKitchenState = {
//     products_: signal([
//       {
//         id: '1',
//         name_hebrew: 'Tomato',
//         category_: 'Vegetables',
//         supplierId_: 'Supplier A',
//         allergens_: ['Gluten']
//       },
//       {
//         id: '2',
//         name_hebrew: 'Milk',
//         category_: 'Dairy',
//         supplierId_: 'Supplier B',
//         allergens_: ['Dairy']
//       }
//     ]),
//     deleteProduct: jasmine.createSpy('deleteProduct')
//   };

//   const mockRouter = jasmine.createSpyObj('Router', ['navigate']);

//   beforeEach(async () => {
//     await TestBed.configureTestingModule({
//       imports: [InventoryItemListComponent],
//       providers: [
//         { provide: ItemDataService, useValue: mockItemDataService },
//         { provide: KitchenStateService, useValue: mockKitchenState },
//         { provide: Router, useValue: mockRouter }
//       ]
//     }).compileComponents();

//     fixture = TestBed.createComponent(InventoryItemListComponent);
//     component = fixture.componentInstance;
//     fixture.detectChanges();
//   });

//   it('should generate filter categories based on products in state', () => {
//     const categories = (component as any).filterCategories_();
//     const names = categories.map((c: any) => c.name);
    
//     expect(names).toContain('Category');
//     expect(names).toContain('Supplier');
//     expect(names).toContain('Allergens');
//   });

//   it('should filter items when a filter is toggled', () => {
//     // Act: Toggle Dairy category
//     (component as any).toggleFilter('Category', 'Dairy');
//     fixture.detectChanges();

//     // Assert: Computed signal should react
//     const results = (component as any).filteredItems_();
//     expect(results.length).toBe(1);
//     expect(results[0].name_hebrew).toBe('Milk');
//   });

//   it('should show all items when filters are cleared', () => {
//     // Set a filter then clear it
//     (component as any).toggleFilter('Category', 'Dairy');
//     (component as any).toggleFilter('Category', 'Dairy'); // Toggle off
//     fixture.detectChanges();

//     const results = (component as any).filteredItems_();
//     expect(results.length).toBe(2);
//   });

//   it('should handle multiple filter categories (AND logic between categories)', () => {
//     // Category: Vegetables AND Allergens: Gluten
//     (component as any).toggleFilter('Category', 'Vegetables');
//     (component as any).toggleFilter('Allergens', 'Gluten');
//     fixture.detectChanges();

//     const results = (component as any).filteredItems_();
//     expect(results.length).toBe(1);
//     expect(results[0].name_hebrew).toBe('Tomato');
//   });

//   it('should display "No results" message when filter matches nothing', () => {
//     // Manually set an impossible filter state via the signal
//     (component as any).activeFilters_.set({ 'Category': ['NonExistent'] });
//     fixture.detectChanges();

//     const compiled = fixture.nativeElement;
//     // Note: Ensure your HTML template has a class named 'no-results' for this to pass
//     const noResultsEl = compiled.querySelector('.no-results');
//     expect(noResultsEl).toBeTruthy();
//   });

//   it('should navigate to edit page when onEditProduct is called', () => {
//     (component as any).onEditProduct('123');
//     expect(mockRouter.navigate).toHaveBeenCalledWith(['inventory', 'edit', '123']);
//   });
// });