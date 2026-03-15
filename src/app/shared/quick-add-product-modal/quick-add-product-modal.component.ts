import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  viewChild,
  effect,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { QuickAddProductModalService } from '@services/quick-add-product-modal.service';
import { ProductDataService } from '@services/product-data.service';
import { UnitRegistryService } from '@services/unit-registry.service';
import { MetadataRegistryService } from '@services/metadata-registry.service';
import { UserMsgService } from '@services/user-msg.service';
import { AddItemModalService } from '@services/add-item-modal.service';
import { Product } from '@models/product.model';
import { take } from 'rxjs/operators';
import { CustomSelectComponent } from '../custom-select/custom-select.component';

@Component({
  selector: 'app-quick-add-product-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe, CustomSelectComponent],
  templateUrl: './quick-add-product-modal.component.html',
  styleUrl: './quick-add-product-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickAddProductModalComponent {
  private readonly modalService = inject(QuickAddProductModalService);
  private readonly productData = inject(ProductDataService);
  private readonly unitRegistry = inject(UnitRegistryService);
  private readonly metadataRegistry = inject(MetadataRegistryService);
  private readonly userMsg = inject(UserMsgService);
  private readonly addItemModal = inject(AddItemModalService);

  protected isOpen_ = this.modalService.isOpen_;
  protected config = this.modalService.config;

  protected name_ = signal('');
  protected baseUnit_ = signal('gram');
  protected expanded_ = signal(false);
  protected buyPrice_ = signal(0);
  protected category_ = signal('');
  protected yieldFactor_ = signal(1);
  protected selectedAllergens_ = signal<Set<string>>(new Set());
  protected minStock_ = signal(0);
  protected expiryDays_ = signal(0);
  protected isSubmitting_ = signal(false);

  protected baseUnitRef = viewChild<ElementRef<HTMLElement>>('baseUnitSelect');
  protected buyPriceRef = viewChild<ElementRef<HTMLInputElement>>('buyPriceEl');
  protected categoryRef = viewChild<ElementRef<HTMLElement>>('categorySelect');
  protected yieldFactorRef = viewChild<ElementRef<HTMLInputElement>>('yieldFactorEl');
  protected saveBtnRef = viewChild<ElementRef<HTMLButtonElement>>('saveBtnEl');

  protected unitKeys_ = this.unitRegistry.allUnitKeys_;
  protected categories_ = this.metadataRegistry.allCategories_;
  protected allergens_ = this.metadataRegistry.allAllergens_;

  protected baseUnitOptions_ = computed(() => {
    const keys = this.unitKeys_();
    return [
      ...keys.map((k) => ({ value: k, label: k })),
      { value: '__add_unit__', label: 'add_new_unit' },
    ];
  });

  protected categoryOptions_ = computed(() => {
    const cats = this.categories_();
    return [
      ...cats.map((c) => ({ value: c, label: c })),
      { value: '__add_category__', label: 'add_new_category' },
    ];
  });

  constructor() {
    effect(() => {
      const cfg = this.modalService.config();
      if (cfg) {
        this.name_.set(cfg.prefillName);
        this.baseUnit_.set('gram');
        this.expanded_.set(false);
        this.buyPrice_.set(0);
        this.category_.set('');
        this.yieldFactor_.set(1);
        this.selectedAllergens_.set(new Set());
        this.minStock_.set(0);
        this.expiryDays_.set(0);
        this.isSubmitting_.set(false);
      }
    });

    effect(() => {
      if (this.modalService.isOpen_() && this.modalService.config()) {
        setTimeout(() => this.baseUnitRef()?.nativeElement?.focus(), 0);
      }
    });

    effect(() => {
      if (this.modalService.isOpen_()) this.unitRegistry.refreshFromStorage();
    });
  }

  /** Accepts either an ElementRef or a native HTMLElement (template ref). */
  protected advanceFocus(ref: ElementRef<HTMLElement> | HTMLElement | null | undefined): void {
    const el = ref && 'nativeElement' in ref ? ref.nativeElement : ref;
    (el as HTMLElement)?.focus();
  }

  /** After select change: advance focus to next field. */
  protected onSelectChange(nextTarget: HTMLElement | null): void {
    this.advanceFocus(nextTarget);
  }

  protected async onCategoryChange(val: string): Promise<void> {
    if (val === '__add_category__') {
      const newCategory = await this.addItemModal.open({
        title: 'add_new_category',
        label: 'category_name',
        placeholder: 'category_name',
        saveLabel: 'save_category'
      });
      if (newCategory) {
        await this.metadataRegistry.registerCategory(newCategory);
        this.category_.set(newCategory);
        this.onSelectChange(this.getNextFocusAfterCategory());
      } else {
        this.category_.set('');
      }
    } else {
      this.category_.set(val);
      this.onSelectChange(this.getNextFocusAfterCategory());
    }
  }

  protected onBaseUnitChange(val: string): void {
    if (val === '__add_unit__') {
      this.baseUnit_.set('');
      this.unitRegistry.openUnitCreator();
      this.unitRegistry.unitAdded$.pipe(take(1)).subscribe((newUnit) => {
        this.baseUnit_.set(newUnit);
        this.onSelectChange(this.getNextFocusAfterBaseUnit());
      });
    } else {
      this.baseUnit_.set(val);
      this.onSelectChange(this.getNextFocusAfterBaseUnit());
    }
  }

  protected getNextFocusAfterBaseUnit(): HTMLElement | null {
    return this.buyPriceRef()?.nativeElement ?? null;
  }

  protected getNextFocusAfterBuyPrice(): HTMLElement | null {
    return this.categoryRef()?.nativeElement ?? null;
  }

  protected getNextFocusAfterCategory(): HTMLElement | null {
    if (this.expanded_()) return this.yieldFactorRef()?.nativeElement ?? null;
    return this.saveBtnRef()?.nativeElement ?? null;
  }

  protected getNextFocusAfterYield(): HTMLElement | null {
    return this.saveBtnRef()?.nativeElement ?? null;
  }

  protected toggleAllergen(key: string): void {
    this.selectedAllergens_.update((set) => {
      const next = new Set(set);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  protected isAllergenSelected(key: string): boolean {
    return this.selectedAllergens_().has(key);
  }

  protected onSave(): void {
    if (this.isSubmitting_()) return;

    const name = this.name_().trim();
    const baseUnit = this.baseUnit_().trim();
    if (!name) {
      return;
    }
    if (!baseUnit) {
      this.baseUnitRef()?.nativeElement?.focus();
      return;
    }

    this.isSubmitting_.set(true);

    const category = this.category_().trim();
    const product: Omit<Product, '_id'> = {
      name_hebrew: name,
      base_unit_: baseUnit,
      buy_price_global_: Number(this.buyPrice_()) || 0,
      purchase_options_: [],
      categories_: category ? [category] : [],
      supplierIds_: [],
      yield_factor_: Number(this.yieldFactor_()) || 1,
      allergens_: Array.from(this.selectedAllergens_()),
      min_stock_level_: Number(this.minStock_()) || 0,
      expiry_days_default_: Number(this.expiryDays_()) || 0,
    };

    this.productData.addProduct(product).then(
      (saved) => {
        this.isSubmitting_.set(false);
        this.modalService.save(saved);
      },
      () => {
        this.isSubmitting_.set(false);
        this.userMsg.onSetErrorMsg('שגיאה בשמירת המוצר');
      }
    );
  }

  protected onCancel(): void {
    this.modalService.cancel();
  }

  protected toggleExpanded(): void {
    this.expanded_.update((v) => !v);
  }
}
