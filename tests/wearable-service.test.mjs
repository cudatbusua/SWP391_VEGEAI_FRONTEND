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
    Map,
    Array,
    JSON,
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

test('queries official Google Fit merged streams for today (exact sync time) and previous 6 days without incomplete HR/SpO2/Sleep scopes', async () => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const twoDaysAgoStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 0, 0, 0, 0).getTime();
  const requests = [];
  let sawEstimatedStepsStream = false;

  const mockFetch = async (url, opts) => {
    const body = opts?.body ? JSON.parse(opts.body) : null;
    requests.push({ url, body });
    if (url.includes('dataset:aggregate') && isActivityAggregate(body)) {
      if (body.aggregateBy.some((a) => a.dataSourceId?.includes('estimated_steps'))) {
        sawEstimatedStepsStream = true;
      }
      // Today's exact query starts at todayStart
      if (body.startTimeMillis === todayStart) {
        assert.ok(body.endTimeMillis >= todayStart + 1000);
        assert.ok(
          body.endTimeMillis <= Date.now() + 5000,
          'today endTimeMillis should match exact sync time without 5-minute future inflation',
        );
        return {
          ok: true,
          status: 200,
          json: async () => ({
            bucket: [
              {
                startTimeMillis: String(todayStart),
                endTimeMillis: String(body.endTimeMillis),
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
                        originDataSourceId:
                          'derived:com.google.calories.expended:com.google.android.gms:merge_calories_expended',
                        value: [{ fpVal: 1325.4 }],
                      },
                      {
                        dataTypeName: 'com.google.distance.delta',
                        originDataSourceId:
                          'derived:com.google.distance.delta:com.google.android.gms:merge_distance_delta',
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
      // Previous 6 days history query ends at todayStart
      if (body.endTimeMillis === todayStart) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            bucket: [
              {
                startTimeMillis: String(twoDaysAgoStart),
                endTimeMillis: String(twoDaysAgoStart + 86400_000),
                dataset: [
                  {
                    point: [
                      {
                        dataTypeName: 'com.google.step_count.delta',
                        value: [{ intVal: 10450 }],
                      },
                      {
                        dataTypeName: 'com.google.calories.expended',
                        value: [{ fpVal: 2180 }],
                      },
                      {
                        dataTypeName: 'com.google.distance.delta',
                        value: [{ fpVal: 7420 }],
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
  assert.equal(requests.length, 2, 'fetches today and previous 6 days in parallel');
  assert.equal(res.steps, 2698);
  assert.equal(res.totalCalories, 1325);
  assert.equal(res.distanceKm, 1.61);
  assert.equal(res.isTodayData, true);
  assert.equal(res.dailyHistory.length, 7);

  const metrics = wearableService.getMetrics();
  assert.equal(metrics.steps, 2698);
  assert.equal(metrics.totalCaloriesExpended, 1325);
  assert.equal(metrics.distanceKm, 1.61);
  assert.equal(metrics.isTodayData, true);
  assert.equal(metrics.hasSyncedToday, true);
  assert.equal(metrics.deviceModel, 'Google Fit (Điện thoại + Xiaomi Smart Band)');
  assert.equal(metrics.activeMinutes, 0);
  assert.equal(metrics.heartPoints, 0);
  assert.equal(metrics.dailyHistory.length, 7);
  assert.equal(metrics.dailyHistory[6].isToday, true);
  assert.equal(metrics.dailyHistory[6].steps, 2698);
  assert.equal(metrics.dailyHistory[4].steps, 10450);
  assert.equal(metrics.dailyHistory[4].totalCalories, 2180);
  assert.equal(metrics.dailyHistory[4].distanceKm, 7.42);
});

test('keeps exact 0 steps / 0 km for today at sync time instead of overwriting with yesterday, while preserving yesterday in 7-day history', async () => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0).getTime();

  const mockFetch = async (url, opts) => {
    if (url.includes('dataset:aggregate')) {
      const body = JSON.parse(opts.body);
      if (isActivityAggregate(body)) {
        // Today has 0 steps, 0 km, 0 kcal right at sync moment
        if (body.startTimeMillis === todayStart) {
          return { ok: true, status: 200, json: async () => ({ bucket: [] }) };
        }
        // Yesterday had active workout data
        if (body.endTimeMillis === todayStart) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              bucket: [
                {
                  startTimeMillis: String(yesterdayStart),
                  endTimeMillis: String(todayStart),
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
                          originDataSourceId:
                            'derived:com.google.calories.expended:com.google.android.gms:merge_calories_expended',
                          value: [{ fpVal: 1900 }],
                        },
                        {
                          dataTypeName: 'com.google.distance.delta',
                          originDataSourceId:
                            'derived:com.google.distance.delta:com.google.android.gms:merge_distance_delta',
                          value: [{ fpVal: 3850 }],
                        },
                        {
                          dataTypeName: 'com.google.active_minutes',
                          value: [{ intVal: 32 }],
                        },
                        {
                          dataTypeName: 'com.google.heart_minutes',
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
    }
    return { ok: true, status: 200, json: async () => ({ bucket: [] }) };
  };

  const { wearableService } = loadWearableService(mockFetch);
  wearableService.setUserBmr(1500);
  const res = await wearableService.fetchGoogleFitLive('tok-2');

  // Today MUST remain exact 0 (never replaced with yesterday's 5500 steps)
  assert.equal(res.steps, 0);
  assert.equal(res.calories, 0);
  assert.equal(res.totalCalories, 0);
  assert.equal(res.distanceKm, 0);
  assert.equal(res.activeMinutes, 0);
  assert.equal(res.heartPoints, 0);
  assert.equal(res.isTodayData, true);

  const metrics = wearableService.getMetrics();
  assert.equal(metrics.steps, 0);
  assert.equal(metrics.totalCaloriesExpended, 0);
  assert.equal(metrics.distanceKm, 0);
  assert.equal(metrics.isTodayData, true);
  assert.equal(metrics.hasSyncedToday, true);
  assert.equal(metrics.todayActiveCalories, 0);
  assert.equal(metrics.dataDateLabel, 'Hôm nay');
  assert.equal(metrics.deviceModel, 'Google Fit (Điện thoại + Xiaomi Smart Band)');

  // Yesterday MUST appear cleanly in the 7-day history map
  assert.equal(metrics.dailyHistory.length, 7);
  const yesterdayRec = metrics.dailyHistory[5];
  const todayRec = metrics.dailyHistory[6];
  assert.equal(yesterdayRec.isToday, false);
  assert.equal(yesterdayRec.steps, 5500);
  assert.equal(yesterdayRec.totalCalories, 1900);
  assert.equal(yesterdayRec.activeCalories, 400);
  assert.equal(yesterdayRec.distanceKm, 3.85);
  assert.equal(yesterdayRec.activeMinutes, 32);
  assert.equal(yesterdayRec.heartPoints, 14);
  assert.equal(todayRec.isToday, true);
  assert.equal(todayRec.steps, 0);
  assert.equal(todayRec.distanceKm, 0);
});

test('live poll tick (includeHistory: false) queries only today and preserves cached previous 6 days', async () => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0).getTime();
  let todaySteps = 120;
  let fetchCount = 0;

  const mockFetch = async (url, opts) => {
    fetchCount += 1;
    const body = JSON.parse(opts.body);
    if (body.startTimeMillis === todayStart) {
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
                    { dataTypeName: 'com.google.step_count.delta', value: [{ intVal: todaySteps }] },
                  ],
                },
              ],
            },
          ],
        }),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        bucket: [
          {
            startTimeMillis: String(yesterdayStart),
            endTimeMillis: String(todayStart),
            dataset: [
              {
                point: [
                  { dataTypeName: 'com.google.step_count.delta', value: [{ intVal: 7200 }] },
                ],
              },
            ],
          },
        ],
      }),
    };
  };

  const { wearableService } = loadWearableService(mockFetch);
  await wearableService.fetchGoogleFitLive('tok-3', { includeHistory: true });
  assert.equal(fetchCount, 2);

  todaySteps = 485;
  await wearableService.fetchGoogleFitLive('tok-3', { includeHistory: false });
  assert.equal(fetchCount, 3, 'live tick should only send 1 today aggregate call');

  const metrics = wearableService.getMetrics();
  assert.equal(metrics.steps, 485);
  assert.equal(metrics.dailyHistory[6].steps, 485);
  assert.equal(metrics.dailyHistory[5].steps, 7200);
});

test('does not display yesterday cached steps as today after calendar day rollover or legacy isToday=false snapshot', () => {
  const { wearableService, localStorage } = loadWearableService(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ bucket: [] }),
  }));

  localStorage.setItem('google_fit_access_token', 'tok-rollover');
  localStorage.setItem('wearable_steps', '8400');
  localStorage.setItem('wearable_kcal', '320');
  localStorage.setItem('wearable_kcal_total', '1950');
  localStorage.setItem('wearable_distance_km', '6.1');
  localStorage.setItem('wearable_is_today', 'true');
  localStorage.setItem('wearable_sync_date_key', '2020-01-01');
  localStorage.setItem('wearable_source', 'google-fit');

  const metrics = wearableService.getMetrics();
  assert.equal(metrics.isConnected, true);
  assert.equal(metrics.hasSyncedToday, false);
  assert.equal(metrics.isTodayData, false);
  assert.equal(metrics.steps, 0);
  assert.equal(metrics.totalCaloriesExpended, 0);
  assert.equal(metrics.distanceKm, 0);
  assert.equal(metrics.todayActiveCalories, 0);

  // Legacy pre-upgrade snapshot saved today with isToday=false ("Gần nhất: 26/11")
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  localStorage.setItem('wearable_sync_date_key', todayKey);
  localStorage.setItem('wearable_is_today', 'false');
  localStorage.setItem('wearable_data_date', 'Gần nhất: 26/11');
  const legacyMetrics = wearableService.getMetrics();
  assert.equal(legacyMetrics.hasSyncedToday, false);
  assert.equal(legacyMetrics.steps, 0);
  assert.equal(legacyMetrics.totalCaloriesExpended, 0);
});

