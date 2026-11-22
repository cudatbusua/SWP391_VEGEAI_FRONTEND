/**
 * VEGEAI Omni-Wearable Health Hub & Google Fit Service
 * Syncs 100% real biometric & activity metrics from Google Fit REST API
 * (phone sensors or wearables bridged via Mi Fitness / Zepp / Apple Health / Health Connect).
 * Zero fabricated/estimated fallback metrics: missing Google Fit metrics are reported honestly as 0 / '—'.
 */

export const GOOGLE_FIT_CLIENT_ID = '164354959561-84vaff9lo56ummq04itrgq642kmjd4qo.apps.googleusercontent.com';

export const GOOGLE_FIT_SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.body.read',
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
  'https://www.googleapis.com/auth/fitness.sleep.read',
  'https://www.googleapis.com/auth/fitness.location.read',
  'https://www.googleapis.com/auth/fitness.oxygen_saturation.read',
].join(' ');

export interface WearableMetrics {
  steps: number;
  stepTarget: number;
  /** Calo vận động ước tách = max(0, totalCaloriesExpended − BMR theo phần ngày đã trôi qua), 0 nếu thiếu BMR hoặc thiếu tổng calo thực */
  activeCalories: number;
  /** Calo vận động được tính cho ngân sách hôm nay (0 nếu dữ liệu chỉ là lịch sử ngày trước) */
  todayActiveCalories: number;
  /** true nếu dữ liệu vận động thuộc ngày hôm nay */
  isTodayData: boolean;
  activeMinutes: number;
  /** Nhịp tim trung bình trong ngày gần nhất có dữ liệu (bpm), 0 nếu chưa có */
  avgHeartRate: number;
  /** Nhịp tim đo gần nhất (bpm) — khớp với giá trị vừa đo trên Mi Band / Google Fit */
  latestHeartRate: number;
  /** Ghi chú chi tiết về nhịp tim (giờ đo mới nhất, TB ngày, số mẫu, hoặc nhập tay) */
  heartRateNote?: string;
  heartRateSource?: 'google-fit' | 'google-fit-resting' | 'manual' | 'none';
  /** Quãng đường thực Google Fit ghi nhận (km), 0 nếu chưa có dữ liệu */
  distanceKm: number;
  /** Tổng năng lượng tiêu hao thực tế từ Google Fit (khớp 1-1 với app Google Fit), 0 nếu chưa có */
  totalCaloriesExpended: number;
  /** Điểm vận động tim mạch (Heart Points) thực tế từ Google Fit, 0 nếu chưa có */
  heartPoints: number;
  /** Độ bão hòa oxy SpO2 mới nhất (%), 0 nếu chưa có dữ liệu */
  spo2: number;
  /** Thời điểm ghi nhận SpO2 mới nhất (VD: "Đo lúc 14:32 hôm nay") */
  spo2Note?: string;
  sleepHours: string;
  /** Nhãn ngày ghi nhận dữ liệu (VD: "Hôm nay" hoặc "Gần nhất: 20/11") */
  dataDateLabel?: string;
  source: 'google-fit' | 'xiaomi-band' | 'none';
  lastSyncedAt: string;
  isConnected: boolean;
  deviceModel: string;
  aiAdvice: string;
  recommendedSnack: string;
}

const STORAGE_KEYS = {
  TOKEN: 'google_fit_access_token',
  TOKEN_EXPIRES_AT: 'google_fit_token_expires_at',
  STEPS: 'wearable_steps',
  KCAL: 'wearable_kcal',
  HEART_RATE: 'wearable_heart_rate',
  LATEST_HEART_RATE: 'wearable_latest_heart_rate',
  HEART_RATE_NOTE: 'wearable_heart_rate_note',
  HEART_RATE_SOURCE: 'wearable_heart_rate_source',
  ACTIVE_MINUTES: 'wearable_active_minutes',
  SLEEP: 'wearable_sleep',
  KCAL_TOTAL: 'wearable_kcal_total',
  USER_BMR: 'wearable_user_bmr',
  DISTANCE: 'wearable_distance_km',
  HEART_POINTS: 'wearable_heart_points',
  SPO2: 'wearable_spo2',
  SPO2_NOTE: 'wearable_spo2_note',
  DATA_DATE: 'wearable_data_date',
  IS_TODAY: 'wearable_is_today',
  SYNC_DATE_KEY: 'wearable_sync_date_key',
  LAST_SYNC_MS: 'wearable_last_sync_ms',
  SOURCE: 'wearable_source',
  SYNC_TIME: 'wearable_last_synced',
  PRESET: 'wearable_preset',
  DEVICE: 'wearable_device',
};

const LOOKBACK_DAYS = 7;
const AUTO_SYNC_COOLDOWN_MS = 30 * 1000;
const CLOCK_SKEW_BUFFER_MS = 5 * 60 * 1000;
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

function normalizeSpo2Percentage(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  const pct = raw <= 1 ? raw * 100 : raw;
  return pct >= 50 && pct <= 100 ? Math.round(pct) : 0;
}

interface HeartRateSummary {
  avgBpm: number;
  latestBpm: number;
  latestEndMs: number;
  note: string;
  source: 'google-fit' | 'google-fit-resting';
}

/**
 * Aggregates raw Google Fit heart rate samples by local calendar day and returns BOTH
 * the strictly latest measurement (matching Mi Band / live reading) and the daily average
 * on the most recent day with valid samples (30–220 bpm).
 */
