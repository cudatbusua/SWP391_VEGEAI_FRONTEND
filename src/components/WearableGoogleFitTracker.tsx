import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Watch,
  Flame,
  Footprints,
  RefreshCw,
  Sparkles,
  Link2,
  Unlink,
  Info,
  Smartphone,
  Route,
  Timer,
  Activity,
  CalendarDays,
  AlertCircle,
  Check,
  X,
} from 'lucide-react';
import { sfx } from '../utils/soundEffects';
import { wearableService } from '../utils/wearableService';
import type {
  DailyActivityRecord,
  GoogleFitSyncResult,
  WearableMetrics,
} from '../utils/wearableService';

const LIVE_SYNC_DURATION_SEC = 15;
const LIVE_SYNC_POLL_STEP_SEC = 5;

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

type ChartMetricKey = 'steps' | 'calories' | 'distance';

interface WearableTrackerProps {
  plannedCalorieIntake?: number;
  userBmr?: number;
  userTdee?: number;
  isCustomCalorieTarget?: boolean;
  onSyncMetrics?: (metrics: {
    steps: number;
    calories: number;
    totalCalories?: number;
    distanceKm?: number;
  }) => void;
}

interface MetricCardProps {
  title: string;
  icon: React.ReactNode;
  /** null = not connected/synced yet (renders an em dash) */
  value: string | null;
  unit: string;
  valueClass: string;
  note?: string;
  children?: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  icon,
  value,
  unit,
  valueClass,
  note,
  children,
}) => (
  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#182230] border border-slate-200/80 dark:border-slate-800 space-y-2">
    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
      <span className="text-xs font-bold">{title}</span>
      {icon}
    </div>
    <div
      className={`text-2xl font-black tabular-nums flex items-baseline gap-1 ${
        value === null ? 'text-slate-300 dark:text-slate-600' : valueClass
      }`}
    >
      <span>{value ?? '—'}</span>
      {value !== null && unit && <span className="text-xs font-bold text-slate-400">{unit}</span>}
    </div>
    {children}
    {note && <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{note}</p>}
  </div>
);

function buildFallbackSevenDaySkeleton(stepTarget: number): DailyActivityRecord[] {
  const now = new Date();
  const list: DailyActivityRecord[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset, 0, 0, 0, 0);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dow = d.getDay();
    list.push({
      dateKey: `${y}-${m}-${day}`,
      weekdayLabel: SHORT_WEEKDAYS[dow],
      fullWeekdayLabel: FULL_WEEKDAYS[dow],
      shortDateLabel: `${day}/${m}`,
      isToday: offset === 0,
      steps: 0,
      stepTarget,
      totalCalories: 0,
      activeCalories: 0,
      distanceKm: 0,
      activeMinutes: 0,
      heartPoints: 0,
      hasActivityData: false,
    });
  }
  return list;
}

function formatCompactChartValue(metric: ChartMetricKey, day: DailyActivityRecord): string {
  if (metric === 'steps') {
    if (day.steps >= 10000) {
      return `${(day.steps / 1000).toFixed(1).replace('.', ',')}k`;
    }
    return day.steps.toLocaleString('vi-VN');
  }
  if (metric === 'calories') {
    return day.totalCalories.toLocaleString('vi-VN');
  }
  return day.distanceKm.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
}

interface DailyGoalRingProps {
  stepRatio: number;
  calorieRatio: number;
  distanceRatio: number;
  goalMet: boolean;
  muted: boolean;
  isSelected: boolean;
}