test('concurrent fetchGoogleFitLive calls deduplicate and shouldAutoSync enforces 10s cooldown', async () => {
  let calls = 0;
  const mockFetch = async () => {
    calls += 1;
    return { ok: true, status: 200, json: async () => ({ bucket: [] }) };
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
  assert.equal(calls, 2, 'only one pair (today + history) runs for concurrent calls');
});

test('stale simulator & legacy biometric storage are cleared, and disconnect wipes daily history', async () => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const mockFetch = async (url, opts) => {
    if (url.includes('dataset:aggregate')) {
      const body = JSON.parse(opts.body);
      if (isActivityAggregate(body) && body.startTimeMillis === todayStart) {
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
    return { ok: true, status: 200, json: async () => ({ bucket: [] }) };
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
  assert.equal(synced.deviceModel, 'Google Fit (iPhone + Apple Watch)');
  assert.equal(localStorage.getItem('wearable_spo2'), null);
  assert.equal(localStorage.getItem('wearable_heart_rate'), null);
  assert.equal(localStorage.getItem('wearable_sleep'), null);
  assert.ok(localStorage.getItem('wearable_daily_history'));

  wearableService.disconnect();
  assert.equal(localStorage.getItem('wearable_daily_history'), null);
  assert.equal(wearableService.getMetrics().dailyHistory.length, 0);
});

test('setUserBmr immediately recalculates today and 7-day activeCalories and dispatches wearable_sync_updated without reload', async () => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0).getTime();

  const mockFetch = async (url, opts) => {
    const body = JSON.parse(opts.body);
    if (body.startTimeMillis === todayStart) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          bucket: [
            {
              startTimeMillis: String(todayStart),
              dataset: [
                { point: [{ dataTypeName: 'com.google.calories.expended', value: [{ fpVal: 1800 }] }] },
              ],
            },
          ],
        }),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        bucket: [
          {
            startTimeMillis: String(yesterdayStart),
            endTimeMillis: String(todayStart),
            dataset: [
              { point: [{ dataTypeName: 'com.google.calories.expended', value: [{ fpVal: 2100 }] }] },
            ],
          },
        ],
      }),
    };
  };

  const { wearableService, dispatched } = loadWearableService(mockFetch);
  wearableService.setUserBmr(1800);
  await wearableService.fetchGoogleFitLive('tok-bmr');
  assert.equal(wearableService.getMetrics().dailyHistory[5].activeCalories, 300);

  const eventsBefore = dispatched.length;
  wearableService.setUserBmr(1500);
  assert.equal(dispatched.length, eventsBefore + 1, 'changing BMR should dispatch wearable_sync_updated');
  assert.equal(wearableService.getMetrics().dailyHistory[5].activeCalories, 600);
});

