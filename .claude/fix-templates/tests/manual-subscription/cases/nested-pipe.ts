// Component: product-form.component.ts (adapted)
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

@Component({ selector: 'app-product-form', template: '' })
export class ProductFormComponent {
  private destroyRef = inject(DestroyRef);
  private categoryService = inject(CategoryService);
  private productService = inject(ProductService);

  ngOnInit(): void {
    this.categoryService.selectedCategory$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((cat) => this.productService.getByCategory(cat.id))
      )
      .subscribe((products) => {
        this.updateList(products);
      });
  }

  private updateList(products: any[]): void {}
}
