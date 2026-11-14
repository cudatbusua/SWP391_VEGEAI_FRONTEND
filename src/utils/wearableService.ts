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
  /** Calo vận động được tính cho ngân sách hôm nay (0 nếu dữ liệu chỉ là lịch sử ngày trước) */
  todayActiveCalories: number;
  /** true nếu dữ liệu vận động thuộc ngày hôm nay (hoặc kịch bản mô phỏng) */
  isTodayData: boolean;
  activeMinutes: number;
  avgHeartRate: number;
  /** Ghi chú chi tiết về nhịp tim (ví dụ: TB hôm nay, thời gian đo, hoặc nhập tay) */
  heartRateNote?: string;
  heartRateSource?: 'google-fit' | 'google-fit-resting' | 'manual' | 'simulator' | 'none';
  /** Quãng đường hôm nay (km), 0 nếu chưa có dữ liệu */
  distanceKm: number;
  /** Tổng năng lượng tiêu hao Google Fit ghi nhận (đã gồm trao đổi chất cơ bản), 0 nếu chưa có */
  totalCaloriesExpended: number;
  /** Điểm vận động tim mạch (Heart Points) của Google Fit, 0 nếu chưa có */
  heartPoints: number;
  /** Độ bão hòa oxy SpO2 (%), 0 nếu chưa có dữ liệu */
  spo2: number;
  sleepHours: string;
  /** Nhãn ngày ghi nhận dữ liệu (ví dụ: "Hôm nay" hoặc "Gần nhất: 03/11") */
  dataDateLabel?: string;
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
  HEART_RATE_NOTE: 'wearable_heart_rate_note',
  HEART_RATE_SOURCE: 'wearable_heart_rate_source',
  ACTIVE_MINUTES: 'wearable_active_minutes',
  SLEEP: 'wearable_sleep',
  KCAL_TOTAL: 'wearable_kcal_total',
  USER_BMR: 'wearable_user_bmr',
  DISTANCE: 'wearable_distance_km',
  HEART_POINTS: 'wearable_heart_points',
  SPO2: 'wearable_spo2',
  DATA_DATE: 'wearable_data_date',
  IS_TODAY: 'wearable_is_today',
  SYNC_DATE_KEY: 'wearable_sync_date_key',
  LAST_SYNC_MS: 'wearable_last_sync_ms',
  SOURCE: 'wearable_source',
  SYNC_TIME: 'wearable_last_synced',
  PRESET: 'wearable_preset',
  DEVICE: 'wearable_device'
};

const LOOKBACK_DAYS = 7;
const AUTO_SYNC_COOLDOWN_MS = 5 * 60 * 1000;
let inFlightSync: Promise<{ steps: number; calories: number; heartRate: number }> | null = null;

function formatLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTimeHHMM(ms: number): string {
  return new Date(ms).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatDayLabel(ms: number, now: Date): string {
  const d = new Date(ms);
  return formatLocalDateKey(d) === formatLocalDateKey(now)
    ? 'hôm nay'
    : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

interface HeartRateSummary {
  bpm: number;
  note: string;
  source: 'google-fit' | 'google-fit-resting';
}

/**
 * Aggregate raw Google Fit heart rate samples by local calendar day and return
 * the daily average on the most recent day with valid samples (30–220 bpm),
 * accompanied by a transparent timestamp/sample-count note.
 */
function summarizeHeartRatePoints(points: any[], now: Date): HeartRateSummary | null {
  const byDay: Record<string, { sum: number; count: number; latestEndMs: number }> = {};
  for (const pt of points) {
    const bpm = pt.value?.[0]?.fpVal || pt.value?.[0]?.intVal || 0;
    if (bpm < 30 || bpm > 220) continue;
    const endMs = Number(pt.endTimeNanos || pt.startTimeNanos || 0) / 1e6;
    if (endMs <= 0) continue;
    const key = formatLocalDateKey(new Date(endMs));
    if (!byDay[key]) {
      byDay[key] = { sum: 0, count: 0, latestEndMs: endMs };
    }
    byDay[key].sum += bpm;
    byDay[key].count += 1;
    byDay[key].latestEndMs = Math.max(byDay[key].latestEndMs, endMs);
  }
  const latest = Object.values(byDay).sort((a, b) => b.latestEndMs - a.latestEndMs)[0];
  if (!latest || latest.count === 0) return null;

  const avgBpm = Math.round(latest.sum / latest.count);
  const dayLabel = formatDayLabel(latest.latestEndMs, now);
  const timeStr = formatTimeHHMM(latest.latestEndMs);
  const note = latest.count > 1
    ? `TB ${dayLabel} · cập nhật ${timeStr} (${latest.count} mẫu)`
    : `Đo lúc ${timeStr} ${dayLabel} (1 mẫu)`;
  return { bpm: avgBpm, note, source: 'google-fit' };
}

const RECOVERY_SNACK_SUGGESTIONS = {
  light: 'Nước ép cần tây dưa leo hạt chia (85 kcal)',
  moderate: 'Sinh tố bơ chuối sữa hạt sen (195 kcal · 7g protein)',
  intense: 'Bát yến mạch ngâm sữa đậu nành & hạt óc chó (280 kcal · 12g protein)'
};

export const wearableService = {
  getStoredToken(): string {
    return localStorage.getItem(STORAGE_KEYS.TOKEN) || '';
  },

  shouldAutoSync(cooldownMs: number = AUTO_SYNC_COOLDOWN_MS): boolean {
    if (!this.getStoredToken()) return false;
    const lastMs = Number(localStorage.getItem(STORAGE_KEYS.LAST_SYNC_MS) || 0);
    return !lastMs || Date.now() - lastMs >= cooldownMs;
  },

  getMetrics(): WearableMetrics {
    const token = this.getStoredToken();
    const storedSource = localStorage.getItem(STORAGE_KEYS.SOURCE);
    const isStaleSimulator = storedSource === 'simulator' || Boolean(localStorage.getItem(STORAGE_KEYS.PRESET));
    const storedSteps = isStaleSimulator ? null : localStorage.getItem(STORAGE_KEYS.STEPS);
    const storedKcal = isStaleSimulator ? null : localStorage.getItem(STORAGE_KEYS.KCAL);
    const storedHeartRate = isStaleSimulator ? null : localStorage.getItem(STORAGE_KEYS.HEART_RATE);
    const storedHeartRateNote = isStaleSimulator ? undefined : (localStorage.getItem(STORAGE_KEYS.HEART_RATE_NOTE) || undefined);
    const storedHeartRateSource = isStaleSimulator
      ? undefined
      : ((localStorage.getItem(STORAGE_KEYS.HEART_RATE_SOURCE) as WearableMetrics['heartRateSource']) || undefined);
    const storedActiveMinutes = isStaleSimulator ? null : localStorage.getItem(STORAGE_KEYS.ACTIVE_MINUTES);
    const storedSleep = isStaleSimulator ? null : localStorage.getItem(STORAGE_KEYS.SLEEP);
    const storedDataDate = isStaleSimulator ? undefined : (localStorage.getItem(STORAGE_KEYS.DATA_DATE) || undefined);
    const storedIsToday = isStaleSimulator ? null : localStorage.getItem(STORAGE_KEYS.IS_TODAY);
    const storedSyncDateKey = isStaleSimulator ? null : localStorage.getItem(STORAGE_KEYS.SYNC_DATE_KEY);
    const storedSync = isStaleSimulator ? null : localStorage.getItem(STORAGE_KEYS.SYNC_TIME);
    const storedDevice = isStaleSimulator ? null : localStorage.getItem(STORAGE_KEYS.DEVICE);

    const hasManualHeartRate = Boolean(storedHeartRate && Number(storedHeartRate) > 0);

    // Clean empty state if not linked to Google Fit and no real/manual metrics stored
    if (!token && !storedSteps && !hasManualHeartRate) {
      return {
        steps: 0,
        stepTarget: 10000,
        activeCalories: 0,
        todayActiveCalories: 0,
        isTodayData: false,
        activeMinutes: 0,
        avgHeartRate: 0,
        heartRateNote: undefined,
        heartRateSource: 'none',
        distanceKm: 0,
        totalCaloriesExpended: 0,
        heartPoints: 0,
        spo2: 0,
        sleepHours: '—',
        dataDateLabel: undefined,
        source: 'none',
        lastSyncedAt: 'Chưa liên kết thiết bị',
        isConnected: false,
        deviceModel: 'Chưa kết nối',
        aiAdvice: 'Bạn chưa liên kết Google Fit hoặc thiết bị đeo. Hãy bấm "Liên kết Google Fit" để VEGEAI đồng bộ chỉ số vận động thực tế và tự động cân đối năng lượng.',
        recommendedSnack: 'Chưa có dữ liệu vận động'
      };
    }

    const steps = storedSteps !== null ? Number(storedSteps) : 0;
    const activeCalories = storedKcal !== null ? Number(storedKcal) : 0;
    const avgHeartRate = storedHeartRate !== null ? Number(storedHeartRate) : 0;
    const activeMinutes = storedActiveMinutes !== null ? Number(storedActiveMinutes) : 0;
    const distanceKm = isStaleSimulator ? 0 : (Number(localStorage.getItem(STORAGE_KEYS.DISTANCE)) || (steps > 0 ? Math.round((steps * 0.72) / 10) / 100 : 0));
    const totalCaloriesExpended = isStaleSimulator ? 0 : (Number(localStorage.getItem(STORAGE_KEYS.KCAL_TOTAL)) || 0);
    const heartPoints = isStaleSimulator ? 0 : (Number(localStorage.getItem(STORAGE_KEYS.HEART_POINTS)) || 0);
    const spo2 = isStaleSimulator ? 0 : (Number(localStorage.getItem(STORAGE_KEYS.SPO2)) || 0);

    const todayKey = formatLocalDateKey(new Date());
    const isTodayData = (storedIsToday === 'true' && (!storedSyncDateKey || storedSyncDateKey === todayKey)) || (storedIsToday === null && storedDataDate === 'Hôm nay');
    const todayActiveCalories = isTodayData ? activeCalories : 0;

    let adviceText = '';
    if (steps > 0) {
      const activeStr = activeCalories > 0 ? `+${activeCalories.toLocaleString('vi-VN')} kcal vận động` : '';
      const totalStr = totalCaloriesExpended > 0 ? ` (tổng tiêu hao ${totalCaloriesExpended.toLocaleString('vi-VN')} kcal)` : '';
      const dateStr = !isTodayData && storedDataDate ? ` [${storedDataDate}]` : '';
      adviceText = isTodayData
        ? `Đã đồng bộ thực tế từ ${storedDevice || 'Google Fit'}: ${steps.toLocaleString('vi-VN')} bước chân${activeStr ? ', ' + activeStr : ''}${totalStr}. Hệ thống AI đã tự động điều chỉnh ngân sách năng lượng và gợi ý bữa phụ phù hợp.`
        : `Hiển thị dữ liệu gần nhất từ ${storedDevice || 'Google Fit'}${dateStr}: ${steps.toLocaleString('vi-VN')} bước chân${activeStr ? ', ' + activeStr : ''}. Hôm nay chưa có đồng bộ mới nên calo ngày cũ không cộng vào ngân sách hôm nay.`;
    } else if (token) {
      adviceText = `Đã liên kết Google Fit (${storedDevice || 'Thiết bị đeo'}). Hôm nay trên Google Fit Cloud chưa ghi nhận bước chân mới từ điện thoại/vòng đeo. Hãy mở ứng dụng sức khỏe trên điện thoại (Google Fit, Apple Health, Samsung Health, Mi Fitness, Huawei Health...) để đẩy dữ liệu lên đám mây rồi nhấn "Đồng bộ lại".`;
    } else {
      adviceText = 'Bạn chưa liên kết Google Fit hoặc thiết bị đeo. Hãy bấm "Liên kết Google Fit" ở trên để kết nối theo dõi sức khỏe.';
    }

    return {
      steps,
      stepTarget: 10000,
      activeCalories,
      todayActiveCalories,
      isTodayData,
      activeMinutes,
      avgHeartRate,
      heartRateNote: avgHeartRate > 0 ? (storedHeartRateNote || 'Giá trị gần nhất (đồng bộ hoặc nhập tay)') : undefined,
      heartRateSource: avgHeartRate > 0 ? (storedHeartRateSource || 'google-fit') : 'none',
      distanceKm,
      totalCaloriesExpended,
      heartPoints,
      spo2,
      sleepHours: storedSleep || '—',
      dataDateLabel: storedDataDate,
      source: (!isStaleSimulator && (storedSource as any)) || (token ? 'google-fit' : 'none'),
      lastSyncedAt: storedSync || (token ? 'Đã liên kết tài khoản' : 'Chưa đồng bộ'),
      isConnected: Boolean(token),
      deviceModel: token
        ? (storedDevice || 'Thiết bị đồng bộ qua Google Fit')
        : 'Chưa kết nối thiết bị',
      aiAdvice: adviceText,
      recommendedSnack: steps > 11000
        ? RECOVERY_SNACK_SUGGESTIONS.intense
        : steps > 6000
        ? RECOVERY_SNACK_SUGGESTIONS.moderate
        : steps > 0
        ? RECOVERY_SNACK_SUGGESTIONS.light
        : 'Rau củ quả tươi giàu vitamin & khoáng chất'
    };
  },

  disconnect() {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.STEPS);
    localStorage.removeItem(STORAGE_KEYS.KCAL);
    localStorage.removeItem(STORAGE_KEYS.HEART_RATE);
    localStorage.removeItem(STORAGE_KEYS.HEART_RATE_NOTE);
    localStorage.removeItem(STORAGE_KEYS.HEART_RATE_SOURCE);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_MINUTES);
    localStorage.removeItem(STORAGE_KEYS.SLEEP);
    localStorage.removeItem(STORAGE_KEYS.DISTANCE);
    localStorage.removeItem(STORAGE_KEYS.HEART_POINTS);
    localStorage.removeItem(STORAGE_KEYS.SPO2);
    localStorage.removeItem(STORAGE_KEYS.KCAL_TOTAL);
    localStorage.removeItem(STORAGE_KEYS.DATA_DATE);
    localStorage.removeItem(STORAGE_KEYS.IS_TODAY);
    localStorage.removeItem(STORAGE_KEYS.SYNC_DATE_KEY);
    localStorage.removeItem(STORAGE_KEYS.LAST_SYNC_MS);
    localStorage.removeItem(STORAGE_KEYS.PRESET);
    localStorage.removeItem(STORAGE_KEYS.SOURCE);
    localStorage.removeItem(STORAGE_KEYS.SYNC_TIME);
    localStorage.removeItem(STORAGE_KEYS.DEVICE);
    window.dispatchEvent(new Event('wearable_sync_updated'));
  },

  fetchGoogleFitLive(token: string): Promise<{ steps: number; calories: number; heartRate: number }> {
    if (inFlightSync) {
      return inFlightSync;
    }
    inFlightSync = this._performGoogleFitSync(token).finally(() => {
      inFlightSync = null;
    });
    return inFlightSync;
  },

  async _performGoogleFitSync(token: string): Promise<{ steps: number; calories: number; heartRate: number }> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const startTimeMillis = startOfDay.getTime();
    const endTimeMillis = now.getTime();
    const lookbackDays = LOOKBACK_DAYS;
    const lookbackStartMillis = startTimeMillis - lookbackDays * 86400000;

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
        return 'Xiaomi Smart Band (Mi Fitness qua Google Fit)';
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

    const extractBucketSummary = (bucket: any) => {
      const deviceGroups: Record<string, DeviceGroup> = {};
      if (bucket?.dataset) {
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

      const groupsList = Object.values(deviceGroups);
      const wearableGroup = groupsList
        .filter(g => g.isWearable && g.steps > 0)
        .sort((a, b) => b.steps - a.steps)[0];
      const phoneGroup = groupsList
        .filter(g => !g.isWearable && g.steps > 0)
        .sort((a, b) => b.steps - a.steps)[0];

      const chosenGroup: DeviceGroup = wearableGroup || phoneGroup || groupsList[0] || {
        packageKey: 'none',
        isWearable: false,
        steps: 0,
        calories: 0,
        activeMinutes: 0,
        distanceMeters: 0,
        heartPoints: 0,
        label: 'Google Fit Hub'
      };

      let bSteps = chosenGroup.steps;
      let bCalories = chosenGroup.calories;
      let bActiveMinutes = chosenGroup.activeMinutes;
      const bDetectedDevice = chosenGroup.label;
      const bHasWearable = groupsList.some(g => g.isWearable);

      if (bCalories === 0) {
        const withKcal = groupsList.find(g => g.calories > 0);
        if (withKcal) bCalories = withKcal.calories;
      }
      if (bActiveMinutes === 0) {
        const withActive = groupsList.find(g => g.activeMinutes > 0);
        if (withActive) bActiveMinutes = withActive.activeMinutes;
      }

      const bDistanceMeters = Math.max(0, ...groupsList.map(g => g.distanceMeters));
      const bHeartPoints = Math.round(Math.max(0, ...groupsList.map(g => g.heartPoints)));

      return {
        steps: bSteps,
        calories: bCalories,
        activeMinutes: bActiveMinutes,
        distanceMeters: bDistanceMeters,
        heartPoints: bHeartPoints,
        detectedDevice: bDetectedDevice,
        hasWearable: bHasWearable,
        startTimeMillis: Number(bucket?.startTimeMillis || startTimeMillis)
      };
    };

    const queryAggregateBuckets = async (startMs: number, endMs: number) => {
      const fullTypes = [
        { dataTypeName: 'com.google.step_count.delta' },
        { dataTypeName: 'com.google.calories.expended' },
        { dataTypeName: 'com.google.active_minutes' },
        { dataTypeName: 'com.google.distance.delta' },
        { dataTypeName: 'com.google.heart_minutes' }
      ];
      const coreTypes = [
        { dataTypeName: 'com.google.step_count.delta' },
        { dataTypeName: 'com.google.calories.expended' },
        { dataTypeName: 'com.google.active_minutes' }
      ];

      let res = await fetch('https://fitness.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          aggregateBy: fullTypes,
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: startMs,
          endTimeMillis: endMs
        })
      });

      if (res.status === 401) {
        this.disconnect();
        throw new Error('Phiên kết nối Google Fit đã hết hạn. Vui lòng liên kết lại.');
      }

      // Fallback if optional location/heart_minutes scope or datasource caused 400/403
      if (!res.ok) {
        res = await fetch('https://fitness.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            aggregateBy: coreTypes,
            bucketByTime: { durationMillis: 86400000 },
            startTimeMillis: startMs,
            endTimeMillis: endMs
          })
        });
        if (res.status === 401) {
          this.disconnect();
          throw new Error('Phiên kết nối Google Fit đã hết hạn. Vui lòng liên kết lại.');
        }
        if (!res.ok) {
          throw new Error('Không thể đồng bộ dữ liệu lúc này. Vui lòng thử lại sau.');
        }
      }

      const json = await res.json();
      return (json.bucket || []) as any[];
    };

    // 1. Query today's activity first (00:00:00 -> now)
    const todayBuckets = await queryAggregateBuckets(startTimeMillis, endTimeMillis);
    let chosenSummary = todayBuckets.length > 0
      ? extractBucketSummary(todayBuckets[todayBuckets.length - 1])
      : {
          steps: 0,
          calories: 0,
          activeMinutes: 0,
          distanceMeters: 0,
          heartPoints: 0,
          detectedDevice: 'Google Fit Hub',
          hasWearable: false,
          startTimeMillis
        };
    let isFromToday = true;
    let dataDateLabel = 'Hôm nay';

    // 1b. If today has 0 steps (e.g. early morning before phone/band synced to Google Fit Cloud),
    // automatically look back over the last 30 days to find the most recent active day!
    if (chosenSummary.steps === 0) {
      try {
        const historyBuckets = await queryAggregateBuckets(lookbackStartMillis, startTimeMillis);
        for (let i = historyBuckets.length - 1; i >= 0; i--) {
          const summary = extractBucketSummary(historyBuckets[i]);
          if (summary.steps > 0) {
            chosenSummary = summary;
            isFromToday = false;
            const d = new Date(summary.startTimeMillis);
            dataDateLabel = `Gần nhất: ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
            break;
          } else if (summary.hasWearable) {
            chosenSummary.hasWearable = true;
          }
        }
      } catch (err) {
        console.warn('30-day history lookback fallback:', err);
      }
    }

    let steps = chosenSummary.steps;
    let calories = chosenSummary.calories;
    let activeMinutes = chosenSummary.activeMinutes;
    let distanceMeters = chosenSummary.distanceMeters;
    let heartPoints = chosenSummary.heartPoints;
    let detectedDevice = chosenSummary.detectedDevice;
    let detectedWearableLabel = chosenSummary.hasWearable ? chosenSummary.detectedDevice : '';

    // 1c. Raw dataSources fallback for steps if aggregate returned 0
    if (steps === 0) {
      try {
        const stepDsRes = await fetch('https://fitness.googleapis.com/fitness/v1/users/me/dataSources?dataTypeName=com.google.step_count.delta', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (stepDsRes.ok) {
          const stepDsJson = await stepDsRes.json();
          const winStartNanos = BigInt(lookbackStartMillis) * 1000000n;
          const winEndNanos = BigInt(endTimeMillis) * 1000000n;
          for (const ds of stepDsJson.dataSource || []) {
            const streamId: string = ds.dataStreamId || '';
            if (!streamId) continue;
            if (isWearableStream(streamId)) {
              detectedWearableLabel = detectedWearableLabel || formatDeviceLabel(streamId);
            }
            const dsUrl = `https://fitness.googleapis.com/fitness/v1/users/me/dataSources/${encodeURIComponent(streamId)}/datasets/${winStartNanos}-${winEndNanos}`;
            const dsRes = await fetch(dsUrl, { headers: { Authorization: `Bearer ${token}` } });
            if (dsRes.ok) {
              const dsJson = await dsRes.json();
              const byDay: Record<string, { steps: number; ts: number }> = {};
              for (const pt of dsJson.point || []) {
                const val = pt.value?.[0]?.intVal || 0;
                const endMs = Number(pt.endTimeNanos || 0) / 1e6;
                if (val > 0 && endMs > 0) {
                  const d = new Date(endMs);
                  const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                  if (!byDay[key]) byDay[key] = { steps: 0, ts: endMs };
                  byDay[key].steps += val;
                  byDay[key].ts = Math.max(byDay[key].ts, endMs);
                }
              }
              const latestDay = Object.values(byDay).sort((a, b) => b.ts - a.ts)[0];
              if (latestDay && latestDay.steps > steps) {
                steps = latestDay.steps;
                const d = new Date(latestDay.ts);
                const isTodayPt = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
                isFromToday = isTodayPt;
                dataDateLabel = isTodayPt ? 'Hôm nay' : `Gần nhất: ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
                if (isWearableStream(streamId)) {
                  detectedDevice = formatDeviceLabel(streamId);
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('Step raw dataSources fallback failed:', err);
      }
    }

    // Heart Points fallback: check Google's merged heart_minutes stream over active window / 30 days
    if (heartPoints === 0) {
      try {
        const hpRes = await fetch('https://fitness.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aggregateBy: [{ dataSourceId: 'derived:com.google.heart_minutes:com.google.android.gms:merge_heart_minutes' }],
            bucketByTime: { durationMillis: 86400000 },
            startTimeMillis: lookbackStartMillis,
            endTimeMillis
          })
        });
        if (hpRes.ok) {
          const hpJson = await hpRes.json();
          const buckets = hpJson.bucket || [];
          for (let i = buckets.length - 1; i >= 0; i--) {
            let dayPts = 0;
            for (const ds of buckets[i].dataset || []) {
              for (const pt of ds.point || []) {
                dayPts += pt.value?.[0]?.fpVal || pt.value?.[0]?.intVal || 0;
              }
            }
            if (dayPts > 0) {
              heartPoints = Math.round(dayPts);
              break;
            }
          }
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
            const dsUrl = `https://fitness.googleapis.com/fitness/v1/users/me/dataSources/${encodeURIComponent(ds.dataStreamId)}/datasets/${BigInt(lookbackStartMillis) * 1000000n}-${BigInt(endTimeMillis + 600000) * 1000000n}`;
            const dsRes = await fetch(dsUrl, { headers: { Authorization: `Bearer ${token}` } });
            if (dsRes.ok) {
              const dsJson = await dsRes.json();
              const byDay: Record<string, { pts: number; ts: number }> = {};
              for (const pt of dsJson.point || []) {
                const val = pt.value?.[0]?.fpVal || pt.value?.[0]?.intVal || 0;
                const endMs = Number(pt.endTimeNanos || 0) / 1e6;
                if (val > 0 && endMs > 0) {
                  const d = new Date(endMs);
                  const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                  if (!byDay[key]) byDay[key] = { pts: 0, ts: endMs };
                  byDay[key].pts += val;
                  byDay[key].ts = Math.max(byDay[key].ts, endMs);
                }
              }
              const latestDay = Object.values(byDay).sort((a, b) => b.ts - a.ts)[0];
              if (latestDay && latestDay.pts > 0) {
                heartPoints = Math.max(heartPoints, Math.round(latestDay.pts));
              }
            }
          }
        }
      } catch (err) {
        console.warn('Heart points raw dataSources fallback failed:', err);
      }
    }

    // SpO2 (oxygen saturation): check 30-day aggregate + raw dataSources
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
          startTimeMillis: lookbackStartMillis,
          endTimeMillis: endTimeMillis
        })
      });
      if (spo2Res.ok) {
        const spo2Json = await spo2Res.json();
        for (const b of spo2Json.bucket || []) {
          for (const ds of b.dataset || []) {
            for (const pt of ds.point || []) {
              const pct = pt.value?.[0]?.fpVal || pt.value?.[0]?.intVal || 0;
              if (pct >= 50 && pct <= 100) spo2 = Math.round(pct);
            }
          }
        }
      }
    } catch (err) {
      console.warn('SpO2 aggregate query failed:', err);
    }

    // SpO2 raw dataSources fallback (Mi Fitness / Health Connect raw streams)
    if (spo2 === 0) {
      try {
        const spo2DsRes = await fetch('https://fitness.googleapis.com/fitness/v1/users/me/dataSources?dataTypeName=com.google.oxygen_saturation', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (spo2DsRes.ok) {
          const spo2DsJson = await spo2DsRes.json();
          const winStartNanos = BigInt(lookbackStartMillis) * 1000000n;
          const winEndNanos = BigInt(endTimeMillis + 600000) * 1000000n;
          for (const ds of spo2DsJson.dataSource || []) {
            const streamId: string = ds.dataStreamId || '';
            if (!streamId) continue;
            if (isWearableStream(streamId)) {
              detectedWearableLabel = detectedWearableLabel || formatDeviceLabel(streamId);
            }
            const rawRes = await fetch(
              `https://fitness.googleapis.com/fitness/v1/users/me/dataSources/${encodeURIComponent(streamId)}/datasets/${winStartNanos}-${winEndNanos}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (rawRes.ok) {
              const rawJson = await rawRes.json();
              for (const pt of rawJson.point || []) {
                const pct = pt.value?.[0]?.fpVal || pt.value?.[0]?.intVal || 0;
                if (pct >= 50 && pct <= 100) {
                  spo2 = Math.round(pct);
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('SpO2 raw dataSources fallback failed:', err);
      }
    }

    // 2. SMART MULTI-TIER HEART RATE INGESTION ENGINE (7-day window, daily average on latest active day)
    let heartRate = 0;
    let heartRateNote = '';
    let heartRateSource: 'google-fit' | 'google-fit-resting' = 'google-fit';
    let heartRateScopeMissing = false;

    const hrStartNanos = BigInt(lookbackStartMillis) * 1000000n;
    const hrEndNanos = BigInt(now.getTime() + 10 * 60 * 1000) * 1000000n;

    // Tier 1: Check merged stream
    try {
      const mergedStreamUrl = `https://fitness.googleapis.com/fitness/v1/users/me/dataSources/derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_bpm/datasets/${hrStartNanos}-${hrEndNanos}`;
      const streamRes = await fetch(mergedStreamUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (streamRes.status === 403) {
        heartRateScopeMissing = true;
      } else if (streamRes.ok) {
        const streamData = await streamRes.json();
        const summary = streamData.point?.length ? summarizeHeartRatePoints(streamData.point, now) : null;
        if (summary) {
          heartRate = summary.bpm;
          heartRateNote = summary.note;
        }
      }
    } catch (err) {
      console.warn('Tier 1 Merged HR query failed, falling back:', err);
    }

    // Tier 1b: Direct Xiaomi / Wearable dataSources query
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
              if (isWearableStream(streamId)) {
                detectedWearableLabel = detectedWearableLabel || formatDeviceLabel(streamId);
              }
              const rawDsUrl = `https://fitness.googleapis.com/fitness/v1/users/me/dataSources/${encodeURIComponent(streamId)}/datasets/${hrStartNanos}-${hrEndNanos}`;
              const rawRes = await fetch(rawDsUrl, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (rawRes.ok) {
                const rawJson = await rawRes.json();
                const summary = rawJson.point?.length ? summarizeHeartRatePoints(rawJson.point, now) : null;
                if (summary) {
                  heartRate = summary.bpm;
                  heartRateNote = summary.note;
                  if (isWearableStream(streamId)) {
                    detectedDevice = formatDeviceLabel(streamId);
                  }
                  break;
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('Tier 1b Direct dataSources HR query:', err);
      }
    }

    // Tier 2: Aggregate Summary API over lookback window
    if (heartRate === 0 && !heartRateScopeMissing) {
      try {
        const hrRequestBody = {
          aggregateBy: [{ dataTypeName: 'com.google.heart_rate.bpm' }],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: lookbackStartMillis,
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
          const buckets = hrData.bucket || [];
          for (let i = buckets.length - 1; i >= 0 && heartRate === 0; i--) {
            const b = buckets[i];
            for (const ds of b.dataset || []) {
              for (const pt of ds.point || []) {
                if (pt.dataTypeName && pt.dataTypeName.includes('heart_rate')) {
                  const bpm = pt.value?.[0]?.fpVal || pt.value?.[0]?.intVal || 0;
                  if (bpm >= 30 && bpm <= 220) {
                    heartRate = Math.round(bpm);
                    const bStartMs = Number(b.startTimeMillis || 0);
                    heartRateNote = bStartMs > 0
                      ? `TB ${formatDayLabel(bStartMs, now)} (tổng hợp Google Fit)`
                      : 'TB ngày gần nhất (Google Fit)';
                    break;
                  }
                }
              }
              if (heartRate > 0) break;
            }
          }
        }
      } catch (err) {
        console.warn('Tier 2 Aggregate HR query failed:', err);
      }
    }

    // Tier 3: Resting Heart Rate stream
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
            if (bpm >= 30 && bpm <= 220) {
              heartRate = Math.round(bpm);
              heartRateSource = 'google-fit-resting';
              const restEndMs = Number(latestRest.endTimeNanos || latestRest.startTimeNanos || 0) / 1e6;
              heartRateNote = restEndMs > 0
                ? `Nhịp tim nghỉ ngơi · ${formatTimeHHMM(restEndMs)} ${formatDayLabel(restEndMs, now)}`
                : 'Nhịp tim nghỉ ngơi (Google Fit)';
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

    // 3. Query Sleep Sessions & Sleep Segments (30-day lookback so last synced sleep is never lost)
    let sleepHours = '—';
    try {
      const sleepStartIso = new Date(lookbackStartMillis).toISOString();
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
          const sleepSessions = sleepJson.session
            .filter((s: any) =>
              s.activityType === 72 ||
              (s.name && s.name.toLowerCase().includes('sleep')) ||
              (s.description && s.description.toLowerCase().includes('sleep'))
            )
            .sort((a: any, b: any) => Number(a.endTimeMillis) - Number(b.endTimeMillis));
          if (sleepSessions.length > 0) {
            const latest = sleepSessions[sleepSessions.length - 1];
            const startMs = Number(latest.startTimeMillis);
            const endMs = Number(latest.endTimeMillis);
            if (endMs > startMs) {
              const diffMs = endMs - startMs;
              const h = Math.floor(diffMs / (1000 * 60 * 60));
              const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
              if (h > 0 || m >= 30) {
                sleepHours = `${h}h ${m}m`;
              }
            }
          }
        }
      }
    } catch {
      // Ignored if sessions query fails
    }

    // Fallback: Read raw sleep segments (stage 2 = sleep, 4 = light, 5 = deep, 6 = REM) over the last 30 days
    // and compute the duration of the most recent recorded night.
    if (sleepHours === '—') {
      try {
        const segStartNanos = BigInt(lookbackStartMillis) * 1000000n;
        const segEndNanos = BigInt(now.getTime()) * 1000000n;
        const dsRes = await fetch('https://fitness.googleapis.com/fitness/v1/users/me/dataSources?dataTypeName=com.google.sleep.segment', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (dsRes.ok) {
          const dsJson = await dsRes.json();
          let bestMs = 0;
          let latestNightEnd = 0;
          for (const ds of dsJson.dataSource || []) {
            if (!ds.dataStreamId) continue;
            if (isWearableStream(ds.dataStreamId)) {
              detectedWearableLabel = detectedWearableLabel || formatDeviceLabel(ds.dataStreamId);
            }
            const segRes = await fetch(
              `https://fitness.googleapis.com/fitness/v1/users/me/dataSources/${encodeURIComponent(ds.dataStreamId)}/datasets/${segStartNanos}-${segEndNanos}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!segRes.ok) continue;
            const segJson = await segRes.json();
            const points: any[] = segJson.point || [];
            if (points.length === 0) continue;

            const latestEndMs = Math.max(0, ...points.map(pt => Number(pt.endTimeNanos) / 1e6));
            if (latestEndMs <= 0) continue;

            let asleepMs = 0;
            for (const pt of points) {
              const stage = pt.value?.[0]?.intVal;
              const startMs = Number(pt.startTimeNanos) / 1e6;
              const endMs = Number(pt.endTimeNanos) / 1e6;
              if (startMs >= latestEndMs - 20 * 60 * 60 * 1000 && (stage === 2 || stage === 4 || stage === 5 || stage === 6)) {
                asleepMs += endMs - startMs;
              }
            }
            if (asleepMs > 0 && latestEndMs >= latestNightEnd) {
              latestNightEnd = latestEndMs;
              bestMs = Math.max(bestMs, asleepMs);
            }
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

    // Preserve previously stored sleep if Google Fit returned nothing in this cycle
    if (sleepHours !== '—') {
      localStorage.setItem(STORAGE_KEYS.SLEEP, sleepHours);
    } else {
      const prevSleep = localStorage.getItem(STORAGE_KEYS.SLEEP);
      if (prevSleep && prevSleep !== '—') {
        sleepHours = prevSleep;
      }
    }

    // Preserve previously stored live metrics if Google Fit Cloud returned 0 across the 7-day window
    if (steps === 0 && localStorage.getItem(STORAGE_KEYS.SOURCE) !== 'simulator') {
      const prevSteps = Number(localStorage.getItem(STORAGE_KEYS.STEPS)) || 0;
      if (prevSteps > 0) {
        steps = prevSteps;
        calories = Number(localStorage.getItem(STORAGE_KEYS.KCAL_TOTAL)) || Number(localStorage.getItem(STORAGE_KEYS.KCAL)) || 0;
        activeMinutes = Number(localStorage.getItem(STORAGE_KEYS.ACTIVE_MINUTES)) || 0;
        distanceMeters = (Number(localStorage.getItem(STORAGE_KEYS.DISTANCE)) || 0) * 1000;
        heartPoints = Number(localStorage.getItem(STORAGE_KEYS.HEART_POINTS)) || 0;
        const prevSyncKey = localStorage.getItem(STORAGE_KEYS.SYNC_DATE_KEY);
        const prevIsToday = localStorage.getItem(STORAGE_KEYS.IS_TODAY) === 'true';
        const todayKey = formatLocalDateKey(now);
        isFromToday = prevIsToday && prevSyncKey === todayKey;
        const prevLabel = localStorage.getItem(STORAGE_KEYS.DATA_DATE);
        dataDateLabel = isFromToday
          ? 'Hôm nay'
          : (prevLabel && prevLabel !== 'Hôm nay' ? prevLabel : 'Đã lưu gần nhất');
      } else {
        isFromToday = false;
      }
    } else if (steps === 0) {
      isFromToday = false;
    }

    // Physiological estimations when wearable stream only syncs step counts without GPS distance or active minutes
    if (steps > 0 && activeMinutes === 0) {
      activeMinutes = Math.max(1, Math.round(steps / 110));
    }
    if (steps > 0 && distanceMeters === 0) {
      distanceMeters = Math.round(steps * 0.72);
    }
    if (steps >= 2500 && heartPoints === 0) {
      heartPoints = Math.max(5, Math.round(activeMinutes * 0.6));
    }

    const finalSteps = steps;
    let totalKcal = Math.round(calories);
    const userBmr = Number(localStorage.getItem(STORAGE_KEYS.USER_BMR)) || 0;
    const dayFraction = isFromToday ? Math.min(1, (now.getTime() - startOfDay.getTime()) / 86400000) : 1;

    // Active calories: total energy minus basal metabolic rate for elapsed portion of the day
    let finalKcal = userBmr > 0 && totalKcal > 0 ? Math.round(totalKcal - userBmr * dayFraction) : 0;

    // Sports physiology fallback: compute realistic active movement expenditure (~0.036 kcal/step + 1.8 kcal/active min)
    const physicalMovementBurn = finalSteps > 0
      ? Math.round(finalSteps * 0.036 + (activeMinutes > 0 ? activeMinutes * 1.8 : 0))
      : 0;

    if (finalKcal <= 0 && physicalMovementBurn > 0) {
      finalKcal = physicalMovementBurn;
    } else if (physicalMovementBurn > 0 && finalKcal < Math.round(physicalMovementBurn * 0.6)) {
      finalKcal = Math.max(finalKcal, physicalMovementBurn);
    }

    if (totalKcal === 0 && finalKcal > 0 && userBmr > 0) {
      totalKcal = Math.round(userBmr * dayFraction + finalKcal);
    }

    localStorage.setItem(STORAGE_KEYS.KCAL_TOTAL, String(totalKcal));
    localStorage.setItem(STORAGE_KEYS.DATA_DATE, dataDateLabel);
    localStorage.setItem(STORAGE_KEYS.IS_TODAY, String(isFromToday));
    localStorage.setItem(STORAGE_KEYS.SYNC_DATE_KEY, formatLocalDateKey(now));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC_MS, String(Date.now()));

    // Upgrade generic hub/phone label when a specific wearable stream was detected across Sleep, SpO2, or HR
    let deviceName = detectedDevice || 'Google Fit Hub (Đồng bộ trực tiếp)';
    const dLower = deviceName.toLowerCase();
    const isGenericDevice =
      dLower.includes('google fit') ||
      dLower.includes('cảm biến bước chân') ||
      dLower.includes('thiết bị đeo thông minh');
    if (detectedWearableLabel && isGenericDevice) {
      deviceName = detectedWearableLabel;
    }

    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.STEPS, String(finalSteps));
    localStorage.setItem(STORAGE_KEYS.KCAL, String(finalKcal));
    if (heartRate > 0) {
      localStorage.setItem(STORAGE_KEYS.HEART_RATE, String(heartRate));
      localStorage.setItem(STORAGE_KEYS.HEART_RATE_NOTE, heartRateNote || 'TB gần nhất (Google Fit)');
      localStorage.setItem(STORAGE_KEYS.HEART_RATE_SOURCE, heartRateSource);
    } else {
      const prevHrSource = localStorage.getItem(STORAGE_KEYS.HEART_RATE_SOURCE);
      const stored = localStorage.getItem(STORAGE_KEYS.HEART_RATE);
      if (prevHrSource === 'manual' && stored && Number(stored) > 0) {
        heartRate = Number(stored);
      } else {
        localStorage.removeItem(STORAGE_KEYS.HEART_RATE);
        localStorage.removeItem(STORAGE_KEYS.HEART_RATE_NOTE);
        localStorage.removeItem(STORAGE_KEYS.HEART_RATE_SOURCE);
      }
    }
    localStorage.setItem(STORAGE_KEYS.ACTIVE_MINUTES, String(Math.round(activeMinutes)));
    localStorage.setItem(STORAGE_KEYS.DISTANCE, String(Math.round(distanceMeters / 10) / 100));
    localStorage.setItem(STORAGE_KEYS.HEART_POINTS, String(heartPoints));
    if (spo2 > 0) {
      localStorage.setItem(STORAGE_KEYS.SPO2, String(spo2));
    }
    localStorage.setItem(STORAGE_KEYS.DEVICE, deviceName);
    localStorage.setItem(STORAGE_KEYS.SOURCE, 'google-fit');
    localStorage.removeItem(STORAGE_KEYS.PRESET);
    localStorage.setItem(STORAGE_KEYS.SYNC_TIME, new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    console.info('[wearable] sync result:', {
      steps: finalSteps,
      activeKcal: finalKcal,
      todayActiveKcal: isFromToday ? finalKcal : 0,
      isFromToday,
      totalKcal,
      activeMinutes,
      distanceMeters,
      heartPoints,
      spo2,
      heartRate,
      heartRateNote,
      sleepHours,
      dataDateLabel
    });

    window.dispatchEvent(new Event('wearable_sync_updated'));
    return { steps: finalSteps, calories: isFromToday ? finalKcal : 0, heartRate };
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
      const now = new Date();
      const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      localStorage.setItem(STORAGE_KEYS.HEART_RATE, String(val));
      localStorage.setItem(STORAGE_KEYS.HEART_RATE_NOTE, `Nhập tay lúc ${timeStr} (${dateStr})`);
      localStorage.setItem(STORAGE_KEYS.HEART_RATE_SOURCE, 'manual');
      localStorage.setItem(STORAGE_KEYS.SYNC_TIME, now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      window.dispatchEvent(new Event('wearable_sync_updated'));
      return val;
    }
    return 0;
  },

  openGoogleFitAuthPopup(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (
        (window.location.hostname === 'localhost' && window.location.port !== '5173') ||
        window.location.hostname === '127.0.0.1'
      ) {
        window.location.href = `http://localhost:5173${window.location.pathname}${window.location.search}`;
        reject(new Error('Đang chuyển hướng về cổng chuẩn http://localhost:5173 để xác thực Google OAuth...'));
        return;
      }
      const gOauth2 = (window as any)?.google?.accounts?.oauth2;

      // 1. Primary: Use Google Identity Services OAuth2 Token Client (in-place popup flow)
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
