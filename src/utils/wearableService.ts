/**
 * VEGEAI Omni-Wearable Health Hub & Google Fit Service
 * Handles cross-platform wearable syncing (Xiaomi Smart Band, Apple Watch, Galaxy Watch)
 * via Google Fit REST API / Health Connect bridge, with simulation fallback for testing.
 */

export const GOOGLE_FIT_CLIENT_ID = '164354959561-84vaff9lo56ummq04itrgq642kmjd4qo.apps.googleusercontent.com';

export const GOOGLE_FIT_SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.body.read',
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
  'https://www.googleapis.com/auth/fitness.sleep.read',
  'https://www.googleapis.com/auth/fitness.location.read',
  'https://www.googleapis.com/auth/fitness.oxygen_saturation.read'
].join(' ');

export interface WearableMetrics {
  steps: number;
  stepTarget: number;
  activeCalories: number;
  activeMinutes: number;
  avgHeartRate: number;
  /** Quãng đường hôm nay (km), 0 nếu chưa có dữ liệu */
  distanceKm: number;
  /** Tổng năng lượng tiêu hao Google Fit ghi nhận (đã gồm trao đổi chất cơ bản), 0 nếu chưa có */
  totalCaloriesExpended: number;
  /** Điểm vận động tim mạch (Heart Points) của Google Fit, 0 nếu chưa có */
  heartPoints: number;
  /** Độ bão hòa oxy SpO2 (%), 0 nếu chưa có dữ liệu */
  spo2: number;
  sleepHours: string;
  source: 'google-fit' | 'xiaomi-band' | 'simulator' | 'none';
  lastSyncedAt: string;
  isConnected: boolean;
  deviceModel: string;
  aiAdvice: string;
  recommendedSnack: string;
}

const STORAGE_KEYS = {
  TOKEN: 'google_fit_access_token',
  STEPS: 'wearable_steps',
  KCAL: 'wearable_kcal',
  HEART_RATE: 'wearable_heart_rate',
  ACTIVE_MINUTES: 'wearable_active_minutes',
  SLEEP: 'wearable_sleep',
  KCAL_TOTAL: 'wearable_kcal_total',
  USER_BMR: 'wearable_user_bmr',
  DISTANCE: 'wearable_distance_km',
  HEART_POINTS: 'wearable_heart_points',
  SPO2: 'wearable_spo2',
  SOURCE: 'wearable_source',
  SYNC_TIME: 'wearable_last_synced',
  PRESET: 'wearable_preset',
  DEVICE: 'wearable_device'
};

export const WEARABLE_PRESETS = {
  light: {
    steps: 3850,
    stepTarget: 10000,
    activeCalories: 180,
    activeMinutes: 22,
    avgHeartRate: 68,
    sleepHours: '6h 45m',
    aiAdvice: 'Hôm nay mức vận động còn nhẹ (3.850 bước). Đề xuất đi bộ thư giãn thêm 20 phút vào buổi chiều tối và ưu tiên thực đơn thanh đạm, giàu chất xơ.',
    recommendedSnack: 'Nước ép cần tây dưa leo hạt chia (85 kcal)'
  },
  moderate: {
    steps: 8420,
    stepTarget: 10000,
    activeCalories: 485,
    activeMinutes: 52,
    avgHeartRate: 74,
    sleepHours: '7h 35m',
    aiAdvice: 'Bạn đã tiêu hao khoảng 485 kcal từ 8.420 bước chân. Đề xuất bổ sung thêm bữa phụ giàu đạm thực vật để hồi phục cơ bắp và bù nước điện giải.',
    recommendedSnack: 'Sinh tố bơ chuối sữa hạt sen (195 kcal · 7g protein)'
  },
  intense: {
    steps: 13600,
    stepTarget: 10000,
    activeCalories: 760,
    activeMinutes: 85,
    avgHeartRate: 82,
    sleepHours: '8h 10m',
    aiAdvice: 'Cường độ vận động cao (13.600 bước, 760 kcal)! Hãy tăng khẩu phần bữa tối hoặc bổ sung nước dừa tươi bù khoáng chất.',
    recommendedSnack: 'Bát yến mạch ngâm sữa đậu nành & hạt óc chó (280 kcal · 12g protein)'
  }
};

