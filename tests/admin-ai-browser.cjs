const assert = require('node:assert/strict');
const playwright = require(process.env.PLAYWRIGHT_MODULE_PATH);

const base = process.env.FE_URL || 'http://localhost:5173';
const profile = role => ({ userId: 'browser-test-user', username: 'browser_test', fullName: 'Browser Test', email: 'browser@example.com', role, status: 'ACTIVE' });
const reply = data => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, code: 200, data }) });

async function run() {
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    for (const role of ['ADMIN', 'MEMBER']) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => localStorage.setItem('vegeai_session', 'true'));
      let populated = false;
      await page.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/api/auth/refresh') return route.fulfill(reply({ ...profile(role), accessToken: 'browser-test-token', expiresInSeconds: 900 }));
        if (path === '/api/users/me') return route.fulfill(reply(profile(role)));
        if (path === '/api/admin/ai/status') return route.fulfill(reply({
          systemHealth: populated ? 'DEGRADED' : 'NO_DATA', totalAiRequests: populated ? 2 : 0,
          failedAiRequests: populated ? 1 : 0, successRatePercentage: populated ? 50 : null,
          averageLatencyMs: populated ? 200 : null, generatedAt: new Date().toISOString(),
          models: [{ modelName: 'gemini-test', provider: 'Google Gemini', version: 'gemini-test',
            status: populated ? 'FAILED' : 'NO_DATA', latencyMs: populated ? 280 : null }],
        }));
        if (path === '/api/admin/ai/audit-logs') return route.fulfill(reply(populated ? [
          { logId: '1', timestamp: new Date().toISOString(), model: 'gemini-test', operation: 'FRIDGE_SCAN', status: 'FAILED', latencyMs: 280, errorType: 'HTTP_429' },
        ] : []));
        return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
      });
      await page.goto(base + '/admin/ai');
      if (role === 'ADMIN') {
        await page.getByRole('heading', { name: 'Giám sát AI' }).waitFor();
        await page.getByText('Chưa có lượt gọi AI nào được ghi nhận.').waitFor();
        assert.equal(await page.getByRole('navigation', { name: 'Điều hướng quản trị' }).getByText('Giám sát AI').count(), 1);
        populated = true;
        await page.getByRole('button', { name: 'Làm mới' }).click();
        await page.getByText('HTTP_429').waitFor();
        assert.equal(await page.getByText('50%').count(), 1);
      } else {
        await page.waitForURL(url => url.pathname === '/');
        assert.equal(await page.getByRole('heading', { name: 'Giám sát AI' }).count(), 0);
      }
      assert.deepEqual(errors, [], `${role} browser errors`);
      await page.close();
    }
    process.stdout.write('Admin AI browser smoke passed: admin empty/populated states and member boundary.\n');
  } finally {
    await browser.close();
  }
}

run().catch(error => { process.stderr.write(String(error.stack || error) + '\n'); process.exitCode = 1; });