const DailyGoalRing: React.FC<DailyGoalRingProps> = ({
  stepRatio,
  calorieRatio,
  distanceRatio,
  goalMet,
  muted,
  isSelected,
}) => {
  const outerR = 20.5;
  const middleR = 15.6;
  const innerR = 11;
  const outerC = 2 * Math.PI * outerR;
  const middleC = 2 * Math.PI * middleR;
  const innerC = 2 * Math.PI * innerR;
  const outerPct = Math.min(1, Math.max(0, stepRatio));
  const middlePct = Math.min(1, Math.max(0, calorieRatio));
  const innerPct = Math.min(1, Math.max(0, distanceRatio));

  return (
    <div className="relative w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center">
      <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90" aria-hidden="true">
        {/* Outer ring (Steps — Emerald) */}
        <circle
          cx="24"
          cy="24"
          r={outerR}
          fill="none"
          strokeWidth="3.2"
          className={
            muted
              ? 'stroke-slate-200/80 dark:stroke-slate-800'
              : 'stroke-slate-200 dark:stroke-slate-700/80'
          }
        />
        {!muted && outerPct > 0 && (
          <circle
            cx="24"
            cy="24"
            r={outerR}
            fill="none"
            strokeWidth="3.2"
            strokeLinecap="round"
            stroke={goalMet ? '#059669' : '#10b981'}
            strokeDasharray={outerC}
            strokeDashoffset={outerC * (1 - outerPct)}
            className="transition-all duration-500"
          />
        )}

        {/* Middle ring (Calories Burned vs. TDEE — Amber) */}
        <circle
          cx="24"
          cy="24"
          r={middleR}
          fill="none"
          strokeWidth="3.0"
          className={
            muted
              ? 'stroke-slate-200/60 dark:stroke-slate-800/80'
              : 'stroke-slate-200/80 dark:stroke-slate-700/65'
          }
        />
        {!muted && middlePct > 0 && (
          <circle
            cx="24"
            cy="24"
            r={middleR}
            fill="none"
            strokeWidth="3.0"
            strokeLinecap="round"
            stroke={calorieRatio >= 1 ? '#d97706' : '#f59e0b'}
            strokeDasharray={middleC}
            strokeDashoffset={middleC * (1 - middlePct)}
            className="transition-all duration-500"
          />
        )}

        {/* Inner ring (Distance / Movement — Cyan) */}
        <circle
          cx="24"
          cy="24"
          r={innerR}
          fill="none"
          strokeWidth="2.8"
          className={
            muted
              ? 'stroke-slate-200/45 dark:stroke-slate-800/65'
              : 'stroke-slate-200/65 dark:stroke-slate-700/50'
          }
        />
        {!muted && innerPct > 0 && (
          <circle
            cx="24"
            cy="24"
            r={innerR}
            fill="none"
            strokeWidth="2.8"
            strokeLinecap="round"
            stroke={isSelected ? '#0284c7' : '#06b6d4'}
            strokeDasharray={innerC}
            strokeDashoffset={innerC * (1 - innerPct)}
            className="transition-all duration-500"
          />
        )}
      </svg>

      {/* Center indicator */}
      {!muted && goalMet ? (
        <span className="absolute inset-0 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </span>
      ) : muted ? (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-300 dark:text-slate-600">
          —
        </span>
      ) : null}
    </div>
  );
};

