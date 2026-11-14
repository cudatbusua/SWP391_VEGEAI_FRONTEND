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
    clear: () => map.clear()
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
    location: { hostname: 'localhost', port: '5173', origin: 'http://localhost:5173', pathname: '/settings', search: '', href: '' },
    dispatchEvent: (ev) => dispatched.push(ev.type)
  };
  class EventStub {
    constructor(type) { this.type = type; }
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
    clearInterval
  });
  const execute = vm.runInContext(`(function(require, module, exports) { ${outputText}\n })`, context);
  execute(() => ({}), module, module.exports);
  return { ...module.exports, localStorage, dispatched };
}

test('heart rate computes daily average with sample count & timestamp on most recent day', async () => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const sample1Ns = String((todayStart + 3600_000) * 1e6);
  const sample2Ns = String((todayStart + 7200_000) * 1e6);

  const mockFetch = async (url, opts) => {
    if (url.includes('dataset:aggregate')) {
      const body = JSON.parse(opts.body);
      const isActivity = body.aggregateBy.some(a => a.dataTypeName === 'com.google.step_count.delta');
      if (isActivity) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            bucket: [{
              startTimeMillis: String(todayStart),
              dataset: [{
                point: [{
                  dataTypeName: 'com.google.step_count.delta',
                  originDataSourceId: 'raw:com.google.step_count.delta:com.mi.health',
                  value: [{ intVal: 4200 }]
                }]
              }]
            }]
          })
        };
      }
      return { ok: true, status: 200, json: async () => ({ bucket: [] }) };
    }
    if (url.includes('merge_heart_rate_bpm/datasets')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          point: [
            { endTimeNanos: sample1Ns, value: [{ fpVal: 41 }] },
            { endTimeNanos: sample2Ns, value: [{ fpVal: 79 }] }
          ]
        })
      };
    }
    return { ok: true, status: 200, json: async () => ({ session: [], dataSource: [] }) };
  };

  const { wearableService } = loadWearableService(mockFetch);
  const res = await wearableService.fetchGoogleFitLive('tok-1');
  assert.equal(res.heartRate, 60);
  const metrics = wearableService.getMetrics();
  assert.equal(metrics.avgHeartRate, 60);
  assert.equal(metrics.isTodayData, true);
  assert.ok(metrics.todayActiveCalories > 0);
  assert.match(metrics.heartRateNote, /TB hôm nay.*2 mẫu/);
});

test('fallback to previous day within 7 days marks isTodayData=false and sets todayActiveCalories=0', async () => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const yesterdayStart = todayStart - 86400_000;
  let aggregateCalls = 0;

  const mockFetch = async (url, opts) => {
    if (url.includes('dataset:aggregate')) {
      const body = JSON.parse(opts.body);
      const isActivity = body.aggregateBy.some(a => a.dataTypeName === 'com.google.step_count.delta');
      if (isActivity) {
        aggregateCalls += 1;
        if (aggregateCalls === 1) {
          // Today has 0 steps
          return { ok: true, status: 200, json: async () => ({ bucket: [] }) };
        }
        // Lookback window: verify 7 days (604800000 ms)
        assert.equal(body.endTimeMillis - body.startTimeMillis, 7 * 86400_000);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            bucket: [{
              startTimeMillis: String(yesterdayStart),
              dataset: [{
                point: [{
                  dataTypeName: 'com.google.step_count.delta',
                  originDataSourceId: 'raw:com.google.step_count.delta:com.xiaomi.hm.health',
                  value: [{ intVal: 5500 }]
                }]
              }]
            }]
          })
        };
      }
      return { ok: true, status: 200, json: async () => ({ bucket: [] }) };
    }
    return { ok: true, status: 200, json: async () => ({ point: [], session: [], dataSource: [] }) };
  };

  const { wearableService } = loadWearableService(mockFetch);
  const res = await wearableService.fetchGoogleFitLive('tok-2');
  assert.equal(res.steps, 5500);
  assert.equal(res.calories, 0);
  const metrics = wearableService.getMetrics();
  assert.equal(metrics.isTodayData, false);
  assert.ok(metrics.activeCalories > 0);
  assert.equal(metrics.todayActiveCalories, 0);
  assert.match(metrics.dataDateLabel, /^Gần nhất:/);
});

