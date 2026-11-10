import React, { useState, useEffect } from 'react';
import {
  Watch,
  Flame,
  Footprints,
  Heart,
  Moon,
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
  Edit3,
  Activity,
  Route,
  Droplets
} from 'lucide-react';
import { sfx } from '../utils/soundEffects';
import { wearableService } from '../utils/wearableService';
import type { WearableMetrics } from '../utils/wearableService';

interface WearableTrackerProps {
  plannedCalorieIntake?: number;
  userBmr?: number;
  onSyncMetrics?: (metrics: { steps: number; calories: number; heartRate: number }) => void;
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
  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-2">
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

export const WearableGoogleFitTracker: React.FC<WearableTrackerProps> = ({
  plannedCalorieIntake = 0,
  userBmr = 0,
  onSyncMetrics
}) => {
  const [metrics, setMetrics] = useState<WearableMetrics>(() => wearableService.getMetrics());
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showArchitectureGuide, setShowArchitectureGuide] = useState(true);
  const [showHubInfo, setShowHubInfo] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'phone' | 'apple' | 'samsung' | 'xiaomi' | 'garmin'>('phone');
  const [showManualHrModal, setShowManualHrModal] = useState(false);
  const [manualHrInput, setManualHrInput] = useState(() => (metrics.avgHeartRate > 0 ? String(metrics.avgHeartRate) : '75'));
  const [isHrScopeMissing, setIsHrScopeMissing] = useState(() => localStorage.getItem('wearable_hr_scope_missing') === 'true');

  // Auto-sync live metrics in background on load if Google Fit token exists
  useEffect(() => {
    // BMR must be known before sync so Google Fit total kcal can be split into basal vs. active
    wearableService.setUserBmr(userBmr);
  }, [userBmr]);

