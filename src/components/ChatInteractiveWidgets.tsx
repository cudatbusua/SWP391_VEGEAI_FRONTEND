import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Flame,
  ChefHat,
  ShoppingBag,
  RotateCw,
  Sparkles,
  Watch,
  Footprints,
  Heart,
  Check,
  ChevronRight
} from 'lucide-react';
import { HealthActivityRings } from './HealthActivityRings';
import type { ScheduledDayPlan } from '../data/weeklyScheduleData';
import { sfx } from '../utils/soundEffects';
import { wearableService } from '../utils/wearableService';
import type { WearableMetrics } from '../utils/wearableService';
import { calculateBmr, calculateTdee } from '../utils/nutritionProfile';

export interface ChatMealScheduleCardData {
  weekTitle: string;
  targetCalories: number;
  days: ScheduledDayPlan[];
}

export interface ChatActivityRingsCardData {
  calories: number;
  calorieTarget: number;
  proteinGrams: number;
  proteinTarget: number;
  fiberGrams: number;
  fiberTarget: number;
  heightCm?: number | '';
  weightKg?: number | '';
  age?: number;
  gender?: string;
  steps: number;
  wearableKcal: number;
  heartRate: number;
  sleepHours: string;
  isConnected: boolean;
  source: string;
  lastSyncedAt: string;
  advice: string;
}

export interface ChatRecipeCardData {
  name: string;
  calories: number;
  protein: number;
  cookTime: string;
  difficulty: string;
  ingredients: string[];
  excerpt: string;
}

/* =========================================================================
   1. CHAT MEAL SCHEDULE CARD VIEW (LỊCH BIỂU TƯƠNG TÁC NHANH 7 NGÀY)
   ========================================================================= */
interface ChatMealScheduleCardViewProps {
  card: ChatMealScheduleCardData;
  onSwapMeal?: (mealName: string, mealType: string, cal: number) => void;
  onAddToShoppingList?: (ingredient: string) => void;
  _onApplyPlan?: () => void;
}

