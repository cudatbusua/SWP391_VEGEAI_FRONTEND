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

export interface DailyActivityRecord {
  /** Local date key YYYY-MM-DD */
  dateKey: string;
  /** Short Vietnamese weekday label: T2..T7, CN */
  weekdayLabel: string;
  /** Full Vietnamese weekday label: Thứ Hai..Chủ Nhật */
  fullWeekdayLabel: string;
  /** Short date label: DD/MM */
  shortDateLabel: string;
  isToday: boolean;
  steps: number;
  stepTarget: number;
  totalCalories: number;
  activeCalories: number;
  distanceKm: number;
  activeMinutes: number;
  heartPoints: number;
  /** True if Google Fit returned at least one non-zero metric for this day */
  hasActivityData: boolean;
}

export interface WearableMetrics {
  steps: number;
  stepTarget: number;
  /** Calo vận động ước tách = max(0, totalCaloriesExpended − BMR theo phần ngày đã trôi qua), 0 nếu thiếu BMR hoặc thiếu tổng calo thực */
  activeCalories: number;
  /** Calo vận động được tính cho ngân sách hôm nay */
  todayActiveCalories: number;
  /** true nếu dữ liệu hiện tại là bản đồng bộ trực tiếp của ngày hôm nay */
  isTodayData: boolean;
  /** true nếu đã có bản đồng bộ hợp lệ cho hôm nay (kể cả khi bước chân = 0, quãng đường = 0 km) */
  hasSyncedToday: boolean;
  activeMinutes: number;
  /** Quãng đường thực Google Fit ghi nhận hôm nay (km), 0 nếu chưa di chuyển */
  distanceKm: number;
  /** Tổng năng lượng tiêu hao thực tế hôm nay từ Google Fit (khớp 1-1 với app Google Fit) */
  totalCaloriesExpended: number;
  /** Điểm vận động tim mạch (Heart Points) thực tế hôm nay từ Google Fit */
  heartPoints: number;
  /** Nhãn ngày ghi nhận dữ liệu (luôn là "Hôm nay" sau khi đồng bộ trực tiếp) */
  dataDateLabel?: string;
  /** Lịch sử vận động 7 ngày gần nhất (6 ngày trước + hôm nay, theo thứ tự cũ -> mới) */
  dailyHistory: DailyActivityRecord[];
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
  dailyHistory: DailyActivityRecord[];
  syncedAt: string;
}

export interface GoogleFitSyncOptions {
  /** Whether to also query the previous 6 days from Google Fit (defaults to true) */
  includeHistory?: boolean;
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
  HISTORY: 'wearable_daily_history',
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

const HISTORY_DAYS = 7;
const DEFAULT_STEP_TARGET = 10000;
const AUTO_SYNC_COOLDOWN_MS = 10 * 1000;
let inFlightSync: Promise<GoogleFitSyncResult> | null = null;
let syncEpoch = 0;

function safeFiniteNonNegative(val: unknown): number {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function safeSetStorageItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn(`[wearable] Failed to persist ${key}:`, err);
  }
}

const SHORT_WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'] as const;
const FULL_WEEKDAYS = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
] as const;

function formatLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatShortDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function buildDayMeta(d: Date, todayKey: string) {
  const dateKey = formatLocalDateKey(d);
  const dow = d.getDay();
  return {
    dateKey,
    weekdayLabel: SHORT_WEEKDAYS[dow],
    fullWeekdayLabel: FULL_WEEKDAYS[dow],
    shortDateLabel: formatShortDate(d),
    isToday: dateKey === todayKey,
  };
}

