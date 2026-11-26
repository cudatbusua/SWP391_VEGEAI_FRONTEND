import React from 'react';
import { Flame, Beef, Leaf, Activity } from 'lucide-react';
import { calculateBmi, getBmiCategory, calculateBmr, calculateTdee } from '../utils/nutritionProfile';

export interface HealthActivityRingsProps {
  /** Calo thực tế đã nạp hôm nay từ mealPlanService.intake(today) */
  calories?: number;
  /** Mục tiêu calo nạp cơ bản/ngày từ hồ sơ dinh dưỡng */
  calorieTarget?: number;
  /** Calo vận động bổ sung hôm nay từ Google Fit (cộng vào ngân sách nạp hôm nay nếu > 0) */
  activeBurnBonus?: number;
  /** Đạm thực vật thực tế đã nạp hôm nay (g) */
  proteinGrams?: number;
  proteinTarget?: number;
  /** Chất xơ thực tế đã nạp hôm nay (g) */
  fiberGrams?: number;
  fiberTarget?: number;
  /** Số bữa ăn đã xác nhận hôm nay */
  recordedMealsCount?: number;
  /** true khi đã nạp dữ liệu bữa ăn thực tế hôm nay (hiển thị trung thực 0 thay vì '—') */
  intakeLoaded?: boolean;
  heightCm?: number | '';
  weightKg?: number | '';
  age?: number;
  gender?: string;
  /** Server-calculated values; when given they replace the local estimate. */
  bmr?: number;
  tdee?: number;
  showDetails?: boolean;
  compact?: boolean;
  /** Ẩn tiêu đề ngoài khi nhúng trong thẻ đã có tiêu đề (như ChatActivityRingsView) */
  hideHeader?: boolean;
  onEditClick?: () => void;
}