function summarizeHeartRatePoints(points: any[], now: Date): HeartRateSummary | null {
  const deduped = new Map<string, { bpm: number; endMs: number }>();
  for (const pt of points) {
    const bpm = pt.value?.[0]?.fpVal || pt.value?.[0]?.intVal || 0;
    if (bpm < 30 || bpm > 220) continue;
    const endMs = Number(pt.endTimeNanos || pt.startTimeNanos || 0) / 1e6;
    if (endMs <= 0) continue;
    const dedupeKey = `${Math.round(endMs / 1000)}:${Math.round(bpm)}`;
    if (!deduped.has(dedupeKey)) {
      deduped.set(dedupeKey, { bpm, endMs });
    }
  }

  const byDay: Record<
    string,
    { sum: number; count: number; latestEndMs: number; latestBpm: number }
  > = {};

  for (const sample of deduped.values()) {
    const key = formatLocalDateKey(new Date(sample.endMs));
    if (!byDay[key]) {
      byDay[key] = {
        sum: 0,
        count: 0,
        latestEndMs: sample.endMs,
        latestBpm: Math.round(sample.bpm),
      };
    }
    byDay[key].sum += sample.bpm;
    byDay[key].count += 1;
    if (sample.endMs >= byDay[key].latestEndMs) {
      byDay[key].latestEndMs = sample.endMs;
      byDay[key].latestBpm = Math.round(sample.bpm);
    }
  }

  const latest = Object.values(byDay).sort((a, b) => b.latestEndMs - a.latestEndMs)[0];
  if (!latest || latest.count === 0) return null;

  const avgBpm = Math.round(latest.sum / latest.count);
  const dayLabel = formatDayLabel(latest.latestEndMs, now);
  const timeStr = formatTimeHHMM(latest.latestEndMs);
  const note =
    latest.count > 1
      ? `Mới nhất ${latest.latestBpm} bpm (${timeStr}) · TB ${dayLabel}: ${avgBpm} bpm (${latest.count} mẫu)`
      : `Đo lúc ${timeStr} ${dayLabel} (1 mẫu)`;

  return {
    avgBpm,
    latestBpm: latest.latestBpm,
    latestEndMs: latest.latestEndMs,
    note,
    source: 'google-fit',
  };
}

const RECOVERY_SNACK_SUGGESTIONS = {
  light: 'Nước ép cần tây dưa leo hạt chia (85 kcal)',
  moderate: 'Sinh tố bơ chuối sữa hạt sen (195 kcal · 7g protein)',
  intense: 'Bát yến mạch ngâm sữa đậu nành & hạt óc chó (280 kcal · 12g protein)',
};

