import { expect, test } from '@playwright/test';

test('guest browses market, logs in in-place, then adds a server-backed cart item', async ({ page }) => {
  let savedItems: unknown[] = [];
  let loggedIn = false;

  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const ok = (data: unknown) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, code: 200, message: 'OK', data }),
    });

    if (url.pathname === '/api/auth/login') {
      loggedIn = true;
      return ok({
        accessToken: 'e2e-access-token', userId: '11111111-1111-1111-1111-111111111111',
        tokenType: 'Bearer', expiresInSeconds: 900, username: 'member', fullName: 'Thành viên E2E',
        email: 'member@vegeai.com', role: 'USER', status: 'ACTIVE',
      });
    }
    if (url.pathname === '/api/users/me') return ok({
      userId: '11111111-1111-1111-1111-111111111111', username: 'member',
      fullName: 'Thành viên E2E', email: 'member@vegeai.com', role: 'USER', status: 'ACTIVE',
    });
    if (url.pathname === '/api/market/cart' && request.method() === 'GET') return ok({ items: savedItems });
    if (url.pathname === '/api/market/cart' && request.method() === 'PUT') {
      savedItems = (request.postDataJSON() as { items: unknown[] }).items;
      return ok({ items: savedItems });
    }
    if (url.pathname.startsWith('/api/places/')) return ok([]);
    if (loggedIn) return ok({});
    return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, code: 401 }) });
  });

  await page.goto('/smart-market');
  await page.getByPlaceholder(/Nhập địa chỉ, đường hoặc quận\/huyện/i).fill('Thảo Điền');
  await page.getByRole('button', { name: /Xác nhận vị trí/i }).click();
  await page.getByTitle(/Thêm combo Canh Chua Chay Nam Bộ vào giỏ/i).first().click();

  const dialog = page.getByRole('dialog', { name: 'Đăng nhập để sử dụng giỏ nguyên liệu' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Tên đăng nhập hoặc email').fill('member');
  await dialog.getByLabel('Mật khẩu').fill('Asdfghjkl1234567890@');
  const cartLoaded = page.waitForResponse(response => response.url().includes('/api/market/cart') && response.request().method() === 'GET');
  await dialog.getByRole('button', { name: /^Đăng nhập$/ }).click();

  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/smart-market$/);
  await expect(page.getByText('Thành viên E2E').first()).toBeVisible();
  await cartLoaded;
  // Nearby places are deliberately mocked as empty. Static VietGAP products
  // must still enter the authenticated user's cart via the reference store.
  await page.locator('button[title*="Rau dền đỏ"]').click();
  await expect(page.getByRole('button', { name: /Mở giỏ nguyên liệu/i })).toBeVisible();
  await expect(page.getByText(/món đã chọn/).last()).toBeVisible();
  await expect.poll(() => savedItems.length).toBeGreaterThan(0);
});