export const wearableService = {
  getStoredToken(): string {
    return localStorage.getItem(STORAGE_KEYS.TOKEN) || '';
  },

  getMetrics(): WearableMetrics {
    const token = this.getStoredToken();
    const storedSteps = localStorage.getItem(STORAGE_KEYS.STEPS);
    const storedKcal = localStorage.getItem(STORAGE_KEYS.KCAL);
    const storedHeartRate = localStorage.getItem(STORAGE_KEYS.HEART_RATE);
    const storedActiveMinutes = localStorage.getItem(STORAGE_KEYS.ACTIVE_MINUTES);
    const storedSleep = localStorage.getItem(STORAGE_KEYS.SLEEP);
    const storedSource = localStorage.getItem(STORAGE_KEYS.SOURCE);
    const storedSync = localStorage.getItem(STORAGE_KEYS.SYNC_TIME);
    const storedDevice = localStorage.getItem(STORAGE_KEYS.DEVICE);
    const presetKey = localStorage.getItem(STORAGE_KEYS.PRESET) as keyof typeof WEARABLE_PRESETS | null;

    // Clean empty state if not linked to Google Fit and no simulator preset chosen
    if (!token && !storedSteps && !presetKey) {
      return {
        steps: 0,
        stepTarget: 10000,
        activeCalories: 0,
        activeMinutes: 0,
        avgHeartRate: 0,
        distanceKm: 0,
        totalCaloriesExpended: 0,
        heartPoints: 0,
        spo2: 0,
        sleepHours: '—',
        source: 'none',
        lastSyncedAt: 'Chưa liên kết thiết bị',
        isConnected: false,
        deviceModel: 'Chưa kết nối',
        aiAdvice: 'Bạn chưa liên kết Google Fit hoặc thiết bị đeo. Hãy kết nối Google Fit để VEGEAI đồng bộ chỉ số và tự động cân đối năng lượng.',
        recommendedSnack: 'Chưa có dữ liệu vận động'
      };
    }

    const preset = presetKey && WEARABLE_PRESETS[presetKey] ? WEARABLE_PRESETS[presetKey] : null;
    const steps = storedSteps !== null ? Number(storedSteps) : (preset?.steps || 0);
    const activeCalories = storedKcal !== null ? Number(storedKcal) : (preset?.activeCalories || 0);
    const avgHeartRate = storedHeartRate !== null ? Number(storedHeartRate) : (preset?.avgHeartRate || 0);
    const activeMinutes = storedActiveMinutes !== null ? Number(storedActiveMinutes) : (preset?.activeMinutes || 0);

    let adviceText = '';
    const storedKcalTotal = localStorage.getItem(STORAGE_KEYS.KCAL_TOTAL);
    if (steps > 0) {
      const activeStr = activeCalories > 0 ? `+${activeCalories.toLocaleString('vi-VN')} kcal vận động` : '';
      const totalStr = storedKcalTotal && Number(storedKcalTotal) > 0 ? ` (tổng tiêu hao ${Number(storedKcalTotal).toLocaleString('vi-VN')} kcal)` : '';
      adviceText = `Đã đồng bộ thực tế từ ${storedDevice || 'Google Fit'}: ${steps.toLocaleString('vi-VN')} bước chân${activeStr ? ', ' + activeStr : ''}${totalStr}.`;
    } else if (preset) {
      adviceText = preset.aiAdvice;
    } else if (token) {
      adviceText = `Đã liên kết Google Fit (${storedDevice || 'Thiết bị đeo'}). Hôm nay chưa ghi nhận dữ liệu bước chân mới. Bạn có thể nhấn "Đồng bộ Google Fit" để làm mới dữ liệu.`;
    } else {
      adviceText = 'Bạn chưa liên kết Google Fit hoặc thiết bị đeo. Hãy bấm "Đồng bộ Google Fit" ở trên hoặc vào mục "Hồ sơ & Thể trạng" để kết nối theo dõi sức khỏe.';
    }

    return {
      steps,
      stepTarget: 10000,
      activeCalories,
      activeMinutes,
      avgHeartRate,
      distanceKm: Number(localStorage.getItem(STORAGE_KEYS.DISTANCE)) || 0,
      totalCaloriesExpended: Number(localStorage.getItem(STORAGE_KEYS.KCAL_TOTAL)) || 0,
      heartPoints: Number(localStorage.getItem(STORAGE_KEYS.HEART_POINTS)) || 0,
      spo2: Number(localStorage.getItem(STORAGE_KEYS.SPO2)) || 0,
      sleepHours: storedSleep || preset?.sleepHours || '—',
      source: (storedSource as any) || (token ? 'google-fit' : (preset ? 'simulator' : 'none')),
      lastSyncedAt: storedSync || (token ? 'Đã liên kết tài khoản' : 'Chưa đồng bộ'),
      isConnected: Boolean(token),
      deviceModel: token ? (storedDevice || 'Google Fit / Health Connect') : (preset ? (storedDevice || 'Thiết bị đeo (Google Fit)') : 'Chưa kết nối thiết bị'),
      aiAdvice: adviceText,
      recommendedSnack: steps > 8000
        ? 'Sinh tố bơ chuối sữa hạt sen (195 kcal · 7g protein)'
        : (steps > 0 ? 'Nước ép cần tây dưa leo hạt chia (85 kcal)' : 'Rau củ quả tươi giàu vitamin & khoáng chất')
    };
  },

  setPreset(key: 'light' | 'moderate' | 'intense'): WearableMetrics {
    localStorage.setItem(STORAGE_KEYS.PRESET, key);
    const p = WEARABLE_PRESETS[key];
    localStorage.setItem(STORAGE_KEYS.STEPS, String(p.steps));
    localStorage.setItem(STORAGE_KEYS.KCAL, String(p.activeCalories));
    localStorage.setItem(STORAGE_KEYS.HEART_RATE, String(p.avgHeartRate));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_MINUTES, String(p.activeMinutes));
    localStorage.setItem(STORAGE_KEYS.SLEEP, p.sleepHours);
    localStorage.removeItem(STORAGE_KEYS.DISTANCE);
    localStorage.removeItem(STORAGE_KEYS.HEART_POINTS);
    localStorage.removeItem(STORAGE_KEYS.SPO2);
    localStorage.setItem(STORAGE_KEYS.SYNC_TIME, `Mô phỏng (${key === 'light' ? 'Nhẹ' : key === 'moderate' ? 'Tiêu chuẩn' : 'Cường độ cao'})`);
    localStorage.setItem(STORAGE_KEYS.SOURCE, 'simulator');
    localStorage.removeItem(STORAGE_KEYS.DEVICE);
    window.dispatchEvent(new Event('wearable_sync_updated'));
    return this.getMetrics();
  },

  disconnect() {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.STEPS);
    localStorage.removeItem(STORAGE_KEYS.KCAL);
    localStorage.removeItem(STORAGE_KEYS.HEART_RATE);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_MINUTES);
    localStorage.removeItem(STORAGE_KEYS.SLEEP);
    localStorage.removeItem(STORAGE_KEYS.DISTANCE);
    localStorage.removeItem(STORAGE_KEYS.HEART_POINTS);
    localStorage.removeItem(STORAGE_KEYS.SPO2);
    localStorage.removeItem(STORAGE_KEYS.KCAL_TOTAL);
    localStorage.removeItem(STORAGE_KEYS.PRESET);
    localStorage.removeItem(STORAGE_KEYS.SOURCE);
    localStorage.removeItem(STORAGE_KEYS.SYNC_TIME);
    localStorage.removeItem(STORAGE_KEYS.DEVICE);
    window.dispatchEvent(new Event('wearable_sync_updated'));
  },

  async fetchGoogleFitLive(token: string): Promise<{ steps: number; calories: number; heartRate: number }> {
    const now = new Date();
    // Query metrics strictly for today (from 00:00:00 midnight local time to right now)
    // to match wearable device daily resets (e.g. Mi Band / Apple Watch / Google Fit daily cycle)
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const startTimeMillis = startOfDay.getTime();
    const endTimeMillis = now.getTime();

    // 1. Query Activity metrics (Step count, Calorie expended & Active minutes) - requires fitness.activity.read
    const activityRequestBody = {
      aggregateBy: [
        { dataTypeName: 'com.google.step_count.delta' },
        { dataTypeName: 'com.google.calories.expended' },
        { dataTypeName: 'com.google.active_minutes' },
        { dataTypeName: 'com.google.distance.delta' },
        { dataTypeName: 'com.google.heart_minutes' }
      ],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: startTimeMillis,
      endTimeMillis: endTimeMillis
    };

    const res = await fetch('https://fitness.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(activityRequestBody)
    });

    if (!res.ok) {
      if (res.status === 401) {
        this.disconnect();
        throw new Error('Phiên kết nối Google Fit đã hết hạn. Vui lòng liên kết lại.');
      }
      throw new Error('Không thể đồng bộ dữ liệu lúc này. Vui lòng thử lại sau.');
    }

    const data = await res.json();

    // Helper functions to distinguish wearable devices (Mi Band, Apple Watch, Garmin, Galaxy Watch)
    // from internal phone accelerometer sensors to completely eliminate double-counting / add-up bugs.
    const isWearableStream = (src: string): boolean => {
      const s = src.toLowerCase();
      if (s.includes('estimated_steps') || s.includes('merge_step_deltas') || s.includes('internal_sensor')) {
        return false;
      }
      return (
        s.includes('xiaomi') ||
        s.includes('wearable') ||
        s.includes('healthdata') ||
        s.includes('health_connect') ||
        s.includes('fitbit') ||
        s.includes('garmin') ||
        s.includes('samsung') ||
        s.includes('shealth') ||
        s.includes('huawei') ||
        s.includes('polar') ||
        s.includes('fossil') ||
        s.includes('oppo') ||
        s.includes('amazfit') ||
        s.includes('zepp') ||
        s.includes('apple') ||
        s.includes('band') ||
        s.includes('watch') ||
        s.includes('wrist')
      );
    };

    const formatDeviceLabel = (rawSrc: string): string => {
      const s = rawSrc.toLowerCase();
      if (s.includes('xiaomi') || s.includes('mi fitness') || s.includes('mi band')) {
        return 'Xiaomi Band / Smartwatch (qua Mi Fitness)';
      }
      if (s.includes('amazfit') || s.includes('zepp')) {
        return 'Amazfit / Zepp Tracker';
      }
      if (s.includes('samsung') || s.includes('shealth')) {
        return 'Samsung Galaxy Watch (qua Samsung Health)';
      }
      if (s.includes('apple') || s.includes('healthkit')) {
        return 'Apple Watch (qua Apple Health)';
      }
      if (s.includes('garmin')) {
        return 'Garmin Watch (qua Garmin Connect)';
      }
      if (s.includes('fitbit')) {
        return 'Fitbit Tracker';
      }
      if (s.includes('huawei')) {
        return 'Huawei Health';
      }
      if (s.includes('oppo')) {
        return 'OPPO Watch';
      }
      if (s.includes('healthdata') || s.includes('health_connect') || s.includes('wearable')) {
        return 'Thiết bị đeo thông minh (qua Health Connect)';
      }
      if (s.includes('estimated_steps') || s.includes('android.gms') || s.includes('internal_sensor')) {
        return 'Cảm biến bước chân điện thoại (Google Fit)';
      }
      return 'Google Fit Cloud';
    };

    interface DeviceGroup {
      packageKey: string;
      isWearable: boolean;
      steps: number;
      calories: number;
      activeMinutes: number;
      distanceMeters: number;
      heartPoints: number;
      label: string;
    }

    const deviceGroups: Record<string, DeviceGroup> = {};

    if (data.bucket && data.bucket.length > 0) {
      for (const bucket of data.bucket) {
        if (!bucket.dataset) continue;
        for (const ds of bucket.dataset) {
          if (!ds.point) continue;
          for (const point of ds.point) {
            const rawSource = point.originDataSourceId || ds.dataSourceId || 'com.google.android.gms';
            const parts = rawSource.split(':');
            const packageKey = parts.length >= 3 ? parts[2] : rawSource;

            if (!deviceGroups[packageKey]) {
              deviceGroups[packageKey] = {
                packageKey,
                isWearable: isWearableStream(rawSource),
                steps: 0,
                calories: 0,
                activeMinutes: 0,
                distanceMeters: 0,
                heartPoints: 0,
                label: formatDeviceLabel(rawSource)
              };
            }

            const grp = deviceGroups[packageKey];
            if (point.dataTypeName === 'com.google.step_count.delta') {
              grp.steps += point.value?.[0]?.intVal || 0;
            } else if (point.dataTypeName === 'com.google.calories.expended') {
              grp.calories += point.value?.[0]?.fpVal || 0;
            } else if (point.dataTypeName === 'com.google.active_minutes') {
              grp.activeMinutes += point.value?.[0]?.intVal || point.value?.[0]?.fpVal || 0;
            } else if (point.dataTypeName === 'com.google.distance.delta') {
              grp.distanceMeters += point.value?.[0]?.fpVal || 0;
            } else if (point.dataTypeName === 'com.google.heart_minutes') {
              grp.heartPoints += point.value?.[0]?.fpVal || point.value?.[0]?.intVal || 0;
            }
          }
        }
      }
    }

    const groupsList = Object.values(deviceGroups);
    // Find wearable streams with steps > 0
    const wearableGroup = groupsList
      .filter(g => g.isWearable && g.steps > 0)
      .sort((a, b) => b.steps - a.steps)[0];
    const phoneGroup = groupsList
      .filter(g => !g.isWearable && g.steps > 0)
      .sort((a, b) => b.steps - a.steps)[0];

    // Priority Selection:
    // If the user wears the Mi Band / Smartwatch, prioritize the wearable source 100%
    // and completely discard the duplicate phone accelerometer stream.
    // Fall back to phone sensors only if no wearable steps exist today.
    let chosenGroup: DeviceGroup;
    if (wearableGroup) {
      chosenGroup = wearableGroup;
    } else if (phoneGroup) {
      chosenGroup = phoneGroup;
    } else {
      chosenGroup = groupsList[0] || {
        packageKey: 'none',
        isWearable: false,
        steps: 0,
        calories: 0,
        activeMinutes: 0,
        distanceMeters: 0,
        heartPoints: 0,
        label: 'Google Fit Hub'
      };
    }

    let steps = chosenGroup.steps;
    let calories = chosenGroup.calories;
    let activeMinutes = chosenGroup.activeMinutes;
    let detectedDevice = chosenGroup.label;
    let detectedWearableFromAnyStream = groupsList.some(g => g.isWearable);

    // Safety fallback: If wearable stream didn't include separate calorie/minute packets, borrow from available stream
    if (calories === 0) {
      const withKcal = groupsList.find(g => g.calories > 0);
      if (withKcal) calories = withKcal.calories;
    }
    if (activeMinutes === 0) {
      const withActive = groupsList.find(g => g.activeMinutes > 0);
      if (withActive) activeMinutes = withActive.activeMinutes;
    }

    // Distance & Heart Points: take the largest single-source value (never sum across sources to avoid double counting)
    const distanceMeters = Math.max(0, ...groupsList.map(g => g.distanceMeters));
    let heartPoints = Math.round(Math.max(0, ...groupsList.map(g => g.heartPoints)));

    // Heart Points are computed by Google Fit itself (not by Mi Fitness). If the dataTypeName aggregate returned
    // nothing, retry against Google's own merged heart-points stream.
    if (heartPoints === 0) {
      try {
        const hpRes = await fetch('https://fitness.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aggregateBy: [{ dataSourceId: 'derived:com.google.heart_minutes:com.google.android.gms:merge_heart_minutes' }],
            bucketByTime: { durationMillis: 86400000 },
            startTimeMillis,
            endTimeMillis
          })
        });
        console.info('[wearable] heart points merged stream status:', hpRes.status);
        if (hpRes.ok) {
          const hpJson = await hpRes.json();
          for (const b of hpJson.bucket || []) {
            for (const ds of b.dataset || []) {
              for (const pt of ds.point || []) {
                heartPoints += pt.value?.[0]?.fpVal || pt.value?.[0]?.intVal || 0;
              }
            }
          }
          heartPoints = Math.round(heartPoints);
        }
      } catch (err) {
        console.warn('Heart points fallback failed:', err);
      }
    }

    // Direct dataSources check for Heart Points if aggregate returned 0
    if (heartPoints === 0) {
      try {
        const hpDsRes = await fetch('https://fitness.googleapis.com/fitness/v1/users/me/dataSources?dataTypeName=com.google.heart_minutes', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (hpDsRes.ok) {
          const hpDsJson = await hpDsRes.json();
          for (const ds of hpDsJson.dataSource || []) {
            if (!ds.dataStreamId) continue;
            const dsUrl = `https://fitness.googleapis.com/fitness/v1/users/me/dataSources/${encodeURIComponent(ds.dataStreamId)}/datasets/${BigInt(startTimeMillis) * 1000000n}-${BigInt(endTimeMillis + 600000) * 1000000n}`;
            const dsRes = await fetch(dsUrl, { headers: { Authorization: `Bearer ${token}` } });
            if (dsRes.ok) {
              const dsJson = await dsRes.json();
              let streamPts = 0;
              for (const pt of dsJson.point || []) {
                streamPts += pt.value?.[0]?.fpVal || pt.value?.[0]?.intVal || 0;
              }
              if (streamPts > 0) {
                heartPoints = Math.max(heartPoints, Math.round(streamPts));
              }
            }
          }
        }
      } catch (err) {
        console.warn('Heart points raw dataSources fallback failed:', err);
      }
    }

    // SpO2 (oxygen saturation): latest daily aggregate value shared by Mi Fitness. Requires fitness.oxygen_saturation.read
    let spo2 = 0;
    try {
      const spo2Res = await fetch('https://fitness.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          aggregateBy: [{ dataTypeName: 'com.google.oxygen_saturation' }],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: startTimeMillis - 24 * 60 * 60 * 1000,
          endTimeMillis: endTimeMillis
        })
      });
      if (spo2Res.ok) {
        const spo2Json = await spo2Res.json();
        for (const b of spo2Json.bucket || []) {
          for (const ds of b.dataset || []) {
            for (const pt of ds.point || []) {
              const pct = pt.value?.[0]?.fpVal || 0;
              // Sanity check: SpO2 is a percentage; ignore out-of-range values
              if (pct >= 50 && pct <= 100) spo2 = Math.round(pct);
            }
          }
        }
      }
    } catch (err) {
      console.warn('SpO2 query failed:', err);
    }

    // 2. SMART MULTI-TIER HEART RATE INGESTION ENGINE
    // Tier 1: Query merged raw stream (captures manual logs, camera pulse scans & smartwatch pulse instantly)
    // Tier 2: Fallback to Google Fit Aggregate Summary
    // Tier 3: Fallback to Resting Heart Rate stream
    let heartRate = 0;
    let heartRateScopeMissing = false;

    // Window: Check the last 48 hours to now (+10 mins buffer for device clock drift)
    const hrStartNanos = BigInt(now.getTime() - 48 * 60 * 60 * 1000) * 1000000n;
    const hrEndNanos = BigInt(now.getTime() + 10 * 60 * 1000) * 1000000n;

    // Tier 1: Check merged stream (reads discrete camera points & manual inputs entered in Google Fit)
    try {
      const mergedStreamUrl = `https://fitness.googleapis.com/fitness/v1/users/me/dataSources/derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_bpm/datasets/${hrStartNanos}-${hrEndNanos}`;
      const streamRes = await fetch(mergedStreamUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (streamRes.status === 403) {
        heartRateScopeMissing = true;
        console.warn('Google Fit Heart Rate: Token lacks fitness.heart_rate.read permission.');
      } else if (streamRes.ok) {
        const streamData = await streamRes.json();
        if (streamData.point && streamData.point.length > 0) {
          // Take the latest measured point (most recent vital entry)
          const latestPoint = streamData.point[streamData.point.length - 1];
          const bpm = latestPoint.value?.[0]?.fpVal || latestPoint.value?.[0]?.intVal || 0;
          if (bpm > 0) {
            heartRate = Math.round(bpm);
          }
        }
      }
    } catch (err) {
      console.warn('Tier 1 Merged HR query failed, falling back:', err);
    }

    // Tier 1b: Direct Xiaomi / Wearable dataSources query
    // If Google Play Services has not finished merging the raw Xiaomi stream into merge_heart_rate_bpm,
    // query active dataSources directly to pull raw measurements pushed by Mi Fitness / Health Connect.
    if (heartRate === 0 && !heartRateScopeMissing) {
      try {
        const dsRes = await fetch('https://fitness.googleapis.com/fitness/v1/users/me/dataSources?dataTypeName=com.google.heart_rate.bpm', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (dsRes.ok) {
          const dsData = await dsRes.json();
          if (dsData.dataSource && dsData.dataSource.length > 0) {
            for (const ds of dsData.dataSource) {
              const streamId = ds.dataStreamId;
              if (!streamId) continue;
              const sLower = streamId.toLowerCase();
              if (sLower.includes('xiaomi') || sLower.includes('wearable') || sLower.includes('mi fitness')) {
                detectedWearableFromAnyStream = true;
              }
              const rawDsUrl = `https://fitness.googleapis.com/fitness/v1/users/me/dataSources/${encodeURIComponent(streamId)}/datasets/${hrStartNanos}-${hrEndNanos}`;
              const rawRes = await fetch(rawDsUrl, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (rawRes.ok) {
                const rawJson = await rawRes.json();
                console.info('[wearable] heart rate stream', streamId, 'points:', rawJson.point?.length || 0);
                if (rawJson.point && rawJson.point.length > 0) {
                  const latest = rawJson.point[rawJson.point.length - 1];
                  const bpm = latest.value?.[0]?.fpVal || latest.value?.[0]?.intVal || 0;
                  if (bpm > 0) {
                    heartRate = Math.round(bpm);
                    const sLower = streamId.toLowerCase();
                    if (sLower.includes('xiaomi') || sLower.includes('wearable') || sLower.includes('mi fitness')) {
                      detectedDevice = 'Xiaomi Band / Smartwatch (qua Mi Fitness)';
                    }
                    break;
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('Tier 1b Direct dataSources HR query:', err);
      }
    }

    // Tier 2: If Tier 1 found nothing, query Aggregate Summary API
    if (heartRate === 0 && !heartRateScopeMissing) {
      try {
        const hrRequestBody = {
          aggregateBy: [{ dataTypeName: 'com.google.heart_rate.bpm' }],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: startTimeMillis,
          endTimeMillis: endTimeMillis + (10 * 60 * 1000)
        };
        const hrRes = await fetch('https://fitness.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(hrRequestBody)
        });
        if (hrRes.status === 403) {
          heartRateScopeMissing = true;
        } else if (hrRes.ok) {
          const hrData = await hrRes.json();
          if (hrData.bucket) {
            for (const b of hrData.bucket) {
              if (!b.dataset) continue;
              for (const ds of b.dataset) {
                if (!ds.point) continue;
                for (const pt of ds.point) {
                  if (pt.dataTypeName && pt.dataTypeName.includes('heart_rate')) {
                    const bpm = pt.value?.[0]?.fpVal || pt.value?.[0]?.intVal || 0;
                    if (bpm > 0) {
                      heartRate = Math.round(bpm);
                    }
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('Tier 2 Aggregate HR query failed:', err);
      }
    }

    // Tier 3: Query Resting Heart Rate stream if still 0
    if (heartRate === 0 && !heartRateScopeMissing) {
      try {
        const restingStreamUrl = `https://fitness.googleapis.com/fitness/v1/users/me/dataSources/derived:com.google.heart_rate.bpm:com.google.android.gms:resting_heart_rate<-merge_heart_rate_bpm/datasets/${hrStartNanos}-${hrEndNanos}`;
        const restRes = await fetch(restingStreamUrl, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (restRes.ok) {
          const restData = await restRes.json();
          if (restData.point && restData.point.length > 0) {
            const latestRest = restData.point[restData.point.length - 1];
            const bpm = latestRest.value?.[0]?.fpVal || latestRest.value?.[0]?.intVal || 0;
            if (bpm > 0) {
              heartRate = Math.round(bpm);
            }
          }
        }
      } catch {
        // Ignored
      }
    }

    if (heartRateScopeMissing) {
      localStorage.setItem('wearable_hr_scope_missing', 'true');
    } else {
      localStorage.removeItem('wearable_hr_scope_missing');
    }

    // 3. Query Sleep Sessions (Activity Type 72 = Sleep in Google Fit)
    // Pulls actual sleep data pushed by Mi Fitness / Wearables
    // Only accept sessions that ended within the last 16 hours (strictly last night's sleep) to avoid stale data
    let sleepHours = '—';
    try {
      const sleepStartIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const sleepEndIso = new Date().toISOString();
      const sleepRes = await fetch(
        `https://fitness.googleapis.com/fitness/v1/users/me/sessions?startTime=${encodeURIComponent(sleepStartIso)}&endTime=${encodeURIComponent(sleepEndIso)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      if (sleepRes.ok) {
        const sleepJson = await sleepRes.json();
        if (sleepJson.session && sleepJson.session.length > 0) {
          const sleepSessions = sleepJson.session.filter((s: any) =>
            s.activityType === 72 ||
            (s.name && s.name.toLowerCase().includes('sleep')) ||
            (s.description && s.description.toLowerCase().includes('sleep'))
          );
          if (sleepSessions.length > 0) {
            const latest = sleepSessions[sleepSessions.length - 1];
            const startMs = Number(latest.startTimeMillis);
            const endMs = Number(latest.endTimeMillis);
            const minAcceptableEndMs = Date.now() - 16 * 60 * 60 * 1000;
            if (endMs > minAcceptableEndMs && endMs > startMs) {
              const diffMs = endMs - startMs;
              const h = Math.floor(diffMs / (1000 * 60 * 60));
              const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
              sleepHours = `${h}h ${m}m`;
            }
          }
        }
      }
    } catch {
      // Ignored if sessions query fails
    }

    // Fallback: the sessions endpoint is often empty for data written via Health Connect.
    // Read raw sleep segments (stage 2 = sleep, 4 = light, 5 = deep, 6 = REM) from the last 48 hours and keep only the most recent night.
    if (sleepHours === '—') {
      try {
        const segStartNanos = BigInt(now.getTime() - 48 * 60 * 60 * 1000) * 1000000n;
        const segEndNanos = BigInt(now.getTime()) * 1000000n;
        const dsRes = await fetch('https://fitness.googleapis.com/fitness/v1/users/me/dataSources?dataTypeName=com.google.sleep.segment', {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.info('[wearable] sleep.segment dataSources status:', dsRes.status);
        if (dsRes.ok) {
          const dsJson = await dsRes.json();
          let bestMs = 0;
          for (const ds of dsJson.dataSource || []) {
            if (!ds.dataStreamId) continue;
            const dsLower = ds.dataStreamId.toLowerCase();
            if (dsLower.includes('xiaomi') || dsLower.includes('wearable') || dsLower.includes('mi fitness')) {
              detectedWearableFromAnyStream = true;
            }
            const segRes = await fetch(
              `https://fitness.googleapis.com/fitness/v1/users/me/dataSources/${encodeURIComponent(ds.dataStreamId)}/datasets/${segStartNanos}-${segEndNanos}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!segRes.ok) {
              console.info('[wearable] sleep stream', ds.dataStreamId, 'status', segRes.status);
              continue;
            }
            const segJson = await segRes.json();
            const points: any[] = segJson.point || [];
            console.info('[wearable] sleep stream', ds.dataStreamId, 'points:', points.length);
            // Anchor on the most recent segment, then sum sleep stages from the 20 hours before it ends (= last night)
            const latestEndMs = Math.max(0, ...points.map(pt => Number(pt.endTimeNanos) / 1e6));
            // Ignore stale data: the latest night must have ended within the last 36 hours
            if (latestEndMs < now.getTime() - 36 * 60 * 60 * 1000) continue;
            let asleepMs = 0;
            for (const pt of points) {
              const stage = pt.value?.[0]?.intVal;
              const startMs = Number(pt.startTimeNanos) / 1e6;
              const endMs = Number(pt.endTimeNanos) / 1e6;
              if (startMs >= latestEndMs - 20 * 60 * 60 * 1000 && (stage === 2 || stage === 4 || stage === 5 || stage === 6)) {
                asleepMs += endMs - startMs;
              }
            }
            // Use the single source with the most sleep; never sum sources (avoids double counting)
            bestMs = Math.max(bestMs, asleepMs);
          }
          if (bestMs > 0) {
            const h = Math.floor(bestMs / 3600000);
            const m = Math.floor((bestMs % 3600000) / 60000);
            sleepHours = `${h}h ${m}m`;
          }
        }
      } catch (err) {
        console.warn('Sleep segment fallback failed:', err);
      }
    }
    console.info('[wearable] sync result:', { steps, totalKcal: calories, activeMinutes, distanceMeters, heartPoints, spo2, heartRate, sleepHours });

    if (sleepHours !== '—') {
      localStorage.setItem(STORAGE_KEYS.SLEEP, sleepHours);
    } else {
      localStorage.removeItem(STORAGE_KEYS.SLEEP);
    }

    const finalSteps = steps;
    const totalKcal = Math.round(calories);
    const userBmr = Number(localStorage.getItem(STORAGE_KEYS.USER_BMR)) || 0;
    const dayFraction = Math.min(1, (now.getTime() - startOfDay.getTime()) / 86400000);

    // Active calories: total energy minus basal metabolic rate for elapsed portion of the day
    let finalKcal = userBmr > 0 ? Math.round(totalKcal - userBmr * dayFraction) : 0;

    // Sports physiology fallback: if BMR subtraction produces <= 0 but the user actually walked/exercised,
    // compute realistic active movement expenditure (~0.036 kcal/step + 1.8 kcal/active min according to METs).
    const physicalMovementBurn = steps > 0
      ? Math.round(steps * 0.036 + (activeMinutes > 0 ? activeMinutes * 1.8 : 0))
      : 0;

    if (finalKcal <= 0 && physicalMovementBurn > 0) {
      finalKcal = physicalMovementBurn;
    } else if (physicalMovementBurn > 0 && finalKcal < Math.round(physicalMovementBurn * 0.6)) {
      finalKcal = Math.max(finalKcal, physicalMovementBurn);
    }

    localStorage.setItem(STORAGE_KEYS.KCAL_TOTAL, String(totalKcal));

    // If Xiaomi Band / Mi Fitness streams were detected across any metric (Sleep, SpO2, HR), attribute to Xiaomi Band
    let deviceName = detectedDevice || 'Google Fit Hub (Đồng bộ trực tiếp)';
    if (detectedWearableFromAnyStream && (!deviceName.toLowerCase().includes('xiaomi') || deviceName.toLowerCase().includes('cảm biến bước chân'))) {
      deviceName = 'Xiaomi Smart Band (Mi Fitness qua Google Fit)';
    }

    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.STEPS, String(finalSteps));
    localStorage.setItem(STORAGE_KEYS.KCAL, String(finalKcal));
    if (heartRate > 0) {
      localStorage.setItem(STORAGE_KEYS.HEART_RATE, String(heartRate));
    } else {
      const stored = localStorage.getItem(STORAGE_KEYS.HEART_RATE);
      if (stored && Number(stored) > 0) {
        heartRate = Number(stored);
      }
    }
    localStorage.setItem(STORAGE_KEYS.ACTIVE_MINUTES, String(Math.round(activeMinutes)));
    localStorage.setItem(STORAGE_KEYS.DISTANCE, String(Math.round(distanceMeters / 10) / 100));
    localStorage.setItem(STORAGE_KEYS.HEART_POINTS, String(heartPoints));
    if (spo2 > 0) {
      localStorage.setItem(STORAGE_KEYS.SPO2, String(spo2));
    } else {
      localStorage.removeItem(STORAGE_KEYS.SPO2);
    }
    localStorage.setItem(STORAGE_KEYS.DEVICE, deviceName);
    localStorage.setItem(STORAGE_KEYS.SOURCE, 'google-fit');
    localStorage.setItem(STORAGE_KEYS.SYNC_TIME, new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    window.dispatchEvent(new Event('wearable_sync_updated'));
    return { steps: finalSteps, calories: finalKcal, heartRate };
  },

  /** Remember the user's BMR so Google Fit total calories can be split into basal vs. active. */
  setUserBmr(bmr: number) {
    if (bmr > 0) {
      localStorage.setItem(STORAGE_KEYS.USER_BMR, String(Math.round(bmr)));
    }
  },

  setManualHeartRate(bpm: number): number {
    if (bpm > 0) {
      const val = Math.round(bpm);
      localStorage.setItem(STORAGE_KEYS.HEART_RATE, String(val));
      localStorage.setItem(STORAGE_KEYS.SYNC_TIME, new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      window.dispatchEvent(new Event('wearable_sync_updated'));
      return val;
    }
    return 0;
  },

  openGoogleFitAuthPopup(): Promise<string> {
    return new Promise((resolve, reject) => {
      const gOauth2 = (window as any)?.google?.accounts?.oauth2;

      // 1. Primary: Use Google Identity Services OAuth2 Token Client (in-place popup flow)
      // This official GIS flow operates via postMessage and does not require an explicit redirect_uri,
      // eliminating the "redirect_uri_mismatch" error.
      if (gOauth2 && typeof gOauth2.initTokenClient === 'function') {
        try {
          const client = gOauth2.initTokenClient({
            client_id: GOOGLE_FIT_CLIENT_ID,
            scope: GOOGLE_FIT_SCOPES,
            callback: (tokenResponse: any) => {
              if (tokenResponse?.error) {
                reject(new Error(tokenResponse.error_description || tokenResponse.error || 'Kết nối tài khoản Google không thành công. Vui lòng thử lại.'));
                return;
              }
              if (tokenResponse?.access_token) {
                localStorage.setItem(STORAGE_KEYS.TOKEN, tokenResponse.access_token);
                resolve(tokenResponse.access_token);
              } else {
                reject(new Error('Chưa thể lấy thông tin xác thực từ Google. Vui lòng thử lại.'));
              }
            },
            error_callback: (err: any) => {
              reject(new Error(err?.message || 'Không thể mở cửa sổ kết nối Google.'));
            }
          });

          client.requestAccessToken({ prompt: 'consent' });
          return;
        } catch (err: any) {
          console.warn('Google Identity Services initTokenClient error, trying fallback:', err);
        }
      }

      // 2. Fallback: window.open with current origin as redirect_uri
      const redirectUri = window.location.origin;
      const scope = GOOGLE_FIT_SCOPES;
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_FIT_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}&prompt=consent`;

      const authWindow = window.open(authUrl, 'GoogleFitOAuth', 'width=560,height=680');
      if (!authWindow) {
        reject(new Error('Trình duyệt đang chặn cửa sổ liên kết (popup). Vui lòng cho phép popup để kết nối Google Fit.'));
        return;
      }

      const timer = setInterval(() => {
        try {
          if (!authWindow || authWindow.closed) {
            clearInterval(timer);
            const saved = localStorage.getItem(STORAGE_KEYS.TOKEN);
            if (saved) {
              resolve(saved);
            } else {
              reject(new Error('Cửa sổ kết nối đã đóng trước khi hoàn tất.'));
            }
            return;
          }

          if (authWindow.location && authWindow.location.href.includes('access_token=')) {
            const hash = authWindow.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const token = params.get('access_token');
            if (token) {
              localStorage.setItem(STORAGE_KEYS.TOKEN, token);
              authWindow.close();
              clearInterval(timer);
              resolve(token);
            }
          }
        } catch {
          // Cross-origin restriction while on Google accounts domain is normal
        }
      }, 600);
    });
  }
};