  useEffect(() => {
    const token = wearableService.getStoredToken();
    if (token) {
      setIsSyncing(true);
      wearableService
        .fetchGoogleFitLive(token)
        .catch(err => {
          console.warn('Background auto-sync with Google Fit:', err);
        })
        .finally(() => {
          setIsSyncing(false);
        });
    }
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      const updated = wearableService.getMetrics();
      setMetrics(updated);
      setIsHrScopeMissing(localStorage.getItem('wearable_hr_scope_missing') === 'true');
      if (updated.avgHeartRate > 0) {
        setManualHrInput(String(updated.avgHeartRate));
      }
      onSyncMetrics?.({
        steps: updated.steps,
        calories: updated.activeCalories,
        heartRate: updated.avgHeartRate
      });
    };
    window.addEventListener('wearable_sync_updated', handleUpdate);
    return () => window.removeEventListener('wearable_sync_updated', handleUpdate);
  }, [onSyncMetrics]);

  const handleSaveManualHr = (e: React.FormEvent) => {
    e.preventDefault();
    sfx.playSuccess();
    const bpm = Number(manualHrInput);
    if (bpm >= 40 && bpm <= 220) {
      wearableService.setManualHeartRate(bpm);
      setShowManualHrModal(false);
      setStatusMessage(`Đã ghi nhận nhịp tim: ${bpm} bpm! AI Chef đã cập nhật thực đơn phù hợp.`);
    }
  };

  const totalCaloriesBurned = (userBmr > 0 || metrics.activeCalories > 0) ? (userBmr + metrics.activeCalories) : 0;
  const netCalorieBalance = (plannedCalorieIntake > 0 && totalCaloriesBurned > 0) ? (plannedCalorieIntake - totalCaloriesBurned) : null;

  const handleConnectOAuth = async () => {
    sfx.playTap();
    setIsSyncing(true);
    setStatusMessage('Đang mở cửa sổ kết nối tài khoản Google...');
    try {
      const token = await wearableService.openGoogleFitAuthPopup();
      setStatusMessage('Kết nối thành công! Đang cập nhật dữ liệu bước chân và năng lượng...');
      const live = await wearableService.fetchGoogleFitLive(token);
      sfx.playSuccess();
      setStatusMessage(`Cập nhật thành công: ${live.steps.toLocaleString('vi-VN')} bước chân, +${live.calories} kcal tiêu hao!`);
    } catch (err: any) {
      console.warn('OAuth connect info:', err);
      setStatusMessage(err.message || 'Không thể kết nối với tài khoản Google lúc này. Vui lòng thử lại sau.');
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

    setIsSyncing(true);
    setStatusMessage('Đang cập nhật chỉ số vận động mới nhất...');
    try {
      const live = await wearableService.fetchGoogleFitLive(token);
      sfx.playSuccess();
      const updated = wearableService.getMetrics();
      const hrText = live.heartRate > 0 ? `, nhịp tim ${live.heartRate} bpm` : '';
      const dateNote = updated.dataDateLabel && updated.dataDateLabel !== 'Hôm nay' ? ` (${updated.dataDateLabel})` : '';
      setStatusMessage(`Đồng bộ thành công lúc ${new Date().toLocaleTimeString('vi-VN')}${dateNote}: ${live.steps.toLocaleString('vi-VN')} bước chân, +${live.calories} kcal${hrText}!`);
    } catch (err: any) {
      setStatusMessage(err.message || 'Chưa thể cập nhật dữ liệu từ thiết bị. Vui lòng thử lại sau.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSelectPreset = (preset: 'light' | 'moderate' | 'intense') => {
    sfx.playTap();
    const updated = wearableService.setPreset(preset);
    setStatusMessage(
      `Đã áp dụng kịch bản mô phỏng: ${
        preset === 'light'
          ? 'Nhẹ nhàng (3.850 bước · +180 kcal)'
          : preset === 'moderate'
          ? 'Tiêu chuẩn (8.420 bước · +485 kcal)'
          : 'Cường độ cao (13.600 bước · +760 kcal)'
      } — Nhịp tim ${updated.avgHeartRate} bpm, SpO₂ ${updated.spo2}%, Giấc ngủ ${updated.sleepHours}.`
    );
  };

  const handleDisconnect = () => {
    sfx.playTap();
    wearableService.disconnect();
    setStatusMessage('Đã ngắt liên kết và đặt lại dữ liệu thiết bị.');
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
      
      {/* Top Banner: Connection & Sync */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shrink-0">
            <Watch className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Trung Tâm Thiết Bị Đeo &amp; Google Fit
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border transition ${
                  metrics.isConnected
                    ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${metrics.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                {metrics.isConnected ? 'Đã liên kết Google Fit' : 'Chưa kết nối thiết bị'}
              </span>
              {metrics.dataDateLabel && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  {metrics.dataDateLabel}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2">
              <span>Hỗ trợ: <strong className="text-slate-700 dark:text-slate-200">{metrics.deviceModel}</strong> · {metrics.lastSyncedAt}</span>
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
                    <Sparkles className="w-4 h-4 text-emerald-600" /> Hướng dẫn đồng bộ dữ liệu vận động qua Google Fit Hub
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
                  VEGEAI đồng bộ an toàn qua <strong>Google Fit Cloud</strong> (tự động lấy dữ liệu hôm nay hoặc phiên đồng bộ gần nhất trong 30 ngày). Bạn <strong>không bắt buộc</strong> phải có smartwatch hay smartband đắt tiền. Hãy chọn phương thức hoặc thiết bị bạn đang dùng bên dưới:
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
                      💡 <strong>Bạn không cần mua thêm vòng đeo tay hay smartwatch!</strong> Bất kỳ điện thoại nào (iPhone, Samsung, Xiaomi, OPPO, Vivo, Realme, Sony, Pixel...) đều có sẵn cảm biến chuyển động đếm bước chân và ước tính calo tiêu hao khi mang theo trong túi quần hoặc cầm tay.
                    </div>
                    <ol className="list-decimal pl-4 space-y-1 font-medium leading-relaxed">
                      <li>Tải miễn phí app <strong>Google Fit</strong> từ <em>Google Play Store (Android)</em> hoặc <em>App Store (iPhone)</em>.</li>
                      <li>Đăng nhập Google Fit bằng tài khoản Google của bạn và bật cấp quyền <em>"Hoạt động thể chất / Theo dõi chuyển động"</em>.</li>
                      <li>Trên VEGEAI, bấm nút <strong>"Liên kết Google Fit"</strong> ở góc phải và đăng nhập cùng tài khoản Google đó. Mỗi ngày bước chân bạn đi sẽ tự động đồng bộ sang VEGEAI để AI cân chỉnh thực đơn chay!</li>
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
                      <li>Đeo Apple Watch bình thường, đồng hồ sẽ tự động đẩy dữ liệu bước chân và calo vào ứng dụng <strong>Apple Health (Sức khỏe)</strong> trên iPhone.</li>
                      <li>Cài app <strong>Google Fit</strong> trên iPhone từ App Store &gt; Mở Google Fit và cấp quyền cho phép Google Fit đọc dữ liệu từ <strong>Apple Health</strong>.</li>
                      <li>Trên màn hình VEGEAI này, bấm nút <strong>"Liên kết Google Fit"</strong> để lấy dữ liệu từ Google Fit Cloud.</li>
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
                      <li>Đảm bảo đồng hồ đã kết nối và đồng bộ với app <strong>Samsung Health</strong> trên điện thoại.</li>
                      <li>Mở <strong>Samsung Health</strong> &gt; Cài đặt &gt; <strong>Health Connect</strong> (hoặc tải ứng dụng Health Connect của Google trên CH Play nếu máy chưa có).</li>
                      <li>Cho phép <strong>Samsung Health</strong> chia sẻ dữ liệu Số bước &amp; Calo với Health Connect, đồng thời cho phép <strong>Google Fit</strong> đọc dữ liệu từ Health Connect.</li>
                      <li>Trên VEGEAI, bấm <strong>"Đồng bộ lại"</strong> là hoàn tất!</li>
                    </ol>
                  </div>
                )}

                {/* Tab 4: Xiaomi / Amazfit / Redmi */}
                {activeGuideTab === 'xiaomi' && (
                  <div className="space-y-2 animate-in fade-in">
                    <p className="font-semibold text-emerald-900 dark:text-emerald-300">
                      Dành cho Mi Band (7/8/9), Amazfit, Redmi Watch trên mọi dòng điện thoại (Samsung, Vivo, Xiaomi, OPPO, iPhone...):
                    </p>
                    <ol className="list-decimal pl-4 space-y-1 font-medium leading-relaxed">
                      <li>Mở app quản lý vòng tay: <strong>Mi Fitness</strong> (Xiaomi/Redmi) hoặc <strong>Zepp / Zepp Life</strong> (Amazfit).</li>
                      <li>Vào tab <strong>Hồ sơ (Profile)</strong> &gt; <strong>Dữ liệu bên thứ ba</strong> (hoặc <strong>Health Connect</strong>).</li>
                      <li>Chọn <strong>Google Fit</strong> (hoặc Health Connect) &gt; Bật cho phép đồng bộ <em>Số bước, Calo &amp; Hoạt động</em>.</li>
                      <li>Mỗi khi muốn số liệu cập nhật ngay, chỉ cần mở app Mi Fitness / Zepp vuốt nhẹ để sync vòng tay, mở Google Fit trên điện thoại, sau đó bấm <strong>"Đồng bộ lại"</strong> trên VEGEAI!</li>
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
                      <li><strong>Garmin:</strong> Mở app <em>Garmin Connect</em> &gt; Cài đặt &gt; Ứng dụng đã kết nối &gt; Bật liên kết với <em>Google Fit</em> hoặc <em>Health Connect</em>.</li>
                      <li><strong>Fitbit:</strong> Mở app <em>Fitbit</em> &gt; Cài đặt tài khoản &gt; Bật chia sẻ dữ liệu với hệ sinh thái <em>Google / Health Connect</em>.</li>
                      <li><strong>Huawei Health:</strong> Mở Huawei Health &gt; Tôi &gt; Quản lý quyền riêng tư &gt; Chia sẻ dữ liệu sang <em>Health Connect</em>.</li>
                      <li><strong>Các hãng khác:</strong> Bất kỳ thiết bị nào có thể chia sẻ dữ liệu vào <strong>Health Connect (Android)</strong> hoặc <strong>Apple Health (iOS)</strong> đều sẽ tự động đồng bộ sang Google Fit và về VEGEAI!</li>
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
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ lại'}</span>
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
          <button
            type="button"
            onClick={() => setStatusMessage('')}
            className="text-emerald-700 hover:underline font-bold text-[11px]"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Simulator Preset Control Strip (Quick Scenarios for Demo & When Phone Has Not Synced Today) */}
      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="font-bold text-slate-700 dark:text-slate-300">
            Chế độ thử nghiệm kịch bản thể trạng (Simulator Presets):
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(['light', 'moderate', 'intense'] as const).map(p => {
            const isCurrent =
              metrics.source === 'simulator' &&
              localStorage.getItem('wearable_preset') === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition ${
                  isCurrent
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {p === 'light'
                  ? 'Nhẹ nhàng (3.850 bước)'
                  : p === 'moderate'
                  ? 'Tiêu chuẩn (8.420 bước)'
                  : 'Cường độ cao (13.600 bước)'}
              </button>
            );
          })}
          {metrics.source === 'simulator' && (
            <button
              type="button"
              onClick={handleDisconnect}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800 transition cursor-pointer"
              title="Xóa dữ liệu mô phỏng để trở về trạng thái trống"
            >
              Xóa mô phỏng
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Bước chân hôm nay"
          icon={<Footprints className="w-4 h-4 text-emerald-600" />}
          value={metrics.steps > 0 ? metrics.steps.toLocaleString('vi-VN') : null}
          unit="bước"
          valueClass="text-slate-900 dark:text-white"
          note={metrics.steps > 0
            ? `Mục tiêu ${metrics.stepTarget.toLocaleString('vi-VN')} bước (${Math.round((metrics.steps / metrics.stepTarget) * 100)}%)${
                metrics.dataDateLabel && metrics.dataDateLabel !== 'Hôm nay' ? ` · ${metrics.dataDateLabel}` : ''
              }`
            : 'Chưa có dữ liệu bước chân'}
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
          title="Calo vận động"
          icon={<Flame className="w-4 h-4 text-amber-500" />}
          value={metrics.activeCalories > 0 ? `+${metrics.activeCalories.toLocaleString('vi-VN')}` : null}
          unit="kcal"
          valueClass="text-amber-500"
          note={metrics.totalCaloriesExpended > 0
            ? `Google Fit ghi nhận tổng ${metrics.totalCaloriesExpended.toLocaleString('vi-VN')} kcal (gồm trao đổi chất cơ bản). Calo vận động = tổng − BMR.`
            : (totalCaloriesBurned > 0
              ? `Tổng tiêu hao BMR + vận động: ${totalCaloriesBurned.toLocaleString('vi-VN')} kcal`
              : 'Chưa có dữ liệu tiêu hao')}
        />

        <MetricCard
          title="Quãng đường & vận động"
          icon={<Route className="w-4 h-4 text-cyan-600" />}
          value={metrics.distanceKm > 0 ? metrics.distanceKm.toLocaleString('vi-VN') : null}
          unit="km"
          valueClass="text-slate-900 dark:text-white"
          note={metrics.activeMinutes > 0
            ? `Vận động tích cực: ${metrics.activeMinutes} phút`
            : 'Chưa có dữ liệu vận động'}
        />

        <MetricCard
          title="Điểm nhịp tim (Heart Points)"
          icon={<Activity className="w-4 h-4 text-rose-500" />}
          value={metrics.heartPoints > 0 ? String(metrics.heartPoints) : null}
          unit="điểm"
          valueClass="text-rose-500"
          note={metrics.heartPoints > 0
            ? 'Điểm vận động tim mạch (mục tiêu của Google: 150 điểm/tuần)'
            : 'Chưa nhận được từ Google Fit'}
        />

        <MetricCard
          title="Độ bão hòa oxy (SpO₂)"
          icon={<Droplets className="w-4 h-4 text-sky-500" />}
          value={metrics.spo2 > 0 ? String(metrics.spo2) : null}
          unit="%"
          valueClass="text-sky-500"
          note={metrics.spo2 > 0
            ? (metrics.spo2 >= 95 ? 'Trong ngưỡng bình thường (95% – 100%)' : 'Thấp hơn ngưỡng thông thường – chỉ tham khảo, không thay thế tư vấn y tế')
            : 'Chưa nhận được từ Google Fit'}
        />

        <MetricCard
          title="Giấc ngủ đêm qua"
          icon={<Moon className="w-4 h-4 text-indigo-500" />}
          value={metrics.sleepHours && metrics.sleepHours !== '—' ? metrics.sleepHours : null}
          unit=""
          valueClass="text-indigo-600 dark:text-indigo-400"
          note={metrics.sleepHours && metrics.sleepHours !== '—'
            ? (Number(metrics.sleepHours.split('h')[0]) >= 7 ? 'Ngủ đủ giấc – hồi phục tốt' : 'Ngủ chưa đủ 7 giờ – nên nghỉ ngơi thêm')
            : 'Chưa nhận được từ Google Fit'}
        />
      </div>

      {/* Heart rate (bpm): not shared by Mi Fitness to Google Fit continuously, so be explicit and offer manual entry */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Heart className={`w-5 h-5 text-rose-500 ${metrics.avgHeartRate > 0 ? 'fill-rose-500/20' : ''}`} />
          <div>
            <div className="text-xs font-bold text-slate-500">Nhịp tim (bpm)</div>
            <div className="text-lg font-black text-rose-500">
              {metrics.avgHeartRate > 0 ? `${metrics.avgHeartRate} bpm` : '—'}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 max-w-md">
            {metrics.avgHeartRate > 0
              ? 'Giá trị gần nhất (đồng bộ hoặc nhập tay)'
              : isHrScopeMissing
              ? 'Thiếu quyền đọc nhịp tim của Google Fit.'
              : 'Mi Fitness hiện không chia sẻ số nhịp tim (bpm) sang Google Fit; bạn có thể nhập tay.'}
          </div>
        </div>
        {isHrScopeMissing ? (
          <button
            type="button"
            onClick={handleConnectOAuth}
            className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold cursor-pointer shrink-0"
          >
            Cấp quyền đọc nhịp tim
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowManualHrModal(true)}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-rose-600 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Edit3 className="w-3 h-3" />
            Nhập tay
          </button>
        )}
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
          <span>Gợi ý bữa phụ hồi phục: <strong className="text-emerald-800 dark:text-emerald-300 font-bold">{metrics.recommendedSnack}</strong></span>
          <span>
            Cân bằng calo dự kiến:{' '}
            {netCalorieBalance !== null ? (
              <strong className={netCalorieBalance <= 0 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                {netCalorieBalance > 0 ? `+${netCalorieBalance}` : netCalorieBalance} kcal
              </strong>
            ) : (
              <span className="text-slate-400 font-normal">Chưa đủ dữ liệu</span>
            )}
          </span>
        </div>
      </div>

      {/* Collapsible Architecture Explanation: How third-party and smart devices sync to VEGEAI */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setShowArchitectureGuide(prev => !prev)}
          className="w-full flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            Xem cơ chế kết nối thiết bị thông minh &amp; tài khoản Google Fit với bên thứ ba (VEGEAI)
          </span>
          {showArchitectureGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showArchitectureGuide && (
          <div className="mt-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-4 text-xs text-slate-600 dark:text-slate-300 animate-in fade-in">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
              Sơ đồ luồng dữ liệu thiết bị đeo đa nền tảng (Cross-Platform Wearables Flow):
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 mx-auto flex items-center justify-center font-bold">1</div>
                <strong className="block text-slate-900 dark:text-white font-bold">Thiết bị thu thập</strong>
                <p className="text-[11px] text-slate-400">Điện thoại di động (cảm biến bỏ túi), Apple Watch, Galaxy Watch, Xiaomi Band, Garmin, Fitbit...</p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 mx-auto flex items-center justify-center font-bold">2</div>
                <strong className="block text-slate-900 dark:text-white font-bold">Ứng dụng theo máy / Hãng</strong>
                <p className="text-[11px] text-slate-400">Google Fit, Apple Health, Samsung Health, Mi Fitness, Garmin Connect thu thập bước chân &amp; calo</p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 mx-auto flex items-center justify-center font-bold">3</div>
                <strong className="block text-slate-900 dark:text-white font-bold">Cầu nối Health Connect</strong>
                <p className="text-[11px] text-slate-400">Đồng bộ nội bộ sang Google Fit Cloud qua quyền chia sẻ bên thứ ba</p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 mx-auto flex items-center justify-center font-bold">4</div>
                <strong className="block text-slate-900 dark:text-white font-bold">Hệ thống VEGEAI</strong>
                <p className="text-[11px] text-slate-400">Tự động tính toán năng lượng tiêu hao để hoàn thiện chỉ số &amp; điều chỉnh thực đơn AI</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
              <strong className="text-slate-900 dark:text-white block font-bold">
                Tài khoản đăng ký thủ công (Email/Mật khẩu) có kết nối được không?
              </strong>
              <p className="leading-relaxed text-[11px]">
                <strong>Có, hoàn toàn độc lập!</strong> Bạn không bắt buộc phải đăng nhập website bằng tài khoản Google. Khi bấm nút <strong>"Liên kết Google Fit"</strong>, VEGEAI chỉ yêu cầu cấp quyền đọc chỉ số bước chân và calo vận động một cách an toàn. Sau khi xác nhận, dữ liệu vận động sẽ được tự động đồng bộ vào hồ sơ để VEGEAI cân đối dinh dưỡng mỗi ngày.
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Manual Heart Rate Input Modal */}
      {showManualHrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-500 font-bold text-sm">
                <Heart className="w-5 h-5 fill-rose-500/20" />
                <span>Hiệu chỉnh / Nhập nhịp tim</span>
              </div>
              <button
                type="button"
                onClick={() => setShowManualHrModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Nhập nhịp tim vừa đo (qua máy đo huyết áp tại nhà, đếm mạch cổ tay hoặc camera Google Fit) để AI Chef điều chỉnh thực đơn bù khoáng và năng lượng chính xác.
            </p>

            <form onSubmit={handleSaveManualHr} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  Nhịp tim đo được (BPM)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="40"
                    max="220"
                    required
                    value={manualHrInput}
                    onChange={(e) => setManualHrInput(e.target.value)}
                    placeholder="Ví dụ: 75"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold text-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="text-xs font-bold text-slate-400">bpm</span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-semibold">Mức nhanh:</span>
                {[65, 75, 85, 120].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setManualHrInput(String(v))}
                    className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                  >
                    {v}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualHrModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition cursor-pointer"
                >
                  Lưu nhịp tim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