export const HealthActivityRings: React.FC<HealthActivityRingsProps> = ({
  calories = 0,
  calorieTarget = 0,
  activeBurnBonus = 0,
  proteinGrams = 0,
  proteinTarget = 0,
  fiberGrams = 0,
  fiberTarget = 0,
  recordedMealsCount = 0,
  intakeLoaded = false,
  heightCm,
  weightKg,
  age = 26,
  gender = 'OTHER',
  bmr: serverBmr,
  tdee: serverTdee,
  showDetails = true,
  compact = false,
  hideHeader = false,
  onEditClick,
}) => {
  // Deterministic BMI, BMR, TDEE
  const numericHeight = typeof heightCm === 'number' && heightCm > 0 ? heightCm : 0;
  const numericWeight = typeof weightKg === 'number' && weightKg > 0 ? weightKg : 0;

  const bmi = numericHeight && numericWeight ? calculateBmi(numericWeight, numericHeight) : 0;
  const bmiCat = getBmiCategory(bmi);
  const bmr =
    serverBmr && serverBmr > 0
      ? Math.round(serverBmr)
      : numericHeight && numericWeight
      ? calculateBmr(numericWeight, numericHeight, age, gender)
      : 0;
  const tdee =
    serverTdee && serverTdee > 0
      ? Math.round(serverTdee)
      : bmr
      ? calculateTdee(bmr)
      : 0;

  const safeCalories = Math.max(0, Math.round(Number(calories) || 0));
  const safeProtein = Math.max(0, Math.round(Number(proteinGrams) || 0));
  const safeFiber = Math.max(0, Math.round(Number(fiberGrams) || 0));
  const safeActiveBonus = Math.max(0, Math.round(Number(activeBurnBonus) || 0));

  // Base intake target + today's active burn adjustment from Google Fit (if any)
  const baseCalorieTarget = calorieTarget > 0 ? Math.round(calorieTarget) : tdee > 0 ? tdee : 0;
  const effectiveCalorieTarget =
    baseCalorieTarget > 0 ? baseCalorieTarget + safeActiveBonus : 0;
  const effectiveProteinTarget =
    proteinTarget > 0
      ? Math.round(proteinTarget)
      : numericWeight > 0
      ? Math.round(numericWeight * 1.1)
      : 0;
  const effectiveFiberTarget =
    fiberTarget > 0 ? Math.round(fiberTarget) : effectiveCalorieTarget > 0 ? 35 : 0;

  const hasHealthData = Boolean(
    effectiveCalorieTarget > 0 ||
      effectiveProteinTarget > 0 ||
      effectiveFiberTarget > 0 ||
      intakeLoaded ||
      safeCalories > 0 ||
      safeProtein > 0 ||
      safeFiber > 0 ||
      (numericHeight > 0 && numericWeight > 0),
  );

  // Calculate percentages (clamped 0 to 100 for stroke dash offset)
  const calPercent =
    effectiveCalorieTarget > 0
      ? Math.min(Math.round((safeCalories / effectiveCalorieTarget) * 100), 100)
      : 0;
  const protPercent =
    effectiveProteinTarget > 0
      ? Math.min(Math.round((safeProtein / effectiveProteinTarget) * 100), 100)
      : 0;
  const fibPercent =
    effectiveFiberTarget > 0
      ? Math.min(Math.round((safeFiber / effectiveFiberTarget) * 100), 100)
      : 0;

  // SVG Geometry for concentric rings
  // Outer (Calo nạp): r = 62, middle (Đạm): r = 48, inner (Chất xơ): r = 34
  const r1 = 62;
  const circ1 = 2 * Math.PI * r1;
  const offset1 =
    hasHealthData && effectiveCalorieTarget > 0 ? circ1 - (calPercent / 100) * circ1 : circ1;

  const r2 = 48;
  const circ2 = 2 * Math.PI * r2;
  const offset2 =
    hasHealthData && effectiveProteinTarget > 0 ? circ2 - (protPercent / 100) * circ2 : circ2;

  const r3 = 34;
  const circ3 = 2 * Math.PI * r3;
  const offset3 =
    hasHealthData && effectiveFiberTarget > 0 ? circ3 - (fibPercent / 100) * circ3 : circ3;

  const activeTargetsCount =
    (effectiveCalorieTarget > 0 ? 1 : 0) +
    (effectiveProteinTarget > 0 ? 1 : 0) +
    (effectiveFiberTarget > 0 ? 1 : 0);
  const averageCompletion =
    activeTargetsCount > 0 ? Math.round((calPercent + protPercent + fibPercent) / activeTargetsCount) : 0;

  const showNumericIntake = intakeLoaded || safeCalories > 0 || safeProtein > 0 || safeFiber > 0;

  const ringCaption =
    intakeLoaded && recordedMealsCount === 0 && safeCalories === 0
      ? 'Chưa ghi nhận bữa ăn hôm nay'
      : recordedMealsCount > 0
      ? `Đã ghi nhận ${recordedMealsCount} bữa ăn hôm nay`
      : 'Tiến độ dinh dưỡng trong ngày';

  return (
    <div
      className={
        hideHeader
          ? 'p-2 sm:p-3 transition-colors'
          : `health-activity-rings-card bg-white dark:bg-[#121922] rounded-3xl border border-slate-200/90 dark:border-[#212c3b] p-5 sm:p-6 shadow-sm transition-colors ${
              compact ? 'p-4' : ''
            }`
      }
    >
      {/* Header bar (hidden when embedded inside another titled card like ChatActivityRingsView) */}
      {!hideHeader && (
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-rose-500 via-emerald-500 to-cyan-500 p-0.5 flex items-center justify-center shadow-xs">
              <div className="w-full h-full bg-white dark:bg-[#121922] rounded-[14px] flex items-center justify-center">
                <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                <span>Tiến độ Dinh dưỡng Hôm nay</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Zen Rings
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Tổng hợp từ các bữa ăn bạn xác nhận trong ngày
              </p>
            </div>
          </div>

          {onEditClick && (
            <button
              type="button"
              onClick={onEditClick}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Cập nhật chỉ số
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-center">
        {/* Left: Concentric SVG Nutrition Rings */}
        <div className="xl:col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90 drop-shadow-xs" viewBox="0 0 160 160">
              {/* Ring 1: Calorie Intake Track (Outer — Rose) */}
              <circle
                cx="80"
                cy="80"
                r={r1}
                stroke="currentColor"
                strokeWidth="10"
                className="text-rose-100 dark:text-rose-950/40"
                fill="none"
              />
              <circle
                cx="80"
                cy="80"
                r={r1}
                stroke="#f43f5e"
                strokeWidth="10"
                strokeDasharray={circ1}
                strokeDashoffset={offset1}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-1000 ease-out"
              />

              {/* Ring 2: Protein Intake Track (Middle — Emerald) */}
              <circle
                cx="80"
                cy="80"
                r={r2}
                stroke="currentColor"
                strokeWidth="10"
                className="text-emerald-100 dark:text-emerald-950/40"
                fill="none"
              />
              <circle
                cx="80"
                cy="80"
                r={r2}
                stroke="#10b981"
                strokeWidth="10"
                strokeDasharray={circ2}
                strokeDashoffset={offset2}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-1000 ease-out"
              />

              {/* Ring 3: Fiber Intake Track (Inner — Cyan) */}
              <circle
                cx="80"
                cy="80"
                r={r3}
                stroke="currentColor"
                strokeWidth="10"
                className="text-cyan-100 dark:text-cyan-950/40"
                fill="none"
              />
              <circle
                cx="80"
                cy="80"
                r={r3}
                stroke="#06b6d4"
                strokeWidth="10"
                strokeDasharray={circ3}
                strokeDashoffset={offset3}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-1000 ease-out"
              />
            </svg>

            {/* Center metric indicator */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              {hasHealthData ? (
                <>
                  <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
                    {averageCompletion}%
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 -mt-0.5">
                    Hoàn thành
                  </span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-black text-slate-400 dark:text-slate-500 tracking-tight">
                    —
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 -mt-0.5">
                    Chưa có dữ liệu
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="mt-2 text-center">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {ringCaption}
            </span>
          </div>
        </div>

        {/* Right: Ring Legend & Biometric Stat Badges */}
        <div className="xl:col-span-7 space-y-4 min-w-0">
          {/* Ring Metrics Legend */}
          <div className="space-y-2.5">
            {/* Red Ring: Calo nạp hôm nay */}
            <div className="p-3 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/40 flex items-start justify-between gap-2 min-w-0">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-rose-500 shadow-xs shrink-0" />
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-rose-500" /> Calo nạp hôm nay
                    {safeActiveBonus > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 ml-1">
                        +{safeActiveBonus.toLocaleString('vi-VN')} kcal vận động
                      </span>
                    )}
                  </span>
                  <span className="block text-[11px] text-slate-400">
                    {effectiveCalorieTarget > 0
                      ? safeActiveBonus > 0
                        ? `Ngân sách: ${effectiveCalorieTarget.toLocaleString('vi-VN')} kcal (${baseCalorieTarget.toLocaleString('vi-VN')} + ${safeActiveBonus.toLocaleString('vi-VN')})`
                        : `Mục tiêu: ${effectiveCalorieTarget.toLocaleString('vi-VN')} kcal/ngày`
                      : 'Mục tiêu: Chưa thiết lập'}
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right tabular-nums">
                <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                  {showNumericIntake ? safeCalories.toLocaleString('vi-VN') : '—'}
                  <span className="text-[11px] font-semibold text-slate-400 ml-1">kcal</span>
                </span>
                <span className="block text-[10px] font-bold text-slate-400">
                  {effectiveCalorieTarget > 0 ? `${calPercent}%` : '—'}
                </span>
              </div>
            </div>

            {/* Emerald Ring: Đạm thực vật */}
            <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40 flex items-start justify-between gap-2 min-w-0">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-xs shrink-0" />
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                    <Beef className="w-3.5 h-3.5 text-emerald-500" /> Đạm thực vật (Protein)
                  </span>
                  <span className="block text-[11px] text-slate-400">
                    {effectiveProteinTarget > 0
                      ? `Mục tiêu: ${effectiveProteinTarget}g từ đậu, hạt & ngũ cốc`
                      : 'Mục tiêu: Chưa thiết lập'}
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right tabular-nums">
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {showNumericIntake ? safeProtein : '—'}
                  <span className="text-[11px] font-semibold text-slate-400 ml-1">g</span>
                </span>
                <span className="block text-[10px] font-bold text-slate-400">
                  {effectiveProteinTarget > 0 ? `${protPercent}%` : '—'}
                </span>
              </div>
            </div>

            {/* Cyan Ring: Chất xơ tự nhiên */}
            <div className="p-3 rounded-2xl bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-200/50 dark:border-cyan-900/40 flex items-start justify-between gap-2 min-w-0">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-cyan-500 shadow-xs shrink-0" />
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                    <Leaf className="w-3.5 h-3.5 text-cyan-500" /> Chất xơ tự nhiên (Fiber)
                  </span>
                  <span className="block text-[11px] text-slate-400">
                    {effectiveFiberTarget > 0
                      ? `Mục tiêu: ${effectiveFiberTarget}g rau xanh & ngũ cốc nguyên cám`
                      : 'Mục tiêu: Chưa thiết lập'}
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right tabular-nums">
                <span className="text-sm font-black text-cyan-600 dark:text-cyan-400">
                  {showNumericIntake ? safeFiber : '—'}
                  <span className="text-[11px] font-semibold text-slate-400 ml-1">g</span>
                </span>
                <span className="block text-[10px] font-bold text-slate-400">
                  {effectiveFiberTarget > 0 ? `${fibPercent}%` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Biometrics Summary Row (BMI, BMR, TDEE, Height, Weight) */}
          {showDetails && (
            <div className="pt-2 border-t border-slate-100 dark:border-[#212c3b]">
              <div className="grid grid-cols-2 gap-2.5">
                {/* BMI */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-center">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Chỉ số BMI
                  </span>
                  <div className="flex flex-wrap items-baseline justify-center gap-1 my-0.5 min-w-0">
                    <strong className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                      {bmi > 0 ? bmi : '—'}
                    </strong>
                  </div>
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded-md text-[9px] font-extrabold border ${bmiCat.badgeClass}`}
                  >
                    {bmiCat.label}
                  </span>
                </div>

                {/* BMR */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-center">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Trao đổi BMR
                  </span>
                  <div className="flex flex-wrap items-baseline justify-center gap-1 my-0.5 min-w-0">
                    <strong className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                      {bmr > 0 ? bmr.toLocaleString('vi-VN') : '—'}
                    </strong>
                    {bmr > 0 && <span className="text-[10px] text-slate-400">kcal</span>}
                  </div>
                  <span className="text-[9.5px] text-slate-400">Mifflin-St Jeor</span>
                </div>

                {/* TDEE */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-center">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Tiêu hao TDEE
                  </span>
                  <div className="flex flex-wrap items-baseline justify-center gap-1 my-0.5 min-w-0">
                    <strong className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                      {tdee > 0 ? tdee.toLocaleString('vi-VN') : '—'}
                    </strong>
                    {tdee > 0 && <span className="text-[10px] text-slate-400">kcal</span>}
                  </div>
                  <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-bold">
                    {tdee > 0 ? 'Mức chuẩn' : 'Chưa tính'}
                  </span>
                </div>

                {/* Thể trạng */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-center">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Thể trạng
                  </span>
                  <div className="flex items-baseline justify-center gap-1 my-0.5 tabular-nums">
                    <strong className="text-sm font-black text-slate-900 dark:text-white">
                      {numericHeight ? `${numericHeight}cm` : '—'} /{' '}
                      {numericWeight ? `${numericWeight}kg` : '—'}
                    </strong>
                  </div>
                  <span className="text-[9.5px] text-slate-400">Hồ sơ cá nhân</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
