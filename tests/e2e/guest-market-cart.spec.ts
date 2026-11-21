import { expect, test } from '@playwright/test';

test('guest finds nearby places and filters the map results', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('vegeai:session:gps_coords', JSON.stringify({ lat: 10.803, lon: 106.736 }));
    sessionStorage.setItem('vegeai:session:gps_address', 'Thảo Điền, TP. Thủ Đức');
  });

  await page.route('**/api/places/nearby?**', route => route.fulfill({
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
  }));

  await page.goto('/smart-market');
  await expect(page.getByText('2 địa điểm phù hợp')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Quán Chay Thảo Điền' }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cửa hàng Rau Xanh' }).first()).toBeVisible();

  await page.getByPlaceholder(/Tìm quán chay, tiệm nguyên liệu/).fill('Rau Xanh');
  await expect(page.getByText('1 địa điểm phù hợp')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cửa hàng Rau Xanh' }).first()).toBeVisible();
  await expect(page.getByText('Bấm để xem địa điểm')).toHaveCount(1);
});
