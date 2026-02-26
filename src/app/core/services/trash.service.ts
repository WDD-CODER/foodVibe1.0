import { Injectable, inject, signal, computed } from '@angular/core';
import { Recipe } from '../models/recipe.model';
import { Product } from '../models/product.model';
import { RecipeDataService } from './recipe-data.service';
import { DishDataService } from './dish-data.service';
import { ProductDataService } from './product-data.service';
import { UserMsgService } from './user-msg.service';

export type TrashRecipe = Recipe & { deletedAt: number };
export type TrashProduct = Product & { deletedAt: number };

@Injectable({ providedIn: 'root' })
export class TrashService {
  private readonly recipeData = inject(RecipeDataService);
  private readonly dishData = inject(DishDataService);
  private readonly productData = inject(ProductDataService);
  private readonly userMsg = inject(UserMsgService);

  private readonly trashDishes_ = signal<TrashRecipe[]>([]);
  private readonly trashRecipes_ = signal<TrashRecipe[]>([]);
  private readonly trashProducts_ = signal<TrashProduct[]>([]);

  readonly trashDishes = this.trashDishes_.asReadonly();
  readonly trashRecipes = this.trashRecipes_.asReadonly();
  readonly trashProducts = this.trashProducts_.asReadonly();

  readonly hasAnyTrash = computed(() =>
    this.trashDishes_().length > 0 ||
    this.trashRecipes_().length > 0 ||
    this.trashProducts_().length > 0
  );

  async loadTrash(): Promise<void> {
    const [dishes, recipes, products] = await Promise.all([
      this.dishData.getTrashDishes(),
      this.recipeData.getTrashRecipes(),
      this.productData.getTrashProducts(),
    ]);
    this.trashDishes_.set(dishes);
    this.trashRecipes_.set(recipes);
    this.trashProducts_.set(products);
  }

  async restoreDish(_id: string): Promise<void> {
    await this.dishData.restoreDish(_id);
    this.userMsg.onSetSuccessMsg('המנה שוחזרה בהצלחה');
    await this.loadTrash();
  }

  async restoreRecipe(_id: string): Promise<void> {
    await this.recipeData.restoreRecipe(_id);
    this.userMsg.onSetSuccessMsg('המתכון שוחזר בהצלחה');
    await this.loadTrash();
  }

  async restoreProduct(_id: string): Promise<void> {
    await this.productData.restoreProduct(_id);
    this.userMsg.onSetSuccessMsg('חומר הגלם שוחזר בהצלחה');
    await this.loadTrash();
  }

  async disposeDish(_id: string): Promise<void> {
    await this.dishData.disposeDish(_id);
    this.userMsg.onSetSuccessMsg('המנה נמחקה לצמיתות');
    await this.loadTrash();
  }

  async disposeRecipe(_id: string): Promise<void> {
    await this.recipeData.disposeRecipe(_id);
    this.userMsg.onSetSuccessMsg('המתכון נמחק לצמיתות');
    await this.loadTrash();
  }

  async disposeProduct(_id: string): Promise<void> {
    await this.productData.disposeProduct(_id);
    this.userMsg.onSetSuccessMsg('חומר הגלם נמחק לצמיתות');
    await this.loadTrash();
  }

  async restoreAllDishes(): Promise<void> {
    await this.dishData.restoreAllDishes();
    this.userMsg.onSetSuccessMsg('כל המנות שוחזרו');
    await this.loadTrash();
  }

  async restoreAllRecipes(): Promise<void> {
    await this.recipeData.restoreAllRecipes();
    this.userMsg.onSetSuccessMsg('כל המתכונים שוחזרו');
    await this.loadTrash();
  }

  async restoreAllProducts(): Promise<void> {
    await this.productData.restoreAllProducts();
    this.userMsg.onSetSuccessMsg('כל חומרי הגלם שוחזרו');
    await this.loadTrash();
  }

  async disposeAllDishes(): Promise<void> {
    await this.dishData.disposeAllDishes();
    this.userMsg.onSetSuccessMsg('כל המנות באשפה נמחקו לצמיתות');
    await this.loadTrash();
  }

  async disposeAllRecipes(): Promise<void> {
    await this.recipeData.disposeAllRecipes();
    this.userMsg.onSetSuccessMsg('כל המתכונים באשפה נמחקו לצמיתות');
    await this.loadTrash();
  }

  async disposeAllProducts(): Promise<void> {
    await this.productData.disposeAllProducts();
    this.userMsg.onSetSuccessMsg('כל חומרי הגלם באשפה נמחקו לצמיתות');
    await this.loadTrash();
  }
}