export const wearableService = {
  getStoredToken(): string {
    return localStorage.getItem(STORAGE_KEYS.TOKEN) || '';
  },

  isTokenLikelyExpired(): boolean {
    const exp = Number(localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT) || 0);
    return exp > 0 && Date.now() >= exp;
  },

  shouldAutoSync(cooldownMs: number = AUTO_SYNC_COOLDOWN_MS): boolean {
    if (!this.getStoredToken()) return false;
    const lastMs = Number(localStorage.getItem(STORAGE_KEYS.LAST_SYNC_MS) || 0);
    return !lastMs || Date.now() - lastMs >= cooldownMs;
  },

  getMetrics(): WearableMetrics {
    const token = this.getStoredToken();
    const storedSource = localStorage.getItem(STORAGE_KEYS.SOURCE);
    const isStaleSimulator =
      storedSource === 'simulator' || Boolean(localStorage.getItem(STORAGE_KEYS.PRESET));
    const storedSteps = isStaleSimulator ? null : localStorage.getItem(STORAGE_KEYS.STEPS);
    const storedKcal = isStaleSimulator ? null : localStorage.getItem(STORAGE_KEYS.KCAL);
    const storedHeartRate = isStaleSimulator ? null : localStorage.getItem(STORAGE_KEYS.HEART_RATE);
    const storedLatestHeartRate = isStaleSimulator
      ? null
      : localStorage.getItem(STORAGE_KEYS.LATEST_HEART_RATE);
    const storedHeartRateNote = isStaleSimulator
      ? undefined
      : localStorage.getItem(STORAGE_KEYS.HEART_RATE_NOTE) || undefined;
    const storedHeartRateSource = isStaleSimulator
      ? undefined
      : ((localStorage.getItem(STORAGE_KEYS.HEART_RATE_SOURCE) as WearableMetrics['heartRateSource']) ||
        undefined);
    const storedActiveMinutes = isStaleSimulator
      ? null
      : localStorage.getItem(STORAGE_KEYS.ACTIVE_MINUTES);
    const storedSleep = isStaleSimulator ? null : localStorage.getItem(STORAGE_KEYS.SLEEP);
    const storedDataDate = isStaleSimulator
      ? undefined
      : localStorage.getItem(STORAGE_KEYS.DATA_DATE) || undefined;
    const storedIsToday = isStaleSimulator ? null : localStorage.getItem(STORAGE_KEYS.IS_TODAY);
    const storedSyncDateKey = isStaleSimulator
      ? null
      : localStorage.getItem(STORAGE_KEYS.SYNC_DATE_KEY);
    const storedSync = isStaleSimulator ? null : localStorage.getItem(STORAGE_KEYS.SYNC_TIME);
    const storedDevice = isStaleSimulator ? null : localStorage.getItem(STORAGE_KEYS.DEVICE);

    const hasManualHeartRate = Boolean(storedHeartRate && Number(storedHeartRate) > 0);

    if (!token && !storedSteps && !hasManualHeartRate) {
      return {
        steps: 0,
        stepTarget: 10000,
        activeCalories: 0,
        todayActiveCalories: 0,
        isTodayData: false,
        activeMinutes: 0,
        avgHeartRate: 0,
        latestHeartRate: 0,
        heartRateNote: undefined,
        heartRateSource: 'none',
        distanceKm: 0,
        totalCaloriesExpended: 0,
        heartPoints: 0,
        spo2: 0,
        spo2Note: undefined,
        sleepHours: '—',
        dataDateLabel: undefined,
        source: 'none',
        lastSyncedAt: 'Chưa liên kết thiết bị',
        isConnected: false,
        deviceModel: 'Chưa kết nối',
        aiAdvice:
          'Bạn chưa liên kết Google Fit hoặc thiết bị đeo. Hãy bấm "Liên kết Google Fit" để đồng bộ chỉ số vận động thực tế trực tiếp từ Google Fit Cloud.',
        recommendedSnack: 'Chưa có dữ liệu vận động',
      };
    }

    const steps = storedSteps !== null ? Number(storedSteps) : 0;
    const activeCalories = storedKcal !== null ? Number(storedKcal) : 0;
    const avgHeartRate = storedHeartRate !== null ? Number(storedHeartRate) : 0;
    const latestHeartRate =
      storedLatestHeartRate !== null ? Number(storedLatestHeartRate) : avgHeartRate;
    const activeMinutes = storedActiveMinutes !== null ? Number(storedActiveMinutes) : 0;
    const distanceKm = isStaleSimulator ? 0 : Number(localStorage.getItem(STORAGE_KEYS.DISTANCE)) || 0;
    const totalCaloriesExpended = isStaleSimulator
      ? 0
      : Number(localStorage.getItem(STORAGE_KEYS.KCAL_TOTAL)) || 0;
    const heartPoints = isStaleSimulator
      ? 0
      : Number(localStorage.getItem(STORAGE_KEYS.HEART_POINTS)) || 0;
    const spo2 = isStaleSimulator ? 0 : Number(localStorage.getItem(STORAGE_KEYS.SPO2)) || 0;
    const spo2Note = isStaleSimulator
      ? undefined
      : localStorage.getItem(STORAGE_KEYS.SPO2_NOTE) || undefined;

    const todayKey = formatLocalDateKey(new Date());
    const isTodayData =
      (storedIsToday === 'true' && (!storedSyncDateKey || storedSyncDateKey === todayKey)) ||
      (storedIsToday === null && storedDataDate === 'Hôm nay');
    const todayActiveCalories = isTodayData ? activeCalories : 0;

    let adviceText = '';
    if (steps > 0 || totalCaloriesExpended > 0) {
      const activeStr =
        activeCalories > 0 ? `, ước tách +${activeCalories.toLocaleString('vi-VN')} kcal vận động` : '';
      const totalStr =
        totalCaloriesExpended > 0
          ? `, tổng tiêu hao Google Fit ${totalCaloriesExpended.toLocaleString('vi-VN')} kcal`
          : '';
      const dateStr = !isTodayData && storedDataDate ? ` [${storedDataDate}]` : '';
      adviceText = isTodayData
        ? `Đã đồng bộ trực tiếp từ ${storedDevice || 'Google Fit'}: ${steps.toLocaleString('vi-VN')} bước chân${totalStr}${activeStr}.`
        : `Hiển thị dữ liệu gần nhất từ ${storedDevice || 'Google Fit'}${dateStr}: ${steps.toLocaleString('vi-VN')} bước chân${totalStr}. Hôm nay chưa có đồng bộ mới nên calo ngày cũ không cộng vào ngân sách hôm nay.`;
    } else if (token) {
      adviceText = `Đã liên kết Google Fit (${storedDevice || 'Thiết bị đeo'}). Hôm nay trên Google Fit Cloud chưa có dữ liệu bước chân mới. Hãy mở Mi Fitness / Zepp Life và Google Fit trên điện thoại để đồng bộ lên Cloud rồi nhấn "Đồng bộ ngay".`;
    } else {
      adviceText =
        'Bạn chưa liên kết Google Fit hoặc thiết bị đeo. Hãy bấm "Liên kết Google Fit" ở trên để kết nối theo dõi sức khỏe.';
    }

    return {
      steps,
      stepTarget: 10000,
      activeCalories,
      todayActiveCalories,
      isTodayData,
      activeMinutes,
      avgHeartRate,
      latestHeartRate,
      heartRateNote:
        avgHeartRate > 0
          ? storedHeartRateNote || 'Giá trị gần nhất (đồng bộ hoặc nhập tay)'
          : undefined,
      heartRateSource: avgHeartRate > 0 ? storedHeartRateSource || 'google-fit' : 'none',
      distanceKm,
      totalCaloriesExpended,
      heartPoints,
      spo2,
      spo2Note: spo2 > 0 ? spo2Note : undefined,
      sleepHours: storedSleep || '—',
      dataDateLabel: storedDataDate,
      source: (!isStaleSimulator && (storedSource as WearableMetrics['source'])) || (token ? 'google-fit' : 'none'),
      lastSyncedAt: storedSync || (token ? 'Đã liên kết tài khoản' : 'Chưa đồng bộ'),
      isConnected: Boolean(token),
      deviceModel: token ? storedDevice || 'Thiết bị đồng bộ qua Google Fit' : 'Chưa kết nối thiết bị',
      aiAdvice: adviceText,
      recommendedSnack:
        steps > 11000
          ? RECOVERY_SNACK_SUGGESTIONS.intense
          : steps > 6000
          ? RECOVERY_SNACK_SUGGESTIONS.moderate
          : steps > 0
          ? RECOVERY_SNACK_SUGGESTIONS.light
          : 'Rau củ quả tươi giàu vitamin & khoáng chất',
    };
  },

  disconnect() {
    Object.values(STORAGE_KEYS).forEach(key => {
      if (key !== STORAGE_KEYS.USER_BMR) localStorage.removeItem(key);
    });
    localStorage.removeItem('wearable_hr_scope_missing');
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

  async _performGoogleFitSync(
    token: string,
  ): Promise<{ steps: number; calories: number; heartRate: number }> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const startTimeMillis = startOfDay.getTime();
    const endTimeMillis = now.getTime();
    const endWithSkewMillis = endTimeMillis + CLOCK_SKEW_BUFFER_MS;
    const lookbackStartMillis = startTimeMillis - LOOKBACK_DAYS * 86400000;

    const authHeaders = { Authorization: `Bearer ${token}` };
    const jsonHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const isWearableStream = (src: string): boolean => {
      const s = src.toLowerCase();
      if (
        s.includes('estimated_steps') ||
        s.includes('merge_step_deltas') ||
        s.includes('merge_calories') ||
        s.includes('merge_distance') ||
        s.includes('merge_active_minutes') ||
        s.includes('merge_heart_minutes') ||
        s.includes('internal_sensor')
      ) {
        return false;
      }
      return (
        s.includes('xiaomi') ||
        s.includes('mi.health') ||
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
      if (s.includes('xiaomi') || s.includes('mi.health') || s.includes('mi fitness') || s.includes('mi band')) {
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
        return 'Google Fit (Đồng bộ điện thoại / thiết bị)';
      }
      return 'Google Fit Cloud';
    };

    /**
     * Extracts totals directly from Google Fit's merged/deduplicated aggregate bucket so
     * VEGEAI displays the exact same numbers shown in the Google Fit mobile app.
     */
    const extractBucketSummary = (bucket: any) => {
      let bSteps = 0;
      let bCalories = 0;
      let bActiveMinutes = 0;
      let bDistanceMeters = 0;
      let bHeartPoints = 0;
      let wearableLabel = '';
      let fallbackLabel = '';

      if (bucket?.dataset) {
        for (const ds of bucket.dataset) {
          for (const point of ds.point || []) {
            const rawSource = point.originDataSourceId || ds.dataSourceId || '';
            if (rawSource) {
              if (isWearableStream(rawSource) && !wearableLabel) {
                wearableLabel = formatDeviceLabel(rawSource);
              } else if (!fallbackLabel) {
                fallbackLabel = formatDeviceLabel(rawSource);
              }
            }

            if (point.dataTypeName === 'com.google.step_count.delta') {
              bSteps += point.value?.[0]?.intVal || 0;
            } else if (point.dataTypeName === 'com.google.calories.expended') {
              bCalories += point.value?.[0]?.fpVal || 0;
            } else if (point.dataTypeName === 'com.google.active_minutes') {
              bActiveMinutes += point.value?.[0]?.intVal || point.value?.[0]?.fpVal || 0;
            } else if (point.dataTypeName === 'com.google.distance.delta') {
              bDistanceMeters += point.value?.[0]?.fpVal || 0;
            } else if (point.dataTypeName === 'com.google.heart_minutes') {
              bHeartPoints += point.value?.[0]?.fpVal || point.value?.[0]?.intVal || 0;
            }
          }
        }
      }

      return {
        steps: Math.round(bSteps),
        calories: bCalories,
        activeMinutes: Math.round(bActiveMinutes),
        distanceMeters: bDistanceMeters,
        heartPoints: Math.round(bHeartPoints),
        detectedDevice: wearableLabel || fallbackLabel || 'Google Fit Cloud',
        hasWearable: Boolean(wearableLabel),
        startTimeMillis: Number(bucket?.startTimeMillis || startTimeMillis),
      };
    };

    const queryAggregateBuckets = async (
      startMs: number,
      endMs: number,
      singleBucket = false,
    ) => {
      // Official Google Fit app-matching merged streams (prevents double-counting & matches Fit UI 1-to-1)
      const officialMergedTypes = [
        { dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps' },
        { dataSourceId: 'derived:com.google.calories.expended:com.google.android.gms:merge_calories_expended' },
        { dataSourceId: 'derived:com.google.active_minutes:com.google.android.gms:merge_active_minutes' },
        { dataSourceId: 'derived:com.google.distance.delta:com.google.android.gms:merge_distance_delta' },
        { dataSourceId: 'derived:com.google.heart_minutes:com.google.android.gms:merge_heart_minutes' },
      ];
      const fullTypes = [
        { dataTypeName: 'com.google.step_count.delta' },
        { dataTypeName: 'com.google.calories.expended' },
        { dataTypeName: 'com.google.active_minutes' },
        { dataTypeName: 'com.google.distance.delta' },
        { dataTypeName: 'com.google.heart_minutes' },
      ];
      const coreTypes = [
        { dataTypeName: 'com.google.step_count.delta' },
        { dataTypeName: 'com.google.calories.expended' },
        { dataTypeName: 'com.google.active_minutes' },
      ];

      const durationMillis = singleBucket
        ? Math.max(86400000, endMs - startMs)
        : 86400000;

      const postAggregate = async (aggregateBy: any[]) =>
        fetch('https://fitness.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
          method: 'POST',
          cache: 'no-store',
          headers: jsonHeaders,
          body: JSON.stringify({
            aggregateBy,
            bucketByTime: { durationMillis },
            startTimeMillis: startMs,
            endTimeMillis: endMs,
          }),
        });

      for (const candidate of [officialMergedTypes, fullTypes, coreTypes]) {
        const res = await postAggregate(candidate);
        if (res.status === 401) {
          this.disconnect();
          throw new Error('Phiên kết nối Google Fit đã hết hạn. Vui lòng liên kết lại.');
        }
        if (res.ok) {
          const json = await res.json();
          const buckets = (json.bucket || []) as any[];
          // If the first attempt returned empty buckets, still allow fallback only on HTTP error;
          // an OK response with empty buckets simply means 0 activity in that period.
          return buckets;
        }
      }

      throw new Error('Không thể đồng bộ dữ liệu Google Fit lúc này. Vui lòng thử lại sau.');
    };

    // 1. Query today's activity first (local 00:00:00 -> now + clock-skew cushion)
    const todayBuckets = await queryAggregateBuckets(startTimeMillis, endWithSkewMillis, true);
    let chosenSummary =
      todayBuckets.length > 0
        ? extractBucketSummary(todayBuckets[todayBuckets.length - 1])
        : {
            steps: 0,
            calories: 0,
            activeMinutes: 0,
            distanceMeters: 0,
            heartPoints: 0,
            detectedDevice: 'Google Fit Cloud',
            hasWearable: false,
            startTimeMillis,
          };
    let isFromToday = chosenSummary.steps > 0 || chosenSummary.calories > 0;
    let dataDateLabel = 'Hôm nay';

    // 1b. If today has 0 steps, look back over the last 7 days to show the most recent active day (reference only)
    if (chosenSummary.steps === 0) {
      try {
        const historyBuckets = await queryAggregateBuckets(lookbackStartMillis, startTimeMillis, false);
        for (let i = historyBuckets.length - 1; i >= 0; i--) {
          const summary = extractBucketSummary(historyBuckets[i]);
          if (summary.steps > 0) {
            chosenSummary = summary;
            isFromToday = false;
            const d = new Date(summary.startTimeMillis);
            dataDateLabel = `Gần nhất: ${d.toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
            })}`;
            break;
          } else if (summary.hasWearable) {
            chosenSummary.hasWearable = true;
          }
        }
      } catch (err) {
        console.warn('7-day history lookback fallback:', err);
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
        const stepDsRes = await fetch(
          'https://fitness.googleapis.com/fitness/v1/users/me/dataSources?dataTypeName=com.google.step_count.delta',
          { cache: 'no-store', headers: authHeaders },
        );
        if (stepDsRes.ok) {
          const stepDsJson = await stepDsRes.json();
          const winStartNanos = BigInt(lookbackStartMillis) * 1000000n;
          const winEndNanos = BigInt(endWithSkewMillis) * 1000000n;
          for (const ds of stepDsJson.dataSource || []) {
            const streamId: string = ds.dataStreamId || '';
            if (!streamId) continue;
            if (isWearableStream(streamId)) {
              detectedWearableLabel = detectedWearableLabel || formatDeviceLabel(streamId);
            }
            const dsUrl = `https://fitness.googleapis.com/fitness/v1/users/me/dataSources/${encodeURIComponent(
              streamId,
            )}/datasets/${winStartNanos}-${winEndNanos}`;
            const dsRes = await fetch(dsUrl, { cache: 'no-store', headers: authHeaders });
            if (dsRes.ok) {
              const dsJson = await dsRes.json();
              const byDay: Record<string, { steps: number; ts: number }> = {};
              for (const pt of dsJson.point || []) {
                const val = pt.value?.[0]?.intVal || 0;
                const endMs = Number(pt.endTimeNanos || 0) / 1e6;
                if (val > 0 && endMs > 0) {
                  const d = new Date(endMs);
                  const key = formatLocalDateKey(d);
                  if (!byDay[key]) byDay[key] = { steps: 0, ts: endMs };
                  byDay[key].steps += val;
                  byDay[key].ts = Math.max(byDay[key].ts, endMs);
                }
              }
              const latestDay = Object.values(byDay).sort((a, b) => b.ts - a.ts)[0];
              if (latestDay && latestDay.steps > steps) {
                steps = latestDay.steps;
                const d = new Date(latestDay.ts);
                const isTodayPt = formatLocalDateKey(d) === formatLocalDateKey(now);
                isFromToday = isTodayPt;
                dataDateLabel = isTodayPt
                  ? 'Hôm nay'
                  : `Gần nhất: ${d.toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                    })}`;
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

    // 2. SpO2 (Oxygen Saturation): ALWAYS query raw dataSources FIRST + aggregate backup,
    // pick the STRICTLY NEWEST sample by endTimeNanos so rush measurements on Mi Band appear immediately.
    let bestSpo2 = { pct: 0, endMs: 0 };
    const winStartNanos = BigInt(lookbackStartMillis) * 1000000n;
    const winEndNanos = BigInt(endWithSkewMillis) * 1000000n;

    try {
      const spo2DsRes = await fetch(
        'https://fitness.googleapis.com/fitness/v1/users/me/dataSources?dataTypeName=com.google.oxygen_saturation',
        { cache: 'no-store', headers: authHeaders },
      );
      if (spo2DsRes.ok) {
        const spo2DsJson = await spo2DsRes.json();
        for (const ds of spo2DsJson.dataSource || []) {
          const streamId: string = ds.dataStreamId || '';
          if (!streamId) continue;
          if (isWearableStream(streamId)) {
            detectedWearableLabel = detectedWearableLabel || formatDeviceLabel(streamId);
          }
          const rawRes = await fetch(
            `https://fitness.googleapis.com/fitness/v1/users/me/dataSources/${encodeURIComponent(
              streamId,
            )}/datasets/${winStartNanos}-${winEndNanos}`,
            { cache: 'no-store', headers: authHeaders },
          );
          if (rawRes.ok) {
            const rawJson = await rawRes.json();
            for (const pt of rawJson.point || []) {
              const rawVal = pt.value?.[0]?.fpVal || pt.value?.[0]?.intVal || 0;
              const pct = normalizeSpo2Percentage(rawVal);
              const endMs = Number(pt.endTimeNanos || pt.startTimeNanos || 0) / 1e6;
              if (pct > 0 && endMs >= bestSpo2.endMs) {
                bestSpo2 = { pct, endMs };
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('SpO2 raw dataSources query failed:', err);
    }

    // SpO2 aggregate backup (picks newest timestamp if raw returned nothing or aggregate has newer)
    try {
      const spo2Res = await fetch(
        'https://fitness.googleapis.com/fitness/v1/users/me/dataset:aggregate',
        {
          method: 'POST',
          cache: 'no-store',
          headers: jsonHeaders,
          body: JSON.stringify({
            aggregateBy: [{ dataTypeName: 'com.google.oxygen_saturation' }],
            bucketByTime: { durationMillis: 86400000 },
            startTimeMillis: lookbackStartMillis,
            endTimeMillis: endWithSkewMillis,
          }),
        },
      );
      if (spo2Res.ok) {
        const spo2Json = await spo2Res.json();
        for (const b of spo2Json.bucket || []) {
          for (const ds of b.dataset || []) {
            for (const pt of ds.point || []) {
              const rawVal = pt.value?.[0]?.fpVal || pt.value?.[0]?.intVal || 0;
              const pct = normalizeSpo2Percentage(rawVal);
              const endMs =
                Number(pt.endTimeNanos || pt.startTimeNanos || 0) / 1e6 ||
                Number(b.endTimeMillis || b.startTimeMillis || 0);
              if (pct > 0 && endMs > bestSpo2.endMs) {
                bestSpo2 = { pct, endMs };
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('SpO2 aggregate query failed:', err);
    }

    const spo2 = bestSpo2.pct;
    const spo2Note =
      spo2 > 0 && bestSpo2.endMs > 0
        ? `Đo lúc ${formatTimeHHMM(bestSpo2.endMs)} ${formatDayLabel(bestSpo2.endMs, now)}`
        : spo2 > 0
        ? 'Ghi nhận từ Google Fit'
        : '';

    // 3. SMART MULTI-TIER HEART RATE ENGINE:
    // Collect BOTH merged stream AND raw wearable dataSources so newly synced Mi Band BPM is NEVER missed.
    let heartRate = 0;
    let latestHeartRate = 0;
    let heartRateNote = '';
    let heartRateSource: 'google-fit' | 'google-fit-resting' = 'google-fit';
    let heartRateScopeMissing = false;

    const hrStartNanos = BigInt(lookbackStartMillis) * 1000000n;
    const hrEndNanos = BigInt(endWithSkewMillis) * 1000000n;
    const allHrPoints: any[] = [];

    // Tier 1a: Merged HR stream
    try {
      const mergedStreamUrl = `https://fitness.googleapis.com/fitness/v1/users/me/dataSources/derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_bpm/datasets/${hrStartNanos}-${hrEndNanos}`;
      const streamRes = await fetch(mergedStreamUrl, { cache: 'no-store', headers: authHeaders });
      if (streamRes.status === 403) {
        heartRateScopeMissing = true;
      } else if (streamRes.ok) {
        const streamData = await streamRes.json();
        if (Array.isArray(streamData.point)) {
          allHrPoints.push(...streamData.point);
        }
      }
    } catch (err) {
      console.warn('Tier 1a Merged HR query failed:', err);
    }

    // Tier 1b: Direct wearable / third-party HR dataSources (always checked for fresher raw samples)
    if (!heartRateScopeMissing) {
      try {
        const dsRes = await fetch(
          'https://fitness.googleapis.com/fitness/v1/users/me/dataSources?dataTypeName=com.google.heart_rate.bpm',
          { cache: 'no-store', headers: authHeaders },
        );
        if (dsRes.status === 403) {
          heartRateScopeMissing = true;
        } else if (dsRes.ok) {
          const dsData = await dsRes.json();
          for (const ds of dsData.dataSource || []) {
            const streamId = ds.dataStreamId;
            if (!streamId || streamId.includes('merge_heart_rate_bpm')) continue;
            if (isWearableStream(streamId)) {
              detectedWearableLabel = detectedWearableLabel || formatDeviceLabel(streamId);
            }
            const rawDsUrl = `https://fitness.googleapis.com/fitness/v1/users/me/dataSources/${encodeURIComponent(
              streamId,
            )}/datasets/${hrStartNanos}-${hrEndNanos}`;
            const rawRes = await fetch(rawDsUrl, { cache: 'no-store', headers: authHeaders });
            if (rawRes.ok) {
              const rawJson = await rawRes.json();
              if (Array.isArray(rawJson.point) && rawJson.point.length > 0) {
                allHrPoints.push(...rawJson.point);
                if (isWearableStream(streamId)) {
                  detectedWearableLabel = detectedWearableLabel || formatDeviceLabel(streamId);
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('Tier 1b Direct dataSources HR query:', err);
      }
    }

    if (allHrPoints.length > 0) {
      const summary = summarizeHeartRatePoints(allHrPoints, now);
      if (summary) {
        heartRate = summary.avgBpm;
        latestHeartRate = summary.latestBpm;
        heartRateNote = summary.note;
      }
    }

    // Tier 2: Aggregate Summary API fallback
    if (heartRate === 0 && !heartRateScopeMissing) {
      try {
        const hrRes = await fetch(
          'https://fitness.googleapis.com/fitness/v1/users/me/dataset:aggregate',
          {
            method: 'POST',
            cache: 'no-store',
            headers: jsonHeaders,
            body: JSON.stringify({
              aggregateBy: [{ dataTypeName: 'com.google.heart_rate.bpm' }],
              bucketByTime: { durationMillis: 86400000 },
              startTimeMillis: lookbackStartMillis,
              endTimeMillis: endWithSkewMillis,
            }),
          },
        );
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
                    latestHeartRate = heartRate;
                    const bStartMs = Number(b.startTimeMillis || 0);
                    heartRateNote =
                      bStartMs > 0
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

    // Tier 3: Resting Heart Rate stream fallback
    if (heartRate === 0 && !heartRateScopeMissing) {
      try {
        const restingStreamUrl = `https://fitness.googleapis.com/fitness/v1/users/me/dataSources/derived:com.google.heart_rate.bpm:com.google.android.gms:resting_heart_rate<-merge_heart_rate_bpm/datasets/${hrStartNanos}-${hrEndNanos}`;
        const restRes = await fetch(restingStreamUrl, { cache: 'no-store', headers: authHeaders });
        if (restRes.ok) {
          const restData = await restRes.json();
          if (restData.point && restData.point.length > 0) {
            const latestRest = restData.point[restData.point.length - 1];
            const bpm = latestRest.value?.[0]?.fpVal || latestRest.value?.[0]?.intVal || 0;
            if (bpm >= 30 && bpm <= 220) {
              heartRate = Math.round(bpm);
              latestHeartRate = heartRate;
              heartRateSource = 'google-fit-resting';
              const restEndMs = Number(latestRest.endTimeNanos || latestRest.startTimeNanos || 0) / 1e6;
              heartRateNote =
                restEndMs > 0
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

    // 4. Query Sleep Sessions & Sleep Segments (7-day window)
    let sleepHours = '—';
    try {
      const sleepStartIso = new Date(lookbackStartMillis).toISOString();
      const sleepEndIso = new Date(endWithSkewMillis).toISOString();
      const sleepRes = await fetch(
        `https://fitness.googleapis.com/fitness/v1/users/me/sessions?startTime=${encodeURIComponent(
          sleepStartIso,
        )}&endTime=${encodeURIComponent(sleepEndIso)}`,
        { cache: 'no-store', headers: authHeaders },
      );
      if (sleepRes.ok) {
        const sleepJson = await sleepRes.json();
        if (sleepJson.session && sleepJson.session.length > 0) {
          const sleepSessions = sleepJson.session
            .filter(
              (s: any) =>
                s.activityType === 72 ||
                (s.name && s.name.toLowerCase().includes('sleep')) ||
                (s.description && s.description.toLowerCase().includes('sleep')),
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
      // Ignored
    }

    if (sleepHours === '—') {
      try {
        const dsRes = await fetch(
          'https://fitness.googleapis.com/fitness/v1/users/me/dataSources?dataTypeName=com.google.sleep.segment',
          { cache: 'no-store', headers: authHeaders },
        );
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
              `https://fitness.googleapis.com/fitness/v1/users/me/dataSources/${encodeURIComponent(
                ds.dataStreamId,
              )}/datasets/${winStartNanos}-${winEndNanos}`,
              { cache: 'no-store', headers: authHeaders },
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
              if (
                startMs >= latestEndMs - 20 * 60 * 60 * 1000 &&
                (stage === 2 || stage === 4 || stage === 5 || stage === 6)
              ) {
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

    // 5. Real values ONLY (ZERO fabricated estimates for distance, activeMinutes, heartPoints, or calories)
    const finalSteps = Math.max(0, Math.round(steps));
    const totalKcal = Math.max(0, Math.round(calories));
    const userBmr = Number(localStorage.getItem(STORAGE_KEYS.USER_BMR)) || 0;
    const dayFraction = isFromToday
      ? Math.min(1, Math.max(0, (now.getTime() - startOfDay.getTime()) / 86400000))
      : 1;

    // Separate active calories ONLY from real Google Fit total calories & user's deterministic BMR.
    const finalActiveKcal =
      userBmr > 0 && totalKcal > 0 ? Math.max(0, Math.round(totalKcal - userBmr * dayFraction)) : 0;

    if (finalSteps === 0 && totalKcal === 0) {
      isFromToday = false;
    }

    // Persist exact real values (and clear stale values when Google Fit returns none)
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.STEPS, String(finalSteps));
    localStorage.setItem(STORAGE_KEYS.KCAL, String(finalActiveKcal));
    localStorage.setItem(STORAGE_KEYS.KCAL_TOTAL, String(totalKcal));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_MINUTES, String(Math.max(0, Math.round(activeMinutes))));
    localStorage.setItem(
      STORAGE_KEYS.DISTANCE,
      String(distanceMeters > 0 ? Math.round(distanceMeters / 10) / 100 : 0),
    );
    localStorage.setItem(STORAGE_KEYS.HEART_POINTS, String(Math.max(0, Math.round(heartPoints))));

    if (spo2 > 0) {
      localStorage.setItem(STORAGE_KEYS.SPO2, String(spo2));
      localStorage.setItem(STORAGE_KEYS.SPO2_NOTE, spo2Note);
    } else {
      localStorage.removeItem(STORAGE_KEYS.SPO2);
      localStorage.removeItem(STORAGE_KEYS.SPO2_NOTE);
    }

    if (sleepHours !== '—') {
      localStorage.setItem(STORAGE_KEYS.SLEEP, sleepHours);
    } else {
      localStorage.removeItem(STORAGE_KEYS.SLEEP);
    }

    if (heartRate > 0) {
      localStorage.setItem(STORAGE_KEYS.HEART_RATE, String(heartRate));
      localStorage.setItem(STORAGE_KEYS.LATEST_HEART_RATE, String(latestHeartRate || heartRate));
      localStorage.setItem(STORAGE_KEYS.HEART_RATE_NOTE, heartRateNote || 'Ghi nhận từ Google Fit');
      localStorage.setItem(STORAGE_KEYS.HEART_RATE_SOURCE, heartRateSource);
    } else {
      const prevHrSource = localStorage.getItem(STORAGE_KEYS.HEART_RATE_SOURCE);
      const stored = localStorage.getItem(STORAGE_KEYS.HEART_RATE);
      if (prevHrSource === 'manual' && stored && Number(stored) > 0) {
        heartRate = Number(stored);
      } else {
        localStorage.removeItem(STORAGE_KEYS.HEART_RATE);
        localStorage.removeItem(STORAGE_KEYS.LATEST_HEART_RATE);
        localStorage.removeItem(STORAGE_KEYS.HEART_RATE_NOTE);
        localStorage.removeItem(STORAGE_KEYS.HEART_RATE_SOURCE);
      }
    }

    let deviceName = detectedDevice || 'Google Fit Cloud';
    const dLower = deviceName.toLowerCase();
    const isGenericDevice =
      dLower.includes('google fit') ||
      dLower.includes('cảm biến bước chân') ||
      dLower.includes('thiết bị đeo thông minh');
    if (detectedWearableLabel && isGenericDevice) {
      deviceName = detectedWearableLabel;
    }

    localStorage.setItem(STORAGE_KEYS.DATA_DATE, dataDateLabel);
    localStorage.setItem(STORAGE_KEYS.IS_TODAY, String(isFromToday));
    localStorage.setItem(STORAGE_KEYS.SYNC_DATE_KEY, formatLocalDateKey(now));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC_MS, String(Date.now()));
    localStorage.setItem(STORAGE_KEYS.DEVICE, deviceName);
    localStorage.setItem(STORAGE_KEYS.SOURCE, 'google-fit');
    localStorage.removeItem(STORAGE_KEYS.PRESET);
    localStorage.setItem(
      STORAGE_KEYS.SYNC_TIME,
      new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    );

    console.info('[wearable] Google Fit live sync result:', {
      steps: finalSteps,
      totalKcal,
      activeKcal: finalActiveKcal,
      todayActiveKcal: isFromToday ? finalActiveKcal : 0,
      isFromToday,
      activeMinutes,
      distanceMeters,
      heartPoints,
      spo2,
      spo2Note,
      heartRate,
      latestHeartRate,
      heartRateNote,
      sleepHours,
      dataDateLabel,
      deviceName,
    });

    window.dispatchEvent(new Event('wearable_sync_updated'));
    return { steps: finalSteps, calories: isFromToday ? finalActiveKcal : 0, heartRate };
  },

  /** Remember the user's deterministic BMR so Google Fit total calories can be split cleanly into basal vs. active. */
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
      localStorage.setItem(STORAGE_KEYS.LATEST_HEART_RATE, String(val));
      localStorage.setItem(STORAGE_KEYS.HEART_RATE_NOTE, `Nhập tay lúc ${timeStr} (${dateStr})`);
      localStorage.setItem(STORAGE_KEYS.HEART_RATE_SOURCE, 'manual');
      localStorage.setItem(
        STORAGE_KEYS.SYNC_TIME,
        now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      );
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

      if (gOauth2 && typeof gOauth2.initTokenClient === 'function') {
        try {
          const client = gOauth2.initTokenClient({
            client_id: GOOGLE_FIT_CLIENT_ID,
            scope: GOOGLE_FIT_SCOPES,
            callback: (tokenResponse: any) => {
              if (tokenResponse?.error) {
                reject(
                  new Error(
                    tokenResponse.error_description ||
                      tokenResponse.error ||
                      'Kết nối tài khoản Google không thành công. Vui lòng thử lại.',
                  ),
                );
                return;
              }
              if (tokenResponse?.access_token) {
                const expiresInSec = Number(tokenResponse.expires_in) || 3600;
                localStorage.setItem(STORAGE_KEYS.TOKEN, tokenResponse.access_token);
                localStorage.setItem(
                  STORAGE_KEYS.TOKEN_EXPIRES_AT,
                  String(Date.now() + expiresInSec * 1000),
                );
                resolve(tokenResponse.access_token);
              } else {
                reject(new Error('Chưa thể lấy thông tin xác thực từ Google. Vui lòng thử lại.'));
              }
            },
            error_callback: (err: any) => {
              reject(new Error(err?.message || 'Không thể mở cửa sổ kết nối Google.'));
            },
          });

          client.requestAccessToken({ prompt: 'consent' });
          return;
        } catch (err: any) {
          console.warn('Google Identity Services initTokenClient error, trying fallback:', err);
        }
      }

      const redirectUri = window.location.origin;
      const scope = GOOGLE_FIT_SCOPES;
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_FIT_CLIENT_ID}&redirect_uri=${encodeURIComponent(
        redirectUri,
      )}&response_type=token&scope=${encodeURIComponent(scope)}&prompt=consent`;

      const authWindow = window.open(authUrl, 'GoogleFitOAuth', 'width=560,height=680');
      if (!authWindow) {
        reject(
          new Error(
            'Trình duyệt đang chặn cửa sổ liên kết (popup). Vui lòng cho phép popup để kết nối Google Fit.',
          ),
        );
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
            const expiresInSec = Number(params.get('expires_in')) || 3600;
            if (token) {
              localStorage.setItem(STORAGE_KEYS.TOKEN, token);
              localStorage.setItem(
                STORAGE_KEYS.TOKEN_EXPIRES_AT,
                String(Date.now() + expiresInSec * 1000),
              );
              authWindow.close();
              clearInterval(timer);
              resolve(token);
            }
          }
        } catch {
          // Cross-origin restriction while on Google accounts domain is expected
        }
      }, 600);
    });
  },
};
