import React, { useState } from 'react';
import {
  Watch,
  Flame,
  Footprints,
  Heart,
  Moon,
  RefreshCw,
  Sparkles,
  Info
} from 'lucide-react';
import { sfx } from '../utils/soundEffects';

interface WearableTrackerProps {
  plannedCalorieIntake?: number;
  userBmr?: number;
}

export const WearableGoogleFitTracker: React.FC<WearableTrackerProps> = ({
  plannedCalorieIntake = 1650,
  userBmr = 1420,
}) => {
  // Default to disconnected as requested (no real OAuth yet)
  const [isConnected, setIsConnected] = useState(false);
  const [deviceModel] = useState('Xiaomi Smart Band 8');
  const [syncTime, setSyncTime] = useState('Chưa đồng bộ (Chờ OAuth)');
  const [isSyncing, setIsSyncing] = useState(false);
  const [activityPreset, setActivityPreset] = useState<'light' | 'moderate' | 'intense'>('moderate');

  // Metrics for UI prototype preview
  const metrics = {
    light: {
      steps: 3850,
      stepTarget: 10000,
      activeCalories: 180,
      activeMinutes: 22,
      avgHeartRate: 68,
      sleepHours: '6h 45m',
      aiAdvice:
        'Hôm nay mức vận động còn nhẹ (3.850 bước). Đề xuất đi bộ thư giãn thêm 20 phút vào buổi chiều tối và ưu tiên thực đơn thanh đạm, giàu chất xơ.',
      recommendedSnack: 'Nước ép cần tây dưa leo hạt chia (85 kcal)',
    },
    moderate: {
      steps: 8420,
      stepTarget: 10000,
      activeCalories: 485,
      activeMinutes: 52,
      avgHeartRate: 74,
      sleepHours: '7h 35m',
      aiAdvice:
        'Bạn đã tiêu hao khoảng 485 kcal từ 8.420 bước chân. Đề xuất bổ sung thêm bữa phụ giàu đạm thực vật để hồi phục cơ bắp và bù nước điện giải.',
      recommendedSnack: 'Sinh tố bơ chuối sữa hạt sen (195 kcal · 7g protein)',
    },
    intense: {
      steps: 13600,
      stepTarget: 10000,
      activeCalories: 760,
      activeMinutes: 85,
      avgHeartRate: 82,
      sleepHours: '8h 10m',
      aiAdvice:
        'Cường độ vận động cao (13.600 bước, 760 kcal)! Hãy tăng khẩu phần bữa tối hoặc bổ sung nước dừa tươi bù khoáng chất.',
      recommendedSnack: 'Bát yến mạch ngâm sữa đậu nành & hạt óc chó (280 kcal · 12g protein)',
    },
  }[activityPreset];

  const totalCaloriesBurned = userBmr + metrics.activeCalories;
  const netCalorieBalance = plannedCalorieIntake - totalCaloriesBurned;

  const handleSync = () => {
    sfx.playTap();
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncTime('Vừa thử nghiệm mô phỏng');
      sfx.playSuccess();
      // Notice: Do NOT adjust real user meal plans based on simulated metrics
    }, 900);
  };

  const handleSelectPreset = (preset: 'light' | 'moderate' | 'intense') => {
    sfx.playTap();
    setActivityPreset(preset);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
      {/* Explicit Disclaimer Banner */}
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <div>
          <strong className="block text-sm font-bold">Giao diện thử nghiệm · Dữ liệu minh họa</strong>
          <p className="mt-0.5 text-amber-800 dark:text-amber-300">
            Tính năng đồng bộ thiết bị đeo đang trong giai đoạn phát triển và chưa tích hợp Google Fit OAuth 2.0 chính thức. Các chỉ số hiển thị bên dưới chỉ mang tính chất minh họa giao diện, không ảnh hưởng đến thực đơn dinh dưỡng thực tế của bạn.
          </p>
        </div>
      </div>

      {/* Top Banner: Connection & Sync */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-400 to-slate-600 flex items-center justify-center text-white shadow-md shrink-0">
            <Watch className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Thiết Bị Đeo & Google Fit (Minh Họa)
              </h2>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border transition ${
                  isConnected
                    ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                }`}
              >
                {isConnected ? 'Mô phỏng kết nối' : 'Chưa kết nối OAuth'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Thiết bị: <strong className="text-slate-700 dark:text-slate-200">{deviceModel}</strong> · {syncTime}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              sfx.playTap();
              setIsConnected(prev => !prev);
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            {isConnected ? 'Thử ngắt' : 'Thử kết nối'}
          </button>
          <button
            type="button"
            onClick={handleSync}
            disabled={!isConnected}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Mô phỏng đồng bộ</span>
          </button>
        </div>
      </div>

      {/* Preset preview buttons */}
      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
        <span className="font-bold text-slate-600 dark:text-slate-400">Xem thử kịch bản vận động:</span>
        <div className="flex items-center gap-1.5">
          {(['light', 'moderate', 'intense'] as const).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => handleSelectPreset(p)}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer transition ${
                activityPreset === p
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              {p === 'light' ? 'Ít vận động' : p === 'moderate' ? 'Tiêu chuẩn (8.400 bước)' : 'Cường độ cao'}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Steps */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Bước chân</span>
            <Footprints className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {metrics.steps.toLocaleString('vi-VN')}
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, (metrics.steps / metrics.stepTarget) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400">Mục tiêu: {metrics.stepTarget.toLocaleString('vi-VN')} bước</span>
        </div>

        {/* Active Calories */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Calo tiêu hao</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-500">
            {metrics.activeCalories} <span className="text-xs font-bold text-slate-400">kcal</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Vận động: <strong>{metrics.activeMinutes} phút</strong>
          </div>
          <span className="text-[10px] text-slate-400">Tổng tiêu hao BMR + Vận động: {totalCaloriesBurned} kcal</span>
        </div>

        {/* Heart Rate */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Nhịp tim TB</span>
            <Heart className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-500">
            {metrics.avgHeartRate} <span className="text-xs font-bold text-slate-400">bpm</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-bold">Trạng thái ổn định</span>
          <span className="text-[10px] text-slate-400 block">Đo tự động mỗi 10 phút</span>
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
          <span className="text-[11px] text-indigo-500 font-bold">Chất lượng tốt (88 điểm)</span>
          <span className="text-[10px] text-slate-400 block">Ngủ sâu: 2h 15m</span>
        </div>
      </div>

      {/* Advice card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          Gợi ý cân bằng dinh dưỡng (Minh họa)
        </div>
        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {metrics.aiAdvice}
        </p>
        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500">
          <span>Gợi ý bữa phụ: <strong className="text-slate-800 dark:text-slate-200">{metrics.recommendedSnack}</strong></span>
          <span>Cân bằng calo dự kiến: <strong className={netCalorieBalance < 0 ? 'text-emerald-600' : 'text-amber-600'}>{netCalorieBalance} kcal</strong></span>
        </div>
      </div>
    </div>
  );
};
