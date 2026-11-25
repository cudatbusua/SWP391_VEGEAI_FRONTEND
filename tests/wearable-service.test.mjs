import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

function createStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  };
}

function loadWearableService(fetchImpl) {
  const source = fs.readFileSync(path.resolve('src/utils/wearableService.ts'), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  });
  const localStorage = createStorage();
  const dispatched = [];
  const windowObj = {
    location: {
      hostname: 'localhost',
      port: '5173',
      origin: 'http://localhost:5173',
      pathname: '/settings',
      search: '',
      href: '',
    },
    dispatchEvent: (ev) => dispatched.push(ev.type),
  };
  class EventStub {
    constructor(type) {
      this.type = type;
    }
  }
  const module = { exports: {} };
  const context = vm.createContext({
    localStorage,
    window: windowObj,
    Event: EventStub,
    fetch: fetchImpl,
    console: { info: () => {}, warn: () => {}, error: () => {} },
    Date,
    Math,
    BigInt,
    Number,
    String,
    Boolean,
    Promise,
    URLSearchParams,
    encodeURIComponent,
    setInterval,
    clearInterval,
  });
  const execute = vm.runInContext(`(function(require, module, exports) { ${outputText}\n })`, context);
  execute(() => ({}), module, module.exports);
  return { ...module.exports, localStorage, dispatched };
}

function isActivityAggregate(body) {
  return body.aggregateBy.some(
    (a) =>
      a.dataTypeName === 'com.google.step_count.delta' ||
      (a.dataSourceId && a.dataSourceId.includes('step_count.delta')),
  );
}

test('queries official Google Fit merged activity streams only, matches real numbers 1-to-1, and skips incomplete HR/SpO2/Sleep APIs', async () => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const requestedUrls = [];
  let sawEstimatedStepsStream = false;

  const mockFetch = async (url, opts) => {
    requestedUrls.push(url);
    if (url.includes('dataset:aggregate')) {
      const body = JSON.parse(opts.body);
      if (isActivityAggregate(body)) {
        if (body.aggregateBy.some((a) => a.dataSourceId?.includes('estimated_steps'))) {
          sawEstimatedStepsStream = true;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            bucket: [
              {
                startTimeMillis: String(todayStart),
                dataset: [
                  {
                    point: [
                      {
                        dataTypeName: 'com.google.step_count.delta',
                        originDataSourceId: 'raw:com.google.step_count.delta:com.mi.health',
                        value: [{ intVal: 2698 }],
                      },
                      {
                        dataTypeName: 'com.google.calories.expended',
                        originDataSourceId: 'derived:com.google.calories.expended:com.google.android.gms:merge_calories_expended',
                        value: [{ fpVal: 1325.4 }],
                      },
                      {
                        dataTypeName: 'com.google.distance.delta',
                        originDataSourceId: 'derived:com.google.distance.delta:com.google.android.gms:merge_distance_delta',
                        value: [{ fpVal: 1612.8 }],
                      },
                    ],
                  },
                ],
              },
            ],
          }),
        };
      }
    }
    return { ok: true, status: 200, json: async () => ({ bucket: [] }) };
  };

  const { wearableService, GOOGLE_FIT_SCOPES } = loadWearableService(mockFetch);
  assert.match(GOOGLE_FIT_SCOPES, /fitness\.activity\.read/);
  assert.match(GOOGLE_FIT_SCOPES, /fitness\.location\.read/);
  assert.doesNotMatch(GOOGLE_FIT_SCOPES, /heart_rate|oxygen_saturation|sleep/);

  wearableService.setUserBmr(1500);
  const res = await wearableService.fetchGoogleFitLive('tok-1');

  assert.equal(sawEstimatedStepsStream, true);
  assert.equal(requestedUrls.length, 1);
  assert.equal(res.steps, 2698);
  assert.equal(res.totalCalories, 1325);
  assert.equal(res.distanceKm, 1.61);
  assert.equal(res.isTodayData, true);

  const metrics = wearableService.getMetrics();
  assert.equal(metrics.steps, 2698);
  assert.equal(metrics.totalCaloriesExpended, 1325);
  assert.equal(metrics.distanceKm, 1.61);
  assert.equal(metrics.isTodayData, true);
  assert.equal(metrics.deviceModel, 'Google Fit (tổng hợp Điện thoại + Xiaomi Smart Band)');
  // Zero fabricated activeMinutes / heartPoints when absent from Google Fit
  assert.equal(metrics.activeMinutes, 0);
  assert.equal(metrics.heartPoints, 0);
});

