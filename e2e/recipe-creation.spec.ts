import { test, expect } from '@playwright/test';

const recipeName = `E2E מתכון ${Date.now()}`;
const productNameForRecipe = `E2E מוצר למתכון ${Date.now()}`;

test.describe('Recipe creation', () => {
  test('create product then recipe with ingredient, verify cost and appearance in recipe book', async ({ page }) => {
    await page.goto('/inventory/add');
    await page.getByPlaceholder(/עגבניות|product/i).fill(productNameForRecipe);
    const categorySelect = page.getByLabel(/category|קטגוריה/i);
    await categorySelect.selectOption({ index: 1 });
    const unitSelect = page.locator('select').filter({ has: page.locator('option[value="gram"], option[value="unit"]') }).first();
    if (await unitSelect.count() > 0) await unitSelect.selectOption({ index: 1 });
    await page.getByRole('spinbutton').first().fill('5');
    await page.getByRole('button', { name: /save|שמור|save_product|הוסף/i }).click();
    await expect(page.getByText(/נוסף בהצלחה|הצלחה/i)).toBeVisible({ timeout: 5000 });

    await page.goto('/recipe-builder');
    await expect(page.locator('.recipe-builder-container')).toBeVisible();

    const nameInput = page.getByPlaceholder(/שם|name|מתכון|מנה/i).first();
    await nameInput.fill(recipeName);

    const addRowBtn = page.getByRole('button', { name: /add_row|הוסף שורה/i });
    await addRowBtn.click();

    const searchInput = page.getByPlaceholder(/חפש מוצר או מתכון/i);
    await searchInput.fill(productNameForRecipe);
    await page.getByText(productNameForRecipe).first().click();

    await expect(page.getByText(productNameForRecipe)).toBeVisible();
    const costCell = page.locator('.col-cost').filter({ hasText: /₪|0/ });
    await expect(costCell.first()).toBeVisible({ timeout: 3000 });

    await page.getByRole('button', { name: /save_recipe|שמור מתכון|שמור/i }).click();
    await expect(page.getByText(/נשמר בהצלחה|הצלחה/i)).toBeVisible({ timeout: 5000 });

    await page.goto('/recipe-book');
    await expect(page.getByText(recipeName)).toBeVisible({ timeout: 5000 });
  });
});