export const WearableGoogleFitTracker: React.FC<WearableTrackerProps> = ({
  plannedCalorieIntake = 0,
  userBmr = 0,
  userTdee = 0,
  isCustomCalorieTarget = false,
  onSyncMetrics,
}) => {
  const [metrics, setMetrics] = useState<WearableMetrics>(() => wearableService.getMetrics());
  const [isSyncing, setIsSyncing] = useState(false);
  const [liveSyncSecondsLeft, setLiveSyncSecondsLeft] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showHubInfo, setShowHubInfo] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<
    'phone' | 'apple' | 'samsung' | 'xiaomi' | 'garmin'
  >('phone');
  const [chartMetric, setChartMetric] = useState<ChartMetricKey>('steps');
  const [selectedDateKey, setSelectedDateKey] = useState<string>('');

  const liveTimerRef = useRef<number | null>(null);
  const liveSyncRunIdRef = useRef<number>(0);

  const stopLiveSyncWindow = useCallback(() => {
    liveSyncRunIdRef.current += 1;
    if (liveTimerRef.current !== null) {
      window.clearInterval(liveTimerRef.current);
      liveTimerRef.current = null;
    }
    setLiveSyncSecondsLeft(0);
  }, []);

  useEffect(() => () => stopLiveSyncWindow(), [stopLiveSyncWindow]);

  // BMR must be known before sync so Google Fit total kcal can be split into basal vs. active
  useEffect(() => {
    wearableService.setUserBmr(userBmr);
  }, [userBmr]);

  // Auto-sync live metrics on page load/refresh and when returning to the tab/app
  useEffect(() => {
    const token = wearableService.getStoredToken();
    if (token) {
      wearableService.fetchGoogleFitLive(token, { includeHistory: true }).catch(err => {
        console.warn('Background auto-sync with Google Fit:', err);
        if (err?.message?.includes('hết hạn')) {
          setErrorMessage(err.message);
        }
      });
    }

    const triggerAutoRefreshOnReturn = () => {
      if (document.visibilityState !== 'visible') return;
      const latestToken = wearableService.getStoredToken();
      if (latestToken && wearableService.shouldAutoSync()) {
        wearableService.fetchGoogleFitLive(latestToken, { includeHistory: true }).catch(err => {
          console.warn('Return auto-sync with Google Fit:', err);
        });
      }
    };

    document.addEventListener('visibilitychange', triggerAutoRefreshOnReturn);
    window.addEventListener('focus', triggerAutoRefreshOnReturn);
    return () => {
      document.removeEventListener('visibilitychange', triggerAutoRefreshOnReturn);
      window.removeEventListener('focus', triggerAutoRefreshOnReturn);
    };
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      const updated = wearableService.getMetrics();
      setMetrics(updated);
      onSyncMetrics?.({
        steps: updated.steps,
        calories: updated.todayActiveCalories,
        totalCalories: updated.totalCaloriesExpended,
        distanceKm: updated.distanceKm,
      });
    };
    window.addEventListener('wearable_sync_updated', handleUpdate);
    window.addEventListener('user_profile_updated', handleUpdate);
    return () => {
      window.removeEventListener('wearable_sync_updated', handleUpdate);
      window.removeEventListener('user_profile_updated', handleUpdate);
    };
  }, [onSyncMetrics]);

  /**
   * Starts a quiet 15-second Live Sync window right after connecting or clicking "Đồng bộ ngay":
   * polls today's exact snapshot at t = 5s, 10s, and 15s, updating today's cards & 7-day map in place.
   */
  const startAutoLiveSyncWindow = useCallback(() => {
    stopLiveSyncWindow();
    const runId = liveSyncRunIdRef.current;
    setLiveSyncSecondsLeft(LIVE_SYNC_DURATION_SEC);

    let elapsedSec = 0;
    liveTimerRef.current = window.setInterval(() => {
      elapsedSec += 1;
      const remaining = Math.max(0, LIVE_SYNC_DURATION_SEC - elapsedSec);
      const isFinalTick = elapsedSec >= LIVE_SYNC_DURATION_SEC;
      setLiveSyncSecondsLeft(remaining);

      if (isFinalTick && liveTimerRef.current !== null) {
        window.clearInterval(liveTimerRef.current);
        liveTimerRef.current = null;
      }

      if (elapsedSec % LIVE_SYNC_POLL_STEP_SEC === 0 || isFinalTick) {
        const latestToken = wearableService.getStoredToken();
        if (!latestToken) {
          stopLiveSyncWindow();
          return;
        }
        wearableService
          .fetchGoogleFitLive(latestToken, { includeHistory: false })
          .catch((err: any) => {
            if (liveSyncRunIdRef.current !== runId) return;
            console.warn('Auto Live Sync poll error:', err);
            if (err?.message?.includes('hết hạn')) {
              stopLiveSyncWindow();
              setErrorMessage(err.message);
            }
          });
      }
    }, 1000);
  }, [stopLiveSyncWindow]);

  // Sanitize incoming numeric props so NaN/negative/undefined values can never distort charts or balances
  const safePlannedIntake =
    Number.isFinite(plannedCalorieIntake) && plannedCalorieIntake > 0
      ? Math.round(plannedCalorieIntake)
      : 0;
  const safeUserBmr = Number.isFinite(userBmr) && userBmr > 0 ? Math.round(userBmr) : 0;
  const safeUserTdee = Number.isFinite(userTdee) && userTdee > 0 ? Math.round(userTdee) : 0;

  // Unified expenditure baseline matching AccountSettingsPage (TDEE + todayActiveCalories, avoiding double-counting BMR)
  const baseDailyExpenditure = safeUserTdee > 0 ? safeUserTdee : safeUserBmr;
  const scientificTdee =
    safeUserTdee > 0 ? safeUserTdee : safeUserBmr > 0 ? Math.round(safeUserBmr * 1.375) : 0;
  const usingCustomCalorieGoal = Boolean(isCustomCalorieTarget && safePlannedIntake > 0);
  // Dynamically follow the user's active profile target:
  // - Custom slider override -> reflect the user's chosen personal calorie target immediately (no refresh needed)
  // - Scientific default -> use the profile's computed TDEE
  const calorieBurnGoal = usingCustomCalorieGoal
    ? safePlannedIntake
    : scientificTdee > 0
    ? scientificTdee
    : safePlannedIntake > 0
    ? safePlannedIntake
    : 2000;
  const distanceGoalKm = 5;

  const todayActiveBurn = Math.max(0, Number(metrics?.todayActiveCalories) || 0);
  const totalCaloriesBurned =
    baseDailyExpenditure > 0 || todayActiveBurn > 0 ? baseDailyExpenditure + todayActiveBurn : 0;
  const netCalorieBalance =
    safePlannedIntake > 0 && totalCaloriesBurned > 0
      ? Math.round(safePlannedIntake - totalCaloriesBurned)
      : null;

  const handleConnectOAuth = async () => {
    sfx.playTap();
    stopLiveSyncWindow();
    setIsSyncing(true);
    setErrorMessage('');
    try {
      const token = await wearableService.openGoogleFitAuthPopup();
      const live: GoogleFitSyncResult = await wearableService.fetchGoogleFitLive(token, {
        includeHistory: true,
      });
      if (Array.isArray(live?.dailyHistory) && live.dailyHistory.length > 0) {
        setSelectedDateKey(live.dailyHistory[live.dailyHistory.length - 1].dateKey);
      }
      sfx.playSuccess();
      startAutoLiveSyncWindow();
    } catch (err: any) {
      console.warn('OAuth connect info:', err);
      setErrorMessage(
        err.message || 'Không thể kết nối tài khoản Google Fit lúc này. Vui lòng thử lại.',
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncLive = async () => {
    sfx.playTap();
    const token = wearableService.getStoredToken();
    if (!token) {
      handleConnectOAuth();
      return;
    }

    stopLiveSyncWindow();
    setIsSyncing(true);
    setErrorMessage('');
    try {
      await wearableService.fetchGoogleFitLive(token, { includeHistory: true });
      sfx.playSuccess();
      startAutoLiveSyncWindow();
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Chưa thể cập nhật dữ liệu từ Google Fit. Vui lòng thử lại sau.',
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = () => {
    sfx.playTap();
    stopLiveSyncWindow();
    setErrorMessage('');
    setSelectedDateKey('');
    wearableService.disconnect();
  };

  const isAutoLiveSyncing = liveSyncSecondsLeft > 0;
  const safeSteps = Math.max(0, Number(metrics?.steps) || 0);
  const safeStepTarget = Math.max(1, Number(metrics?.stepTarget) || 10000);
  const safeTotalCalories = Math.max(0, Number(metrics?.totalCaloriesExpended) || 0);
  const safeActiveCalories = Math.max(0, Number(metrics?.activeCalories) || 0);
  const safeDistanceKm = Math.max(0, Number(metrics?.distanceKm) || 0);
  const safeActiveMinutes = Math.max(0, Number(metrics?.activeMinutes) || 0);
  const safeHeartPoints = Math.max(0, Number(metrics?.heartPoints) || 0);
  const showSyncedNumbers = Boolean(metrics?.isConnected && (metrics?.hasSyncedToday ?? metrics?.isTodayData));
  const pendingSyncNote = metrics?.isConnected
    ? isSyncing
      ? 'Đang đồng bộ...'
      : 'Bấm Đồng bộ ngay để cập nhật'
    : 'Liên kết để đồng bộ';

  const sevenDays = useMemo(() => {
    const history = Array.isArray(metrics?.dailyHistory) ? metrics.dailyHistory : [];
    if (metrics?.isConnected && history.length === 7) {
      return history;
    }
    return buildFallbackSevenDaySkeleton(safeStepTarget);
  }, [metrics?.isConnected, metrics?.dailyHistory, safeStepTarget]);

  const activeDay = useMemo(() => {
    const found = sevenDays.find(d => d.dateKey === selectedDateKey);
    return found || sevenDays[sevenDays.length - 1];
  }, [sevenDays, selectedDateKey]);

  const chartGoalValue =
    chartMetric === 'steps'
      ? safeStepTarget
      : chartMetric === 'calories'
      ? calorieBurnGoal
      : distanceGoalKm;

  const maxChartValue = useMemo(() => {
    const vals = sevenDays.map(d =>
      chartMetric === 'steps'
        ? d.steps
        : chartMetric === 'calories'
        ? d.totalCalories
        : d.distanceKm,
    );
    const peak = Math.max(...vals, 0);
    return Math.max(peak, chartGoalValue, 1);
  }, [sevenDays, chartMetric, chartGoalValue]);

  const goalsMetCount = useMemo(
    () => sevenDays.filter(d => d.steps >= d.stepTarget).length,
    [sevenDays],
  );

  const calorieGoalsMetCount = useMemo(
    () => sevenDays.filter(d => d.totalCalories >= calorieBurnGoal).length,
    [sevenDays, calorieBurnGoal],
  );

  const totalWeekSteps = useMemo(
    () => sevenDays.reduce((sum, d) => sum + d.steps, 0),
    [sevenDays],
  );

  const totalWeekDistanceKm = useMemo(
    () => Math.round(sevenDays.reduce((sum, d) => sum + d.distanceKm, 0) * 100) / 100,
    [sevenDays],
  );

  const selectedDayIntakeDelta =
    activeDay && !activeDay.isToday && activeDay.totalCalories > 0 && safePlannedIntake > 0
      ? Math.round(safePlannedIntake - activeDay.totalCalories)
      : null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shrink-0">
            <Watch className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Đồng Bộ Vận Động Google Fit
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                  metrics.isConnected
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    metrics.isConnected ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                />
                {metrics.isConnected ? 'Đã liên kết' : 'Chưa kết nối'}
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span>
                {metrics.isConnected ? (
                  <>
                    <strong className="text-slate-700 dark:text-slate-200 font-semibold">
                      {metrics.deviceModel}
                    </strong>{' '}
                    · Cập nhật {metrics.lastSyncedAt}
                  </>
                ) : (
                  'Kết nối Google Fit để theo dõi vận động hằng ngày'
                )}
              </span>
              <button
                type="button"
                onClick={() => setShowHubInfo(prev => !prev)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                <Info className="w-3.5 h-3.5" />
                <span>Hướng dẫn kết nối</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {metrics.isConnected ? (
            <>
              <button
                type="button"
                onClick={handleSyncLive}
                disabled={isSyncing}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 ${
                  isAutoLiveSyncing
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-300/70 dark:ring-emerald-700'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                }`}
                title="Đồng bộ số liệu mới nhất ngay tại thời điểm hiện tại"
              >
                {isAutoLiveSyncing && !isSyncing ? (
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                ) : (
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                )}
                <span>
                  {isSyncing
                    ? 'Đang đồng bộ...'
                    : isAutoLiveSyncing
                    ? `Live Sync (${liveSyncSecondsLeft}s)`
                    : 'Đồng bộ ngay'}
                </span>
              </button>
              {isAutoLiveSyncing && (
                <button
                  type="button"
                  onClick={stopLiveSyncWindow}
                  className="inline-flex items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Dừng Live Sync sớm"
                  aria-label="Dừng Live Sync sớm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={handleDisconnect}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition cursor-pointer"
                title="Ngắt liên kết tài khoản Google Fit"
              >
                <Unlink className="w-3.5 h-3.5" />
                <span>Ngắt kết nối</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleConnectOAuth}
              disabled={isSyncing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer shadow-emerald-700/20 disabled:opacity-50"
            >
              <Link2 className="w-4 h-4" />
              <span>{isSyncing ? 'Đang kết nối...' : 'Liên kết Google Fit'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Device Connection Guide (only opens on demand) */}
      {showHubInfo && (
        <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-slate-800/70 border border-emerald-200 dark:border-emerald-800/70 text-[11px] text-slate-800 dark:text-slate-200 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between font-extrabold text-xs border-b border-emerald-200/80 dark:border-slate-700 pb-2">
            <span className="flex items-center gap-1.5 text-emerald-900 dark:text-emerald-300">
              <Sparkles className="w-4 h-4 text-emerald-600" /> Hướng dẫn kết nối thiết bị qua Google Fit
            </span>
            <button
              type="button"
              onClick={() => setShowHubInfo(false)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer p-0.5 rounded transition"
              aria-label="Đóng hướng dẫn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['phone', 'Chỉ dùng Điện thoại', Smartphone],
                ['apple', 'Apple Watch / iOS', Watch],
                ['samsung', 'Samsung Galaxy', Watch],
                ['xiaomi', 'Xiaomi / Amazfit', Watch],
                ['garmin', 'Garmin / Fitbit / Khác', Watch],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveGuideTab(key)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                  activeGuideTab === key
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-slate-700 border border-emerald-200/80 dark:border-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {activeGuideTab === 'phone' && (
            <ol className="list-decimal pl-4 space-y-1 font-medium leading-relaxed text-slate-700 dark:text-slate-300">
              <li>Tải app <strong>Google Fit</strong> (Google Play / App Store) và đăng nhập tài khoản Google.</li>
              <li>Bật quyền <em>Hoạt động thể chất</em> để điện thoại tự đếm bước chân, quãng đường và calo.</li>
              <li>Bấm <strong>Liên kết Google Fit</strong> hoặc <strong>Đồng bộ ngay</strong> trên VEGEAI.</li>
            </ol>
          )}
          {activeGuideTab === 'apple' && (
            <ol className="list-decimal pl-4 space-y-1 font-medium leading-relaxed text-slate-700 dark:text-slate-300">
              <li>Apple Watch tự đồng bộ bước chân và calo vào <strong>Apple Health</strong> trên iPhone.</li>
              <li>Mở <strong>Google Fit</strong> trên iPhone và cấp quyền đọc dữ liệu từ <strong>Apple Health</strong>.</li>
              <li>Bấm <strong>Đồng bộ ngay</strong> trên VEGEAI để cập nhật số liệu mới nhất.</li>
            </ol>
          )}
          {activeGuideTab === 'samsung' && (
            <ol className="list-decimal pl-4 space-y-1 font-medium leading-relaxed text-slate-700 dark:text-slate-300">
              <li>Mở <strong>Samsung Health</strong> &gt; Cài đặt &gt; <strong>Health Connect</strong> và bật chia sẻ vận động.</li>
              <li>Cho phép <strong>Google Fit</strong> đọc từ Health Connect, sau đó bấm <strong>Đồng bộ ngay</strong>.</li>
            </ol>
          )}
          {activeGuideTab === 'xiaomi' && (
            <ol className="list-decimal pl-4 space-y-1 font-medium leading-relaxed text-slate-700 dark:text-slate-300">
              <li>Mở <strong>Mi Fitness</strong> / <strong>Zepp Life</strong> &gt; Hồ sơ &gt; <strong>Health Connect</strong> và bật đồng bộ.</li>
              <li>Cho phép <strong>Google Fit</strong> đọc dữ liệu từ Health Connect, sau đó bấm <strong>Đồng bộ ngay</strong>.</li>
            </ol>
          )}
          {activeGuideTab === 'garmin' && (
            <p className="font-medium leading-relaxed text-slate-700 dark:text-slate-300">
              Bật chia sẻ dữ liệu vận động sang <strong>Health Connect (Android)</strong> hoặc <strong>Apple Health (iOS)</strong>, liên kết vào <strong>Google Fit</strong> rồi bấm <strong>Đồng bộ ngay</strong>.
            </p>
          )}
        </div>
      )}

      {/* Error-only alert (no noisy persistent sync banners) */}
      {errorMessage && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between gap-3 animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="text-rose-700 dark:text-rose-300 hover:underline font-bold text-[11px] cursor-pointer shrink-0"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Core Today Metrics (3 unified cards — exact live snapshot at sync time, including 0) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Bước chân hôm nay"
          icon={<Footprints className="w-4 h-4 text-emerald-600" />}
          value={showSyncedNumbers ? safeSteps.toLocaleString('vi-VN') : null}
          unit="bước"
          valueClass="text-slate-900 dark:text-white"
          note={
            showSyncedNumbers
              ? `Mục tiêu ${safeStepTarget.toLocaleString('vi-VN')} bước (${Math.round(
                  (safeSteps / safeStepTarget) * 100,
                )}%)`
              : pendingSyncNote
          }
        >
          {showSyncedNumbers && (
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (safeSteps / safeStepTarget) * 100)}%` }}
              />
            </div>
          )}
        </MetricCard>

        <MetricCard
          title="Tổng tiêu hao hôm nay"
          icon={<Flame className="w-4 h-4 text-amber-500" />}
          value={showSyncedNumbers ? safeTotalCalories.toLocaleString('vi-VN') : null}
          unit="kcal"
          valueClass="text-amber-500"
          note={
            showSyncedNumbers
              ? safeActiveCalories > 0
                ? `Vận động: +${safeActiveCalories.toLocaleString('vi-VN')} kcal`
                : 'Tính từ 00:00 hôm nay (gồm BMR)'
              : pendingSyncNote
          }
        />

        <MetricCard
          title="Quãng đường hôm nay"
          icon={<Route className="w-4 h-4 text-cyan-600" />}
          value={showSyncedNumbers ? safeDistanceKm.toLocaleString('vi-VN') : null}
          unit="km"
          valueClass="text-slate-900 dark:text-white"
          note={
            showSyncedNumbers
              ? safeActiveMinutes === 0 && safeHeartPoints === 0
                ? 'Tính từ 00:00 hôm nay'
                : undefined
              : pendingSyncNote
          }
        >
          {showSyncedNumbers && (safeActiveMinutes > 0 || safeHeartPoints > 0) && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {safeActiveMinutes > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200/70 dark:border-cyan-800 text-[11px] font-bold">
                  <Timer className="w-3 h-3" />
                  {safeActiveMinutes} phút
                </span>
              )}
              {safeHeartPoints > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 border border-rose-200/70 dark:border-rose-800 text-[11px] font-bold">
                  <Activity className="w-3 h-3" />
                  {safeHeartPoints} Heart Pts
                </span>
              )}
            </div>
          )}
        </MetricCard>
      </div>

      {/* Last 7 Days Daily Goals & Activity Map (Google Fit "Your Daily Goals · Last 7 Days" style) */}
      <section
        aria-label="Lịch biểu vận động 7 ngày gần nhất"
        className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 dark:bg-[#182230] border border-slate-200/80 dark:border-slate-800 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                Mục tiêu hằng ngày · 7 ngày gần nhất
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {!metrics.isConnected ? (
                  'Hiển thị bước chân, tiêu hao và quãng đường sau khi liên kết'
                ) : chartMetric === 'calories' ? (
                  <>
                    {usingCustomCalorieGoal ? 'Mục tiêu tùy chỉnh:' : 'Mốc TDEE hồ sơ:'}{' '}
                    <strong className="text-amber-600 dark:text-amber-400 tabular-nums">
                      {calorieBurnGoal.toLocaleString('vi-VN')} kcal
                    </strong>
                    {' · '}
                    <strong className="text-slate-700 dark:text-slate-200">
                      {calorieGoalsMetCount}/7
                    </strong>{' '}
                    ngày đạt mốc
                    {usingCustomCalorieGoal && scientificTdee > 0 && (
                      <>
                        {' · '}TDEE hồ sơ{' '}
                        <strong className="text-slate-700 dark:text-slate-200 tabular-nums">
                          {scientificTdee.toLocaleString('vi-VN')} kcal
                        </strong>
                      </>
                    )}
                    {!usingCustomCalorieGoal &&
                      safePlannedIntake > 0 &&
                      safePlannedIntake !== calorieBurnGoal && (
                        <>
                          {' · '}Nạp mục tiêu{' '}
                          <strong className="text-slate-700 dark:text-slate-200 tabular-nums">
                            {safePlannedIntake.toLocaleString('vi-VN')} kcal
                          </strong>
                        </>
                      )}
                  </>
                ) : chartMetric === 'distance' ? (
                  <>
                    Mốc vận động{' '}
                    <strong className="text-cyan-700 dark:text-cyan-400">
                      {distanceGoalKm} km/ngày
                    </strong>{' '}
                    · Tổng 7 ngày{' '}
                    <strong className="text-slate-700 dark:text-slate-200 tabular-nums">
                      {totalWeekDistanceKm.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} km
                    </strong>
                  </>
                ) : (
                  <>
                    <strong className="text-emerald-700 dark:text-emerald-400">
                      {goalsMetCount}/7
                    </strong>{' '}
                    ngày đạt {safeStepTarget.toLocaleString('vi-VN')} bước · Tổng{' '}
                    <strong className="text-slate-700 dark:text-slate-200 tabular-nums">
                      {totalWeekSteps.toLocaleString('vi-VN')}
                    </strong>{' '}
                    bước
                  </>
                )}
              </p>
            </div>
          </div>

          {metrics.isConnected && (
            <div className="inline-flex p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 self-start sm:self-auto">
              {(
                [
                  ['steps', 'Bước chân'],
                  ['calories', 'Tiêu hao'],
                  ['distance', 'Quãng đường'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    sfx.playTap();
                    setChartMetric(key);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    chartMetric === key
                      ? key === 'steps'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : key === 'calories'
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'bg-cyan-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 7-Day Visual Map (Bars + Concentric Daily Goal Rings) */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {sevenDays.map(day => {
            const isSelected = metrics.isConnected && activeDay?.dateKey === day.dateKey;
            const val =
              chartMetric === 'steps'
                ? day.steps
                : chartMetric === 'calories'
                ? day.totalCalories
                : day.distanceKm;
            const barPct =
              metrics.isConnected && val > 0
                ? Math.min(100, Math.max(10, Math.round((val / maxChartValue) * 100)))
                : 0;
            const stepRatio = day.stepTarget > 0 ? day.steps / day.stepTarget : 0;
            const calorieRatio = calorieBurnGoal > 0 ? day.totalCalories / calorieBurnGoal : 0;
            const distanceRatio =
              day.distanceKm > 0
                ? day.distanceKm / distanceGoalKm
                : day.activeMinutes > 0
                ? day.activeMinutes / 30
                : 0;
            const goalMet = day.steps >= day.stepTarget;
            const goalLinePct =
              maxChartValue > chartGoalValue
                ? Math.round((chartGoalValue / maxChartValue) * 100)
                : null;

            const barColorClass =
              chartMetric === 'steps'
                ? goalMet
                  ? 'bg-emerald-600 dark:bg-emerald-400'
                  : 'bg-emerald-500/85 dark:bg-emerald-500'
                : chartMetric === 'calories'
                ? calorieRatio >= 1
                  ? 'bg-amber-600 dark:bg-amber-400'
                  : 'bg-amber-500/85 dark:bg-amber-500'
                : 'bg-cyan-500 dark:bg-cyan-400';

            return (
              <button
                key={day.dateKey}
                type="button"
                disabled={!metrics.isConnected}
                onClick={() => {
                  sfx.playTap();
                  setSelectedDateKey(day.dateKey);
                }}
                aria-pressed={isSelected}
                className={`group flex flex-col items-center gap-1.5 p-1.5 sm:p-2.5 rounded-2xl border transition ${
                  metrics.isConnected ? 'cursor-pointer' : 'cursor-default opacity-75'
                } ${
                  isSelected
                    ? 'bg-white dark:bg-slate-800/95 border-emerald-400 dark:border-emerald-600 shadow-xs'
                    : day.isToday && metrics.isConnected
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-800/50 hover:bg-white dark:hover:bg-slate-800/70'
                    : 'bg-transparent border-transparent hover:bg-white/80 dark:hover:bg-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700'
                }`}
              >
                {/* Metric value above bar */}
                <span
                  className={`text-[10px] sm:text-[11px] font-bold tabular-nums leading-none truncate max-w-full ${
                    !metrics.isConnected
                      ? 'text-slate-300 dark:text-slate-600'
                      : val > 0
                      ? 'text-slate-700 dark:text-slate-200'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {metrics.isConnected ? formatCompactChartValue(chartMetric, day) : '—'}
                </span>

                {/* Vertical bar scaled against real daily target (Steps / TDEE / 5km) */}
                <div className="relative w-2.5 sm:w-3.5 h-16 sm:h-[72px] rounded-full bg-slate-200/70 dark:bg-slate-800 flex items-end overflow-hidden">
                  {goalLinePct !== null && (
                    <span
                      className="absolute inset-x-0 border-t border-dashed border-slate-400/70 dark:border-slate-500/70 pointer-events-none z-10"
                      style={{ bottom: `${goalLinePct}%` }}
                    />
                  )}
                  <div
                    className={`w-full rounded-full transition-all duration-500 ${barColorClass}`}
                    style={{ height: `${barPct}%` }}
                  />
                </div>

                {/* 3-Ring Daily Goal Indicator (Steps · Calories/TDEE · Distance) */}
                <DailyGoalRing
                  stepRatio={stepRatio}
                  calorieRatio={calorieRatio}
                  distanceRatio={distanceRatio}
                  goalMet={goalMet}
                  muted={!metrics.isConnected}
                  isSelected={isSelected}
                />

                {/* Day & Short Date */}
                <div className="text-center leading-tight">
                  <span
                    className={`block text-[11px] font-extrabold ${
                      day.isToday
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {day.weekdayLabel}
                  </span>
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                    {day.shortDateLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Day Breakdown Row + 3-Ring Legend */}
        {metrics.isConnected && activeDay && (
          <div className="pt-3 border-t border-slate-200/70 dark:border-slate-700/70 space-y-2.5 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {activeDay.fullWeekdayLabel}, {activeDay.shortDateLabel}
                </span>
                {activeDay.isToday && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold">
                    Hôm nay
                  </span>
                )}
                {activeDay.steps >= activeDay.stepTarget && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                    Đạt mục tiêu
                  </span>
                )}
                {selectedDayIntakeDelta !== null && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                      selectedDayIntakeDelta <= 0
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                    }`}
                    title={`Đối chiếu mục tiêu nạp ${safePlannedIntake.toLocaleString('vi-VN')} kcal với tiêu hao thực tế Google Fit`}
                  >
                    So với nạp {safePlannedIntake.toLocaleString('vi-VN')}:{' '}
                    {selectedDayIntakeDelta > 0
                      ? `+${selectedDayIntakeDelta.toLocaleString('vi-VN')}`
                      : selectedDayIntakeDelta.toLocaleString('vi-VN')}{' '}
                    kcal
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600 dark:text-slate-300 tabular-nums">
                <span className="inline-flex items-center gap-1">
                  <Footprints className="w-3.5 h-3.5 text-emerald-600" />
                  <strong className="text-slate-900 dark:text-white">
                    {activeDay.steps.toLocaleString('vi-VN')}
                  </strong>{' '}
                  bước
                </span>
                <span className="inline-flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <strong className="text-slate-900 dark:text-white">
                    {activeDay.totalCalories.toLocaleString('vi-VN')}
                  </strong>
                  <span className="text-slate-400">
                    /{calorieBurnGoal.toLocaleString('vi-VN')}
                  </span>{' '}
                  kcal
                </span>
                <span className="inline-flex items-center gap-1">
                  <Route className="w-3.5 h-3.5 text-cyan-600" />
                  <strong className="text-slate-900 dark:text-white">
                    {activeDay.distanceKm.toLocaleString('vi-VN')}
                  </strong>{' '}
                  km
                </span>
                {activeDay.activeMinutes > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-cyan-700 dark:text-cyan-300 font-semibold">
                    <Timer className="w-3 h-3" />
                    {activeDay.activeMinutes} phút
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-400 dark:text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Vòng ngoài: Bước chân ({safeStepTarget.toLocaleString('vi-VN')})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Vòng giữa: Tiêu hao / {usingCustomCalorieGoal ? 'Mục tiêu' : 'TDEE'} (
                {calorieBurnGoal.toLocaleString('vi-VN')} kcal)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                Vòng trong: Quãng đường ({distanceGoalKm} km)
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Compact Nutrition Advice & Calorie Balance Footer */}
      <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2.5">
        <div className="flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {metrics.aiAdvice}
          </p>
        </div>
        <div className="pt-2 border-t border-emerald-200/50 dark:border-emerald-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
          <span>
            Gợi ý bữa phụ:{' '}
            <strong className="text-emerald-800 dark:text-emerald-300 font-bold">
              {metrics.recommendedSnack}
            </strong>
          </span>
          <span>
            Cân bằng calo dự kiến:{' '}
            {netCalorieBalance !== null ? (
              <strong
                className={
                  netCalorieBalance <= 0
                    ? 'text-emerald-600 font-bold'
                    : 'text-amber-600 font-bold'
                }
              >
                {netCalorieBalance > 0 ? `+${netCalorieBalance}` : netCalorieBalance} kcal
              </strong>
            ) : (
              <span className="text-slate-400 font-normal">Chưa thiết lập mục tiêu</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