function loadStoredHistory(todayKey: string): DailyActivityRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is DailyActivityRecord => Boolean(item && typeof item.dateKey === 'string'))
      .map(item => ({
        dateKey: item.dateKey,
        weekdayLabel: typeof item.weekdayLabel === 'string' ? item.weekdayLabel : '',
        fullWeekdayLabel: typeof item.fullWeekdayLabel === 'string' ? item.fullWeekdayLabel : '',
        shortDateLabel: typeof item.shortDateLabel === 'string' ? item.shortDateLabel : '',
        isToday: item.dateKey === todayKey,
        steps: Math.max(0, Math.round(Number(item.steps) || 0)),
        stepTarget: Math.max(1, Math.round(Number(item.stepTarget) || DEFAULT_STEP_TARGET)),
        totalCalories: Math.max(0, Math.round(Number(item.totalCalories) || 0)),
        activeCalories: Math.max(0, Math.round(Number(item.activeCalories) || 0)),
        distanceKm: Math.max(0, Number(item.distanceKm) || 0),
        activeMinutes: Math.max(0, Math.round(Number(item.activeMinutes) || 0)),
        heartPoints: Math.max(0, Math.round(Number(item.heartPoints) || 0)),
        hasActivityData: Boolean(
          item.hasActivityData ||
            Number(item.steps) > 0 ||
            Number(item.totalCalories) > 0 ||
            Number(item.distanceKm) > 0 ||
            Number(item.activeMinutes) > 0 ||
            Number(item.heartPoints) > 0,
        ),
      }));
  } catch {
    return [];
  }
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

    const todayKey = formatLocalDateKey(new Date());
    const dailyHistory = isStaleSimulator || !token ? [] : loadStoredHistory(todayKey);

    if (!token && storedSteps === null) {
      return {
        steps: 0,
        stepTarget: DEFAULT_STEP_TARGET,
        activeCalories: 0,
        todayActiveCalories: 0,
        isTodayData: false,
        hasSyncedToday: false,
        activeMinutes: 0,
        distanceKm: 0,
        totalCaloriesExpended: 0,
        heartPoints: 0,
        dataDateLabel: undefined,
        dailyHistory: [],
        source: 'none',
        lastSyncedAt: 'Chưa liên kết',
        isConnected: false,
        deviceModel: 'Chưa kết nối',
        aiAdvice:
          'Liên kết Google Fit để cân đối khẩu phần chay và gợi ý bữa phụ hồi phục theo mức vận động thực tế.',
        recommendedSnack: 'Chưa có dữ liệu vận động',
      };
    }

    const isCalendarDayRolledOver = Boolean(storedSyncDateKey && storedSyncDateKey !== todayKey);
    const isLegacyPastDaySnapshot = storedIsToday === 'false';
    const isStaleDaySnapshot = isCalendarDayRolledOver || isLegacyPastDaySnapshot;
    const hasSyncedToday =
      !isStaleDaySnapshot &&
      (storedSyncDateKey === todayKey ||
        (storedSteps !== null && (storedIsToday === 'true' || storedDataDate === 'Hôm nay')));

    const steps = !isStaleDaySnapshot && storedSteps !== null ? Math.max(0, Number(storedSteps) || 0) : 0;
    const activeCalories =
      !isStaleDaySnapshot && storedKcal !== null ? Math.max(0, Number(storedKcal) || 0) : 0;
    const activeMinutes =
      !isStaleDaySnapshot && storedActiveMinutes !== null
        ? Math.max(0, Number(storedActiveMinutes) || 0)
        : 0;
    const distanceKm =
      !isStaleDaySnapshot && !isStaleSimulator
        ? Math.max(0, Number(localStorage.getItem(STORAGE_KEYS.DISTANCE)) || 0)
        : 0;
    const totalCaloriesExpended =
      !isStaleDaySnapshot && !isStaleSimulator
        ? Math.max(0, Number(localStorage.getItem(STORAGE_KEYS.KCAL_TOTAL)) || 0)
        : 0;
    const heartPoints =
      !isStaleDaySnapshot && !isStaleSimulator
        ? Math.max(0, Number(localStorage.getItem(STORAGE_KEYS.HEART_POINTS)) || 0)
        : 0;

    const isTodayData = hasSyncedToday;
    const todayActiveCalories = isTodayData ? activeCalories : 0;

    let adviceText = '';
    if (!token) {
      adviceText =
        'Liên kết Google Fit để cân đối khẩu phần chay và gợi ý bữa phụ hồi phục theo mức vận động thực tế.';
    } else if (steps >= DEFAULT_STEP_TARGET) {
      adviceText =
        'Đã hoàn thành mục tiêu bước chân hôm nay. Nên bổ sung thêm đạm thực vật và tinh bột chậm để phục hồi năng lượng.';
    } else if (steps >= 5000) {
      adviceText =
        'Mức vận động hôm nay khá tốt. Duy trì đủ nước và cân đối đạm thực vật trong bữa ăn tiếp theo.';
    } else if (steps > 0) {
      adviceText =
        'Vận động nhẹ trong ngày. Ưu tiên bữa ăn chay thanh đạm, giàu rau xanh và chất xơ.';
    } else {
      adviceText =
        'Giữ khẩu phần bám sát mục tiêu calo cơ bản hôm nay và bổ sung đủ nước lọc.';
    }

    return {
      steps,
      stepTarget: DEFAULT_STEP_TARGET,
      activeCalories,
      todayActiveCalories,
      isTodayData,
      hasSyncedToday,
      activeMinutes,
      distanceKm,
      totalCaloriesExpended,
      heartPoints,
      dataDateLabel: isTodayData ? 'Hôm nay' : storedDataDate,
      dailyHistory,
      source: token ? 'google-fit' : 'none',
      lastSyncedAt: storedSync || (token ? 'Đã liên kết' : 'Chưa đồng bộ'),
      isConnected: Boolean(token),
      deviceModel: token ? storedDevice || 'Google Fit' : 'Chưa kết nối',
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
    syncEpoch += 1;
    inFlightSync = null;
    Object.values(STORAGE_KEYS).forEach(key => {
      if (key !== STORAGE_KEYS.USER_BMR) localStorage.removeItem(key);
    });
    cleanLegacyBiometricKeys();
    window.dispatchEvent(new Event('wearable_sync_updated'));
  },

  fetchGoogleFitLive(
    token: string,
    options: GoogleFitSyncOptions = {},
  ): Promise<GoogleFitSyncResult> {
    if (inFlightSync) {
      return inFlightSync;
    }
    const currentSync = this._performGoogleFitSync(token, options).finally(() => {
      if (inFlightSync === currentSync) {
        inFlightSync = null;
      }
    });
    inFlightSync = currentSync;
    return currentSync;
  },

  async _performGoogleFitSync(
    token: string,
    options: GoogleFitSyncOptions = {},
  ): Promise<GoogleFitSyncResult> {
    const myEpoch = syncEpoch;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const startTimeMillis = startOfDay.getTime();
    // Query strictly up to the exact moment of sync (minimum +1s if synced at 00:00:00.000)
    const endTimeMillis = Math.max(now.getTime(), startTimeMillis + 1000);
    const todayKey = formatLocalDateKey(now);

    const prevHistoryStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - (HISTORY_DAYS - 1),
      0,
      0,
      0,
      0,
    );
    const prevHistoryStartMillis = prevHistoryStart.getTime();

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
        return 'Google Fit (Điện thoại + Xiaomi Smart Band)';
      }
      if (s.includes('amazfit') || s.includes('zepp')) {
        return 'Google Fit (Điện thoại + Amazfit / Zepp)';
      }
      if (s.includes('samsung') || s.includes('shealth')) {
        return 'Google Fit (Điện thoại + Samsung Galaxy Watch)';
      }
      if (s.includes('apple') || s.includes('healthkit')) {
        return 'Google Fit (iPhone + Apple Watch)';
      }
      if (s.includes('garmin')) {
        return 'Google Fit (Điện thoại + Garmin Watch)';
      }
      if (s.includes('fitbit')) {
        return 'Google Fit (Điện thoại + Fitbit)';
      }
      if (s.includes('huawei')) {
        return 'Google Fit (Điện thoại + Huawei Health)';
      }
      if (s.includes('oppo')) {
        return 'Google Fit (Điện thoại + OPPO Watch)';
      }
      if (s.includes('healthdata') || s.includes('health_connect') || s.includes('wearable')) {
        return 'Google Fit (Health Connect)';
      }
      if (s.includes('estimated_steps') || s.includes('android.gms') || s.includes('internal_sensor')) {
        return 'Google Fit';
      }
      return 'Google Fit';
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
              bSteps += safeFiniteNonNegative(point.value?.[0]?.intVal);
            } else if (point.dataTypeName === 'com.google.calories.expended') {
              bCalories += safeFiniteNonNegative(point.value?.[0]?.fpVal);
            } else if (point.dataTypeName === 'com.google.active_minutes') {
              bActiveMinutes += safeFiniteNonNegative(
                point.value?.[0]?.intVal ?? point.value?.[0]?.fpVal,
              );
            } else if (point.dataTypeName === 'com.google.distance.delta') {
              bDistanceMeters += safeFiniteNonNegative(point.value?.[0]?.fpVal);
            } else if (point.dataTypeName === 'com.google.heart_minutes') {
              bHeartPoints += safeFiniteNonNegative(
                point.value?.[0]?.fpVal ?? point.value?.[0]?.intVal,
              );
            }
          }
        }
      }

      const bStartMs = Number(bucket?.startTimeMillis || startTimeMillis);
      const bEndMs = Number(bucket?.endTimeMillis || 0);

      return {
        steps: Math.max(0, Math.round(bSteps)),
        calories: Math.max(0, bCalories),
        activeMinutes: Math.max(0, Math.round(bActiveMinutes)),
        distanceMeters: Math.max(0, bDistanceMeters),
        heartPoints: Math.max(0, Math.round(bHeartPoints)),
        detectedDevice: wearableLabel || fallbackLabel || 'Google Fit',
        hasWearable: Boolean(wearableLabel),
        startTimeMillis: bStartMs,
        endTimeMillis: bEndMs,
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
      const officialCoreMergedTypes = [
        { dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps' },
        { dataSourceId: 'derived:com.google.calories.expended:com.google.android.gms:merge_calories_expended' },
        { dataSourceId: 'derived:com.google.distance.delta:com.google.android.gms:merge_distance_delta' },
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

      for (const candidate of [officialMergedTypes, officialCoreMergedTypes, fullTypes, coreTypes]) {
        let res: Response;
        try {
          res = await postAggregate(candidate);
        } catch {
          throw new Error('Không thể kết nối tới Google Fit. Vui lòng kiểm tra mạng và thử lại.');
        }
        if (res.status === 401) {
          this.disconnect();
          throw new Error('Phiên kết nối Google Fit đã hết hạn. Vui lòng liên kết lại.');
        }
        if (res.ok) {
          const json = await res.json().catch(() => ({}));
          return Array.isArray(json?.bucket) ? json.bucket : [];
        }
      }

      throw new Error('Không thể đồng bộ dữ liệu Google Fit lúc này. Vui lòng thử lại sau.');
    };

    const existingHistory = loadStoredHistory(todayKey);
    const hasFreshHistoryForToday =
      existingHistory.length === HISTORY_DAYS &&
      existingHistory[existingHistory.length - 1]?.dateKey === todayKey;
    const shouldFetchHistory = options.includeHistory !== false || !hasFreshHistoryForToday;

    // 1. Always query TODAY's exact metrics [00:00:00 -> now] at the exact sync moment.
    //    Never overwrite today's 0 steps / 0 km with previous days.
    //    In parallel, fetch the previous 6 days strictly for the 7-day Daily Goals map.
    const todayPromise = queryAggregateBuckets(startTimeMillis, endTimeMillis, true);
    const prevHistoryPromise: Promise<any[] | null> = shouldFetchHistory
      ? queryAggregateBuckets(prevHistoryStartMillis, startTimeMillis, false).catch(err => {
          if (err?.message?.includes('hết hạn')) throw err;
          console.warn('7-day history query failed:', err);
          return null;
        })
      : Promise.resolve(null);

    const [todayBuckets, prevBuckets] = await Promise.all([todayPromise, prevHistoryPromise]);

    // Combine all points returned in today's window (usually 1 bucket)
    const todayAgg = {
      steps: 0,
      calories: 0,
      activeMinutes: 0,
      distanceMeters: 0,
      heartPoints: 0,
      detectedDevice: '',
      hasWearable: false,
    };

    for (const b of todayBuckets) {
      const s = extractBucketSummary(b);
      todayAgg.steps += s.steps;
      todayAgg.calories += s.calories;
      todayAgg.activeMinutes += s.activeMinutes;
      todayAgg.distanceMeters += s.distanceMeters;
      todayAgg.heartPoints += s.heartPoints;
      if (s.hasWearable && !todayAgg.hasWearable) {
        todayAgg.hasWearable = true;
        todayAgg.detectedDevice = s.detectedDevice;
      } else if (!todayAgg.detectedDevice && s.detectedDevice) {
        todayAgg.detectedDevice = s.detectedDevice;
      }
    }

    // 2. Real today values ONLY (0 stays 0 — never replaced by past days or estimates)
    const finalSteps = Math.max(0, Math.round(todayAgg.steps));
    const totalKcal = Math.max(0, Math.round(todayAgg.calories));
    const finalActiveMinutes = Math.max(0, Math.round(todayAgg.activeMinutes));
    const finalDistanceKm =
      todayAgg.distanceMeters > 0 ? Math.round(todayAgg.distanceMeters / 10) / 100 : 0;
    const finalHeartPoints = Math.max(0, Math.round(todayAgg.heartPoints));

    const userBmr = Number(localStorage.getItem(STORAGE_KEYS.USER_BMR)) || 0;
    const dayFraction = Math.min(1, Math.max(0, (now.getTime() - startOfDay.getTime()) / 86400000));
    const finalActiveKcal =
      userBmr > 0 && totalKcal > 0 ? Math.max(0, Math.round(totalKcal - userBmr * dayFraction)) : 0;

    // 3. Build contiguous 7-day history (previous 6 days + Today)
    const existingByDate = new Map<string, DailyActivityRecord>();
    for (const rec of existingHistory) {
      existingByDate.set(rec.dateKey, rec);
    }

    let historyWearableLabel = '';
    const fetchedPrevByDate = new Map<
      string,
      {
        steps: number;
        calories: number;
        activeMinutes: number;
        distanceMeters: number;
        heartPoints: number;
      }
    >();

    if (prevBuckets) {
      for (const b of prevBuckets) {
        const s = extractBucketSummary(b);
        if (s.hasWearable && !historyWearableLabel) {
          historyWearableLabel = s.detectedDevice;
        }
        // Use bucket midpoint when endTimeMillis is available so DST shifts still land on the right calendar day
        const anchorMs =
          s.endTimeMillis > s.startTimeMillis
            ? Math.floor((s.startTimeMillis + s.endTimeMillis) / 2)
            : s.startTimeMillis;
        if (!Number.isFinite(anchorMs) || anchorMs <= 0) continue;
        const key = formatLocalDateKey(new Date(anchorMs));
        if (key === todayKey) continue;
        const cur = fetchedPrevByDate.get(key) || {
          steps: 0,
          calories: 0,
          activeMinutes: 0,
          distanceMeters: 0,
          heartPoints: 0,
        };
        cur.steps += s.steps;
        cur.calories += s.calories;
        cur.activeMinutes += s.activeMinutes;
        cur.distanceMeters += s.distanceMeters;
        cur.heartPoints += s.heartPoints;
        fetchedPrevByDate.set(key, cur);
      }
    }

    const dailyHistory: DailyActivityRecord[] = [];
    for (let offset = HISTORY_DAYS - 1; offset >= 0; offset--) {
      const dayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset, 0, 0, 0, 0);
      const meta = buildDayMeta(dayDate, todayKey);

      if (offset === 0) {
        dailyHistory.push({
          ...meta,
          isToday: true,
          steps: finalSteps,
          stepTarget: DEFAULT_STEP_TARGET,
          totalCalories: totalKcal,
          activeCalories: finalActiveKcal,
          distanceKm: finalDistanceKm,
          activeMinutes: finalActiveMinutes,
          heartPoints: finalHeartPoints,
          hasActivityData:
            finalSteps > 0 ||
            totalKcal > 0 ||
            finalDistanceKm > 0 ||
            finalActiveMinutes > 0 ||
            finalHeartPoints > 0,
        });
      } else if (prevBuckets !== null) {
        const bucketVal = fetchedPrevByDate.get(meta.dateKey);
        const dSteps = bucketVal ? Math.max(0, Math.round(bucketVal.steps)) : 0;
        const dTotalKcal = bucketVal ? Math.max(0, Math.round(bucketVal.calories)) : 0;
        const dDistKm =
          bucketVal && bucketVal.distanceMeters > 0
            ? Math.round(bucketVal.distanceMeters / 10) / 100
            : 0;
        const dActiveMin = bucketVal ? Math.max(0, Math.round(bucketVal.activeMinutes)) : 0;
        const dHeartPts = bucketVal ? Math.max(0, Math.round(bucketVal.heartPoints)) : 0;
        const dActiveKcal =
          userBmr > 0 && dTotalKcal > 0 ? Math.max(0, Math.round(dTotalKcal - userBmr)) : 0;

        dailyHistory.push({
          ...meta,
          isToday: false,
          steps: dSteps,
          stepTarget: DEFAULT_STEP_TARGET,
          totalCalories: dTotalKcal,
          activeCalories: dActiveKcal,
          distanceKm: dDistKm,
          activeMinutes: dActiveMin,
          heartPoints: dHeartPts,
          hasActivityData:
            dSteps > 0 || dTotalKcal > 0 || dDistKm > 0 || dActiveMin > 0 || dHeartPts > 0,
        });
      } else {
        const cached = existingByDate.get(meta.dateKey);
        dailyHistory.push(
          cached
            ? { ...cached, ...meta, isToday: false }
            : {
                ...meta,
                isToday: false,
                steps: 0,
                stepTarget: DEFAULT_STEP_TARGET,
                totalCalories: 0,
                activeCalories: 0,
                distanceKm: 0,
                activeMinutes: 0,
                heartPoints: 0,
                hasActivityData: false,
              },
        );
      }
    }

    const previousStoredDevice = localStorage.getItem(STORAGE_KEYS.DEVICE) || '';
    const deviceName = todayAgg.hasWearable
      ? todayAgg.detectedDevice
      : historyWearableLabel ||
        (previousStoredDevice && previousStoredDevice !== 'Chưa kết nối'
          ? previousStoredDevice
          : todayAgg.detectedDevice || 'Google Fit');

    const syncedAt = now.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // If the user disconnected while this sync request was in flight, do not resurrect the cleared session.
    if (myEpoch !== syncEpoch) {
      return {
        steps: 0,
        calories: 0,
        totalCalories: 0,
        distanceKm: 0,
        activeMinutes: 0,
        heartPoints: 0,
        isTodayData: false,
        dailyHistory: [],
        syncedAt,
      };
    }

    // Persist exact real values and clean any legacy incomplete biometric keys (HR/SpO2/Sleep)
    cleanLegacyBiometricKeys();
    safeSetStorageItem(STORAGE_KEYS.TOKEN, token);
    safeSetStorageItem(STORAGE_KEYS.STEPS, String(finalSteps));
    safeSetStorageItem(STORAGE_KEYS.KCAL, String(finalActiveKcal));
    safeSetStorageItem(STORAGE_KEYS.KCAL_TOTAL, String(totalKcal));
    safeSetStorageItem(STORAGE_KEYS.ACTIVE_MINUTES, String(finalActiveMinutes));
    safeSetStorageItem(STORAGE_KEYS.DISTANCE, String(finalDistanceKm));
    safeSetStorageItem(STORAGE_KEYS.HEART_POINTS, String(finalHeartPoints));
    safeSetStorageItem(STORAGE_KEYS.DATA_DATE, 'Hôm nay');
    safeSetStorageItem(STORAGE_KEYS.IS_TODAY, 'true');
    safeSetStorageItem(STORAGE_KEYS.SYNC_DATE_KEY, todayKey);
    safeSetStorageItem(STORAGE_KEYS.LAST_SYNC_MS, String(Date.now()));
    safeSetStorageItem(STORAGE_KEYS.DEVICE, deviceName);
    safeSetStorageItem(STORAGE_KEYS.SOURCE, 'google-fit');
    safeSetStorageItem(STORAGE_KEYS.HISTORY, JSON.stringify(dailyHistory));
    localStorage.removeItem(STORAGE_KEYS.PRESET);
    safeSetStorageItem(STORAGE_KEYS.SYNC_TIME, syncedAt);

    console.info('[wearable] Google Fit live sync result:', {
      steps: finalSteps,
      totalKcal,
      activeKcal: finalActiveKcal,
      activeMinutes: finalActiveMinutes,
      distanceKm: finalDistanceKm,
      heartPoints: finalHeartPoints,
      historyDays: dailyHistory.length,
      deviceName,
      syncedAt,
    });

    window.dispatchEvent(new Event('wearable_sync_updated'));
    return {
      steps: finalSteps,
      calories: finalActiveKcal,
      totalCalories: totalKcal,
      distanceKm: finalDistanceKm,
      activeMinutes: finalActiveMinutes,
      heartPoints: finalHeartPoints,
      isTodayData: true,
      dailyHistory,
      syncedAt,
    };
  },

  /**
   * Remember the user's deterministic BMR so Google Fit total calories can be split cleanly into basal vs. active.
   * When BMR changes (e.g. after updating height/weight/age/gender in profile), immediately recompute
   * today's and 7-day activeCalories from the real Google Fit totalCalories without needing a page refresh.
   */
  setUserBmr(bmr: number) {
    const nextBmr = Math.round(bmr);
    if (!Number.isFinite(nextBmr) || nextBmr <= 0) return;

    const prevBmr = Number(localStorage.getItem(STORAGE_KEYS.USER_BMR)) || 0;
    if (prevBmr === nextBmr) return;

    localStorage.setItem(STORAGE_KEYS.USER_BMR, String(nextBmr));

    const token = this.getStoredToken();
    if (!token) return;

    const todayKey = formatLocalDateKey(new Date());
    const storedSyncDateKey = localStorage.getItem(STORAGE_KEYS.SYNC_DATE_KEY);
    const storedIsToday = localStorage.getItem(STORAGE_KEYS.IS_TODAY);
    let changed = false;

    const lastSyncMs = Number(localStorage.getItem(STORAGE_KEYS.LAST_SYNC_MS)) || Date.now();
    const syncRefDate = new Date(lastSyncMs);
    const startOfSyncDay = new Date(
      syncRefDate.getFullYear(),
      syncRefDate.getMonth(),
      syncRefDate.getDate(),
      0,
      0,
      0,
      0,
    );
    const dayFraction = Math.min(
      1,
      Math.max(0, (syncRefDate.getTime() - startOfSyncDay.getTime()) / 86400000),
    );

    if (storedSyncDateKey === todayKey && storedIsToday !== 'false') {
      const totalKcal = Math.max(0, Number(localStorage.getItem(STORAGE_KEYS.KCAL_TOTAL)) || 0);
      const nextActiveKcal =
        totalKcal > 0 ? Math.max(0, Math.round(totalKcal - nextBmr * dayFraction)) : 0;
      localStorage.setItem(STORAGE_KEYS.KCAL, String(nextActiveKcal));
      changed = true;
    }

    const storedHistory = loadStoredHistory(todayKey);
    if (storedHistory.length > 0) {
      const updatedHistory = storedHistory.map(day => {
        const fraction = day.isToday ? dayFraction : 1;
        const activeCalories =
          day.totalCalories > 0
            ? Math.max(0, Math.round(day.totalCalories - nextBmr * fraction))
            : 0;
        return { ...day, activeCalories };
      });
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updatedHistory));
      changed = true;
    }

    if (changed) {
      window.dispatchEvent(new Event('wearable_sync_updated'));
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