test('manual heart rate is preserved across syncs with 0 HR, while stale Google Fit HR is cleared', async () => {
  const mockFetchEmptyHr = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ bucket: [], point: [], session: [], dataSource: [] })
  });

  const { wearableService, localStorage } = loadWearableService(mockFetchEmptyHr);
  wearableService.setManualHeartRate(72);
  await wearableService.fetchGoogleFitLive('tok-3');
  assert.equal(wearableService.getMetrics().avgHeartRate, 72);
  assert.match(wearableService.getMetrics().heartRateNote, /^Nhập tay lúc/);

  // Simulate stale google-fit HR in storage
  localStorage.setItem('wearable_heart_rate', '41');
  localStorage.setItem('wearable_heart_rate_source', 'google-fit');
  await wearableService.fetchGoogleFitLive('tok-3');
  assert.equal(wearableService.getMetrics().avgHeartRate, 0);
});

test('concurrent fetchGoogleFitLive calls deduplicate and shouldAutoSync enforces 5-minute cooldown', async () => {
  let calls = 0;
  const mockFetch = async () => {
    calls += 1;
    return { ok: true, status: 200, json: async () => ({ bucket: [], point: [], session: [], dataSource: [] }) };
  };
  const { wearableService, localStorage } = loadWearableService(mockFetch);
  localStorage.setItem('google_fit_access_token', 'tok-4');
  assert.equal(wearableService.shouldAutoSync(), true);

  const [a, b] = await Promise.all([
    wearableService.fetchGoogleFitLive('tok-4'),
    wearableService.fetchGoogleFitLive('tok-4')
  ]);
  assert.deepEqual(a, b);
  assert.equal(wearableService.shouldAutoSync(), false);
  assert.equal(wearableService.shouldAutoSync(0), true);
  assert.ok(calls > 0);
});

test('stale simulator storage is ignored and Apple/Huawei device labels are never overwritten by Xiaomi', async () => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const mockFetch = async (url, opts) => {
    if (url.includes('dataset:aggregate')) {
      const body = JSON.parse(opts.body);
      const isActivity = body.aggregateBy.some(a => a.dataTypeName === 'com.google.step_count.delta');
      if (isActivity) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            bucket: [{
              startTimeMillis: String(todayStart),
              dataset: [{
                point: [{
                  dataTypeName: 'com.google.step_count.delta',
                  originDataSourceId: 'raw:com.google.step_count.delta:com.apple.health',
                  value: [{ intVal: 3200 }]
                }]
              }]
            }]
          })
        };
      }
      return { ok: true, status: 200, json: async () => ({ bucket: [] }) };
    }
    if (url.includes('dataSources?dataTypeName=com.google.sleep.segment')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ dataSource: [{ dataStreamId: 'raw:com.google.sleep.segment:com.huawei.health:wearable' }] })
      };
    }
    return { ok: true, status: 200, json: async () => ({ point: [], session: [], dataSource: [] }) };
  };

  const { wearableService, localStorage } = loadWearableService(mockFetch);
  localStorage.setItem('wearable_source', 'simulator');
  localStorage.setItem('wearable_preset', 'intense');
  localStorage.setItem('wearable_steps', '13600');
  const cleanMetrics = wearableService.getMetrics();
  assert.equal(cleanMetrics.steps, 0);
  assert.equal(cleanMetrics.source, 'none');

  await wearableService.fetchGoogleFitLive('tok-5');
  const synced = wearableService.getMetrics();
  assert.equal(synced.steps, 3200);
  assert.equal(synced.deviceModel, 'Apple Watch (qua Apple Health)');
});
