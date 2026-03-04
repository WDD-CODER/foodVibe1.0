import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
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
import { Product } from '@models/product.model';

@Component({
  selector: 'app-quick-add-product-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe],
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

  protected isOpen_ = this.modalService.isOpen_;
  protected config = this.modalService.config;

  protected name_ = signal('');
  protected baseUnit_ = signal('');
  protected expanded_ = signal(false);
  protected buyPrice_ = signal(0);
  protected category_ = signal('');
  protected yieldFactor_ = signal(1);
  protected selectedAllergens_ = signal<Set<string>>(new Set());
  protected minStock_ = signal(0);
  protected expiryDays_ = signal(0);
  protected isSubmitting_ = signal(false);

  protected baseUnitRef = viewChild<ElementRef<HTMLSelectElement>>('baseUnitEl');
  protected buyPriceRef = viewChild<ElementRef<HTMLInputElement>>('buyPriceEl');
  protected categoryRef = viewChild<ElementRef<HTMLSelectElement>>('categoryEl');
  protected yieldFactorRef = viewChild<ElementRef<HTMLInputElement>>('yieldFactorEl');
  protected saveBtnRef = viewChild<ElementRef<HTMLButtonElement>>('saveBtnEl');

  /** True when user is navigating select options with Arrow Up/Down; Enter or mouse commit then advances. */
  private selectNavigatingWithArrow_ = false;

  protected unitKeys_ = this.unitRegistry.allUnitKeys_;
  protected categories_ = this.metadataRegistry.allCategories_;
  protected allergens_ = this.metadataRegistry.allAllergens_;

  constructor() {
    effect(() => {
      const cfg = this.modalService.config();
      if (cfg) {
        this.name_.set(cfg.prefillName);
        this.baseUnit_.set('');
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
  }

  /** Accepts either an ElementRef or a native HTMLElement (template ref). */
  protected advanceFocus(ref: ElementRef<HTMLElement> | HTMLElement | null | undefined): void {
    const el = ref && 'nativeElement' in ref ? ref.nativeElement : ref;
    (el as HTMLElement)?.focus();
  }

  /** On select: advance only if user committed with mouse (not Arrow keys). Enter commits and we advance in keydown. */
  protected onSelectChange(nextTarget: HTMLElement | null): void {
    if (this.selectNavigatingWithArrow_) {
      this.selectNavigatingWithArrow_ = false;
      return;
    }
    this.advanceFocus(nextTarget);
  }

  /** Arrow Up/Down: mark as navigating so (change) does not advance. Enter: commit and advance. */
  protected onBaseUnitKeydown(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      this.selectNavigatingWithArrow_ = true;
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      this.selectNavigatingWithArrow_ = false;
      this.advanceFocus(this.getNextFocusAfterBaseUnit());
    }
  }

  protected onCategoryKeydown(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      this.selectNavigatingWithArrow_ = true;
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      this.selectNavigatingWithArrow_ = false;
      this.advanceFocus(this.getNextFocusAfterCategory());
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
