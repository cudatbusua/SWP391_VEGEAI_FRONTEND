import { test, expect } from '@playwright/test';

test.describe('guest routes and navigation', () => {
  test('a guest is redirected to login for private pages', async ({ page }) => {
    await page.goto('/questions');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('input[type="password"]')).toHaveCount(1);
    await expect(page.getByRole('button', { name: /Đăng nhập|Log in/i }).first()).toBeVisible();
  });

  test('public explore page keeps the guest header and primary navigation', async ({ page }) => {
    await page.goto('/explore');
    await expect(page.locator('header')).toContainText('VEGEAI');
    await expect(page.locator('header a[href="/blog"]')).toHaveCount(1);
    await expect(page.locator('header a[href="/videos"]')).toHaveCount(1);
    await expect(page.locator('header a[href="/smart-market"]').first()).toBeVisible();
  });
});