test('disconnect while sync is in flight does not resurrect cleared token or metrics', async () => {
  let resolveFetch;
  const pendingFetch = new Promise((r) => {
    resolveFetch = r;
  });
  const mockFetch = async () => pendingFetch;
  const { wearableService, localStorage } = loadWearableService(mockFetch);

  const syncPromise = wearableService.fetchGoogleFitLive('tok-race');
  wearableService.disconnect();

  resolveFetch({
    ok: true,
    status: 200,
    json: async () => ({
      bucket: [
        {
          startTimeMillis: String(Date.now()),
          dataset: [{ point: [{ dataTypeName: 'com.google.step_count.delta', value: [{ intVal: 9999 }] }] }],
        },
      ],
    }),
  });

  const res = await syncPromise;
  assert.equal(res.isTodayData, false);
  assert.equal(localStorage.getItem('google_fit_access_token'), null);
  assert.equal(wearableService.getMetrics().isConnected, false);
  assert.equal(wearableService.getMetrics().steps, 0);
});

test('handles offline fetch errors, 401 expiry, and NaN/negative Google Fit points safely', async () => {
  // 1. Offline network error -> friendly Vietnamese message
  const offline = loadWearableService(async () => {
    throw new TypeError('Failed to fetch');
  });
  await assert.rejects(
    () => offline.wearableService.fetchGoogleFitLive('tok-off'),
    /Không thể kết nối tới Google Fit/,
  );

  // 2. 401 Unauthorized -> disconnects & throws expiry message
  const expired = loadWearableService(async () => ({ ok: false, status: 401, json: async () => ({}) }));
  expired.localStorage.setItem('google_fit_access_token', 'tok-401');
  await assert.rejects(
    () => expired.wearableService.fetchGoogleFitLive('tok-401'),
    /hết hạn/,
  );
  assert.equal(expired.localStorage.getItem('google_fit_access_token'), null);

  // 3. NaN / negative data points never poison totals
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const malformed = loadWearableService(async (url, opts) => {
    const body = JSON.parse(opts.body);
    if (body.startTimeMillis === todayStart) {
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
                    { dataTypeName: 'com.google.step_count.delta', value: [{ intVal: Number.NaN }] },
                    { dataTypeName: 'com.google.step_count.delta', value: [{ intVal: -50 }] },
                    { dataTypeName: 'com.google.step_count.delta', value: [{ intVal: 120 }] },
                    { dataTypeName: 'com.google.calories.expended', value: [{ fpVal: Number.NaN }] },
                    { dataTypeName: 'com.google.distance.delta', value: [{ fpVal: -300 }] },
                  ],
                },
              ],
            },
          ],
        }),
      };
    }
    return { ok: true, status: 200, json: async () => ({ bucket: [] }) };
  });

  const clean = await malformed.wearableService.fetchGoogleFitLive('tok-nan');
  assert.equal(clean.steps, 120);
  assert.equal(clean.totalCalories, 0);
  assert.equal(clean.distanceKm, 0);
});


