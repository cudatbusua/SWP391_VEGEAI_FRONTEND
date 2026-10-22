import React from 'react';
import { Flame, Beef, Leaf, Activity, Sparkles } from 'lucide-react';
import { calculateBmi, getBmiCategory, calculateBmr, calculateTdee } from '../utils/nutritionProfile';

export interface HealthActivityRingsProps {
  calories?: number;
  calorieTarget?: number;
  proteinGrams?: number;
  proteinTarget?: number;
  fiberGrams?: number;
  fiberTarget?: number;
  heightCm?: number | '';
  weightKg?: number | '';
  age?: number;
  gender?: string;
  showDetails?: boolean;
  compact?: boolean;
  onEditClick?: () => void;
}

export const HealthActivityRings: React.FC<HealthActivityRingsProps> = ({
  calories = 1420,
  calorieTarget = 1950,
  proteinGrams = 56,
  proteinTarget = 70,
  fiberGrams = 28,
  fiberTarget = 35,
  heightCm,
  weightKg,
  age = 26,
  gender = 'OTHER',
  showDetails = true,
  compact = false,
  onEditClick,
}) => {
  // Deterministic BMI, BMR, TDEE
  const numericHeight = typeof heightCm === 'number' && heightCm > 0 ? heightCm : 0;
  const numericWeight = typeof weightKg === 'number' && weightKg > 0 ? weightKg : 0;

  const bmi = numericHeight && numericWeight ? calculateBmi(numericWeight, numericHeight) : 0;
  const bmiCat = getBmiCategory(bmi);
  const bmr = numericHeight && numericWeight ? calculateBmr(numericWeight, numericHeight, age, gender) : 0;
  const tdee = bmr ? calculateTdee(bmr) : 0;

  // Actual target can fall back to TDEE if calorieTarget is not set
  const effectiveCalorieTarget = calorieTarget || tdee || 2000;
  const effectiveProteinTarget = proteinTarget || Math.round((numericWeight || 60) * 1.1) || 65;
  const effectiveFiberTarget = fiberTarget || 35;

  // Calculate percentages (clamped 0 to 100 for stroke dash offset, but display full %)
  const calPercent = Math.min(Math.round((calories / effectiveCalorieTarget) * 100), 100);
  const protPercent = Math.min(Math.round((proteinGrams / effectiveProteinTarget) * 100), 100);
  const fibPercent = Math.min(Math.round((fiberGrams / effectiveFiberTarget) * 100), 100);

  // SVG Geometry for concentric rings
  // Outer (Calo): r = 62, middle (Protein): r = 48, inner (Fiber): r = 34
  const r1 = 62;
  const circ1 = 2 * Math.PI * r1;
  const offset1 = circ1 - (calPercent / 100) * circ1;

  const r2 = 48;
  const circ2 = 2 * Math.PI * r2;
  const offset2 = circ2 - (protPercent / 100) * circ2;

  const r3 = 34;
  const circ3 = 2 * Math.PI * r3;
  const offset3 = circ3 - (fibPercent / 100) * circ3;

  const averageCompletion = Math.round((calPercent + protPercent + fibPercent) / 3);

  return (
    <div className={`health-activity-rings-card bg-white dark:bg-[#121922] rounded-3xl border border-slate-200/90 dark:border-[#212c3b] p-5 sm:p-6 shadow-sm transition-colors ${compact ? 'p-4' : ''}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-rose-500 via-emerald-500 to-cyan-500 p-0.5 flex items-center justify-center shadow-xs">
            <div className="w-full h-full bg-white dark:bg-[#121922] rounded-[14px] flex items-center justify-center">
              <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
              <span>Chỉ số hoạt động & Thể trạng</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Zen Rings
              </span>
            </h3>
            <p className="text-xs text-slate-400">Đo lường tiến độ calo, đạm thực vật và chất xơ trong ngày</p>
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

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left: Concentric SVG Activity Rings */}
        <div className="md:col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90 drop-shadow-xs" viewBox="0 0 160 160">
              {/* Ring 1: Calorie Track (Outer) */}
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

              {/* Ring 2: Protein Track (Middle) */}
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

              {/* Ring 3: Fiber Track (Inner) */}
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
              <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {averageCompletion}%
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 -mt-0.5">
                Hoàn thành
              </span>
            </div>
          </div>

          <div className="mt-2 text-center">
            <span className="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Vòng vận động mô phỏng theo chuẩn Apple Watch
            </span>
          </div>
        </div>

        {/* Right: Ring Legend & Biometric Stat Badges */}
        <div className="md:col-span-7 space-y-4">
          {/* Ring Metrics Legend */}
          <div className="space-y-2.5">
            {/* Red Ring: Calo */}
            <div className="p-3 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-rose-500 shadow-xs shrink-0" />
                <div>
                  <span className="block text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-rose-500" /> Năng lượng (Calo)
                  </span>
                  <span className="block text-[11px] text-slate-400">
                    Mục tiêu: {effectiveCalorieTarget.toLocaleString('vi-VN')} kcal/ngày
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                  {calories.toLocaleString('vi-VN')}
                  <span className="text-[11px] font-semibold text-slate-400 ml-1">kcal</span>
                </span>
                <span className="block text-[10px] font-bold text-slate-400">
                  {Math.round((calories / effectiveCalorieTarget) * 100)}%
                </span>
              </div>
            </div>

            {/* Emerald Ring: Đạm thực vật */}
            <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-xs shrink-0" />
                <div>
                  <span className="block text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                    <Beef className="w-3.5 h-3.5 text-emerald-500" /> Đạm thực vật (Protein)
                  </span>
                  <span className="block text-[11px] text-slate-400">
                    Mục tiêu: {effectiveProteinTarget}g từ đậu, hạt & ngũ cốc
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {proteinGrams}
                  <span className="text-[11px] font-semibold text-slate-400 ml-1">g</span>
                </span>
                <span className="block text-[10px] font-bold text-slate-400">
                  {Math.round((proteinGrams / effectiveProteinTarget) * 100)}%
                </span>
              </div>
            </div>

            {/* Cyan Ring: Chất xơ & Vi chất */}
            <div className="p-3 rounded-2xl bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-200/50 dark:border-cyan-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-cyan-500 shadow-xs shrink-0" />
                <div>
                  <span className="block text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                    <Leaf className="w-3.5 h-3.5 text-cyan-500" /> Chất xơ & Cân bằng rau củ
                  </span>
                  <span className="block text-[11px] text-slate-400">
                    Mục tiêu: {effectiveFiberTarget}g chất xơ tự nhiên
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-cyan-600 dark:text-cyan-400">
                  {fiberGrams}
                  <span className="text-[11px] font-semibold text-slate-400 ml-1">g</span>
                </span>
                <span className="block text-[10px] font-bold text-slate-400">
                  {Math.round((fiberGrams / effectiveFiberTarget) * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Biometrics Summary Row (BMI, BMR, TDEE, Height, Weight) */}
          {showDetails && (
            <div className="pt-2 border-t border-slate-100 dark:border-[#212c3b]">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* BMI */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-center">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Chỉ số BMI
                  </span>
                  <div className="flex items-baseline justify-center gap-1 my-0.5">
                    <strong className="text-lg font-black text-slate-900 dark:text-white">
                      {bmi > 0 ? bmi : '—'}
                    </strong>
                  </div>
                  <span className={`inline-block px-1.5 py-0.5 rounded-md text-[9px] font-extrabold border ${bmiCat.badgeClass}`}>
                    {bmiCat.label}
                  </span>
                </div>

                {/* BMR */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-center">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Trao đổi BMR
                  </span>
                  <div className="flex items-baseline justify-center gap-1 my-0.5">
                    <strong className="text-lg font-black text-slate-900 dark:text-white">
                      {bmr > 0 ? bmr.toLocaleString('vi-VN') : '—'}
                    </strong>
                    <span className="text-[10px] text-slate-400">kcal</span>
                  </div>
                  <span className="text-[9.5px] text-slate-400">Mifflin-St Jeor</span>
                </div>

                {/* TDEE */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-center">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Tiêu hao TDEE
                  </span>
                  <div className="flex items-baseline justify-center gap-1 my-0.5">
                    <strong className="text-lg font-black text-slate-900 dark:text-white">
                      {tdee > 0 ? tdee.toLocaleString('vi-VN') : '—'}
                    </strong>
                    <span className="text-[10px] text-slate-400">kcal</span>
                  </div>
                  <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-bold">Mức chuẩn</span>
                </div>

                {/* Thể trạng (Chiều cao / Cân nặng) */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-center">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Thể trạng
                  </span>
                  <div className="flex items-baseline justify-center gap-1 my-0.5">
                    <strong className="text-sm font-black text-slate-900 dark:text-white">
                      {numericHeight ? `${numericHeight}cm` : '—'} / {numericWeight ? `${numericWeight}kg` : '—'}
                    </strong>
                  </div>
                  <span className="text-[9.5px] text-slate-400">Cập nhật hồ sơ</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
