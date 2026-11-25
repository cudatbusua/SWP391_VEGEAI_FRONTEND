/**
 * VEGEAI Google Fit Live Sync Service
 * Single Source of Truth: Google Fit Cloud REST API (official merged streams).
 * Syncs ONLY metrics that Google Fit updates reliably & directly:
 *   - Steps (com.google.step_count.delta -> estimated_steps)
 *   - Total Calories Expended (com.google.calories.expended -> merge_calories_expended) + BMR active split
 *   - Distance (com.google.distance.delta -> merge_distance_delta)
 *   - Active Minutes & Heart Points (com.google.active_minutes, com.google.heart_minutes)
 * Zero fabricated/estimated fallback metrics: missing Google Fit metrics are reported honestly as 0 / '—'.
 */

export const GOOGLE_FIT_CLIENT_ID = '164354959561-84vaff9lo56ummq04itrgq642kmjd4qo.apps.googleusercontent.com';

export const GOOGLE_FIT_SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.location.read',
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
  /** Quãng đường thực Google Fit ghi nhận (km), 0 nếu chưa có dữ liệu */
  distanceKm: number;
  /** Tổng năng lượng tiêu hao thực tế từ Google Fit (khớp 1-1 với app Google Fit), 0 nếu chưa có */
  totalCaloriesExpended: number;
  /** Điểm vận động tim mạch (Heart Points) thực tế từ Google Fit, 0 nếu chưa có */
  heartPoints: number;
  /** Nhãn ngày ghi nhận dữ liệu (VD: "Hôm nay" hoặc "Gần nhất: 20/11") */
  dataDateLabel?: string;
  source: 'google-fit' | 'none';
  lastSyncedAt: string;
  isConnected: boolean;
  deviceModel: string;
  aiAdvice: string;
  recommendedSnack: string;
}

export interface GoogleFitSyncResult {
  steps: number;
  /** Calo vận động hôm nay (todayActiveCalories) */
  calories: number;
  totalCalories: number;
  distanceKm: number;
  activeMinutes: number;
  heartPoints: number;
  isTodayData: boolean;
}

const STORAGE_KEYS = {
  TOKEN: 'google_fit_access_token',
  TOKEN_EXPIRES_AT: 'google_fit_token_expires_at',
  STEPS: 'wearable_steps',
  KCAL: 'wearable_kcal',
  ACTIVE_MINUTES: 'wearable_active_minutes',
  KCAL_TOTAL: 'wearable_kcal_total',
  USER_BMR: 'wearable_user_bmr',
  DISTANCE: 'wearable_distance_km',
  HEART_POINTS: 'wearable_heart_points',
  DATA_DATE: 'wearable_data_date',
  IS_TODAY: 'wearable_is_today',
  SYNC_DATE_KEY: 'wearable_sync_date_key',
  LAST_SYNC_MS: 'wearable_last_sync_ms',
  SOURCE: 'wearable_source',
  SYNC_TIME: 'wearable_last_synced',
  PRESET: 'wearable_preset',
  DEVICE: 'wearable_device',
};

const LEGACY_KEYS_TO_CLEAN = [
  'wearable_heart_rate',
  'wearable_latest_heart_rate',
  'wearable_heart_rate_note',
  'wearable_heart_rate_source',
  'wearable_hr_scope_missing',
  'wearable_spo2',
  'wearable_spo2_note',
  'wearable_sleep',
];

const LOOKBACK_DAYS = 7;
const AUTO_SYNC_COOLDOWN_MS = 10 * 1000;
const CLOCK_SKEW_BUFFER_MS = 5 * 60 * 1000;
let inFlightSync: Promise<GoogleFitSyncResult> | null = null;

function formatLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function cleanLegacyBiometricKeys(): void {
  for (const key of LEGACY_KEYS_TO_CLEAN) {
    localStorage.removeItem(key);
  }
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
    const storedActiveMinutes = isStaleSimulator
      ? null
      : localStorage.getItem(STORAGE_KEYS.ACTIVE_MINUTES);
    const storedDataDate = isStaleSimulator
      ? undefined
      : localStorage.getItem(STORAGE_KEYS.DATA_DATE) || undefined;
    const storedIsToday = isStaleSimulator ? null : localStorage.getItem(STORAGE_KEYS.IS_TODAY);
    const storedSyncDateKey = isStaleSimulator
      ? null
      : localStorage.getItem(STORAGE_KEYS.SYNC_DATE_KEY);
    const storedSync = isStaleSimulator ? null : localStorage.getItem(STORAGE_KEYS.SYNC_TIME);
    const storedDevice = isStaleSimulator ? null : localStorage.getItem(STORAGE_KEYS.DEVICE);

    if (!token && !storedSteps) {
      return {
        steps: 0,
        stepTarget: 10000,
        activeCalories: 0,
        todayActiveCalories: 0,
        isTodayData: false,
        activeMinutes: 0,
        distanceKm: 0,
        totalCaloriesExpended: 0,
        heartPoints: 0,
        dataDateLabel: undefined,
        source: 'none',
        lastSyncedAt: 'Chưa liên kết Google Fit',
        isConnected: false,
        deviceModel: 'Chưa kết nối',
        aiAdvice:
          'Bạn chưa liên kết Google Fit. Hãy bấm "Liên kết Google Fit" để đồng bộ trực tiếp bước chân, tổng tiêu hao calo và quãng đường vận động từ Google Fit Cloud.',
        recommendedSnack: 'Chưa có dữ liệu vận động',
      };
    }

    const steps = storedSteps !== null ? Number(storedSteps) : 0;
    const activeCalories = storedKcal !== null ? Number(storedKcal) : 0;
    const activeMinutes = storedActiveMinutes !== null ? Number(storedActiveMinutes) : 0;
    const distanceKm = isStaleSimulator ? 0 : Number(localStorage.getItem(STORAGE_KEYS.DISTANCE)) || 0;
    const totalCaloriesExpended = isStaleSimulator
      ? 0
      : Number(localStorage.getItem(STORAGE_KEYS.KCAL_TOTAL)) || 0;
    const heartPoints = isStaleSimulator
      ? 0
      : Number(localStorage.getItem(STORAGE_KEYS.HEART_POINTS)) || 0;

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
      const distStr = distanceKm > 0 ? `, quãng đường ${distanceKm.toLocaleString('vi-VN')} km` : '';
      const dateStr = !isTodayData && storedDataDate ? ` [${storedDataDate}]` : '';
      adviceText = isTodayData
        ? `Đã đồng bộ trực tiếp từ ${storedDevice || 'Google Fit'}: ${steps.toLocaleString('vi-VN')} bước chân${totalStr}${activeStr}${distStr}.`
        : `Hiển thị dữ liệu gần nhất từ ${storedDevice || 'Google Fit'}${dateStr}: ${steps.toLocaleString('vi-VN')} bước chân${totalStr}. Hôm nay chưa có đồng bộ mới nên calo ngày cũ không cộng vào ngân sách hôm nay.`;
    } else if (token) {
      adviceText = `Đã liên kết ${storedDevice || 'Google Fit'}. Hôm nay trên Google Fit Cloud chưa có dữ liệu bước chân mới. Hãy mở app Google Fit trên điện thoại để đồng bộ lên Cloud rồi nhấn "Đồng bộ ngay".`;
    } else {
      adviceText =
        'Bạn chưa liên kết Google Fit. Hãy bấm "Liên kết Google Fit" ở trên để kết nối theo dõi sức khỏe.';
    }

    return {
      steps,
      stepTarget: 10000,
      activeCalories,
      todayActiveCalories,
      isTodayData,
      activeMinutes,
      distanceKm,
      totalCaloriesExpended,
      heartPoints,
      dataDateLabel: storedDataDate,
      source: token ? 'google-fit' : 'none',
      lastSyncedAt: storedSync || (token ? 'Đã liên kết tài khoản' : 'Chưa đồng bộ'),
      isConnected: Boolean(token),
      deviceModel: token ? storedDevice || 'Google Fit (Đồng bộ điện thoại / thiết bị)' : 'Chưa kết nối',
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
    cleanLegacyBiometricKeys();
    window.dispatchEvent(new Event('wearable_sync_updated'));
  },

  fetchGoogleFitLive(token: string): Promise<GoogleFitSyncResult> {
    if (inFlightSync) {
      return inFlightSync;
    }
    inFlightSync = this._performGoogleFitSync(token).finally(() => {
      inFlightSync = null;
    });
    return inFlightSync;
  },

  async _performGoogleFitSync(token: string): Promise<GoogleFitSyncResult> {
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
        return 'Google Fit (tổng hợp Điện thoại + Xiaomi Smart Band)';
      }
      if (s.includes('amazfit') || s.includes('zepp')) {
        return 'Google Fit (tổng hợp Điện thoại + Amazfit / Zepp)';
      }
      if (s.includes('samsung') || s.includes('shealth')) {
        return 'Google Fit (tổng hợp Điện thoại + Samsung Galaxy Watch)';
      }
      if (s.includes('apple') || s.includes('healthkit')) {
        return 'Google Fit (tổng hợp iPhone + Apple Watch)';
      }
      if (s.includes('garmin')) {
        return 'Google Fit (tổng hợp Điện thoại + Garmin Watch)';
      }
      if (s.includes('fitbit')) {
        return 'Google Fit (tổng hợp Điện thoại + Fitbit)';
      }
      if (s.includes('huawei')) {
        return 'Google Fit (tổng hợp Điện thoại + Huawei Health)';
      }
      if (s.includes('oppo')) {
        return 'Google Fit (tổng hợp Điện thoại + OPPO Watch)';
      }
      if (s.includes('healthdata') || s.includes('health_connect') || s.includes('wearable')) {
        return 'Google Fit (tổng hợp qua Health Connect)';
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
          return (json.bucket || []) as any[];
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
    const calories = chosenSummary.calories;
    const activeMinutes = chosenSummary.activeMinutes;
    const distanceMeters = chosenSummary.distanceMeters;
    const heartPoints = chosenSummary.heartPoints;
    let detectedDevice = chosenSummary.detectedDevice;
    let hasSpecificWearable = chosenSummary.hasWearable;
    let detectedWearableLabel = chosenSummary.hasWearable ? chosenSummary.detectedDevice : '';

    // 1c. Raw dataSources fallback for steps ONLY if aggregate returned 0
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
                  hasSpecificWearable = true;
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('Step raw dataSources fallback failed:', err);
      }
    }

    // 2. Real values ONLY (ZERO fabricated estimates for distance, activeMinutes, heartPoints, or calories)
    const finalSteps = Math.max(0, Math.round(steps));
    const totalKcal = Math.max(0, Math.round(calories));
    const finalActiveMinutes = Math.max(0, Math.round(activeMinutes));
    const finalDistanceKm = distanceMeters > 0 ? Math.round(distanceMeters / 10) / 100 : 0;
    const finalHeartPoints = Math.max(0, Math.round(heartPoints));

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

    let deviceName = detectedDevice || 'Google Fit Cloud';
    if (detectedWearableLabel && !hasSpecificWearable) {
      deviceName = detectedWearableLabel;
    }

    // Persist exact real values and clean any legacy incomplete biometric keys (HR/SpO2/Sleep)
    cleanLegacyBiometricKeys();
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.STEPS, String(finalSteps));
    localStorage.setItem(STORAGE_KEYS.KCAL, String(finalActiveKcal));
    localStorage.setItem(STORAGE_KEYS.KCAL_TOTAL, String(totalKcal));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_MINUTES, String(finalActiveMinutes));
    localStorage.setItem(STORAGE_KEYS.DISTANCE, String(finalDistanceKm));
    localStorage.setItem(STORAGE_KEYS.HEART_POINTS, String(finalHeartPoints));
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

    const todayActiveKcal = isFromToday ? finalActiveKcal : 0;

    console.info('[wearable] Google Fit live sync result:', {
      steps: finalSteps,
      totalKcal,
      activeKcal: finalActiveKcal,
      todayActiveKcal,
      isFromToday,
      activeMinutes: finalActiveMinutes,
      distanceKm: finalDistanceKm,
      heartPoints: finalHeartPoints,
      dataDateLabel,
      deviceName,
    });

    window.dispatchEvent(new Event('wearable_sync_updated'));
    return {
      steps: finalSteps,
      calories: todayActiveKcal,
      totalCalories: totalKcal,
      distanceKm: finalDistanceKm,
      activeMinutes: finalActiveMinutes,
      heartPoints: finalHeartPoints,
      isTodayData: isFromToday,
    };
  },

  /** Remember the user's deterministic BMR so Google Fit total calories can be split cleanly into basal vs. active. */
  setUserBmr(bmr: number) {
    if (bmr > 0) {
      localStorage.setItem(STORAGE_KEYS.USER_BMR, String(Math.round(bmr)));
    }
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
