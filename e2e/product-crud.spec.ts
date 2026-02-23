import { test, expect } from '@playwright/test';

const productName = `E2E Product ${Date.now()}`;
const productNameEdited = `${productName} (עודכן)`;

test.describe('Product CRUD', () => {
  test('add product, verify in list, edit, verify changes, delete, verify removal', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page.getByRole('link', { name: /Produce List|Add Produce/i })).toBeVisible();

    await page.getByRole('link', { name: 'Add Produce' }).click();
    await expect(page).toHaveURL(/\/inventory\/add/);

    await page.getByPlaceholder(/עגבניות|product/i).fill(productName);
    const categorySelect = page.getByLabel(/category|קטגוריה/i);
    await categorySelect.selectOption({ index: 1 });

    const supplierSelect = page.locator('select').filter({ has: page.locator('option[value=""]') }).first();
    if (await supplierSelect.count() > 0) await supplierSelect.selectOption({ index: 1 });

    await page.getByRole('spinbutton').first().fill('10');
    const unitSelect = page.locator('select').filter({ has: page.locator('option[value="gram"], option[value="unit"]') }).first();
    if (await unitSelect.count() > 0) await unitSelect.selectOption({ index: 1 });

    await page.getByRole('button', { name: /save|שמור|save_product|הוסף מוצר/i }).click();

    await expect(page.getByText(/חומר גלם נוסף|הצלחה|success/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole('link', { name: 'Produce List' }).click();
    await expect(page).toHaveURL(/\/inventory\/list|\/inventory$/);

    await expect(page.getByText(productName)).toBeVisible();

    const editBtn = page.locator('.product-grid-row').filter({ hasText: productName }).getByRole('button', { name: /edit|ערוך/i });
    await editBtn.click();
    await expect(page).toHaveURL(/\/inventory\/edit\//);

    await page.getByPlaceholder(/עגבניות|product/i).fill(productNameEdited);
    await page.getByRole('button', { name: /update|עדכן|שמור/i }).click();

    await expect(page.getByText(/עודכן בהצלחה|הצלחה/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole('link', { name: 'Produce List' }).click();
    await expect(page.getByText(productNameEdited)).toBeVisible();

    const deleteBtn = page.locator('.product-grid-row').filter({ hasText: productNameEdited }).getByRole('button', { name: /delete|מחק/i });
    page.on('dialog', d => d.accept());
    await deleteBtn.click();

    await expect(page.getByText(/נמחק בהצלחה|הצלחה/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(productNameEdited)).not.toBeVisible();
  });
});
