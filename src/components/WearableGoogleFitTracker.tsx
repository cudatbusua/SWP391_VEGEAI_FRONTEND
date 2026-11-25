import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Watch,
  Flame,
  Footprints,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Link2,
  Unlink,
  Layers,
  Info,
  Smartphone,
  Route,
  Timer,
  Activity
} from 'lucide-react';
import { sfx } from '../utils/soundEffects';
import { wearableService } from '../utils/wearableService';
import type { GoogleFitSyncResult, WearableMetrics } from '../utils/wearableService';

const LIVE_SYNC_DURATION_SEC = 15;
const LIVE_SYNC_POLL_STEP_SEC = 5;

interface WearableTrackerProps {
  plannedCalorieIntake?: number;
  userBmr?: number;
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
  /** null = no data available yet (renders an em dash) */
  value: string | null;
  unit: string;
  valueClass: string;
  note: string;
  children?: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, icon, value, unit, valueClass, note, children }) => (
  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#182230] border border-slate-200/80 dark:border-slate-800 space-y-2">
    <div className="flex items-center justify-between text-slate-500">
      <span className="text-xs font-bold">{title}</span>
      {icon}
    </div>
    <div className={`text-2xl font-black flex items-baseline gap-1 ${value === null ? 'text-slate-300 dark:text-slate-600' : valueClass}`}>
      <span>{value ?? '—'}</span>
      {value !== null && unit && <span className="text-xs font-bold text-slate-400">{unit}</span>}
    </div>
    {children}
    <p className="text-[11px] text-slate-500 leading-snug">{note}</p>
  </div>
);

function buildSnapshotFromMetrics(m: WearableMetrics): string {
  return `${m.steps}|${m.totalCaloriesExpended}|${m.distanceKm}|${m.activeMinutes}|${m.heartPoints}`;
}

function buildSnapshotFromResult(r: GoogleFitSyncResult): string {
  return `${r.steps}|${r.totalCalories}|${r.distanceKm}|${r.activeMinutes}|${r.heartPoints}`;
}

function formatSyncSummary(live: GoogleFitSyncResult): string {
  const parts: string[] = [`${live.steps.toLocaleString('vi-VN')} bước`];
  if (live.totalCalories > 0) {
    const activePart =
      live.isTodayData && live.calories > 0
        ? ` (vận động +${live.calories.toLocaleString('vi-VN')} kcal)`
        : '';
    parts.push(`tổng tiêu hao ${live.totalCalories.toLocaleString('vi-VN')} kcal${activePart}`);
  }
  if (live.distanceKm > 0) {
    parts.push(`${live.distanceKm.toLocaleString('vi-VN')} km`);
  }
  if (live.activeMinutes > 0) {
    parts.push(`${live.activeMinutes} phút vận động`);
  }
  return parts.join(' · ');
}

