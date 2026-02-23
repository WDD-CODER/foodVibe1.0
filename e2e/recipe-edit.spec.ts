import { test, expect } from '@playwright/test';

const recipeName = `E2E עריכת מתכון ${Date.now()}`;
const recipeNameEdited = `${recipeName} - מעודכן`;

test.describe('Recipe edit', () => {
  test('create recipe, edit ingredient, save, reopen and verify persistence', async ({ page }) => {
    await page.goto('/inventory/add');
    const productName = `E2E מוצר עריכה ${Date.now()}`;
    await page.getByPlaceholder(/עגבניות|product/i).fill(productName);
    const categorySelect = page.getByLabel(/category|קטגוריה/i);
    await categorySelect.selectOption({ index: 1 });
    const unitSelect = page.locator('select').filter({ has: page.locator('option[value="gram"], option[value="unit"]') }).first();
    if (await unitSelect.count() > 0) await unitSelect.selectOption({ index: 1 });
    await page.getByRole('spinbutton').first().fill('20');
    await page.getByRole('button', { name: /save|שמור|הוסף/i }).click();
    await expect(page.getByText(/נוסף בהצלחה|הצלחה/i)).toBeVisible({ timeout: 5000 });

    await page.goto('/recipe-builder');
    const nameInput = page.getByPlaceholder(/שם|מתכון|מנה/i).first();
    await nameInput.fill(recipeName);
    await page.getByRole('button', { name: /add_row|הוסף שורה/i }).click();
    await page.getByPlaceholder(/חפש מוצר או מתכון/i).fill(productName);
    await page.getByText(productName).first().click();
    await page.getByRole('button', { name: /save_recipe|שמור מתכון|שמור/i }).click();
    await expect(page.getByText(/נשמר בהצלחה|הצלחה/i)).toBeVisible({ timeout: 5000 });

    await page.goto('/recipe-book');
    await expect(page.getByText(recipeName)).toBeVisible({ timeout: 5000 });

    await page.locator('.recipe-grid-row').filter({ hasText: recipeName }).getByRole('button', { name: /edit|ערוך/i }).click();
    await expect(page).toHaveURL(/\/recipe-builder\/.+/);

    await nameInput.fill(recipeNameEdited);
    await page.getByRole('button', { name: /save|שמור|עדכן/i }).click();
    await expect(page.getByText(/עודכן בהצלחה|הצלחה/i)).toBeVisible({ timeout: 5000 });

    await page.goto('/recipe-book');
    await expect(page.getByText(recipeNameEdited)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(recipeName)).not.toBeVisible();
  });
});
