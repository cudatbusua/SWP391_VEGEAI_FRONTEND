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
  Layers
} from 'lucide-react';
import { sfx } from '../utils/soundEffects';
import { wearableService } from '../utils/wearableService';
import type { WearableMetrics } from '../utils/wearableService';

interface WearableTrackerProps {
  plannedCalorieIntake?: number;
  userBmr?: number;
  onSyncMetrics?: (metrics: { steps: number; calories: number; heartRate: number }) => void;
}

export const WearableGoogleFitTracker: React.FC<WearableTrackerProps> = ({
  plannedCalorieIntake = 0,
  userBmr = 0,
  onSyncMetrics
}) => {
  const [metrics, setMetrics] = useState<WearableMetrics>(() => wearableService.getMetrics());
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showArchitectureGuide, setShowArchitectureGuide] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      const updated = wearableService.getMetrics();
      setMetrics(updated);
      onSyncMetrics?.({
        steps: updated.steps,
        calories: updated.activeCalories,
        heartRate: updated.avgHeartRate
      });
    };
    window.addEventListener('wearable_sync_updated', handleUpdate);
    return () => window.removeEventListener('wearable_sync_updated', handleUpdate);
  }, [onSyncMetrics]);

  const totalCaloriesBurned = (userBmr > 0 || metrics.activeCalories > 0) ? (userBmr + metrics.activeCalories) : 0;
  const netCalorieBalance = (plannedCalorieIntake > 0 && totalCaloriesBurned > 0) ? (plannedCalorieIntake - totalCaloriesBurned) : null;

  const handleConnectOAuth = async () => {
    sfx.playTap();
    setIsSyncing(true);
    setStatusMessage('Đang mở cửa sổ ủy quyền Google Fit OAuth 2.0...');
    try {
      const token = await wearableService.openGoogleFitAuthPopup();
      setStatusMessage('Ủy quyền thành công! Đang đồng bộ chỉ số từ Google Fit Cloud...');
      const live = await wearableService.fetchGoogleFitLive(token);
      sfx.playSuccess();
      setStatusMessage(`Đã đồng bộ Google Fit: ${live.steps.toLocaleString('vi-VN')} bước, +${live.calories} kcal!`);
    } catch (err: any) {
      console.warn('OAuth connect info:', err);
      setStatusMessage(err.message || 'Không thể liên kết Google Fit. Bạn có thể sử dụng chế độ Thử Nghiệm Mô Phỏng bên dưới.');
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
    setStatusMessage('Đang kéo dữ liệu vận động mới nhất từ Google Fitness REST API...');
    try {
      const live = await wearableService.fetchGoogleFitLive(token);
      sfx.playSuccess();
      setStatusMessage(`Đồng bộ thành công lúc ${new Date().toLocaleTimeString('vi-VN')}: ${live.steps.toLocaleString('vi-VN')} bước, +${live.calories} kcal!`);
    } catch (err: any) {
      setStatusMessage(err.message || 'Lỗi khi kéo dữ liệu Google Fit.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = () => {
    sfx.playTap();
    wearableService.disconnect();
    setStatusMessage('Đã ngắt liên kết và đặt lại dữ liệu thiết bị.');
  };

  const handleSelectPreset = (preset: 'light' | 'moderate' | 'intense') => {
    sfx.playTap();
    wearableService.setPreset(preset);
    setStatusMessage(`Đã chọn kịch bản mô phỏng: ${preset === 'light' ? 'Ít vận động (3.850 bước)' : preset === 'moderate' ? 'Tiêu chuẩn (8.420 bước)' : 'Cường độ cao (13.600 bước)'}`);
  };

  const handleManualTokenSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTokenInput.trim()) return;
    setIsSyncing(true);
    try {
      await wearableService.fetchGoogleFitLive(manualTokenInput.trim());
      setShowTokenInput(false);
      setManualTokenInput('');
      setStatusMessage('Đã lưu Access Token và đồng bộ dữ liệu Google Fit thành công!');
      sfx.playSuccess();
    } catch (err: any) {
      setStatusMessage(err.message || 'Token không hợp lệ hoặc đã hết hạn.');
    } finally {
      setIsSyncing(false);
    }
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
                {metrics.isConnected ? 'Đã liên kết Google Fit' : 'Chưa liên kết OAuth 2.0'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Hỗ trợ: <strong className="text-slate-700 dark:text-slate-200">{metrics.deviceModel}</strong> · {metrics.lastSyncedAt}
            </p>
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
                <span>Ngắt</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleConnectOAuth}
                disabled={isSyncing}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer shadow-emerald-700/20"
              >
                <Link2 className="w-4 h-4" />
                <span>{isSyncing ? 'Đang xác thực...' : 'Liên kết Google Fit'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowTokenInput(prev => !prev)}
                className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition"
                title="Nhập Access Token thủ công (Dành cho nhà phát triển)"
              >
                Token
              </button>
            </>
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

      {/* Manual Token Input Box for Dev / Sandbox */}
      {showTokenInput && (
        <form onSubmit={handleManualTokenSave} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Nhập Google OAuth 2.0 Bearer Token (Sandbox / Dev):
            </label>
            <span className="text-[10px] text-slate-400">fitness.activity.read</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualTokenInput}
              onChange={e => setManualTokenInput(e.target.value)}
              placeholder="ya29.a0AcM612..."
              className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 outline-none text-slate-800 dark:text-white"
            />
            <button
              type="submit"
              disabled={isSyncing || !manualTokenInput.trim()}
              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition disabled:opacity-50"
            >
              Lưu &amp; Kéo Data
            </button>
          </div>
        </form>
      )}

      {/* Simulator Preset Control Strip */}
      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="font-bold text-slate-700 dark:text-slate-300">
            Chế độ thử nghiệm kịch bản thể trạng (Demo Simulator):
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
                className={`px-3 py-1 rounded-lg font-bold text-xs cursor-pointer transition ${
                  isCurrent
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {p === 'light' ? 'Ít vận động (3.850 bước)' : p === 'moderate' ? 'Tiêu chuẩn (8.420 bước)' : 'Cường độ cao (13.600 bước)'}
              </button>
            );
          })}
          {metrics.source === 'simulator' && (
            <button
              type="button"
              onClick={handleDisconnect}
              className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800 transition cursor-pointer"
              title="Xóa dữ liệu mô phỏng để trở về trạng thái trống"
            >
              Xóa mô phỏng
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Steps */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Bước chân hôm nay</span>
            <Footprints className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {metrics.steps > 0 ? metrics.steps.toLocaleString('vi-VN') : '—'}
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (metrics.steps / metrics.stepTarget) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400">
            {metrics.steps > 0
              ? `Mục tiêu: ${metrics.stepTarget.toLocaleString('vi-VN')} bước (${Math.round((metrics.steps / metrics.stepTarget) * 100)}%)`
              : 'Chưa có dữ liệu bước chân'}
          </span>
        </div>

        {/* Active Calories */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Calo vận động</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-500">
            {metrics.activeCalories > 0 ? `+${metrics.activeCalories} ` : '— '}
            <span className="text-xs font-bold text-slate-400">kcal</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Vận động tích cực: <strong>{metrics.activeMinutes > 0 ? `${metrics.activeMinutes} phút` : '—'}</strong>
          </div>
          <span className="text-[10px] text-slate-400">
            {totalCaloriesBurned > 0
              ? `Tổng tiêu hao BMR + Vận động: ${totalCaloriesBurned.toLocaleString('vi-VN')} kcal`
              : 'Chưa có dữ liệu tiêu hao'}
          </span>
        </div>

        {/* Heart Rate */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Nhịp tim trung bình</span>
            <Heart className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-500">
            {metrics.avgHeartRate > 0 ? metrics.avgHeartRate : '—'}{' '}
            <span className="text-xs font-bold text-slate-400">bpm</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-bold">
            {metrics.avgHeartRate > 0 ? 'Trạng thái ổn định' : 'Chưa đo nhịp tim'}
          </span>
          <span className="text-[10px] text-slate-400 block">Đo tự động qua cảm biến quang</span>
        </div>

        {/* Sleep */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Giấc ngủ đêm qua</span>
            <Moon className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {metrics.sleepHours}
          </div>
          <span className="text-[11px] text-indigo-500 font-bold">
            {metrics.sleepHours !== '—' ? 'Chất lượng tốt (88 điểm)' : 'Chưa có dữ liệu'}
          </span>
          <span className="text-[10px] text-slate-400 block">Hồi phục cơ bắp tốt</span>
        </div>
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
          className="w-full flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition"
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
                <strong className="block text-slate-900 dark:text-white font-bold">Vòng đeo tay / Đồng hồ</strong>
                <p className="text-[11px] text-slate-400">Xiaomi Band 8, Apple Watch, Galaxy Watch, Garmin, Fitbit</p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 mx-auto flex items-center justify-center font-bold">2</div>
                <strong className="block text-slate-900 dark:text-white font-bold">Ứng dụng theo máy</strong>
                <p className="text-[11px] text-slate-400">Mi Fitness, Apple Health, Samsung Health thu thập qua Bluetooth BLE</p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 mx-auto flex items-center justify-center font-bold">3</div>
                <strong className="block text-slate-900 dark:text-white font-bold">Cầu nối Health Connect</strong>
                <p className="text-[11px] text-slate-400">Đồng bộ nội bộ sang Google Fit Cloud qua quyền chia sẻ bên thứ ba</p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 mx-auto flex items-center justify-center font-bold">4</div>
                <strong className="block text-slate-900 dark:text-white font-bold">Hệ thống VEGEAI</strong>
                <p className="text-[11px] text-slate-400">Đọc dataset REST API để vẽ vòng Zen Rings &amp; điều chỉnh thực đơn AI</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
              <strong className="text-slate-900 dark:text-white block font-bold">
                Tài khoản đăng ký thủ công (Email/Mật khẩu) có kết nối được không?
              </strong>
              <p className="leading-relaxed text-[11px]">
                <strong>Có, hoàn toàn độc lập!</strong> Người dùng không bắt buộc phải đăng nhập web bằng tài khoản Google. Khi bấm nút <strong>"Liên kết Google Fit"</strong>, VEGEAI chỉ yêu cầu cấp quyền đọc dữ liệu vận động thông qua OAuth 2.0. Sau khi cấp quyền thành công, mã token được liên kết trực tiếp vào hồ sơ người dùng trên VEGEAI, cho phép hệ thống tự động cập nhật calo vận động mỗi ngày.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