export const WearableGoogleFitTracker: React.FC<WearableTrackerProps> = ({
  plannedCalorieIntake = 0,
  userBmr = 0,
  onSyncMetrics
}) => {
  const [metrics, setMetrics] = useState<WearableMetrics>(() => wearableService.getMetrics());
  const [isSyncing, setIsSyncing] = useState(false);
  const [liveSyncSecondsLeft, setLiveSyncSecondsLeft] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showArchitectureGuide, setShowArchitectureGuide] = useState(false);
  const [showHubInfo, setShowHubInfo] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'phone' | 'apple' | 'samsung' | 'xiaomi' | 'garmin'>('phone');

  const liveTimerRef = useRef<number | null>(null);
  const liveSyncRunIdRef = useRef<number>(0);
  const baselineSnapshotRef = useRef<string>('');
  const hadUpdateInWindowRef = useRef<boolean>(false);

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

  // Auto-sync live metrics on page load/refresh and when returning to the tab/app ("out ra vô lại")
  useEffect(() => {
    const token = wearableService.getStoredToken();
    if (token) {
      wearableService.fetchGoogleFitLive(token).catch(err => {
        console.warn('Background auto-sync with Google Fit:', err);
        if (err?.message?.includes('hết hạn')) {
          setStatusMessage(err.message);
        }
      });
    }

    const triggerAutoRefreshOnReturn = () => {
      if (document.visibilityState !== 'visible') return;
      const latestToken = wearableService.getStoredToken();
      if (latestToken && wearableService.shouldAutoSync()) {
        wearableService.fetchGoogleFitLive(latestToken).catch(err => {
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
        distanceKm: updated.distanceKm
      });
    };
    window.addEventListener('wearable_sync_updated', handleUpdate);
    return () => window.removeEventListener('wearable_sync_updated', handleUpdate);
  }, [onSyncMetrics]);

  /**
   * Starts a 15-second automatic Live Sync window right after clicking "Đồng bộ ngay":
   * polls Google Fit Cloud at t = 5s, 10s, and 15s, then automatically stops cleanly.
   */
  const startAutoLiveSyncWindow = useCallback(
    (initialLive: GoogleFitSyncResult, initialChanged: boolean) => {
      stopLiveSyncWindow();
      const runId = liveSyncRunIdRef.current;
      hadUpdateInWindowRef.current = initialChanged;
      baselineSnapshotRef.current = buildSnapshotFromResult(initialLive);
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
            .fetchGoogleFitLive(latestToken)
            .then(live => {
              if (liveSyncRunIdRef.current !== runId) return;
              const nextSnap = buildSnapshotFromResult(live);
              if (nextSnap !== baselineSnapshotRef.current) {
                hadUpdateInWindowRef.current = true;
                baselineSnapshotRef.current = nextSnap;
              }
              const timeStr = new Date().toLocaleTimeString('vi-VN');
              if (isFinalTick) {
                setStatusMessage(
                  hadUpdateInWindowRef.current
                    ? `Hoàn tất Live Sync lúc ${timeStr} (Google Fit): ${formatSyncSummary(live)}.`
                    : `Đã kiểm tra Google Fit lúc ${timeStr}: ${formatSyncSummary(live)} (chưa có dữ liệu mới trên Google Fit Cloud). Bấm "Đồng bộ ngay" hoặc tải lại trang khi muốn cập nhật tiếp.`
                );
              } else {
                setStatusMessage(
                  `Đang tự động Live Sync với Google Fit (cập nhật lúc ${timeStr}): ${formatSyncSummary(live)}.`
                );
              }
            })
            .catch(err => {
              if (liveSyncRunIdRef.current !== runId) return;
              console.warn('Auto Live Sync poll error:', err);
              if (err?.message?.includes('hết hạn')) {
                stopLiveSyncWindow();
                setStatusMessage(err.message);
              }
            });
        }
      }, 1000);
    },
    [stopLiveSyncWindow]
  );

  const totalCaloriesBurned =
    userBmr > 0 || metrics.todayActiveCalories > 0 ? userBmr + metrics.todayActiveCalories : 0;
  const netCalorieBalance =
    plannedCalorieIntake > 0 && totalCaloriesBurned > 0
      ? plannedCalorieIntake - totalCaloriesBurned
      : null;

  const handleConnectOAuth = async () => {
    sfx.playTap();
    stopLiveSyncWindow();
    setIsSyncing(true);
    setStatusMessage('Đang mở cửa sổ kết nối tài khoản Google Fit...');
    try {
      const token = await wearableService.openGoogleFitAuthPopup();
      setStatusMessage('Kết nối thành công! Đang đồng bộ trực tiếp dữ liệu từ Google Fit...');
      const live = await wearableService.fetchGoogleFitLive(token);
      sfx.playSuccess();
      setStatusMessage(
        `Kết nối thành công · Đang tự động Live Sync (${LIVE_SYNC_DURATION_SEC}s): ${formatSyncSummary(live)}.`
      );
      startAutoLiveSyncWindow(live, true);
    } catch (err: any) {
      console.warn('OAuth connect info:', err);
      setStatusMessage(
        err.message || 'Không thể kết nối với tài khoản Google lúc này. Vui lòng thử lại sau.'
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
    const beforeSnapshot = buildSnapshotFromMetrics(wearableService.getMetrics());
    setIsSyncing(true);
    setStatusMessage('Đang đồng bộ trực tiếp từ Google Fit Cloud...');
    try {
      const live = await wearableService.fetchGoogleFitLive(token);
      const afterSnapshot = buildSnapshotFromResult(live);
      const changedImmediately = afterSnapshot !== beforeSnapshot;
      sfx.playSuccess();
      setStatusMessage(
        `Đang tự động Live Sync (${LIVE_SYNC_DURATION_SEC}s) với Google Fit: ${formatSyncSummary(live)}.`
      );
      startAutoLiveSyncWindow(live, changedImmediately);
    } catch (err: any) {
      setStatusMessage(
        err.message || 'Chưa thể cập nhật dữ liệu từ Google Fit. Vui lòng thử lại sau.'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = () => {
    sfx.playTap();
    stopLiveSyncWindow();
    wearableService.disconnect();
    setStatusMessage('Đã ngắt liên kết và đặt lại dữ liệu Google Fit.');
  };

  const isAutoLiveSyncing = liveSyncSecondsLeft > 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
      {/* Top Banner: Connection & Unified Live Sync */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shrink-0">
            <Watch className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Đồng Bộ Vận Động Google Fit
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border transition ${
                  metrics.isConnected
                    ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    metrics.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                {metrics.isConnected ? 'Đã liên kết Google Fit' : 'Chưa kết nối thiết bị'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2">
              <span>
                Nguồn đồng bộ:{' '}
                <strong className="text-slate-700 dark:text-slate-200">{metrics.deviceModel}</strong> ·{' '}
                {metrics.lastSyncedAt}
              </span>
              <button
                type="button"
                onClick={() => setShowHubInfo(prev => !prev)}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 transition"
                title="Xem hướng dẫn kết nối cho Điện thoại & Thiết bị đeo (Apple Watch, Galaxy, Xiaomi, Garmin...)"
              >
                <Info className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>(i) Hướng dẫn kết nối thiết bị &amp; điện thoại</span>
              </button>
            </p>
            {showHubInfo && (
              <div className="mt-3 p-4 rounded-2xl bg-emerald-50/95 dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-[11px] text-slate-800 dark:text-slate-200 shadow-md space-y-3 animate-in fade-in">
                {/* Header */}
                <div className="flex items-center justify-between font-extrabold text-xs border-b border-emerald-200 dark:border-slate-800 pb-2">
                  <span className="flex items-center gap-1.5 text-emerald-900 dark:text-emerald-300">
                    <Sparkles className="w-4 h-4 text-emerald-600" /> Hướng dẫn đồng bộ dữ liệu vận động qua Google Fit
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowHubInfo(false)}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer px-1.5 py-0.5 rounded text-sm transition"
                  >
                    ✕
                  </button>
                </div>

                <p className="leading-relaxed text-slate-600 dark:text-slate-300">
                  VEGEAI thống nhất 1 nguồn dữ liệu chuẩn duy nhất là <strong>Google Fit Cloud</strong> (tính từ 00:00 sáng nay, lấy trực tiếp các chỉ số Google Fit cập nhật chính xác: <em>Bước chân, Tổng tiêu hao calo, Quãng đường &amp; Phút vận động</em>). Bạn <strong>không bắt buộc</strong> phải có đồng hồ thông minh — hãy chọn thiết bị bạn đang dùng bên dưới:
                </p>

                {/* Device Selector Tabs */}
                <div className="flex flex-wrap gap-1.5 border-b border-emerald-200 dark:border-slate-800 pb-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveGuideTab('phone')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                      activeGuideTab === 'phone'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-slate-700 border border-emerald-200 dark:border-slate-700'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>📱 Chỉ dùng Điện thoại</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveGuideTab('apple')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                      activeGuideTab === 'apple'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-slate-700 border border-emerald-200 dark:border-slate-700'
                    }`}
                  >
                    <Watch className="w-3.5 h-3.5" />
                    <span>🍎 Apple Watch &amp; iOS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveGuideTab('samsung')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                      activeGuideTab === 'samsung'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-slate-700 border border-emerald-200 dark:border-slate-700'
                    }`}
                  >
                    <Watch className="w-3.5 h-3.5" />
                    <span>🔷 Samsung Galaxy Watch</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveGuideTab('xiaomi')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                      activeGuideTab === 'xiaomi'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-slate-700 border border-emerald-200 dark:border-slate-700'
                    }`}
                  >
                    <Watch className="w-3.5 h-3.5" />
                    <span>🟠 Xiaomi / Amazfit / Redmi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveGuideTab('garmin')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                      activeGuideTab === 'garmin'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-slate-700 border border-emerald-200 dark:border-slate-700'
                    }`}
                  >
                    <Watch className="w-3.5 h-3.5" />
                    <span>🏃 Garmin / Fitbit / Huawei / Khác</span>
                  </button>
                </div>

                {/* Tab 1: Phone Only */}
                {activeGuideTab === 'phone' && (
                  <div className="space-y-2 animate-in fade-in">
                    <div className="p-2.5 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 font-medium">
                      💡 <strong>Không cần mua thêm vòng tay hay smartwatch!</strong> Mọi điện thoại đều có sẵn cảm biến chuyển động đếm bước chân, quãng đường và calo tiêu hao khi mang theo bên người.
                    </div>
                    <ol className="list-decimal pl-4 space-y-1 font-medium leading-relaxed">
                      <li>Tải miễn phí app <strong>Google Fit</strong> từ <em>Google Play Store</em> hoặc <em>App Store</em>.</li>
                      <li>Đăng nhập Google Fit bằng tài khoản Google của bạn và bật quyền <em>"Hoạt động thể chất"</em>.</li>
                      <li>Trên VEGEAI, bấm <strong>"Liên kết Google Fit"</strong>. Mỗi khi bấm <strong>"Đồng bộ ngay"</strong>, hệ thống tự động Live Sync 15 giây với Google Fit Cloud để lấy số liệu mới nhất!</li>
                    </ol>
                  </div>
                )}

                {/* Tab 2: Apple Watch */}
                {activeGuideTab === 'apple' && (
                  <div className="space-y-2 animate-in fade-in">
                    <p className="font-semibold text-emerald-900 dark:text-emerald-300">
                      Đồng bộ từ Apple Watch qua Apple Health &gt; Google Fit:
                    </p>
                    <ol className="list-decimal pl-4 space-y-1 font-medium leading-relaxed">
                      <li>Apple Watch tự đẩy dữ liệu bước chân và calo vào ứng dụng <strong>Apple Health (Sức khỏe)</strong> trên iPhone.</li>
                      <li>Mở <strong>Google Fit</strong> trên iPhone và cấp quyền đọc dữ liệu từ <strong>Apple Health</strong>.</li>
                      <li>Trên VEGEAI, bấm <strong>"Đồng bộ ngay"</strong> để kéo dữ liệu tổng hợp từ Google Fit Cloud.</li>
                    </ol>
                  </div>
                )}

                {/* Tab 3: Samsung Galaxy Watch */}
                {activeGuideTab === 'samsung' && (
                  <div className="space-y-2 animate-in fade-in">
                    <p className="font-semibold text-emerald-900 dark:text-emerald-300">
                      Đồng bộ từ Samsung Galaxy Watch qua Health Connect:
                    </p>
                    <ol className="list-decimal pl-4 space-y-1 font-medium leading-relaxed">
                      <li>Mở <strong>Samsung Health</strong> &gt; Cài đặt &gt; <strong>Health Connect</strong>.</li>
                      <li>Bật chia sẻ <em>Số bước, Quãng đường &amp; Calo</em> sang Health Connect, và cho phép <strong>Google Fit</strong> đọc từ Health Connect.</li>
                      <li>Trên VEGEAI, bấm <strong>"Đồng bộ ngay"</strong> để lấy dữ liệu mới nhất từ Google Fit!</li>
                    </ol>
                  </div>
                )}

                {/* Tab 4: Xiaomi / Amazfit / Redmi */}
                {activeGuideTab === 'xiaomi' && (
                  <div className="space-y-2 animate-in fade-in">
                    <p className="font-semibold text-emerald-900 dark:text-emerald-300">
                      Dành cho Mi Band (7/8/9), Amazfit, Redmi Watch qua Health Connect → Google Fit:
                    </p>
                    <ol className="list-decimal pl-4 space-y-1 font-medium leading-relaxed">
                      <li>Mở <strong>Mi Fitness</strong> hoặc <strong>Zepp / Zepp Life</strong> &gt; <strong>Hồ sơ</strong> &gt; <strong>Dữ liệu bên thứ ba / Health Connect</strong>.</li>
                      <li>Bật đồng bộ sang <strong>Health Connect</strong> và cho phép <strong>Google Fit</strong> đọc dữ liệu vận động.</li>
                      <li>Mỗi khi cần cập nhật mới, vuốt làm mới trong app <strong>Google Fit</strong> trên điện thoại rồi bấm <strong>"Đồng bộ ngay"</strong> trên VEGEAI (số liệu luôn khớp theo nguồn chuẩn Google Fit).</li>
                    </ol>
                  </div>
                )}

                {/* Tab 5: Garmin / Fitbit / Huawei / Other */}
                {activeGuideTab === 'garmin' && (
                  <div className="space-y-2 animate-in fade-in">
                    <p className="font-semibold text-emerald-900 dark:text-emerald-300">
                      Đồng bộ từ các thiết bị thể thao chuyên dụng khác:
                    </p>
                    <ul className="list-disc pl-4 space-y-1 font-medium leading-relaxed">
                      <li><strong>Garmin / Fitbit / Huawei:</strong> Bật chia sẻ dữ liệu vận động sang <strong>Health Connect (Android)</strong> hoặc <strong>Apple Health (iOS)</strong>, sau đó liên kết vào <strong>Google Fit</strong>.</li>
                      <li>VEGEAI chỉ lấy số liệu tổng hợp đã khử trùng lặp từ <strong>Google Fit Cloud</strong> để đảm bảo nhất quán đa thiết bị.</li>
                    </ul>
                  </div>
                )}
              </div>
            )}
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
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-300 dark:ring-emerald-700'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                }`}
                title="Đồng bộ trực tiếp và tự động Live Sync với Google Fit Cloud trong 15 giây"
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
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer shadow-emerald-700/20"
            >
              <Link2 className="w-4 h-4" />
              <span>{isSyncing ? 'Đang kết nối...' : 'Liên kết Google Fit'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {isAutoLiveSyncing && (
              <button
                type="button"
                onClick={() => {
                  stopLiveSyncWindow();
                  setStatusMessage(
                    `Đã dừng Live Sync sớm lúc ${new Date().toLocaleTimeString('vi-VN')}. Bấm "Đồng bộ ngay" hoặc tải lại trang khi muốn cập nhật tiếp.`
                  );
                }}
                className="text-slate-600 dark:text-slate-300 hover:underline font-bold text-[11px] cursor-pointer"
              >
                Dừng ({liveSyncSecondsLeft}s)
              </button>
            )}
            <button
              type="button"
              onClick={() => setStatusMessage('')}
              className="text-emerald-700 dark:text-emerald-300 hover:underline font-bold text-[11px] cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {metrics.isConnected && !metrics.isTodayData && metrics.steps > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Đang hiển thị dữ liệu <strong>{metrics.dataDateLabel || 'ngày trước'}</strong> (hôm nay chưa có bước chân mới trên Google Fit Cloud). Chỉ số ngày cũ chỉ để tham khảo, không cộng vào cân bằng calo hôm nay.
          </span>
        </div>
      )}

      {/* Core Direct Google Fit Live-Sync Metric Cards (3 unified cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title={
            metrics.isTodayData || !metrics.dataDateLabel
              ? 'Bước chân hôm nay'
              : `Bước chân (${metrics.dataDateLabel})`
          }
          icon={<Footprints className="w-4 h-4 text-emerald-600" />}
          value={metrics.steps > 0 ? metrics.steps.toLocaleString('vi-VN') : null}
          unit="bước"
          valueClass="text-slate-900 dark:text-white"
          note={
            metrics.steps > 0
              ? `Mục tiêu ${metrics.stepTarget.toLocaleString('vi-VN')} bước (${Math.round(
                  (metrics.steps / metrics.stepTarget) * 100
                )}%)`
              : 'Chưa có dữ liệu bước chân từ Google Fit'
          }
        >
          {metrics.steps > 0 && (
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (metrics.steps / metrics.stepTarget) * 100)}%` }}
              />
            </div>
          )}
        </MetricCard>

        <MetricCard
          title={
            metrics.isTodayData || !metrics.dataDateLabel
              ? 'Tổng tiêu hao (Google Fit)'
              : `Tổng tiêu hao (${metrics.dataDateLabel})`
          }
          icon={<Flame className="w-4 h-4 text-amber-500" />}
          value={
            metrics.totalCaloriesExpended > 0
              ? metrics.totalCaloriesExpended.toLocaleString('vi-VN')
              : null
          }
          unit="kcal"
          valueClass="text-amber-500"
          note={
            !metrics.isTodayData && metrics.totalCaloriesExpended > 0
              ? `Ghi nhận ${metrics.dataDateLabel || 'ngày trước'} · Không cộng vào ngân sách hôm nay`
              : metrics.totalCaloriesExpended > 0 && metrics.activeCalories > 0
              ? `Khớp tổng tiêu hao app Google Fit (gồm BMR). Ước tách vận động: +${metrics.activeCalories.toLocaleString(
                  'vi-VN'
                )} kcal.`
              : metrics.totalCaloriesExpended > 0
              ? `Khớp tổng tiêu hao app Google Fit (gồm trao đổi chất cơ bản). ${
                  userBmr === 0 ? 'Cập nhật BMR hồ sơ để tách calo vận động.' : ''
                }`
              : 'Chưa có dữ liệu tiêu hao từ Google Fit'
          }
        />

        <MetricCard
          title="Quãng đường vận động"
          icon={<Route className="w-4 h-4 text-cyan-600" />}
          value={metrics.distanceKm > 0 ? metrics.distanceKm.toLocaleString('vi-VN') : null}
          unit="km"
          valueClass="text-slate-900 dark:text-white"
          note={
            metrics.distanceKm > 0 || metrics.activeMinutes > 0 || metrics.heartPoints > 0
              ? 'Đồng bộ trực tiếp từ luồng vận động chuẩn của Google Fit'
              : 'Chưa có dữ liệu quãng đường từ Google Fit'
          }
        >
          {(metrics.activeMinutes > 0 || metrics.heartPoints > 0) && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {metrics.activeMinutes > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200/70 dark:border-cyan-800 text-[11px] font-bold">
                  <Timer className="w-3 h-3" />
                  {metrics.activeMinutes} phút vận động
                </span>
              )}
              {metrics.heartPoints > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 border border-rose-200/70 dark:border-rose-800 text-[11px] font-bold">
                  <Activity className="w-3 h-3" />
                  {metrics.heartPoints} Heart Points
                </span>
              )}
            </div>
          )}
        </MetricCard>
      </div>

      {/* AI Nutrition Advice Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          Tư vấn AI Dinh Dưỡng Thích Ứng (Adaptive Nutrition Engine)
        </div>
        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {metrics.aiAdvice}
        </p>
        <div className="pt-2 border-t border-emerald-200/50 dark:border-emerald-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
          <span>
            Gợi ý bữa phụ hồi phục:{' '}
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
              <span className="text-slate-400 font-normal">Chưa đủ dữ liệu</span>
            )}
          </span>
        </div>
      </div>

      {/* Collapsible Architecture Explanation */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setShowArchitectureGuide(prev => !prev)}
          className="w-full flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            Xem cơ chế thống nhất nguồn dữ liệu Google Fit &amp; Live Sync 15 giây
          </span>
          {showArchitectureGuide ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {showArchitectureGuide && (
          <div className="mt-4 p-5 rounded-2xl bg-slate-50 dark:bg-[#182230] border border-slate-200 dark:border-slate-700 space-y-4 text-xs text-slate-600 dark:text-slate-300 animate-in fade-in">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
              Sơ đồ luồng dữ liệu thống nhất qua Google Fit (Single Source of Truth):
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 mx-auto flex items-center justify-center font-bold">
                  1
                </div>
                <strong className="block text-slate-900 dark:text-white font-bold">
                  Thiết bị thu thập
                </strong>
                <p className="text-[11px] text-slate-400">
                  Điện thoại di động, Apple Watch, Galaxy Watch, Xiaomi Band, Garmin, Fitbit...
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 mx-auto flex items-center justify-center font-bold">
                  2
                </div>
                <strong className="block text-slate-900 dark:text-white font-bold">
                  Cầu nối hệ sinh thái
                </strong>
                <p className="text-[11px] text-slate-400">
                  Mi Fitness, Samsung Health, Apple Health đẩy dữ liệu vào Health Connect / Google Fit
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 mx-auto flex items-center justify-center font-bold">
                  3
                </div>
                <strong className="block text-slate-900 dark:text-white font-bold">
                  Google Fit Cloud
                </strong>
                <p className="text-[11px] text-slate-400">
                  Gộp &amp; khử trùng lặp Bước chân, Tổng calo tiêu hao, Quãng đường chuẩn 1-1
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 mx-auto flex items-center justify-center font-bold">
                  4
                </div>
                <strong className="block text-slate-900 dark:text-white font-bold">
                  VEGEAI Live Sync
                </strong>
                <p className="text-[11px] text-slate-400">
                  Kéo ngay &amp; tự động Live Sync 15 giây mỗi lần bấm đồng bộ, tự làm mới khi tải lại trang
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
              <strong className="text-slate-900 dark:text-white block font-bold">
                Vì sao số liệu trên VEGEAI đối chiếu chuẩn theo Google Fit thay vì từng app đồng hồ riêng lẻ?
              </strong>
              <p className="leading-relaxed text-[11px]">
                Mỗi hãng đồng hồ (như Mi Fitness) chỉ đếm khi đeo tay và chỉ hiển thị calo tập luyện, đồng thời không đồng bộ đầy đủ nhịp tim/SpO₂ sang Google Fit. Google Fit đóng vai trò <strong>nguồn chuẩn hợp nhất</strong> (gộp cả cảm biến điện thoại + vòng tay và tự khử trùng lặp), giúp VEGEAI hiển thị chính xác <strong>Bước chân, Tổng tiêu hao calo và Quãng đường</strong> đồng nhất trên mọi thiết bị.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
