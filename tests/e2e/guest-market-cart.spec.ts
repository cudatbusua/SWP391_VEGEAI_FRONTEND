import { expect, test } from '@playwright/test';

test('guest finds nearby places and filters the map results', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('vegeai:session:gps_coords', JSON.stringify({ lat: 10.803, lon: 106.736 }));
    sessionStorage.setItem('vegeai:session:gps_address', 'Thảo Điền, TP. Thủ Đức');
  });

  let nearbyRequests = 0;
  await page.route('**/api/places/nearby?**', route => {
    nearbyRequests++;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        code: 200,
        message: 'OK',
        data: [
          {
            placeId: 'osm_vegan_1', name: 'Quán Chay Thảo Điền', latitude: 10.8032,
            longitude: 106.7362, distanceKm: 0.05, address: 'Thảo Điền, TP. Thủ Đức',
            category: 'RESTAURANT', attribution: '© OpenStreetMap contributors',
          },
          {
            placeId: 'osm_market_1', name: 'Cửa hàng Rau Xanh', latitude: 10.804,
            longitude: 106.737, distanceKm: 0.2, address: 'Thảo Điền, TP. Thủ Đức',
            category: 'SUPERMARKET', attribution: '© OpenStreetMap contributors',
          },
        ],
      }),
    });
  });

  await page.goto('/smart-market');
  await expect(page.getByText('1 địa điểm phù hợp')).toBeVisible();
  expect(nearbyRequests).toBe(1);
  await expect(page.getByRole('heading', { name: 'Quán Chay Thảo Điền' }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Tất cả địa điểm' }).click();
  await expect(page.getByText('2 địa điểm phù hợp')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cửa hàng Rau Xanh' }).first()).toBeVisible();

  await page.getByPlaceholder(/Tìm quán chay, tiệm nguyên liệu/).fill('Rau Xanh');
  await expect(page.getByText('1 địa điểm phù hợp')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cửa hàng Rau Xanh' }).first()).toBeVisible();
  await expect(page.getByText('Bấm để xem địa điểm')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Quán Chay Thảo Điền' })).toHaveCount(0);
});

test('guest selects a suggested area and can reuse it from recent locations', async ({ page }) => {
  await page.route('**/api/places/suggest-areas?**', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ success: true, code: 200, data: [
      { name: 'Quận 1', address: 'Thành phố Hồ Chí Minh', lat: 10.775, lon: 106.7, category: 'AREA' },
      { name: 'Quận 3', address: 'Thành phố Hồ Chí Minh', lat: 10.78, lon: 106.69, category: 'AREA' },
    ] }),
  }));
  const nearbyLocations: string[] = [];
  await page.route('**/api/places/nearby?**', route => {
    nearbyLocations.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, code: 200, data: [] }) });
  });
  await page.goto('/smart-market');
  const search = page.getByRole('combobox', { name: 'Tìm khu vực hoặc địa chỉ' });
  await search.fill('quan');
  await expect(page.getByRole('listbox', { name: 'Gợi ý địa điểm' })).toBeVisible();
  await expect(page.getByRole('option', { name: /Quận 1/ })).toBeVisible();
  await search.press('ArrowDown');
  await search.press('Enter');
  await expect(page.getByRole('button', { name: 'Đổi địa chỉ' })).toBeVisible();
  await expect.poll(() => nearbyLocations.some(url => url.includes('lat=10.775') && url.includes('lng=106.7'))).toBe(true);

  await page.getByRole('button', { name: 'Đổi địa chỉ' }).click();
  await search.focus();
  await expect(page.getByRole('option', { name: /Quận 1/ })).toBeVisible();
});