test('fallback to previous day within 7 days marks isTodayData=false and sets todayActiveCalories=0', async () => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const yesterdayStart = todayStart - 86400_000;
  let aggregateCalls = 0;

  const mockFetch = async (url, opts) => {
    if (url.includes('dataset:aggregate')) {
      const body = JSON.parse(opts.body);
      if (isActivityAggregate(body)) {
        aggregateCalls += 1;
        if (aggregateCalls === 1) {
          return { ok: true, status: 200, json: async () => ({ bucket: [] }) };
        }
        assert.equal(body.endTimeMillis - body.startTimeMillis, 7 * 86400_000);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            bucket: [
              {
                startTimeMillis: String(yesterdayStart),
                dataset: [
                  {
                    point: [
                      {
                        dataTypeName: 'com.google.step_count.delta',
                        originDataSourceId: 'raw:com.google.step_count.delta:com.xiaomi.hm.health',
                        value: [{ intVal: 5500 }],
                      },
                      {
                        dataTypeName: 'com.google.calories.expended',
                        originDataSourceId: 'derived:com.google.calories.expended:com.google.android.gms:merge_calories_expended',
                        value: [{ fpVal: 1900 }],
                      },
                      {
                        dataTypeName: 'com.google.active_minutes',
                        originDataSourceId: 'derived:com.google.active_minutes:com.google.android.gms:merge_active_minutes',
                        value: [{ intVal: 32 }],
                      },
                      {
                        dataTypeName: 'com.google.heart_minutes',
                        originDataSourceId: 'derived:com.google.heart_minutes:com.google.android.gms:merge_heart_minutes',
                        value: [{ fpVal: 14 }],
                      },
                    ],
                  },
                ],
              },
            ],
          }),
        };
      }
    }
    return { ok: true, status: 200, json: async () => ({ bucket: [], dataSource: [] }) };
  };

  const { wearableService } = loadWearableService(mockFetch);
  wearableService.setUserBmr(1500);
  const res = await wearableService.fetchGoogleFitLive('tok-2');
  assert.equal(res.steps, 5500);
  assert.equal(res.calories, 0);
  assert.equal(res.totalCalories, 1900);
  assert.equal(res.activeMinutes, 32);
  assert.equal(res.heartPoints, 14);
  assert.equal(res.isTodayData, false);

  const metrics = wearableService.getMetrics();
  assert.equal(metrics.isTodayData, false);
  assert.equal(metrics.totalCaloriesExpended, 1900);
  assert.equal(metrics.activeCalories, 400);
  assert.equal(metrics.todayActiveCalories, 0);
  assert.equal(metrics.activeMinutes, 32);
  assert.equal(metrics.heartPoints, 14);
  assert.match(metrics.dataDateLabel, /^Gần nhất:/);
});

test('concurrent fetchGoogleFitLive calls deduplicate and shouldAutoSync enforces 10s cooldown', async () => {
  let calls = 0;
  const mockFetch = async () => {
    calls += 1;
    return { ok: true, status: 200, json: async () => ({ bucket: [], dataSource: [] }) };
  };
  const { wearableService, localStorage } = loadWearableService(mockFetch);
  localStorage.setItem('google_fit_access_token', 'tok-4');
  assert.equal(wearableService.shouldAutoSync(), true);

  const [a, b] = await Promise.all([
    wearableService.fetchGoogleFitLive('tok-4'),
    wearableService.fetchGoogleFitLive('tok-4'),
  ]);
  assert.deepEqual(a, b);
  assert.equal(wearableService.shouldAutoSync(), false);
  assert.equal(wearableService.shouldAutoSync(0), true);
  assert.ok(calls > 0);
});

test('stale simulator & legacy biometric storage are cleared, and unified Google Fit SSOT device labels are preserved', async () => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const mockFetch = async (url, opts) => {
    if (url.includes('dataset:aggregate')) {
      const body = JSON.parse(opts.body);
      if (isActivityAggregate(body)) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            bucket: [
              {
                startTimeMillis: String(todayStart),
                dataset: [
                  {
                    point: [
                      {
                        dataTypeName: 'com.google.step_count.delta',
                        originDataSourceId: 'raw:com.google.step_count.delta:com.apple.health',
                        value: [{ intVal: 3200 }],
                      },
                    ],
                  },
                ],
              },
            ],
          }),
        };
      }
    }
    return { ok: true, status: 200, json: async () => ({ bucket: [], dataSource: [] }) };
  };

  const { wearableService, localStorage } = loadWearableService(mockFetch);
  localStorage.setItem('wearable_source', 'simulator');
  localStorage.setItem('wearable_preset', 'intense');
  localStorage.setItem('wearable_steps', '13600');
  localStorage.setItem('wearable_spo2', '98');
  localStorage.setItem('wearable_heart_rate', '75');
  localStorage.setItem('wearable_sleep', '7h 30m');

  const cleanMetrics = wearableService.getMetrics();
  assert.equal(cleanMetrics.steps, 0);
  assert.equal(cleanMetrics.source, 'none');

  await wearableService.fetchGoogleFitLive('tok-5');
  const synced = wearableService.getMetrics();
  assert.equal(synced.steps, 3200);
  assert.equal(synced.deviceModel, 'Google Fit (tổng hợp iPhone + Apple Watch)');
  assert.equal(localStorage.getItem('wearable_spo2'), null);
  assert.equal(localStorage.getItem('wearable_heart_rate'), null);
  assert.equal(localStorage.getItem('wearable_sleep'), null);
});