export const ChatMealScheduleCardView: React.FC<ChatMealScheduleCardViewProps> = ({
  card,
  onSwapMeal,
  onAddToShoppingList
}) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [addedItem, setAddedItem] = useState<string | null>(null);
  const activeDay = card.days[selectedIdx] || card.days[0];
  const dayTotalCal = activeDay.breakfast.calories + activeDay.lunch.calories + activeDay.dinner.calories;
  const dayTotalProtein = activeDay.breakfast.protein + activeDay.lunch.protein + activeDay.dinner.protein;

  const handleAddShopping = (mealName: string) => {
    sfx.playSuccess();
    onAddToShoppingList?.(mealName);
    setAddedItem(mealName);
    setTimeout(() => setAddedItem(null), 2500);
  };

  return (
    <div className="mt-3.5 rounded-2xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-850 p-4 sm:p-5 shadow-sm space-y-4 text-slate-800 dark:text-slate-100 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-100 dark:border-emerald-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-emerald-950 dark:text-emerald-200 uppercase tracking-wide">
              {card.weekTitle}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Nhấp chọn từng thứ để xem chi tiết 3 bữa và tương tác nhanh
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
            Mục tiêu: {card.targetCalories} kcal/ngày
          </span>
        </div>
      </div>

      {/* 7-Day Interactive Tabs */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
        {card.days.map((d, idx) => {
          const isSelected = selectedIdx === idx;
          const totalCal = d.breakfast.calories + d.lunch.calories + d.dinner.calories;
          return (
            <button
              key={d.dayName}
              type="button"
              onClick={() => {
                sfx.playTap();
                setSelectedIdx(idx);
              }}
              className={`p-2 rounded-xl text-center border transition cursor-pointer ${
                isSelected
                  ? 'bg-emerald-700 border-emerald-700 text-white shadow-xs scale-[1.02]'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="block text-[11px] font-extrabold truncate">{d.dayName}</span>
              <span className={`block text-[10px] mt-0.5 font-bold ${isSelected ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {totalCal} <span className="text-[9px]">kcal</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Day Summary Bar */}
      <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 flex items-center justify-between text-xs">
        <span className="font-bold text-emerald-950 dark:text-emerald-200">
          Khẩu phần {activeDay.dayName}:
        </span>
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-emerald-700 dark:text-emerald-300">
            🔥 {dayTotalCal} kcal
          </span>
          <span className="text-slate-400">·</span>
          <span className="font-semibold text-teal-700 dark:text-teal-300">
            🌱 {dayTotalProtein}g đạm thực vật
          </span>
        </div>
      </div>

      {/* 3 Meals of the Selected Day */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Bữa Sáng (07:00)', meal: activeDay.breakfast, icon: '🌅' },
          { label: 'Bữa Trưa (12:00)', meal: activeDay.lunch, icon: '☀️' },
          { label: 'Bữa Tối (18:30)', meal: activeDay.dinner, icon: '🌙' },
        ].map(({ label, meal, icon }) => (
          <div
            key={label}
            className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                <span className="font-bold flex items-center gap-1">
                  <span>{icon}</span> {label}
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-700 text-[10px] font-semibold">
                  {meal.category}
                </span>
              </div>

              <h5 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">
                {meal.name}
              </h5>

              {meal.description && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                  {meal.description}
                </p>
              )}

              <div className="flex items-center gap-2 mt-2 text-[11px]">
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {meal.calories} kcal
                </span>
                <span className="text-slate-400">·</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  {meal.protein}g đạm
                </span>
              </div>
            </div>

            {/* Action buttons inside meal */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-1.5">
              <button
                type="button"
                onClick={() => onSwapMeal?.(meal.name, label, meal.calories)}
                className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                title="Yêu cầu AI Bếp trưởng đổi món tương đương calo"
              >
                <ChefHat className="w-3 h-3" />
                <span>Đổi món</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddShopping(meal.name)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-emerald-50 text-slate-700 dark:text-slate-200 hover:text-emerald-700 text-[10px] font-bold border border-slate-200 dark:border-slate-600 transition cursor-pointer"
                title="Lưu nguyên liệu món này vào danh sách đi chợ"
              >
                {addedItem === meal.name ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-600">Đã lưu!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-3 h-3 text-slate-500" />
                    <span>Đi chợ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Quick Action */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <span className="text-slate-500 text-[11px]">
          💡 Bạn có thể bấm <strong>"Đổi món"</strong> để Bếp trưởng gợi ý món chay thay thế ngay trong chat.
        </span>

        <Link
          to="/settings?tab=calendar"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-2xs cursor-pointer self-start sm:self-auto shrink-0"
        >
          <span>Xem Lịch 31 ngày đầy đủ</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};


/* =========================================================================
   2. CHAT HEALTH ACTIVITY RINGS VIEW (TEMPLATE VÒNG RING HOẠT ĐỘNG TRỰC TIẾP)
   ========================================================================= */
interface ChatActivityRingsViewProps {
  card: ChatActivityRingsCardData;
  onSyncLive?: () => void;
  onAskAiAdvice?: (advicePrompt: string) => void;
}

export const ChatActivityRingsView: React.FC<ChatActivityRingsViewProps> = ({
  card,
  onSyncLive,
  onAskAiAdvice
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState<WearableMetrics>(() => wearableService.getMetrics());
  const [, setProfileSyncCount] = useState(0);

  useEffect(() => {
    const handleWearableUpdate = () => {
      setLiveMetrics(wearableService.getMetrics());
    };
    const handleProfileUpdate = () => {
      setProfileSyncCount(c => c + 1);
    };
    window.addEventListener('wearable_sync_updated', handleWearableUpdate);
    window.addEventListener('user_profile_updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('wearable_sync_updated', handleWearableUpdate);
      window.removeEventListener('user_profile_updated', handleProfileUpdate);
    };
  }, []);

  // Determine user's real biometrics and calorie targets matching AccountSettingsPage
  let height = card.heightCm;
  let weight = card.weightKg;
  let age = card.age || 25;
  let gender = card.gender || 'OTHER';
  let targetCalorie = card.calorieTarget;

  try {
    const storedProfRaw = localStorage.getItem('vegeai_user_profile');
    if (storedProfRaw) {
      const sp = JSON.parse(storedProfRaw);
      if (sp.heightCm && (!height || height === 165)) height = sp.heightCm;
      if (sp.weightKg && (!weight || weight === 58)) weight = sp.weightKg;
      if (sp.dateOfBirth) age = Math.max(15, new Date().getFullYear() - new Date(sp.dateOfBirth).getFullYear());
      if (sp.gender) gender = sp.gender;
      if (sp.dailyCalorieTarget && Number(sp.dailyCalorieTarget) > 0) targetCalorie = Number(sp.dailyCalorieTarget);
    }
  } catch {}

  const hNum = typeof height === 'number' && height > 0 ? height : 0;
  const wNum = typeof weight === 'number' && weight > 0 ? weight : 0;

  const bmr = (hNum > 0 && wNum > 0) ? calculateBmr(wNum, hNum, age, gender) : 0;
  const tdee = bmr > 0 ? calculateTdee(bmr, 1.375) : 0;
  const defaultScientificCalorie = tdee > 0 ? Math.round(tdee) : (bmr > 0 ? Math.round(bmr) : 1800);

  const effectiveCalorieTarget = (targetCalorie > 0 && targetCalorie !== 1850)
    ? targetCalorie
    : (defaultScientificCalorie > 0 ? defaultScientificCalorie : 2531);

  const effectiveProteinTarget = wNum > 0
    ? Math.round(wNum * 1.1)
    : (effectiveCalorieTarget > 0 ? Math.round((effectiveCalorieTarget * 0.20) / 4) : 0);

  const effectiveFiberTarget = effectiveCalorieTarget > 0 ? 35 : 0;

  // Active calories from wearable / live sync
  const currentActiveKcal = liveMetrics.activeCalories > 0
    ? liveMetrics.activeCalories
    : (card.calories === 1420 ? 0 : (card.calories > 0 ? card.calories : card.wearableKcal));

  const currentSteps = liveMetrics.steps > 0 ? liveMetrics.steps : card.steps;
  const currentHeartRate = liveMetrics.avgHeartRate > 0 ? liveMetrics.avgHeartRate : card.heartRate;
  const isConnected = liveMetrics.isConnected || card.isConnected;
  const lastSyncedAt = liveMetrics.lastSyncedAt || card.lastSyncedAt;
  const currentAdvice = liveMetrics.aiAdvice || card.advice;

  // Clean protein and fiber intake (if 58 or 30 from old hardcoded mock, reset to 0 unless custom tracked)
  const currentProteinGrams = card.proteinGrams === 58 ? 0 : (card.proteinGrams || 0);
  const currentFiberGrams = card.fiberGrams === 30 ? 0 : (card.fiberGrams || 0);

  const handleSyncClick = async () => {
    sfx.playTap();
    setIsSyncing(true);
    try {
      await onSyncLive?.();
    } finally {
      setTimeout(() => setIsSyncing(false), 800);
    }
  };

  const handleAskAdvice = () => {
    sfx.playTap();
    const prompt = `Dựa vào vòng Ring hoạt động hôm nay của tôi (Bước chân: ${currentSteps.toLocaleString('vi-VN')}, Calo tiêu hao: ${currentActiveKcal} kcal, Nhịp tim: ${currentHeartRate} bpm), Bếp trưởng hãy tư vấn thực đơn bữa tối chay để bù đắp năng lượng và hồi phục cơ bắp tối ưu nhé!`;
    onAskAiAdvice?.(prompt);
  };

  return (
    <div className="mt-3.5 rounded-2xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-850 p-4 sm:p-5 shadow-sm space-y-4 text-slate-800 dark:text-slate-100 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-100 dark:border-emerald-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 via-emerald-500 to-cyan-500 p-0.5 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-emerald-950 dark:text-emerald-200 uppercase tracking-wide flex items-center gap-2">
              <span>Vòng Ring Hoạt Động &amp; Thể Trạng</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                Zen Rings
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Đo lường tiến độ calo, đạm thực vật và dữ liệu vòng đeo tay Google Fit
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSyncClick}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition cursor-pointer disabled:opacity-50"
            title="Đồng bộ bước chân & calo từ Google Fit"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ Google Fit'}</span>
          </button>
        </div>
      </div>

      {/* Embedded Concentric Rings Component */}
      <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-2 border border-slate-200/80 dark:border-slate-800">
        <HealthActivityRings
          calories={currentActiveKcal > 0 ? currentActiveKcal : 0}
          calorieTarget={effectiveCalorieTarget}
          proteinGrams={currentProteinGrams}
          proteinTarget={effectiveProteinTarget}
          fiberGrams={currentFiberGrams}
          fiberTarget={effectiveFiberTarget}
          heightCm={hNum || ''}
          weightKg={wNum || ''}
          age={age}
          gender={gender}
          compact={true}
          showDetails={true}
        />
      </div>

      {/* Wearable Live Metrics Strip */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white border border-emerald-500/30 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Watch className="w-4 h-4 text-emerald-400" />
            <strong className="font-bold text-white text-xs">Dữ liệu thiết bị thông minh (Google Fit / Smartband):</strong>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isConnected ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
              {isConnected ? '🟢 Đã liên kết' : 'Mô phỏng'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400">Cập nhật: {lastSyncedAt}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-slate-400 block flex items-center justify-center gap-1">
              <Footprints className="w-3 h-3 text-cyan-400" /> Bước chân
            </span>
            <strong className="text-sm sm:text-base font-extrabold text-white block mt-0.5">
              {currentSteps.toLocaleString('vi-VN')}
            </strong>
          </div>

          <div className="p-2 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-slate-400 block flex items-center justify-center gap-1">
              <Flame className="w-3 h-3 text-amber-400" /> Tiêu hao
            </span>
            <strong className="text-sm sm:text-base font-extrabold text-amber-300 block mt-0.5">
              +{currentActiveKcal.toLocaleString('vi-VN')} <span className="text-[10px] text-slate-400">kcal</span>
            </strong>
          </div>

          <div className="p-2 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-slate-400 block flex items-center justify-center gap-1">
              <Heart className="w-3 h-3 text-rose-400" /> Nhịp tim
            </span>
            <strong className="text-sm sm:text-base font-extrabold text-rose-300 block mt-0.5">
              {currentHeartRate > 0 ? `${currentHeartRate} bpm` : '0 bpm'}
            </strong>
          </div>
        </div>
      </div>

      {/* AI Advice Callout & Interactive Action */}
      <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2">
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          {currentAdvice}
        </p>
        <div className="pt-2 border-t border-emerald-200/50 dark:border-emerald-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleAskAdvice}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:underline cursor-pointer"
          >
            <ChefHat className="w-3.5 h-3.5" />
            <span>Nhờ Bếp trưởng cân đối bữa tối theo vòng Ring này →</span>
          </button>

          <Link
            to="/settings?tab=profile"
            className="text-[11px] font-semibold text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-300 underline"
          >
            Mở Cài đặt Hồ sơ &amp; Thiết bị
          </Link>
        </div>
      </div>
    </div>
  );
};
