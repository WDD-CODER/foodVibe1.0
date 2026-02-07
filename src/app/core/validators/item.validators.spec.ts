import { FormControl } from '@angular/forms';
import { duplicateNameValidator } from './item.validators';
import { Product } from '@models/product.model';

describe('duplicateNameValidator', () => {
  const products = [{ _id: 'p1', name_hebrew: 'Tomato' }] as Product[];
  const productsSignal = () => products;

  it('should return error if name exists and ID is different', () => {
    const control = new FormControl('Tomato');
    const validator = duplicateNameValidator(productsSignal, 'p2');
    expect(validator(control)).toEqual({ duplicateName: true });
  });

  it('should return null if name exists but ID is the same (edit mode)', () => {
    const control = new FormControl('Tomato');
    const validator = duplicateNameValidator(productsSignal, 'p1');
    expect(validator(control)).toBeNull();
  });

  it('should be case-insensitive', () => {
    const control = new FormControl('tomato');
    const validator = duplicateNameValidator(productsSignal, 'p2');
    expect(validator(control)).toEqual({ duplicateName: true });
  });

  it('should return null for non-existent names', () => {
    const control = new FormControl('Cucumber');
    const validator = duplicateNameValidator(productsSignal);
    expect(validator(control)).toBeNull();
  });
});