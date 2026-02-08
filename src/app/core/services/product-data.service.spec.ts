// import { TestBed } from '@angular/core/testing';
// import { StorageService } from './async-storage.service';
// import { ItemLedger } from '@models/ingredient.model';
// import { ProductDataService } from './product-data.service';

// describe('ProductDataService', () => {
//   let service: ProductDataService;
//   let storageSpy: jasmine.SpyObj<StorageService>;

//   const mockItems: ItemLedger[] = [
//     { _id: '1', itemName: 'Tomato', allergenIds: ['dairy'], properties: { topCategory: 'Veg' } } as any,
//     { _id: '2', itemName: 'Cucumber', allergenIds: ['dairy'], properties: { topCategory: 'Veg' } } as any
//   ];

//   beforeEach(() => {
//     // 1. Create a spy for StorageService
//     storageSpy = jasmine.createSpyObj('StorageService', ['query', 'get', 'post', 'put', 'remove']);
    
//     // 2. Setup the query to return our mock data for the constructor call
//     storageSpy.query.and.returnValue(Promise.resolve(mockItems));

//     TestBed.configureTestingModule({
//       providers: [
//         ProductDataService,
//         { provide: StorageService, useValue: storageSpy }
//       ]
//     });

//     service = TestBed.inject(ProductDataService);
//   });

//   it('should be created and load initial data', async () => {
//     // 3. Wait for the constructor's loadInitialData to finish
//     await new Promise(resolve => setTimeout(resolve, 0)); 
    
//     expect(service).toBeTruthy();
//     expect(service.allProducts_()).toEqual(mockItems);
//     expect(storageSpy.query).toHaveBeenCalledWith('item_list');
//   });

//   it('should compute allTopCategories_ correctly without duplicates', async () => {
//     await new Promise(resolve => setTimeout(resolve, 0));
//     expect(service.allTopCategories_()).toEqual(['Veg']);
//   });

//   it('should compute allAllergens_ correctly and deduplicate', async () => {
//     await new Promise(resolve => setTimeout(resolve, 0));
//     expect(service.allAllergens_()).toEqual(['dairy']);
//   });

//   it('should add an item and update the signal', async () => {
//     const newItem = { itemName: 'Onion' } as any;
//     const savedItem = { _id: '3', ...newItem };
//     storageSpy.post.and.returnValue(Promise.resolve(savedItem));

//     await service.addProduct(newItem);

//     expect(storageSpy.post).toHaveBeenCalledWith('item_list', newItem);
//     expect(service.allProducts_()).toContain(savedItem);
//   });

//   it('should update an existing item in the signal', async () => {
//     const updatedItem = { ...mockItems[0], itemName: 'Rotten Tomato' };
//     storageSpy.put.and.returnValue(Promise.resolve(updatedItem));

//     await service.updateItem(updatedItem);

//     expect(storageSpy.put).toHaveBeenCalledWith('item_list', updatedItem);
//     const result = service.allProducts_().find(i => i._id === '1');
//     expect(result?.itemName).toBe('Rotten Tomato');
//   });

//   it('should delete an item and remove it from the signal', async () => {
//     storageSpy.remove.and.returnValue(Promise.resolve());

//     await service.deleteItem('1');

//     expect(storageSpy.remove).toHaveBeenCalledWith('item_list', '1');
//     expect(service.allProducts_().length).toBe(1);
//     expect(service.allProducts_().find(i => i._id === '1')).toBeUndefined();
//   });
// });